// BN FAZA 2 seed — 6 bozor + 10 kategoriya (attributeSchema) + 6 do'kon + 12 mahsulot.
// Ma'lumot manbai: src/lib/bn-mock.ts (bir xil qiymatlar, jamiyatga bir xil ko'rinish).
//
// Ishga tushirish:
//   DATABASE_URL="postgres://..." node scripts/bn-seed.mjs
//
// Idempotent: bir xil slug — upsert. Qayta ishga tushsa dublikat yaratmaydi.

import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const img = (seed) => `https://picsum.photos/seed/${seed}/800/800`;

// ── BOZORLAR ────────────────────────────────────────────────────────────────
const MARKETS = [
    { slug: "sergeli-avto-bozor",  name: "Sergeli avtomobil bozori",  district: "Sergeli tumani",     address: "Toshkent, Sergeli, Yangi Sergeli ko'chasi", workHours: "Dush–Yak 08:00–18:00", coverUrl: img("sergeli-market"),  sections: ["1-qator", "2-qator", "12-qator", "Dvigatel bo'limi", "Kuzov bo'limi"], order: 1 },
    { slug: "chorsu-bozor",        name: "Chorsu bozori",             district: "Shayxontohur tumani", address: "Toshkent, Chorsu maydoni",                    workHours: "Har kuni 07:00–19:00", coverUrl: img("chorsu-market"),    sections: ["Kiyim rastasi", "Oziq-ovqat", "Idish-tovoq", "Ziravorlar"],           order: 2 },
    { slug: "malika-bozor",        name: "Malika savdo majmuasi",     district: "Yashnobod tumani",    address: "Toshkent, Malika bozori",                     workHours: "Har kuni 09:00–20:00", coverUrl: img("malika-market"),    sections: ["Elektronika", "Telefonlar", "Maishiy texnika", "Aksessuar"],          order: 3 },
    { slug: "abu-sahiy-bozor",     name: "Abu Sahiy ulgurji bozori",  district: "Yangihayot tumani",   address: "Toshkent, Abu Sahiy",                          workHours: "Dush–Shan 06:00–17:00", coverUrl: img("abusahiy-market"), sections: ["A blok", "B blok", "C blok", "Ulgurji zal"],                          order: 4 },
    { slug: "yangiobod-bozor",     name: "Yangiobod bozori",          district: "Bektemir tumani",     address: "Toshkent, Yangiobod",                          workHours: "Har kuni 08:00–18:00", coverUrl: img("yangiobod-market"), sections: ["Qurilish", "Asboblar", "Santexnika", "Elektr"],                       order: 5 },
    { slug: "quyliq-bozor",        name: "Qo'yliq dehqon bozori",     district: "Yashnobod tumani",    address: "Toshkent, Qo'yliq",                            workHours: "Har kuni 06:00–18:00", coverUrl: img("quyliq-market"),    sections: ["Meva-sabzavot", "Go'sht", "Sut mahsulotlari", "Quruq meva"],          order: 6 },
];

