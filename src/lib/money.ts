// ALKH Pay — real pul (valyuta) yagona manbai.
// O'zbekiston foydalanuvchilari: so'm (UZS). Xorijiy: dollar (USD).
// "Zij" tushunchasi olib tashlandi — endi real valyuta. (Ichki DB model nomlari
// (Wallet/WalletTransaction) eski qoldi, lekin ular foydalanuvchiga ko'rinmaydi.)

export type Currency = "UZS" | "USD";
export const CURRENCIES: Currency[] = ["UZS", "USD"];
export const DEFAULT_CURRENCY: Currency = "UZS";

// FX kursi: 1 USD = ? UZS. Env bilan yangilanadi (USD_UZS_RATE). MChJ/bank kelganda real manbага ulanadi.
export function usdUzsRate(): number {
    const r = Number(process.env.USD_UZS_RATE);
    return Number.isFinite(r) && r > 0 ? r : 12900;
}

// Valyuta minor birligi: UZS butun, USD 2 kasr. Yaxlitlash shu bo'yicha.
export function roundMoney(amount: number, currency: Currency): number {
    if (currency === "USD") return Math.round(amount * 100) / 100;
    return Math.round(amount); // UZS — tiyin ishlatilmaydi
}

// Foydalanuvchi davlatidan hamyon valyutasi (UZ yoki bo'sh → UZS, aks holda USD).
export function currencyForCountry(country: string | null | undefined): Currency {
    if (!country || country.toUpperCase() === "UZ") return "UZS";
    return "USD";
}

// Valyutalararo o'tkazish.
export function convert(amount: number, from: Currency, to: Currency, rate = usdUzsRate()): number {
    if (from === to) return roundMoney(amount, to);
    if (from === "USD" && to === "UZS") return roundMoney(amount * rate, "UZS");
    if (from === "UZS" && to === "USD") return roundMoney(amount / rate, "USD");
    return roundMoney(amount, to);
}

// Minimal miqdorlar (deposit/transfer/tip).
export function minAmount(currency: Currency): number {
    return currency === "USD" ? 1 : 1000; // $1 yoki 1000 so'm
}
export function maxAmount(currency: Currency): number {
    return currency === "USD" ? 1_000_000 : 10_000_000_000;
}

// Belgi va nom.
export function currencySymbol(currency: Currency): string {
    return currency === "USD" ? "$" : "so'm";
}
export function currencyName(currency: Currency): string {
    return currency === "USD" ? "AQSh dollari" : "O'zbek so'mi";
}

// Formatlash: USD → "$12.50" (oldidan), UZS → "12 000 so'm" (orqasidan, probel bilan).
export function formatMoney(amount: number, currency: Currency): string {
    const n = roundMoney(Number(amount) || 0, currency);
    if (currency === "USD") {
        const s = n.toFixed(2).replace(/\.00$/, "");
        return `$${s}`;
    }
    const s = Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ").replace(/ /g, " ");
    return `${s} so'm`;
}

// Qisqa format (katta sonlar): 1.2M, 12K — belgisiz, faqat son. Belgi alohida qo'shiladi.
export function compactNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(Math.round(n));
}

export function isCurrency(x: unknown): x is Currency {
    return x === "UZS" || x === "USD";
}
