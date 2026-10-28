// Ummi poza tizimi — kontekstga mos shaffof poza tanlash.
// 217 poza public/ummi/001.webp..217.webp (shaffof, 256²).
// Katalog + kalit-so'z indeksi + kind/holat/mavsum xaritasi + pickUmmiPose selektori.
// Har joyда (UmmiTip, AI chat, 404, offline, bo'sh holatlar) shu tizim ishlatiladi.

export function ummiPoseUrl(id: number): string {
    const n = Math.min(217, Math.max(1, Math.round(id)));
    return `/ummi/${String(n).padStart(3, "0")}.webp`;
}

// Nomli anchorlar (tez-tez ishlatiladigan pozalar).
export const UMMI = {
    hero: 3, greet: 66, welcome: 67, idea: 17, question: 16, star: 15,
    love: 13, thanks: 85, happy: 5, sad: 40, wow: 51, confused: 65, calm: 60, strong: 89,
    sleep: 25, loading: 139, offline: 144, empty: 146, error: 133, warn: 131,
    success: 142, verified: 149, like: 152, settings: 132, notification: 106, search: 118,
    // modul / amal
    pay: 100, wallet: 120, saving: 104, market: 109, order: 119, esport: 98, medal: 122,
    music: 101, video: 168, chat: 114, knowledge: 111, calendar: 113, id: 123, qr: 124,
    gift: 102, art: 107, document: 117, discover: 186, travel: 157, cook: 179, flower: 215,
    // mavsumiy / diniy
    newyear: 188, navruz: 210, ramadan: 211, spring: 192, summer: 205, autumn: 217, winter: 194,
    womensday: 213, congrats: 216, plov: 200, bread: 206, tea: 198,
} as const;

// Suggestion kind / modul → poza.
const KIND_POSES: Record<string, number> = {
    belis: UMMI.gift, nexus: UMMI.chat, market: UMMI.market, bn: UMMI.order,
    pay: UMMI.pay, esport: UMMI.esport, id: UMMI.id, ai: UMMI.idea,
    profile: UMMI.greet, calendar: UMMI.calendar,
    cart: UMMI.market, pricedrop: UMMI.saving,
};

// UI holat → poza.
const STATE_POSES: Record<string, number> = {
    loading: UMMI.loading, offline: UMMI.offline, empty: UMMI.empty,
    error: UMMI.error, warn: UMMI.warn, success: UMMI.success,
    notfound: UMMI.question, verified: UMMI.verified, like: UMMI.like,
};

// Kayfiyat → poza.
const MOOD_POSES: Record<string, number> = {
    happy: UMMI.happy, sad: UMMI.sad, love: UMMI.love, wow: UMMI.wow,
    confused: UMMI.confused, angry: 39, calm: UMMI.calm, thanks: UMMI.thanks,
    hello: UMMI.greet, idea: UMMI.idea, proud: UMMI.strong,
};

