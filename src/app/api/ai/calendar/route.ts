// AI Kalendar — tadbirlar ro'yxati + yaratish. Ummi (va foydalanuvchi) o'qiydi/yozadi.
// GET  /api/ai/calendar?from=ISO&to=ISO   (default: hozirdan kelasi tadbirlar)
// POST /api/ai/calendar  { title, startsAt, endsAt?, location?, note?, allDay?, source?, sourceRef?, remindAt? }

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(e: any) {
    return {
        id: e.id, title: e.title,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt ? e.endsAt.toISOString() : null,
        location: e.location, note: e.note, allDay: e.allDay,
        source: e.source, sourceRef: e.sourceRef,
        remindAt: e.remindAt ? e.remindAt.toISOString() : null,
        done: e.done,
    };
}

export async function GET(req: Request) {
    const pid = await profileId();
    if (!pid) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const url = new URL(req.url);
    const fromP = url.searchParams.get("from");
    const toP = url.searchParams.get("to");
    const from = fromP ? new Date(fromP) : new Date(Date.now() - 60 * 60 * 1000); // 1 soat oldin (davom etayotganlar)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { profileId: pid, startsAt: { gte: from } };
    if (toP) where.startsAt.lte = new Date(toP);
    const rows = await prisma.aiEvent.findMany({ where, orderBy: { startsAt: "asc" }, take: 100 });
    return NextResponse.json({ events: rows.map(serialize) });
}

export async function POST(req: Request) {
    const pid = await profileId();
    if (!pid) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const b = await req.json().catch(() => null) as Record<string, unknown> | null;
    const title = String(b?.title ?? "").trim().slice(0, 120);
    const startsAt = b?.startsAt ? new Date(String(b.startsAt)) : null;
    if (!title || !startsAt || isNaN(startsAt.getTime())) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const ev = await prisma.aiEvent.create({
        data: {
            profileId: pid, title, startsAt,
            endsAt: b?.endsAt ? new Date(String(b.endsAt)) : null,
            location: b?.location ? String(b.location).slice(0, 200) : null,
            note: b?.note ? String(b.note).slice(0, 1000) : null,
            allDay: !!b?.allDay,
            source: typeof b?.source === "string" ? b.source.slice(0, 20) : "user",
            sourceRef: b?.sourceRef ? String(b.sourceRef).slice(0, 100) : null,
            remindAt: b?.remindAt ? new Date(String(b.remindAt)) : null,
        },
    });
    return NextResponse.json({ ok: true, event: serialize(ev) });
}
