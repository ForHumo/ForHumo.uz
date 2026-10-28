// YukGo — e'lonni saqlash (umumiy logika). Telegram webhook (bot) ham, userbot
// endpoint ham shuni chaqiradi. Parse → manba → dedup → YukListing.

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parseYukListing, type YukParsed } from "@/lib/yukgo-parse";
import { sameCity } from "@/lib/yukgo-cities";
import { pushNewCargo, normLang } from "@/lib/yukgo-i18n";

const DEDUP_WINDOW_MS = 48 * 60 * 60 * 1000;   // bir xil e'lon 48 soat ichida takrorlanmaydi
const RAW_WINDOW_MS = 48 * 60 * 60 * 1000;      // bir xil XOM matn 48s ichida — PRE-PARSE skip
const EXPIRE_MS = 48 * 60 * 60 * 1000;          // e'lon 48 soatdan keyin eskiradi
const RATE_WINDOW_MS = 60 * 1000;               // rate-cap oynasi: 1 daqiqa
const MAX_PARSE_PER_MIN = Number(process.env.YUKGO_MAX_PARSE_PER_MIN || 20); // manba/daqiqa Gemini shifti

// Normalizatsiya: kichik harf + bo'shliqlarni bittaga + trim → bir xil qayta-tashlashlar
// (whitespace/registr farqi bo'lsa ham) bir xil hash beradi.
function rawHashOf(text: string): string {
    const norm = text.toLowerCase().replace(/\s+/g, " ").trim();
    return crypto.createHash("sha256").update(norm).digest("hex");
}

export interface StoreInput {
    text: string;
    srcChatId?: string | null;    // Telegram guruh/kanal id (null = native, shaxsiy joylash)
    srcTitle?: string | null;
    srcUsername?: string | null;
    origMsgId?: number | string | null;   // havola + tgMessageId uchun
    rateKey?: string | null;               // shaxsiy DM throttle kaliti (dm:<chatId>) — srcChatId yo'q bo'lganда
}
export interface StoreResult {
    stored: boolean;
    reason: "ok" | "unparsable" | "duplicate" | "rate_limited";
    type?: "CARGO" | "TRUCK";
    route?: string;
}

