// FAZA 1 — ko'rinishni qurish uchun vaqtinchalik mock ma'lumot.
// FAZA 2-4 da haqiqiy API bilan almashtiriladi (docs/BN-PLAN.md).
// MUHIM: bu fayl faqat UI skeletini ko'rsatish uchun. Backend tayyor bo'lgach o'chiriladi.

export interface MockMarket {
    id: string; slug: string; name: string; district: string;
    address: string; workHours: string; coverUrl: string;
    shopCount: number; sections: string[];
}

export interface MockCategory {
    id: string; slug: string; name: string; icon: string;
    productCount: number; children?: { slug: string; name: string; productCount: number }[];
}

export interface MockShop {
    id: string; slug: string; name: string; logoUrl: string | null;
    tier: "NEW" | "TRUSTED" | "VERIFIED" | "PREMIUM";
    locationType: "IN_MARKET" | "STANDALONE" | "ONLINE";
    marketSlug: string | null; marketName: string | null;
    marketSection: string | null; marketShopNo: string | null;
    address: string | null; city: string;
    district?: string | null;                       // "Shayxontohur" — ko'chadagi do'kon uchun
    branchName?: string | null;                     // "Shedevr" — filial nomi
    rating: number; ratingCount: number; productCount: number;
}

export interface MockProduct {
    id: string; slug: string; title: string;
    price: number; oldPrice: number | null; marketAvgPrice: number | null;
    images: string[];
    categorySlug: string;
    shopSlug: string; shopName: string; shopVerified?: boolean;
    marketName: string | null; city: string;
    district?: string | null; branchName?: string | null;
    stock: number; isNegotiable: boolean;
    allowPickup: boolean; allowDelivery: boolean; allowInspect: boolean;
    attributes: Record<string, string | number | boolean>;
    rating: number; ratingCount: number;
}

const img = (seed: string) => `https://picsum.photos/seed/${seed}/800/800`;

// ── Bozorlar ────────────────────────────────────────────────────────────────
export const MOCK_MARKETS: MockMarket[] = [
    {
        id: "m1", slug: "sergeli-avto-bozor", name: "Sergeli avtomobil bozori",
        district: "Sergeli tumani", address: "Toshkent, Sergeli, Yangi Sergeli ko'chasi",
        workHours: "Dush–Yak 08:00–18:00", coverUrl: img("sergeli-market"),
        shopCount: 148, sections: ["1-qator", "2-qator", "12-qator", "Dvigatel bo'limi", "Kuzov bo'limi"],
    },
    {
        id: "m2", slug: "chorsu-bozor", name: "Chorsu bozori",
        district: "Shayxontohur tumani", address: "Toshkent, Chorsu maydoni",
        workHours: "Har kuni 07:00–19:00", coverUrl: img("chorsu-market"),
        shopCount: 312, sections: ["Kiyim rastasi", "Oziq-ovqat", "Idish-tovoq", "Ziravorlar"],
    },
    {
        id: "m3", slug: "malika-bozor", name: "Malika savdo majmuasi",
        district: "Yashnobod tumani", address: "Toshkent, Malika bozori",
        workHours: "Har kuni 09:00–20:00", coverUrl: img("malika-market"),
        shopCount: 205, sections: ["Elektronika", "Telefonlar", "Maishiy texnika", "Aksessuar"],
    },
    {
        id: "m4", slug: "abu-sahiy-bozor", name: "Abu Sahiy ulgurji bozori",
        district: "Yangihayot tumani", address: "Toshkent, Abu Sahiy",
        workHours: "Dush–Shan 06:00–17:00", coverUrl: img("abusahiy-market"),
        shopCount: 476, sections: ["A blok", "B blok", "C blok", "Ulgurji zal"],
    },
    {
        id: "m5", slug: "yangiobod-bozor", name: "Yangiobod bozori",
        district: "Bektemir tumani", address: "Toshkent, Yangiobod",
        workHours: "Har kuni 08:00–18:00", coverUrl: img("yangiobod-market"),
        shopCount: 189, sections: ["Qurilish", "Asboblar", "Santexnika", "Elektr"],
    },
    {
        id: "m6", slug: "quyliq-bozor", name: "Qo'yliq dehqon bozori",
        district: "Yashnobod tumani", address: "Toshkent, Qo'yliq",
        workHours: "Har kuni 06:00–18:00", coverUrl: img("quyliq-market"),
        shopCount: 267, sections: ["Meva-sabzavot", "Go'sht", "Sut mahsulotlari", "Quruq meva"],
    },
];

