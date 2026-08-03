import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Slug ishlab chiqarish — do'kon nomidan URL-safe (o'zbekcha harflar → latin)
function makeSlug(name: string): string {
    const map: Record<string, string> = {
        "ў": "o", "ғ": "g", "қ": "q", "ҳ": "h",
        "'": "", "’": "", "ʻ": "", "ʼ": "",
    };
    return name.toLowerCase().split("").map(c => map[c] ?? c).join("")
        .replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || `shop-${Date.now()}`;
}

// GET /api/bn/sellers — mening seller profilim (bo'lsa)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ seller: null });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ seller: null });

    const seller = await prisma.bnSeller.findUnique({ where: { profileId: me.id } });
    return NextResponse.json({ seller });
}

// POST /api/bn/sellers — YaTT bilan ro'yxatdan o'tish (PENDING)
// body: { yattNumber, fullName, phone, shopName, ... }
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    // Allaqachon seller?
    const existing = await prisma.bnSeller.findUnique({ where: { profileId: me.id } });
    if (existing) return NextResponse.json({ error: "Siz allaqachon ro'yxatdan o'tgansiz", seller: existing }, { status: 400 });

    const body = (await req.json()) as {
        yattNumber?: string; fullName?: string; passportSeries?: string; passportNumber?: string;
        phone?: string; shopName?: string; description?: string;
        address?: string; city?: string;
        bankName?: string; bankAccount?: string; bankMFO?: string; bankINN?: string;
    };

    // Majburiy maydonlar
    if (!body.yattNumber?.trim()) return NextResponse.json({ error: "YaTT raqami kerak" }, { status: 400 });
    if (!body.fullName?.trim()) return NextResponse.json({ error: "F.I.SH. kerak" }, { status: 400 });
    if (!body.phone?.trim()) return NextResponse.json({ error: "Telefon raqami kerak" }, { status: 400 });
    if (!body.shopName?.trim()) return NextResponse.json({ error: "Do'kon nomi kerak" }, { status: 400 });

    // YaTT 9-11 raqam
    const yatt = body.yattNumber.trim();
    if (!/^\d{9,11}$/.test(yatt)) return NextResponse.json({ error: "YaTT 9-11 raqamli bo'lishi kerak" }, { status: 400 });

    // Duplikat YaTT (bir YaTT bitta seller uchun)
    const dup = await prisma.bnSeller.findUnique({ where: { yattNumber: yatt } });
    if (dup) return NextResponse.json({ error: "Bu YaTT allaqachon ro'yxatdan o'tgan" }, { status: 400 });

    // Slug — takrorlanmasin
    let slug = makeSlug(body.shopName);
    let i = 0;
    while (await prisma.bnSeller.findUnique({ where: { shopSlug: slug }, select: { id: true } })) {
        i++;
        slug = `${makeSlug(body.shopName)}-${i}`;
        if (i > 30) { slug = `shop-${Date.now()}`; break; }
    }

    const seller = await prisma.bnSeller.create({
        data: {
            profileId: me.id,
            yattNumber: yatt,
            fullName: body.fullName.trim().slice(0, 200),
            passportSeries: body.passportSeries?.trim().slice(0, 4) || null,
            passportNumber: body.passportNumber?.trim().slice(0, 20) || null,
            phone: body.phone.trim().slice(0, 20),
            shopName: body.shopName.trim().slice(0, 100),
            shopSlug: slug,
            description: body.description?.trim().slice(0, 1000) || null,
            address: body.address?.trim().slice(0, 500) || null,
            city: body.city?.trim().slice(0, 100) || "Toshkent",
            bankName: body.bankName?.trim().slice(0, 100) || null,
            bankAccount: body.bankAccount?.trim().slice(0, 30) || null,
            bankMFO: body.bankMFO?.trim().slice(0, 10) || null,
            bankINN: body.bankINN?.trim().slice(0, 20) || null,
            status: "PENDING",
        },
    });

    return NextResponse.json({ ok: true, seller });
}
