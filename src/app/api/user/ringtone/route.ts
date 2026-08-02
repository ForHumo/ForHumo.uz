import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID = ["signature", "whisper", "pulse", "melody", "classic"] as const;
type Variant = (typeof VALID)[number];

// GET /api/user/ringtone — hozirgi tanlangan variant
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { ringtone: true },
    });
    const ringtone = (me?.ringtone as Variant) || "signature";
    return NextResponse.json({ ringtone });
}

// PATCH /api/user/ringtone — variantni o'zgartirish
// body: { variant: "signature" | "whisper" | ... }
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { variant } = (await req.json()) as { variant?: string };
    if (!variant || !VALID.includes(variant as Variant)) {
        return NextResponse.json({ error: "Noto'g'ri variant" }, { status: 400 });
    }
    await prisma.userProfile.update({
        where: { email: session.user.email }, data: { ringtone: variant },
    });
    return NextResponse.json({ ok: true, ringtone: variant });
}