// ── KATEGORIYALAR + attributeSchema (universal) ─────────────────────────────
// AttrDef: { key, label, labelRu?, type, options?, required?, filterable?, unit? }
const CATEGORIES = [
    {
        slug: "avto", name: "Avto", nameRu: "Авто", icon: "Car", order: 1,
        attributeSchema: [
            { key: "brand",     label: "Brend",       type: "select",    options: ["Chevrolet", "Daewoo", "Ravon", "Toyota", "Hyundai", "Lada", "BYD", "Kia", "Boshqa"], required: true, filterable: true },
            { key: "model",     label: "Model",       type: "text",      required: true, filterable: true },
            { key: "yearFrom",  label: "Yildan",      type: "number",    filterable: true },
            { key: "yearTo",    label: "Yilgacha",    type: "number",    filterable: true },
            { key: "condition", label: "Holati",      type: "select",    options: ["Yangi", "Ishlatilgan"], required: true, filterable: true },
            { key: "origin",    label: "Asli",        type: "select",    options: ["Original", "Analog", "Restavratsiya"], filterable: true },
        ],
        children: [
            { slug: "avto-ehtiyot-qismlar", name: "Ehtiyot qismlar", icon: "Wrench",    order: 1 },
            { slug: "avto-moy",             name: "Moy va suyuqliklar", icon: "Droplet", order: 2 },
            { slug: "avto-shina",           name: "Shina va disk",    icon: "CircleDot", order: 3 },
            { slug: "avto-aksessuar",       name: "Aksessuar",        icon: "Package",   order: 4 },
        ],
    },
    {
        slug: "elektronika", name: "Elektronika", nameRu: "Электроника", icon: "Smartphone", order: 2,
        attributeSchema: [
            { key: "brand",     label: "Brend",       type: "select",  options: ["Apple", "Samsung", "Xiaomi", "Huawei", "LG", "Sony", "Realme", "Boshqa"], required: true, filterable: true },
            { key: "model",     label: "Model",       type: "text",    required: true, filterable: true },
            { key: "memory",    label: "Xotira",      type: "select",  options: ["32 GB", "64 GB", "128 GB", "256 GB", "512 GB", "1 TB"], filterable: true },
            { key: "color",     label: "Rangi",       type: "text",    filterable: true },
            { key: "condition", label: "Holati",      type: "select",  options: ["Yangi", "Ishlatilgan"], required: true, filterable: true },
            { key: "warranty",  label: "Kafolat",     type: "text" },
        ],
        children: [
            { slug: "elektronika-telefon",   name: "Telefonlar",           icon: "Smartphone", order: 1 },
            { slug: "elektronika-kompyuter", name: "Kompyuter va noutbuk", icon: "Laptop",     order: 2 },
            { slug: "elektronika-maishiy",   name: "Maishiy texnika",      icon: "Tv",         order: 3 },
            { slug: "elektronika-tv",        name: "TV va audio",          icon: "Speaker",    order: 4 },
        ],
    },
    {
        slug: "kiyim", name: "Kiyim va poyabzal", nameRu: "Одежда и обувь", icon: "Shirt", order: 3,
        attributeSchema: [
            { key: "size",     label: "O'lcham",  type: "select",  options: ["XS", "S", "M", "L", "XL", "XXL", "3XL"], required: true, filterable: true },
            { key: "color",    label: "Rangi",    type: "text",    filterable: true },
            { key: "material", label: "Material", type: "text",    filterable: true },
            { key: "season",   label: "Fasl",     type: "select",  options: ["Yoz", "Bahor", "Kuz", "Qish", "Har fasl"], filterable: true },
        ],
        children: [
            { slug: "kiyim-erkaklar", name: "Erkaklar", icon: "User",   order: 1 },
            { slug: "kiyim-ayollar",  name: "Ayollar",  icon: "User",   order: 2 },
            { slug: "kiyim-poyabzal", name: "Poyabzal", icon: "Footprints", order: 3 },
        ],
    },
    {
        slug: "uy", name: "Uy va bog'", nameRu: "Дом и сад", icon: "Sofa", order: 4,
        attributeSchema: [
            { key: "material",  label: "Material",     type: "text", filterable: true },
            { key: "color",     label: "Rangi",        type: "text", filterable: true },
            { key: "length",    label: "Uzunligi",     type: "number", unit: "sm" },
            { key: "assembled", label: "Yig'ilgan",    type: "boolean" },
        ],
        children: [
            { slug: "uy-mebel",   name: "Mebel",   icon: "Sofa",       order: 1 },
            { slug: "uy-oshxona", name: "Oshxona", icon: "UtensilsCrossed", order: 2 },
            { slug: "uy-tekstil", name: "Tekstil", icon: "Bed",        order: 3 },
        ],
    },
    {
        slug: "qurilish", name: "Qurilish", nameRu: "Стройка", icon: "Hammer", order: 5,
        attributeSchema: [
            { key: "brand",     label: "Brend",   type: "text",    filterable: true },
            { key: "power",     label: "Quvvat",  type: "number",  unit: "W", filterable: true },
            { key: "condition", label: "Holati",  type: "select",  options: ["Yangi", "Ishlatilgan"], required: true, filterable: true },
            { key: "warranty",  label: "Kafolat", type: "text" },
        ],
        children: [
            { slug: "qurilish-material",   name: "Qurilish materiallari", icon: "Package",  order: 1 },
            { slug: "qurilish-asbob",      name: "Asboblar",              icon: "Wrench",   order: 2 },
            { slug: "qurilish-santexnika", name: "Santexnika",            icon: "Droplet",  order: 3 },
        ],
    },
    {
        slug: "oziq-ovqat", name: "Oziq-ovqat", nameRu: "Продукты", icon: "ShoppingBasket", order: 6,
        attributeSchema: [
            { key: "brand",   label: "Ishlab chiqaruvchi", type: "text", filterable: true },
            { key: "weight",  label: "Og'irligi",           type: "number", unit: "g" },
            { key: "expiry",  label: "Yaroqlilik muddati",  type: "text" },
        ],
    },
    {
        slug: "bolalar", name: "Bolalar uchun", nameRu: "Для детей", icon: "Baby", order: 7,
        attributeSchema: [
            { key: "ageFrom", label: "Yoshdan", type: "number", unit: "yil", filterable: true },
            { key: "ageTo",   label: "Yoshgacha", type: "number", unit: "yil", filterable: true },
            { key: "brand",   label: "Brend",   type: "text",   filterable: true },
        ],
    },
    {
        slug: "sport", name: "Sport va hordiq", nameRu: "Спорт и отдых", icon: "Dumbbell", order: 8,
        attributeSchema: [
            { key: "weight",    label: "Og'irligi",  type: "number", unit: "kg" },
            { key: "material",  label: "Material",   type: "text" },
            { key: "condition", label: "Holati",     type: "select", options: ["Yangi", "Ishlatilgan"], filterable: true },
        ],
    },
    {
        slug: "gozallik", name: "Go'zallik va salomatlik", nameRu: "Красота и здоровье", icon: "Sparkles", order: 9,
        attributeSchema: [
            { key: "brand",  label: "Brend",     type: "text", filterable: true },
            { key: "volume", label: "Hajmi",     type: "number", unit: "ml" },
            { key: "type",   label: "Turi",      type: "text" },
        ],
    },
    {
        slug: "xizmatlar", name: "Xizmatlar", nameRu: "Услуги", icon: "Wrench", order: 10,
        attributeSchema: [
            { key: "type",     label: "Turi",       type: "text",   filterable: true },
            { key: "duration", label: "Davomiylik", type: "text" },
            { key: "atHome",   label: "Uyda",       type: "boolean", filterable: true },
        ],
    },
];

