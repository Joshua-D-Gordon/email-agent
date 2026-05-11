import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-[oklch(0.12_0_0)] px-8 py-16 text-center shadow-xl md:px-16 md:py-20">
        <div
          aria-hidden
          className="absolute -right-24 -top-24 size-96 rounded-full bg-[radial-gradient(closest-side,oklch(0.62_0.22_295/0.40),transparent_70%)] blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-28 -left-16 size-80 rounded-full bg-[radial-gradient(closest-side,oklch(0.62_0.22_295/0.25),transparent_70%)] blur-3xl"
        />

        <div className="relative flex flex-col items-center gap-6">
          <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            Your reps are spending half their day on research.
            <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-white to-[var(--brand-violet)] bg-clip-text text-transparent">
              Give them that day back.
            </span>
          </h2>
          <p className="max-w-xl text-pretty text-base text-white/70 md:text-lg">
            Try Agent Email on a real prospect — no signup, no credit card.
            You’ll have a dossier and a sendable draft in under a minute.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-[var(--cta)] px-6 text-base font-semibold text-[var(--cta-foreground)] shadow-lg hover:bg-[var(--cta)]/90"
            >
              <Link href="/chat">
                Start free
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="h-12 rounded-full px-6 text-base font-medium text-white/90 hover:bg-white/10 hover:text-white"
            >
              <Link href="/dashboard">Browse a live dossier</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
