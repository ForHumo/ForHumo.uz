import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BnYordamPage } from "@/components/bn/bn-yordam";

type Locale = "uz" | "ru" | "en";

// bn-yordam.tsx bilan bir xil ro'yxat (JSON-LD server-side render qilish uchun).
// UI komponenti va bu yerda alohida turishi — komponent client'da, biz server'da.
const FAQ_KEYS: { q: string; a: string }[][] = [
    [{ q: "q1_1", a: "a1_1" }, { q: "q1_2", a: "a1_2" }, { q: "q1_3", a: "a1_3" }, { q: "q1_4", a: "a1_4" }],
    [{ q: "q2_1", a: "a2_1" }, { q: "q2_2", a: "a2_2" }, { q: "q2_3", a: "a2_3" }, { q: "q2_4", a: "a2_4" }],
    [{ q: "q3_1", a: "a3_1" }, { q: "q3_2", a: "a3_2" }, { q: "q3_3", a: "a3_3" }, { q: "q3_4", a: "a3_4" }],
    [{ q: "q4_1", a: "a4_1" }, { q: "q4_2", a: "a4_2" }, { q: "q4_3", a: "a4_3" }, { q: "q4_4", a: "a4_4" }],
    [{ q: "q5_1", a: "a5_1" }, { q: "q5_2", a: "a5_2" }, { q: "q5_3", a: "a5_3" }],
];

function buildTitle(locale: Locale): string {
    if (locale === "ru") return "Помощь и частые вопросы · Bozor Narxida";
    if (locale === "en") return "Help & FAQ · Bozor Narxida";
    return "Yordam va tez-tez so'raladigan savollar · Bozor Narxida";
}

function buildDescription(locale: Locale): string {
    if (locale === "ru") {
        return "Bozor Narxida — ответы на вопросы про заказ, оплату, доставку, эскроу, "
            + "как стать продавцом и как приглашать друзей за бонус.";
    }
    if (locale === "en") {
        return "Bozor Narxida — answers about ordering, payment, delivery, escrow, "
            + "becoming a seller and inviting friends for bonuses.";
    }
    return "Bozor Narxida yordam markazi — buyurtma, to'lov, yetkazish, eskrow, "
        + "sotuvchi bo'lish va do'st chaqirish bo'yicha savollarga javoblar.";
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
    const { locale } = await params;
    const title = buildTitle(locale);
    const description = buildDescription(locale);
    const pageUrl = "https://bozornarxida.uz/yordam";

    return {
        title: { absolute: title },
        description,
        alternates: {
            canonical: pageUrl,
            languages: {
                "uz": "https://bozornarxida.uz/uz/yordam",
                "ru": "https://bozornarxida.uz/ru/yordam",
                "en": "https://bozornarxida.uz/en/yordam",
            },
        },
        openGraph: {
            type: "website",
            title,
            description,
            url: pageUrl,
            siteName: "Bozor Narxida",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
        },
    };
}

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "bn.help" });

    // FAQPage JSON-LD — Google "People Also Ask" featured snippet uchun.
    // Har til uchun o'z tarjimalari (Google har uzunlik hreflang'ni alohida ko'radi).
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `https://bozornarxida.uz/yordam#faq`,
        inLanguage: locale,
        mainEntity: FAQ_KEYS.flat().map(k => ({
            "@type": "Question",
            name: t(k.q),
            acceptedAnswer: {
                "@type": "Answer",
                text: t(k.a),
            },
        })),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <BnYordamPage />
        </>
    );
}
