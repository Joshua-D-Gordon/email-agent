"use client";

import { Sparkles, Search, FileText, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";

const PROMPT_CHIPS = [
  "Research Monday.com and draft a cold email to their VP of Sales.",
  "Find the latest funding news for Linear and suggest when to reach out.",
  "Profile Vercel's leadership team and write me an opener.",
];

export function ChatEmptyState({ onPickPrompt }: { onPickPrompt: (prompt: string) => void }) {
  return (
    <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[var(--brand-violet-soft)] via-transparent to-transparent opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-0 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,oklch(0.62_0.22_295/0.16),transparent_70%)] blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-32 -z-10 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,oklch(0.81_0.21_142/0.10),transparent_70%)] blur-2xl"
      />

      <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
        <Sparkles className="size-5" />
      </div>

      <h2 className="mt-6 text-3xl font-semibold tracking-tight">
        Who do you want to{" "}
        <span className="bg-gradient-to-r from-foreground via-[var(--brand-violet-deep)] to-[var(--brand-violet)] bg-clip-text text-transparent">
          research
        </span>
        ?
      </h2>
      <p className="mt-2 max-w-md text-pretty text-sm text-muted-foreground">
        Tell the agent which company to look into. It searches the open web, builds a live
        dossier, and drafts a personalized email with the right moment to send it.
      </p>

      <div className="mt-8 grid w-full gap-2">
        {PROMPT_CHIPS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPickPrompt(p)}
            className="group rounded-xl border border-border/70 bg-background/70 px-4 py-3 text-left text-sm transition hover:border-[var(--brand-violet)]/30 hover:bg-background hover:shadow-sm"
          >
            <span className="text-foreground">{p}</span>
          </button>
        ))}
      </div>

      <div className="mt-10 grid w-full gap-3 text-left sm:grid-cols-3">
        <Step icon={Search} title="Searches" body="Tavily queries cited inline as they run." />
        <Step icon={FileText} title="Profiles" body="Dossier assembles on the dashboard live." />
        <Step icon={Mail} title="Drafts" body="Email + send trigger when research lands." />
      </div>
    </div>
  );
}

function Step({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <Card className="border-border/60 bg-background/70 p-4">
      <div className="inline-flex size-8 items-center justify-center rounded-lg bg-[var(--brand-violet-soft)] text-[var(--brand-violet-deep)]">
        <Icon className="size-4" />
      </div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </Card>
  );
}
