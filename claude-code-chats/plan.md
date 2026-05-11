# SuperFunnel — B2B Outbound Profiler & Email Agent

Blueprint for the home assignment. This document is the source of truth for scope, architecture, and the build order. Update it as decisions change.

---

## 1. Goal

Build an end-to-end app where an AI agent researches a target company on the web, incrementally builds a structured profile, drafts a personalized cold email, and recommends a send trigger. The user drives the agent through a chat UI; a dashboard shows every researched company and its live "dossier."

---

## 2. Locked decisions

| Area | Choice | Why |
|---|---|---|
| Frontend framework | **Next.js (App Router) + TypeScript** | One repo, one `npm run dev`, server-side LangGraph in Route Handlers, native streaming via `Response`. Local-only — no Vercel deployment. |
| UI library | **shadcn/ui + Tailwind** | Brief recommends it. Composable, ownable components. |
| AI orchestration | **LangGraph + LangChain (TypeScript)** | Required by brief. LangGraph for the stateful agent loop + `interrupt()` for HITL. |
| LLM | **OpenAI** via `@langchain/openai` | User has keys. `gpt-4o` for the main agent; `gpt-4o-mini` for cheap sub-tasks if needed. |
| Web research | **Tavily** via `@langchain/community/tools/tavily_search` | Search-first API, returns clean snippets + URLs — ideal for "find funding/news/key people." |
| Database | **Firestore (Firebase)** | Required by brief. Client SDK on dashboard for `onSnapshot` realtime; Admin SDK on server for agent writes. |
| Dashboard sync | **Firestore `onSnapshot` listeners** | Zero extra plumbing — agent writes incrementally, dashboard updates live. |
| Streaming | **Server-Sent Events** from Route Handler → chat UI | Native fit for LangGraph's `.stream()` / `.streamEvents()`. |
| HITL | **LangGraph `interrupt()`** with Firestore-backed checkpointer | Pauses before saving final email or overwriting major profile fields. |
| Auth | **None** (single-user local app) | Out of scope. Firestore rules left permissive in emulator, locked-down comment for prod. |
| Hosting | **Local only** (`npm run dev`) | Brief: no deployment expected. |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js app  (localhost:3000)                              │
│                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────────┐ │
│  │  /  (chat page)          │  │  /dashboard              │ │
│  │  - shadcn chat UI        │  │  - company list          │ │
│  │  - streams from SSE      │  │  - company detail dossier│ │
│  │  - Approve/Reject button │  │  - Firestore onSnapshot  │ │
│  └────────────┬─────────────┘  └────────────┬─────────────┘ │
│               │                              │              │
│               │ fetch(SSE)                   │ client SDK   │
│               ▼                              ▼              │
│  ┌────────────────────────────┐    ┌───────────────────────┐│
│  │ /api/agent/stream  (POST)  │    │  Firestore (client)   ││
│  │ /api/agent/resume  (POST)  │    │  read-only subscribe  ││
│  │ /api/agent/list    (GET)   │    └───────────────────────┘│
│  │                            │                             │
│  │  LangGraph agent           │                             │
│  │  ├─ profiler node          │                             │
│  │  ├─ tavily tool node       │                             │
│  │  ├─ profile-writer node    │ ─── Firebase Admin SDK ───► │
│  │  ├─ email-drafter node     │     companies/{id}          │
│  │  └─ approval interrupt     │     emails/{id}             │
│  └────────────────────────────┘     chats/{id}/messages     │
│                                     checkpoints/{threadId}  │
└─────────────────────────────────────────────────────────────┘
```

### Why this shape

- **One Next.js process** handles UI + agent. No two-terminal dance.
- **SSE for streaming**, not WebSockets — Route Handlers stream `Response` bodies trivially and SSE is enough for one-way agent→client.
- **Firestore on the client (read-only) + Admin SDK on the server (writes)** — keeps service-account keys off the browser and lets the dashboard react instantly to agent writes without re-implementing pub/sub.
- **Firestore-backed LangGraph checkpointer** — `interrupt()` needs durable state between the pause and the user's approval. We persist the graph state as JSON under `checkpoints/{threadId}`.

---

## 4. Data model (Firestore)

```ts
// companies/{companyId}
{
  id: string;                    // slug, e.g. "monday-com"
  name: string;                  // "Monday.com"
  domain: string;                // "monday.com"
  status: "researching" | "ready" | "error";
  profile: {
    description?: string;
    industry?: string;
    sizeEstimate?: string;
    headquarters?: string;
    technologies?: string[];     // ["React", "AWS", ...]
    keyPeople?: Array<{ name: string; role: string; source?: string }>;
    recentNews?: Array<{ headline: string; date?: string; url: string; summary?: string }>;
    funding?: { lastRound?: string; amount?: string; date?: string; investors?: string[] };
    socials?: { linkedin?: string; twitter?: string };
  };
  sources: Array<{ url: string; title?: string; fetchedAt: Timestamp }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// companies/{companyId}/emails/{emailId}
{
  id: string;
  subject: string;
  body: string;
  recommendedSendTrigger: string;     // "Right after their Q3 earnings call"
  status: "draft" | "pending_approval" | "approved" | "rejected";
  draftedAt: Timestamp;
  approvedAt?: Timestamp;
  revisionOf?: string;                // previous emailId if user asked for a rewrite
}

// chats/{threadId}
{
  threadId: string;
  companyId?: string;                 // linked once the agent identifies the target
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// chats/{threadId}/messages/{messageId}
{
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  toolCalls?: any;
  createdAt: Timestamp;
}

// checkpoints/{threadId}/steps/{checkpointId}
{
  state: object;                      // serialized LangGraph state
  next: string[];                     // next nodes
  createdAt: Timestamp;
}
```

---

## 5. LangGraph design

### State

```ts
type AgentState = {
  threadId: string;
  companyId?: string;
  userInstruction: string;
  messages: BaseMessage[];           // chat history
  profileDraft: Partial<CompanyProfile>;
  sources: Array<{ url: string; title?: string }>;
  emailDraft?: { subject: string; body: string; recommendedSendTrigger: string };
  pendingApproval?: {
    kind: "save_email" | "overwrite_profile";
    payload: any;
  };
};
```

### Nodes

1. **`router`** — decides next step from user message: start research, refine profile, draft email, rewrite email, answer question.
2. **`research`** — LLM with bound Tavily tool. Runs in a loop until it decides it has enough. Streams tool calls + reasoning.
3. **`extract`** — LLM call that turns raw search results into structured `profileDraft` patches.
4. **`persistProfile`** — Admin SDK write to `companies/{id}`. For destructive overwrites (e.g., replacing a field that already has a value), routes through `interrupt()` first.
5. **`draftEmail`** — generates subject, body, and recommendedSendTrigger from the profile.
6. **`approveEmail`** — `interrupt()` that surfaces the draft to the UI; resumes on Approve, rewrites on Reject (with optional user note).
7. **`persistEmail`** — writes approved email to `companies/{id}/emails/{emailId}`.

### Edges

```
START → router
router → research | draftEmail | extract | END
research → extract
extract → persistProfile
persistProfile → router            (loop until user says "draft the email")
draftEmail → approveEmail
approveEmail → persistEmail | draftEmail   (approve / reject-with-feedback)
persistEmail → END
```

### Checkpointing

Custom `BaseCheckpointSaver` implementation that reads/writes to `checkpoints/{threadId}/steps/*`. Lets us survive a server restart mid-interrupt and supports the HITL resume flow across requests.

---

## 6. API surface (Next.js Route Handlers)

| Route | Method | Purpose |
|---|---|---|
| `/api/agent/stream` | POST | Body: `{ threadId, message }`. Returns SSE stream of `event: token \| tool \| state \| interrupt \| done`. |
| `/api/agent/resume` | POST | Body: `{ threadId, decision: "approve" \| "reject", note? }`. Resumes a paused graph. Returns SSE. |
| `/api/agent/threads` | GET | Lists threads for the dashboard sidebar. |
| `/api/companies` | GET | Lists companies (also available via Firestore client SDK; this is for SSR fallback). |

Frontend uses `fetch` with `ReadableStream` to consume SSE — no extra library needed.

---

## 7. UI

### `/` — Chat
- Left rail: list of past threads (from Firestore).
- Center: shadcn chat layout. Bubbles for user/assistant. Tool-call chips show "🔍 Searching Tavily for 'Monday.com funding 2026'..." in real time.
- Streaming reasoning rendered as a collapsible "thinking" block.
- When an `interrupt` SSE event arrives, render an **Approve / Reject** card inline with the email preview and a "Reason for rejection (optional)" textarea.
- Composer at the bottom; Enter to send, Shift+Enter for newline.

### `/dashboard`
- Table of companies, columns: name, domain, status, last updated, # emails.
- Row click → drawer or `/dashboard/[companyId]` route with two panels:
  - **Profile** (live `onSnapshot` on the company doc).
  - **Emails** (subscribe to `companies/{id}/emails`, show drafts with status badges and the recommended trigger).
- "Open in chat" button jumps back to `/?thread={threadId}`.

### Components (shadcn)
`Button`, `Card`, `Dialog`, `Drawer`, `Input`, `Textarea`, `Tabs`, `Badge`, `Skeleton`, `ScrollArea`, `Separator`, `Tooltip`, `Sonner` (toasts).

---

## 8. Project layout

```
email-agent/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # chat
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── [companyId]/page.tsx
│   └── api/
│       └── agent/
│           ├── stream/route.ts
│           ├── resume/route.ts
│           └── threads/route.ts
├── components/
│   ├── chat/
│   ├── dashboard/
│   └── ui/                         # shadcn output
├── lib/
│   ├── firebase/
│   │   ├── client.ts               # client SDK init
│   │   └── admin.ts                # admin SDK init
│   ├── agent/
│   │   ├── graph.ts                # LangGraph definition
│   │   ├── nodes/
│   │   │   ├── router.ts
│   │   │   ├── research.ts
│   │   │   ├── extract.ts
│   │   │   ├── draftEmail.ts
│   │   │   ├── approveEmail.ts
│   │   │   └── persist.ts
│   │   ├── tools/tavily.ts
│   │   ├── prompts/
│   │   ├── state.ts
│   │   └── checkpointer.ts         # Firestore-backed
│   └── types.ts
├── public/
├── .env.local                      # gitignored
├── .env.example
├── firestore.rules                 # for emulator/prod parity
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

---

## 9. Environment

```
# .env.example
OPENAI_API_KEY=
TAVILY_API_KEY=

# Firebase client (public — these ship to the browser)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-only)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Optional: use Firestore emulator
FIRESTORE_EMULATOR_HOST=localhost:8080
```

---

## 10. Build order

Each milestone is shippable on its own — meaning the app boots and the new slice works end-to-end before moving on. Time estimates are rough.

1. **Scaffold (1h)** — `create-next-app`, Tailwind, shadcn init, Firebase project + Firestore in test mode, `.env.local`, basic `/` and `/dashboard` shells.
2. **Firestore wiring (1h)** — `lib/firebase/client.ts` + `lib/firebase/admin.ts`, dashboard reads a hardcoded company doc via `onSnapshot` and re-renders on change.
3. **Bare LangGraph + OpenAI (2h)** — Single-node graph that echoes a streamed response over SSE. Chat UI renders the stream. No tools yet.
4. **Tavily tool + research loop (2h)** — Bind Tavily, prompt the agent to research a company the user names. Tool-call events stream as chips.
5. **Profile extraction + persistence (2h)** — `extract` node writes to `companies/{id}`, dashboard updates live via `onSnapshot`.
6. **Email drafting (1h)** — `draftEmail` node produces subject/body/trigger, stored as a draft.
7. **HITL with `interrupt()` (2h)** — Approval card in chat, `/api/agent/resume` resumes the graph. Build the Firestore checkpointer here.
8. **Polish (2h)** — Thread list, thread switching, error states, empty states, toasts, README with run instructions.
9. **Stretch (if time)** — "Rewrite email" path, source citations linked in the dossier, simple Firestore security rules.

Total target: **~13 hours of focused work**.

---

## 11. Risks & open questions

- **Firestore rules in dev:** start permissive, document a production-mode ruleset in `firestore.rules` so it's clearly intentional that the local app is unauthenticated.
- **OpenAI cost:** cap `max_tokens` and use `gpt-4o-mini` for the `extract` node; reserve `gpt-4o` for `research` and `draftEmail`. Add a per-thread token counter to the dashboard for visibility (nice-to-have).
- **Tavily rate limits:** wrap calls with a retry-on-429 and surface failures as tool-call error chips in the chat.
- **Checkpointer correctness:** the trickiest piece. Write a small test that pauses at `interrupt()`, kills the request, and resumes it from `/api/agent/resume` to prove durability.
- **Streaming + Next.js dev mode:** verify SSE works through `next dev` HMR; if not, prefer `app/api/.../route.ts` with explicit `runtime = "nodejs"` and a manual `ReadableStream` rather than the streaming helpers.
- **Chat history:** all messages persisted to `chats/{threadId}/messages` for reload + dashboard "Open in chat" jump.

---

## 12. Deliverables (per brief)

1. GitHub repo link.
2. `README.md` with local run instructions and required env vars.
3. Full AI chat history saved alongside the repo (this `claude-code-chats/` folder).
