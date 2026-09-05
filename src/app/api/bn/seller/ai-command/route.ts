// Sotuvchi tabiiy tilda buyruq beradi — AI parser tushunadi va bajaradi.
// Masalan:
//   "eng kam sotilgan 10 ta mahsulotga 20% chegirma qo'y"
//   "sotilmagan mahsulotlarga 15% chegirma"
//   "eng ko'p sotilgan 5 ta mahsulotdan chegirmani olib tashla"
//   "chegirmalarni bekor qil"
//
//   POST /api/bn/seller/ai-command  { text }
//
// Xavfsizlik: har amal do'kon egaligi bilan cheklangan; AI hech qachon o'chirmaydi,
// faqat chegirma yoki narx o'zgartiradi (destructive amal yo'q).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { aiAvailable, aiJSON } from "@/lib/ai";
import { belisRate } from "@/lib/belis-rate";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_TEXT = 500;

interface AiAction {
    type: "bulk_discount" | "remove_discount" | "explain" | "unknown";
    // Product selection
    target?: "top_sold" | "low_sold" | "unsold" | "all_active" | "specific";
    limit?: number;                       // masalan top 10
    // Bulk discount uchun
    pct?: number;                         // 3..70
    // Tushuntirish (foydalanuvchiga)
    message: string;                      // uz — javob matn
    // Xavfsizlik: agar shubhali bo'lsa, tasdiq talab qiladi
    needsConfirm?: boolean;
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    if (!aiAvailable()) {
        return NextResponse.json({ error: "ai_unavailable", message: "AI hozir mavjud emas" }, { status: 503 });
    }

    // Rate limit
    try {
        const rate = await belisRate(auth.profileId, "aiChat");
        if (rate.limited) {
            return NextResponse.json({
                error: "rate_limited",
                message: `Kuniga ${rate.max} AI so'rov chegarasi. Ertaga qaytadan urinib ko'ring.`,
            }, { status: 429 });
        }
    } catch { /* fail-open */ }

