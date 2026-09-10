// Humo AI Bot buyurtmalar (leads) — ega uchun.
//   GET  /api/telegram/humo-bot/leads?status=OPEN
//   PATCH /api/telegram/humo-bot/leads  body: { id, status?, ownerNote?, wonAmountUzs? }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireProfile() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    return prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
}

export async function GET(req: Request) {
    const profile = await requireProfile();
    if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "30")));

    const where: { profileId: string; status?: string } = { profileId: profile.id };
    if (status && ["OPEN", "CONTACTED", "WON", "LOST"].includes(status)) where.status = status;

    const [leads, counts] = await Promise.all([
        prisma.humoBotLead.findMany({
            where, orderBy: { createdAt: "desc" }, take: limit,
        }),
        prisma.humoBotLead.groupBy({
            by: ["status"],
            where: { profileId: profile.id },
            _count: { _all: true },
        }),
    ]);

    return NextResponse.json({
        leads,
        counts: Object.fromEntries(counts.map(c => [c.status, c._count._all])),
    });
}

export async function PATCH(req: Request) {
    const profile = await requireProfile();
    if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

    const patch: { status?: string; ownerNote?: string; wonAmountUzs?: number; contactedAt?: Date } = {};
    if (typeof body.status === "string" && ["OPEN", "CONTACTED", "WON", "LOST"].includes(body.status)) {
        patch.status = body.status;
        if (body.status === "CONTACTED") patch.contactedAt = new Date();
    }
    if (typeof body.ownerNote === "string") patch.ownerNote = body.ownerNote.slice(0, 500);
    if (typeof body.wonAmountUzs === "number" && body.wonAmountUzs >= 0) patch.wonAmountUzs = Math.floor(body.wonAmountUzs);

    const updated = await prisma.humoBotLead.updateMany({
        where: { id, profileId: profile.id },
        data: patch,
    });
    if (updated.count === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Agar WON qilingan bo'lsa va ega'ning BN do'koni bog'langan bo'lsa,
    // BN'ga xarid tarixi (BnPurchase) yaratamiz — shop dashboard'da sotuv sifatida ko'rinadi.
    let bnRecorded = false;
    if (patch.status === "WON") {
        try {
            const lead = await prisma.humoBotLead.findUnique({
                where: { id },
                select: {
                    productMention: true, wonAmountUzs: true, customerName: true, customerPhone: true,
                },
            });
            const config = await prisma.humoBotConfig.findUnique({
                where: { profileId: profile.id },
                select: { linkedBnShopSlug: true },
            });
            if (lead && config?.linkedBnShopSlug) {
                const shop = await prisma.bnShop.findUnique({
                    where: { slug: config.linkedBnShopSlug },
                    select: { id: true, profileId: true },
                });
                // Faqat o'z do'konimizni bog'lay olamiz (xavfsizlik)
                if (shop && shop.profileId === profile.id) {
                    // BnPurchase profileId — xaridor. Bizda hozir xaridor Humo ID yo'q,
                    // shu sabab OFFLINE_MANUAL sifatida ega o'zining profileId'siga yozamiz
                    // (kabinet'da shu do'kon ostida sotuv sifatida ko'rinishi uchun).
                    const titleParts = [
                        lead.productMention ?? "So'rov",
                        lead.customerName ? `— ${lead.customerName}` : "",
                        lead.customerPhone ? `(${lead.customerPhone})` : "",
                    ].filter(Boolean).join(" ").slice(0, 200);
                    await prisma.bnPurchase.create({
                        data: {
                            profileId: profile.id,           // Ega — sotuv o'zining tarixida
                            shopId: shop.id,
                            title: titleParts,
                            quantity: 1,
                            priceUzs: lead.wonAmountUzs ?? 0,
                            purchasedAt: new Date(),
                            source: "OFFLINE_MANUAL",
                        },
                    });
                    bnRecorded = true;
                }
            }
        } catch (e) { console.error("[humo-bot lead won → bn]", e); }
    }

    // Konfirmatsiya: WON qilinganda mijozga xabar (WhatsApp/Telegram)
    let confirmResult: { sent: boolean; channel: string | null; openUrl?: string | null; error?: string } | null = null;
    if (patch.status === "WON") {
        try {
            const [lead, cfg, ownerProfile] = await Promise.all([
                prisma.humoBotLead.findUnique({ where: { id } }),
                prisma.humoBotConfig.findUnique({
                    where: { profileId: profile.id },
                    select: { autoConfirmEnabled: true, confirmChannel: true, confirmTemplate: true },
                }),
                prisma.userProfile.findUnique({
                    where: { id: profile.id },
                    select: { name: true, username: true },
                }),
            ]);
            if (lead && cfg?.autoConfirmEnabled) {
                const { sendConfirmation } = await import("@/lib/humo-bot-confirm");
                const r = await sendConfirmation({
                    leadId: lead.id,
                    ownerName: ownerProfile?.name ?? ownerProfile?.username ?? "Sotuvchi",
                    customerName: lead.customerName,
                    customerPhone: lead.customerPhone,
                    customerTgId: lead.customerTgId,
                    customerAddress: lead.customerAddress,
                    productMention: lead.productMention,
                    wonAmountUzs: lead.wonAmountUzs,
                    channel: (cfg.confirmChannel ?? "auto") as "auto" | "whatsapp" | "telegram" | "none",
                    template: cfg.confirmTemplate,
                });
                confirmResult = r;
            }
        } catch (e) { console.error("[humo-bot lead-confirm]", e); }
    }

    return NextResponse.json({ ok: true, bnRecorded, confirmResult });
}
