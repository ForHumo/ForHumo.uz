// Agent commands ro'yxati — profil ID orqali (DM composer '/' autocomplete uchun).
// Foydalanuvchi agentga DM yozayotgan bo'lsa, uning commands'larini olishi kerak.
//
//   GET /api/nexus/agents/by-profile/[profileId]/commands
//   → { commands: [{ cmd, description }] }
//
// Agent bo'lmasa yoki commands yo'q bo'lsa → { commands: [] }
// Public (auth kerak lekin ruxsat cheklovi yo'q) — commands ochiq ma'lumot.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ profileId: string }> }) {
    const { profileId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ commands: [] });

    const agent = await prisma.nexusAgent.findUnique({
        where: { profileId },
        select: { commands: true },
    });
    if (!agent) return NextResponse.json({ commands: [] });

    // JSON'ni sanitize qilish (agar noto'g'ri strukturada bo'lsa)
    const raw = agent.commands;
    if (!Array.isArray(raw)) return NextResponse.json({ commands: [] });
    const commands: Array<{ cmd: string; description: string }> = [];
    for (const r of raw) {
        if (!r || typeof r !== "object") continue;
        const c = r as { cmd?: unknown; description?: unknown };
        if (typeof c.cmd === "string" && typeof c.description === "string") {
            commands.push({ cmd: c.cmd, description: c.description });
        }
    }
    return NextResponse.json({ commands });
}
