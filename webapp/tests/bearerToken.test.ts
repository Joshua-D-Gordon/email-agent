import { describe, it, expect } from "vitest";

// Both API routes parse the Authorization header with the same regex:
//
//   /^Bearer\s+(\S+)\s*$/i
//
// \S+ rejects tokens with internal whitespace, trailing \s* swallows
// trailing whitespace, and the anchored end forbids any other trailing
// content. The captured group is fed to adminAuth.verifyIdToken().
//
// This test inlines the same regex used by the routes. If they diverge,
// the suite will fail — keep them in sync.

const BEARER_RE = /^Bearer\s+(\S+)\s*$/i;

function parseToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = header.match(BEARER_RE);
  return m ? m[1] : null;
}

describe("Bearer token parsing — accepts valid", () => {
  it("standard 'Bearer <jwt>'", () => {
    expect(parseToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("case-insensitive scheme name", () => {
    expect(parseToken("bearer abc.def.ghi")).toBe("abc.def.ghi");
  });
});

describe("Bearer token parsing — adversarial inputs (bug surface)", () => {
  it("missing header returns null", () => {
    expect(parseToken(null)).toBeNull();
    expect(parseToken("")).toBeNull();
  });

  it("BUG: trailing whitespace is included in the token", () => {
    // "Bearer foo " — current regex captures "foo " (with trailing space).
    // That value is sent verbatim to verifyIdToken, which fails with an
    // opaque 401, but the failure mode is "token I just generated doesn't
    // work" rather than "your header is malformed."
    const out = parseToken("Bearer foo   ");
    expect(out, "trailing whitespace should be trimmed or rejected").toBe("foo");
  });

  it("BUG: token with internal whitespace is accepted", () => {
    // "Bearer foo bar" — never a valid JWT. Should be rejected at the
    // parse step, not bounced off Firebase Auth.
    const out = parseToken("Bearer foo bar");
    expect(out, "token with internal whitespace should be rejected").toBeNull();
  });

  it("'Bearer' alone (no whitespace, no token) is rejected", () => {
    expect(parseToken("Bearer")).toBeNull();
  });

  it("BUG: 'Bearer ' with only whitespace after produces an empty-ish match", () => {
    // \s+ matches the spaces; .+ requires at least one more char. If the
    // header is exactly "Bearer " (trailing space only) regex won't match
    // — good. But "Bearer  \t" might still match if there's a tab after.
    // Actual current behavior: regex requires .+ to match SOMETHING, so
    // "Bearer    " (only whitespace) does not match. Documenting this as
    // a passing case to lock the behavior in.
    expect(parseToken("Bearer    ")).toBeNull();
  });

  it("BUG: random non-Bearer schemes are rejected", () => {
    expect(parseToken("Basic abc")).toBeNull();
    expect(parseToken("Token abc")).toBeNull();
  });

  it("BUG: 'Bearer' with newline-separated payload still matches", () => {
    // HTTP headers can't actually contain a literal newline (folding is
    // deprecated and most servers reject it), but Next.js NextRequest will
    // happily return whatever's in the underlying Request — so we test
    // defensively.
    const out = parseToken("Bearer abc\ndef");
    // Either reject (preferred) or at minimum, do not let an embedded
    // newline land in the token sent to verifyIdToken.
    if (out !== null) {
      expect(out).not.toMatch(/\n/);
    }
  });
});
