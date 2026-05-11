"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquarePlus, MessageSquareDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useChatThreads } from "@/lib/chats-client";
import type { ChatThread } from "@/lib/chat-types";

export function ThreadsPanel({ disabled = false }: { disabled?: boolean }) {
  const { data: threads, loading } = useChatThreads();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeThreadId = searchParams.get("thread");
  const activeCompanyId = searchParams.get("company");

  function selectThread(thread: ChatThread | null) {
    if (!thread) {
      // "New chat" — keep the current company context if there is one.
      router.replace(activeCompanyId ? `/chat?company=${activeCompanyId}` : "/chat");
      return;
    }
    const params = new URLSearchParams();
    if (thread.companyId) params.set("company", thread.companyId);
    params.set("thread", thread.threadId);
    router.replace(`/chat?${params.toString()}`);
  }

  return (
    <aside className="hidden h-full w-64 shrink-0 min-h-0 flex-col border-r border-border/60 bg-background/50 md:flex">
      <div className="shrink-0 border-b border-border/60 p-3">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => selectThread(null)}

          className="w-full justify-start gap-2 rounded-lg border-border/70 bg-background"
        >
          <MessageSquarePlus className="size-4" />
          New chat
        </Button>
      </div>

      <div className="shrink-0 px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Recent
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-2 pb-3">
          {loading ? (
            <div className="space-y-1.5 px-1">
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-5/6 rounded-md" />
            </div>
          ) : threads.length === 0 ? (
            <EmptyThreadList />
          ) : (
            <ul className="space-y-0.5">
              {threads.map((t) => (
                <ThreadRow
                  key={t.threadId}
                  thread={t}
                  active={activeThreadId === t.threadId}
                  onSelect={() => selectThread(t)}
                />
              ))}
            </ul>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

function ThreadRow({
  thread,
  active,
  onSelect,
}: {
  thread: ChatThread;
  active: boolean;
  onSelect: () => void;
}) {
  const label = thread.title?.trim() || "Untitled chat";
  const updated = thread.updatedAt?.toDate?.();
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "group w-full rounded-md px-2.5 py-2 text-left transition",
          active
            ? "bg-[var(--brand-violet-soft)] text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="line-clamp-1 flex-1 text-sm font-medium">{label}</span>
        </div>
        {updated ? (
          <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
            {relativeTime(updated)}
          </p>
        ) : null}
      </button>
    </li>
  );
}

function EmptyThreadList() {
  return (
    <div className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center">
      <MessageSquareDashed className="mx-auto size-5 text-muted-foreground/70" />
      <p className="mt-2 text-xs text-muted-foreground">No chats yet</p>
      <p className="text-[10px] text-muted-foreground/70">
        Conversations land here when the agent ships.
      </p>
    </div>
  );
}

function relativeTime(d: Date): string {
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}