// ── DO'KONLAR ───────────────────────────────────────────────────────────────
// bn-mock.ts dan bir xil. BnShop model YaTT tafsilotlarini talab qiladi,
// lekin seed uchun to'g'ridan-to'g'ri jadval bilan ishlaymiz (majburiy maydonlarni
// placeholder qilamiz — foydalanuvchi ariza berganda qayta yozadi).
const SHOPS = [
    {
        slug: "jalol-motors", name: "Jalol Motors", logoUrl: img("jalol-logo"),
        tier: "PREMIUM", locationType: "IN_MARKET",
        marketSlug: "sergeli-avto-bozor", marketSection: "12-qator", marketShopNo: "45",
        city: "Toshkent", rating: 4.8, ratingCount: 127, productCount: 84,
        legalType: "YATT", legalName: "Jaloliddin Karimov", innNumber: "seed-innn-jalol-1",
        phone: "+998 90 000 00 01", verified: true, status: "APPROVED",
    },
    {
        slug: "aziz-auto", name: "Aziz Auto Parts", logoUrl: img("aziz-logo"),
        tier: "VERIFIED", locationType: "IN_MARKET",
        marketSlug: "sergeli-avto-bozor", marketSection: "12-qator", marketShopNo: "46",
        city: "Toshkent", rating: 4.6, ratingCount: 89, productCount: 62,
        legalType: "YATT", legalName: "Azizbek Rahmonov", innNumber: "seed-innn-aziz-2",
        phone: "+998 90 000 00 02", verified: true, status: "APPROVED",
    },
    {
        slug: "malika-electronics", name: "Malika Electronics", logoUrl: img("malika-logo"),
        tier: "VERIFIED", locationType: "IN_MARKET",
        marketSlug: "malika-bozor", marketSection: "Telefonlar", marketShopNo: "8",
        city: "Toshkent", rating: 4.7, ratingCount: 204, productCount: 118,
        legalType: "YATT", legalName: "Malika Yusupova", innNumber: "seed-innn-malika-3",
        phone: "+998 90 000 00 03", verified: true, status: "APPROVED",
    },
    {
        slug: "chilonzor-mebel", name: "Chilonzor Mebel", logoUrl: img("mebel-logo"),
        tier: "TRUSTED", locationType: "STANDALONE",
        marketSlug: null, marketSection: null, marketShopNo: null,
        address: "Chilonzor tumani, Bunyodkor ko'chasi 12", city: "Toshkent",
        district: "Chilonzor", branchName: "Shedevr",
        rating: 4.4, ratingCount: 43, productCount: 37,
        legalType: "MCHJ", legalName: 'MChJ "Shedevr Mebel"', innNumber: "seed-innn-shedevr-4",
        phone: "+998 90 000 00 04", verified: false, status: "APPROVED",
    },
    {
        slug: "tez-yetkazish", name: "Tez Yetkazish", logoUrl: img("tez-logo"),
        tier: "NEW", locationType: "ONLINE",
        marketSlug: null, marketSection: null, marketShopNo: null,
        address: null, city: "Toshkent",
        rating: 4.2, ratingCount: 18, productCount: 29,
        legalType: "YATT", legalName: "Sanjar Toshpo'latov", innNumber: "seed-innn-tez-5",
        phone: "+998 90 000 00 05", verified: false, status: "APPROVED",
    },
    {
        slug: "chorsu-kiyim", name: "Chorsu Kiyim Savdo", logoUrl: img("kiyim-logo"),
        tier: "TRUSTED", locationType: "IN_MARKET",
        marketSlug: "chorsu-bozor", marketSection: "Kiyim rastasi", marketShopNo: "112",
        city: "Toshkent", rating: 4.5, ratingCount: 76, productCount: 143,
        legalType: "YATT", legalName: "Nodira Karimova", innNumber: "seed-innn-chorsu-6",
        phone: "+998 90 000 00 06", verified: false, status: "APPROVED",
    },
];

