// Humo AI moduli uchun til lug'ati (uz/ru/en).
// AI chat sahifasi next-intl'dan alohida — o'z aiLang holati bilan ishlaydi (javob tili + UI).
// Yangi UI matni qo'shsang shu yerga 3 tilda yoz va aiT(lang, key) bilan chaqir.

export type AiLang = "uz" | "ru" | "en";

const DICT: Record<string, Record<AiLang, string>> = {
    // Badge'lar
    "badge.new":  { uz: "Yangi",     ru: "Новый",  en: "New" },
    "badge.soon": { uz: "Tez orada", ru: "Скоро",  en: "Soon" },
    "badge.free": { uz: "Bepul",     ru: "Бесплатно", en: "Free" },

    // Model tanlagich
    "model.title":       { uz: "AI model", ru: "ИИ-модель", en: "AI model" },
    "model.premiumNote": {
        uz: "Premium modellar OpenRouter kaliti qo'shilganda ishlaydi",
        ru: "Премиум-модели заработают после добавления ключа OpenRouter",
        en: "Premium models activate once an OpenRouter key is added",
    },
    "model.soonHint": {
        uz: "Hozircha mavjud emas",
        ru: "Пока недоступно",
        en: "Not available yet",
    },

    // Rejim (soon) placeholder
    "mode.soonTitleHint": {
        uz: "Tez orada — eng yaxshi model bilan ishga tushadi",
        ru: "Скоро — запустится с лучшей моделью",
        en: "Coming soon — launching with the best model",
    },
};

export function aiT(lang: AiLang, key: string): string {
    const row = DICT[key];
    if (!row) return key;
    return row[lang] ?? row.uz;
}

// Qurilma/route locale'dan AI tilini aniqlash: ru→ru, en→en, aks holda uz.
export function aiLangFromLocale(locale: string | undefined | null): AiLang {
    return locale === "ru" || locale === "en" ? locale : "uz";
}
