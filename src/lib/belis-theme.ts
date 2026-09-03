// Belis brand tokenlar — hashamatli sarpo/sovg'a marketplace.
// Ranglar palitrasi (kunduz mode) — light olive gradient + gold accent.
// UI'da inline style={{ background: BELIS.xxx }} sifatida ishlatiladi
// (BN naqshi bilan bir xil, chunki brand-specific).

export const BELIS = {
    // Fon
    bg:         "#E7EBD7",   // Light Olive — asosiy fon
    surface:    "#F0F2E1",   // Ochroq karta fon (bg'dan yorug'roq)
    surfaceUp:  "#C7CDB2",   // Sage — kartochka, secondary bg
    // Chegara
    border:     "#A6AE8A",   // Olive — divider, border
    borderSoft: "rgba(166,174,138,0.35)",
    // Matn
    text:       "#3A3520",   // Asosiy matn (gold ustidagi dark)
    text2:      "#8E9673",   // Dusty Olive — secondary text
    text3:      "#A6AE8A",   // Muted matn
    // Accent
    gold:       "#D4AF37",   // Asosiy accent — sarlavha, logo, primary
    goldSoft:   "#EBD79A",   // Ochroq gold (hover, chip fon)
    goldDeep:   "#B8951F",   // Chuqurroq gold (active/press)
    onGold:     "#3A3520",   // Gold ustidagi matn (dark contrast)
    // Status
    ok:         "#4A7C59",   // Success (green olive-mos)
    okSoft:     "rgba(74,124,89,0.15)",
    warn:       "#C48D2C",   // Warning (gold-mos)
    err:        "#B23A48",   // Error (deep rose)
    errSoft:    "rgba(178,58,72,0.15)",
} as const;

// Gradient — hero fon uchun
export const BELIS_BG_GRADIENT = "linear-gradient(135deg, #E7EBD7 0%, #C7CDB2 100%)";
export const BELIS_GOLD_GRADIENT = "linear-gradient(135deg, #EBD79A 0%, #D4AF37 50%, #B8951F 100%)";

// Belis manzili — Belis do'koni Toshkent'da (Google Maps'da ro'yxatga olingan)
export const BELIS_LOCATION = {
    lat: 41.196821906796046,
    lng: 69.15528163852059,
    address: "Toshkent",
    dms: `41°11'48.6"N 69°09'18.5"E`,
    // Google Maps ulashish havolasi (mijoz ochib route ola oladi)
    mapsShareUrl: "https://maps.app.goo.gl/AbHUBa991dxo2WVeA",
    // Google Maps embed iframe src — Belis Place ID bilan bog'langan
    mapsEmbedSrc: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1780.5688828740685!2d69.15528163852059!3d41.196821906796046!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38ae6375278d72f7%3A0x2f435b619d127120!2sBelis!5e1!3m2!1suz!2s!4v1788453735060!5m2!1suz!2s",
} as const;

/** Google Maps yo'nalish (routing) URL — istagan lokatsiyadan Belisga. */
export function belisDirectionsUrl(): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${BELIS_LOCATION.lat},${BELIS_LOCATION.lng}&destination_place_id=ChIJ93KNJ3VjrjgRIHESnWFbQy8`;
}

// Belis social havolalari
export const BELIS_SOCIAL = {
    telegramChannel: "https://t.me/belisuz",
    telegramBot: "https://t.me/belisuz_bot",
    instagram: "https://instagram.com/belis.uz",
    website: "https://belis.uz",     // Hozircha aktiv emas — kelajakda
} as const;

// Belis komissiya (sotuvchi vs single — hozir single vendor)
export const BELIS_COMMISSION_PCT = 0;  // Single vendor — Belis o'zi sotadi
