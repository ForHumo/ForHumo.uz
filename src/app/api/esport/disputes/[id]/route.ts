import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";
import { esNotify } from "@/lib/esport-notify";

// POST /api/esport/disputes/[id] — hakam qarori (admin/ega) { action: resolve|reject, note? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;
    const d = await prisma.esDispute.findUnique({ where: { id }, select: { id: true, status: true, filedBy: true } });
    if (!d) return NextResponse.json({ error: "E'tiroz topilmadi" }, { status: 404 });
    if (d.status !== "OPEN") return NextResponse.json({ error: "E'tiroz allaqachon yopilgan" }, { status: 400 });

    const b = await req.json().catch(() => ({}));
    const action = b.action === "resolve" ? "RESOLVED" : b.action === "reject" ? "REJECTED" : null;
    if (!action) return NextResponse.json({ error: "Noto'g'ri amal" }, { status: 400 });
    const note = typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 500) : null;

    await prisma.esDispute.update({ where: { id }, data: { status: action, adminNote: note, resolvedAt: new Date() } });
    await esNotify(d.filedBy, {
        type: "DISPUTE_RESULT",
        title: action === "RESOLVED" ? "E'tiroz qabul qilindi" : "E'tiroz rad etildi",
        body: note || (action === "RESOLVED" ? "Hakam e'tirozingizni qabul qildi" : "Hakam e'tirozingizni rad etdi"),
        href: "/esport/tournaments",
    });
    return NextResponse.json({ ok: true, status: action });
}
