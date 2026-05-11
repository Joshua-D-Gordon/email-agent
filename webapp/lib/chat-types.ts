import type { Timestamp } from "firebase/firestore";

export type ChatThread = {
  threadId: string;
  title?: string;
  companyId?: string;
  ownerUid?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ChatMessageRole = "user" | "assistant" | "tool" | "system";

export type ToolCall = {
  id: string;
  name: string;
  args?: Record<string, unknown>;
  result?: string;
  status?: "running" | "ok" | "error";
};

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  name?: string;
  createdAt: Timestamp;
};
