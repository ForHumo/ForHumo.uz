// BN kategoriya nomlari tarjimasi (kontent ma'lumoti, UI matni emas).
// BnCategory'da faqat `name` (uz) va ixtiyoriy `nameRu` bor, `nameEn` yo'q — shuning uchun
// en'da (va nameRu bo'sh ru'da) shu ro'yxat ishlatiladi. Slug bo'yicha; ro'yxatda yo'q
// kategoriya bazadagi asl nomida qoladi. Client va server'da ishlaydi (sof funksiya).

const NAMES: Record<string, { ru: string; en: string }> = {
    "avto":                 { ru: "Авто",                    en: "Auto" },
    "elektronika":          { ru: "Электроника",             en: "Electronics" },
    "kiyim":                { ru: "Одежда и обувь",          en: "Clothing & shoes" },
    "uy":                   { ru: "Дом и сад",               en: "Home & garden" },
    "qurilish":             { ru: "Стройка",                 en: "Construction" },
    "oziq-ovqat":           { ru: "Продукты",                en: "Groceries" },
    "bolalar":              { ru: "Для детей",               en: "Kids" },
    "sport":                { ru: "Спорт и отдых",           en: "Sports & leisure" },
    "gozallik":             { ru: "Красота и здоровье",      en: "Beauty & health" },
    "xizmatlar":            { ru: "Услуги",                  en: "Services" },
    "avto-ehtiyot-qismlar": { ru: "Запчасти",                en: "Spare parts" },
    "avto-moy":             { ru: "Масла и жидкости",        en: "Oils & fluids" },
    "avto-shina":           { ru: "Шины и диски",            en: "Tyres & wheels" },
    "avto-aksessuar":       { ru: "Аксессуары",              en: "Accessories" },
    "avto-tormoz":          { ru: "Тормозная система",       en: "Brakes" },
    "elektronika-telefon":  { ru: "Телефоны",                en: "Phones" },
    "elektronika-kompyuter":{ ru: "Компьютеры и ноутбуки",   en: "Computers & laptops" },
    "elektronika-maishiy":  { ru: "Бытовая техника",         en: "Home appliances" },
    "elektronika-tv":       { ru: "ТВ и аудио",              en: "TV & audio" },
    "kiyim-erkaklar":       { ru: "Мужская одежда",          en: "Men" },
    "kiyim-ayollar":        { ru: "Женская одежда",          en: "Women" },
    "kiyim-poyabzal":       { ru: "Обувь",                   en: "Shoes" },
    "uy-mebel":             { ru: "Мебель",                  en: "Furniture" },
    "uy-oshxona":           { ru: "Кухня",                   en: "Kitchen" },
    "uy-tekstil":           { ru: "Текстиль",                en: "Textiles" },
    "qurilish-material":    { ru: "Стройматериалы",          en: "Building materials" },
    "qurilish-asbob":       { ru: "Инструменты",             en: "Tools" },
    "qurilish-santexnika":  { ru: "Сантехника",              en: "Plumbing" },
};

/** Kategoriya nomi joriy tilda: ru — bazadagi nameRu, bo'lmasa ro'yxat; en — ro'yxat;
 *  topilmasa asl (uz) nom. */
export function bnCategoryName(
    c: { slug?: string | null; name?: string | null; nameRu?: string | null },
    locale: string,
): string {
    const base = c.name ?? "";
    const known = c.slug ? NAMES[c.slug] : undefined;
    if (locale === "ru") return c.nameRu || known?.ru || base;
    if (locale === "en") return known?.en || base;
    return base;
}