// ── Kategoriyalar ───────────────────────────────────────────────────────────
export const MOCK_CATEGORIES: MockCategory[] = [
    {
        id: "c1", slug: "avto", name: "Avto", icon: "Car", productCount: 1284,
        children: [
            { slug: "avto-ehtiyot-qismlar", name: "Ehtiyot qismlar", productCount: 842 },
            { slug: "avto-moy", name: "Moy va suyuqliklar", productCount: 176 },
            { slug: "avto-shina", name: "Shina va disk", productCount: 148 },
            { slug: "avto-aksessuar", name: "Aksessuar", productCount: 118 },
        ],
    },
    {
        id: "c2", slug: "elektronika", name: "Elektronika", icon: "Smartphone", productCount: 967,
        children: [
            { slug: "elektronika-telefon", name: "Telefonlar", productCount: 421 },
            { slug: "elektronika-kompyuter", name: "Kompyuter va noutbuk", productCount: 203 },
            { slug: "elektronika-maishiy", name: "Maishiy texnika", productCount: 187 },
            { slug: "elektronika-tv", name: "TV va audio", productCount: 156 },
        ],
    },
    {
        id: "c3", slug: "kiyim", name: "Kiyim va poyabzal", icon: "Shirt", productCount: 1543,
        children: [
            { slug: "kiyim-erkaklar", name: "Erkaklar", productCount: 512 },
            { slug: "kiyim-ayollar", name: "Ayollar", productCount: 698 },
            { slug: "kiyim-poyabzal", name: "Poyabzal", productCount: 333 },
        ],
    },
    {
        id: "c4", slug: "uy", name: "Uy va bog'", icon: "Sofa", productCount: 731,
        children: [
            { slug: "uy-mebel", name: "Mebel", productCount: 284 },
            { slug: "uy-oshxona", name: "Oshxona", productCount: 231 },
            { slug: "uy-tekstil", name: "Tekstil", productCount: 216 },
        ],
    },
    {
        id: "c5", slug: "qurilish", name: "Qurilish", icon: "Hammer", productCount: 892,
        children: [
            { slug: "qurilish-material", name: "Qurilish materiallari", productCount: 398 },
            { slug: "qurilish-asbob", name: "Asboblar", productCount: 267 },
            { slug: "qurilish-santexnika", name: "Santexnika", productCount: 227 },
        ],
    },
    { id: "c6",  slug: "oziq-ovqat", name: "Oziq-ovqat",          icon: "ShoppingBasket", productCount: 428 },
    { id: "c7",  slug: "bolalar",    name: "Bolalar uchun",       icon: "Baby",           productCount: 356 },
    { id: "c8",  slug: "sport",      name: "Sport va hordiq",     icon: "Dumbbell",       productCount: 289 },
    { id: "c9",  slug: "gozallik",   name: "Go'zallik va salomatlik", icon: "Sparkles",   productCount: 412 },
    { id: "c10", slug: "xizmatlar",  name: "Xizmatlar",           icon: "Wrench",         productCount: 134 },
];

