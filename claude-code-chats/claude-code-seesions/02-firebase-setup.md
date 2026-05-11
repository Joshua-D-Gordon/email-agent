# Session 02 — Wiring up Firebase

Date: 2026-05-11
Goal: Set up Firebase for the SuperFunnel project per `plan.md`. Start with the local emulator approach the plan calls for, then pivot to a hosted Firebase project once we realize the emulator workflow is overkill for a take-home.

---

## Prompt 1 (user)

> for setting up firebase , is it like supabase with a cli? and where you can create the migration files and seed files? or is this diffrent?

### Summary of assistant response

- Explained the similarities and differences between Firebase and Supabase as a table:
  - Both have a CLI (`npx firebase-tools`, `firebase init`, `firebase deploy`).
  - Firestore is **schemaless NoSQL** — there are no migration files; documents take whatever shape your code writes. No seed file system; you'd write a Node script using the Admin SDK to insert documents.
  - Schema is enforced *implicitly* via Security Rules (`firestore.rules`) and indexes (`firestore.indexes.json`).
  - Local dev uses the **Firebase Emulator Suite** (`firebase emulators:start`) rather than Docker Postgres.
- Flagged **Firebase Data Connect** as the supabase-style analog if SQL + migrations were desired.
- Closed with "which database are you using — Firestore (NoSQL) or Data Connect (Postgres)?"

---

## Prompt 2 (user)

> okay so could you please use the npx cli for firebase and set it up in this project based on @claude-code-chats/plan.md , make sure to adhere to best practices as well as use firebase skills that are avaliable to you in you ./claude/skills/ folder.
>
> to clarify we need this to run locally

### Summary of assistant response

- Invoked the `firebase-basics` and `firebase-firestore` skills to read official setup guidance.
- Verified the Firebase CLI works (`npx -y firebase-tools@latest --version` → `15.17.0`) and the project directory is essentially empty.
- Asked three clarifying questions:
  1. **Firebase project strategy:** emulator-only with demo project ID / create real project / use existing project. User picked emulator-only.
  2. **CLI auth status:** verify / already logged in / log in now. User said "already logged in."
  3. **Firestore edition:** Standard vs Enterprise. User picked Standard (matches the skill's caveat that for emulator-only NoSQL workloads, edition doesn't matter).

---

## Prompt 3 (user)

*(answers to the three questions above)*

### Summary of assistant response

