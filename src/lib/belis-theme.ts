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

// Belis manzili — Belis do'koni Toshkent'da
export const BELIS_LOCATION = {
    lat: 41.196833,
    lng: 69.155139,
    address: "Toshkent",
    // Google Maps'da yozish uchun DMS format ham
    dms: `41°11'48.6"N 69°09'18.5"E`,
} as const;

// Belis social havolalari
export const BELIS_SOCIAL = {
    telegramChannel: "https://t.me/belisuz",
    telegramBot: "https://t.me/belisuz_bot",
    instagram: "https://instagram.com/belis.uz",
    website: "https://belis.uz",     // Hozircha aktiv emas — kelajakda
} as const;

// Belis komissiya (sotuvchi vs single — hozir single vendor)
export const BELIS_COMMISSION_PCT = 0;  // Single vendor — Belis o'zi sotadi
