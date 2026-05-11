import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const FAQ_ITEMS = [
  {
    q: "How is this different from a sales-engagement tool like Outreach or Apollo?",
    a: "Outreach and Apollo automate sending. Agent Email automates the part that comes before: the research and the writing. We give your reps a fully-loaded dossier and a draft they can actually send, then hand it off to whatever tool sends your mail.",
  },
  {
    q: "Where does the research come from? Is it scraped?",
    a: "No scraping. The agent uses live web search and only pulls from public, citable pages — news outlets, company sites, podcasts, press releases. Every claim in the dossier links back to its source so you can verify before you send.",
  },
  {
    q: "Can I review and edit the emails before they go out?",
    a: "Yes — that’s the default. Every draft pauses for your approval with a one-click Approve, Reject (with optional note), or “rewrite with this angle.” Nothing is ever sent automatically without you saying so.",
  },
  {
    q: "Will it sound like an AI wrote it?",
    a: "It shouldn’t. The agent grounds every email in the specific company context it just researched — a recent hire, a funding event, a product update — and pairs it with a recommended send trigger. The result reads like a senior SDR who genuinely paid attention.",
  },
  {
    q: "What model and infrastructure does it run on?",
    a: "Agent Email is built on LangGraph for the agent orchestration, OpenAI for generation and reasoning, Tavily for web search, and Firestore for the live dossier and chat history. Human-in-the-loop approval is implemented with LangGraph’s native interrupt() so the agent can pause and resume safely.",
  },
  {
    q: "Who is this for?",
    a: "Founders running their own outbound, SDR teams at seed-to-Series-B B2B startups, and revenue ops leaders who want their reps spending time on conversations — not tab-switching between LinkedIn, Crunchbase, and the company blog.",
  },
] as const;

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
      <div className="flex flex-col items-center gap-4 text-center">
        <Badge
          variant="outline"
          className="h-7 rounded-full border-primary/20 px-3 text-xs text-primary"
        >
          FAQ
        </Badge>
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Everything sales leaders ask before switching.
        </h2>
        <p className="text-pretty text-base text-muted-foreground md:text-lg">
          Still have questions? The shortest demo is a 30-second prospect run —
          try it free, no signup.
        </p>
      </div>

      <Accordion type="single" collapsible className="mt-12">
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-base font-medium">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-base leading-relaxed text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
