import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STEPS = [
  {
    n: "01",
    title: "Name the company.",
    body: "Drop a name, a domain, or a LinkedIn URL into the chat. The agent picks up from there — no forms, no scraping setup.",
  },
  {
    n: "02",
    title: "Watch the dossier build itself.",
    body: "The agent searches the open web, structures what it finds into a live profile, and streams every step to your dashboard. Sources cited inline.",
  },
  {
    n: "03",
    title: "Approve the draft and the send moment.",
    body: "You get a personalized email and a recommended send trigger. Approve, edit, or have the agent rewrite — then send from your inbox of choice.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-y border-border/40 bg-muted/30 py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <Badge
            variant="outline"
            className="h-7 rounded-full border-primary/20 px-3 text-xs text-primary"
          >
            How it works
          </Badge>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Three steps. About thirty seconds.
          </h2>
          <p className="text-pretty text-base text-muted-foreground md:text-lg">
            Built so a first-time user can go from blank screen to sendable
            email without reading the docs.
          </p>
        </div>

        <ol className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.n}>
              <Card className="h-full border-border/60 transition hover:border-border hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <div className="flex items-baseline gap-3">
                    <span className="bg-gradient-to-br from-foreground to-[var(--brand-violet)] bg-clip-text text-3xl font-semibold text-transparent">
                      {step.n}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span
                        aria-hidden
                        className="hidden h-px flex-1 bg-border md:block"
                      />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
