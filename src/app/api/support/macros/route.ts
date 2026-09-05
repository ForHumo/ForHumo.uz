// Support macro javoblari.
//
//   GET /api/support/macros?module=bn&q=order
//     -> ro'yxat
//   POST /api/support/macros
//     { ticketId, macroId }
//     -> macro javobni ticket'ga qo'shadi (founder only)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/admin-guard";
import { SUPPORT_MACROS, findMacrosByModule, searchMacros, getMacroById } from "@/lib/support-macros";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "founder_required" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const module = searchParams.get("module");
    const q = searchParams.get("q");

    let items = SUPPORT_MACROS;
    if (module) items = findMacrosByModule(module);
    if (q) items = searchMacros(q);

    return NextResponse.json({ items });
}

export async function POST(req: Request) {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "founder_required" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const ticketId = typeof body?.ticketId === "string" ? body.ticketId : null;
    const macroId = typeof body?.macroId === "string" ? body.macroId : null;
    if (!ticketId || !macroId) {
        return NextResponse.json({ error: "params_required" }, { status: 400 });
    }

    const macro = getMacroById(macroId);
    if (!macro) return NextResponse.json({ error: "macro_not_found" }, { status: 404 });

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return NextResponse.json({ error: "ticket_not_found" }, { status: 404 });

    await prisma.supportMessage.create({
        data: {
            ticketId,
            authorRole: "support",
            authorId: founder.id,
            body: macro.body,
        },
    });
    await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, macroId, body: macro.body });
}
