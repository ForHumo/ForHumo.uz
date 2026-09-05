// GDPR ma'lumot eksport — foydalanuvchi o'zining barcha ma'lumotlarini JSON tarzida oladi.
//
//   GET /api/user/data-export
//
// Response: JSON fayl download (attachment). PII ochiq matn, faqat egasi ko'radi.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const [
        loginEvents, bnOrders, bnFavorites, bnShops,
        belisBookings, marketOrders, marketReviews,
        supportTickets, nexusPosts, wallet, walletTx,
    ] = await Promise.all([
        prisma.loginEvent.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" }, take: 100 }).catch(() => []),
        prisma.bnOrder.findMany({ where: { buyerId: profile.id }, include: { items: true, shop: { select: { name: true } } } }).catch(() => []),
        prisma.bnFavorite.findMany({ where: { profileId: profile.id } }).catch(() => []),
        prisma.bnShop.findMany({ where: { profileId: profile.id } }).catch(() => []),
        prisma.belisRentalBooking.findMany({ where: { buyerId: profile.id } }).catch(() => []),
        prisma.marketOrder.findMany({ where: { profileId: profile.id }, include: { items: true } }).catch(() => []),
        prisma.marketReview.findMany({ where: { profileId: profile.id } }).catch(() => []),
        prisma.supportTicket.findMany({ where: { profileId: profile.id }, include: { messages: true } }),
        prisma.nexusPost.findMany({ where: { profileId: profile.id } }).catch(() => []),
        prisma.wallet.findUnique({ where: { profileId: profile.id } }).catch(() => null),
        prisma.walletTransaction.findMany({
            where: { wallet: { profileId: profile.id } },
            orderBy: { createdAt: "desc" }, take: 500,
        }).catch(() => []),
    ]);

    // PII ni maskirovka qilmaymiz — ega o'ziga chiqarayapti
    const payload = {
        exportedAt: new Date().toISOString(),
        gdpr_notice: "Bu fayl siz uchun. Boshqa hech kim bilan bo'lishilmagan. Manzil (location) shifrlangan holda saqlanadi.",
        profile: {
            id: profile.id,
            humoId: profile.humoId,
            email: profile.email,
            username: profile.username,
            name: profile.name,
            image: profile.image,
            country: profile.country,
            createdAt: profile.createdAt.toISOString(),
            lastLoginAt: profile.lastLoginAt?.toISOString(),
            emailVerified: profile.emailVerified,
            // location shifrlangan holda qaytariladi (ega qayta shifr yechishi mumkin)
            location_encrypted: !!profile.location,
        },
        loginEvents: loginEvents.map(e => ({
            id: e.id, ip: e.ip, ua: e.userAgent, at: e.createdAt.toISOString(),
        })),
        wallet: wallet ? {
            balance: Number(wallet.balance), currency: wallet.currency,
        } : null,
        walletTransactions: walletTx.map(t => ({
            id: t.id, type: t.type, amount: Number(t.amount),
            currency: t.currency, description: t.description, at: t.createdAt.toISOString(),
        })),
        bnOrders: bnOrders.map(o => ({
            id: o.id, code: o.code, shop: o.shop?.name, status: o.status,
            total: o.total, at: o.placedAt.toISOString(),
            items: o.items.map(i => ({ title: i.title, qty: i.qty, price: i.price })),
        })),
        bnFavorites: bnFavorites.map(f => ({ productId: f.productId, at: f.createdAt.toISOString() })),
        bnShops: bnShops.map(s => ({
            id: s.id, slug: s.slug, name: s.name, status: s.status,
            innNumber: s.innNumber, phone: s.phone, city: s.city,
        })),
        belisBookings: belisBookings.map(b => ({
            id: b.id, code: b.code, status: b.status,
            eventDate: b.eventDate.toISOString(),
            rentTotalUzs: b.rentTotalUzs, depositUzs: b.depositUzs,
        })),
        marketOrders: marketOrders.map(o => ({
            id: o.id, status: o.status, total: Number(o.total),
            at: o.createdAt.toISOString(),
            items: o.items.map(i => ({ productId: i.productId, qty: i.quantity, price: Number(i.price) })),
        })),
        marketReviews: marketReviews.map(r => ({
            id: r.id, productId: r.productId, rating: r.rating,
            text: r.text, at: r.createdAt.toISOString(),
        })),
        supportTickets: supportTickets.map(t => ({
            id: t.id, subject: t.subject, status: t.status,
            aiHandled: t.aiHandled, at: t.createdAt.toISOString(),
            messages: t.messages.map(m => ({ role: m.authorRole, body: m.body, at: m.createdAt.toISOString() })),
        })),
        nexusPosts: nexusPosts.map(p => ({
            id: p.id, text: p.text?.slice(0, 500),
            at: p.createdAt.toISOString(),
        })),
        summary: {
            loginEventCount: loginEvents.length,
            walletTxCount: walletTx.length,
            bnOrderCount: bnOrders.length,
            bnShopCount: bnShops.length,
            belisBookingCount: belisBookings.length,
            marketOrderCount: marketOrders.length,
            supportTicketCount: supportTickets.length,
            nexusPostCount: nexusPosts.length,
        },
    };

    // Achievement: GDPR eksport
    try {
        const { grantAchievement } = await import("@/lib/achievements");
        void grantAchievement(profile.id, "humo.data_export");
    } catch { /* skip */ }

    const filename = `humo-data-export-${profile.humoId || profile.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}
