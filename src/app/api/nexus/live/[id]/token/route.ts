import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLiveKitToken, getLiveKitConfig } from "@/lib/livekit";

// GET /api/nexus/live/[id]/token
// Efir egasi → publisher (canPublish=true), qolgan foydalanuvchilar → subscriber (canPublish=false)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const cfg = getLiveKitConfig();
    if (!cfg) return NextResponse.json({ error: "LiveKit sozlanmagan" }, { status: 503 });

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, username: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({ where: { id } });
    if (!stream) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (stream.hidden && stream.profileId !== me.id) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const isPublisher = stream.profileId === me.id;

    // Maxfiylik: PRIVATE efir faqat ega uchun. FRIENDS efirni faqat egasi va uni kuzatuvchilar ko'radi.
    if (!isPublisher) {
        if (stream.privacy === "PRIVATE") {
            return NextResponse.json({ error: "Bu efir maxfiy" }, { status: 403 });
        }
        if (stream.privacy === "FRIENDS") {
            const following = await prisma.nexusFollow.findFirst({
                where: { followerId: me.id, followingId: stream.profileId }, select: { id: true },
            });
            if (!following) return NextResponse.json({ error: "Faqat obunachilarga" }, { status: 403 });
        }
    }
    const roomName = `live_${id}`;

    const token = await createLiveKitToken({
        roomName,
        identity: me.id,
        name: me.name || me.username || "Anonim",
        canPublish: isPublisher,
        canSubscribe: true,
        ttlHours: 6,
    });

    if (!token) return NextResponse.json({ error: "Token yaratilmadi" }, { status: 500 });

    return NextResponse.json({ token, url: cfg.url, roomName, isPublisher });
}
