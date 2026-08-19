// BN uchun i18n xabarlarini 3 tilda uz/ru/en.json fayllariga qo'shadi.
// Faqat "bn" namespace'i yaratiladi/yangilanadi. Boshqa key'lar tegilmaydi.
// Ishga tushirish: `node scripts/add-bn-messages.mjs`

import fs from "node:fs";

const BN = {
    uz: {
        // Umumiy
        brandName: "Bozor Narxida",
        tagline: "O'zbekiston bozorlari va do'konlari onlayn.",
        currency: "so'm",
        km: "km",

        // Header/menyu
        search: {
            placeholder: "Mahsulot, do'kon yoki bozor qidiring…",
            placeholderShort: "Nima qidiryapsiz?",
            voice: "AI bilan gaplashib qidirish",
            camera: "Rasmdan qidirish (Skaner)",
            cameraShort: "Rasmdan qidirish",
            submit: "Qidirish",
        },
        nav: {
            main: "Asosiy",
            catalog: "Katalog",
            nexus: "Nexus",
            favorites: "Sevimlilar",
            cart: "Savat",
            location: "Mening joylashuvim",
            pickupPoint: "Topshirish punkti",
            myOrders: "Buyurtmalarim",
            support: "Humo Support",
            categories: "Kategoriyalar",
            notifications: "Bildirishnomalar",
            profile: "Profil",
            menu: "Menyu",
            close: "Yopish",
            themeAndLang: "Til va rejim",
        },
        auth: {
            signIn: "Kirish",
            signInWithHumoID: "Humo ID bilan kirish",
        },
        seller: {
            become: "Sotuvchi bo'lish",
            openCabinet: "Kabinetga o'tish",
            cabinet: "Sotuvchi kabineti",
        },

        // Til va rejim (theme)
        lang: { label: "Til" },
        theme: {
            label: "Rejim",
            light: "Kunduzgi",
            dark: "Tungi",
            system: "Tizim",
        },

        // Ishonch qatori (footer trust bar)
        trust: {
            payment: "Xavfsiz to'lov",
            paymentText: "Pul yetkazilguncha ushlab turiladi",
            official: "Rasmiy sotuvchilar",
            officialText: "Har do'kon YaTT yoki MChJ bilan",
            marketPrice: "Bozor narxi",
            marketPriceText: "Har mahsulot bozor bilan solishtiriladi",
            inspect: "Ko'rib sotib olish",
            inspectText: "Bozorga borib ko'rib, keyin to'lang",
        },

        // Footer ustunlari
        footer: {
            forBuyer: "Xaridorga",
            forSeller: "Sotuvchiga",
            help: "Yordam",
            aboutFH: "For Humo",
            allProducts: "Barcha mahsulotlar",
            markets: "Bozorlar",
            shops: "Do'konlar",
            myOrders: "Buyurtmalarim",
            cabinet: "Kabinet",
            faq: "Savol-javob",
            terms: "Foydalanish shartlari",
            privacy: "Maxfiylik",
            offer: "Ommaviy oferta",
        },

        // Bosh sahifa
        home: {
            markets: "Bozorlar",
            marketsText: "Jismoniy bozorlar — borib ko'rish mumkin",
            marketsCount: "{n} ta bozor",
            shops: "Do'konlar",
            shopsText: "Bozordagi, ko'chadagi va onlayn do'konlar",
            shopsCount: "{n}+ ta do'kon",
            forYou: "Siz uchun",
            forYouSub: "Qiziqishlaringiz asosida AI tavsiya qildi",
            trustedShops: "Ishonchli do'konlar",
            trustedShopsSub: "Reyting va xaridor faolligiga qarab AI tuzgan TOP 10",
            seeAll: "Barchasini ko'rish",
            allBtn: "Barchasi",
            cheap: "Arzon",
            cheapTitle: "Bozor narxidan arzon",
            cheapSub: "Bozordagi o'rtacha narxdan pastda",
            fresh: "Yangi",
            freshTitle: "Yangi mahsulotlar",
            top: "Top",
            topTitle: "Top mahsulotlar",
            topSub: "Eng yuqori baholangan",
            seasonal: "Mavsumiy",
            seasonalTitle: "Mavsumiy mahsulotlar",
            seasonalSub: "Hozirgi faslga mos",
            loadMore: "Yana yuklash",
            filterAria: "Mahsulotlar filteri",
            sellerCta: "Do'koningiz bormi? Onlaynga chiqaring",
            sellerCtaText:
                "Bozordagi do'kon ham, ko'chadagi do'kon ham bo'ladi. Mahsulot rasmini yuklaysiz — Humo AI nomi, tavsifi va narx tavsiyasini o'zi yozadi. Komissiya 5%, naqd savdodan olinmaydi.",
        },

        // Mahsulot kartasi
        card: {
            addToFav: "Sevimlilarga qo'shish",
            removeFromFav: "Sevimlilardan olib tashlash",
            fewLeft: "{n} ta qoldi",
            inspect: "Ko'rib olish",
            delivery: "Yetkazish",
            wholesale: "Ulgurji",
            negotiable: "Kelishilgan narxda",
            atMarketPrice: "Bozor narxida",
            avgAtMarket: "Bozorda o'rtacha {price}",
            verifiedRetail: "Tasdiqlangan sotuvchi",
            verifiedWholesale: "Tasdiqlangan ulgurji",
            onlineShop: "Onlayn do'kon",
            outOfStock: "Tugagan",
        },

        // Navigatsiya labellari (BnNavbar aria)
        navbar: { ariaLabel: "Asosiy navigatsiya" },
    },

    ru: {
        brandName: "Bozor Narxida",
        tagline: "Рынки и магазины Узбекистана онлайн.",
        currency: "сум",
        km: "км",

        search: {
            placeholder: "Найдите товар, магазин или рынок…",
            placeholderShort: "Что ищете?",
            voice: "Голосовой AI-поиск",
            camera: "Поиск по фото (сканер)",
            cameraShort: "Поиск по фото",
            submit: "Поиск",
        },
        nav: {
            main: "Главная",
            catalog: "Каталог",
            nexus: "Nexus",
            favorites: "Избранное",
            cart: "Корзина",
            location: "Моё местоположение",
            pickupPoint: "Пункт выдачи",
            myOrders: "Мои заказы",
            support: "Humo Support",
            categories: "Категории",
            notifications: "Уведомления",
            profile: "Профиль",
            menu: "Меню",
            close: "Закрыть",
            themeAndLang: "Язык и тема",
        },
        auth: {
            signIn: "Войти",
            signInWithHumoID: "Войти через Humo ID",
        },
        seller: {
            become: "Стать продавцом",
            openCabinet: "В кабинет",
            cabinet: "Кабинет продавца",
        },

        lang: { label: "Язык" },
        theme: {
            label: "Тема",
            light: "Светлая",
            dark: "Тёмная",
            system: "Система",
        },

        trust: {
            payment: "Безопасная оплата",
            paymentText: "Деньги удерживаются до доставки",
            official: "Официальные продавцы",
            officialText: "Каждый магазин — ИП или ООО",
            marketPrice: "Рыночная цена",
            marketPriceText: "Каждый товар сравнивается со средней ценой",
            inspect: "Осмотр перед покупкой",
            inspectText: "Посмотрите на рынке, потом оплатите",
        },

        footer: {
            forBuyer: "Покупателю",
            forSeller: "Продавцу",
            help: "Помощь",
            aboutFH: "For Humo",
            allProducts: "Все товары",
            markets: "Рынки",
            shops: "Магазины",
            myOrders: "Мои заказы",
            cabinet: "Кабинет",
            faq: "Вопросы и ответы",
            terms: "Условия использования",
            privacy: "Конфиденциальность",
            offer: "Публичная оферта",
        },

        home: {
            markets: "Рынки",
            marketsText: "Физические рынки — можно приехать и посмотреть",
            marketsCount: "{n} рынков",
            shops: "Магазины",
            shopsText: "Магазины на рынках, на улицах и онлайн",
            shopsCount: "{n}+ магазинов",
            forYou: "Для вас",
            forYouSub: "AI рекомендует на основе ваших интересов",
            trustedShops: "Надёжные магазины",
            trustedShopsSub: "ТОП-10, составленный AI по рейтингу и активности покупателей",
            seeAll: "Смотреть все",
            allBtn: "Все",
            cheap: "Дешёвые",
            cheapTitle: "Дешевле рыночной цены",
            cheapSub: "Ниже средней цены на рынке",
            fresh: "Новые",
            freshTitle: "Новые товары",
            top: "Топ",
            topTitle: "Топ товаров",
            topSub: "С наивысшим рейтингом",
            seasonal: "Сезонные",
            seasonalTitle: "Сезонные товары",
            seasonalSub: "Подходят к текущему сезону",
            loadMore: "Загрузить ещё",
            filterAria: "Фильтр товаров",
            sellerCta: "Есть магазин? Выйдите онлайн",
            sellerCtaText:
                "Подойдёт и магазин на рынке, и на улице. Загрузите фото товара — Humo AI сам напишет название, описание и предложит цену. Комиссия 5%, с наличных не берётся.",
        },

        card: {
            addToFav: "Добавить в избранное",
            removeFromFav: "Убрать из избранного",
            fewLeft: "Осталось {n}",
            inspect: "Осмотр",
            delivery: "Доставка",
            wholesale: "Оптом",
            negotiable: "Цена договорная",
            atMarketPrice: "По рыночной цене",
            avgAtMarket: "Средняя цена на рынке {price}",
            verifiedRetail: "Проверенный продавец",
            verifiedWholesale: "Проверенный оптовик",
            onlineShop: "Онлайн-магазин",
            outOfStock: "Закончился",
        },

        navbar: { ariaLabel: "Основная навигация" },
    },

    en: {
        brandName: "Bozor Narxida",
        tagline: "Uzbekistan's markets and shops online.",
        currency: "UZS",
        km: "km",

        search: {
            placeholder: "Find a product, shop, or market…",
            placeholderShort: "What are you looking for?",
            voice: "Voice AI search",
            camera: "Search by photo (scanner)",
            cameraShort: "Search by photo",
            submit: "Search",
        },
        nav: {
            main: "Home",
            catalog: "Catalog",
            nexus: "Nexus",
            favorites: "Favorites",
            cart: "Cart",
            location: "My location",
            pickupPoint: "Pickup point",
            myOrders: "My orders",
            support: "Humo Support",
            categories: "Categories",
            notifications: "Notifications",
            profile: "Profile",
            menu: "Menu",
            close: "Close",
            themeAndLang: "Language & theme",
        },
        auth: {
            signIn: "Sign in",
            signInWithHumoID: "Sign in with Humo ID",
        },
        seller: {
            become: "Become a seller",
            openCabinet: "Open cabinet",
            cabinet: "Seller cabinet",
        },

        lang: { label: "Language" },
        theme: {
            label: "Theme",
            light: "Light",
            dark: "Dark",
            system: "System",
        },

        trust: {
            payment: "Secure payment",
            paymentText: "Funds are held until delivery",
            official: "Official sellers",
            officialText: "Every shop is a registered business",
            marketPrice: "Market price",
            marketPriceText: "Every product is compared to the market average",
            inspect: "See before you buy",
            inspectText: "Visit the market, inspect, then pay",
        },

        footer: {
            forBuyer: "For buyers",
            forSeller: "For sellers",
            help: "Help",
            aboutFH: "For Humo",
            allProducts: "All products",
            markets: "Markets",
            shops: "Shops",
            myOrders: "My orders",
            cabinet: "Cabinet",
            faq: "FAQ",
            terms: "Terms of use",
            privacy: "Privacy",
            offer: "Public offer",
        },

        home: {
            markets: "Markets",
            marketsText: "Physical markets — you can visit and inspect",
            marketsCount: "{n} markets",
            shops: "Shops",
            shopsText: "In-market, street and online shops",
            shopsCount: "{n}+ shops",
            forYou: "For you",
            forYouSub: "AI recommended based on your interests",
            trustedShops: "Trusted shops",
            trustedShopsSub: "AI-curated TOP-10 by rating and buyer activity",
            seeAll: "See all",
            allBtn: "All",
            cheap: "Cheap",
            cheapTitle: "Cheaper than market price",
            cheapSub: "Below the market average",
            fresh: "New",
            freshTitle: "New products",
            top: "Top",
            topTitle: "Top products",
            topSub: "Highest rated",
            seasonal: "Seasonal",
            seasonalTitle: "Seasonal products",
            seasonalSub: "Matching the current season",
            loadMore: "Load more",
            filterAria: "Products filter",
            sellerCta: "Have a shop? Go online.",
            sellerCtaText:
                "Works for market shops and street shops alike. Upload a photo — Humo AI writes the name, description and suggests the price. Commission 5%, not taken from cash sales.",
        },

        card: {
            addToFav: "Add to favorites",
            removeFromFav: "Remove from favorites",
            fewLeft: "{n} left",
            inspect: "Inspect",
            delivery: "Delivery",
            wholesale: "Wholesale",
            negotiable: "Negotiable",
            atMarketPrice: "At market price",
            avgAtMarket: "Market average {price}",
            verifiedRetail: "Verified seller",
            verifiedWholesale: "Verified wholesale",
            onlineShop: "Online shop",
            outOfStock: "Out of stock",
        },

        navbar: { ariaLabel: "Main navigation" },
    },
};

for (const [lang, msgs] of Object.entries(BN)) {
    const path = `messages/${lang}.json`;
    const data = JSON.parse(fs.readFileSync(path, "utf8"));
    data.bn = msgs;
    fs.writeFileSync(path, JSON.stringify(data, null, 4) + "\n", "utf8");
    console.log(`✓ ${path} — bn namespace yangilandi (${Object.keys(msgs).length} guruh)`);
}
