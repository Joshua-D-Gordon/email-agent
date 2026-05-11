"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import type { ChatMessage, ToolCall } from "@/lib/chat-types";

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Index tool results by toolCallId so an assistant row can render its
  // tool_calls together with their results inline.
  const resultByCallId = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of messages) {
      if (m.role === "tool" && m.toolCallId) {
        map.set(m.toolCallId, m.content);
      }
    }
    return map;
  }, [messages]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      {messages.map((m) => (
        <MessageRow key={m.id} message={m} resultByCallId={resultByCallId} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function MessageRow({
  message,
  resultByCallId,
}: {
  message: ChatMessage;
  resultByCallId: Map<string, string>;
}) {
  if (message.role === "user") return <UserMessage message={message} />;
  // Tool rows are folded into the assistant row that called them.
  if (message.role === "tool") return null;
  return <AssistantMessage message={message} resultByCallId={resultByCallId} />;
}

function UserMessage({ message }: { message: ChatMessage }) {
  const { user } = useAuth();
  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-foreground px-4 py-2.5 text-sm leading-relaxed text-background shadow-sm">
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
      <Avatar className="size-7 rounded-md">
        <AvatarFallback className="rounded-md bg-[var(--brand-violet-soft)] text-[10px] font-semibold text-[var(--brand-violet-deep)]">
          {initials(user?.email)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

function AssistantMessage({
  message,
  resultByCallId,
}: {
  message: ChatMessage;
  resultByCallId: Map<string, string>;
}) {
  return (
    <div className="flex gap-3">
      <Avatar className="size-7 rounded-md">
        <AvatarFallback className="rounded-md bg-foreground text-background">
          <Sparkles className="size-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-2">
        {message.toolCalls && message.toolCalls.length > 0 ? (
          <div className="space-y-1.5">
            {message.toolCalls.map((tc) => (
              <ToolCallRow key={tc.id} call={tc} result={resultByCallId.get(tc.id)} />
            ))}
          </div>
        ) : null}
        {message.content ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {message.content}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ToolCallRow({ call, result }: { call: ToolCall; result: string | undefined }) {
  const [open, setOpen] = useState(false);
  const { label, detail } = describeToolCall(call);
  const hasResult = typeof result === "string" && result.trim().length > 0;
  // Status comes from the in-flight stream while a turn is live, but persisted
  // tool_calls don't carry a status field — so once we have a result back,
  // treat that as proof the call finished even if `call.status` is undefined.
  const status: NonNullable<ToolCall["status"]> = call.status
    ? call.status
    : hasResult
      ? "ok"
      : "running";
  const canExpand = hasResult && status !== "running";

  return (
    <div className="min-w-0">
      <button
        type="button"
        disabled={!canExpand}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
          status === "running" &&
            "border-[var(--brand-violet)]/25 bg-[var(--brand-violet-soft)] text-[var(--brand-violet-deep)]",
          status === "ok" &&
            "border-[var(--cta)]/25 bg-[var(--cta)]/10 text-[oklch(0.35_0.18_142)]",
          status === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
          canExpand ? "cursor-pointer hover:opacity-80" : "cursor-default",
        )}
      >
        {status === "running" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : status === "ok" ? (
          <CheckCircle2 className="size-3" />
        ) : (
          <AlertCircle className="size-3" />
        )}
        <span className="truncate">
          {label}
          {detail ? (
            <span className="opacity-70">
              {"  ·  "}
              {detail}
            </span>
          ) : null}
        </span>
        {canExpand ? (
          <ChevronRight
            className={cn(
              "size-3 shrink-0 transition-transform",
              open && "rotate-90",
            )}
          />
        ) : null}
      </button>

      {open && hasResult ? (
        <div className="mt-2 ml-1 border-l-2 border-border/60 pl-3">
          <ToolResult name={call.name} raw={result!} />
        </div>
      ) : null}
    </div>
  );
}

function describeToolCall(call: ToolCall): { label: string; detail: string | null } {
  const args = (call.args ?? {}) as Record<string, unknown>;
  switch (call.name) {
    case "tavily_search": {
      const query = typeof args.query === "string" ? args.query : null;
      return { label: "Web search", detail: query };
    }
    case "updateResearch": {
      const fields = Object.keys(args).filter((k) => k !== "sources");
      return {
        label: "Saving research",
        detail: fields.length > 0 ? fields.join(", ") : null,
      };
    }
    case "editDraft": {
      const subject = typeof args.subject === "string" ? args.subject : null;
      return { label: "Drafting email", detail: subject };
    }
    default:
      return { label: call.name, detail: null };
  }
}

function ToolResult({ name, raw }: { name: string; raw: string }) {
  if (name === "tavily_search") {
    const parsed = tryParseJson(raw) as TavilyResultShape | null;
    if (parsed && Array.isArray(parsed.results)) {
      return <TavilyResultView results={parsed.results} />;
    }
  }
  // updateResearch / editDraft return a short success string — render plainly.
  if (name === "updateResearch" || name === "editDraft") {
    return <p className="text-xs italic text-muted-foreground">{raw}</p>;
  }
  // Fallback: collapsed-friendly preformatted view, but in a soft style.
  return (
    <pre className="max-h-64 overflow-auto rounded-md bg-muted/40 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
      {raw}
    </pre>
  );
}

type TavilyResult = {
  url?: string;
  title?: string;
  content?: string;
};
type TavilyResultShape = {
  results?: TavilyResult[];
};

function TavilyResultView({ results }: { results: TavilyResult[] }) {
  if (results.length === 0) {
    return <p className="text-xs italic text-muted-foreground">No results.</p>;
  }
  return (
    <ul className="space-y-2">
      {results.map((r, i) => {
        const host = hostFromUrl(r.url);
        return (
          <li key={i} className="min-w-0">
            <a
              href={r.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-md border border-border/60 bg-card p-2.5 transition hover:border-border hover:bg-muted/40"
            >
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="truncate">{host ?? r.url ?? "source"}</span>
                <ExternalLink className="size-3 opacity-0 transition group-hover:opacity-100" />
              </div>
              {r.title ? (
                <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                  {r.title}
                </p>
              ) : null}
              {r.content ? (
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                  {cleanSnippet(r.content)}
                </p>
              ) : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function tryParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function hostFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function cleanSnippet(s: string): string {
  // Tavily content frequently contains literal "\n\n", repeated whitespace,
  // and markdown bullets that look noisy in a 2-line preview.
  return s
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\[\.\.\.\]/g, "…")
    .trim();
}

function initials(email: string | null | undefined): string {
  if (!email) return "U";
  const local = email.split("@")[0] ?? "";
  return local.slice(0, 2).toUpperCase();
}
