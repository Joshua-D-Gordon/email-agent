import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Airy white-to-violet wash, soft side orbs */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-[var(--brand-violet-soft)] via-background to-background"
      />
      <div
        aria-hidden
        className="absolute right-[-15%] top-10 -z-10 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,oklch(0.62_0.22_295/0.18),transparent_70%)] blur-3xl"
      />
      <div
        aria-hidden
        className="absolute left-[-15%] top-40 -z-10 h-[480px] w-[480px] rounded-full bg-[radial-gradient(closest-side,oklch(0.62_0.22_295/0.12),transparent_70%)] blur-3xl"
      />

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 pb-24 pt-20 text-center md:pt-28">
        <Badge
          variant="outline"
          className="h-7 gap-1.5 rounded-full border-[var(--brand-violet)]/25 bg-background/70 px-3 text-xs font-medium text-[var(--brand-violet-deep)] backdrop-blur"
        >
          <Sparkles className="size-3.5" />
          AI-native outbound for B2B teams
        </Badge>

        <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
          Cold email that reads like{" "}
          <span className="bg-gradient-to-r from-foreground via-[var(--brand-violet-deep)] to-[var(--brand-violet)] bg-clip-text text-transparent">
            you actually did your homework.
          </span>
        </h1>

        <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
          Agent Email researches every prospect on the open web, builds a live
          dossier in seconds, and drafts a personalized email with the right
          moment to send it — so your reps stop guessing and your replies
          actually come back.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="h-12 rounded-full bg-foreground px-6 text-base font-semibold text-background shadow-md transition hover:bg-foreground/90 hover:shadow-lg"
          >
            <Link href="/chat">
              Research my first prospect
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 rounded-full border-border/80 bg-background/60 px-6 text-base font-medium backdrop-blur hover:bg-background"
          >
            <Link href="/dashboard">See a live dossier</Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-[var(--cta)]" />
            No credit card. No scraping. Cited sources.
          </span>
          <span aria-hidden className="hidden text-muted-foreground/40 sm:inline">•</span>
          <span>Built on LangGraph + OpenAI</span>
        </div>
      </div>
    </section>
  );
}
