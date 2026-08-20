// BN "Haqida" (About / Landing) sahifasi — SEO va organik trafik uchun.
// Server component: statik render, index'lanadi.
// 3 tilda tarjima: content lokalizatsiya map orqali.

import { ChevronRight, TrendingDown, ShieldCheck, Store, Search, Package, Users, MapPin, Sparkles, ClipboardList, ArrowRight } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";
import { BnBackButton } from "./bn-back-button";

type Locale = "uz" | "ru" | "en";

interface Copy {
    title: string;
    subtitle: string;
    heroCta1: string;
    heroCta2: string;

    valuesTitle: string;
    values: { title: string; text: string }[];

    howTitle: string;
    howSubtitle: string;
    howSteps: { title: string; text: string }[];

    forSellersTitle: string;
    forSellersText: string;
    forSellersCta: string;
    forSellersNote: string;

    faqTitle: string;
    faqItems: { q: string; a: string }[];

    finalTitle: string;
    finalText: string;
    finalCta1: string;
    finalCta2: string;
}

const COPY: Record<Locale, Copy> = {
    uz: {
        title: "Toshkent bozorlaridagi haqiqiy narxlar — bir joyda",
        subtitle: "Bozor Narxida (BN) — Toshkent va O'zbekiston bozorlari, do'konlaridagi mahsulotlarni onlayn ko'rish, taqqoslash va buyurtma qilish uchun platforma. Chorsu, Sergeli, Alay va boshqa 30+ bozorda ish boshlaymiz.",
        heroCta1: "Bozorlarni ko'rish",
        heroCta2: "Sotuvchi bo'lish",

        valuesTitle: "Nima uchun BN?",
        values: [
            { title: "Haqiqiy bozor narxlari", text: "Har mahsulotda o'sha bozor uchun o'rtacha narx yonida ko'rsatiladi. Qimmatga tushmayapmi — bir zumda ko'rasiz." },
            { title: "Ishonchli sotuvchi", text: "Har do'kon telefon va joyi bilan tekshirilgan. Tier tizimi (NEW → PLATINUM) sotuvchi tajribasi va sharhlarni ochiq ko'rsatadi." },
            { title: "Eskrow himoyasi", text: "Pulingiz mahsulot yetib kelguncha ushlab turiladi. Mahsulot yaxshi bo'lmasa — pulni to'liq qaytarasiz." },
            { title: "Yaqin do'kon", text: "Xarita orqali eng yaqin bozor yoki do'konni topasiz. Bir bosishda yo'lni ochish mumkin." },
        ],

        howTitle: "Qanday ishlaydi?",
        howSubtitle: "Xaridor uchun uch bosqich",
        howSteps: [
            { title: "Toping va tanlang", text: "Bozor yoki kategoriyadan mahsulot tanlang. Har biriga narx, rasm, sotuvchi ma'lumoti va sharhlari ochiq." },
            { title: "Buyurtma bering", text: "Yetkazish, olib ketish yoki bozorga borish — o'zingiz tanlaysiz. Pul eskrow'da ushlanadi." },
            { title: "Qabul qiling va baholang", text: "Mahsulot yaxshi bo'lsa — tasdiqlaysiz, sotuvchiga pul o'tadi. Yomon bo'lsa — qaytarib yuboriladi." },
        ],

        forSellersTitle: "Sotuvchi bo'lishni xohlaysizmi?",
        forSellersText: "Bozordagi yoki ko'chadagi do'koningizni onlaynga chiqaring. Buyurtmalar telefoningizga tushadi. Komissiya 5% — naqd savdodan olinmaydi.",
        forSellersCta: "Waitlist'ga yozilish",
        forSellersNote: "Hozircha ariza to'plash bosqichi — MChJ ochilgach Jalol qo'ng'iroq qiladi va yo'l-yo'riq beradi.",

        faqTitle: "Ko'p so'raladigan savollar",
        faqItems: [
            { q: "BN qaerda ishlaydi?", a: "Hozircha Toshkent shahri va viloyat markazlariga xizmat qilamiz. 2026-yil oxirigacha O'zbekistonning barcha viloyatlariga chiqamiz." },
            { q: "Bozor narxi qanday hisoblanadi?", a: "Har mahsulot kategoriyasi uchun bir necha do'kondan olingan narxlar o'rtachasi. Sizga arzon variantni ko'rish va tejalgan foizni ko'rsatamiz." },
            { q: "Yetkazish bepulmi?", a: "Yetkazish narxi masofa va vaznga qarab hisoblanadi. Alternativa — bozordan olib ketish yoki do'konga borish (bepul)." },
            { q: "To'lov qanday amalga oshiriladi?", a: "Karta orqali (Payme/Click) yoki naqd (do'konda). Karta to'lovi eskrow — mahsulot yaxshi bo'lmasa pul qaytariladi." },
            { q: "Sotuvchi bo'lish uchun nima kerak?", a: "MChJ yoki YATT hujjatlari, do'kon nomi, telefon va bank rekvizit. Hujjatlaringiz tayyor bo'lmasa — waitlist'ga yozing, ochilgach qo'ng'iroq qilamiz." },
            { q: "Do'st chaqirish bonusi qanday?", a: "O'z havolangizni ulashasiz. Do'stingiz birinchi buyurtma qilsa — sizga 10 000 so'm, unga 5 000 so'm hamyoningizga tushadi." },
        ],

        finalTitle: "Bozor endi cho'ntagingizda",
        finalText: "Ro'yxatdan o'ting va Toshkentning barcha bozorlarini bir ekrandan ko'ring.",
        finalCta1: "Bosh sahifaga o'tish",
        finalCta2: "Do'st chaqirib bonus olish",
    },
    ru: {
        title: "Настоящие цены ташкентских базаров — в одном месте",
        subtitle: "Bozor Narxida (BN) — платформа для просмотра, сравнения и заказа товаров с базаров и магазинов Ташкента и Узбекистана. Начинаем с Чорсу, Сергели, Алая и ещё 30+ базаров.",
        heroCta1: "Смотреть базары",
        heroCta2: "Стать продавцом",

        valuesTitle: "Почему BN?",
        values: [
            { title: "Реальные цены базара", text: "Рядом с каждым товаром — средняя цена по этому базару. Сразу видно, не переплачиваете ли вы." },
            { title: "Проверенные продавцы", text: "Каждый магазин проверен: телефон, адрес. Система рангов (NEW → PLATINUM) открыто показывает опыт и отзывы." },
            { title: "Защита эскроу", text: "Деньги удерживаются до получения товара. Если товар не понравится — возвращаем полную сумму." },
            { title: "Ближайший магазин", text: "По карте находите ближайший базар или магазин. В один клик прокладываете маршрут." },
        ],

        howTitle: "Как это работает?",
        howSubtitle: "Три шага для покупателя",
        howSteps: [
            { title: "Найдите и выберите", text: "Выберите товар по базару или категории. У каждого — цена, фото, инфо о продавце и отзывы." },
            { title: "Оформите заказ", text: "Доставка, самовывоз или посещение базара — выбираете вы. Деньги удерживаются в эскроу." },
            { title: "Получите и оцените", text: "Всё хорошо — подтверждаете, продавец получает деньги. Плохо — возвращаем." },
        ],

        forSellersTitle: "Хотите стать продавцом?",
        forSellersText: "Выведите ваш магазин на базаре или на улице в онлайн. Заказы приходят на телефон. Комиссия 5% — с наличных не берётся.",
        forSellersCta: "Записаться в waitlist",
        forSellersNote: "Сейчас идёт сбор заявок — как только откроем ООО, Джалол свяжется и всё объяснит.",

        faqTitle: "Частые вопросы",
        faqItems: [
            { q: "Где работает BN?", a: "Пока в Ташкенте и областных центрах. До конца 2026 года выйдем во все регионы Узбекистана." },
            { q: "Как считается цена базара?", a: "Средняя цена по нескольким магазинам этой категории. Показываем самый дешёвый вариант и процент экономии." },
            { q: "Доставка бесплатная?", a: "Стоимость зависит от расстояния и веса. Альтернатива — самовывоз с базара или посещение магазина (бесплатно)." },
            { q: "Как проходит оплата?", a: "Картой (Payme/Click) или наличными в магазине. Оплата картой — эскроу, при проблеме возвращается." },
            { q: "Что нужно чтобы стать продавцом?", a: "Документы ООО или ИП, название магазина, телефон и банковские реквизиты. Если документов ещё нет — записывайтесь в waitlist." },
            { q: "Как работает бонус за приглашение?", a: "Делитесь своей ссылкой. Друг делает первый заказ — вам 10 000 сум, ему 5 000 сум на кошелёк." },
        ],

        finalTitle: "Базар теперь в вашем кармане",
        finalText: "Регистрируйтесь и смотрите все базары Ташкента с одного экрана.",
        finalCta1: "На главную",
        finalCta2: "Пригласить друга и получить бонус",
    },
    en: {
        title: "Real bazaar prices of Tashkent — all in one place",
        subtitle: "Bozor Narxida (BN) — a platform to browse, compare and order goods from bazaars and shops across Tashkent and Uzbekistan. Starting with Chorsu, Sergeli, Alay and 30+ more bazaars.",
        heroCta1: "Explore bazaars",
        heroCta2: "Become a seller",

        valuesTitle: "Why BN?",
        values: [
            { title: "Real bazaar prices", text: "Every product shows the local bazaar average next to it — instantly see if you're overpaying." },
            { title: "Verified sellers", text: "Every shop is checked — phone, address. The tier system (NEW → PLATINUM) openly shows seller history and reviews." },
            { title: "Escrow protection", text: "Your money is held until the product arrives. If you don't like it — you get a full refund." },
            { title: "Nearest shop", text: "Find the closest bazaar or shop on the map. One click to get directions." },
        ],

        howTitle: "How it works",
        howSubtitle: "Three steps for buyers",
        howSteps: [
            { title: "Find and pick", text: "Choose by bazaar or category. Every item shows price, photos, seller info and reviews." },
            { title: "Place your order", text: "Delivery, pickup or a visit — you decide. Payment is held in escrow." },
            { title: "Receive and review", text: "All good — you confirm, seller gets paid. Something wrong — you get a refund." },
        ],

        forSellersTitle: "Want to sell on BN?",
        forSellersText: "Bring your bazaar or street shop online. Orders come to your phone. 5% commission — never on cash sales.",
        forSellersCta: "Join the waitlist",
        forSellersNote: "We're currently collecting applications — once the legal entity opens, Jalol will call and walk you through.",

        faqTitle: "Frequently asked questions",
        faqItems: [
            { q: "Where does BN work?", a: "For now — Tashkent city and regional centers. By end of 2026 we'll cover all regions of Uzbekistan." },
            { q: "How is the bazaar price calculated?", a: "The average price from several shops in that category. We show you the cheapest option and the saved percentage." },
            { q: "Is delivery free?", a: "Delivery cost depends on distance and weight. Alternatives — bazaar pickup or visiting the shop (free)." },
            { q: "How is payment made?", a: "By card (Payme/Click) or cash in the shop. Card payments are escrow — refunded if something goes wrong." },
            { q: "What do I need to become a seller?", a: "LLC or IE documents, shop name, phone and bank details. If documents aren't ready — join the waitlist." },
            { q: "How does the referral bonus work?", a: "Share your link. When a friend makes their first order — you get 10,000 UZS, they get 5,000 UZS to their wallet." },
        ],

        finalTitle: "The bazaar is now in your pocket",
        finalText: "Sign in and see every bazaar in Tashkent from one screen.",
        finalCta1: "Go to home",
        finalCta2: "Invite a friend and earn bonus",
    },
};

