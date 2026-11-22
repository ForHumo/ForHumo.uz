// Bozor Narxida — tilga mos formatlash (narx, foiz farqi, do'kon darajasi).
//
// `bn-theme.ts` dagi fmtPrice / priceDiffLabel / TIER_META.label o'zbekcha qattiq
// yozilgan — ular faqat UI bo'lmagan joylar (cron, JSON-LD, admin) uchun qoladi.
// Foydalanuvchiga ko'rinadigan matn shu yerdan olinadi:
//   - client komponent:  useBnFormat()          (src/components/bn/bn-format-hook.ts)
//   - server komponent:  await getBnFormat(loc)  (src/lib/bn-format-server.ts)
// Ikkalasi ham shu builder'ni `bn` namespace tarjimoni bilan chaqiradi — natija bir xil.
// Raqam guruhlash doim `groupThousands` (server/client hydration mos, vitrina bilan bir xil).

import { groupThousands, type ShopTier } from "./bn-theme";

/** `bn` namespace tarjimoni (next-intl `t`) — faqat kerakli qismi */
export type BnMsg = (key: string, values?: Record<string, string | number>) => string;

export interface BnFormat {
    /** "4 250 000 so'm" / "4 250 000 сум" / "4 250 000 UZS" */
    price: (som: number) => string;
    /** Faqat valyuta yorlig'i: so'm / сум / UZS */
    currency: string;
    /** Qisqa: 1 250 000 → "1.25 mln" / "1.25 млн" / "1.25M" */
    priceShort: (som: number) => string;
    /** Bozor o'rtachasiga foiz farqi: "7% arzon" / "на 7% дешевле" / "7% cheaper" */
    diff: (price: number, marketAvg: number | null | undefined) => string | null;
    /** Tayyor foiz farqidan yorliq: -7 → "7% arzon", 12 → "12% qimmat", 0 → "aynan bozor narxida" */
    diffPct: (pct: number) => string;
    /** Do'kon darajasi nomi (bn.tier.*) */
    tier: (tier: ShopTier) => string;
    /** Son + ot, ICU plural bilan: "5 ta mahsulot" / "5 товаров" / "5 products" */
    products: (n: number) => string;
    /** "3 ta do'kon" / "3 магазина" / "3 shops" */
    shops: (n: number) => string;
}

export function buildBnFormat(t: BnMsg): BnFormat {
    const currency = t("product.currencySom");
    const diffPct = (pct: number) => {
        if (pct === 0) return t("fmt.diffSame");
        return pct < 0
            ? t("fmt.diffCheaper", { pct: Math.abs(pct) })
            : t("fmt.diffPricier", { pct });
    };
    return {
        currency,
        price: (som) => `${groupThousands(som)} ${currency}`,
        priceShort: (som) => {
            if (som >= 1_000_000) {
                const m = som / 1_000_000;
                const n = m % 1 === 0 ? String(m) : m.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
                return t("fmt.mln", { n });
            }
            if (som >= 1_000) return t("fmt.thousand", { n: String(Math.round(som / 1000)) });
            return String(som);
        },
        diff: (price, marketAvg) => {
            if (!marketAvg || marketAvg <= 0) return null;
            return diffPct(Math.round(((price - marketAvg) / marketAvg) * 100));
        },
        diffPct,
        tier: (tier) => t(`tier.${tier}`),
        products: (n) => t("fmt.nProducts", { n }),
        shops: (n) => t("fmt.nShops", { n }),
    };
}
