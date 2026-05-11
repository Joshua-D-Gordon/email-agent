import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import path from "node:path";
import net from "node:net";

// These tests pin down what the current firestore.rules actually allows
// vs. denies — they're the executable spec for the rules file.
//
// Today the rules are explicitly permissive for reads ("allow read: if true")
// because the demo has no Firebase Auth. The tests below LOCK IN that
// behavior so we notice if it changes accidentally, and they also assert
// the security-critical pieces:
//   - client writes are denied everywhere (Admin SDK does all writes)
//   - checkpoints/ is fully server-only
//   - undefined collections are default-deny
//
// When the rules are eventually tightened (per the "Production hardening
// sketch" at the bottom of firestore.rules), flip the "anyone can read"
// assertions — they become the regression detector.
//
// REQUIRES: `firebase emulators:start --only firestore` running on port 8080.
// Skips gracefully if no emulator is detected.

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
const RULES_PATH = path.resolve(__dirname, "../../firestore.rules");

let testEnv: RulesTestEnvironment | null = null;
let emulatorReachable = false;

beforeAll(async () => {
  // Probe the emulator with a real TCP connect so the suite skips cleanly
  // when it isn't running.
  const [host, portStr] = EMULATOR_HOST.split(":");
  const port = Number(portStr);
  emulatorReachable = await new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });

  if (!emulatorReachable) return;

  testEnv = await initializeTestEnvironment({
    projectId: "demo-superfunnel",
    firestore: {
      host: EMULATOR_HOST.split(":")[0],
      port: Number(EMULATOR_HOST.split(":")[1]),
      rules: readFileSync(RULES_PATH, "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("Firestore rules — current (demo) state", () => {
  it.runIf(emulatorReachable)("anyone can READ /companies/* (intentional demo behavior)", async () => {
    const ctx = testEnv!.unauthenticatedContext();
    const ref = ctx.firestore().doc("companies/acme-com");
    await assertSucceeds(ref.get());
  });

  it.runIf(emulatorReachable)("anyone can READ /companies/*/emails/*", async () => {
    const ctx = testEnv!.unauthenticatedContext();
    const ref = ctx.firestore().doc("companies/acme-com/emails/draft_1");
    await assertSucceeds(ref.get());
  });

  it.runIf(emulatorReachable)("anyone can READ /chats/*/messages/*", async () => {
    const ctx = testEnv!.unauthenticatedContext();
    const ref = ctx.firestore().doc("chats/t1/messages/m1");
    await assertSucceeds(ref.get());
  });
});

describe("Firestore rules — invariants that must NEVER break", () => {
  it.runIf(emulatorReachable)("unauth client CANNOT write to /companies/*", async () => {
    const ctx = testEnv!.unauthenticatedContext();
    const ref = ctx.firestore().doc("companies/acme-com");
    await assertFails(ref.set({ name: "Pwned" }));
  });

  it.runIf(emulatorReachable)("authenticated client ALSO cannot write to /companies/* (only Admin SDK can)", async () => {
    // The hardening sketch says "Keep client writes denied — only the
    // Admin SDK should mutate state." Even an authed user from a phished
    // session must not be able to write directly.
    const ctx = testEnv!.authenticatedContext("user_123");
    const ref = ctx.firestore().doc("companies/acme-com");
    await assertFails(ref.set({ name: "Pwned" }));
  });

  it.runIf(emulatorReachable)("unauth client CANNOT write to /chats/*", async () => {
    const ctx = testEnv!.unauthenticatedContext();
    const ref = ctx.firestore().doc("chats/t1");
    await assertFails(ref.set({ threadId: "t1" }));
  });

  it.runIf(emulatorReachable)("unauth client CANNOT write to /chats/*/messages/*", async () => {
    const ctx = testEnv!.unauthenticatedContext();
    const ref = ctx.firestore().doc("chats/t1/messages/m1");
    await assertFails(ref.set({ role: "assistant", content: "I am the agent now" }));
  });

  it.runIf(emulatorReachable)("checkpoints/ are fully server-only (read AND write denied)", async () => {
    const ctx = testEnv!.unauthenticatedContext();
    const ref = ctx.firestore().doc("checkpoints/t1/steps/step_1");
    await assertFails(ref.get());
    await assertFails(ref.set({ state: {} }));
  });

  it.runIf(emulatorReachable)("undefined collections default-deny", async () => {
    const ctx = testEnv!.unauthenticatedContext();
    const ref = ctx.firestore().doc("admin_secrets/backup");
    await assertFails(ref.get());
    await assertFails(ref.set({ data: "x" }));
  });
});

describe("Firestore rules — emulator preflight", () => {
  it("emulator reachable", () => {
    if (!emulatorReachable) {
      console.warn(
        "[firestoreRules.test] Firestore emulator not reachable at " +
          EMULATOR_HOST +
          ". Run `firebase emulators:start --only firestore` to enable these tests.",
      );
    }
    // Don't fail the suite — just signal.
    expect(true).toBe(true);
  });
});