export async function storeYukListing(input: StoreInput): Promise<StoreResult> {
    const text = (input.text || "").trim();
    if (text.length < 5) return { stored: false, reason: "unparsable" };

    // ── 1. PRE-PARSE dedup (Gemini'siz): bir xil xom matn 48s ichida → darhol skip.
    //    Bot e'lonni 10 soniyada qayta tashlasa — birinchisidan keyin hammasi tekin.
    const rawHash = rawHashOf(text);
    const rawDup = await prisma.yukListing.findFirst({
        where: { rawHash, createdAt: { gt: new Date(Date.now() - RAW_WINDOW_MS) } },
        select: { id: true, type: true },
    });
    if (rawDup) return { stored: false, reason: "duplicate", type: rawDup.type as "CARGO" | "TRUCK" };

    // ── 2. Manba upsert + rate-cap (Gemini'siz): manba daqiqasiga maks N tahlil.
    //    Evaziv spam (har safar matnni ozgina o'zgartiruvchi) ham shu shiftда cheklanadi.
    // Throttle kaliti: guruh/kanal (srcChatId) YOKI shaxsiy DM (rateKey = dm:<chatId>).
    // Ilgari DM'да srcChatId yo'q edi → Gemini cheklovsiz chaqirilardi (xarajat-DoS teshigi).
    let sourceId: string | null = null;
    const throttleKey = input.srcChatId ?? input.rateKey ?? null;
    const isRealSource = Boolean(input.srcChatId);   // faqat guruh/kanal e'longa biriktiriladi
    if (throttleKey) {
        const source = await prisma.yukSource.upsert({
            where: { tgChatId: throttleKey },
            update: isRealSource ? { title: input.srcTitle ?? undefined, username: input.srcUsername ?? undefined } : {},
            create: isRealSource
                ? { kind: "TELEGRAM", tgChatId: throttleKey, title: input.srcTitle ?? null, username: input.srcUsername ?? null }
                : { kind: "TELEGRAM", tgChatId: throttleKey, active: false },   // DM throttle qatori — statistikaga kirmaydi
            select: { id: true },
        });
        if (isRealSource) sourceId = source.id;
        // Atomik rate-cap (TOCTOU'siz): bir qancha parallel webhook endi shiftни chetlab o'tolmaydi.
        // 1) eskirgan/bo'sh oynani reset (count=1); 2) reset bo'lmasa — faqat shift ostida shartli increment.
        const nowMs = Date.now();
        const cutoff = new Date(nowMs - RATE_WINDOW_MS);
        const reset = await prisma.yukSource.updateMany({
            where: { id: source.id, OR: [{ parseWindowStart: null }, { parseWindowStart: { lt: cutoff } }] },
            data: { parseWindowStart: new Date(nowMs), parseWindowCount: 1 },
        });
        if (reset.count === 0) {
            const inc = await prisma.yukSource.updateMany({
                where: { id: source.id, parseWindowStart: { gte: cutoff }, parseWindowCount: { lt: MAX_PARSE_PER_MIN } },
                data: { parseWindowCount: { increment: 1 } },
            });
            if (inc.count === 0) return { stored: false, reason: "rate_limited" };   // shift to'ldi — Gemini chaqirilmaydi
        }
    }

    // ── 3. Parse (Gemini) — faqat noyob, flood-bo'lmagan matn shu yerga yetadi.
    const parsed = await parseYukListing(text);
    // Faqat haqiqiy yuk/mashina e'lonlari (LOGIST/OTHER/past-ishonch saqlanmaydi)
    if (!parsed || (parsed.type !== "CARGO" && parsed.type !== "TRUCK") || parsed.confidence < 0.5) {
        return { stored: false, reason: "unparsable" };
    }

    const origMsgId = input.origMsgId != null ? String(input.origMsgId) : null;
    const sourceLink = input.srcUsername && origMsgId ? `https://t.me/${input.srcUsername}/${origMsgId}` : null;

    // ── 4. Semantik dedup (route+phone+weight) — bir xil e'lon turli guruhда / boshqa so'z bilan
    const dedupKey = [
        parsed.type,
        (parsed.fromCity || "").toLowerCase().trim(),
        (parsed.toCity || "").toLowerCase().trim(),
        parsed.phones[0] || "",
        parsed.weightTons ?? "",
    ].join("|");
    // Faqat farqlovchi maydon (telefon YOKI vazn) bo'lsa semantik dedup bloklaydi.
    // Aks holda telefon/vazn aniqlanmagan ko'p xil yuk bitta kalitga ("CARGO|toshkent|moskva||")
    // yopishib, mashhur yo'nalishdagi real e'lonlar jim yo'qolardi — bunday holda faqat
    // rawHash (xuddi shu xom matn, 2-bosqich) takrorni ushlaydi.
    const hasDistinguisher = Boolean(parsed.phones[0] || parsed.weightTons != null);
    if (hasDistinguisher) {
        const dup = await prisma.yukListing.findFirst({
            where: { dedupKey, createdAt: { gt: new Date(Date.now() - DEDUP_WINDOW_MS) } },
            select: { id: true },
        });
        if (dup) return { stored: false, reason: "duplicate", type: parsed.type };
    }

    await prisma.yukListing.create({
        data: {
            type: parsed.type,
            status: "ACTIVE",
            sourceId,
            tgMessageId: origMsgId,
            sourceLink,
            fromText: parsed.fromText, fromCity: parsed.fromCity, fromCountry: parsed.fromCountry,
            toText: parsed.toText, toCity: parsed.toCity, toCountry: parsed.toCountry,
            cargo: parsed.cargo,
            weightTons: parsed.weightTons,
            truckTypes: parsed.truckTypes,
            quantityTrucks: parsed.quantityTrucks,
            priceAmount: parsed.price?.amount ?? null,
            priceCurrency: parsed.price?.currency ?? null,
            priceNegotiable: parsed.price?.negotiable ?? false,
            phones: parsed.phones,
            lang: parsed.lang,
            confidence: parsed.confidence,
            rawText: text.slice(0, 4000),
            rawHash,
            dedupKey,
            expiresAt: new Date(Date.now() + EXPIRE_MS),
        },
    });

    // Mos haydovchilarga darhol push (tezlik leveri) — fail-safe
    try { await matchAndNotify(parsed); } catch (e) { console.error("[yukgo-match]", e); }

    const route = [parsed.fromCity || parsed.fromText, parsed.toCity || parsed.toText].filter(Boolean).join(" → ");
    return { stored: true, reason: "ok", type: parsed.type, route };
}

// ── NATIVE joylash (foydalanuvchi saytда o'z e'lonini to'g'ridan joylaydi) ──
// Strukturalangan maydonlardan quriladi — Gemini CHAQIRILMAYDI (tekin + aniq).
// Rozilik bilan (o'z telefoni) → tasdiqlangan tier.
export interface NativeInput {
    type: "CARGO" | "TRUCK";
    fromCity?: string | null;
    toCity?: string | null;
    cargo?: string | null;
    weightTons?: number | null;
    truckTypes?: string[];
    priceAmount?: number | null;
    priceCurrency?: string | null;   // UZS/USD/RUB
    priceNegotiable?: boolean;
    phone: string;
}

