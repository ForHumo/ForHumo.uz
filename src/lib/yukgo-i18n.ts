// YukGo — server-side xabarlar i18n (push + bot javoblari).
// next-intl request-context'siz ishlashi kerak (background after() / webhook),
// shuning uchun kichik inline map (bir necha satr).

export type YukLang = "uz" | "ru" | "en";

export function normLang(l?: string | null): YukLang {
    const s = (l || "").toLowerCase();
    if (s.startsWith("ru")) return "ru";
    if (s.startsWith("en")) return "en";
    return "uz";
}

const FEED = "https://www.forhumo.uz";
const feedUrl = (L: YukLang) => `${FEED}/${L}/yukgo`;

// ── Push (haydovchiga mos yuk) ──
const P = {
    newCargo: { uz: "Yangi yuk", ru: "Новый груз", en: "New load" },
    matchFound: { uz: "Mos yuk topildi", ru: "Подходящий груз найден", en: "Match found" },
    ton: { uz: "t", ru: "т", en: "t" },
} as const;

export function pushNewCargo(lang: string | null | undefined, from: string, to: string, weight: number | null, cargo: string | null): { title: string; body: string } {
    const L = normLang(lang);
    const title = `${P.newCargo[L]}: ${from} → ${to}`;
    const body = [weight != null ? `${weight} ${P.ton[L]}` : null, cargo].filter(Boolean).join(" · ") || P.matchFound[L];
    return { title, body };
}

// ── Bot javoblari (shaxsiy chat) ──
export function botWelcome(lang: string | null | undefined): string {
    const L = normLang(lang);
    const url = feedUrl(L);
    return {
        uz: `Salom! Men YukGo botiman.\n\nYuk yoki bo'sh mashina e'loningizni shu yerga yuboring — yoki guruhdagi e'lonni forward qiling. Men uni avtomatik ajratib YukGo'ga joylayman.\n\nBarcha e'lonlar: ${url}`,
        ru: `Привет! Я бот YukGo.\n\nОтправьте сюда объявление о грузе или свободной машине — или перешлите объявление из группы. Я автоматически его распознаю и размещу на YukGo.\n\nВсе объявления: ${url}`,
        en: `Hi! I'm the YukGo bot.\n\nSend your cargo or empty-truck listing here — or forward a listing from a group. I'll parse it automatically and post it on YukGo.\n\nAll listings: ${url}`,
    }[L];
}

export function botDuplicate(lang: string | null | undefined): string {
    return {
        uz: "Bu e'lon allaqachon YukGo'da bor.",
        ru: "Это объявление уже есть на YukGo.",
        en: "This listing is already on YukGo.",
    }[normLang(lang)];
}

export function botUnparsable(lang: string | null | undefined): string {
    return {
        uz: "Bu matndan yuk yoki mashina e'lonini ajrata olmadim. To'liqroq yuboring: yo'nalish (qayerdan→qayerga), yuk/mashina, telefon.",
        ru: "Не смог распознать объявление в этом тексте. Отправьте подробнее: маршрут (откуда→куда), груз/машина, телефон.",
        en: "Couldn't parse a listing from this text. Send more detail: route (from→to), cargo/truck, phone.",
    }[normLang(lang)];
}

export function botPosted(lang: string | null | undefined, type: "CARGO" | "TRUCK", route?: string): string {
    const L = normLang(lang);
    const kind = type === "CARGO"
        ? { uz: "Yuk", ru: "Груз", en: "Cargo" }[L]
        : { uz: "Mashina", ru: "Машина", en: "Truck" }[L];
    const head = { uz: "Joylandi", ru: "Размещено", en: "Posted" }[L];
    return `${head} — ${kind}${route ? `: ${route}` : ""}\n${feedUrl(L)}`;
}