// ── Do'konlar ───────────────────────────────────────────────────────────────
export const MOCK_SHOPS: MockShop[] = [
    {
        id: "s1", slug: "jalol-motors", name: "Jalol Motors", logoUrl: img("jalol-logo"),
        tier: "PREMIUM", locationType: "IN_MARKET",
        marketSlug: "sergeli-avto-bozor", marketName: "Sergeli avtomobil bozori",
        marketSection: "12-qator", marketShopNo: "45",
        address: null, city: "Toshkent",
        rating: 4.8, ratingCount: 127, productCount: 84,
    },
    {
        id: "s2", slug: "aziz-auto", name: "Aziz Auto Parts", logoUrl: img("aziz-logo"),
        tier: "VERIFIED", locationType: "IN_MARKET",
        marketSlug: "sergeli-avto-bozor", marketName: "Sergeli avtomobil bozori",
        marketSection: "12-qator", marketShopNo: "46",
        address: null, city: "Toshkent",
        rating: 4.6, ratingCount: 89, productCount: 62,
    },
    {
        id: "s3", slug: "malika-electronics", name: "Malika Electronics", logoUrl: img("malika-logo"),
        tier: "VERIFIED", locationType: "IN_MARKET",
        marketSlug: "malika-bozor", marketName: "Malika savdo majmuasi",
        marketSection: "Telefonlar", marketShopNo: "8",
        address: null, city: "Toshkent",
        rating: 4.7, ratingCount: 204, productCount: 118,
    },
    {
        id: "s4", slug: "chilonzor-mebel", name: "Chilonzor Mebel", logoUrl: img("mebel-logo"),
        tier: "TRUSTED", locationType: "STANDALONE",
        marketSlug: null, marketName: null, marketSection: null, marketShopNo: null,
        address: "Chilonzor tumani, Bunyodkor ko'chasi 12", city: "Toshkent",
        district: "Chilonzor", branchName: "Shedevr",
        rating: 4.4, ratingCount: 43, productCount: 37,
    },
    {
        id: "s5", slug: "tez-yetkazish", name: "Tez Yetkazish", logoUrl: img("tez-logo"),
        tier: "NEW", locationType: "ONLINE",
        marketSlug: null, marketName: null, marketSection: null, marketShopNo: null,
        address: null, city: "Toshkent",
        rating: 4.2, ratingCount: 18, productCount: 29,
    },
    {
        id: "s6", slug: "chorsu-kiyim", name: "Chorsu Kiyim Savdo", logoUrl: img("kiyim-logo"),
        tier: "TRUSTED", locationType: "IN_MARKET",
        marketSlug: "chorsu-bozor", marketName: "Chorsu bozori",
        marketSection: "Kiyim rastasi", marketShopNo: "112",
        address: null, city: "Toshkent",
        rating: 4.5, ratingCount: 76, productCount: 143,
    },
];

