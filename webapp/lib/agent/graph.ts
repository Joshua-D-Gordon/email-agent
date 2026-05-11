import "server-only";

import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { BaseMessage } from "@langchain/core/messages";
import { buildAgentTools } from "./tools";
import { buildSystemPrompt } from "./prompt";

class PromptInspector extends BaseCallbackHandler {
  name = "PromptInspector";

  handleChatModelStart(
    _llm: unknown,
    messages: BaseMessage[][],
  ): void {
    const flat = messages.flat();
    console.log(
      "[agent] prompt sent to model:",
      JSON.stringify(
        flat.map((m, i) => {
          const msg = m as {
            getType?: () => string;
            _getType?: () => string;
            content?: unknown;
            tool_calls?: unknown;
            tool_call_id?: string;
            name?: string;
          };
          return {
            i,
            type: msg.getType?.() ?? msg._getType?.() ?? typeof m,
            content:
              typeof msg.content === "string"
                ? msg.content.slice(0, 100)
                : JSON.stringify(msg.content).slice(0, 100),
            tool_calls: msg.tool_calls
              ? (Array.isArray(msg.tool_calls)
                  ? msg.tool_calls.map((tc) => {
                      const t = tc as { id?: string; name?: string };
                      return { id: t.id, name: t.name };
                    })
                  : JSON.stringify(msg.tool_calls))
              : undefined,
            tool_call_id: msg.tool_call_id,
            name: msg.name,
          };
        }),
        null,
        2,
      ),
    );
  }
}

export function buildAgent(opts: {
  companyId: string;
  ownerUid: string;
  companyName: string;
  interest: string;
}) {
  const tools = buildAgentTools({ companyId: opts.companyId, ownerUid: opts.ownerUid });

  // Force sequential tool calls via modelKwargs. Parallel tool calls were
  // producing AI messages whose tool_calls array didn't match the tool
  // results the runtime emitted — causing OpenAI to reject the next
  // iteration with INVALID_TOOL_RESULTS. One-tool-at-a-time also gives
  // nicer UX because each chip flips running→ok before the next one starts.
  const model = new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0.3,
    streaming: false,
    modelKwargs: { parallel_tool_calls: false },
    callbacks: [new PromptInspector()],
  });

  return createAgent({
    model,
    tools,
    systemPrompt: buildSystemPrompt(opts.companyName, opts.interest),
  });
}
