// BN kunlik cron — faol mahsulotlarni qayta AI moderatsiyadan o'tkazadi.
// Sotuvchilar birinchi tekshiruvdan o'tib, keyin taqiqlangan mahsulotga
// almashtirishga urinishi mumkin (title/opis/image edit). Har kuni
// tekshirib, taqiqlangan bo'lsa avto-yashirish + ModerationFlag yozish.

import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { moderateBnProduct } from "@/lib/bn-moderation";
// hideTarget imported for direct hiding; we use bnProduct.update below

const MAX_PRODUCTS_PER_RUN = 300; // Kunlik chegara — Gemini quota'ni tejash
const LOOKBACK_HOURS = 30;         // Oxirgi 30 soatda yangilangan yoki hech qachon re-check qilinmagan

export async function GET(req: Request) {
    // Vercel Cron avto Bearer token bilan chaqiradi; kunga bir marta
    const authHeader = req.headers.get("authorization") ?? "";
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const since = new Date(Date.now() - LOOKBACK_HOURS * 3600_000);

    const products = await prisma.bnProduct.findMany({
        where: {
            isActive: true, hidden: false,
            updatedAt: { gte: since },
            shop: { status: "APPROVED" },
        },
        select: { id: true, title: true, description: true, images: true, shop: { select: { profileId: true } } },
        take: MAX_PRODUCTS_PER_RUN,
        orderBy: { updatedAt: "desc" },
    });

    let checked = 0;
    let blocked = 0;
    let review = 0;

    // Fon rejimida ishga tushirib javob beramiz (Vercel cron 60s limit bor)
    after(async () => {
        for (const p of products) {
            const res = await moderateBnProduct({
                title: p.title,
                description: p.description,
                imageUrl: p.images?.[0] ?? null,
            });
            checked++;
            if (!res) continue;
            // Auto-hide faqat yuqori ishonch bilan: kalit-so'z BLOCK yoki AI severity >= 0.85
            const shouldAutoHide = res.verdict === "BLOCK" && (!!res.keywordHit || res.severity >= 0.85);
            if (shouldAutoHide) {
                await prisma.bnProduct.update({
                    where: { id: p.id },
                    data: { isActive: false, hidden: true },
                });
                await prisma.moderationFlag.upsert({
                    where: { module_targetType_targetId: { module: "BN", targetType: "BN_PRODUCT", targetId: p.id } },
                    update: { aiVerdict: "BLOCK", aiSeverity: res.severity, aiReason: res.reason || "Cron re-check", status: "AUTO_HIDDEN" },
                    create: {
                        module: "BN", targetType: "BN_PRODUCT", targetId: p.id,
                        aiVerdict: "BLOCK", aiSeverity: res.severity, aiReason: res.reason || "Cron re-check",
                        status: "AUTO_HIDDEN",
                    },
                });
                blocked++;
            } else if (res.verdict === "REVIEW" || res.verdict === "BLOCK") {
                // BLOCK past ishonch bilan ham REVIEW navbatiga tushadi (admin qaror qiladi)
                await prisma.moderationFlag.upsert({
                    where: { module_targetType_targetId: { module: "BN", targetType: "BN_PRODUCT", targetId: p.id } },
                    update: { aiVerdict: "REVIEW", aiSeverity: res.severity, aiReason: res.reason || "Cron re-check" },
                    create: {
                        module: "BN", targetType: "BN_PRODUCT", targetId: p.id,
                        aiVerdict: "REVIEW", aiSeverity: res.severity, aiReason: res.reason || "Cron re-check",
                        status: "PENDING",
                    },
                });
                review++;
            }
        }
        // eslint-disable-next-line no-console
        console.log(`[bn-moderation-recheck] checked=${checked} blocked=${blocked} review=${review}`);
    });

    return NextResponse.json({ ok: true, scheduled: products.length });
}
