"use client";

import { useState } from "react";
import { Calendar, Check, Loader2, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { authedFetch } from "@/lib/api-client";
import type { DraftedEmail } from "@/lib/types";

type Props = {
  companyId: string;
  pending: DraftedEmail | null;
  current: DraftedEmail | null;
  onClose: () => void;
  onRejectWithFeedback: (feedback: string) => void;
};

export function EmailReviewPanel({
  companyId,
  pending,
  current,
  onClose,
  onRejectWithFeedback,
}: Props) {
  // What to display in the body: pending takes precedence (it's the one
  // awaiting a decision); otherwise show the most recently approved draft.
  const displayed = pending ?? current;
  const mode: "pending" | "approved" | "empty" = pending
    ? "pending"
    : current
      ? "approved"
      : "empty";
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rejectMode, setRejectMode] = useState(false);

  async function callApi(action: "approve" | "reject") {
    setError(null);
    setBusy(action);
    try {
      const res = await authedFetch(
        `/api/companies/${companyId}/emails/pending`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(null);
      throw err;
    }
    setBusy(null);
  }

  async function handleApprove() {
    try {
      await callApi("approve");
    } catch {
      return;
    }
  }

  async function handleReject() {
    const trimmed = feedback.trim();
    try {
      await callApi("reject");
    } catch {
      return;
    }
    if (trimmed) onRejectWithFeedback(trimmed);
    setFeedback("");
    setRejectMode(false);
  }

  return (
    <aside className="flex h-full w-[28rem] min-w-0 min-h-0 flex-col border-l border-border/60 bg-background">
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="size-3.5 text-muted-foreground" />
          <span className="font-medium">Email draft</span>
          {mode === "pending" ? (
            <span className="rounded-full border border-[var(--brand-violet)]/25 bg-[var(--brand-violet-soft)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--brand-violet-deep)]">
              Pending approval
            </span>
          ) : mode === "approved" ? (
            <span className="rounded-full border border-[var(--cta)]/25 bg-[var(--cta)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[oklch(0.35_0.18_142)]">
              Approved
            </span>
          ) : null}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-2">
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {displayed ? (
          <DraftView email={displayed} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Mail className="size-6 text-muted-foreground/60" />
            <p className="mt-3 text-sm text-muted-foreground">
              No draft yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The agent will save one here once it has enough research.
            </p>
          </div>
        )}
      </div>

      {mode === "approved" ? (
        <div className="shrink-0 border-t border-border/60 bg-background/80 px-4 py-3">
          <p className="text-center text-xs text-muted-foreground">
            Ask the agent in chat to revise this draft.
          </p>
        </div>
      ) : null}

      {mode === "pending" ? (
        <div className="shrink-0 border-t border-border/60 bg-background/80 p-4">
          {rejectMode ? (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                What should the agent fix? (optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Make it shorter, lead with the funding angle instead."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={busy !== null}
                className="flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRejectMode(false);
                    setFeedback("");
                  }}
                  disabled={busy !== null}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleReject}
                  disabled={busy !== null}
                  className="flex-1"
                >
                  {busy === "reject" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <X className="size-3.5" />
                  )}
                  Reject draft
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectMode(true)}
                disabled={busy !== null}
                className="flex-1"
              >
                <X className="size-3.5" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={busy !== null}
                className="flex-1 bg-[var(--cta)] text-white hover:bg-[var(--cta)]/90"
              >
                {busy === "approve" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Approve
              </Button>
            </div>
          )}
          {error ? (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

function DraftView({ email }: { email: DraftedEmail }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Subject
        </p>
        <p className="mt-1 text-sm font-medium">{email.subject}</p>
      </div>

      <Separator />

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Body
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
          {email.body}
        </p>
      </div>

      <div className="rounded-lg border border-[var(--cta)]/20 bg-[var(--cta)]/10 p-3">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.35_0.18_142)]">
          <Calendar className="size-3" />
          Recommended send trigger
        </p>
        <p className="mt-1 text-sm text-foreground">
          {email.recommendedSendTrigger}
        </p>
      </div>
    </div>
  );
}
