# agent email — B2B Outbound Profiler & Email Agent

An AI agent that researches a target company on the open web, builds a
structured profile, drafts a personalized cold email, and recommends a send
trigger. The user drives the agent through a chat UI; a dashboard shows every
researched company with its live, streaming dossier.

Built with **Next.js 16** (App Router) + **LangGraph** + **OpenAI** + **Tavily
Search** + **Firestore** (Admin SDK on the server, Web SDK in the browser for
realtime reads) + **Firebase Auth**.

See [`claude-code-chats/plan.md`](claude-code-chats/plan.md) for the full
design rationale and decision log.

---

## Repository layout

The Next.js app lives in [`webapp/`](webapp/). Firebase configuration
(rules, indexes, project alias) lives at the repo root.

```
email-agent/
├── webapp/                       # ← the Next.js app (run all commands here)
│   ├── app/
│   │   ├── (marketing)/          # public landing page
│   │   ├── (auth)/login/         # Firebase Auth sign-in / sign-up
│   │   ├── (app)/                # authed shell — dashboard + chat
│   │   │   ├── dashboard/        # company list + per-company dossier
│   │   │   └── chat/             # agent chat UI + email review panel
│   │   └── api/
│   │       ├── agent/stream/     # SSE endpoint that runs the LangGraph agent
│   │       └── companies/        # create / list / pending-email endpoints
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── client.ts         # browser Firestore + Auth (reads only)
│   │   │   └── admin.ts          # server Admin SDK (agent writes)
│   │   └── agent/                # LangGraph: graph.ts, tools.ts, history.ts
│   ├── .env.example              # ← copy this to .env.local
│   └── package.json
├── firebase.json                 # Firebase CLI config
├── firestore.rules               # deployed security rules
├── firestore.indexes.json
├── .firebaserc                   # project alias → email-agent-71a0e
└── claude-code-chats/            # planning notes (read-only, for context)
```

---

## Prerequisites

- **Node.js 18+** (Next.js 16 requires it; 20 LTS recommended)
- **npm** (or pnpm/yarn — examples below use npm)
- An **OpenAI API key** with access to chat models
- A **Tavily API key** for web search
- A **Firebase service-account JSON** for the hosted `email-agent-71a0e`
  project (provided separately by the author)

You do **not** need to install Firebase locally — the app talks to hosted
Firestore. No emulator, no second terminal.

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url> email-agent
cd email-agent/webapp
npm install
```

> All `npm` commands below must be run from inside [`webapp/`](webapp/), not
> the repo root.

### 2. Create your env file

```bash
cp .env.example .env.local
```

`.env.local` is git-ignored. Open it and fill in the five values described
below — everything else in `.env.example` is already filled in with the real
public Firebase config for the hosted project.

#### Required values

| Variable | Where to get it |
|---|---|
| `OPENAI_API_KEY` | <https://platform.openai.com/api-keys> |
| `TAVILY_API_KEY` | <https://app.tavily.com> |
| `FIREBASE_CLIENT_EMAIL` | `client_email` field of the service-account JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` field of the service-account JSON |

#### Pasting `FIREBASE_PRIVATE_KEY` correctly

This is the part that trips people up. The service-account JSON looks like:

```json
{
  "client_email": "firebase-adminsdk-xxxxx@email-agent-71a0e.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
}
```

Copy the `private_key` value **verbatim**, including the literal `\n`
sequences, and wrap it in double quotes:

```bash
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

The Admin SDK init code at [`lib/firebase/admin.ts`](webapp/lib/firebase/admin.ts)
unescapes the `\n` sequences back into real newlines at runtime.

#### The `NEXT_PUBLIC_FIREBASE_*` values

These are already filled in in `.env.example` and are safe to commit /
publish. Firebase web API keys are designed to ship in browser bundles —
security is enforced by [`firestore.rules`](firestore.rules), not by hiding
the key.

### 3. (Optional) Verify Firestore rules are deployed

The hosted project already has the rules deployed. If you ever edit
[`firestore.rules`](firestore.rules), redeploy from the repo root with:

```bash
npx firebase deploy --only firestore:rules
```

You'll need `firebase login` and access to the `email-agent-71a0e` project
for this — not required for normal local development.

---

## Running

From [`webapp/`](webapp/):

```bash
npm run dev
```

Then open <http://localhost:3000>.

- The landing page is at `/`.
- Sign up or sign in at `/login` (Firebase Auth — email + password).
- The dashboard is at `/dashboard`. Add a prospect, then click into a company
  to open the chat at `/chat?company=<id>`.
- The agent will research the company live; the dashboard card updates in
  real time as `updateResearch` writes facts. Once a draft is saved you'll
  see an email-review panel where you approve or reject it.

### Other scripts

```bash
npm run build   # production build (Next.js)
npm run start   # serve the production build
npm run lint    # ESLint
```

---

## Architecture, in one paragraph

The browser uses the **Firebase Web SDK** to sign the user in and to
**subscribe** (via `onSnapshot`) to companies, emails, chats, and messages
for the realtime dashboard — it never writes. The chat UI calls
[`/api/agent/stream`](webapp/app/api/agent/stream/route.ts) with a Firebase ID
token; that route verifies the token server-side, then runs a **LangGraph**
agent built on `createAgent` with three tools:

1. **`tavily_search`** — open-web research (Tavily).
2. **`updateResearch`** — patches `companies/{id}` with structured facts
   (description, industry, key people, news, funding, sources). Each call
   appears on the dashboard within a frame.
3. **`editDraft`** — saves a cold-email draft to
   `companies/{id}/emails/pending` and marks it `pending_approval`. The agent
   then stops and waits for the user to approve or reject in the UI.

All server-side writes use the **Firebase Admin SDK**, which bypasses
Firestore rules. The full prompt and workflow are in
[`webapp/lib/agent/graph.ts`](webapp/lib/agent/graph.ts).

---

## Firestore security rules

[`firestore.rules`](firestore.rules) allows the browser to **read** the four
collections the dashboard subscribes to (`companies`, `companies/.../emails`,
`chats`, `chats/.../messages`) and **denies all writes from clients**. The
agent does every write via the Admin SDK on the server. Checkpoints are
server-only.

The rules file has inline comments explaining the data model and a
"production hardening" sketch (add per-user `ownerUid` scoping, payload size
caps, etc.) for when this prototype graduates beyond a single-user demo.

---

## Troubleshooting

**`Error: Failed to parse private key`** — your `FIREBASE_PRIVATE_KEY` is
missing the literal `\n` sequences or isn't wrapped in double quotes. Re-copy
it verbatim from the service-account JSON.

**`Missing Authorization: Bearer <idToken> header` on `/api/agent/stream`** —
you're not signed in, or your session expired. Sign in again at `/login`.

**The dashboard shows an empty profile card after a research run** — the
agent is supposed to call `updateResearch` with `description`, `industry`,
`sizeEstimate`, and `headquarters` after its first search. Check the server
logs; the `PromptInspector` callback in
[`graph.ts`](webapp/lib/agent/graph.ts) dumps the prompt and tool calls.

**Tavily returns nothing useful** — the free tier rate-limits aggressively
and some company names need disambiguation. Try giving the agent a more
specific angle in the chat ("research <company>, focus on their <product>").
