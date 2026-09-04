// BN sotuvchi kunlik AI tavsiya cron.
// Har APPROVED do'kon uchun kunda bir marta 3-5 aniq tavsiya generatsiya qilinadi:
//   - Zaxira tugayotgan mahsulotlar
//   - Sotilmagan (chegirma/rasm yangilash)
//   - Kam ko'rilgan (SEO/tavsif)
//   - Bozor bo'yicha yangi kategoriya
//   - Umumiy holat baholash
//
// Natija BnSellerInsight'ga yoziladi + push (agar obuna bor bo'lsa).
// Rate: max 200 do'kon/kun (Gemini xarajati).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiAvailable, aiJSON } from "@/lib/ai";
import { sendPushToProfile } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_SHOPS_PER_DAY = 200;
const ACTIVE_DAYS = 30;

interface InsightItem {
    type: "RESTOCK" | "DISCOUNT" | "PRICE" | "NEW_CATEGORY" | "ROTATE" | "SEO" | "GENERAL";
    title: string;
    body: string;
    productId?: string;
    action?: string;
    actionUrl?: string;
}
interface GenResp {
    aiSummary: string;
    items: InsightItem[];
}

export async function GET(req: Request) {
    const auth = req.headers.get("authorization");
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const started = Date.now();
    const activeSince = new Date(Date.now() - ACTIVE_DAYS * 24 * 60 * 60 * 1000);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Aktiv do'konlar (oxirgi 30 kunda buyurtma yoki mahsulot yaratgan)
    const shops = await prisma.bnShop.findMany({
        where: {
            status: "APPROVED",
            OR: [
                { updatedAt: { gt: activeSince } },
                { products: { some: { updatedAt: { gt: activeSince } } } },
                { orders: { some: { placedAt: { gt: activeSince } } } },
            ],
        },
        select: { id: true, profileId: true, name: true },
        take: MAX_SHOPS_PER_DAY,
    });

    let processed = 0, skipped = 0, pushed = 0, failed = 0;

    for (const shop of shops) {
        try {
            // Bugun uchun tavsiya allaqachon bormi?
            const already = await prisma.bnSellerInsight.findFirst({
                where: { shopId: shop.id, createdAt: { gte: todayStart } },
                select: { id: true },
            });
            if (already) { skipped++; continue; }

            // 30 kunlik agregatsiya
            const [items, unsoldRaw, lowStock, productCount, monthOrders] = await Promise.all([
                prisma.bnOrderItem.findMany({
                    where: { order: { shopId: shop.id, status: "COMPLETED", completedAt: { gt: thirtyDaysAgo } } },
                    select: { productId: true, qty: true, price: true, title: true },
                }),
                prisma.bnProduct.findMany({
                    where: {
                        shopId: shop.id, isActive: true, hidden: false,
                        createdAt: { lt: thirtyDaysAgo },
                    },
                    select: { id: true, title: true, price: true, stock: true, views: true, createdAt: true },
                    take: 20,
                    orderBy: { createdAt: "asc" },
                }),
                prisma.bnProduct.findMany({
                    where: { shopId: shop.id, isActive: true, hidden: false, stock: { lte: 3, gt: 0 } },
                    select: { id: true, title: true, stock: true, sold: true },
                    take: 15,
                    orderBy: { sold: "desc" },
                }),
                prisma.bnProduct.count({ where: { shopId: shop.id, isActive: true, hidden: false } }),
                prisma.bnOrder.count({ where: { shopId: shop.id, placedAt: { gt: thirtyDaysAgo } } }),
            ]);

            // Product-level aggregation
            const productMap = new Map<string, { title: string; qty: number; revenue: number }>();
            for (const it of items) {
                const p = productMap.get(it.productId) || { title: it.title, qty: 0, revenue: 0 };
                p.qty += it.qty;
                p.revenue += it.price * it.qty;
                productMap.set(it.productId, p);
            }
            const soldIds = new Set(productMap.keys());
            const unsoldStale = unsoldRaw.filter(p => !soldIds.has(p.id));

            // Ma'lumot hech bo'lmasa signal bermayotgan bo'lsa — o'tkazib yubor
            if (productCount === 0 && monthOrders === 0) { skipped++; continue; }

            const topSold = [...productMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
            const contextForAI = `
Do'kon: ${shop.name}
Aktiv mahsulotlar: ${productCount}
30 kunlik buyurtma: ${monthOrders}
30 kunlik jami sotilgan dona: ${items.reduce((s, i) => s + i.qty, 0)}
Zaxira kam (<=3): ${lowStock.length} mahsulot ${lowStock.slice(0, 5).map(p => `[${p.title} — ${p.stock} qoldi, oldin ${p.sold} sotilgan]`).join(", ")}
Sotilmagan (30+ kun eski): ${unsoldStale.length} mahsulot ${unsoldStale.slice(0, 5).map(p => `[${p.title} — ${p.views} ko'rildi, ${p.price} so'm]`).join(", ")}
Eng sotilgan: ${topSold.slice(0, 3).map(t => `${t.title} — ${t.qty} dona`).join("; ") || "yo'q"}
            `.trim();

            let gen: GenResp | null = null;
            if (aiAvailable()) {
                try {
                    gen = await aiJSON<GenResp>(
`Sen O'zbekistondagi Bozor Narxida marketpleysining kichik do'kondori uchun kunlik tavsiyachisan.
Do'kon holati:
${contextForAI}

Vazifang: bu do'kondorga bugun qilishi kerak bo'lgan 3-5 ta ANIQ, AMALIY tavsiya ber.
Har bir tavsiya:
- Aniq mahsulot yoki holatga bog'liq bo'lsin (agar bilsang)
- Foydalanuvchi tushunadigan sodda tilda, o'zbek tilida
- Buyruq shaklida: "X mahsulot zaxirasini to'ldiring", "Y ga 10% chegirma bering"
- Sabab qisqacha (masalan: "chunki eng ko'p sotilgan mahsulotingiz")

JSON qaytar: {
  "aiSummary": "umumiy holat 1 gap (uz)",
  "items": [
    { "type": "RESTOCK|DISCOUNT|PRICE|NEW_CATEGORY|ROTATE|SEO|GENERAL",
      "title": "asosiy tavsiya (uz, 6-14 so'z)",
      "body": "izoh nima uchun (uz, 8-20 so'z)"
    }
  ]
}`,
                        { temperature: 0.6 },
                    );
                } catch (e) {
                    console.error("bn-seller-insights AI failed for shop", shop.id, e);
                }
            }

            // Fail-safe: AI ishlamasa deterministik tavsiyalar
            if (!gen || !gen.items || gen.items.length === 0) {
                const fallback: InsightItem[] = [];
                if (lowStock.length > 0) {
                    fallback.push({
                        type: "RESTOCK",
                        title: `${lowStock[0].title} zaxirasini to'ldiring`,
                        body: `Faqat ${lowStock[0].stock} dona qoldi, oldin ${lowStock[0].sold} dona sotilgan`,
                    });
                }
                if (unsoldStale.length > 0) {
                    fallback.push({
                        type: "DISCOUNT",
                        title: `${unsoldStale.length} ta mahsulot 30+ kun sotilmadi`,
                        body: "Chegirma qiling yoki rasm/nomni yangilang — harakat kerak",
                    });
                }
                if (productCount === 0) {
                    fallback.push({
                        type: "GENERAL",
                        title: "Do'koningizga birinchi mahsulotni qo'shing",
                        body: "Katalogda mahsulot yo'q — xaridor sizni topa olmaydi",
                    });
                }
                if (fallback.length === 0) {
                    fallback.push({
                        type: "GENERAL",
                        title: "Bugun barcha ko'rsatkichlar yaxshi",
                        body: "Do'koningiz normal ishlayapti — davom eting",
                    });
                }
                gen = {
                    aiSummary: monthOrders > 0 ? `Oxirgi 30 kunda ${monthOrders} buyurtma` : "Do'kon aktivligini oshirishga vaqt",
                    items: fallback,
                };
            }

            // items maxsus productId biriktirish (agar title mos kelsa)
            const items3to5 = gen.items.slice(0, 5).map(it => {
                const matchProd = [...lowStock, ...unsoldStale].find(p =>
                    it.title.toLowerCase().includes(p.title.toLowerCase().slice(0, 20))
                );
                if (matchProd) {
                    return { ...it, productId: matchProd.id, actionUrl: `/kabinet` };
                }
                return it;
            });

            // DB'ga yozish
            const insight = await prisma.bnSellerInsight.create({
                data: {
                    shopId: shop.id,
                    profileId: shop.profileId,
                    aiSummary: gen.aiSummary.slice(0, 200),
                    // Prisma Json type — cast talab qiladi
                    items: items3to5 as unknown as object,
                    pushed: false,
                },
            });

            // Push yuborish (obuna bo'lsa)
            try {
                const hasSub = await prisma.nexusPushSub.count({ where: { profileId: shop.profileId } });
                if (hasSub > 0) {
                    await sendPushToProfile(shop.profileId, {
                        title: `${shop.name} — bugungi AI tavsiya`,
                        body: items3to5[0]?.title || gen.aiSummary,
                        url: `https://bozornarxida.uz/sotuvchi/tahlil`,
                        tag: `bn-seller-insight-${shop.id}`,
                    });
                    await prisma.bnSellerInsight.update({
                        where: { id: insight.id }, data: { pushed: true },
                    });
                    pushed++;
                }
            } catch { /* push xatoligini yutamiz */ }

            processed++;
        } catch (e) {
            console.error("bn-seller-insights shop failed", shop.id, e);
            failed++;
        }
    }

    return NextResponse.json({
        ok: true,
        processed, skipped, pushed, failed,
        totalShops: shops.length,
        tookMs: Date.now() - started,
    });
}