// Kalit-so'z → poza (uz/ru/en). TARTIB MUHIM — birinchi moslik g'olib.
// Avval aniq/mavsumiy/diniy, keyin mavzular, oxirida umumiy kayfiyat.
const KEYWORD_POSES: Array<[RegExp, number]> = [
    // diniy / mavsumiy
    [/ramazon|ramadan|ro.?za|iftor|saharlik|taravih|hayit|hayyit|eid|рамадан|рамазан|ифтар|ораза/i, UMMI.ramadan],
    [/navruz|nawruz|sumalak|навруз|наврӯз|сумаляк/i, UMMI.navruz],
    [/yangi\s?yil|new\s?year|rojdestvo|новый\s?год|рождеств|archa|ёлка|ёлк/i, UMMI.newyear],
    [/8\s?-?\s?mart|xotin.?qizlar|women.?s\s?day|женск|8\s?марта/i, UMMI.womensday],
    [/qor\b|snow|qish\b|winter|зима|снег/i, UMMI.winter],
    [/bahor|spring|весна/i, UMMI.spring],
    [/\byoz\b|summer|лето|жара/i, UMMI.summer],
    [/\bkuz\b|autumn|\bfall\b|осень|листопад/i, UMMI.autumn],
    [/tabrik|qutlu|congrat|поздрав|праздник/i, UMMI.congrats],
    // ovqat / milliy
    [/\bosh\b|plov|palov|плов|ош\b/i, UMMI.plov],
    [/\bnon\b|bread|хлеб|лепёшк|lepesh/i, UMMI.bread],
    [/\bchoy\b|\btea\b|чай|choyxona/i, UMMI.tea],
    [/qahva|coffee|кофе/i, 97],
    [/ovqat|taom|retsept|recipe|oshpaz|cook|pishir|еда|готов|рецепт|кухн/i, UMMI.cook],
    // pul / moliya
    [/pul\b|to.?lov|payment|\bpay\b|karta\b|\bcard\b|день(ги|г)|оплат|платёж/i, UMMI.pay],
    [/hamyon|wallet|balans|balance|кошел|баланс/i, UMMI.wallet],
    [/tejash|jamg.?arma|saving|копил|сбереж/i, UMMI.saving],
    // savdo
    [/xarid|shopping|savat\b|\bcart\b|market|do.?kon|корзин|покупк|магазин/i, UMMI.market],
    [/buyurtma|\border\b|yetkaz|delivery|dostavka|posilka|заказ|доставк|посылк/i, UMMI.order],
    // kontent
    [/musiqa|music|qo.?shiq|\bsong\b|\btrek\b|track|музык|песн|аудио/i, UMMI.music],
    [/\bvideo\b|\bkino\b|\bfilm\b|movie|кино|видео|фильм/i, UMMI.video],
    [/gitara|guitar|гитар/i, 182],
    // sport / eSport
    [/esport|kibersport|turnir|tournament|kubok|trophy|champion|киберспорт|турнир|кубок/i, UMMI.esport],
    [/\bsport\b|futbol|football|\bmatch\b|стадион|футбол|спорт/i, 176],
    [/medal|award|yutuq|achievement|награда|достижен/i, UMMI.medal],
    [/fitnes|gym|mashq|workout|фитнес|тренировк|спортзал/i, 165],
    // bilim / ish
    [/kitob|o.?qish|\bread\b|\bbook\b|ta.?lim|education|\blearn\b|bilim|книг|учеб|образован|знани/i, UMMI.knowledge],
    [/hujjat|document|\bfayl\b|\bfile\b|hisobot|report|документ|файл|отчёт/i, UMMI.document],
    [/\bish\b|\bwork\b|loyiha|project|kod\b|code|работа|проект|код/i, 20],
    // aql / qidiruv / kashf
    [/qidiruv|\bsearch\b|izla|qidir|topish|поиск|найти|искать/i, UMMI.search],
    [/kashf|discover|explore|sayr|открыт|исследов/i, UMMI.discover],
    // sayohat / transport
    [/sayohat|travel|safar|puteshestv|поездк|путешеств|отпуск/i, UMMI.travel],
    [/mashina|\bcar\b|\bavto\b|haydash|машин|авто|вожд/i, 169],
    [/ob.?havo|weather|yomg.?ir|\brain\b|погод|дожд/i, 193],
    // tizim / amal
    [/kalendar|calendar|uchrashuv|meeting|\breja\b|eslatma|reminder|встреч|календар|напоминан/i, UMMI.calendar],
    [/bildirishnoma|notification|xabar\b|уведомл|оповещ/i, UMMI.notification],
    [/sozlama|settings|настрой|параметр/i, UMMI.settings],
    [/xavfsizlik|security|parol|password|himoya|qulf|безопас|защит|парол|замок/i, 112],
    [/profil\b|profile|hisob\b|account|профил|аккаунт/i, UMMI.id],
    [/\bqr\b/i, UMMI.qr],
    [/rasm|surat|\bart\b|chiz|picture|\bdraw\b|рисун|картин|изображен/i, UMMI.art],
    [/\bgul\b|flower|guldasta|цвет|букет/i, UMMI.flower],
    // hissiy / ijtimoiy
    [/sev(gi|aman|ib)|muhabbat|yurak|\bheart\b|\blove\b|любов|сердц|люблю/i, UMMI.love],
    [/rahmat|tashakkur|minnatdor|thanks|thank\s?you|спасиб|благодар/i, UMMI.thanks],
    [/salom|assalom|\bhello\b|\bhi\b|привет|здравств/i, UMMI.greet],
    [/uyqu|\btun\b|\bnight\b|charcha|tired|\bsleep\b|сон\b|спать|устал|ночь/i, UMMI.sleep],
    [/fikr|g.?oya|\bidea\b|taklif|maslahat|tavsiya|совет|идея|предлож/i, UMMI.idea],
    [/savol|question|yordam\b|\bhelp\b|вопрос|помощ|справк/i, UMMI.question],
    [/xursand|xushvaqt|baxtli|\bhappy\b|радост|счастл|рад\b/i, UMMI.happy],
    [/xafa|g.?amgin|\bsad\b|груст|печал|расстро/i, UMMI.sad],
];

