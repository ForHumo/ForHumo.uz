// Rieltor matching — sotuv e'loni ↔ xaridor so'rovi. Deterministik (Gemini'siz).
// Mezonlar QATTIQ filtr: mulk turi, tuman, valyuta+narx(byudjet ichida), xona soni.
// Har bir mezon (ikkala tomonda ham bor bo'lsa) mos kelishi SHART; mos bo'lmasa juftlik tashlanadi.
// Score = nechta mezon tekshirilib mos kelgani (ko'proq data rozi = ishonch yuqori).

import type { RealtorListing, RealtorBuyer } from "@prisma/client";

// Mulk turi sinonimlari (uz/ru/en) → yagona kalit
const PROPERTY_SYNONYMS: Record<string, string> = {
    kvartira: "kvartira", kvartera: "kvartira", apartment: "kvartira", flat: "kvartira",
    uy: "uy", hovli: "uy", house: "uy", dom: "uy",
    tijorat: "tijorat", kommersiya: "tijorat", commercial: "tijorat", ofis: "tijorat", office: "tijorat",
    yer: "yer", uchastka: "yer", land: "yer", plot: "yer",
    // kirill
    "квартира": "kvartira",
    "дом": "uy",
    "коммерческая": "tijorat",
    "участок": "yer",
};

function normType(s?: string | null): string | null {
    if (!s) return null;
    const k = s.toLowerCase().trim();
    if (PROPERTY_SYNONYMS[k]) return PROPERTY_SYNONYMS[k];
    for (const [key, val] of Object.entries(PROPERTY_SYNONYMS)) {
        if (k.includes(key)) return val;
    }
    return k;
}

// Tuman alias-jadvali — bir joy ko'p imloda yoziladi (uz lotin / alt / kirill).
// Barcha variant yagona kalitga keltiriladi, aks holda "Chilonzor" va "Chilanzar"
// boshqa tuman deb hisoblanib mos juftlik o'tkazib yuboriladi.
const DISTRICT_ALIASES: Record<string, string> = {
    // Toshkent shahri
    "bektemir": "bektemir", "бектемир": "bektemir",
    "chilonzor": "chilonzor", "chilanzar": "chilonzor", "chilonzar": "chilonzor", "chilanzor": "chilonzor",
    "чиланзар": "chilonzor", "чилонзор": "chilonzor", "чиланзор": "chilonzor",
    "mirobod": "mirobod", "mirabad": "mirobod", "mirabod": "mirobod",
    "мирабад": "mirobod", "миробод": "mirobod",
    "mirzo ulugbek": "mirzo-ulugbek", "mirzoulugbek": "mirzo-ulugbek", "ulugbek": "mirzo-ulugbek",
    "mirzo-ulugbek": "mirzo-ulugbek", "мирзо улугбек": "mirzo-ulugbek", "мирзоулугбек": "mirzo-ulugbek", "улугбек": "mirzo-ulugbek",
    "sergeli": "sergeli", "сергели": "sergeli",
    "shayxontohur": "shayxontohur", "shayhontohur": "shayxontohur", "shaykhontohur": "shayxontohur",
    "shaykhantakhur": "shayxontohur", "шайхантахур": "shayxontohur", "шайхонтохур": "shayxontohur",
    "olmazor": "olmazor", "almazar": "olmazor", "олмазор": "olmazor", "алмазар": "olmazor",
    "uchtepa": "uchtepa", "учтепа": "uchtepa",
    "yakkasaroy": "yakkasaroy", "yakkasaray": "yakkasaroy", "яккасарай": "yakkasaroy", "яккасарой": "yakkasaroy",
    "yashnobod": "yashnobod", "yashnabad": "yashnobod", "yashnobad": "yashnobod", "яшнабад": "yashnobod", "яшнобод": "yashnobod",
    "yunusobod": "yunusobod", "yunusabad": "yunusobod", "yunusabod": "yunusobod", "юнусабад": "yunusobod", "юнусобод": "yunusobod",
    "yangihayot": "yangihayot", "yangi hayot": "yangihayot", "янгихаёт": "yangihayot", "янгиҳаёт": "yangihayot",
    // Toshkent viloyati (ko'p uchraydi)
    "qibray": "qibray", "kibray": "qibray", "кибрай": "qibray", "қибрай": "qibray",
    "zangiota": "zangiota", "зангиата": "zangiota", "зангиота": "zangiota",
    "yangiyol": "yangiyol", "yangiyul": "yangiyol", "янгиюль": "yangiyol",
    "chirchiq": "chirchiq", "chirchik": "chirchiq", "чирчик": "chirchiq", "чирчиқ": "chirchiq",
    "bekobod": "bekobod", "bekabad": "bekobod", "бекабад": "bekobod",
    "olmaliq": "olmaliq", "almalyk": "olmaliq", "алмалык": "olmaliq",
    "angren": "angren", "ангрен": "angren",
    "ohangaron": "ohangaron", "ахангаран": "ohangaron", "оҳангарон": "ohangaron",
    "parkent": "parkent", "паркент": "parkent",
    "piskent": "piskent", "пискент": "piskent",
    "boka": "boka", "бука": "boka",
    "nurafshon": "nurafshon", "tuytepa": "nurafshon", "нурафшон": "nurafshon", "туйтепа": "nurafshon",
};
// Uzun kalit avval tekshirilsin ("mirzo ulugbek" > "ulugbek")
const DISTRICT_KEYS = Object.keys(DISTRICT_ALIASES).sort((a, b) => b.length - a.length);

