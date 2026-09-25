import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.subject || !body?.message) {
        return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    const email   = String(body.email).trim().slice(0, 200);
    const subject = String(body.subject).trim().slice(0, 100);
    const message = String(body.message).trim().slice(0, 2000);

    if (!email.includes("@") || message.length < 10) {
        return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    let profileId: string | undefined;
    if (session?.user?.email) {
        const p = await prisma.userProfile.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        profileId = p?.id;
    }

    // Dastlabki xabarni SupportMessage sifatida ham yozamiz — aks holda anonim
    // contact-forma tiketi admin thread'ida BO'SH ko'rinardi (thread faqat
    // SupportMessage'lardan quriladi; ticket.message ko'rsatilmaydi). tickets-API naqshi.
    await prisma.supportTicket.create({
        data: {
            email, subject, message, profileId: profileId ?? null,
            messages: {
                create: { authorRole: "USER", authorId: profileId ?? null, body: message },
            },
        },
    });

    return NextResponse.json({ ok: true });
}
