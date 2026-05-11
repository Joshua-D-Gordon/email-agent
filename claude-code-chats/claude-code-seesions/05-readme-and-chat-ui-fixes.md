# Session 05 — README, chat-rendering bugs, dashboard data fix, prompt hardening, layout

This session was a cleanup pass after the app was largely working end-to-end:
write a real README so a fellow developer can run the project, then chase down
three concrete bugs the user hit while testing — duplicate chat messages,
an empty company-profile card on the dashboard, the agent inlining the email
in chat instead of using the review panel — and finally fix the chat page
scrolling the whole window instead of just the message list.

The recurring theme: most of the bugs were one-line mismatches between
boundaries (server-write vs. live-snapshot, dotted-key syntax vs. `set merge`,
flex column without `min-h-0`). Reading the surrounding code before making the
fix mattered more than the fix itself.

---

## Turn 1

**User:**
> write a detailed readme.md in the readme.md file at the root of the projeect so a fellow developer can run thi locally on his machine @Readme.MD

**Assistant:**
Read the actual project structure before writing anything — `package.json`, `webapp/CLAUDE.md`, `webapp/AGENTS.md`, the existing root `Readme.MD`, the env example, `firestore.rules`, `firebase.json`, `.firebaserc`, the auth context, and the `/api/agent/stream` route. Found several mismatches in the old README: it placed the app at the repo root (it's actually in `webapp/`), referenced `.env.example` at the root (it lives in `webapp/`), and the rules-file comment that "Firebase Auth is not in scope" was stale — auth is wired in via `lib/auth-context.tsx`, the login page, and `verifyIdToken` in the stream route.

Rewrote `/Users/joshuagordon/Developer/email-agent/Readme.MD` from scratch with:
1. Repo layout diagram showing `webapp/` as the Next.js root with key subpaths annotated.
2. Prerequisites (Node 18+, OpenAI key, Tavily key, the Firebase service-account JSON provided separately).
3. Setup steps that `cd` into `webapp/` for every npm command, copy `.env.example` to `.env.local` (Next.js convention, matches `webapp/.gitignore`).
4. A table of the four values that actually need to be filled (the `NEXT_PUBLIC_FIREBASE_*` are pre-filled in `.env.example` and safe to ship — Firebase web API keys are designed for browser bundles).
5. The `FIREBASE_PRIVATE_KEY` pitfall: keep the literal `\n` sequences, wrap the value in double quotes, because `lib/firebase/admin.ts` does `.replace(/\\n/g, "\n")` at runtime.
6. Architecture paragraph listing the three agent tools (`tavily_search`, `updateResearch`, `editDraft`), the SSE streaming route, and the client/admin SDK split.
7. Notes on Firestore rules: client reads four collections via `onSnapshot`, all writes server-side via Admin SDK.
8. Troubleshooting: private-key parse errors, missing auth header on `/api/agent/stream`, empty profile card, Tavily quirks.

End-of-turn summary called out the corrections vs. the old README.

---

## Turn 2

**User:**
> any reaosn when i send a message why it renders twice in the chat?

**Assistant:**
Read `chat/page.tsx`, `message-list.tsx`, `composer.tsx`, then `lib/agent/history.ts` and `app/api/agent/stream/route.ts` to trace the full path. Found the race:

1. On send, the server immediately writes the user message to Firestore via `appendUserMessage` at `route.ts:64`.
2. `useChatMessages(threadId)` is a live `onSnapshot` subscription, so that user doc lands in `persistedMessages` within ~100ms — well before the SSE stream completes.
3. Meanwhile, the client at `chat/page.tsx:183-190` keeps appending `synthesizeUserMessage(inFlight.userText)` to the rendered list for as long as `inFlight` is non-null — which stays true until `done` fires (potentially 10–60s).

The `useMemo` was concatenating `persistedMessages + synthesized overlay` without ever checking for overlap, so during the agent run both copies of the user message rendered.

Explained the bug with code references, then presented two fix options: a content-equality dedupe on the client, or a server restructure that defers the user-message write until the turn completes (cleaner, but loses the message on mid-turn refresh). Asked which to apply.

---

## Turn 3

**User:**
> fix this

**Assistant:**
Applied the content-equality dedupe in `webapp/app/(app)/chat/page.tsx:183-200`:

```ts
const hasInflightUser = persistedMessages.some(
  (m) => m.role === "user" && m.content === inFlight.userText,
);
const lastPersisted = persistedMessages[persistedMessages.length - 1];
const hasInflightAssistant =
  lastPersisted?.role === "assistant" &&
  inFlight.assistantText.length > 0 &&
  lastPersisted.content === inFlight.assistantText;

return [
  ...persistedMessages,
  ...(hasInflightUser ? [] : [synthesizeUserMessage(inFlight.userText)]),
  ...(hasInflightAssistant ? [] : [synthesizeAssistantMessage(inFlight)]),
];
```

Flagged the one fragility: exact `content` equality on the assistant text. If the persisted version ever diverges from `inFlight.assistantText` (whitespace trim somewhere, etc.) you'd briefly see both rows until `done` clears the overlay. In practice the SSE route writes both from the same `text` variable so they should always match.

---

## Turn 4

**User:**
> add a tool called: "upate company profile" the agent must update the company profile data each time it learns new stuff....
>
> make this as a tool

**Assistant:**
Caught that `updateResearch` already exists in `lib/agent/tools.ts` and does exactly this. Rather than blindly adding a duplicate tool, used `AskUserQuestion` to clarify intent: rename the existing tool, add a second one alongside, or replace with a new simpler version.

User's response: *"perfect if its there its not oding its job.... company profile - still emepty on dahsbaord/moday-com page"*

So the real complaint was that the tool exists but isn't populating the dashboard. Read `app/(app)/dashboard/[companyId]/page.tsx`, `lib/companies-client.ts`, `lib/types.ts` to confirm the data flow (tool writes → Firestore → `onSnapshot` hook → `company.profile.description` rendered on the Profile panel). The wiring was fine. Then re-read the tool implementation more carefully and found the actual bug at `tools.ts:117`:

```ts
patch[`profile.${key}`] = input[key];   // dotted key, set merge: true
await companyRef.set(patch, { merge: true });
```

This is a classic Firestore footgun. **Dotted paths like `"profile.description"` are only treated as nested-field paths by `update()`. With `set({ merge: true })`, the key is written *literally* as a top-level field whose name contains a dot.** So the doc ended up with `"profile.description": "..."` at the root, and `company.profile.description` (which the dashboard reads) stayed `undefined`. The empty-state at `dashboard/[companyId]/page.tsx:179` ("The agent hasn't written a description yet.") was correctly reporting the truth.

Fixed `webapp/lib/agent/tools.ts:81-118` to build a nested object instead:

```ts
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
```

Now `merge: true` deep-merges into `profile` and subsequent tool calls accumulate fields correctly. Noted that companies created before this fix still have the bad-shaped data at the doc root and either need to be re-run or have those literal-dotted fields manually deleted from the Firebase Console.

---

## Turn 5

**User:**
> perfect, just ran a test andagnet answered email in chat and not in the editor.. please harden system promt a little aroun this that agent MUST use the tool to t=show the email preview

**Assistant:**
Read the existing system prompt in `webapp/lib/agent/graph.ts` and the `editDraft` tool description in `tools.ts`. Tightened both — system prompt is one signal, but the model often weighs the tool description more heavily at the decision point, so duplicating the rule across both surfaces is sturdier than only patching one.

Changes:
- `graph.ts:74-90` — added an explicit "HARD RULE" block to the system prompt that bans writing the subject/body as prose in any form (code block, quoted text, "here's what I'd send" preview), explains *why* (the review panel only renders what `editDraft` writes), tells the agent that even "show me the email" must be answered by calling the tool, and that post-call chat replies should be a SHORT pointer to the panel only.
- Workflow bullets in the same prompt updated to say "draft an email by calling editDraft (NOT by writing the email in chat) and stop."
- `tools.ts:163` — rewrote the `editDraft` tool description with the same constraint, so the model reads the rule right at the call site.

Flagged one caveat: gpt-4o still occasionally inlines drafts under prompt pressure (e.g. when the user explicitly says "just show me what you'd write"). If prompt hardening turns out not to be sticky enough in practice, offered a server-side fallback as a sturdier backup: after the agent run, scan the final assistant message; if it looks email-shaped but no `editDraft` was called, auto-fire `editDraft` from the assistant text or reject the turn.

---

## Turn 6

**User:**
> perfect.. lastly the whole chat page scrolls... this isnt good...
>
> promt bar should be sticky at the bottom and page shouldnt scroll, nether should the side section with emai preview... also company profile header and view prospect button shouldnt scrol the only thng that should scroll is the actuall chat messages section:
>
> ```
> [company_profile_name                 view prospect -> ]
> [                               chat area that should scroll         ]
> [promt bar section                                                        ]
> ```

**Assistant:**
Diagnosed the cause before patching anything: in a flex column, children default to `min-height: auto`, which lets them overflow their container. The outer wrapper was `flex h-[calc(100vh-3.5rem)]` (correct), the middle column was `flex flex-col` (correct), but the `<ScrollArea>` set to `flex-1` had no `min-h-0` — so its content height won out and pushed the entire `<main>` past the viewport. The whole page scrolled instead of just the messages. Same pattern in the email-review aside and the threads sidebar.

The "magic words" for "make me actually scroll inside a flex column": `min-h-0` on the column itself and on the growable child, plus `shrink-0` on the header/footer regions you want pinned.

Patched three files:
- `webapp/app/(app)/chat/page.tsx:205-217` — outer row gets `overflow-hidden`, middle `<section>` gets `min-h-0`, company header strip and composer wrapper get `shrink-0`, the chat `<ScrollArea>` gets `min-h-0 flex-1`. Same treatment on the `!companyId` fallback branch.
- `webapp/app/(app)/chat/_components/email-review-panel.tsx:83-103` — `<aside>` gets `h-full min-h-0`, top header bar and bottom action footer get `shrink-0`, the draft-body region gets `min-h-0 flex-1 overflow-y-auto`.
- `webapp/app/(app)/chat/_components/threads-panel.tsx:32-51` — sidebar `<aside>` gets `h-full min-h-0`, "New chat" button row and "Recent" header get `shrink-0`, the threads `<ScrollArea>` gets `min-h-0 flex-1`.

Result: only three regions scroll now, each within its own column — the thread list (left), the chat messages (middle), and the email draft body (right, when open). The company-name strip, the "View prospect →" link, the composer, and the email-panel action buttons stay pinned.
