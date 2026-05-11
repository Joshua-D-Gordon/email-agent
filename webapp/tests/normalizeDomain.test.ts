import { describe, it, expect } from "vitest";
import { normalizeDomain } from "@/lib/companies-server";

// Hypothesis: the regex-based normalizer in normalizeDomain() does not
// validate that what's left is actually a domain. It strips http(s)://,
// www., and trailing path segments, lowercases, and trims — but accepts any
// other garbage. The cases below are inputs a user could plausibly paste.
//
// Failing assertions here are bugs: empty strings or "javascript:" or
// "---" should NOT be accepted as valid domains.

describe("normalizeDomain — happy path", () => {
  it.each([
    ["acme.com", "acme.com"],
    ["ACME.COM", "acme.com"],
    ["  acme.com  ", "acme.com"],
    ["http://acme.com", "acme.com"],
    ["https://acme.com", "acme.com"],
    ["https://www.acme.com", "acme.com"],
    ["https://www.acme.com/about", "acme.com"],
    ["https://www.acme.com/about?ref=foo", "acme.com"],
    ["sub.acme.com", "sub.acme.com"],
  ])("normalizes %j to %j", (input, expected) => {
    expect(normalizeDomain(input)).toBe(expected);
  });
});

describe("normalizeDomain — adversarial inputs that should be rejected", () => {
  // For each of these we expect normalizeDomain to return an empty string
  // (which the caller interprets as "invalid, return 400"). Today most of
  // these pass through, which is the bug.
  it.each([
    ["empty string", ""],
    ["whitespace only", "   "],
    ["scheme with no host", "http://"],
    ["scheme with no host (https)", "https://"],
    ["www prefix with no rest", "www."],
    ["just a hyphen", "-"],
    ["only dashes", "---"],
    ["single letter (no TLD)", "a"],
    ["dot only", "."],
    ["space in middle", "foo bar.com"],
    ["javascript: scheme", "javascript:alert(1)"],
    ["data: scheme", "data:text/html,<script>"],
    ["ftp scheme leaks through", "ftp://acme.com"],
    ["fragment-only", "#"],
  ])("rejects %s: %j", (_label, input) => {
    const out = normalizeDomain(input);
    // A "valid" domain must contain at least one dot and at least one
    // alphanumeric character on each side of it. If the normalizer returns
    // anything that fails this check, downstream code will happily slug it
    // and create a junk Firestore doc.
    const looksLikeDomain = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(out);
    expect(out === "" || looksLikeDomain, `got "${out}"`).toBe(true);
  });
});
