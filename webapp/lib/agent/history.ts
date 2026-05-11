import "server-only";

import { type BaseMessage } from "@langchain/core/messages";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { storedMessageToBaseMessage, type StoredMessage, type StoredToolCall } from "./history-mapper";

export type { StoredMessage, StoredToolCall };

export async function loadMessages(threadId: string): Promise<BaseMessage[]> {
  const snap = await adminDb
    .collection("chats")
    .doc(threadId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .get();

  const messages: BaseMessage[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as StoredMessage;
    const mapped = storedMessageToBaseMessage(data);
    if (mapped) messages.push(mapped);
  }
  return messages;
}

export async function appendUserMessage(threadId: string, content: string, ownerUid: string) {
  await adminDb
    .collection("chats")
    .doc(threadId)
    .collection("messages")
    .add({
      role: "user",
      content,
      ownerUid,
      createdAt: FieldValue.serverTimestamp(),
    });
  await touchThread(threadId);
}

// Assistant rows are appended in the order the agent emits them. When the
// assistant carries tool_calls, the matching tool rows MUST be appended after
// this row — OpenAI rejects a `tool` message that doesn't immediately follow
// an `assistant` message with matching tool_calls.
export async function appendAssistantMessage(
  threadId: string,
  content: string,
  ownerUid: string,
  toolCalls?: StoredToolCall[],
) {
  const doc: Record<string, unknown> = {
    role: "assistant",
    content,
    ownerUid,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (toolCalls && toolCalls.length > 0) {
    doc.toolCalls = toolCalls.map((tc) => ({
      id: tc.id,
      name: tc.name,
      args: tc.args ?? {},
    }));
  }
  await adminDb.collection("chats").doc(threadId).collection("messages").add(doc);
  await touchThread(threadId);
}

export async function appendToolMessage(
  threadId: string,
  content: string,
  toolCallId: string,
  name: string,
  ownerUid: string,
) {
  // Use toolCallId as the doc id so retries/double-fires don't duplicate.
  await adminDb
    .collection("chats")
    .doc(threadId)
    .collection("messages")
    .doc(`tool_${toolCallId}`)
    .set({
      role: "tool",
      content,
      toolCallId,
      name,
      ownerUid,
      createdAt: FieldValue.serverTimestamp(),
    });
  await touchThread(threadId);
}

export async function ensureThread(
  threadId: string,
  data: { companyId: string; ownerUid: string; title?: string },
) {
  await adminDb.collection("chats").doc(threadId).set(
    {
      threadId,
      companyId: data.companyId,
      ownerUid: data.ownerUid,
      title: data.title ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function touchThread(threadId: string) {
  await adminDb
    .collection("chats")
    .doc(threadId)
    .set({ updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}
