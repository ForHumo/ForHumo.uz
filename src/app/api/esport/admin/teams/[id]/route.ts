import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin, purgeTeam } from "@/lib/esport";
import { esNotifyMany } from "@/lib/esport-notify";

// DELETE /api/esport/admin/teams/[id] — axloqsiz nom/logo uchun jamoani majburiy o'chirish (admin)
// A'zolar jamoasiz qoladi; ularga bildirishnoma boradi.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;
    const team = await prisma.esTeam.findUnique({ where: { id }, select: { id: true, ownerId: true } });
    if (!team) return NextResponse.json({ error: "Jamoa topilmadi" }, { status: 404 });

    // A'zo + staff profil ID'larini yig'amiz (bildirishnoma uchun)
    const rosters = await prisma.esRoster.findMany({ where: { teamId: id }, select: { members: { select: { athlete: { select: { humoProfileId: true } } } } } });
    const staff = await prisma.esTeamStaff.findMany({ where: { teamId: id }, select: { profileId: true } });
    const ids = [...new Set([team.ownerId, ...rosters.flatMap(r => r.members.map(m => m.athlete.humoProfileId)), ...staff.map(s => s.profileId)])];

    await purgeTeam(id); // transfer bekor + standings + shartnoma + jamoa (cascade)
    await esNotifyMany(ids, { type: "TEAM_REMOVED", title: "Jamoa o'chirildi", body: "Jamoangiz qoidabuzarlik (nom/logo) sababli o'chirildi", href: "/esport/teams" });
    return NextResponse.json({ ok: true });
}
