import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { email } = await req.json().catch(() => ({}));
    if (email?.toLowerCase() !== session.user.email.toLowerCase()) {
        return NextResponse.json({ error: "email_mismatch" }, { status: 400 });
    }

    await prisma.userProfile.delete({ where: { email: session.user.email } });
    return NextResponse.json({ ok: true });
}
