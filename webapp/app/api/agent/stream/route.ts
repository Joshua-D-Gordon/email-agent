import { NextRequest } from "next/server";
import { AIMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { buildAgent } from "@/lib/agent/graph";
import {
  appendAssistantMessage,
  appendToolMessage,
  appendUserMessage,
  ensureThread,
  loadMessages,
} from "@/lib/agent/history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StreamBody = {
  threadId: string;
  companyId: string;
  message: string;
};

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const tokenMatch = authHeader.match(/^Bearer\s+(\S+)\s*$/i);
  if (!tokenMatch) {
    return jsonError(401, "Missing Authorization: Bearer <idToken> header");
  }

  let ownerUid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(tokenMatch[1]);
    ownerUid = decoded.uid;
  } catch {
    return jsonError(401, "Invalid or expired ID token");
  }

  let body: StreamBody;
  try {
    body = (await req.json()) as StreamBody;
  } catch {
    return jsonError(400, "Invalid JSON body");
  }
  const { threadId, companyId, message } = body;
  if (!threadId || !companyId || !message?.trim()) {
    return jsonError(400, "threadId, companyId, and message are required");
  }

  const companySnap = await adminDb.collection("companies").doc(companyId).get();
  if (!companySnap.exists) {
    return jsonError(404, `Company ${companyId} not found`);
  }
  const companyOwner = companySnap.get("ownerUid");
  if (companyOwner && companyOwner !== ownerUid) {
    return jsonError(403, "You don't own this company");
  }
  const companyName = (companySnap.get("name") as string | undefined) ?? companyId;
  const interest = (companySnap.get("interest") as string | undefined) ?? "";

  await ensureThread(threadId, {
    companyId,
    ownerUid,
    title: deriveTitle(message),
  });
  await appendUserMessage(threadId, message, ownerUid);

  const history = await loadMessages(threadId);
  const historyLength = history.length;
  const agent = buildAgent({ companyId, ownerUid, companyName, interest });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        // Non-streaming: run the whole ReAct loop, then emit synthesized SSE
        // events in the same shape the client already consumes. Streaming the
        // model produced malformed intermediate AI messages that broke
        // OpenAI's tool-call/tool-result pairing invariant; running to
        // completion sidesteps that entirely.
        const finalState = (await agent.invoke({ messages: history })) as {
          messages?: BaseMessage[];
        };
        const finalMessages = finalState.messages ?? [];
        const newMessages = finalMessages.slice(historyLength);

        let assistantText = "";

        for (const m of newMessages) {
          if (m instanceof AIMessage) {
            const text = stringifyContent(m.content);
            const toolCalls = Array.isArray(m.tool_calls)
              ? m.tool_calls
                  .filter((tc) => tc && typeof tc.id === "string" && typeof tc.name === "string")
                  .map((tc) => ({
                    id: tc.id as string,
                    name: tc.name as string,
                    args: (tc.args ?? {}) as Record<string, unknown>,
                  }))
              : undefined;

            if (toolCalls && toolCalls.length > 0) {
              for (const tc of toolCalls) {
                send("tool_call", {
                  id: tc.id,
                  name: tc.name,
                  args: tc.args ?? {},
                  status: "running",
                });
              }
            }

            if (!text && (!toolCalls || toolCalls.length === 0)) continue;

            if (text) {
              assistantText = text;
              send("assistant_delta", { delta: text });
            }

            await appendAssistantMessage(threadId, text, ownerUid, toolCalls);
          } else if (m instanceof ToolMessage) {
            const text = stringifyContent(m.content);
            const callId = m.tool_call_id;
            const name = m.name ?? "tool";
            if (!callId) continue;

            send("tool_result", { id: callId, name, status: "ok" });
            await appendToolMessage(threadId, text, callId, name, ownerUid);
          }
        }

        if (assistantText.trim()) {
          send("assistant", { content: assistantText });
        } else {
          console.warn("[agent/stream] finished with no assistant text");
        }
        send("done", { ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[agent/stream] error", err);
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function deriveTitle(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 60) return trimmed;
  return `${trimmed.slice(0, 57)}…`;
}

function stringifyContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "string") return block;
        if (
          block &&
          typeof block === "object" &&
          "text" in block &&
          typeof (block as { text: unknown }).text === "string"
        ) {
          return (block as { text: string }).text;
        }
        return "";
      })
      .join("");
  }
  return "";
}
