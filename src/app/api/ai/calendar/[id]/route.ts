// AI Kalendar — bitta tadbir: o'chirish / tahrir.
// DELETE /api/ai/calendar/[id]
// PATCH  /api/ai/calendar/[id]  { title?, startsAt?, endsAt?, location?, note?, done?, remindAt? }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function profileId(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    return me?.id ?? null;
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const pid = await profileId();
    if (!pid) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const { id } = await params;
    await prisma.aiEvent.deleteMany({ where: { id, profileId: pid } });
    return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const pid = await profileId();
    if (!pid) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const { id } = await params;
    const b = await req.json().catch(() => null) as Record<string, unknown> | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (typeof b?.title === "string") data.title = b.title.trim().slice(0, 120);
    if (b?.startsAt) data.startsAt = new Date(String(b.startsAt));
    if (b?.endsAt !== undefined) data.endsAt = b.endsAt ? new Date(String(b.endsAt)) : null;
    if (b?.location !== undefined) data.location = b.location ? String(b.location).slice(0, 200) : null;
    if (b?.note !== undefined) data.note = b.note ? String(b.note).slice(0, 1000) : null;
    if (typeof b?.done === "boolean") data.done = b.done;
    if (b?.remindAt !== undefined) data.remindAt = b.remindAt ? new Date(String(b.remindAt)) : null;
    const r = await prisma.aiEvent.updateMany({ where: { id, profileId: pid }, data });
    return NextResponse.json({ ok: r.count > 0 });
}
