# Session 01 — Planning the SuperFunnel Home Assignment

Date: 2026-05-10 → 2026-05-11
Goal: Produce a blueprint (`plan.md`) for the B2B Outbound Profiler & Email Agent assignment that we can follow throughout development.

---

## Prompt 1 (user)

> @claude-code-chats/plan.md , i want to wirte a plan that we will use a s a blue print throughout our developmenet session in terms of building the follwoing: @claude-code-chats/SuperFunnel Home Assignment_ B2B Outbound Profiler & Email Agent (1).pdf

### Summary of assistant response

- Read the assignment PDF to understand requirements (chat UI + dashboard, LangGraph agent, Tavily/Firecrawl, Firestore, React+TS+shadcn, HITL or streaming, local-only).
- Listed the project directory — empty repo, blank `plan.md`.
- Asked four clarifying questions before drafting the plan:
  1. Which advanced challenge to implement (HITL / streaming / both)
  2. Backend topology (Next.js API routes / Vite + Express / Vite + Firebase Functions)
  3. Web research tool (Tavily / Firecrawl / both)
  4. Chat↔dashboard sync (`onSnapshot` / SSE / polling)
- User answers: **Both HITL + Streaming**, **Tavily**, **Firestore `onSnapshot`**, and a counter-question on the backend choice ("are Firestore/Firebase even a backend?").

---

## Prompt 2 (user)

> so this part i dont understand... like the assigment says : "backend and database firestore and firebase" but like are those even a backend?

### Summary of assistant response

- Explained that Firestore is a database with auth + realtime sync, and that in many Firebase apps the client SDK + Firestore + rules effectively *are* the backend.
- Clarified why our LangGraph agent must still run server-side anyway: secret API keys, `interrupt()` checkpointer needs a persistent server, streaming needs a server endpoint.
- Presented the three topology options as a table (Next.js API routes / Vite+Express / Vite+Firebase Functions) and noted that Firestore stays as the DB in all of them.
- Recommended **Next.js API routes** for simplest local setup, noting Next.js ≠ Vercel.
- Re-asked the backend-shape question.

---

## Prompt 3 (user)

> sorry for pushing back again, they specificly not to use vercel... i want to go exactly by the instrcutions... is there know serverless firebase functions or somthing like that we could use? or somthing else in firestore?

### Summary of assistant response

- Validated the pushback: Vercel ≠ Next.js, but acknowledged the user wants to follow the brief in spirit.
- Proposed **Firebase Cloud Functions** as the unambiguously Firebase-native serverless backend, run locally via the Firebase Emulator Suite — satisfies "Backend & Database: Firestore (Firebase)" + "no Vercel" + "local only."
- Drew an ASCII architecture diagram: Vite/React/TS/shadcn frontend ↔ Firebase Functions (emulator) ↔ Firestore (emulator), with secrets in `.env`.
- Flagged the open caveat: Functions are stateless per invocation, so LangGraph's `interrupt()` needs a Firestore-backed checkpointer.
- Asked the user to lock in this architecture.

---

## Prompt 4 (user)

> write me a polite email to the person who gave me this explaining that i have gone over the assigment and am thinking about how to tackel it, and that just the dtaabase and backemd lien: firebase and firestore is confusing and if he could re affirm whjat he wants, i think thats best

### Summary of assistant response

- Endorsed the approach (better to clarify with the source than guess).
- Drafted a polite email to the assignment sender:
  - Thanked them for the assignment.
  - Quoted the ambiguous line.
  - Asked whether "Backend" implies Firebase Cloud Functions (running locally via emulator) with Firestore as the DB, or whether a plain Node/Express server is acceptable as long as Firestore is the DB and Vercel isn't involved.
  - Offered to proceed either way once clarified.
- Offered to tweak tone, length, or add a timeline sentence.

---

## Prompt 5 (user)

> after clarification: for the backend the only requirement is that you use typescript, you are free to use any frame work you want

### Summary of assistant response

- Acknowledged unlocked freedom and recommended **Vite + React + TS + shadcn** frontend with **Node + Express + TS** backend hosting LangGraph; Firestore + `onSnapshot` for sync.
- Asked two questions:
  1. Confirm the stack (Vite + Express / Vite + Fastify / Vite + Hono)
  2. LLM provider (Anthropic / OpenAI / pluggable)
- User answers: counter-question ("why not then just nextjs?") and **OpenAI**.

---

## Prompt 6 (user)

> why not then just nextjs?

### Summary of assistant response

- Presented an honest tradeoff table: Next.js (App Router) vs Vite + Express on dev workflow, server code, SSE streaming, TS coverage, Vercel coupling, and interviewer familiarity.
- Clarified that Next.js is OSS/MIT-licensed and not Vercel — and that the clarification email made the "no Vercel" line about deployment, which doesn't apply since we're local-only.
- Recommended **Next.js (App Router) + TS + shadcn/ui + LangGraph + OpenAI + Firestore (with `onSnapshot` on client, Admin SDK on server)**.
- Asked to lock the stack (Yes / Pages Router / Hold).

---

## Prompt 7 (user)

> Yes — write the plan

### Summary of assistant response

- Wrote the full blueprint to `claude-code-chats/plan.md`. Sections:
  1. **Goal** — one-paragraph restatement of the assignment.
  2. **Locked decisions** — table covering framework, UI lib, AI orchestration, LLM, web tool, DB, dashboard sync, streaming, HITL, auth, hosting.
  3. **Architecture** — ASCII diagram of Next.js app, API routes, Firestore reads/writes split, why this shape was chosen.
  4. **Data model** — Firestore collections: `companies`, `companies/{id}/emails`, `chats`, `chats/{id}/messages`, `checkpoints` (TypeScript shapes).
  5. **LangGraph design** — agent state type, node list (`router`, `research`, `extract`, `persistProfile`, `draftEmail`, `approveEmail`, `persistEmail`), edge graph, custom Firestore checkpointer rationale.
  6. **API surface** — Route Handlers: `/api/agent/stream` (SSE POST), `/api/agent/resume`, `/api/agent/threads`, `/api/companies`.
  7. **UI** — `/` chat page (left rail threads, tool-call chips, streaming reasoning, inline Approve/Reject card) + `/dashboard` (company table, drawer/detail with live profile + emails). shadcn component list.
  8. **Project layout** — full tree from `app/` to `lib/agent/nodes/`.
  9. **Environment** — `.env.example` keys for OpenAI, Tavily, Firebase client + admin, optional emulator host.
  10. **Build order** — 9 milestones with rough hour estimates totaling ~13h: scaffold → Firestore wiring → bare LangGraph + SSE → Tavily research loop → profile persistence → email drafting → HITL → polish → stretch.
  11. **Risks & open questions** — Firestore rules, OpenAI cost (mini for extract, 4o for research/draft), Tavily rate limits, checkpointer correctness, Next.js dev-mode SSE quirks, chat history.
  12. **Deliverables** — repo link, README, AI chat history folder.

---

## Prompt 8 (user)

> use your @.claude/agents/claude-code-chats.md and insert a copy of this conversation

### Summary of assistant response

- Read the agent instruction file: copy exact user prompts + summary of assistant responses to `claude-code-chats/` in markdown so a human evaluator can assess developer↔AI communication.
- Listed the chat-log folder, found empty `claude-code-seesions/` subfolder.
- Wrote this session log as `claude-code-seesions/01-planning-session.md` capturing all 8 prompts and response summaries.
