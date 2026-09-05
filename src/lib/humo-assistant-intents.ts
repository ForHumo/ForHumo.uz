// Universal AI Assistant — intent handlers.
// Har intent bir modul ma'lumotini yig'ib, natural language javob tayyorlaydi.
// Endpoint uni chaqirib javobga qo'shadi (yoki AI'ga context sifatida yuboradi).

import { prisma } from "@/lib/prisma";

export type IntentType =
    | "balance"           // hamyon balansi
    | "bn_orders"         // BN buyurtmalarim (holat + so'nggilar)
    | "belis_bookings"    // Belis rezervlarim
    | "market_orders"     // Market buyurtmalarim
    | "spending"          // Bu oy sarflaganlar
    | "nexus_summary"     // Nexus DM/notif holati
    | "support_status"    // Support tiketlar holati
    | "seller_stats"      // BN sotuvchi bo'lsa - bu oy tushum
    | "favorites"         // Sevimlilar holati (chegirmadagilar)
    | "activity"          // So'nggi aktivlik
    | "help"              // umumiy yordam / boshqa
    | "unknown";

export interface IntentContext {
    profileId: string;
    intent: IntentType;
    /** Ixtiyoriy args: masalan { status: "COMPLETED", limit: 10 } */
    args?: Record<string, string | number | boolean | null>;
}

/**
 * Intent bo'yicha kontekstni yig'ib qaytaradi.
 * Barcha ma'lumot user'ning o'zi haqida (profileId bilan filtrlangan).
 */
