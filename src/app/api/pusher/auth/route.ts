// Pusher private channel auth — foydalanuvchi faqat o'z kanaliga obuna bo'la oladi.
// Client Pusher.js authEndpoint sifatida shu URL'ga so'rov yuboradi (form-encoded).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPusher } from "@/lib/pusher-server";

export async function POST(req: Request) {
    const pusher = getPusher();
    if (!pusher) return NextResponse.json({ error: "Pusher sozlanmagan" }, { status: 503 });

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Kirish talab" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.formData();
    const socketId = String(body.get("socket_id") || "");
    const channelName = String(body.get("channel_name") || "");
    if (!socketId || !channelName) return NextResponse.json({ error: "Yaroqsiz so'rov" }, { status: 400 });

    // Faqat o'z kanaliga ruxsat
    if (channelName !== `private-user-${me.id}`) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const auth = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(auth);
}
