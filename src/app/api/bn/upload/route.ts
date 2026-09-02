// BN rasm yuklash — Vercel Blob orqali. Mahsulot rasmi, do'kon logosi,
// scan uchun rasm — hammasi shu yerdan o'tadi. Public URL qaytadi.
//
// POST /api/bn/upload   form-data: { file: File, kind?: "product"|"shop"|"scan" }

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireBnAuth } from "@/lib/bn-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
    }

    let formData: FormData;
    try { formData = await req.formData(); }
    catch { return NextResponse.json({ error: "invalid_form" }, { status: 400 }); }

    const file = formData.get("file") as File | null;
    const kind = String(formData.get("kind") ?? "product");
    if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });
    if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "only_images" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "too_large" }, { status: 413 });
    }
    if (!["product", "shop", "scan", "ad"].includes(kind)) {
        return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const safe = (auth.email ?? "u").replace(/[^a-z0-9]/gi, "_");
    const filename = `bn/${kind}/${safe}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

    const blob = await put(filename, file, { access: "public", contentType: file.type });
    return NextResponse.json({ url: blob.url });
}
