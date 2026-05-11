import "server-only";

import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

type ToolContext = {
  companyId: string;
  ownerUid: string;
};

const webSearchTool = new TavilySearch({
  maxResults: 5,
  topic: "general",
  includeAnswer: false,
  searchDepth: "advanced",
});

const updateResearchSchema = z.object({
  description: z.string().optional().describe("One-paragraph company description."),
  industry: z.string().optional().describe("Industry or sector, e.g. 'SaaS / Project management'."),
  sizeEstimate: z.string().optional().describe("Headcount estimate, e.g. '500-1000 employees'."),
  headquarters: z.string().optional().describe("Primary location, e.g. 'Tel Aviv, Israel'."),
  technologies: z
    .array(z.string())
    .optional()
    .describe("Notable technologies in their stack."),
  keyPeople: z
    .array(
      z.object({
        name: z.string(),
        role: z.string(),
        source: z.string().url().optional(),
      }),
    )
    .optional()
    .describe("Founders, executives, or other notable people."),
  recentNews: z
    .array(
      z.object({
        headline: z.string(),
        url: z.string().url(),
        date: z.string().optional().describe("ISO date or 'YYYY-MM-DD'."),
        summary: z.string().optional(),
      }),
    )
    .optional()
    .describe("Recent newsworthy items (funding, launches, hires, milestones)."),
  funding: z
    .object({
      lastRound: z.string().optional().describe("e.g. 'Series C', 'Seed', 'IPO'."),
      amount: z.string().optional().describe("e.g. '$200M'."),
      date: z.string().optional(),
      investors: z.array(z.string()).optional(),
    })
    .optional(),
  sources: z
    .array(
      z.object({
        url: z.string().url(),
        title: z.string().optional(),
      }),
    )
    .optional()
    .describe("URLs you used to derive this update. Always include sources for every fact."),
});

const editDraftSchema = z.object({
  subject: z.string().min(1).describe("Email subject line."),
  body: z.string().min(1).describe("Full email body. Plain text, no signatures."),
  recommendedSendTrigger: z
    .string()
    .min(1)
    .describe(
      "When the user should send this. e.g. 'Right after their Q3 earnings call' or 'Within 48 hours of the funding announcement'.",
    ),
});

export function buildAgentTools(ctx: ToolContext) {
  const updateResearch = tool(
    async (input: z.infer<typeof updateResearchSchema>) => {
      const companyRef = adminDb.collection("companies").doc(ctx.companyId);

      const profileFields = [
        "description",
        "industry",
        "sizeEstimate",
        "headquarters",
        "technologies",
        "keyPeople",
        "recentNews",
        "funding",
      ] as const;

      // Dotted keys (e.g. "profile.description") only work with update(); with
      // set({ merge: true }) they're written as literal top-level fields with
      // dots in their names. Build a nested object instead so `merge: true`
      // recurses into `profile` and the dashboard can read company.profile.X.
      const profilePatch: Record<string, unknown> = {};
      for (const key of profileFields) {
        if (input[key] !== undefined) profilePatch[key] = input[key];
      }

      const patch: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
        status: "researching",
        ownerUid: ctx.ownerUid,
      };
      if (Object.keys(profilePatch).length > 0) {
        patch.profile = profilePatch;
      }

      if (input.sources && input.sources.length > 0) {
        patch.sources = FieldValue.arrayUnion(
          ...input.sources.map((s) => ({
            url: s.url,
            title: s.title ?? null,
            fetchedAt: Timestamp.now(),
          })),
        );
      }

      await companyRef.set(patch, { merge: true });
      return `Updated profile for ${ctx.companyId} with: ${Object.keys(input).join(", ")}.`;
    },
    {
      name: "updateResearch",
      description: `Update the structured research profile for this prospect. Each call patches only the fields you pass; existing fields are preserved.

You MUST populate these identity fields on your first call (or as soon as you have them — usually after the very first web search): description (1–2 paragraphs of what the company does, written for a salesperson), industry, sizeEstimate, headquarters. These render on the dashboard's Company Profile card; if they're empty the user sees an empty card.

Use the other fields (technologies, keyPeople, recentNews, funding) as you discover them. Always include sources for the facts you're writing.

It is normal to call this tool 3–5 times during a research run as new facts come in. Do not batch everything into one giant call — write the identity fields as soon as you have them so the dashboard fills in live.`,
      schema: updateResearchSchema,
    },
  );

  const editDraft = tool(
    async (input: z.infer<typeof editDraftSchema>) => {
      const pendingRef = adminDb
        .collection("companies")
        .doc(ctx.companyId)
        .collection("emails")
        .doc("pending");

      await pendingRef.set({
        id: "pending",
        subject: input.subject,
        body: input.body,
        recommendedSendTrigger: input.recommendedSendTrigger,
        status: "pending_approval",
        draftedAt: FieldValue.serverTimestamp(),
        ownerUid: ctx.ownerUid,
      });

      await adminDb.collection("companies").doc(ctx.companyId).set(
        { updatedAt: FieldValue.serverTimestamp(), status: "ready" },
        { merge: true },
      );

      // The agent must stop here and let the user approve or reject in the UI.
      // The string returned to the model is what the model sees in the next
      // turn — make the expected behavior unambiguous.
      return `Draft saved as PENDING APPROVAL. Subject: ${input.subject}. Do NOT call editDraft again. End your turn now with a one-sentence message telling the user to approve or reject the draft in the email panel. If they reject with feedback, you'll get a new message and can revise.`;
    },
    {
      name: "editDraft",
      description:
        "Save a cold-email draft for the user to review. The draft is saved as PENDING APPROVAL — the user will approve or reject it in a side panel. This tool is the ONLY way to show an email to the user. NEVER write the email's subject or body as prose in the chat reply (no quoted text, no code block, no 'here's what I'd send' preview) — the review panel only renders what this tool writes, so an email pasted into chat is invisible to the approval flow and confuses the user. Only call this once you have enough research. After calling, stop and reply with a SHORT pointer to the panel; do not restate the subject or body in chat, and do not call this tool again in the same turn. If the user rejects with feedback, call this again with the revised draft — again, do not paste the revision into chat.",
      schema: editDraftSchema,
    },
  );

  return [webSearchTool, updateResearch, editDraft];
}
