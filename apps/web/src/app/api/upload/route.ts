import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/session.ts";
import { deps } from "@/server/container.ts";
import { requestUpload, completeUpload, attachMedia, type ImagePurpose, type MediaTarget } from "@fluo/core";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Please sign in to upload images." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const businessId = formData.get("businessId") as string | null;
    const purpose = (formData.get("purpose") as ImagePurpose) || "product";
    const targetRaw = formData.get("target") as string | null;

    if (!file || !businessId || !targetRaw) {
      return NextResponse.json({ ok: false, error: "Missing required file or upload metadata." }, { status: 400 });
    }

    const target = JSON.parse(targetRaw) as MediaTarget;
    const d = deps();

    if (!d.storage) {
      return NextResponse.json({ ok: false, error: "Cloud storage is not configured on this environment." }, { status: 500 });
    }

    // Step 1: Authorize intent and create media_assets row
    const intent = await requestUpload(d, session.user.id, businessId, {
      purpose,
      contentType: file.type,
      bytes: file.size,
    });

    // Step 2: Write bytes server-side directly to R2 storage (no browser CORS)
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const key = `incoming/${businessId}/${intent.assetId}`;
    await d.storage.put(key, bytes, file.type);

    // Step 3: Complete upload and generate WebP variants
    await completeUpload(d, session.user.id, businessId, intent.assetId);

    // Step 4: Attach media asset to the targeted product, event, or business logo
    await attachMedia(d, session.user.id, businessId, intent.assetId, target);

    return NextResponse.json({ ok: true, assetId: intent.assetId });
  } catch (err: any) {
    console.error("Server upload handler error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to process photo upload." },
      { status: 500 }
    );
  }
}
