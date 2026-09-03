// Belis umumiy rasm yuklash (komplekt/quti/hero uchun).
// Admin only.
//
// POST /api/belis/upload/image  form-data: { file: File, kind?: "komplekt"|"item"|"hero" }

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireBelisAdmin } from "@/lib/belis-auth";

export const runtime = "nodejs";
const MAX = 8 * 1024 * 1024; // 8MB

export async function POST(req: Request) {
    const auth = await requireBelisAdmin();
    if (auth instanceof NextResponse) return auth;

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
    }

    let fd: FormData;
    try { fd = await req.formData(); }
    catch { return NextResponse.json({ error: "invalid_form" }, { status: 400 }); }

    const file = fd.get("file") as File | null;
    const kind = String(fd.get("kind") ?? "misc").replace(/[^a-z0-9-]/g, "").slice(0, 20) || "misc";
    if (!file) return NextResponse.json({ error: "file_required" }, { status: 400 });
    if (file.size > MAX) return NextResponse.json({ error: "too_large", maxBytes: MAX }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "not_image" }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
    const filename = `belis/${kind}/${Date.now()}.${ext}`;

    const blob = await put(filename, file, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: true,
    });

    return NextResponse.json({ ok: true, url: blob.url });
}
