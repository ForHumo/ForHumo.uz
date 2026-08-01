// Chaqiruv ovoz yozuvi — Vercel Blob'ga yuklab, NexusCallRecording DB'ga yozadi.
// POST: multipart (file: audio/webm blob + durationSec form field). Faqat chaqiruv ishtirokchisi.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

type Ctx = { params: Promise<{ id: string }> };

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB (client-side blob upload emas — audio hajmi kichik)

export async function POST(req: Request, { params }: Ctx) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Kirish talab" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const c = await prisma.nexusCall.findUnique({ where: { id }, select: { callerId: true, calleeId: true } });
    if (!c || (c.callerId !== me.id && c.calleeId !== me.id)) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const durationSecRaw = form.get("durationSec");
    if (!file) return NextResponse.json({ error: "Fayl yo'q" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Fayl juda katta (50MB dan oshdi)" }, { status: 413 });
    const durationSec = Math.max(0, Math.floor(Number(durationSecRaw ?? 0)));

    const ext = file.type.includes("mp4") ? "mp4" : file.type.includes("ogg") ? "ogg" : "webm";
    const filename = `nexus/call-recordings/${id}-${Date.now()}.${ext}`;
    const blob = await put(filename, file, { access: "public", contentType: file.type || "audio/webm" });

    const rec = await prisma.nexusCallRecording.create({
        data: {
            callId: id,
            startedById: me.id,
            audioUrl: blob.url,
            durationSec,
            sizeKb: Math.round(file.size / 1024),
        },
    });
    return NextResponse.json({ recording: rec });
}

// GET: shu chaqiruv yozuvlari (faqat ishtirokchi ko'ra oladi)
export async function GET(_req: Request, { params }: Ctx) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ recordings: [] });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ recordings: [] });

    const c = await prisma.nexusCall.findUnique({ where: { id }, select: { callerId: true, calleeId: true } });
    if (!c || (c.callerId !== me.id && c.calleeId !== me.id)) return NextResponse.json({ recordings: [] });

    const recs = await prisma.nexusCallRecording.findMany({
        where: { callId: id }, orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ recordings: recs });
}
