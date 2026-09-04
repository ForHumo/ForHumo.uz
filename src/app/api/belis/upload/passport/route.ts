// Belis pasport rasm upload (booking uchun garov).
// POST /api/belis/upload/passport   form-data: { file: File }
//
// Vercel Blob'ga yuklanadi. Rasm URL faqat egasi va admin ko'ra oladi
// (booking detail API'da filtrlangan).

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireBelisAuth } from "@/lib/belis-auth";
import { belisRate, BELIS_RATE_MSG } from "@/lib/belis-rate";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
    const auth = await requireBelisAuth();
    if (auth instanceof NextResponse) return auth;

    // Rate-limit: 10 rasm / soat / profil (spam yuklashdan himoya)
    const rate = await belisRate(auth.profileId, "passportUpload");
    if (rate.limited) {
        return NextResponse.json({
            error: "rate_limited",
            message: BELIS_RATE_MSG,
        }, { status: 429 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
    }

    let formData: FormData;
    try { formData = await req.formData(); }
    catch { return NextResponse.json({ error: "invalid_form" }, { status: 400 }); }

    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file_required" }, { status: 400 });
    if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "too_large", maxBytes: MAX_SIZE }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "not_image" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safe = ext.replace(/[^a-z0-9]/g, "").slice(0, 5);
    const filename = `belis/passport/${auth.profileId.slice(0, 12)}-${Date.now()}.${safe}`;

    const blob = await put(filename, file, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: true,
    });

    return NextResponse.json({
        ok: true,
        url: blob.url,
    });
}
