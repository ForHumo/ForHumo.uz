import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { resolveMobileProfileId } from "@/lib/auth-request";

export const runtime = "nodejs";

// POST /api/esport/upload — mobil ilova (Bearer) rasm yuklash. form-data { file, kind? }
// Faqat Bearer (resolveMobileProfileId) — cookie QABUL QILINMAYDI (CSRF-safe, native-only).
// Rasmni Vercel Blob'ga yuklaydi, public URL qaytaradi (jamoa logo/cover, athlete avatar).
export async function POST(req: Request) {
    const profileId = await resolveMobileProfileId();
    if (!profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!process.env.BLOB_READ_WRITE_TOKEN)
        return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });

    let formData: FormData;
    try { formData = await req.formData(); }
    catch { return NextResponse.json({ error: "invalid_form" }, { status: 400 }); }

    const file = formData.get("file") as File | null;
    const kind = String(formData.get("kind") || "team").replace(/[^a-z0-9]/gi, "").slice(0, 20) || "team";
    if (!file) return NextResponse.json({ error: "Fayl yo'q" }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Faqat rasm yuklash mumkin" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Rasm 5 MB dan katta" }, { status: 413 });

    const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
    const filename = `esport/${kind}/${profileId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const blob = await put(filename, file, { access: "public", contentType: file.type });
    return NextResponse.json({ url: blob.url });
}
