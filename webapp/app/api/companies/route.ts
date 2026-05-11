import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { normalizeDomain, slugify } from "@/lib/companies-server";

export const runtime = "nodejs";

type CreateCompanyBody = {
  name: string;
  domain: string;
  interest?: string;
};

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const tokenMatch = authHeader.match(/^Bearer\s+(\S+)\s*$/i);
  if (!tokenMatch) {
    return jsonError(401, "Missing Authorization: Bearer <idToken> header");
  }

  let ownerUid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(tokenMatch[1]);
    ownerUid = decoded.uid;
  } catch {
    return jsonError(401, "Invalid or expired ID token");
  }

  let body: CreateCompanyBody;
  try {
    body = (await req.json()) as CreateCompanyBody;
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const name = body.name?.trim();
  const domain = normalizeDomain(body.domain);
  const interest = body.interest?.trim() ?? "";
  if (!name || !domain) {
    return jsonError(400, "name and domain are required");
  }

  const id = slugify(domain);
  const ref = adminDb.collection("companies").doc(id);
  const existing = await ref.get();
  if (existing.exists) {
    return Response.json({ id, exists: true }, { status: 200 });
  }

  await ref.set({
    id,
    name,
    domain,
    interest,
    status: "researching",
    profile: {},
    sources: [],
    ownerUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return Response.json({ id, exists: false }, { status: 201 });
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

