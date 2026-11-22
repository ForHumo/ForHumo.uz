// BN SEO yordamchilari — canonical / hreflang / OG uchun yagona manba.
//
// URL qoidasi (middleware: bozornarxida.uz → /[locale]/bn/*):
//   uz — prefikssiz:  https://www.bozornarxida.uz/bozorlar
//   ru — prefiksli:   https://www.bozornarxida.uz/ru/bozorlar
//   en — prefiksli:   https://www.bozornarxida.uz/en/bozorlar
// Har til sahifasi O'ZINI canonical qiladi (ru/en uz'ga "yutilib" ketmasin),
// hreflang uz/ru/en + x-default (uz) hammasida bir xil.
// Host — www: yalang'och bozornarxida.uz www'ga 308 qiladi, canonical redirect'ga qaramasin.

import type { Metadata } from "next";

export type BnLocale = "uz" | "ru" | "en";

export const BN_SITE = "https://www.bozornarxida.uz";
export const BN_SITE_NAME = "Bozor Narxida";

export function bnLocale(locale: string | undefined | null): BnLocale {
    return locale === "ru" || locale === "en" ? locale : "uz";
}

/** Sahifaning shu tildagi to'liq URL'i. `path` — "/bozorlar", "/bozorlar?tuman=x" yoki "/" (bosh sahifa). */
export function bnUrl(locale: string, path = "/"): string {
    const p = path === "/" ? "" : path;
    const l = bnLocale(locale);
    return l === "uz" ? `${BN_SITE}${p}` : `${BN_SITE}/${l}${p}`;
}

/** canonical (o'z tilida) + hreflang uz/ru/en + x-default. */
export function bnAlternates(locale: string, path = "/"): NonNullable<Metadata["alternates"]> {
    return {
        canonical: bnUrl(locale, path),
        languages: {
            uz: bnUrl("uz", path),
            ru: bnUrl("ru", path),
            en: bnUrl("en", path),
            "x-default": bnUrl("uz", path),
        },
    };
}

const OG_LOCALE: Record<BnLocale, string> = { uz: "uz_UZ", ru: "ru_RU", en: "en_US" };

/** Umumiy OG rasm — brend nomi + shior (tilga mos). Sahifaning o'z rasmi bo'lmasa shu. */
export function bnDefaultOgImage(locale: string) {
    return {
        url: `${BN_SITE}/api/og/bn/default?l=${bnLocale(locale)}`,
        width: 1200, height: 630, alt: BN_SITE_NAME,
    };
}

type OgImage = { url: string; width?: number; height?: number; alt?: string };

/**
 * Sahifa uchun alternates + openGraph + twitter bloki.
 * MUHIM: sahifa `openGraph` bersa layout'dagi openGraph TO'LIQ almashtiriladi (rasm ham) —
 * shuning uchun rasm doim shu yerda beriladi (bo'lmasa umumiy OG rasm).
 */
export function bnPageMeta(opts: {
    locale: string;
    path: string;
    title: string;
    description?: string;
    images?: OgImage[];
    twitterImage?: string;
}): Pick<Metadata, "alternates" | "openGraph" | "twitter"> {
    const l = bnLocale(opts.locale);
    const images = opts.images?.length ? opts.images : [bnDefaultOgImage(l)];
    return {
        alternates: bnAlternates(l, opts.path),
        openGraph: {
            type: "website",
            siteName: BN_SITE_NAME,
            locale: OG_LOCALE[l],
            alternateLocale: (Object.keys(OG_LOCALE) as BnLocale[]).filter(x => x !== l).map(x => OG_LOCALE[x]),
            url: bnUrl(l, opts.path),
            title: opts.title,
            description: opts.description,
            images,
        },
        twitter: {
            card: "summary_large_image",
            title: opts.title,
            description: opts.description,
            images: [opts.twitterImage ?? images[0].url],
        },
    };
}

// Shahar nomlari DB'da o'zbekcha ("Toshkent") — metadata'da tilga moslaymiz.
const CITY: Record<string, { ru: string; en: string }> = {
    "Toshkent":   { ru: "Ташкент",   en: "Tashkent" },
    "Samarqand":  { ru: "Самарканд", en: "Samarkand" },
    "Buxoro":     { ru: "Бухара",    en: "Bukhara" },
    "Andijon":    { ru: "Андижан",   en: "Andijan" },
    "Farg'ona":   { ru: "Фергана",   en: "Fergana" },
    "Namangan":   { ru: "Наманган",  en: "Namangan" },
    "Qarshi":     { ru: "Карши",     en: "Karshi" },
    "Nukus":      { ru: "Нукус",     en: "Nukus" },
    "Xiva":       { ru: "Хива",      en: "Khiva" },
    "Urganch":    { ru: "Ургенч",    en: "Urgench" },
};

export function bnCity(city: string, locale: string): string {
    const l = bnLocale(locale);
    if (l === "uz") return city;
    return CITY[city.trim()]?.[l] ?? city;
}