export async function createNativeListing(
    input: NativeInput,
    profileId: string,
    opts?: { db?: Prisma.TransactionClient; skipNotify?: boolean },
): Promise<{ id: string }> {
    const db = opts?.db ?? prisma;
    const fromCity = (input.fromCity || "").trim() || null;
    const toCity = (input.toCity || "").trim() || null;
    const cargo = (input.cargo || "").trim() || null;
    const phone = (input.phone || "").replace(/[^\d+]/g, "").slice(0, 20);
    const weightTons = input.weightTons != null && isFinite(input.weightTons) ? input.weightTons : null;

    const dedupKey = [
        input.type, (fromCity || "").toLowerCase(), (toCity || "").toLowerCase(), phone, weightTons ?? "",
    ].join("|");
    const composed = [input.type, fromCity, toCity, cargo, weightTons, phone].filter(Boolean).join(" ");

    const listing = await db.yukListing.create({
        data: {
            type: input.type,
            status: "ACTIVE",
            sourceId: null,
            postedById: profileId,          // NATIVE marker
            fromText: fromCity, fromCity,
            toText: toCity, toCity,
            cargo,
            weightTons,
            truckTypes: input.truckTypes ?? [],
            priceAmount: input.priceAmount ?? null,
            priceCurrency: input.priceCurrency ?? null,
            priceNegotiable: !!input.priceNegotiable,
            phones: phone ? [phone] : [],
            lang: "uz",
            confidence: 1,                   // native = to'liq ishonch
            rawText: composed.slice(0, 4000),
            rawHash: rawHashOf(composed),
            dedupKey,
            expiresAt: new Date(Date.now() + EXPIRE_MS),
        },
        select: { id: true },
    });

    if (!opts?.skipNotify && input.type === "CARGO") {
        try {
            await matchAndNotify({ type: "CARGO", fromCity, toCity, weightTons, cargo } as unknown as YukParsed);
        } catch (e) { console.error("[yukgo-match-native]", e); }
    }
    return listing;
}

// Native CARGO uchun mos haydovchilarга push — tranzaksiyadan TASHQARIDA chaqiriladi (tarmoq side-effect).
export async function notifyNativeCargo(input: NativeInput) {
    if (input.type !== "CARGO") return;
    const fromCity = (input.fromCity || "").trim() || null;
    const toCity = (input.toCity || "").trim() || null;
    const cargo = (input.cargo || "").trim() || null;
    const weightTons = input.weightTons != null && isFinite(input.weightTons) ? input.weightTons : null;
    try {
        await matchAndNotify({ type: "CARGO", fromCity, toCity, weightTons, cargo } as unknown as YukParsed);
    } catch (e) { console.error("[yukgo-match-native]", e); }
}

// Yangi CARGO e'lon → yo'nalishi mos haydovchilarga Web Push.
async function matchAndNotify(p: YukParsed) {
    if (p.type !== "CARGO") return;   // truckerlar yuk qidiradi
    const lf = p.fromCity || "", lt = p.toCity || "";
    if (!lf || !lt) return;

    const drivers = await prisma.yukDriver.findMany({
        where: { notifyOnMatch: true, routeFromCity: { not: null }, routeToCity: { not: null } },
        select: { profileId: true, routeFromCity: true, routeToCity: true, capacityTons: true, lang: true },
        take: 1000,
    });
    const matched = drivers.filter(d => {
        if (!d.routeFromCity || !d.routeToCity) return false;
        // Shahar nomi lotin/kirill/ruscha farqli bo'lsa ham mos keladi (yukgo-cities)
        if (!sameCity(lf, d.routeFromCity) || !sameCity(lt, d.routeToCity)) return false;
        if (d.capacityTons != null && p.weightTons != null && d.capacityTons < p.weightTons) return false; // sig'maydi
        return true;
    });
    if (!matched.length) return;

    // Har haydovchiga O'Z tilida (uz/ru/en) push
    const { sendPushToProfile } = await import("@/lib/push");
    await Promise.all(matched.slice(0, 300).map(d => {
        const { title, body } = pushNewCargo(d.lang, p.fromCity || "", p.toCity || "", p.weightTons ?? null, p.cargo ?? null);
        return sendPushToProfile(d.profileId, { title, body, url: `/${normLang(d.lang)}/yukgo`, tag: "yukgo-match" }).catch(() => null);
    }));
}
