// Belis buyurtma chat — mijoz ↔ @sevinch.
// GET  /api/belis/bookings/[code]/messages   — ro'yxat + auto o'qildi belgilash
// POST /api/belis/bookings/[code]/messages   — yangi xabar { text, imageUrl? }

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBelisAuth } from "@/lib/belis-auth";
import { belisPush, belisPushAdmins } from "@/lib/belis-notify";

export const dynamic = "force-dynamic";

async function getBookingCtx(code: string, myId: string, isAdmin: boolean) {
    const b = await prisma.belisRentalBooking.findUnique({
        where: { code },
        select: { id: true, buyerId: true, buyerName: true, code: true },
    });
    if (!b) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
    const isBuyer = b.buyerId === myId;
    if (!isBuyer && !isAdmin) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
    return { booking: b, isBuyer, isAdmin };
}

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
    const auth = await requireBelisAuth();
    if (auth instanceof NextResponse) return auth;
    const { code } = await params;
    const ctx = await getBookingCtx(code, auth.profileId, auth.isAdmin);
    if ("error" in ctx) return ctx.error;

    const messages = await prisma.belisBookingMessage.findMany({
        where: { bookingId: ctx.booking.id },
        orderBy: { createdAt: "asc" },
        take: 200,
    });

    // Qarshi tomon xabarlarini o'qildi
    const otherUnread = messages.filter(m => m.senderId !== auth.profileId && !m.readAt).map(m => m.id);
    if (otherUnread.length > 0) {
        await prisma.belisBookingMessage.updateMany({
            where: { id: { in: otherUnread } },
            data: { readAt: new Date() },
        });
    }

    return NextResponse.json({
        messages: messages.map(m => ({
            id: m.id,
            senderId: m.senderId,
            isMine: m.senderId === auth.profileId,
            text: m.text,
            imageUrl: m.imageUrl,
            readAt: m.readAt?.toISOString() ?? null,
            createdAt: m.createdAt.toISOString(),
        })),
    });
}

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
    const auth = await requireBelisAuth();
    if (auth instanceof NextResponse) return auth;
    const { code } = await params;
    const ctx = await getBookingCtx(code, auth.profileId, auth.isAdmin);
    if ("error" in ctx) return ctx.error;

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim().slice(0, 2000);
    const imageUrl = typeof body?.imageUrl === "string" && body.imageUrl.length > 0
        ? body.imageUrl.slice(0, 500) : null;
    if (!text && !imageUrl) return NextResponse.json({ error: "empty" }, { status: 400 });

    const msg = await prisma.belisBookingMessage.create({
        data: { bookingId: ctx.booking.id, senderId: auth.profileId, text, imageUrl },
    });

    // Push qarshi tomonga (fail-safe)
    after(async () => {
        const shortText = text.length > 60 ? text.slice(0, 57) + "…" : text;
        if (ctx.isBuyer) {
            // Mijoz → adminga
            await belisPushAdmins({
                title: `Belis: ${ctx.booking.buyerName}`,
                body: shortText || "Rasm yubordi",
                link: `/admin?code=${code}`,
                tag: `belis-msg:${code}`,
            });
        } else {
            // Admin → mijozga
            await belisPush(ctx.booking.buyerId, {
                title: "Belis: yangi xabar",
                body: shortText || "Rasm yubordi",
                link: `/buyurtma/${code}?chat=1`,
                tag: `belis-msg:${code}`,
            });
        }
    });

    return NextResponse.json({
        ok: true,
        message: {
            id: msg.id,
            senderId: msg.senderId,
            isMine: true,
            text: msg.text,
            imageUrl: msg.imageUrl,
            readAt: null,
            createdAt: msg.createdAt.toISOString(),
        },
    });
}
