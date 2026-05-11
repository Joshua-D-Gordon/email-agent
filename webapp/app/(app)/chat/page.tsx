"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { authedFetch } from "@/lib/api-client";
import { readSSE } from "@/lib/sse-client";
import { useChatMessages, useChatThread } from "@/lib/chats-client";
import {
  useCompany,
  useCompanyCurrentEmail,
  useCompanyPendingEmail,
} from "@/lib/companies-client";
import type { ChatMessage, ToolCall } from "@/lib/chat-types";
import { ChatEmptyState } from "./_components/chat-empty-state";
import { Composer } from "./_components/composer";
import { EmailReviewPanel } from "./_components/email-review-panel";
import { MessageList } from "./_components/message-list";
import { ThreadsPanel } from "./_components/threads-panel";

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyIdParam = searchParams.get("company");
  const threadIdParam = searchParams.get("thread");

  const { user } = useAuth();

  // Stable threadId for the active chat. New until first send persists it.
  const [threadId, setThreadId] = useState<string | null>(threadIdParam);
  useEffect(() => {
    setThreadId(threadIdParam);
  }, [threadIdParam]);

  // The thread doc is the source of truth for companyId — the URL param is just a hint.
  const { data: thread } = useChatThread(threadId);
  const companyId = companyIdParam ?? thread?.companyId ?? null;

  // Keep the URL canonical: if we resolved companyId from the thread, write it back so
  // refresh/sharing work.
  useEffect(() => {
    if (!companyIdParam && companyId && threadId) {
      const params = new URLSearchParams();
      params.set("company", companyId);
      params.set("thread", threadId);
      router.replace(`/chat?${params.toString()}`);
    }
  }, [companyIdParam, companyId, threadId, router]);

  const { data: company } = useCompany(companyId ?? "");
  const { data: persistedMessages, loading } = useChatMessages(threadId);
  const { data: pendingEmail } = useCompanyPendingEmail(companyId);
  const { data: currentEmail } = useCompanyCurrentEmail(companyId);

  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [inFlight, setInFlight] = useState<InFlightState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-open the panel the first time a pending draft appears for this thread.
  useEffect(() => {
    if (pendingEmail) setReviewOpen(true);
  }, [pendingEmail?.id, pendingEmail]);

  // Cancel any in-flight request when the user navigates away.
  useEffect(() => () => abortRef.current?.abort(), []);

  const sendMessage = useCallback(async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || !companyId || !user) return;

    const tid = threadId ?? newThreadId();
    if (!threadId) {
      setThreadId(tid);
      // Reflect the thread in the URL so a refresh keeps you here.
      const params = new URLSearchParams(searchParams.toString());
      params.set("thread", tid);
      router.replace(`/chat?${params.toString()}`);
    }

    setError(null);
    setStreaming(true);
    setInFlight({ userText: message, assistantText: "", toolCalls: [] });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await authedFetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: tid, companyId, message }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error ?? `Stream failed (${res.status})`);
      }

      for await (const evt of readSSE(res, controller.signal)) {
        if (evt.event === "assistant_delta") {
          const d = evt.data as { delta?: string };
          if (typeof d.delta === "string" && d.delta) {
            setInFlight((prev) =>
              prev ? { ...prev, assistantText: prev.assistantText + d.delta } : prev,
            );
          }
        } else if (evt.event === "assistant") {
          // Final full text — useful as a "snap to final" if any delta was lost.
          const d = evt.data as { content?: string };
          if (typeof d.content === "string") {
            setInFlight((prev) => (prev ? { ...prev, assistantText: d.content! } : prev));
          }
        } else if (evt.event === "tool_call") {
          const d = evt.data as {
            id: string;
            name: string;
            args?: Record<string, unknown>;
          };
          setInFlight((prev) =>
            prev
              ? {
                  ...prev,
                  toolCalls: upsertToolCall(prev.toolCalls, {
                    id: d.id,
                    name: d.name,
                    args: d.args,
                    status: "running",
                  }),
                }
              : prev,
          );
        } else if (evt.event === "tool_result") {
          const d = evt.data as { id: string; status?: ToolCall["status"] };
          setInFlight((prev) =>
            prev
              ? {
                  ...prev,
                  toolCalls: markToolCall(prev.toolCalls, d.id, d.status ?? "ok"),
                }
              : prev,
          );
        } else if (evt.event === "error") {
          const d = evt.data as { message?: string };
          throw new Error(d.message ?? "Agent error");
        } else if (evt.event === "done") {
          break;
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStreaming(false);
      // Clear in-flight overlay; the persisted message will arrive via onSnapshot.
      setInFlight(null);
      abortRef.current = null;
    }
  }, [companyId, router, searchParams, threadId, user]);

  const handleSubmit = useCallback(async () => {
    const message = draft;
    setDraft("");
    await sendMessage(message);
  }, [draft, sendMessage]);

  const handleRejectFeedback = useCallback(
    (feedback: string) => {
      void sendMessage(`I rejected the email draft. Here's what to fix: ${feedback}`);
    },
    [sendMessage],
  );

  const renderedMessages = useMemo(() => {
    if (!inFlight) return persistedMessages;

    const hasInflightUser = persistedMessages.some(
      (m) => m.role === "user" && m.content === inFlight.userText,
    );
    const lastPersisted = persistedMessages[persistedMessages.length - 1];
    const hasInflightAssistant =
      lastPersisted?.role === "assistant" &&
      inFlight.assistantText.length > 0 &&
      lastPersisted.content === inFlight.assistantText;

    return [
      ...persistedMessages,
      ...(hasInflightUser ? [] : [synthesizeUserMessage(inFlight.userText)]),
      ...(hasInflightAssistant ? [] : [synthesizeAssistantMessage(inFlight)]),
    ];
  }, [persistedMessages, inFlight]);

  // No company selected: nudge back to dashboard.
  if (!companyId) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        <ThreadsPanel disabled />
        <section className="flex min-w-0 min-h-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <NoCompanySelected />
          </ScrollArea>
        </section>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      <ThreadsPanel disabled={streaming} />

      <section className="flex min-w-0 min-h-0 flex-1 flex-col">
        {company ? (
          <div className="shrink-0 border-b border-border/60 bg-background/60 px-4 py-2.5">
            <div className="mx-auto flex max-w-3xl items-center gap-2 text-sm">
              <Building2 className="size-3.5 text-muted-foreground" />
              <span className="font-medium">{company.name}</span>
              <span className="text-muted-foreground">·</span>
              <span className="truncate text-muted-foreground">{company.domain}</span>
              <Link
                href={`/dashboard/${companyId}`}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                View prospect →
              </Link>
              {(pendingEmail || currentEmail) && !reviewOpen ? (
                <Button
                  size="sm"
                  onClick={() => setReviewOpen(true)}
                  className={cn(
                    "h-7 gap-1.5 rounded-full px-3 text-xs text-white",
                    pendingEmail
                      ? "bg-[var(--brand-violet)] hover:bg-[var(--brand-violet)]/90"
                      : "bg-foreground hover:bg-foreground/90",
                  )}
                >
                  <Mail className="size-3" />
                  {pendingEmail ? "Review email" : "Show email draft"}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <ScrollArea className="min-h-0 flex-1">
          {!threadId ? (
            <ChatEmptyState onPickPrompt={(p) => setDraft(p)} />
          ) : loading && persistedMessages.length === 0 && !inFlight ? (
            <ConversationSkeleton />
          ) : renderedMessages.length === 0 ? (
            <ChatEmptyState onPickPrompt={(p) => setDraft(p)} />
          ) : (
            <MessageList messages={renderedMessages} />
          )}
        </ScrollArea>

        {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

        <div className="shrink-0 border-t border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Composer
            value={draft}
            onChange={setDraft}
            onSubmit={handleSubmit}
            disabled={streaming || !user}
            disabledReason={streaming ? "Agent is working…" : undefined}
            placeholder={
              company
                ? `Ask the agent to research ${company.name}…`
                : "Tell the agent what to look into…"
            }
          />
        </div>
      </section>

      {reviewOpen ? (
        <EmailReviewPanel
          companyId={companyId}
          pending={pendingEmail}
          current={currentEmail}
          onClose={() => setReviewOpen(false)}
          onRejectWithFeedback={handleRejectFeedback}
        />
      ) : null}
    </div>
  );
}

type InFlightState = {
  userText: string;
  assistantText: string;
  toolCalls: ToolCall[];
};

function upsertToolCall(list: ToolCall[], next: ToolCall): ToolCall[] {
  const idx = list.findIndex((c) => c.id === next.id);
  if (idx === -1) return [...list, next];
  const copy = list.slice();
  copy[idx] = { ...copy[idx], ...next };
  return copy;
}

function markToolCall(list: ToolCall[], id: string, status: ToolCall["status"]): ToolCall[] {
  return list.map((c) => (c.id === id ? { ...c, status } : c));
}

function synthesizeUserMessage(text: string): ChatMessage {
  return {
    id: "__inflight_user",
    role: "user",
    content: text,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: { toDate: () => new Date() } as any,
  };
}

function synthesizeAssistantMessage(state: InFlightState): ChatMessage {
  return {
    id: "__inflight_assistant",
    role: "assistant",
    content: state.assistantText,
    toolCalls: state.toolCalls,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: { toDate: () => new Date() } as any,
  };
}

function newThreadId(): string {
  // RFC4122-ish ID generation suitable for Firestore doc IDs (no slashes).
  return (
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}

function NoCompanySelected() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-6 py-16 text-center">
      <h2 className="text-xl font-semibold">Pick a prospect to chat about.</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Every chat is attached to a company so the agent knows where to file its findings.
      </p>
      <Button
        asChild
        className="mt-6 h-10 rounded-full bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90"
      >
        <Link href="/dashboard">
          Go to dashboard
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div className="flex justify-end gap-3">
        <Skeleton className="h-10 w-2/3 rounded-2xl" />
        <Skeleton className="size-7 rounded-md" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="size-7 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3 rounded-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="border-t border-destructive/30 bg-destructive/5 px-4 py-2">
      <div className="mx-auto flex max-w-3xl items-center gap-2 text-sm text-destructive">
        <AlertCircle className="size-4 shrink-0" />
        <p className="flex-1">{message}</p>
        <Button variant="ghost" size="sm" onClick={onDismiss} className="h-7">
          Dismiss
        </Button>
      </div>
    </div>
  );
}