export async function fetchIntentContext(c: IntentContext): Promise<string> {
    const { profileId, intent } = c;
    try {
        switch (intent) {
            case "balance": {
                const w = await prisma.wallet.findUnique({
                    where: { profileId },
                    select: { balance: true, currency: true },
                });
                const b = Number(w?.balance ?? 0);
                return `Balans: ${b.toLocaleString("uz-UZ")} ${w?.currency ?? "so'm"}.`;
            }

            case "bn_orders": {
                const rows = await prisma.bnOrder.findMany({
                    where: { buyerId: profileId },
                    orderBy: { placedAt: "desc" },
                    take: 10,
                    select: {
                        code: true, status: true, total: true, placedAt: true,
                        shop: { select: { name: true } },
                    },
                });
                if (rows.length === 0) return "BN'da hozircha buyurtma yo'q.";
                const active = rows.filter(r => ["PLACED", "CONFIRMED", "READY"].includes(r.status));
                const activeStr = active.length > 0
                    ? active.map(r => `${r.code} (${r.status}, ${r.total.toLocaleString("uz-UZ")} so'm, ${r.shop?.name ?? "—"})`).join("; ")
                    : "aktiv buyurtma yo'q";
                return `BN buyurtmalar: jami ${rows.length} ta so'nggi. Aktiv: ${activeStr}`;
            }

            case "belis_bookings": {
                const rows = await prisma.belisRentalBooking.findMany({
                    where: { buyerId: profileId },
                    orderBy: { createdAt: "desc" },
                    take: 5,
                    include: {
                        komplekt: { select: { nameUz: true } },
                    },
                }).catch(() => [] as Array<{ code: string; status: string; eventDate: Date; rentTotalUzs: number; komplekt: { nameUz: string } | null }>);
                if (rows.length === 0) return "Belis'da rezerv yo'q.";
                const active = rows.filter(r => ["REQUESTED", "CONFIRMED", "PICKED_UP"].includes(r.status));
                const lines = active.slice(0, 3).map(r =>
                    `${r.code}: ${r.status}, ${r.komplekt?.nameUz ?? "—"}, sana ${r.eventDate.toISOString().slice(0, 10)}, ${r.rentTotalUzs.toLocaleString("uz-UZ")} so'm`,
                );
                return `Belis rezervlar: aktiv ${active.length} ta. ${lines.join("; ")}`;
            }

            case "market_orders": {
                const rows = await prisma.marketOrder.findMany({
                    where: { profileId },
                    orderBy: { createdAt: "desc" },
                    take: 5,
                    select: { id: true, status: true, total: true, currency: true, createdAt: true },
                }).catch(() => []);
                if (rows.length === 0) return "Market'da buyurtma yo'q.";
                return `Market buyurtmalar: jami ${rows.length} so'nggi. Oxirgisi: ${rows[0].status}, ${Number(rows[0].total).toLocaleString("uz-UZ")} ${rows[0].currency}.`;
            }

            case "spending": {
                const now = new Date();
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const [bn, belis] = await Promise.all([
                    prisma.bnOrder.aggregate({
                        where: {
                            buyerId: profileId,
                            placedAt: { gte: monthStart },
                            status: { in: ["COMPLETED", "READY", "CONFIRMED", "PLACED"] },
                        },
                        _sum: { total: true },
                    }),
                    prisma.belisRentalBooking.aggregate({
                        where: {
                            buyerId: profileId, createdAt: { gte: monthStart },
                            status: { in: ["CONFIRMED", "PICKED_UP", "RETURNED_OK", "RETURNED_DAMAGE"] },
                        },
                        _sum: { rentTotalUzs: true },
                    }).catch(() => ({ _sum: { rentTotalUzs: 0 } })),
                ]);
                const bnT = bn._sum.total ?? 0;
                const belT = belis._sum.rentTotalUzs ?? 0;
                const total = bnT + belT;
                return `Bu oy sarflagan: jami ${total.toLocaleString("uz-UZ")} so'm. BN: ${bnT.toLocaleString("uz-UZ")}; Belis: ${belT.toLocaleString("uz-UZ")}.`;
            }

            case "nexus_summary": {
                const [unreadDm, unreadNotif] = await Promise.all([
                    prisma.nexusConversation.count({
                        where: {
                            OR: [
                                { user1Id: profileId, user1ReadAt: null },
                                { user2Id: profileId, user2ReadAt: null },
                            ],
                            lastSenderId: { not: profileId },
                        },
                    }).catch(() => 0),
                    prisma.nexusNotification.count({
                        where: { recipientId: profileId, read: false },
                    }).catch(() => 0),
                ]);
                return `Nexus: ${unreadDm} o'qilmagan DM, ${unreadNotif} yangi bildirishnoma.`;
            }

            case "support_status": {
                const rows = await prisma.supportTicket.findMany({
                    where: { profileId },
                    orderBy: { updatedAt: "desc" },
                    take: 5,
                    select: { id: true, subject: true, status: true, aiHandled: true, escalated: true, updatedAt: true },
                });
                if (rows.length === 0) return "Support tiketlar yo'q.";
                const open = rows.filter(r => ["open", "pending"].includes(r.status));
                return `Support: jami ${rows.length} so'nggi, ochiq ${open.length} ta. Oxirgisi: "${rows[0].subject}" (${rows[0].status}${rows[0].aiHandled ? ", AI javob berdi" : ""}${rows[0].escalated ? ", inson eskalatsiya" : ""}).`;
            }

            case "seller_stats": {
                const shop = await prisma.bnShop.findFirst({
                    where: { profileId, status: "APPROVED" },
                    select: { id: true, name: true },
                });
                if (!shop) return "Sizda BN'da tasdiqlangan do'kon yo'q.";
                const now = new Date();
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const [agg, activeOrders, insight] = await Promise.all([
                    prisma.bnOrder.aggregate({
                        where: { shopId: shop.id, status: "COMPLETED", completedAt: { gte: monthStart } },
                        _sum: { total: true, commission: true },
                        _count: { _all: true },
                    }),
                    prisma.bnOrder.count({
                        where: { shopId: shop.id, status: { in: ["PLACED", "CONFIRMED", "READY"] } },
                    }),
                    prisma.bnSellerInsight.findFirst({
                        where: { shopId: shop.id }, orderBy: { createdAt: "desc" },
                        select: { seenAt: true, aiSummary: true },
                    }),
                ]);
                const rev = (agg._sum.total ?? 0) - (agg._sum.commission ?? 0);
                return `Sotuvchi "${shop.name}": bu oy tushum ${rev.toLocaleString("uz-UZ")} so'm, ${agg._count._all} buyurtma tugatilgan, ${activeOrders} aktiv. AI tavsiya: ${insight?.aiSummary ?? "yo'q"}${insight && !insight.seenAt ? " (ko'rilmagan)" : ""}.`;
            }

            case "favorites": {
                const favIds = await prisma.bnFavorite.findMany({
                    where: { profileId }, select: { productId: true }, take: 30,
                });
                if (favIds.length === 0) return "Sevimlilaringiz yo'q.";
                const products = await prisma.bnProduct.findMany({
                    where: { id: { in: favIds.map(f => f.productId) } },
                    select: { title: true, price: true, oldPrice: true, marketAvgPrice: true },
                });
                const deals = products.filter(p =>
                    (p.oldPrice && p.oldPrice > p.price) ||
                    (p.marketAvgPrice && p.marketAvgPrice > 0 && p.price < p.marketAvgPrice * 0.9)
                );
                return `Sevimlilar: jami ${products.length} ta. Chegirmada/arzon: ${deals.length} ta ${deals.length > 0 ? "(" + deals.slice(0, 3).map(d => d.title).join(", ") + ")" : ""}.`;
            }

            case "activity": {
                const [bnCount, belisCount, supCount] = await Promise.all([
                    prisma.bnOrder.count({ where: { buyerId: profileId, placedAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
                    prisma.belisRentalBooking.count({ where: { buyerId: profileId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }).catch(() => 0),
                    prisma.supportTicket.count({ where: { profileId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
                ]);
                return `Oxirgi 7 kun: BN ${bnCount} buyurtma, Belis ${belisCount} rezerv, Support ${supCount} tiket.`;
            }

            default:
                return "";
        }
    } catch (e) {
        console.error("fetchIntentContext failed", intent, e);
        return "";
    }
}
