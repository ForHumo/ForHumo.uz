// YukGo — Telegram yuk e'lonlarini toza strukturaga ajratish (Gemini).
// Yuqori hajmli (ingest webhook har xabarda chaqiradi) — shuning uchun ARZON pinned model.
// Sinovdan o'tgan: gemini-2.5-flash-lite messy uz/ru e'lonlarni ~90-95% to'g'ri ajratadi.
//
// Fail-safe: kalit yo'q / xato / JSON buzuq → [] (ingest to'xtamaydi, chaqiruvchi log qiladi).

const GEMINI_KEY = process.env.GEMINI_API_KEY;
// Parsing uchun alohida (arzon) model — chat modelidan ajratilgan (xarajat nazorati).
const PARSE_MODEL = process.env.YUKGO_PARSE_MODEL || "gemini-2.5-flash-lite";

export type YukListingType = "CARGO" | "TRUCK" | "LOGIST" | "OTHER";

export interface YukParsed {
    type: YukListingType;              // CARGO=yuk bor (mashina kerak), TRUCK=bo'sh mashina, LOGIST=dispetcher, OTHER=aloqasiz
    fromText: string | null;           // xom matn (tuman/qishloq saqlanadi)
    fromCity: string | null;
    fromCountry: string | null;        // ISO-2 (UZ/RU/KZ...)
    toText: string | null;
    toCity: string | null;
    toCountry: string | null;
    cargo: string | null;              // yuk turi
    weightTons: number | null;         // tonnada
    truckTypes: string[];              // ["tent","ref","open_top","fura","isuzu",...]
    quantityTrucks: number | null;
    price: { amount: number | null; currency: "UZS" | "RUB" | "USD" | null; negotiable: boolean } | null;
    phones: string[];                  // +998XXXXXXXXX normalizatsiya qilingan
    lang: "uz" | "ru" | "mixed";
    confidence: number;                // 0..1
}

const PROMPT_HEAD = `Sen logistika e'lonlarini tahlil qiluvchi tizimsan. O'zbek/rus tilidagi Telegram yuk e'lonlarini TOZA strukturaga ajrat.

Har e'lon uchun:
- type: "CARGO" (yuk egasi mashina qidiryapti — "yuk bor","mashina kerak","нужен","груз"), "TRUCK" (haydovchi bo'sh mashina, yuk qidiryapti — "bo'sh mashina bor","ищу груз"), "LOGIST" (dispetcher/vositachi xizmati reklama), "OTHER" (yuk tashishga aloqasiz — mashina SOTUVI, reklama, spam)
- fromText / toText: jo'nash va borish joyining XOM matni (tuman/qishloqni saqla)
- fromCity / toCity: asosiy shahar
- fromCountry / toCountry: ISO-2 (UZ/RU/KZ/...); bilinmasa UZ
- cargo: yuk turi yoki null
- weightTons: vazn TONNADA (kg berilsa /1000) yoki null
- truckTypes: mashina turlari MASSIVI ("tent","ref"(рефф/refrijerator),"open_top"(tepasi ochiladigan),"fura","isuzu",...); yo'q bo'lsa []
- quantityTrucks: nechta mashina kerak yoki null
- price: {amount: raqam|null, currency: "UZS"|"RUB"|"USD"|null, negotiable: bool} yoki null
- phones: raqamlar massivi; O'zbekiston raqamini +998XXXXXXXXX (998 dan keyin 9 raqam) ga keltir; @username/bot telefon EMAS
- lang: "uz"|"ru"|"mixed"
- confidence: 0..1

Narx: "33.5млн"=33500000 RUB; "800 ming"=800000 UZS; "150 talik" narx EMAS (yuk tavsifi). "kelishiladi"/"договорная"→negotiable:true.
Mashina SOTUVI ("sotiladi","продается") → type:"OTHER" (yuk e'loni emas).

Faqat JSON qaytar: {"ads":[ ... ]} — e'lonlar KIRISH tartibida, har biriga bitta obyekt.

E'lonlar:
`;

async function callParse(texts: string[]): Promise<YukParsed[]> {
    if (!GEMINI_KEY) return [];
    const prompt = PROMPT_HEAD + texts.map((t, i) => `--- E'lon ${i + 1} ---\n${(t || "").slice(0, 2000)}`).join("\n\n");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${PARSE_MODEL}:generateContent?key=${GEMINI_KEY}`;
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json", temperature: 0 },
            }),
        });
        if (!res.ok) {
            console.error("[yukgo-parse]", res.status, (await res.text().catch(() => "")).slice(0, 200));
            return [];
        }
        const data = await res.json();
        const raw = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ?? "";
        const parsed = JSON.parse(raw) as { ads?: unknown };
        const ads = Array.isArray(parsed?.ads) ? parsed.ads : [];
        return ads.map(normalize);
    } catch (e) {
        console.error("[yukgo-parse]", e);
        return [];
    }
}

// Model javobini xavfsiz normallashtirish (ishonchsiz maydonlarni tozalash)
function normalize(a: unknown): YukParsed {
    const o = (a ?? {}) as Record<string, unknown>;
    const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
    const num = (v: unknown): number | null => (typeof v === "number" && isFinite(v) ? v : null);
    const type = (["CARGO", "TRUCK", "LOGIST", "OTHER"].includes(String(o.type)) ? o.type : "OTHER") as YukListingType;
    const cur = ["UZS", "RUB", "USD"].includes(String((o.price as Record<string, unknown>)?.currency)) ? (o.price as Record<string, unknown>).currency as "UZS" | "RUB" | "USD" : null;
    const priceObj = o.price as Record<string, unknown> | null | undefined;
    const phones = Array.isArray(o.phones)
        ? [...new Set(o.phones.map(p => String(p).replace(/[^\d+]/g, "")).filter(p => p.length >= 7))]
        : [];
    return {
        type,
        fromText: str(o.fromText), fromCity: str(o.fromCity), fromCountry: str(o.fromCountry),
        toText: str(o.toText), toCity: str(o.toCity), toCountry: str(o.toCountry),
        cargo: str(o.cargo),
        weightTons: num(o.weightTons),
        truckTypes: Array.isArray(o.truckTypes) ? o.truckTypes.map(t => String(t)).filter(Boolean) : [],
        quantityTrucks: num(o.quantityTrucks),
        price: priceObj ? { amount: num(priceObj.amount), currency: cur, negotiable: priceObj.negotiable === true } : null,
        phones,
        lang: (["uz", "ru", "mixed"].includes(String(o.lang)) ? o.lang : "mixed") as "uz" | "ru" | "mixed",
        confidence: typeof o.confidence === "number" ? Math.max(0, Math.min(1, o.confidence)) : 0.5,
    };
}

/** Bir nechta e'lon matnini bitta chaqiruvda ajratadi (backfill uchun arzon). Max ~20 tavsiya. */
export async function parseYukListings(texts: string[]): Promise<YukParsed[]> {
    const clean = texts.filter(t => typeof t === "string" && t.trim().length >= 5);
    if (!clean.length) return [];
    return callParse(clean);
}

/** Bitta e'lon (webhook real-vaqt yo'li). */
export async function parseYukListing(text: string): Promise<YukParsed | null> {
    const out = await parseYukListings([text]);
    return out[0] ?? null;
}
