// Bozor Narxida — dizayn tizimi (yagona manba).
// Reja: docs/BN-PLAN.md §6
//
// MUHIM: ranglar CSS o'zgaruvchilariga bog'langan — Kunduzgi / Tungi / Tizim
// rejimlari shu orqali ishlaydi. Qiymatlar `bn-styles.tsx` da e'lon qilinadi.
// Komponentlarda hech qachon hex yozilmaydi — doim `BN.*` ishlatiladi.

export const BN = {
    // Brend
    gold:       "var(--bn-gold)",
    goldLight:  "var(--bn-gold-light)",
    goldDark:   "var(--bn-gold-dark)",
    goldSoft:   "var(--bn-gold-soft)",
    goldEdge:   "var(--bn-gold-edge)",

    // Fon qatlamlari
    bg:         "var(--bn-bg)",
    surface:    "var(--bn-surface)",
    surfaceUp:  "var(--bn-surface-up)",
    surfaceTop: "var(--bn-surface-top)",

    // Chegara
    border:     "var(--bn-border)",
    borderGold: "var(--bn-border-gold)",

    // Matn
    text:       "var(--bn-text)",
    text2:      "var(--bn-text-2)",
    text3:      "var(--bn-text-3)",
    onGold:     "var(--bn-on-gold)",     // oltin fon ustidagi matn

    // Holat
    ok:         "var(--bn-ok)",
    okSoft:     "var(--bn-ok-soft)",
    warn:       "var(--bn-warn)",
    warnSoft:   "var(--bn-warn-soft)",
    err:        "var(--bn-err)",
    errSoft:    "var(--bn-err-soft)",
    info:       "var(--bn-info)",

    // Maxsus
    glass:      "var(--bn-glass)",       // muallaq navbar foni
    shadow:     "var(--bn-shadow)",
} as const;

// ── Narx ────────────────────────────────────────────────────────────────────
// BN ning asosiy va'dasi: har narx bozor o'rtachasi bilan solishtiriladi.

export type PriceRank = "cheap" | "fair" | "expensive";

export function fmtPrice(som: number): string {
    return `${som.toLocaleString("uz-UZ")} so'm`;
}

/** Qisqa ko'rinish: 1 250 000 → "1.25 mln" */
export function fmtPriceShort(som: number): string {
    if (som >= 1_000_000) {
        const m = som / 1_000_000;
        return `${m % 1 === 0 ? m : m.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")} mln`;
    }
    if (som >= 1_000) return `${Math.round(som / 1000)} ming`;
    return String(som);
}

export function priceRankOf(price: number, marketAvg: number | null | undefined): PriceRank | null {
    if (!marketAvg || marketAvg <= 0) return null;
    const diff = (price - marketAvg) / marketAvg;
    if (diff <= -0.08) return "cheap";
    if (diff >= 0.12) return "expensive";
    return "fair";
}

export const PRICE_RANK_META: Record<PriceRank, { label: string; color: string; soft: string }> = {
    cheap:     { label: "Bozor narxidan arzon",  color: BN.ok,   soft: BN.okSoft },
    fair:      { label: "Bozor narxida",         color: BN.gold, soft: BN.goldSoft },
    expensive: { label: "Bozor narxidan qimmat", color: BN.warn, soft: BN.warnSoft },
};

/** Foiz farqi: -7 → "7% arzon" */
export function priceDiffLabel(price: number, marketAvg: number | null | undefined): string | null {
    if (!marketAvg || marketAvg <= 0) return null;
    const pct = Math.round(((price - marketAvg) / marketAvg) * 100);
    if (pct === 0) return "aynan bozor narxida";
    return pct < 0 ? `${Math.abs(pct)}% arzon` : `${pct}% qimmat`;
}

// ── Do'kon darajasi ─────────────────────────────────────────────────────────

export type ShopTier = "NEW" | "TRUSTED" | "VERIFIED" | "PREMIUM";

