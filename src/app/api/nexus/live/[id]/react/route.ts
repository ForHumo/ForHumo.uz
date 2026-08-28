import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";

// POST /api/nexus/live/[id]/react — jonli reaction (Batch E)
// Chat kabi NexusLiveMessage'ga yoziladi, text = "__nx_react:<icon>"
// Ruxsat berilgan iconlar (Lucide): heart, fire, laugh, thumbs, party, sparkle, wow
const ALLOWED = new Set(["heart", "fire", "laugh", "thumbs", "party", "sparkle", "wow"]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const { icon } = await req.json();
    if (!ALLOWED.has(icon)) return NextResponse.json({ error: "Noto'g'ri reaction" }, { status: 400 });

    const stream = await prisma.nexusLiveStream.findUnique({ where: { id }, select: { status: true } });
    if (!stream || stream.status !== "LIVE") return NextResponse.json({ error: "Faol efir emas" }, { status: 400 });

    // Rate-limit — liveChat (40/5daq) reaction uchun ham
    if (await nexusRateLimited(me.id, "liveChat")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    await prisma.nexusLiveMessage.create({
        data: { streamId: id, profileId: me.id, text: `__nx_react:${icon}` },
    });
    return NextResponse.json({ ok: true });
}