function normDistrict(s?: string | null): string | null {
    if (!s) return null;
    const c = s.toLowerCase()
        .replace(/tumani|tuman|туман|район|р-н|r-n|district|shahri|shahar|город/g, " ")
        .replace(/['''ʻ`ʼ]/g, "")
        .replace(/[^a-zЀ-ӿ\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!c) return null;
    if (DISTRICT_ALIASES[c]) return DISTRICT_ALIASES[c];
    const padded = ` ${c} `;
    for (const k of DISTRICT_KEYS) {
        if (padded.includes(` ${k} `)) return DISTRICT_ALIASES[k];
    }
    return c;
}

function normCurrency(s?: string | null): "USD" | "UZS" | null {
    if (!s) return null;
    const k = s.toLowerCase().replace(/[.\s'ʻ]/g, "");
    if (k.includes("ye") || k.includes("уе") || k.includes("usd") || k.includes("$") || k.includes("dollar")) return "USD";
    if (k.includes("som") || k.includes("sum") || k.includes("сум") || k.includes("uzs")) return "UZS";
    return null;
}

export interface Match {
    listing: RealtorListing;
    buyer: RealtorBuyer;
    score: number;        // 0..1
    reasons: string[];
}

// Bitta juftlik mosmi? mos bo'lsa {score, reasons}, aks holda null.
export function scoreMatch(listing: RealtorListing, buyer: RealtorBuyer): { score: number; reasons: string[] } | null {
    const reasons: string[] = [];

    // 1) Mulk turi — ikkala tomonda bor bo'lsa, mos kelishi shart
    const lt = normType(listing.propertyType);
    const bt = normType(buyer.propertyType);
    if (lt && bt) {
        if (lt !== bt) return null;
        reasons.push("mulk turi mos");
    }

    // 2) Tuman — bor bo'lsa, mos (bir-birini o'z ichiga olsa ham)
    const ld = normDistrict(listing.district);
    const bd = normDistrict(buyer.district);
    if (ld && bd) {
        if (!(ld === bd || ld.includes(bd) || bd.includes(ld))) return null;
        reasons.push("tuman mos");
    }

    // 3+4) Narx byudjet ichida — narx va byudjet bor bo'lsa (valyuta bir xil bo'lishi kerak)
    if (listing.price != null && (buyer.budgetMin != null || buyer.budgetMax != null)) {
        const lc = normCurrency(listing.currency);
        const bc = normCurrency(buyer.currency);
        if (lc && bc && lc !== bc) return null;       // valyuta mos emas → solishtirib bo'lmaydi
        const min = buyer.budgetMin ?? 0;
        const max = buyer.budgetMax ?? Infinity;
        const tol = 0.05;                              // ±5% chegara tolerantligi
        if (listing.price < min * (1 - tol) || listing.price > max * (1 + tol)) return null;
        reasons.push("narx byudjet ichida");
    }

    // 5) Xona soni — bor bo'lsa, ±1 tolerant
    if (listing.rooms != null && buyer.rooms != null) {
        if (Math.abs(listing.rooms - buyer.rooms) > 1) return null;
        reasons.push(listing.rooms === buyer.rooms ? "xona mos" : "xona ~mos");
    }

    // Kamida 2 mezon tekshirilib mos kelgan bo'lsin (faqat bitta umumiy maydon = shovqin)
    if (reasons.length < 2) return null;
    const score = Math.min(1, reasons.length / 4);
    return { score, reasons };
}

// Barcha sotuv × xaridor juftliklaridan mos kelganlarini score bo'yicha qaytaradi.
export function findMatches(listings: RealtorListing[], buyers: RealtorBuyer[], limit = 100): Match[] {
    const matches: Match[] = [];
    for (const listing of listings) {
        for (const buyer of buyers) {
            const r = scoreMatch(listing, buyer);
            if (r) matches.push({ listing, buyer, score: r.score, reasons: r.reasons });
        }
    }
    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, limit);
}