export function BnHaqidaPage({ locale }: { locale: Locale }) {
    const c = COPY[locale];

    // JSON-LD Organization structured data — SEO uchun
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Bozor Narxida",
        alternateName: "BN",
        url: "https://bozornarxida.uz",
        logo: "https://bozornarxida.uz/icon-512.png",
        description: c.subtitle,
        sameAs: [
            "https://t.me/forhumo",
            "https://forhumo.uz",
        ],
        areaServed: { "@type": "Country", name: "Uzbekistan" },
    };

    return (
        <div className="mx-auto max-w-[900px] px-4 pt-4 pb-16">
            <BnBackButton fallbackHref="/" />

            {/* Hero */}
            <section className="mt-6 mb-10 sm:mb-14">
                <div className="flex items-center gap-2 text-[11.5px] font-bold mb-4"
                    style={{ color: BN.gold }}>
                    <Sparkles className="w-3.5 h-3.5" />
                    Bozor Narxida
                </div>
                <h1 className="text-[30px] sm:text-[40px] font-black tracking-tight leading-[1.05] mb-4">
                    {c.title}
                </h1>
                <p className="text-[15px] sm:text-[17px] leading-relaxed max-w-[720px]"
                    style={{ color: BN.text2 }}>
                    {c.subtitle}
                </p>

                <div className="flex flex-wrap items-center gap-2.5 mt-6">
                    <BnLink href="/bozorlar"
                        className="flex items-center gap-2 h-12 px-5 rounded-2xl text-[14px] font-black transition-transform active:scale-[0.97]"
                        style={{ background: BN.gold, color: BN.onGold }}>
                        <Store className="w-4 h-4" />
                        {c.heroCta1}
                        <ArrowRight className="w-4 h-4" />
                    </BnLink>
                    <BnLink href="/sotuvchi/waitlist"
                        className="flex items-center gap-2 h-12 px-5 rounded-2xl text-[14px] font-black transition-transform active:scale-[0.97]"
                        style={{ background: BN.surface, border: `1px solid ${BN.borderGold}`, color: BN.gold }}>
                        <ClipboardList className="w-4 h-4" />
                        {c.heroCta2}
                    </BnLink>
                </div>
            </section>

            {/* Value props */}
            <section className="mb-10 sm:mb-14">
                <h2 className="text-[22px] sm:text-[26px] font-black tracking-tight mb-5">{c.valuesTitle}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[TrendingDown, ShieldCheck, Users, MapPin].map((Icon, i) => (
                        <div key={i} className="p-4 sm:p-5 rounded-2xl flex items-start gap-3"
                            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                            <span className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0"
                                style={{ background: BN.goldSoft, color: BN.gold }}>
                                <Icon className="w-5 h-5" />
                            </span>
                            <div className="min-w-0">
                                <h3 className="text-[15px] font-black leading-tight mb-1.5">{c.values[i].title}</h3>
                                <p className="text-[12.5px] leading-relaxed" style={{ color: BN.text2 }}>{c.values[i].text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="mb-10 sm:mb-14">
                <h2 className="text-[22px] sm:text-[26px] font-black tracking-tight mb-1">{c.howTitle}</h2>
                <p className="text-[13.5px] mb-5" style={{ color: BN.text3 }}>{c.howSubtitle}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[Search, Package, ShieldCheck].map((Icon, i) => (
                        <div key={i} className="p-5 rounded-2xl"
                            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-8 h-8 rounded-xl grid place-items-center text-[13px] font-black"
                                    style={{ background: BN.gold, color: BN.onGold }}>{i + 1}</span>
                                <Icon className="w-4 h-4" style={{ color: BN.text3 }} />
                            </div>
                            <h3 className="text-[15px] font-black leading-tight mb-2">{c.howSteps[i].title}</h3>
                            <p className="text-[12.5px] leading-relaxed" style={{ color: BN.text2 }}>{c.howSteps[i].text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Sellers CTA */}
            <section className="mb-10 sm:mb-14">
                <div className="p-6 sm:p-8 rounded-3xl"
                    style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}>
                    <div className="flex items-center gap-2 mb-3">
                        <Store className="w-5 h-5" style={{ color: BN.gold }} />
                        <span className="text-[12px] font-black" style={{ color: BN.gold }}>
                            {c.forSellersTitle}
                        </span>
                    </div>
                    <h2 className="text-[22px] sm:text-[26px] font-black tracking-tight mb-2 leading-tight">
                        {c.forSellersTitle}
                    </h2>
                    <p className="text-[13.5px] leading-relaxed mb-4 max-w-[620px]" style={{ color: BN.text2 }}>
                        {c.forSellersText}
                    </p>
                    <BnLink href="/sotuvchi/waitlist"
                        className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl text-[13.5px] font-black transition-transform active:scale-[0.97]"
                        style={{ background: BN.gold, color: BN.onGold }}>
                        <ClipboardList className="w-4 h-4" />
                        {c.forSellersCta}
                        <ArrowRight className="w-4 h-4" />
                    </BnLink>
                    <p className="text-[11.5px] mt-3" style={{ color: BN.text3 }}>{c.forSellersNote}</p>
                </div>
            </section>

            {/* FAQ */}
            <section className="mb-10 sm:mb-14">
                <h2 className="text-[22px] sm:text-[26px] font-black tracking-tight mb-5">{c.faqTitle}</h2>
                <div className="space-y-2">
                    {c.faqItems.map((it, i) => (
                        <details key={i} className="group rounded-2xl overflow-hidden"
                            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                            <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer list-none">
                                <span className="text-[14px] font-black leading-tight">{it.q}</span>
                                <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform group-open:rotate-90"
                                    style={{ color: BN.text3 }} />
                            </summary>
                            <div className="px-4 pb-4 text-[13px] leading-relaxed" style={{ color: BN.text2 }}>
                                {it.a}
                            </div>
                        </details>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="mb-8">
                <div className="p-6 sm:p-10 rounded-3xl text-center"
                    style={{ background: `linear-gradient(180deg, ${BN.goldSoft} 0%, ${BN.surface} 100%)`, border: `1px solid ${BN.borderGold}` }}>
                    <h2 className="text-[24px] sm:text-[30px] font-black tracking-tight mb-2">{c.finalTitle}</h2>
                    <p className="text-[14px] leading-relaxed mb-5 max-w-[520px] mx-auto" style={{ color: BN.text2 }}>
                        {c.finalText}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2.5">
                        <BnLink href="/"
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl text-[13.5px] font-black transition-transform active:scale-[0.97]"
                            style={{ background: BN.gold, color: BN.onGold }}>
                            {c.finalCta1}
                            <ArrowRight className="w-4 h-4" />
                        </BnLink>
                        <BnLink href="/kabinet"
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl text-[13.5px] font-black transition-transform active:scale-[0.97]"
                            style={{ background: BN.surface, border: `1px solid ${BN.borderGold}`, color: BN.gold }}>
                            {c.finalCta2}
                        </BnLink>
                    </div>
                </div>
            </section>

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
        </div>
    );
}
