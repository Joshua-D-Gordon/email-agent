import { describe, it, expect } from "vitest";
import { normalizeDomain, slugify } from "@/lib/companies-server";

// slugify is used to derive the Firestore document id from the (already
// normalized) domain. The implementation replaces `.` with `-` and strips
// anything that isn't [a-z0-9-]. That means several distinct inputs collapse
// to the same id, which the route handler treats as "company exists" — the
// second user thinks they created a new company but is actually looking at
// the first user's data.

describe("slugify — same domain after normalization should produce same id (intended)", () => {
  it("acme.com and https://www.acme.com/about collide (intended)", () => {
    expect(slugify(normalizeDomain("acme.com"))).toBe(slugify(normalizeDomain("https://www.acme.com/about")));
  });
});

describe("slugify — distinct domains that collide (bug)", () => {
  it("rejects nothing: empty domain still produces an id", () => {
    // If normalizeDomain returns "" (which today it can — see normalizeDomain
    // test for examples), slugify happily returns "". The route handler then
    // tries to create a doc with id "" which Firestore rejects with a runtime
    // error — but the upstream "name and domain are required" check passes
    // because the *name* is truthy. This is a latent crash path.
    expect(slugify("")).toBe("");
  });

  it("dotted vs hyphenated domains must not collide", () => {
    // "acme.co.com" and "acme-co-com" are different DNS names — they must
    // produce different Firestore ids. The fix: encode dots as "--" so
    // hyphens and dots can never collapse into the same slug.
    const a = slugify(normalizeDomain("acme.co.com"));
    const b = slugify(normalizeDomain("acme-co-com"));
    expect(a).not.toBe(b);
  });

  it("unicode lookalikes must not collide with real domains", () => {
    // A user pastes a domain with a typo'd unicode en-dash (U+2013) instead
    // of an ASCII hyphen. normalizeDomain should reject it as invalid,
    // making slugify produce a different result than for the real domain.
    const a = slugify(normalizeDomain("acme.com"));
    const b = slugify(normalizeDomain("ac–me.com")); // en-dash, not ascii
    expect(a).not.toBe(b);
  });
});
