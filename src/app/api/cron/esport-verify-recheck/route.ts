import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recheckAllAccounts } from "@/lib/esport-verify";
import { ESPORT_OWNER_HUMO_ID } from "@/lib/esport";
import { esNotify, esNotifyMany } from "@/lib/esport-notify";

// GET /api/cron/esport-verify-recheck — kunlik 23:00 UTC. STEAM+FACEIT akkauntlarni qayta tekshiradi.
// Yangi BLOK (masalan keyin yegan VAC/Faceit ban) topilsa o'yinchi + adminlarга xabar beradi.
// PUL AVTOMATIK QAYTARILMAYDI — admin qaroriga qoladi (xavfsizlik). Himoya: Vercel cron yoki CRON_SECRET.
export const maxDuration = 60;

export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.get("authorization");
    const isVercelCron = req.headers.get("x-vercel-cron") != null;
    if (!isVercelCron && (!secret || auth !== `Bearer ${secret}`)) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const r = await recheckAllAccounts();

    if (r.newlyBlocked.length) {
        // O'yinchining o'ziga xabar
        for (const nb of r.newlyBlocked) {
            await esNotify(nb.humoProfileId, {
                type: "VERIFY_BLOCK",
                title: "Akkaunt tekshiruvi — BLOK",
                body: `${nb.platform} akkauntingiz yangi ban sababli bloklandi. Turnirlarga ro'yxatdan o'ta olmaysiz.`,
                href: "/esport-test/athlete",
            });
        }
        // Adminlarga umumiy xabar
        const admins = await prisma.esAdmin.findMany({ select: { humoId: true } });
        const humoIds = [...new Set([...admins.map(a => a.humoId), ESPORT_OWNER_HUMO_ID])];
        const adminProfiles = await prisma.userProfile.findMany({ where: { humoId: { in: humoIds } }, select: { id: true } });
        await esNotifyMany(adminProfiles.map(p => p.id), {
            type: "VERIFY_BLOCK_ADMIN",
            title: `Tekshiruv: ${r.newlyBlocked.length} yangi BLOK`,
            body: r.newlyBlocked.map(n => `${n.ign} (${n.platform})`).join(", ").slice(0, 300),
            href: "/esport-test/admin",
        });
    }

    return NextResponse.json({ ok: true, checked: r.checked, newlyBlocked: r.newlyBlocked.length });
}
