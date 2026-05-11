import {
  Search,
  FileText,
  Mail,
  Clock,
  Workflow,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const FEATURES: Feature[] = [
  {
    title: "Live web research, not scraping",
    description:
      "An AI agent searches the open web in real time — funding rounds, hires, product launches, podcast quotes — and cites every source it used.",
    icon: Search,
  },
  {
    title: "Structured dossiers, updated as it works",
    description:
      "Watch the company profile assemble itself: industry, headcount, tech stack, key people, recent news. Streamed to your dashboard in real time.",
    icon: FileText,
  },
  {
    title: "Personalized email drafts",
    description:
      "Subject line, body, and the exact send trigger — generated from the research, not a Mad Libs template. Sounds like a senior SDR wrote it.",
    icon: Mail,
  },
  {
    title: "Send-trigger recommendations",
    description:
      "“Right after their Q3 earnings call.” “The week they ship Series B hires.” Get a reason to land in the inbox at the moment of maximum relevance.",
    icon: Clock,
  },
  {
    title: "Human-in-the-loop approval",
    description:
      "Every draft pauses for your approval before it’s saved. Approve, reject with a one-line note, or have the agent rewrite — your call, every time.",
    icon: Workflow,
  },
  {
    title: "Auditable by design",
    description:
      "Sources, timestamps, and revision history live next to every email. Replyable claims only — nothing the agent can’t back up with a link.",
    icon: ShieldCheck,
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <Badge
          variant="outline"
          className="h-7 rounded-full border-primary/20 px-3 text-xs text-primary"
        >
          What it does
        </Badge>
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          From a company name to a sendable email — without the busywork.
        </h2>
        <p className="text-pretty text-base text-muted-foreground md:text-lg">
          Agent email handles the parts of outbound that drain a sales rep’s
          day, so your team can focus on the conversations the AI just earned
          you.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.title}
              className="group relative overflow-hidden border-border/60 transition hover:border-border hover:shadow-md"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[var(--brand-violet-soft)] text-[var(--brand-violet-deep)]">
                  <Icon className="size-5" />
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
