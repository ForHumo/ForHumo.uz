// BN Do'kon chat — xaridor va sotuvchi umumiy chat.
// Buyurtmasiz — pre-sale savollar uchun.
//
//   GET  /api/bn/shops/[slug]/chat        → xabar tarixi + o'qildi belgi
//   POST /api/bn/shops/[slug]/chat        body: { text, imageUrl? } — yangi xabar

import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { sendPushToProfile } from "@/lib/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_TEXT = 2000;
const RATE_MSG_10MIN = 30;   // spam oldini olish

async function findOrCreateChat(buyerId: string, shopId: string) {
    return prisma.bnShopChat.upsert({
        where: { buyerId_shopId: { buyerId, shopId } },
        create: { buyerId, shopId },
        update: {},
    });
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const { slug } = await ctx.params;
    const shop = await prisma.bnShop.findUnique({
        where: { slug },
        select: { id: true, profileId: true, name: true, logoUrl: true },
    });
    if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const isOwner = shop.profileId === auth.profileId;

    if (isOwner) {
        // Do'kon egasi — bu endpoint faqat buyerId bilan tanlangan chatni ochish uchun.
        // (Chatlar ro'yxati alohida endpoint bilan olinadi)
        const url = new URL(_req.url);
        const buyerId = url.searchParams.get("buyerId");
        if (!buyerId) {
            return NextResponse.json({ error: "buyerId_required_for_shop_owner" }, { status: 400 });
        }
        const chat = await prisma.bnShopChat.findUnique({
            where: { buyerId_shopId: { buyerId, shopId: shop.id } },
            select: { id: true },
        });
        if (!chat) return NextResponse.json({ messages: [], shop: { name: shop.name, logoUrl: shop.logoUrl } });

        const messages = await prisma.bnShopChatMessage.findMany({
            where: { chatId: chat.id },
            orderBy: { createdAt: "asc" },
            take: 200,
        });

        // O'qildi belgi
        await prisma.bnShopChat.update({
            where: { id: chat.id },
            data: { shopUnread: 0 },
        });
        await prisma.bnShopChatMessage.updateMany({
            where: { chatId: chat.id, fromShop: false, readAt: null },
            data: { readAt: new Date() },
        });

        return NextResponse.json({ messages, shop: { name: shop.name, logoUrl: shop.logoUrl } });
    }

    // Xaridor — o'z chatini oladi
    const chat = await findOrCreateChat(auth.profileId, shop.id);
    const messages = await prisma.bnShopChatMessage.findMany({
        where: { chatId: chat.id },
        orderBy: { createdAt: "asc" },
        take: 200,
    });

    // O'qildi
    await prisma.bnShopChat.update({
        where: { id: chat.id },
        data: { buyerUnread: 0 },
    });
    await prisma.bnShopChatMessage.updateMany({
        where: { chatId: chat.id, fromShop: true, readAt: null },
        data: { readAt: new Date() },
    });

    return NextResponse.json({
        messages,
        shop: { name: shop.name, logoUrl: shop.logoUrl },
    });
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const { slug } = await ctx.params;
    const shop = await prisma.bnShop.findUnique({
        where: { slug },
        select: { id: true, profileId: true, name: true },
    });
    if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : "";
    const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl.trim().slice(0, 500) : null;

    // Narx kelishuvi (savdolashuv) — strukturalangan xabar turlari
    const kindRaw = typeof body?.kind === "string" ? body.kind : "TEXT";
    const kind = (["TEXT", "OFFER", "COUNTER", "ACCEPT", "REJECT"] as const)
        .includes(kindRaw as never) ? kindRaw : "TEXT";
    const productId = typeof body?.productId === "string" ? body.productId : null;
    const offerAmountRaw = Number(body?.offerAmount);
    const offerAmount = Number.isFinite(offerAmountRaw) && offerAmountRaw > 0 ? Math.floor(offerAmountRaw) : null;
    const answersOfferId = typeof body?.answersOfferId === "string" ? body.answersOfferId : null;

    if (kind === "TEXT" && !text && !imageUrl) return NextResponse.json({ error: "empty" }, { status: 400 });
    if ((kind === "OFFER" || kind === "COUNTER") && (!offerAmount || !productId)) {
        return NextResponse.json({ error: "offer_amount_and_product_required" }, { status: 400 });
    }
    if ((kind === "ACCEPT" || kind === "REJECT") && !answersOfferId) {
        return NextResponse.json({ error: "answersOfferId_required" }, { status: 400 });
    }

    const isOwner = shop.profileId === auth.profileId;

    // Rate limit
    const since = new Date(Date.now() - 10 * 60 * 1000);
    const recent = await prisma.bnShopChatMessage.count({
        where: {
            fromShop: isOwner,
            createdAt: { gte: since },
            chat: isOwner ? { shopId: shop.id } : { buyerId: auth.profileId, shopId: shop.id },
        },
    });
    if (recent >= RATE_MSG_10MIN) {
        return NextResponse.json({ error: "rate_limit" }, { status: 429 });
    }

    // Egadan buyerId talab qilinadi (kim bilan chat)
    let chat;
    if (isOwner) {
        const buyerId = typeof body?.buyerId === "string" ? body.buyerId : null;
        if (!buyerId) return NextResponse.json({ error: "buyerId_required" }, { status: 400 });
        chat = await findOrCreateChat(buyerId, shop.id);
    } else {
        chat = await findOrCreateChat(auth.profileId, shop.id);
    }

    // OFFER/COUNTER — matn avto tayyorlanadi (agar bo'sh bo'lsa)
    let finalText = text;
    if ((kind === "OFFER" || kind === "COUNTER") && offerAmount && !finalText) {
        const price = offerAmount.toLocaleString("uz-UZ");
        finalText = kind === "OFFER"
            ? `Narx taklifi: ${price} so'm`
            : `Qarshi taklif: ${price} so'm`;
    }
    if (kind === "ACCEPT" && !finalText) finalText = "Taklifni qabul qildim";
    if (kind === "REJECT" && !finalText) finalText = "Taklifni rad etdim";

    // ACCEPT/REJECT — oldingi taklifga javob → oldingisining offerStatus'ini yangilash
    if ((kind === "ACCEPT" || kind === "REJECT") && answersOfferId) {
        await prisma.bnShopChatMessage.updateMany({
            where: { id: answersOfferId, chatId: chat.id, offerStatus: "PENDING" },
            data: { offerStatus: kind === "ACCEPT" ? "ACCEPTED" : "REJECTED" },
        });
    }
    // COUNTER — oldingi taklifni COUNTERED deb belgilash
    if (kind === "COUNTER" && answersOfferId) {
        await prisma.bnShopChatMessage.updateMany({
            where: { id: answersOfferId, chatId: chat.id, offerStatus: "PENDING" },
            data: { offerStatus: "COUNTERED" },
        });
    }

    const msg = await prisma.bnShopChatMessage.create({
        data: {
            chatId: chat.id,
            fromShop: isOwner,
            text: finalText,
            imageUrl,
            kind,
            productId: (kind === "OFFER" || kind === "COUNTER") ? productId : null,
            offerAmount: (kind === "OFFER" || kind === "COUNTER") ? offerAmount : null,
            offerStatus: (kind === "OFFER" || kind === "COUNTER") ? "PENDING" : null,
        },
    });

    // Unread + lastAt yangilash
    await prisma.bnShopChat.update({
        where: { id: chat.id },
        data: isOwner
            ? { buyerUnread: { increment: 1 } }
            : { shopUnread: { increment: 1 } },
    });

    // Push qarshi tomonga (fail-safe)
    after(async () => {
        try {
            const recipientId = isOwner ? chat.buyerId : shop.profileId;
            const senderLabel = isOwner ? shop.name : "Mijoz";
            let pushTitle = `${senderLabel}: yangi xabar`;
            if (kind === "OFFER")   pushTitle = `${senderLabel}: narx taklif qildi`;
            if (kind === "COUNTER") pushTitle = `${senderLabel}: qarshi taklif berdi`;
            if (kind === "ACCEPT")  pushTitle = `${senderLabel}: taklifni qabul qildi`;
            if (kind === "REJECT")  pushTitle = `${senderLabel}: taklifni rad etdi`;
            await sendPushToProfile(recipientId, {
                title: pushTitle,
                body: finalText ? finalText.slice(0, 100) : "Rasm yubordi",
                url: isOwner
                    ? `https://bozornarxida.uz/d/${slug}?chat=1`
                    : `https://bozornarxida.uz/kabinet?tab=chats&shop=${slug}`,
                tag: `bn-shop-chat:${chat.id}`,
            });
        } catch (e) { console.error("[bn shop-chat push]", e); }
    });

    return NextResponse.json({ ok: true, message: msg });
}
