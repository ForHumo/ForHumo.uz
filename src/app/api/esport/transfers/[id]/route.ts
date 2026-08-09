import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile } from "@/lib/esport";
import { executeTransfer, TRANSFER_MSG } from "@/lib/esport-transfer";
import { esNotify } from "@/lib/esport-notify";
import { isProfileBlocked, canManageTeam } from "@/lib/esport-block";

// POST /api/esport/transfers/[id] — ko'p bosqichli javob
// { action: approve|reject, fee? }
//  PLAYER_PENDING → o'yinchi: approve (erkin bo'lsa darhol DONE; jamoadagi bo'lsa AWAIT_FEE) / reject
//  AWAIT_FEE      → xaridor: action=setfee + fee (≥ marketValue) → CLUB_PENDING
//  CLUB_PENDING   → sotuvchi jamoa: approve (For Pay + ko'chirish → DONE) / reject
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const tr = await prisma.esTransfer.findUnique({ where: { id }, select: { id: true, status: true, athleteId: true, toTeamId: true, fromTeamId: true } });
    if (!tr || !["PLAYER_PENDING", "AWAIT_FEE", "CLUB_PENDING"].includes(tr.status)) return NextResponse.json({ error: "Taklif topilmadi yoki yopilgan" }, { status: 404 });

    const athlete = await prisma.esAthlete.findUnique({ where: { id: tr.athleteId }, select: { humoProfileId: true, marketValue: true } });
    const toTeam = await prisma.esTeam.findUnique({ where: { id: tr.toTeamId }, select: { ownerId: true } });
    const fromTeam = tr.fromTeamId ? await prisma.esTeam.findUnique({ where: { id: tr.fromTeamId }, select: { ownerId: true } }) : null;
    const isAthlete = athlete?.humoProfileId === me.id;
    const isBuyer = !!toTeam && await canManageTeam(me.id, tr.toTeamId);
    const isClub = !!fromTeam && !!tr.fromTeamId && await canManageTeam(me.id, tr.fromTeamId);

    const body = await req.json();
    const action = body.action;
    const athleteBlocked = athlete ? await isProfileBlocked(athlete.humoProfileId) : false;

    // 1) O'yinchi taklifni ko'rib chiqadi
    if (tr.status === "PLAYER_PENDING") {
        if (!isAthlete) return NextResponse.json({ error: "Faqat o'yinchi javob beradi" }, { status: 403 });
        if (action === "approve" && athleteBlocked) return NextResponse.json({ error: "Siz bloklangansiz — transferni qabul qila olmaysiz" }, { status: 403 });
        if (action === "reject") {
            await prisma.esTransfer.update({ where: { id }, data: { status: "REJECTED" } });
            await esNotify(toTeam?.ownerId, { type: "TRANSFER_DONE", title: "Taklif rad etildi", body: "O'yinchi transfer taklifini rad etdi", href: "/esport/transfers" });
            return NextResponse.json({ ok: true });
        }
        if (action === "approve") {
            if (!tr.fromTeamId) { // erkin sportchi — darhol o'tadi (haqsiz)
                const r = await executeTransfer(id);
                if (r !== "ok") return NextResponse.json({ error: TRANSFER_MSG[r] }, { status: 400 });
                await esNotify(toTeam?.ownerId, { type: "TRANSFER_DONE", title: "O'yinchi qo'shildi", body: "Erkin sportchi jamoangizga qo'shildi", href: "/esport/teams" });
                return NextResponse.json({ ok: true, done: true });
            }
            await prisma.esTransfer.update({ where: { id }, data: { status: "AWAIT_FEE" } });
            await esNotify(toTeam?.ownerId, { type: "TRANSFER_FEE", title: "O'yinchi qabul qildi", body: "Endi sotuvchi jamoaga haq taklif qiling", href: "/esport/transfers" });
            return NextResponse.json({ ok: true, message: "Qabul qilindi — endi xaridor jamoaga haq taklif qiladi" });
        }
        return NextResponse.json({ error: "Noto'g'ri amal" }, { status: 400 });
    }

    // 2) Xaridor jamoaga haq taklif qiladi (marketValuedan kam emas)
    if (tr.status === "AWAIT_FEE") {
        if (!isBuyer) return NextResponse.json({ error: "Faqat xaridor jamoa haq belgilaydi" }, { status: 403 });
        if (action === "cancel") { await prisma.esTransfer.update({ where: { id }, data: { status: "CANCELLED" } }); return NextResponse.json({ ok: true }); }
        const fee = Math.max(0, Math.round(Number(body.fee) || 0));
        const floor = athlete?.marketValue ? Number(athlete.marketValue) : 0;
        if (fee < floor) return NextResponse.json({ error: `Haq transfermarket narxidan kam bo'lmasin (${floor.toLocaleString()} so'm)` }, { status: 400 });
        await prisma.esTransfer.update({ where: { id }, data: { fee, status: "CLUB_PENDING" } });
        await esNotify(fromTeam?.ownerId, { type: "TRANSFER_FEE", title: "Transfer haqi taklifi", body: `O'yinchingiz uchun ${fee.toLocaleString()} so'm taklif qilindi`, href: "/esport/transfers" });
        return NextResponse.json({ ok: true, message: "Haq taklifi sotuvchi jamoaga yuborildi" });
    }

    // 3) Sotuvchi jamoa haqni qabul qiladi → For Pay + ko'chirish
    if (tr.status === "CLUB_PENDING") {
        if (!isClub) return NextResponse.json({ error: "Faqat sotuvchi jamoa egasi javob beradi" }, { status: 403 });
        if (action === "reject") {
            await prisma.esTransfer.update({ where: { id }, data: { status: "REJECTED" } });
            await esNotify(toTeam?.ownerId, { type: "TRANSFER_DONE", title: "Haq rad etildi", body: "Sotuvchi jamoa haq taklifini rad etdi", href: "/esport/transfers" });
            return NextResponse.json({ ok: true });
        }
        if (action === "approve") {
            if (athleteBlocked) return NextResponse.json({ error: "O'yinchi bloklangan — transfer amalga oshmaydi" }, { status: 403 });
            const r = await executeTransfer(id);
            if (r !== "ok") return NextResponse.json({ error: TRANSFER_MSG[r] }, { status: 400 });
            await esNotify(toTeam?.ownerId, { type: "TRANSFER_DONE", title: "Transfer yakunlandi", body: "O'yinchi jamoangizga o'tdi", href: "/esport/teams" });
            await esNotify(athlete?.humoProfileId, { type: "TRANSFER_DONE", title: "Transfer yakunlandi", body: "Siz yangi jamoaga o'tdingiz", href: "/esport/teams" });
            return NextResponse.json({ ok: true, done: true });
        }
    }
    return NextResponse.json({ error: "Noto'g'ri amal" }, { status: 400 });
}

// DELETE — xaridor bekor qiladi (o'yinchi javobini kutayotgan bosqichda)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    const tr = await prisma.esTransfer.findUnique({ where: { id }, select: { status: true, toTeamId: true } });
    if (!tr || !["PLAYER_PENDING", "AWAIT_FEE"].includes(tr.status)) return NextResponse.json({ error: "Bekor qilib bo'lmaydi" }, { status: 400 });
    if (!await canManageTeam(me.id, tr.toTeamId)) return NextResponse.json({ error: "Faqat xaridor jamoa" }, { status: 403 });
    await prisma.esTransfer.update({ where: { id }, data: { status: "CANCELLED" } });
    return NextResponse.json({ ok: true });
}
