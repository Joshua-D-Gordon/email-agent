import { describe, it, expect } from "vitest";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { storedMessageToBaseMessage, type StoredMessage } from "@/lib/agent/history-mapper";

// Hypothesis: the mapper silently coerces malformed tool-call shapes to {}
// instead of rejecting them or flagging the problem. If a stored doc has a
// tool_call with args=null/number/string, the agent loses the args on
// replay and may re-call the tool with garbage. Worse, an orphan tool
// message (no matching prior assistant tool_call) is happily emitted and
// OpenAI will then reject the entire conversation with INVALID_TOOL_RESULTS.

function row(partial: Partial<StoredMessage>): StoredMessage {
  return { role: "user", content: "", ...partial } as StoredMessage;
}

describe("storedMessageToBaseMessage — happy path", () => {
  it("maps a user row to a HumanMessage", () => {
    const out = storedMessageToBaseMessage(row({ role: "user", content: "hi" }));
    expect(out).toBeInstanceOf(HumanMessage);
    expect(out?.content).toBe("hi");
  });

  it("maps an assistant row with valid tool calls", () => {
    const out = storedMessageToBaseMessage(
      row({
        role: "assistant",
        content: "thinking",
        toolCalls: [{ id: "call_1", name: "tavily_search", args: { query: "acme" } }],
      }),
    );
    expect(out).toBeInstanceOf(AIMessage);
    const ai = out as AIMessage;
    expect(ai.tool_calls).toHaveLength(1);
    expect(ai.tool_calls?.[0]).toMatchObject({
      id: "call_1",
      name: "tavily_search",
      args: { query: "acme" },
    });
  });

  it("maps a tool row to a ToolMessage", () => {
    const out = storedMessageToBaseMessage(
      row({ role: "tool", content: "result", toolCallId: "call_1", name: "tavily_search" }),
    );
    expect(out).toBeInstanceOf(ToolMessage);
  });
});

describe("storedMessageToBaseMessage — malformed shapes (bug surface)", () => {
  it("drops tool calls with missing id (good)", () => {
    const out = storedMessageToBaseMessage(
      row({
        role: "assistant",
        content: "",
        // @ts-expect-error — simulating bad data from Firestore
        toolCalls: [{ name: "tavily_search", args: { query: "x" } }],
      }),
    );
    const ai = out as AIMessage;
    expect(ai.tool_calls ?? []).toHaveLength(0);
  });

  it("BUG: tool call with non-object args is silently coerced to {}", () => {
    // OpenAI emits args as an object. If Firestore returns a row where args
    // got corrupted (number, string, null) the current mapper just replaces
    // it with {} — agent replay loses the original arg and may re-call the
    // tool with empty input. The mapper should reject the row or at least
    // surface the corruption.
    const out = storedMessageToBaseMessage(
      row({
        role: "assistant",
        content: "",
        // @ts-expect-error — args should be an object
        toolCalls: [{ id: "call_1", name: "tavily_search", args: 42 }],
      }),
    );
    const ai = out as AIMessage;
    // Asserting the BUG-FREE behavior: a malformed args should NOT silently
    // be replaced with {} — either drop the tool call or throw.
    if (ai.tool_calls && ai.tool_calls.length > 0) {
      // If the mapper keeps the row, args must reflect the original (which
      // it can't because 42 isn't a valid args shape). So the only sane
      // behavior is "don't keep the row at all" — assertion below fails today.
      expect(ai.tool_calls, "malformed args should cause the tool call to be dropped").toHaveLength(0);
    }
  });

  it("BUG: orphan tool message with no preceding assistant tool_call is mapped anyway", () => {
    // The mapper looks at one row at a time and has no concept of the
    // prior row. So a `tool` row whose toolCallId doesn't match any prior
    // assistant tool_call still becomes a ToolMessage. This is the exact
    // scenario that crashes the next OpenAI call with INVALID_TOOL_RESULTS.
    // The mapper isn't responsible for sequence validation, but SOMETHING
    // in the pipeline must be — and today nothing is.
    const out = storedMessageToBaseMessage(
      row({ role: "tool", content: "result", toolCallId: "call_orphan", name: "tavily_search" }),
    );
    // Documenting current behavior: it maps successfully.
    expect(out).toBeInstanceOf(ToolMessage);
    // This test passes today but the comment documents a real gap that
    // should be fixed at the loader/pipeline level, not the mapper.
  });

  it("returns null for unsupported roles", () => {
    // role: "system" is part of the StoredMessage union but the mapper has
    // no branch for it (system prompts are injected by the agent, not
    // persisted). Cast to bypass the unused-@ts-expect-error nag.
    const out = storedMessageToBaseMessage({ role: "system", content: "x" } as unknown as Parameters<typeof storedMessageToBaseMessage>[0]);
    // System messages aren't supposed to be stored in the per-thread doc
    // store; the agent injects its own system prompt. The mapper currently
    // returns null which is the right behavior.
    expect(out).toBeNull();
  });

  it("returns null for a completely empty object", () => {
    // @ts-expect-error
    const out = storedMessageToBaseMessage({});
    expect(out).toBeNull();
  });
});
