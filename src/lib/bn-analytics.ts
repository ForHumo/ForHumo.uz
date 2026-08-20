// Marketing atributsiyasi (UTM + referrer) — birinchi tashrifda saqlanadi,
// signup/buyurtma paytida qayta o'qiladi. Serverless, tashqi xizmatga bog'liq emas.
//
// Saqlanadigan kalitlar (sessionStorage — sessiya ichida, keyin cookie'ga o'tsa bo'ladi):
//   bn:attr:source, bn:attr:medium, bn:attr:campaign, bn:attr:content,
//   bn:attr:term, bn:attr:ref, bn:attr:referrer, bn:attr:landing, bn:attr:at
//
// captureFromLocation() — sahifa yuklanganda chaqiriladi. Faqat UTM yoki ?ref=
// mavjud bo'lsa, YOKI ilk marta (referrer=host emas) atributsiya yozadi.

export interface BnAttribution {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    content: string | null;
    term: string | null;
    ref: string | null;           // referral kod (foydalanuvchi yuborgan link)
    referrer: string | null;      // document.referrer host
    landing: string | null;       // birinchi tushgan sahifa
    at: string | null;            // ISO timestamp
}

const KEYS = {
    source:   "bn:attr:source",
    medium:   "bn:attr:medium",
    campaign: "bn:attr:campaign",
    content:  "bn:attr:content",
    term:     "bn:attr:term",
    ref:      "bn:attr:ref",
    referrer: "bn:attr:referrer",
    landing:  "bn:attr:landing",
    at:       "bn:attr:at",
} as const;

const TTL_DAYS = 30;

function safeStore(): Storage | null {
    if (typeof window === "undefined") return null;
    try { return window.sessionStorage; } catch { return null; }
}

/** Yozib qo'yilgan atributsiyani o'qish (agar bor bo'lsa). */
export function getAttribution(): BnAttribution | null {
    const s = safeStore();
    if (!s) return null;
    const at = s.getItem(KEYS.at);
    if (!at) return null;
    // TTL — 30 kundan eski bo'lsa e'tiborsiz qoldiramiz
    try {
        const age = Date.now() - new Date(at).getTime();
        if (age > TTL_DAYS * 86_400_000) return null;
    } catch { /* ignore */ }
    return {
        source:   s.getItem(KEYS.source),
        medium:   s.getItem(KEYS.medium),
        campaign: s.getItem(KEYS.campaign),
        content:  s.getItem(KEYS.content),
        term:     s.getItem(KEYS.term),
        ref:      s.getItem(KEYS.ref),
        referrer: s.getItem(KEYS.referrer),
        landing:  s.getItem(KEYS.landing),
        at,
    };
}

/** URL'dan UTM va ?ref= parametrlarini yig'ib sessionStorage'ga yozadi.
 *  Faqat birinchi marta (yoki yangi kampaniya bo'lsa) yozadi. */
export function captureFromLocation(): void {
    const s = safeStore();
    if (!s) return;
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const sp = url.searchParams;

    const utmSource   = sp.get("utm_source");
    const utmMedium   = sp.get("utm_medium");
    const utmCampaign = sp.get("utm_campaign");
    const utmContent  = sp.get("utm_content");
    const utmTerm     = sp.get("utm_term");
    const ref         = sp.get("ref") || sp.get("r");

    const hasParams = !!(utmSource || utmMedium || utmCampaign || ref);
    const alreadyStored = !!s.getItem(KEYS.at);

    // Agar sahifada UTM/ref bo'lmasa va allaqachon yozilgan bo'lsa — hech nima qilmaymiz
    if (!hasParams && alreadyStored) return;

    // Referrer (o'zi bo'lmasin)
    let referrer: string | null = null;
    try {
        const r = document.referrer;
        if (r) {
            const rURL = new URL(r);
            if (rURL.host !== window.location.host) {
                referrer = rURL.host;
            }
        }
    } catch { /* ignore */ }

    // Faqat UTM/ref/referrer birinchi marta yozilyapti. Har birini alohida update qilamiz.
    if (utmSource)   s.setItem(KEYS.source, utmSource);
    if (utmMedium)   s.setItem(KEYS.medium, utmMedium);
    if (utmCampaign) s.setItem(KEYS.campaign, utmCampaign);
    if (utmContent)  s.setItem(KEYS.content, utmContent);
    if (utmTerm)     s.setItem(KEYS.term, utmTerm);
    if (ref)         s.setItem(KEYS.ref, ref);

    // Birinchi marta bo'lsa referrer va landing sahifasini ham yozamiz
    if (!alreadyStored) {
        if (referrer)  s.setItem(KEYS.referrer, referrer);
        s.setItem(KEYS.landing, url.pathname);
        s.setItem(KEYS.at, new Date().toISOString());
    } else if (hasParams) {
        // Yangi kampaniya keldi — vaqtni yangilaymiz
        s.setItem(KEYS.at, new Date().toISOString());
    }
}

/** Atributsiyani o'chirish (signup yakunlangandan keyin). */
export function clearAttribution(): void {
    const s = safeStore();
    if (!s) return;
    for (const k of Object.values(KEYS)) s.removeItem(k);
}
