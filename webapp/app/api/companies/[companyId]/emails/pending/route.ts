import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

type PatchBody = {
  action: "approve" | "reject";
};

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await context.params;

  const authHeader = req.headers.get("authorization") ?? "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
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

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return jsonError(400, "Invalid JSON body");
  }
  if (body.action !== "approve" && body.action !== "reject") {
    return jsonError(400, "action must be 'approve' or 'reject'");
  }

  const companyRef = adminDb.collection("companies").doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) return jsonError(404, "Company not found");
  const companyOwner = companySnap.get("ownerUid");
  if (companyOwner && companyOwner !== ownerUid) {
    return jsonError(403, "You don't own this company");
  }

  const pendingRef = companyRef.collection("emails").doc("pending");
  const pendingSnap = await pendingRef.get();
  if (!pendingSnap.exists) {
    return jsonError(404, "No pending draft to act on");
  }

  if (body.action === "approve") {
    const data = pendingSnap.data() ?? {};
    const currentRef = companyRef.collection("emails").doc("current");
    await currentRef.set({
      ...data,
      id: "current",
      status: "approved",
      approvedAt: FieldValue.serverTimestamp(),
      draftedAt: data.draftedAt ?? FieldValue.serverTimestamp(),
      ownerUid,
    });
    await pendingRef.delete();
  } else {
    await pendingRef.delete();
  }

  await companyRef.set(
    { updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );

  return Response.json({ ok: true });
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
