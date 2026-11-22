import type { Metadata } from "next";
import { bnPageMeta } from "@/lib/bn-seo";
import { BnHaqidaPage } from "@/components/bn/bn-haqida";

type Locale = "uz" | "ru" | "en";

const META: Record<Locale, { title: string; description: string }> = {
    uz: {
        title: "Bozor Narxida haqida — Toshkent bozorlari onlayn",
        description:
            "Bozor Narxida (BN) — Toshkent va O'zbekiston bozorlari, do'konlaridagi mahsulotlarni "
            + "onlayn ko'rish, narxlarni solishtirish va buyurtma qilish uchun platforma. "
            + "Eskrow himoya, tekshirilgan sotuvchilar, 5% komissiya.",
    },
    ru: {
        title: "О Bozor Narxida — базары Ташкента онлайн",
        description:
            "Bozor Narxida (BN) — платформа для просмотра, сравнения и заказа товаров с базаров и "
            + "магазинов Ташкента и Узбекистана. Защита эскроу, проверенные продавцы, комиссия 5%.",
    },
    en: {
        title: "About Bozor Narxida — Tashkent bazaars online",
        description:
            "Bozor Narxida (BN) — a platform to browse, compare and order goods from bazaars and "
            + "shops across Tashkent and Uzbekistan. Escrow protection, verified sellers, 5% commission.",
    },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
    const { locale } = await params;
    const m = META[locale] ?? META.uz;
    return {
        // Sarlavhada brend bor — shablon qo'shilmasin (absolute)
        title: { absolute: m.title },
        description: m.description,
        ...bnPageMeta({ locale, path: "/haqida", title: m.title, description: m.description }),
    };
}

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params;
    return <BnHaqidaPage locale={locale} />;
}
