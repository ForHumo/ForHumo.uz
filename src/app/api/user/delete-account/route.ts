import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { eraseNexusData } from "@/lib/nexus-erase";

// DELETE /api/user/delete-account — akkauntni o'chirish.
// Yondashuv: ijtimoiy kontent + DM + aloqalar to'liq o'chadi (maxfiylik/erasure),
// hamyon/ledger esa anonim saqlanadi (moliyaviy hisobot uchun) — profil tombstone'ga aylanadi.
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { email } = await req.json().catch(() => ({}));
    if (email?.toLowerCase() !== session.user.email.toLowerCase()) {
        return NextResponse.json({ error: "email_mismatch" }, { status: 400 });
    }

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, deletedAt: true, wallet: { select: { balance: true } } },
    });
    if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (profile.deletedAt) return NextResponse.json({ ok: true, already: true });

    // Balans qolgan bo'lsa avval yechib olish kerak (pul yo'qolmasin)
    if (Number(profile.wallet?.balance ?? 0) > 0) {
        return NextResponse.json({ error: "withdraw_first" }, { status: 400 });
    }

    // 1) Barcha Nexus ma'lumotlarini o'chirish (kontent, DM, aloqalar)
    await eraseNexusData(profile.id);

    // 2) Profilni anonimlashtirish (tombstone) — hamyon/ledger profileId orqali bog'liq qoladi.
    //    Email/username/googleId bo'shatiladi: foydalanuvchi xohlasa qayta ro'yxatdan o'tadi (yangi profil).
    await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
            email: `deleted+${profile.id}@deleted.forhumo.uz`,
            googleId: null,
            username: null,
            humoId: null,
            name: "O'chirilgan foydalanuvchi",
            firstName: null, lastName: null, fatherName: null,
            image: null, coverImage: null, bio: null, birthday: null,
            city: null, location: null, locationIv: null, phone: null,
            verified: false, verifiedAt: null, subPrice: 0,
            onboardingDone: false, emailVerified: false,
            deletedAt: new Date(),
        },
    });

    return NextResponse.json({ ok: true });
}