// ── Mahsulotlar ─────────────────────────────────────────────────────────────
export const MOCK_PRODUCTS: MockProduct[] = [
    {
        id: "p1", slug: "nexia-3-old-tormoz-kolodka", title: "Chevrolet Nexia 3 old tormoz kolodkasi",
        price: 185_000, oldPrice: 220_000, marketAvgPrice: 210_000,
        images: [img("brake1"), img("brake2"), img("brake3")],
        categorySlug: "avto-ehtiyot-qismlar",
        shopSlug: "jalol-motors", shopName: "Jalol Motors",
        marketName: "Sergeli avtomobil bozori", city: "Toshkent",
        stock: 12, isNegotiable: false,
        allowPickup: true, allowDelivery: true, allowInspect: true,
        attributes: { brand: "Chevrolet", model: "Nexia 3", yearFrom: 2015, yearTo: 2020, condition: "Yangi", origin: "Original" },
        rating: 4.7, ratingCount: 34,
    },
    {
        id: "p2", slug: "damas-radiator", title: "Daewoo Damas radiator (suv sovutgich)",
        price: 640_000, oldPrice: null, marketAvgPrice: 590_000,
        images: [img("radiator1"), img("radiator2")],
        categorySlug: "avto-ehtiyot-qismlar",
        shopSlug: "aziz-auto", shopName: "Aziz Auto Parts",
        marketName: "Sergeli avtomobil bozori", city: "Toshkent",
        stock: 3, isNegotiable: true,
        allowPickup: true, allowDelivery: false, allowInspect: true,
        attributes: { brand: "Daewoo", model: "Damas", yearFrom: 2010, yearTo: 2024, condition: "Yangi", origin: "Analog" },
        rating: 4.3, ratingCount: 12,
    },
    {
        id: "p3", slug: "cobalt-amortizator-juft", title: "Ravon Cobalt old amortizator (juft)",
        price: 1_150_000, oldPrice: 1_300_000, marketAvgPrice: 1_240_000,
        images: [img("shock1"), img("shock2")],
        categorySlug: "avto-ehtiyot-qismlar",
        shopSlug: "jalol-motors", shopName: "Jalol Motors",
        marketName: "Sergeli avtomobil bozori", city: "Toshkent",
        stock: 6, isNegotiable: false,
        allowPickup: true, allowDelivery: true, allowInspect: true,
        attributes: { brand: "Ravon", model: "Cobalt", yearFrom: 2016, yearTo: 2023, condition: "Yangi", origin: "Original" },
        rating: 4.9, ratingCount: 21,
    },
    {
        id: "p4", slug: "iphone-13-128gb", title: "iPhone 13 128GB — ideal holat",
        price: 7_400_000, oldPrice: null, marketAvgPrice: 7_800_000,
        images: [img("iphone1"), img("iphone2"), img("iphone3")],
        categorySlug: "elektronika-telefon",
        shopSlug: "malika-electronics", shopName: "Malika Electronics",
        marketName: "Malika savdo majmuasi", city: "Toshkent",
        stock: 2, isNegotiable: true,
        allowPickup: true, allowDelivery: true, allowInspect: true,
        attributes: { brand: "Apple", model: "iPhone 13", memory: "128 GB", color: "Midnight", condition: "Ishlatilgan", warranty: "3 oy" },
        rating: 4.8, ratingCount: 56,
    },
    {
        id: "p5", slug: "samsung-a54-256gb", title: "Samsung Galaxy A54 256GB yangi",
        price: 4_250_000, oldPrice: 4_600_000, marketAvgPrice: 4_400_000,
        images: [img("samsung1"), img("samsung2")],
        categorySlug: "elektronika-telefon",
        shopSlug: "malika-electronics", shopName: "Malika Electronics",
        marketName: "Malika savdo majmuasi", city: "Toshkent",
        stock: 7, isNegotiable: false,
        allowPickup: true, allowDelivery: true, allowInspect: true,
        attributes: { brand: "Samsung", model: "Galaxy A54", memory: "256 GB", color: "Awesome Violet", condition: "Yangi", warranty: "12 oy" },
        rating: 4.6, ratingCount: 38,
    },
    {
        id: "p6", slug: "yumshoq-burchak-divan", title: "Yumshoq burchak divan — 3 kishilik",
        price: 5_900_000, oldPrice: null, marketAvgPrice: 6_200_000,
        images: [img("sofa1"), img("sofa2")],
        categorySlug: "uy-mebel",
        shopSlug: "chilonzor-mebel", shopName: "Chilonzor Mebel",
        marketName: null, city: "Toshkent", district: "Chilonzor", branchName: "Shedevr",
        stock: 4, isNegotiable: true,
        allowPickup: false, allowDelivery: true, allowInspect: true,
        attributes: { material: "Velur", color: "Kulrang", length: 260, assembled: false },
        rating: 4.5, ratingCount: 15,
    },
    {
        id: "p7", slug: "erkaklar-kuzgi-kurtka", title: "Erkaklar uchun kuzgi kurtka",
        price: 385_000, oldPrice: 450_000, marketAvgPrice: 420_000,
        images: [img("jacket1"), img("jacket2")],
        categorySlug: "kiyim-erkaklar",
        shopSlug: "chorsu-kiyim", shopName: "Chorsu Kiyim Savdo",
        marketName: "Chorsu bozori", city: "Toshkent",
        stock: 24, isNegotiable: true,
        allowPickup: true, allowDelivery: true, allowInspect: false,
        attributes: { size: "L", color: "Qora", material: "Polyester", season: "Kuz" },
        rating: 4.2, ratingCount: 28,
    },
    {
        id: "p8", slug: "makita-perforator", title: "Makita perforator HR2470 (original)",
        price: 2_780_000, oldPrice: null, marketAvgPrice: 2_650_000,
        images: [img("drill1"), img("drill2")],
        categorySlug: "qurilish-asbob",
        shopSlug: "tez-yetkazish", shopName: "Tez Yetkazish",
        marketName: null, city: "Toshkent", district: null,
        stock: 5, isNegotiable: false,
        allowPickup: false, allowDelivery: true, allowInspect: false,
        attributes: { brand: "Makita", power: 780, condition: "Yangi", warranty: "12 oy" },
        rating: 4.7, ratingCount: 19,
    },
    {
        id: "p9", slug: "nexia-2-fara-chap", title: "Nexia 2 chap fara (yangi)",
        price: 420_000, oldPrice: null, marketAvgPrice: 395_000,
        images: [img("light1")],
        categorySlug: "avto-ehtiyot-qismlar",
        shopSlug: "aziz-auto", shopName: "Aziz Auto Parts",
        marketName: "Sergeli avtomobil bozori", city: "Toshkent",
        stock: 8, isNegotiable: true,
        allowPickup: true, allowDelivery: true, allowInspect: true,
        attributes: { brand: "Daewoo", model: "Nexia 2", yearFrom: 2008, yearTo: 2016, condition: "Yangi", origin: "Analog" },
        rating: 4.1, ratingCount: 9,
    },
    {
        id: "p10", slug: "lg-muzlatgich-360l", title: "LG muzlatgich 360L — No Frost",
        price: 8_900_000, oldPrice: 9_800_000, marketAvgPrice: 9_400_000,
        images: [img("fridge1"), img("fridge2")],
        categorySlug: "elektronika-maishiy",
        shopSlug: "malika-electronics", shopName: "Malika Electronics",
        marketName: "Malika savdo majmuasi", city: "Toshkent",
        stock: 3, isNegotiable: true,
        allowPickup: true, allowDelivery: true, allowInspect: true,
        attributes: { brand: "LG", volume: 360, color: "Kumush", condition: "Yangi", warranty: "24 oy" },
        rating: 4.9, ratingCount: 42,
    },
    {
        id: "p11", slug: "sport-gantel-jufti", title: "Yig'iladigan gantel jufti 2×20 kg",
        price: 720_000, oldPrice: null, marketAvgPrice: 690_000,
        images: [img("dumbbell1")],
        categorySlug: "sport",
        shopSlug: "tez-yetkazish", shopName: "Tez Yetkazish",
        marketName: null, city: "Toshkent",
        stock: 11, isNegotiable: false,
        allowPickup: false, allowDelivery: true, allowInspect: false,
        attributes: { weight: 40, material: "Cho'yan", condition: "Yangi" },
        rating: 4.4, ratingCount: 13,
    },
    {
        id: "p12", slug: "ayollar-qishki-palto", title: "Ayollar uchun qishki palto",
        price: 890_000, oldPrice: 1_100_000, marketAvgPrice: 980_000,
        images: [img("coat1"), img("coat2")],
        categorySlug: "kiyim-ayollar",
        shopSlug: "chorsu-kiyim", shopName: "Chorsu Kiyim Savdo",
        marketName: "Chorsu bozori", city: "Toshkent",
        stock: 15, isNegotiable: true,
        allowPickup: true, allowDelivery: true, allowInspect: false,
        attributes: { size: "M", color: "Bej", material: "Jun", season: "Qish" },
        rating: 4.6, ratingCount: 31,
    },
];