    const shop = await prisma.bnShop.findFirst({
        where: { profileId: auth.profileId },
        select: { id: true, name: true, status: true },
    });
    if (!shop || shop.status !== "APPROVED") {
        return NextResponse.json({ error: "no_shop" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim().slice(0, MAX_TEXT);
    if (!text) return NextResponse.json({ error: "text_required" }, { status: 400 });
    const confirm = body?.confirm === true;

    // AI parse — buyruqni JSON action'ga aylantiramiz
    const action = await aiJSON<AiAction>(
`Sen O'zbekistondagi Bozor Narxida marketpleysida sotuvchi paneli AI yordamchisisan.
Sotuvchi tabiiy o'zbek tilida buyruq beradi. Sen uni JSON action'ga aylantirasan.

Sotuvchi buyrug'i: "${text}"

Mavjud actionlar:
1. bulk_discount — bir nechta mahsulotga chegirma qo'yish
   Kerak: target (top_sold | low_sold | unsold | all_active), limit (raqam, default 10), pct (chegirma foizi 3-70)
2. remove_discount — chegirmani olib tashlash
   Kerak: target
3. explain — sotuvchi savol berdi, chegirma yo'q — tushuntirish beriladi (message'da)
4. unknown — tushunmadingiz, oydinlashtirish so'rang

Xavfsizlik qoidalari:
- Agar buyruq muhim/xavfli bo'lsa (chegirma > 40%, target = all_active) → needsConfirm: true
- pct 3-70 orasida bo'lishi shart
- Chegirma > 50% yoki all_active bo'lsa needsConfirm majburiy
- limit maks 100

JSON qaytar (tamomlangan):
{
  "type": "bulk_discount|remove_discount|explain|unknown",
  "target": "top_sold|low_sold|unsold|all_active",
  "limit": 10,
  "pct": 20,
  "message": "sotuvchiga aniq javob (uz) — nima qilinishini tushuntir",
  "needsConfirm": true|false
}`,
        { temperature: 0.3 },
    );

    if (!action || action.type === "unknown") {
        return NextResponse.json({
            ok: true,
            type: "unknown",
            message: action?.message || "Tushunmadim. Masalan: \"eng kam sotilgan 10 ta mahsulotga 20% chegirma qo'y\"",
        });
    }

    // Tushuntiruvchi buyruq — action yo'q
    if (action.type === "explain") {
        return NextResponse.json({ ok: true, type: "explain", message: action.message });
    }

    // Confirm talab qilinsa va foydalanuvchi tasdiqlamagan bo'lsa
    if (action.needsConfirm && !confirm) {
        return NextResponse.json({
            ok: true,
            type: "needs_confirm",
            message: action.message,
            plannedAction: action,
        });
    }

    // Bajarish
    if (action.type === "bulk_discount" || action.type === "remove_discount") {
        const target = action.target;
        if (!target) {
            return NextResponse.json({ ok: true, type: "unknown", message: "Qaysi mahsulotlarga? (eng ko'p sotilgan, eng kam, sotilmagan, barcha)" });
        }

        // Product ID'larni yig'ish
        const limit = Math.min(100, Math.max(1, action.limit || 10));
        const productIds = await selectProductIds(shop.id, target, limit);
        if (productIds.length === 0) {
            return NextResponse.json({
                ok: true,
                type: "empty",
                message: "Bu mezonga mos mahsulot topilmadi.",
            });
        }

        if (action.type === "bulk_discount") {
            const pct = Math.min(70, Math.max(3, action.pct || 15));
            const products = await prisma.bnProduct.findMany({
                where: { id: { in: productIds } },
                select: { id: true, price: true, oldPrice: true },
            });
            let changed = 0;
            for (const p of products) {
                const original = p.oldPrice && p.oldPrice > p.price ? p.oldPrice : p.price;
                const newPrice = Math.round(original * (1 - pct / 100) / 100) * 100;
                if (newPrice < 100 || newPrice >= p.price) continue;
                await prisma.bnProduct.update({
                    where: { id: p.id }, data: { price: newPrice, oldPrice: original },
                });
                changed++;
            }
            return NextResponse.json({
                ok: true, type: "done",
                message: `${changed} ta mahsulotga ${pct}% chegirma qo'yildi.`,
                changed, pct, target,
            });
        }

        // remove_discount
        const products = await prisma.bnProduct.findMany({
            where: { id: { in: productIds } },
            select: { id: true, price: true, oldPrice: true },
        });
        let restored = 0;
        for (const p of products) {
            if (!p.oldPrice || p.oldPrice <= p.price) continue;
            await prisma.bnProduct.update({
                where: { id: p.id }, data: { price: p.oldPrice, oldPrice: null },
            });
            restored++;
        }
        return NextResponse.json({
            ok: true, type: "done",
            message: `${restored} ta mahsulotdan chegirma olib tashlandi.`,
            changed: restored, target,
        });
    }

    return NextResponse.json({ ok: true, type: "unknown", message: "Buyruq bajarilmadi." });
}

/** Buyruqning target'i bo'yicha mahsulot ID'larni tanlash */
async function selectProductIds(shopId: string, target: string, limit: number): Promise<string[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    if (target === "all_active") {
        const rows = await prisma.bnProduct.findMany({
            where: { shopId, isActive: true, hidden: false },
            select: { id: true }, take: limit,
        });
        return rows.map(r => r.id);
    }
    if (target === "unsold") {
        const items = await prisma.bnOrderItem.findMany({
            where: {
                order: { shopId, status: "COMPLETED", completedAt: { gt: thirtyDaysAgo } },
            },
            select: { productId: true },
            distinct: ["productId"],
        });
        const soldIds = new Set(items.map(i => i.productId));
        const rows = await prisma.bnProduct.findMany({
            where: {
                shopId, isActive: true, hidden: false,
                id: { notIn: [...soldIds].length > 0 ? [...soldIds] : ["_none_"] },
            },
            select: { id: true }, take: limit,
            orderBy: { createdAt: "asc" },
        });
        return rows.map(r => r.id);
    }
    // top_sold / low_sold — 30 kunlik agregat
    const items = await prisma.bnOrderItem.findMany({
        where: {
            order: { shopId, status: "COMPLETED", completedAt: { gt: thirtyDaysAgo } },
        },
        select: { productId: true, qty: true },
    });
    const soldMap = new Map<string, number>();
    for (const it of items) soldMap.set(it.productId, (soldMap.get(it.productId) || 0) + it.qty);
    const sorted = [...soldMap.entries()].sort((a, b) => target === "top_sold" ? b[1] - a[1] : a[1] - b[1]);
    return sorted.slice(0, limit).map(([id]) => id);
}
