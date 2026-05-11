import {
  HumanMessage,
  AIMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";

export type StoredToolCall = {
  id: string;
  name: string;
  args?: Record<string, unknown>;
};

export type StoredMessage = {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  toolCalls?: StoredToolCall[];
  toolCallId?: string;
  name?: string;
};

// Pure per-doc transform — converts a stored Firestore message shape into a
// LangChain BaseMessage. Returns null for malformed or unsupported rows.
// Extracted from loadMessages so the filtering logic can be unit-tested
// without a Firestore mock.
export function storedMessageToBaseMessage(data: StoredMessage): BaseMessage | null {
  if (!data || typeof data !== "object") return null;

  if (data.role === "user") {
    return new HumanMessage(data.content ?? "");
  }

  if (data.role === "assistant") {
    const toolCalls = Array.isArray(data.toolCalls)
      ? data.toolCalls
          .filter(
            (tc) =>
              tc &&
              typeof tc.id === "string" &&
              typeof tc.name === "string" &&
              // args must be a plain object or absent — corrupted shapes
              // (number, string, null, array) drop the whole tool call so
              // we don't silently coerce them to {} and lose context on
              // replay.
              (tc.args === undefined ||
                (tc.args !== null && typeof tc.args === "object" && !Array.isArray(tc.args))),
          )
          .map((tc) => ({
            id: tc.id,
            name: tc.name,
            args: tc.args ?? {},
          }))
      : undefined;
    return new AIMessage({
      content: data.content ?? "",
      tool_calls: toolCalls,
    });
  }

  if (data.role === "tool" && typeof data.toolCallId === "string") {
    return new ToolMessage({
      content: data.content ?? "",
      tool_call_id: data.toolCallId,
      name: data.name,
    });
  }

  return null;
}
