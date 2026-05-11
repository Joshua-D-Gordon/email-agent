"use client";

import { Sparkles, Search, FileText, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { NewProspectDialog } from "./new-prospect-dialog";

export function EmptyState() {
  return (
    <div className="relative mx-auto max-w-3xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[var(--brand-violet-soft)] via-transparent to-transparent opacity-60"
      />

      <Card className="relative overflow-hidden border-border/70 p-10 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 -top-20 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,oklch(0.62_0.22_295/0.18),transparent_70%)] blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-16 -z-10 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,oklch(0.81_0.21_142/0.12),transparent_70%)] blur-2xl"
        />

        <div className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
          <Sparkles className="size-5" />
        </div>

        <h2 className="mt-5 text-2xl font-semibold tracking-tight">
          Your first prospect is one chat away.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-pretty text-sm text-muted-foreground">
          Ask the agent to research a company and the profile will assemble itself here in real
          time — key people, tech stack, recent news, and a drafted email with the right send
          trigger.
        </p>

        <div className="mt-6 flex justify-center">
          <NewProspectDialog />
        </div>

        <div className="mt-10 grid gap-3 text-left sm:grid-cols-3">
          <Step icon={Search} title="Research" body="The agent searches the open web and cites every source." />
          <Step icon={FileText} title="Profile" body="A live dossier assembles as it works." />
          <Step icon={Mail} title="Draft" body="Personalized email + the right send trigger." />
        </div>
      </Card>
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
    <div className="rounded-xl border border-border/60 bg-background/70 p-4">
      <div className="inline-flex size-8 items-center justify-center rounded-lg bg-[var(--brand-violet-soft)] text-[var(--brand-violet-deep)]">
        <Icon className="size-4" />
      </div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