// ── MAHSULOTLAR ─────────────────────────────────────────────────────────────
const PRODUCTS = [
    { slug: "nexia-3-old-tormoz-kolodka",     shopSlug: "jalol-motors",        catSlug: "avto-ehtiyot-qismlar", title: "Chevrolet Nexia 3 old tormoz kolodkasi",           price: 185_000,   oldPrice: 220_000, marketAvgPrice: 210_000, stock: 12, isNegotiable: false, allowDelivery: true,  allowInspect: true,  images: [img("brake1"), img("brake2"), img("brake3")], attributes: { brand: "Chevrolet", model: "Nexia 3", yearFrom: 2015, yearTo: 2020, condition: "Yangi", origin: "Original" } },
    { slug: "damas-radiator",                 shopSlug: "aziz-auto",           catSlug: "avto-ehtiyot-qismlar", title: "Daewoo Damas radiator (suv sovutgich)",            price: 640_000,   oldPrice: null,    marketAvgPrice: 590_000, stock: 3,  isNegotiable: true,  allowDelivery: false, allowInspect: true,  images: [img("radiator1"), img("radiator2")],           attributes: { brand: "Daewoo", model: "Damas", yearFrom: 2010, yearTo: 2024, condition: "Yangi", origin: "Analog" } },
    { slug: "cobalt-amortizator-juft",        shopSlug: "jalol-motors",        catSlug: "avto-ehtiyot-qismlar", title: "Ravon Cobalt old amortizator (juft)",              price: 1_150_000, oldPrice: 1_300_000, marketAvgPrice: 1_240_000, stock: 6, isNegotiable: false, allowDelivery: true, allowInspect: true, images: [img("shock1"), img("shock2")],           attributes: { brand: "Ravon", model: "Cobalt", yearFrom: 2016, yearTo: 2023, condition: "Yangi", origin: "Original" } },
    { slug: "iphone-13-128gb",                shopSlug: "malika-electronics",  catSlug: "elektronika-telefon",  title: "iPhone 13 128GB — ideal holat",                    price: 7_400_000, oldPrice: null,    marketAvgPrice: 7_800_000, stock: 2, isNegotiable: true, allowDelivery: true, allowInspect: true, images: [img("iphone1"), img("iphone2"), img("iphone3")], attributes: { brand: "Apple", model: "iPhone 13", memory: "128 GB", color: "Midnight", condition: "Ishlatilgan", warranty: "3 oy" } },
    { slug: "samsung-a54-256gb",              shopSlug: "malika-electronics",  catSlug: "elektronika-telefon",  title: "Samsung Galaxy A54 256GB yangi",                   price: 4_250_000, oldPrice: 4_600_000, marketAvgPrice: 4_400_000, stock: 7, isNegotiable: false, allowDelivery: true, allowInspect: true, images: [img("samsung1"), img("samsung2")],       attributes: { brand: "Samsung", model: "Galaxy A54", memory: "256 GB", color: "Awesome Violet", condition: "Yangi", warranty: "12 oy" } },
    { slug: "yumshoq-burchak-divan",          shopSlug: "chilonzor-mebel",     catSlug: "uy-mebel",              title: "Yumshoq burchak divan — 3 kishilik",               price: 5_900_000, oldPrice: null,    marketAvgPrice: 6_200_000, stock: 4, isNegotiable: true,  allowDelivery: true, allowInspect: true, images: [img("sofa1"), img("sofa2")],             attributes: { material: "Velur", color: "Kulrang", length: 260, assembled: false } },
    { slug: "erkaklar-kuzgi-kurtka",          shopSlug: "chorsu-kiyim",        catSlug: "kiyim-erkaklar",        title: "Erkaklar uchun kuzgi kurtka",                      price: 385_000,   oldPrice: 450_000, marketAvgPrice: 420_000, stock: 24, isNegotiable: true, allowDelivery: true, allowInspect: false, images: [img("jacket1"), img("jacket2")],         attributes: { size: "L", color: "Qora", material: "Polyester", season: "Kuz" } },
    { slug: "makita-perforator",              shopSlug: "tez-yetkazish",       catSlug: "qurilish-asbob",        title: "Makita perforator HR2470 (original)",              price: 2_780_000, oldPrice: null,    marketAvgPrice: 2_650_000, stock: 5, isNegotiable: false, allowDelivery: true, allowInspect: false, images: [img("drill1"), img("drill2")],           attributes: { brand: "Makita", power: 780, condition: "Yangi", warranty: "12 oy" } },
    { slug: "nexia-2-fara-chap",              shopSlug: "aziz-auto",           catSlug: "avto-ehtiyot-qismlar", title: "Nexia 2 chap fara (yangi)",                        price: 420_000,   oldPrice: null,    marketAvgPrice: 395_000, stock: 8, isNegotiable: true, allowDelivery: true, allowInspect: true, images: [img("light1")],                              attributes: { brand: "Daewoo", model: "Nexia 2", yearFrom: 2008, yearTo: 2016, condition: "Yangi", origin: "Analog" } },
    { slug: "lg-muzlatgich-360l",             shopSlug: "malika-electronics",  catSlug: "elektronika-maishiy",   title: "LG muzlatgich 360L — No Frost",                    price: 8_900_000, oldPrice: 9_800_000, marketAvgPrice: 9_400_000, stock: 3, isNegotiable: true, allowDelivery: true, allowInspect: true, images: [img("fridge1"), img("fridge2")],         attributes: { brand: "LG", volume: 360, color: "Kumush", condition: "Yangi", warranty: "24 oy" } },
    { slug: "sport-gantel-jufti",             shopSlug: "tez-yetkazish",       catSlug: "sport",                 title: "Yig'iladigan gantel jufti 2×20 kg",                price: 720_000,   oldPrice: null,    marketAvgPrice: 690_000, stock: 11, isNegotiable: false, allowDelivery: true, allowInspect: false, images: [img("dumbbell1")],                       attributes: { weight: 40, material: "Cho'yan", condition: "Yangi" } },
    { slug: "ayollar-qishki-palto",           shopSlug: "chorsu-kiyim",        catSlug: "kiyim-ayollar",         title: "Ayollar uchun qishki palto",                       price: 890_000,   oldPrice: 1_100_000, marketAvgPrice: 980_000, stock: 15, isNegotiable: true, allowDelivery: true, allowInspect: false, images: [img("coat1"), img("coat2")],               attributes: { size: "M", color: "Bej", material: "Jun", season: "Qish" } },
];

