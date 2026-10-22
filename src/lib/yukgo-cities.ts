// YukGo — shahar nomlarini normallashtirish (lotin/kirill/ruscha/imlo variantlari bitta kanonikка).
// "Тошкент" = "Toshkent" = "Ташкент" = "Tashkent" → "toshkent". Mos-yuk match + qidiruv uchun.

// kanonik (lotin-uz, kичик) → variantlar (lowercase)
const CITIES: Record<string, string[]> = {
    // ── O'zbekiston ──
    toshkent: ["toshkent", "тошкент", "ташкент", "tashkent"],
    samarqand: ["samarqand", "самарқанд", "самарканд", "samarkand"],
    buxoro: ["buxoro", "бухоро", "бухара", "bukhara"],
    andijon: ["andijon", "андижон", "андижан", "andijan"],
    fargona: ["fargona", "farg'ona", "fargʻona", "фарғона", "фаргона", "фергана", "fergana"],
    namangan: ["namangan", "наманган"],
    qarshi: ["qarshi", "қарши", "карши", "karshi"],
    nukus: ["nukus", "нукус"],
    urganch: ["urganch", "урганч", "ургенч", "urgench"],
    xiva: ["xiva", "хива", "khiva"],
    termiz: ["termiz", "термиз", "термез"],
    jizzax: ["jizzax", "жиззах", "джизак", "jizzakh"],
    navoiy: ["navoiy", "навоий", "навои", "navoi"],
    guliston: ["guliston", "гулистон", "гулистан"],
    qoqon: ["qoqon", "qo'qon", "qoʻqon", "қўқон", "коканд", "kokand"],
    margilon: ["margilon", "marg'ilon", "margʻilon", "марғилон", "маргилан", "margilan"],
    chirchiq: ["chirchiq", "чирчиқ", "чирчик", "chirchik"],
    angren: ["angren", "ангрен"],
    bekobod: ["bekobod", "бекобод", "бекабад", "bekabad"],
    olmaliq: ["olmaliq", "олмалиқ", "алмалык", "almalyk"],
    shahrisabz: ["shahrisabz", "шаҳрисабз", "шахрисабз"],
    denov: ["denov", "денов"],
    kattaqorgon: ["kattaqorgon", "kattaqo'rg'on", "каттақўрғон", "каттакурган"],
    yangiyol: ["yangiyol", "yangiyo'l", "янгийўл", "янгиюль"],
    xorazm: ["xorazm", "хоразм", "хорезм"],
    sirdaryo: ["sirdaryo", "сирдарё", "сырдарья"],
    surxondaryo: ["surxondaryo", "сурхондарё", "сурхандарья"],
    qashqadaryo: ["qashqadaryo", "қашқадарё", "кашкадарья"],
    // ── Rossiya ──
    moskva: ["moskva", "москва", "moscow", "moskow"],
    peterburg: ["sankt-peterburg", "санкт-петербург", "петербург", "питер", "piter", "spb", "saint petersburg"],
    novosibirsk: ["novosibirsk", "новосибирск"],
    yekaterinburg: ["yekaterinburg", "ekaterinburg", "екатеринбург"],
    kazan: ["kazan", "казань", "qozon"],
    rostov: ["rostov", "ростов", "rostov-na-donu", "ростов-на-дону"],
    krasnodar: ["krasnodar", "краснодар"],
    nizhniy: ["nizhniy novgorod", "нижний новгород", "нижний", "nijniy"],
    ufa: ["ufa", "уфа"],
    chelyabinsk: ["chelyabinsk", "челябинск"],
    samara: ["samara", "самара"],
    volgograd: ["volgograd", "волгоград"],
    voronezh: ["voronezh", "воронеж"],
    perm: ["perm", "пермь"],
    omsk: ["omsk", "омск"],
    tyumen: ["tyumen", "тюмень"],
    saratov: ["saratov", "саратов"],
    // ── CIS ──
    almaty: ["almaty", "алматы", "алма-ата", "almati"],
    astana: ["astana", "астана", "nur-sultan", "нур-султан"],
    shymkent: ["shymkent", "шымкент", "chimkent", "чимкент"],
    bishkek: ["bishkek", "бишкек"],
    dushanbe: ["dushanbe", "душанбе"],
    ashxobod: ["ashgabat", "ашхабад", "aşgabat"],
    boku: ["baku", "баку", "bakı"],
};

// variant → kanonik (teskari xarita, bir marta quriladi)
const REVERSE: Record<string, string> = {};
for (const [canon, vars] of Object.entries(CITIES)) {
    REVERSE[canon] = canon;
    for (const v of vars) REVERSE[v] = canon;
}

function clean(s: string): string {
    return (s || "")
        .toLowerCase()
        .replace(/[''ʻ`]/g, "'")   // apostrof variantlari
        .replace(/\s+/g, " ")
        .trim();
}

// Uzbekcha qo'shimchalarni olib tashlash ("samarqanddan" → "samarqand")
function stripSuffix(s: string): string {
    return s.replace(/(dan|ga|da|dagi|gacha|dek)$/u, "").trim();
}

/** Shahar nomini kanonik shaklga keltiradi (noma'lum bo'lsa — tozalangan kirish). */
export function canonicalCity(name: string): string {
    const c = clean(name);
    if (!c) return "";
    if (REVERSE[c]) return REVERSE[c];
    const stripped = stripSuffix(c);
    if (REVERSE[stripped]) return REVERSE[stripped];
    // qisman: variant kirishning boshida bo'lsa (len>=4, noto'g'ri moslikдан saqlanish)
    for (const [variant, canon] of Object.entries(REVERSE)) {
        if (variant.length >= 4 && (stripped.startsWith(variant) || variant.startsWith(stripped))) return canon;
    }
    return stripped || c;
}

/** Qidiruv uchun: berilgan shaharning barcha ma'lum variantlari (OR-kengaytma). */
export function cityVariants(name: string): string[] {
    const canon = canonicalCity(name);
    if (CITIES[canon]) return [...new Set([canon, ...CITIES[canon]])];
    return [clean(name)].filter(Boolean);
}

/** Ikki shahar bir xil joymi (kanonik solishtirish). */
export function sameCity(a: string, b: string): boolean {
    const ca = canonicalCity(a), cb = canonicalCity(b);
    if (!ca || !cb) return false;
    return ca === cb || ca.includes(cb) || cb.includes(ca);
}
