// AI chat attachment upload — rasm/pdf/matn.
// Vercel Blob ga yuklanadi. Faqat authenticated.

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = /^(image\/|application\/pdf|text\/)/;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
    }

    let fd: FormData;
    try { fd = await req.formData(); }
    catch { return NextResponse.json({ error: "invalid_form" }, { status: 400 }); }

    const file = fd.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file_required" }, { status: 400 });
    if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "too_large", maxBytes: MAX_SIZE }, { status: 400 });
    }
    if (!ALLOWED_MIME.test(file.type)) {
        return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 5);
    const filename = `ai/attachments/${me.id.slice(0, 12)}-${Date.now()}.${safeExt}`;

    const blob = await put(filename, file, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: true,
    });

    return NextResponse.json({
        ok: true,
        url: blob.url,
        type: file.type.startsWith("image/") ? "image" : "file",
        size: file.size,
    });
}