// ── Yugurish ────────────────────────────────────────────────────────────────

async function seed() {
    console.log("🌱 BN seed boshlandi\n");

    // 1) Bozorlar
    console.log("── Bozorlar (6) ──");
    for (const m of MARKETS) {
        const { slug, ...rest } = m;
        await p.bnMarket.upsert({
            where: { slug },
            update: { ...rest, shopCount: 0 },
            create: { slug, ...rest, shopCount: 0 },
        });
        console.log(`   ✓ ${m.name}`);
    }

    // 2) Kategoriyalar (top-level, keyin children)
    console.log("\n── Kategoriyalar (10 top + subs) ──");
    const catBySlug = new Map();
    for (const c of CATEGORIES) {
        const { children, ...top } = c;
        const created = await p.bnCategory.upsert({
            where: { slug: top.slug },
            update: { name: top.name, nameRu: top.nameRu, icon: top.icon, order: top.order, attributeSchema: top.attributeSchema, isActive: true, parentId: null },
            create: { ...top, isActive: true },
        });
        catBySlug.set(top.slug, created.id);
        console.log(`   ✓ ${top.name}`);
        if (children) {
            for (const ch of children) {
                const sub = await p.bnCategory.upsert({
                    where: { slug: ch.slug },
                    update: { name: ch.name, icon: ch.icon, order: ch.order, parentId: created.id, isActive: true },
                    create: { slug: ch.slug, name: ch.name, icon: ch.icon, order: ch.order, parentId: created.id, isActive: true, attributeSchema: [] },
                });
                catBySlug.set(ch.slug, sub.id);
                console.log(`      └─ ${ch.name}`);
            }
        }
    }

    // 3) Do'konlar — mavjud UserProfile'ga bog'lash. Yo'q bo'lsa placeholder yaratamiz.
    console.log("\n── Do'konlar (6) ──");
    const marketBySlug = Object.fromEntries((await p.bnMarket.findMany({ select: { id: true, slug: true } })).map(x => [x.slug, x.id]));
    const shopBySlug = new Map();

    for (const s of SHOPS) {
        // Har do'kon uchun placeholder UserProfile — kelajakda haqiqiy sotuvchi kelganda
        // ownership o'tkaziladi (ariza -> APPROVED oqimida).
        const profileEmail = `seed-shop-${s.slug}@bn.local`;
        const profile = await p.userProfile.upsert({
            where: { email: profileEmail },
            update: {},
            create: {
                email: profileEmail,
                name:  s.name,
                username: `seed_${s.slug.replace(/-/g, "_")}`.slice(0, 20),
            },
        });

        const marketId = s.marketSlug ? marketBySlug[s.marketSlug] : null;
        const shop = await p.bnShop.upsert({
            where: { slug: s.slug },
            update: {
                name: s.name, logoUrl: s.logoUrl, tier: s.tier, locationType: s.locationType,
                marketId, marketSection: s.marketSection, marketShopNo: s.marketShopNo,
                address: s.address ?? null, city: s.city, status: s.status,
                rating: s.rating, ratingCount: s.ratingCount, productCount: s.productCount,
                phone: s.phone, legalType: s.legalType, legalName: s.legalName,
                approvedAt: new Date(),
            },
            create: {
                slug: s.slug, profileId: profile.id, name: s.name, logoUrl: s.logoUrl,
                tier: s.tier, locationType: s.locationType,
                marketId, marketSection: s.marketSection, marketShopNo: s.marketShopNo,
                address: s.address ?? null, city: s.city, status: s.status,
                rating: s.rating, ratingCount: s.ratingCount, productCount: s.productCount,
                phone: s.phone, phoneVerified: true,
                legalType: s.legalType, legalName: s.legalName, innNumber: s.innNumber,
                approvedAt: new Date(),
            },
        });
        shopBySlug.set(s.slug, shop.id);
        console.log(`   ✓ ${s.name} (${s.tier})`);
    }

    // 4) Bozor shopCount denorm
    for (const [mSlug, mId] of Object.entries(marketBySlug)) {
        const cnt = await p.bnShop.count({ where: { marketId: mId, status: "APPROVED" } });
        await p.bnMarket.update({ where: { id: mId }, data: { shopCount: cnt } });
    }

    // 5) Mahsulotlar
    console.log("\n── Mahsulotlar (12) ──");
    for (const pr of PRODUCTS) {
        const shopId = shopBySlug.get(pr.shopSlug);
        const categoryId = catBySlug.get(pr.catSlug);
        if (!shopId || !categoryId) {
            console.log(`   ✗ ${pr.slug}: shop/cat topilmadi`);
            continue;
        }
        await p.bnProduct.upsert({
            where: { slug: pr.slug },
            update: {
                shopId, categoryId, title: pr.title,
                price: pr.price, oldPrice: pr.oldPrice, marketAvgPrice: pr.marketAvgPrice,
                images: pr.images, attributes: pr.attributes,
                stock: pr.stock, isNegotiable: pr.isNegotiable,
                allowDelivery: pr.allowDelivery, allowInspect: pr.allowInspect,
                isActive: true, hidden: false,
            },
            create: {
                slug: pr.slug, shopId, categoryId, title: pr.title,
                price: pr.price, oldPrice: pr.oldPrice, marketAvgPrice: pr.marketAvgPrice,
                images: pr.images, attributes: pr.attributes,
                stock: pr.stock, isNegotiable: pr.isNegotiable,
                allowPickup: true, allowDelivery: pr.allowDelivery, allowInspect: pr.allowInspect,
                isActive: true, hidden: false,
            },
        });
        console.log(`   ✓ ${pr.title}`);
    }

    // 6) Kategoriya productCount denorm
    const allCats = await p.bnCategory.findMany({ select: { id: true, slug: true } });
    for (const c of allCats) {
        const cnt = await p.bnProduct.count({ where: { categoryId: c.id, isActive: true, hidden: false } });
        await p.bnCategory.update({ where: { id: c.id }, data: { productCount: cnt } });
    }

    // 7) BN admin — Jalol OWNER (username="jalol")
    const jalol = await p.userProfile.findFirst({ where: { username: "jalol" } });
    if (jalol) {
        await p.bnAdmin.upsert({
            where: { profileId: jalol.id },
            update: { role: "OWNER", note: "BN loyiha rahbari (seed)" },
            create: { profileId: jalol.id, role: "OWNER", note: "BN loyiha rahbari (seed)" },
        });
        console.log(`\n── Admin ──\n   ✓ Jalol → OWNER`);
    } else {
        console.log(`\n── Admin ──\n   ⚠ @jalol hali ro'yxatdan o'tmagan — u kelganda BnAdmin qo'l bilan qo'shiladi`);
    }

    console.log("\n✅ BN seed tugadi\n");

    const [m, c, s, pr, a] = await Promise.all([
        p.bnMarket.count(), p.bnCategory.count(), p.bnShop.count(),
        p.bnProduct.count(), p.bnAdmin.count(),
    ]);
    console.log(`Yig'ma: markets=${m} categories=${c} shops=${s} products=${pr} admins=${a}`);
}

seed()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => p.$disconnect());
