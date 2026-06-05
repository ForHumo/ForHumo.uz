import {
    Smartphone, Laptop, Headphones, Watch, Tv,
    Shirt, ShoppingBag, Baby, Dumbbell,
    Apple, Beef, Milk, Coffee, ShoppingCart,
    Refrigerator, WashingMachine, Zap,
    Sparkles, Scissors,
    BookOpen, GraduationCap,
    Sofa, Lamp, Hammer,
    Bike, Tent, Fish,
    type LucideIcon,
} from "lucide-react";

export interface SubCategory {
    slug: string;
    name: string;
}

export interface Category {
    slug: string;
    name: string;
    icon: LucideIcon;
    color: string;        // accent rang
    subcategories: SubCategory[];
}

export const MARKET_CATEGORIES: Category[] = [
    {
        slug: "elektronika",
        name: "Elektronika",
        icon: Smartphone,
        color: "#3B82F6",
        subcategories: [
            { slug: "telefonlar",       name: "Telefonlar" },
            { slug: "noutbuklar",       name: "Noutbuklar" },
            { slug: "planshetlar",      name: "Planshetlar" },
            { slug: "quloqchinlar",     name: "Quloqchinlar" },
            { slug: "smart-soatlar",    name: "Smart soatlar" },
            { slug: "televizorlar",     name: "Televizorlar" },
            { slug: "fotokameralar",    name: "Fotokameralar" },
            { slug: "aksessuarlar",     name: "Aksessuarlar" },
        ],
    },
    {
        slug: "kiyim",
        name: "Kiyim-kechak",
        icon: Shirt,
        color: "#EC4899",
        subcategories: [
            { slug: "erkaklar",         name: "Erkaklar uchun" },
            { slug: "ayollar",          name: "Ayollar uchun" },
            { slug: "bolalar-kiyim",    name: "Bolalar kiyimi" },
            { slug: "sport-kiyim",      name: "Sport kiyimlari" },
            { slug: "poyabzallar",      name: "Poyabzallar" },
            { slug: "sumkalar",         name: "Sumkalar" },
            { slug: "aksessuarlar-k",   name: "Aksessuarlar" },
        ],
    },
    {
        slug: "oziq-ovqat",
        name: "Oziq-ovqat",
        icon: Apple,
        color: "#10B981",
        subcategories: [
            { slug: "meva-sabzavot",    name: "Meva va sabzavotlar" },
            { slug: "gusht-baliq",      name: "Go'sht va baliq" },
            { slug: "sut-mahsulot",     name: "Sut mahsulotlari" },
            { slug: "non-un",           name: "Non va un mahsulotlari" },
            { slug: "shirinliklar",     name: "Shirinliklar" },
            { slug: "ichimliklar",      name: "Ichimliklar" },
            { slug: "ziravorlar",       name: "Ziravorlar va moshlar" },
            { slug: "tayyor-taomlar",   name: "Tayyor taomlar" },
        ],
    },
    {
        slug: "maishiy-texnika",
        name: "Maishiy texnika",
        icon: Refrigerator,
        color: "#6366F1",
        subcategories: [
            { slug: "sovutgichlar",     name: "Sovutgichlar" },
            { slug: "kir-yuvish",       name: "Kir yuvish mashinalari" },
            { slug: "pechlar",          name: "Pech va plitalar" },
            { slug: "changyutgichlar",  name: "Changyutgichlar" },
            { slug: "havo-tozalagich",  name: "Havo tozalagichlari" },
            { slug: "choynak-toaster",  name: "Choynak va toasterlar" },
        ],
    },
    {
        slug: "gozallik",
        name: "Go'zallik va parvarish",
        icon: Sparkles,
        color: "#F59E0B",
        subcategories: [
            { slug: "parfyumeriya",     name: "Parfyumeriya" },
            { slug: "soch-parvarish",   name: "Soch parvarishi" },
            { slug: "teri-parvarish",   name: "Teri parvarishi" },
            { slug: "makiyaj",          name: "Makiyaj" },
            { slug: "erkaklar-gg",      name: "Erkaklar uchun" },
            { slug: "tish-parvarish",   name: "Tish parvarishi" },
        ],
    },
    {
        slug: "sport",
        name: "Sport va dam olish",
        icon: Dumbbell,
        color: "#EF4444",
        subcategories: [
            { slug: "fitnes",           name: "Fitnes jihozlari" },
            { slug: "velosipedlar",     name: "Velosipedlar" },
            { slug: "suzish",           name: "Suzish uchun" },
            { slug: "turizm",           name: "Turizm va camping" },
            { slug: "jamoat-sporti",    name: "Jamoat sporti" },
        ],
    },
    {
        slug: "kitoblar",
        name: "Kitoblar va ta'lim",
        icon: BookOpen,
        color: "#8B5CF6",
        subcategories: [
            { slug: "ozbek-adabiyot",   name: "O'zbek adabiyoti" },
            { slug: "xorijiy-adabiyot", name: "Xorijiy adabiyot" },
            { slug: "darsliklar",       name: "Darsliklar" },
            { slug: "bolalar-kitob",    name: "Bolalar kitoblari" },
            { slug: "biznes-kitob",     name: "Biznes va rivojlanish" },
        ],
    },
    {
        slug: "mebel",
        name: "Mebel va interyer",
        icon: Sofa,
        color: "#14B8A6",
        subcategories: [
            { slug: "yotoqxona",        name: "Yotoqxona mebellar" },
            { slug: "oshxona-mebel",    name: "Oshxona mebellar" },
            { slug: "yashash-xona",     name: "Yashash xonasi" },
            { slug: "ofis-mebel",       name: "Ofis mebellar" },
            { slug: "dekoratsiya",      name: "Dekoratsiya" },
        ],
    },
    {
        slug: "bolalar",
        name: "Bolalar uchun",
        icon: Baby,
        color: "#F97316",
        subcategories: [
            { slug: "oyinchoqlar",      name: "O'yinchoqlar" },
            { slug: "bolalar-kiyim-2",  name: "Bolalar kiyimi" },
            { slug: "bolalar-taom",     name: "Taom va parvarish" },
            { slug: "maktab",           name: "Maktab jihozlari" },
            { slug: "rivojlantirish",   name: "Rivojlantiruvchi" },
        ],
    },
    {
        slug: "qurilish",
        name: "Qurilish va ta'mirlash",
        icon: Hammer,
        color: "#78716C",
        subcategories: [
            { slug: "asboblar",         name: "Asboblar" },
            { slug: "materiallar",      name: "Qurilish materiallari" },
            { slug: "santexnika",       name: "Santexnika" },
            { slug: "elektr",           name: "Elektr jihozlar" },
            { slug: "bog-parvarishlash",name: "Bog' va parvarishlash" },
        ],
    },
];

export function getCategoryBySlug(slug: string) {
    return MARKET_CATEGORIES.find(c => c.slug === slug);
}
