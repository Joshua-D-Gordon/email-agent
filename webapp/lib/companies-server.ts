const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export function normalizeDomain(raw: string | undefined): string {
  if (!raw) return "";
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
  return DOMAIN_RE.test(cleaned) ? cleaned : "";
}

// Encode dots as "--" so domains with literal hyphens can't collide with
// dotted domains: "acme.co.com" -> "acme--co--com", "acme-co-com" stays as
// "acme-co-com". Anything outside [a-z0-9.-] should already have been
// rejected by normalizeDomain — strip defensively just in case a caller
// hands us pre-normalized input.
export function slugify(domain: string): string {
  return domain.replace(/\./g, "--").replace(/[^a-z0-9-]/g, "");
}