- Built a todo list for the scaffolding work.
- Read the relevant skill references: `provisioning.md`, `security_rules.md`, `web_sdk_usage.md`, `firebase-service-init.md`, `web_setup.md`.
- Scaffolded the Firebase config files **manually** (per the skill's instruction to avoid the interactive `firebase init`):
  - `firebase.json` — Firestore + emulator config (Firestore on port 8080, Emulator UI on 4000, `singleProjectMode: true`).
  - `.firebaserc` — default project `demo-email-agent`.
  - `firestore.indexes.json` — empty.
  - `firestore.rules` — full ruleset matching the plan's data model (companies, chats, checkpoints) with permissive client *reads* for the dashboard and **all client writes denied**. Includes a documented "Production hardening sketch" comment block for the eventual auth-gated version. Followed the skill's security_rules.md guidance: assumed-data-model comments at top, default-deny `match /{document=**}`, no `allow read: true` on data containing PII.
- Created `lib/firebase/client.ts` (browser Firestore SDK, auto-connects to emulator when `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` is set) and `lib/firebase/admin.ts` (Admin SDK, falls back to bare `initializeApp({ projectId })` for emulator-mode).
- Wrote `.env` and `.env.example` with the emulator-friendly placeholders (`demo-email-agent` project, `localhost:8080` emulator hosts, blank slots for `OPENAI_API_KEY` and `TAVILY_API_KEY`).
- Updated `.gitignore` to exclude Firebase debug logs and emulator export directories.
- Tried to verify the emulator boots, but `java -version` failed — macOS doesn't have a JDK installed and the Firestore emulator is a Java process.
- Asked the user whether to install Java via Homebrew now or skip verification. User picked **install via Homebrew**.

---

## Prompt 4 (user)

*(approved Java install)*

### Summary of assistant response

- Tried `brew install --cask temurin` first — failed because the `.pkg` installer needs `sudo` and there was no terminal to prompt for a password.
- Pivoted to `brew install openjdk@21` (Homebrew formula, no sudo). Installed successfully but **keg-only** — meaning `java` is not on the default `PATH`, only under `/opt/homebrew/opt/openjdk@21/bin`.
- Booted the emulator with `export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH" && npx firebase emulators:start --only firestore`.
- Used the Monitor tool to watch for the "All emulators ready" line; emulator booted cleanly:
  - Firestore on `127.0.0.1:8080`, Standard edition.
  - Emulator UI on `127.0.0.1:4000`.
  - Demo project ID detected correctly.
- Ran two smoke tests against the REST endpoint:
  1. **Unauthenticated PATCH** of `companies/test-co` → returned `403 PERMISSION_DENIED` citing lines 54 and 80 of `firestore.rules`. Confirms rules are loaded and client writes are blocked.
  2. **PATCH with `Authorization: Bearer owner`** (Admin-SDK-equivalent) → wrote the doc successfully. Subsequent unauthenticated GET returned the doc. Confirms the agent's Admin-SDK write path works and the dashboard's client-read path works.
- Stopped the emulator and the monitor task. Setup verified end-to-end.

---

## Prompt 5 (user, in plan mode)

> how do i run the firebase db locally? like whats the command?

### Summary of assistant response

- Treated this as a planning task (plan mode was active).
- Wrote a plan at `~/.claude/plans/how-do-i-run-melodic-pnueli.md`:
  - The command: `export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH" && npx firebase emulators:start --only firestore`.
  - Explanation of why the PATH export is needed (Homebrew's openjdk@21 is keg-only).
  - Three options for making Java persistently available: one-shot export, append to `~/.zshrc`, or sudo symlink into `/Library/Java/JavaVirtualMachines/`.
  - Optional `--import=./.emulator-data --export-on-exit` flags for persistent emulator data.
  - Verification steps.

---

## Prompt 6 (user, interrupted previous plan)

> no sorry this needs to run localy on the machine the guy who is going to check this assigment is going to run... i cant be having export "joshs computer/ somthing / somthing"
>
> there is no reason why this shouldnt just run locally on any computer who has what ever prequirements are needed

### Summary of assistant response

- Acknowledged that `/opt/homebrew/opt/openjdk@21` is a path specific to my machine that can't ship to a reviewer (who could be on Linux, Intel Mac, or Windows).
- Rewrote the plan with a portability-first framing:
  - Document JDK 11+ as a **standard prerequisite** in the README (alongside Node.js), with install instructions per OS.
  - The shippable command is just `npx firebase emulators:start --only firestore` — once `java` is on the reviewer's PATH (however their OS prefers), the emulator finds it automatically.
  - Verification steps the user can run from a fresh shell to confirm reviewer-portability.
  - Noted that my machine-specific Java setup (the `~/.zshrc` line) is a personal-environment fix and does NOT go in any committed file.
- Called `ExitPlanMode`. Plan approved.

---

## Prompt 7 (user, post-approval)

*(implementation phase after plan approval)*

### Summary of assistant response

- Rewrote `Readme.MD` with the portable hosted/emulator setup:
  - Prerequisites table (Node.js 18+, JDK 11+ with per-OS install instructions).
  - Setup steps (clone, npm install, cp .env.example .env, fill OPENAI/TAVILY keys).
  - Two-terminal run instructions (`npx firebase emulators:start --only firestore` + `npm run dev`).
  - Optional persistent-data flags (`--import=./.emulator-data --export-on-exit`).
  - Project structure diagram.
  - Self-contained verification curl commands.

---

## Prompt 8 (user)

> okay i think we are over enginnering it.. if i use just a hosted firebase project is this easier? like no need fore locally running the db?

### Summary of assistant response

- Confirmed yes, much easier. Compared hosted Firestore (Spark free tier: 50K reads / 20K writes / 1 GB per day) vs the emulator setup:
  - **Hosted**: no Java prereq, no second terminal, reviewer just runs `npm run dev`. Need to share a service account JSON out-of-band. Data persists.
  - **Emulator**: zero credentials to share, hermetic, but reviewer needs Java.
- Recommended hosted for a take-home.
- Listed the 7 steps to switch (create project, enable Firestore, generate service account, update `.env`, remove emulator env vars, deploy rules, update README) and noted that **`lib/firebase/client.ts` and `lib/firebase/admin.ts` already check for the emulator env vars and fall back to real Firebase when those are unset** — so the switch is cheap.
- Asked whether the user has a Firebase project already or wants to create one, and whether to share their service account or have the reviewer bring their own.

---

## Prompt 9 (user)

> perfect! just created a firebase project, now what?

### Summary of assistant response

- Listed the three things needed: Project ID, Web app config, and the service account JSON.
- Explained how to enable Firestore (Console → Firestore Database → Create database → Production mode → region).
- **Flagged a security warning before the user pasted anything**: "the service account JSON contains a private key. Don't paste the whole file into chat. When you're ready, tell me you have it and I'll show you exactly which fields to copy into `.env` (only two: `client_email` and `private_key`)."
- Asked for the project ID.

---

## Prompt 10 (user)

> project-id: email-agent-71a0e

### Summary of assistant response

- Updated `.firebaserc` to point at `email-agent-71a0e`.
- Tried `firebase apps:list WEB --project email-agent-71a0e` to auto-pull the web app config. It failed, but `firebase login:list` showed the CLI was logged in as `joshua.g@lmntix.ai`.

---

## Prompt 11 (user)

> no sorry i should be logged in as joshua.gordon.apply@gmial.com

### Summary of assistant response

- Asked how to switch accounts: add the new account / log out and log in fresh. User picked **log out and log in fresh**.
- Ran `npx firebase logout` (logged out `joshua.g@lmntix.ai`).
- Told the user to run `npx firebase login` themselves in their terminal (can't drive the browser-based OAuth flow from the agent) and come back when done.

---

## Prompt 12 (user)

> perfect logged in to correct account, carry on

### Summary of assistant response

- Confirmed the CLI was logged in as `joshua.gordon.apply@gmail.com` and could see the `email-agent-71a0e` project.
- Registered a Web app: `firebase apps:create WEB email-agent --project email-agent-71a0e` → App ID `1:86898550687:web:0faa11eeb9b1b51aabbfaa`.
- Fetched the SDK config via `firebase apps:sdkconfig WEB <appId>`.
- Updated `.env.example` and `.env` with the real Firebase project values (`projectId`, `apiKey`, `authDomain`, `appId`), with a comment explaining that **Firebase web API keys are not secrets** — they ship in browser bundles by design, security comes from Firestore Rules.
- Discovered Firestore wasn't provisioned yet (`firestore:databases:list` returned "No databases found"). Asked the user which region to use.
- User picked **nam5 (US multi-region)**.
- Provisioned the default Firestore database: `firebase firestore:databases:create "(default)" --location nam5`.
- Deployed `firestore.rules` to the live project. Deploy succeeded, rules released to cloud.firestore.
- Rewrote `Readme.MD` for the hosted-only setup: dropped the emulator section, simplified to a single `npm run dev` command, kept the service-account setup instructions.
- Cleaned up stale `firebase-debug.log` / `firestore-debug.log` files from the earlier emulator test.
- Final step: told the user to generate a service account JSON from the Firebase Console (provided the direct link), open it in their editor, and copy just the `client_email` and `private_key` values into `.env`. Emphasized: **do not paste the JSON into chat**.

---


## Where we ended

- Firebase is wired up against the hosted `email-agent-71a0e` project. Firestore is provisioned in `nam5`, rules are deployed, the Web app SDK config is in `.env`.
- The agent's `lib/firebase/client.ts` and `lib/firebase/admin.ts` already auto-switch between emulator and hosted modes based on env vars — no code changes were needed for the pivot from emulator to hosted.
- `Readme.MD` documents the hosted-only setup (no Java prereq, single `npm run dev` command, BYO-API-keys + service-account-via-out-of-band).
- **Outstanding security follow-ups:** rotate the service account key that was pasted into chat, delete the JSON from `~/Downloads/`, redact the key from this transcript before submission.

Next session: scaffold Next.js + shadcn and start step 3 of `plan.md` ("Bare LangGraph + OpenAI").
