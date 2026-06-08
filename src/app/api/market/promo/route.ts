import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FOUNDER_HUMO_IDS = ["UZ6889574", "UZ3549920"];
const FOUNDER_USERNAMES = ["abduvoris", "aaa"];
function isFounder(p: { humoId: string | null; username: string | null }) {
    return (!!p.humoId && FOUNDER_HUMO_IDS.includes(p.humoId)) || (!!p.username && FOUNDER_USERNAMES.includes(p.username));
}

async function me(email: string) {
    return prisma.userProfile.findUnique({ where: { email }, select: { id: true, humoId: true, username: true } });
}

// GET — promokodlar ro'yxati (faqat asoschilar)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ codes: [], isFounder: false });
    const profile = await me(session.user.email);
    if (!profile || !isFounder(profile)) return NextResponse.json({ codes: [], isFounder: false });

    const codes = await prisma.marketPromoCode.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ codes, isFounder: true });
}

// POST — promokod yaratish
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await me(session.user.email);
    if (!profile || !isFounder(profile)) return NextResponse.json({ error: "Faqat asoschilar" }, { status: 403 });

    const b = await req.json();
    const code = String(b.code || "").trim().toUpperCase();
    const type = b.type === "FIXED" ? "FIXED" : "PERCENT";
    const value = Number(b.value) || 0;
    if (!code) return NextResponse.json({ error: "Kod kerak" }, { status: 400 });
    if (value <= 0) return NextResponse.json({ error: "Qiymat kerak" }, { status: 400 });
    if (type === "PERCENT" && value > 100) return NextResponse.json({ error: "Foiz 100 dan oshmasin" }, { status: 400 });

    const exists = await prisma.marketPromoCode.findUnique({ where: { code } });
    if (exists) return NextResponse.json({ error: "Bu kod allaqachon mavjud" }, { status: 409 });

    const promo = await prisma.marketPromoCode.create({
        data: {
            code, type, value,
            minOrder: b.minOrder ? Number(b.minOrder) : 0,
            maxDiscount: b.maxDiscount ? Number(b.maxDiscount) : null,
            usageLimit: b.usageLimit ? Number(b.usageLimit) : null,
            expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
        },
    });
    return NextResponse.json({ promo });
}

// DELETE — promokodni o'chirish
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await me(session.user.email);
    if (!profile || !isFounder(profile)) return NextResponse.json({ error: "Faqat asoschilar" }, { status: 403 });

    const { id } = await req.json();
    if (id) await prisma.marketPromoCode.delete({ where: { id } }).catch(() => {});
    return NextResponse.json({ ok: true });
}
