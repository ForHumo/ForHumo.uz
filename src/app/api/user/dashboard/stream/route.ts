// Dashboard SSE live stream — 15s tick unreadCount + activeOrders.
//
//   GET /api/user/dashboard/stream
//
// Client EventSource orqali ulanadi va data event'larni oladi.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 daq stream

const TICK_MS = 15_000;
const MAX_TICKS = 20; // 5 daq davomida 15s tick = 20 ta

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return new Response(JSON.stringify({ error: "auth_required" }), { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!profile) {
        return new Response(JSON.stringify({ error: "profile_not_found" }), { status: 404 });
    }

    const encoder = new TextEncoder();
    const profileId = profile.id;

    const stream = new ReadableStream({
        async start(controller) {
            let ticks = 0;
            const send = (data: object) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };
            // Initial hello
            send({ type: "hello", at: Date.now() });

            const tick = async () => {
                try {
                    const [nexusUnread, bnActive, notif] = await Promise.all([
                        prisma.nexusConversation.count({
                            where: {
                                OR: [
                                    { user1Id: profileId, user1ReadAt: null },
                                    { user2Id: profileId, user2ReadAt: null },
                                ],
                                lastSenderId: { not: profileId },
                            },
                        }).catch(() => 0),
                        prisma.bnOrder.count({
                            where: { buyerId: profileId, status: { in: ["PLACED", "CONFIRMED", "READY"] } },
                        }).catch(() => 0),
                        prisma.nexusNotification.count({
                            where: { recipientId: profileId, read: false },
                        }).catch(() => 0),
                    ]);
                    send({ type: "tick", nexusUnread, bnActive, notif, at: Date.now() });
                } catch { /* fail-safe */ }
            };

            // Birinchi tick darhol
            await tick();

            const interval = setInterval(async () => {
                ticks++;
                if (ticks >= MAX_TICKS) {
                    send({ type: "reconnect", at: Date.now() });
                    clearInterval(interval);
                    controller.close();
                    return;
                }
                await tick();
            }, TICK_MS);
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
