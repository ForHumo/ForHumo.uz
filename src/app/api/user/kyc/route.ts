import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidMediaUrl } from "@/lib/media-url";

// GET /api/user/kyc — mening KYC L2 holatim
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, level: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const kyc = await prisma.userKyc.findUnique({ where: { profileId: me.id } });
    return NextResponse.json({
        level: me.level,
        kyc: kyc ? {
            status: kyc.status, submittedAt: kyc.submittedAt,
            reviewedAt: kyc.reviewedAt, rejectReason: kyc.rejectReason,
        } : null,
    });
}

// POST /api/user/kyc — L2 KYC uchun ariza (passport + selfie)
// body: { passportUrl, selfieUrl? }
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, level: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (me.level >= 2) return NextResponse.json({ error: "Siz allaqachon L2 KYC ega" }, { status: 400 });

    const { passportUrl, selfieUrl } = (await req.json()) as { passportUrl?: string; selfieUrl?: string };
    if (!passportUrl || !isValidMediaUrl(passportUrl)) {
        return NextResponse.json({ error: "Passport rasm URL noto'g'ri" }, { status: 400 });
    }
    if (selfieUrl && !isValidMediaUrl(selfieUrl)) {
        return NextResponse.json({ error: "Selfi URL noto'g'ri" }, { status: 400 });
    }

    // Mavjud ariza bo'lsa — status bo'yicha bloklash
    const existing = await prisma.userKyc.findUnique({ where: { profileId: me.id } });
    if (existing && existing.status === "PENDING") {
        return NextResponse.json({ error: "Sizning arizangiz allaqachon ko'rib chiqilmoqda" }, { status: 400 });
    }

    const kyc = existing
        ? await prisma.userKyc.update({
            where: { profileId: me.id },
            data: { passportUrl, selfieUrl: selfieUrl ?? null, status: "PENDING", rejectReason: null, reviewedAt: null, reviewedById: null, submittedAt: new Date() },
        })
        : await prisma.userKyc.create({
            data: { profileId: me.id, passportUrl, selfieUrl: selfieUrl ?? null },
        });

    return NextResponse.json({ ok: true, kyc: { status: kyc.status, submittedAt: kyc.submittedAt } });
}