/** Matndan mavzuga mos poza (topilmasa 0). */
export function matchTopicPose(text: string | null | undefined): number {
    if (!text) return 0;
    const t = text.toLowerCase();
    for (const [re, pose] of KEYWORD_POSES) if (re.test(t)) return pose;
    return 0;
}

/** Sana bo'yicha mavsumiy default (yo'q bo'lsa 0). Ramazon lunarligi sababli faqat topic orqали. */
export function seasonalPose(date: Date = new Date()): number {
    const m = date.getMonth() + 1, d = date.getDate();
    if ((m === 12 && d >= 24) || (m === 1 && d <= 7)) return UMMI.newyear;      // Yangi yil
    if (m === 3 && d >= 18 && d <= 24) return UMMI.navruz;                       // Navruz
    if (m === 3 && d >= 6 && d <= 9) return UMMI.womensday;                      // 8-mart
    return 0;
}

export interface UmmiCtx {
    pose?: number;        // aniq poza (hamma narsadan ustun)
    topic?: string;       // matndan mavzu topish (AI suhbat, taklif matni...)
    kind?: string;        // modul / suggestion kind
    mood?: string;        // happy|sad|love|...
    state?: string;       // loading|offline|empty|error|success|...
    date?: Date;          // mavsumiy uchun (default: bugun)
    seasonal?: boolean;   // true bo'lsa mavsumiy default qo'llanadi (default: true)
    fallback?: number;    // hech nima mos kelmasa (default: UMMI.hero)
}

/** Kontekstga eng mos poza id. Prioritet: pose>state>topic>kind>mood>mavsum>fallback. */
export function pickUmmiPose(ctx: UmmiCtx = {}): number {
    if (ctx.pose) return ctx.pose;
    if (ctx.state && STATE_POSES[ctx.state]) return STATE_POSES[ctx.state];
    const topicPose = matchTopicPose(ctx.topic);
    if (topicPose) return topicPose;
    if (ctx.kind && KIND_POSES[ctx.kind]) return KIND_POSES[ctx.kind];
    if (ctx.mood && MOOD_POSES[ctx.mood]) return MOOD_POSES[ctx.mood];
    if (ctx.seasonal !== false) { const s = seasonalPose(ctx.date); if (s) return s; }
    return ctx.fallback ?? UMMI.hero;
}

/** Kontekstdan to'g'ridan URL. */
export function pickUmmiPoseUrl(ctx: UmmiCtx = {}): string {
    return ummiPoseUrl(pickUmmiPose(ctx));
}