// ── Yordamchilar ────────────────────────────────────────────────────────────

export function mockProductBySlug(slug: string): MockProduct | null {
    return MOCK_PRODUCTS.find(p => p.slug === slug) ?? null;
}

export function mockShopBySlug(slug: string): MockShop | null {
    return MOCK_SHOPS.find(s => s.slug === slug) ?? null;
}

export function mockMarketBySlug(slug: string): MockMarket | null {
    return MOCK_MARKETS.find(m => m.slug === slug) ?? null;
}

export function mockProductsByShop(shopSlug: string): MockProduct[] {
    return MOCK_PRODUCTS.filter(p => p.shopSlug === shopSlug);
}

export function mockShopsByMarket(marketSlug: string): MockShop[] {
    return MOCK_SHOPS.filter(s => s.marketSlug === marketSlug);
}

export function mockProductsByCategory(categorySlug: string): MockProduct[] {
    return MOCK_PRODUCTS.filter(p =>
        p.categorySlug === categorySlug || p.categorySlug.startsWith(categorySlug + "-")
    );
}

export function mockSearch(q: string): MockProduct[] {
    const t = q.trim().toLowerCase();
    if (!t) return MOCK_PRODUCTS;
    return MOCK_PRODUCTS.filter(p =>
        p.title.toLowerCase().includes(t)
        || p.shopName.toLowerCase().includes(t)
        || Object.values(p.attributes).some(v => String(v).toLowerCase().includes(t))
    );
}
