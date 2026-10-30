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

function normDistrict(s?: string | null): string | null {
    if (!s) return null;
    const k = s.toLowerCase()
        .replace(/tumani|tuman|туман|район|r-n|district/g, "")
        .replace(/[^a-zЀ-ӿ\s'ʻ-]/gi, "")
        .trim();
    return k || null;
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
