import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/nexus/calls/ice-servers
// STUN (bepul, doim) + TURN (env sozlansa) ICE server ro'yxati.
// Metered.ca: TURN_URL="turn:global.relay.metered.ca:80" (yoki 443, tcp), TURN_USER, TURN_PASS.
// Coturn self-host: shu 3 ta env.
export async function GET() {
    const session = await getServerSession(authOptions);
    // Sessiya talab qilinadi — TURN credentials sirli
    if (!session?.user?.email) return NextResponse.json({ iceServers: [] }, { status: 401 });

    const servers: RTCIceServer[] = [
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ];

    const turnUrl = process.env.TURN_URL;
    const turnUser = process.env.TURN_USER;
    const turnPass = process.env.TURN_PASS;
    if (turnUrl && turnUser && turnPass) {
        // Bir nechta URL (443 UDP + 443 TCP + TLS) vergul bilan berilishi mumkin
        const urls = turnUrl.split(",").map(u => u.trim()).filter(Boolean);
        servers.push({ urls, username: turnUser, credential: turnPass });
    }

    return NextResponse.json({ iceServers: servers });
}
