import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Batch BI — Chat pin (streamer chat'da bitta xabarni pin qiladi)
// POST { msgId | text } — pin qilish. Bo'sh text → unpin.
// Piggyback __nx_pin:<msgId> yoki __nx_pin::<plaintext>
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({ where: { id }, select: { profileId: true } });
    if (!stream || stream.profileId !== me.id) return NextResponse.json({ error: "Faqat streamer" }, { status: 403 });

    const { msgId, text } = await req.json();
    let payload = "";
    if (msgId && typeof msgId === "string") {
        // Msg text'ni olib format qilamiz
        const m = await prisma.nexusLiveMessage.findUnique({ where: { id: msgId }, select: { text: true, profileId: true } });
        if (!m) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
        const author = await prisma.userProfile.findUnique({ where: { id: m.profileId }, select: { username: true, name: true } });
        const authorName = author?.name || author?.username || "Foydalanuvchi";
        payload = `${authorName}: ${m.text}`.slice(0, 300);
    } else if (typeof text === "string") {
        payload = text.trim().slice(0, 300);
    }
    await prisma.nexusLiveMessage.create({
        data: { streamId: id, profileId: me.id, text: `__nx_pin:${payload}` },
    });
    return NextResponse.json({ ok: true, pin: payload });
}