export const TIER_META: Record<ShopTier, { label: string; color: string; commission: number }> = {
    NEW:      { label: "Yangi",        color: BN.text3, commission: 0.05  },
    TRUSTED:  { label: "Ishonchli",    color: BN.info,  commission: 0.05  },
    VERIFIED: { label: "Tasdiqlangan", color: BN.ok,    commission: 0.045 },
    PREMIUM:  { label: "Premium",      color: BN.gold,  commission: 0.04  },
};

// ── Joylashuv turi ──────────────────────────────────────────────────────────

export type LocationType = "IN_MARKET" | "STANDALONE" | "ONLINE";

export const LOCATION_META: Record<LocationType, { label: string; icon: string }> = {
    IN_MARKET:  { label: "Bozorda",        icon: "Store" },
    STANDALONE: { label: "Alohida do'kon", icon: "MapPin" },
    ONLINE:     { label: "Onlayn",         icon: "Globe" },
};

// ── Buyurtma holati ─────────────────────────────────────────────────────────

export type OrderStatus = "PLACED" | "CONFIRMED" | "READY" | "COMPLETED" | "CANCELLED" | "DISPUTED";

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; color: string }> = {
    PLACED:    { label: "Kutilmoqda",  color: BN.text3 },
    CONFIRMED: { label: "Tasdiqlandi", color: BN.info  },
    READY:     { label: "Tayyor",      color: BN.gold  },
    COMPLETED: { label: "Yakunlandi",  color: BN.ok    },
    CANCELLED: { label: "Bekor",       color: BN.err   },
    DISPUTED:  { label: "Nizo",        color: BN.warn  },
};

// ── Olish usuli ─────────────────────────────────────────────────────────────

export type FulfillType = "PICKUP" | "DELIVERY" | "INSPECT";

export const FULFILL_META: Record<FulfillType, { label: string; desc: string }> = {
    PICKUP:   { label: "Do'kondan olaman",    desc: "O'zingiz borib olasiz" },
    DELIVERY: { label: "Yetkazib berish",     desc: "Manzilingizga keltiramiz" },
    INSPECT:  { label: "Ko'rib sotib olaman", desc: "24 soat band qilamiz, borib ko'rasiz" },
};

// ── Atribut sxemasi (universal kategoriya) ──────────────────────────────────

export type AttrType = "text" | "number" | "select" | "multiselect" | "boolean";

export interface AttrDef {
    key: string;
    label: string;
    labelRu?: string;
    type: AttrType;
    options?: string[];
    required?: boolean;
    filterable?: boolean;
    unit?: string;
}

export function parseAttrSchema(raw: unknown): AttrDef[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((x): x is AttrDef =>
        !!x && typeof x === "object"
        && typeof (x as AttrDef).key === "string"
        && typeof (x as AttrDef).label === "string"
    );
}

export function attrValueLabel(def: AttrDef, value: unknown): string {
    if (value == null || value === "") return "—";
    if (def.type === "boolean") return value ? "Ha" : "Yo'q";
    if (def.type === "multiselect" && Array.isArray(value)) return value.join(", ");
    return `${value}${def.unit ? ` ${def.unit}` : ""}`;
}

// ── Komissiya ───────────────────────────────────────────────────────────────

export const BN_COMMISSION = Number(process.env.BN_COMMISSION ?? 0.05);

export function commissionFor(tier: ShopTier): number {
    return TIER_META[tier]?.commission ?? BN_COMMISSION;
}

// ── Yetkazib berish (v1 — qo'lda tarif, Yandex API keyin) ───────────────────

export const DELIVERY_TASHKENT = 20_000;
export const DELIVERY_REGION   = 40_000;

export function deliveryFee(city: string): number {
    return city.trim().toLowerCase().startsWith("tosh") ? DELIVERY_TASHKENT : DELIVERY_REGION;
}
