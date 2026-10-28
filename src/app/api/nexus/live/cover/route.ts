// Nexus Live cover (oblojka) — Humo AI bilan rasm yaratish.
// POST /api/nexus/live/cover  body: { prompt: string, images?: string[] }
//   images — ixtiyoriy reference rasmlar (data: URL yoki https blob URL). Berilsa model
//   ularni manba/uslub sifatida ishlatadi (matn + rasm). Natija Vercel Blob'ga saqlanadi.
//
// AI-chat tarixini IFLOS QILMAYDI (imagen'dan farqi) — faqat cover uchun toza url qaytaradi.
// Kalit: GEMINI_API_KEY (flash-image, rasm kiritishni qo'llaydi). Yo'q bo'lsa 503.

import { NextResponse, after } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiGenerateImage } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PER_DAY = 20;                 // 20 cover / kun / profil
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_REF_IMAGES = 3;               // ko'pi bilan 3 ta reference rasm
const MAX_REF_BYTES = 6 * 1024 * 1024;  // har reference rasm ≤ 6MB

const GEMINI_READY = !!process.env.GEMINI_API_KEY;

/** data: URL yoki https URL → { mime, base64 }. Xato/katta bo'lsa null. */
async function toInlineImage(src: string): Promise<{ mime: string; base64: string } | null> {
    try {
        if (src.startsWith("data:")) {
            const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(src);
            if (!m) return null;
            const mime = m[1] || "image/jpeg";
            const isB64 = !!m[2];
            const data = m[3] || "";
            const base64 = isB64 ? data : Buffer.from(decodeURIComponent(data), "utf8").toString("base64");
            if (Buffer.byteLength(base64, "base64") > MAX_REF_BYTES) return null;
            if (!mime.startsWith("image/")) return null;
            return { mime, base64 };
        }
        if (/^https?:\/\//.test(src)) {
            const res = await fetch(src);
            if (!res.ok) return null;
            const ct = res.headers.get("content-type") || "image/jpeg";
            if (!ct.startsWith("image/")) return null;
            const buf = Buffer.from(await res.arrayBuffer());
            if (buf.byteLength > MAX_REF_BYTES) return null;
            return { mime: ct.split(";")[0], base64: buf.toString("base64") };
        }
    } catch { /* ignore */ }
    return null;
}

export async function POST(req: Request) {
    if (!GEMINI_READY) {
        return NextResponse.json({ error: "AI rasm hali sozlanmagan (model kaliti yo'q)" }, { status: 503 });
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    // Rate limit — kuniga 20 cover (aiUsage.kind="live-cover")
    try {
        const used = await prisma.aiUsage.count({
            where: { profileId: me.id, kind: "live-cover", createdAt: { gt: new Date(Date.now() - DAY_MS) } },
        });
        if (used >= MAX_PER_DAY) {
            return NextResponse.json({ error: `Kuniga ${MAX_PER_DAY} cover chegarasi. Ertaga urinib ko'ring.` }, { status: 429 });
        }
    } catch { /* fail-open */ }

    const body = await req.json().catch(() => ({}));
    const prompt = String(body?.prompt ?? "").trim().slice(0, 1000);
    if (prompt.length < 2) return NextResponse.json({ error: "prompt_required" }, { status: 400 });

    // Reference rasmlar (ixtiyoriy, maks 3)
    const rawImages: string[] = Array.isArray(body?.images) ? body.images.slice(0, MAX_REF_IMAGES) : [];
    const refImages: { mime: string; base64: string }[] = [];
    for (const src of rawImages) {
        if (typeof src !== "string") continue;
        const im = await toInlineImage(src);
        if (im) refImages.push(im);
    }

    // Efir cover'i uchun 16:9 landscape so'raymiz (karta aspect-video)
    const fullPrompt = `${prompt}\n\nStyle: eye-catching 16:9 landscape thumbnail/cover for a live stream. No watermark, no UI, no text unless requested.`;

    const img = await aiGenerateImage(fullPrompt, refImages.length ? refImages : undefined);
    if (!img?.base64) {
        return NextResponse.json({ error: "Rasm yaratilmadi (server band). Birozdan keyin urinib ko'ring." }, { status: 502 });
    }

    const buf = Buffer.from(img.base64, "base64");
    const ext = img.mime.includes("png") ? "png" : img.mime.includes("webp") ? "webp" : "jpg";
    const filename = `nexus/live-cover/${me.id.slice(0, 12)}-${Date.now()}.${ext}`;
    const blob = await put(filename, buf, { access: "public", contentType: img.mime, addRandomSuffix: true });

    after(() => prisma.aiUsage.create({ data: { profileId: me.id, kind: "live-cover" } }).catch(() => {}));

    return NextResponse.json({ ok: true, url: blob.url });
}
