// O'zbek alifbosi transliteratori: ESKI LOTIN (manba) → KIRILL yoki YANGI LOTIN.
// Maqsad: UI matnini bitta manbada (eski lotin) yozib, foydalanuvchi tanlagan
// alifboда avtomatik ko'rsatish. 3 fayl qo'lda yuritilmaydi.
//
// ⚠️ UI matni uchun (qisqa, cheklangan lug'at). Kirill ~95%+ (chetki holatlar OVERRIDES'да).
// E'lon matnini (user-generated) o'girmaymiz — bu faqat UI.

export type UzScript = "latn" | "cyrl" | "latn-new";

// Apostrof variantlari: ' ' ʻ ` → bitta
const APO = /['‘’ʻ`]/g;

// ── Eski lotin → YANGI lotin (o'→ö, g'→ğ, sh→ş, ch→ç) — deyarli 100% ──
export function toNewLatin(text: string): string {
    return (text || "")
        .replace(/O['‘’ʻ`]/g, "Ö").replace(/o['‘’ʻ`]/g, "ö")
        .replace(/G['‘’ʻ`]/g, "Ğ").replace(/g['‘’ʻ`]/g, "ğ")
        .replace(/SH/g, "Ş").replace(/Sh/g, "Ş").replace(/sh/g, "ş")
        .replace(/CH/g, "Ç").replace(/Ch/g, "Ç").replace(/ch/g, "ç");
}

// ── Eski lotin → KIRILL ──
const DIGRAPHS: [string, string][] = [
    ["o'", "ў"], ["g'", "ғ"], ["sh", "ш"], ["ch", "ч"],
    ["yo", "ё"], ["yu", "ю"], ["ya", "я"], ["ye", "е"], ["ts", "ц"],
];
const SINGLE: Record<string, string> = {
    a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж",
    k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "қ", r: "р", s: "с", t: "т",
    u: "у", v: "в", w: "в", x: "х", y: "й", z: "з", "'": "ъ",
};

// UI chetki holatlari uchun qo'lda tuzatish (kerak bo'lsa to'ldiriladi)
const OVERRIDES: Record<string, string> = {};

function applyCase(latin: string, cyr: string): string {
    if (!latin) return cyr;
    const first = latin[0];
    const isUpperFirst = first === first.toUpperCase() && first !== first.toLowerCase();
    if (!isUpperFirst) return cyr;
    if (latin === latin.toUpperCase()) return cyr.toUpperCase();
    return cyr.charAt(0).toUpperCase() + cyr.slice(1);
}

function cyrWord(word: string): string {
    const s = word.replace(APO, "'");
    let out = "", i = 0;
    while (i < s.length) {
        const two = s.substr(i, 2);
        const low2 = two.toLowerCase();
        // yo'/yu'/ya' = y + o'/u/a' (apostrof unli'dan keyin) → digraf EMAS (y→й, keyin o'→ў)
        const yVowelApo = (low2 === "yo" || low2 === "yu" || low2 === "ya") && s[i + 2] === "'";
        const dg = yVowelApo ? undefined : DIGRAPHS.find(([l]) => l === low2);
        if (dg) { out += applyCase(two, dg[1]); i += 2; continue; }
        const ch = s[i], low = ch.toLowerCase();
        if (low === "e") {
            const prev = i > 0 ? s[i - 1] : "";
            const wordStart = i === 0 || !/[A-Za-z']/.test(prev);
            out += applyCase(ch, wordStart ? "э" : "е");
            i++; continue;
        }
        if (SINGLE[low] !== undefined) { out += applyCase(ch, SINGLE[low]); i++; continue; }
        out += ch; i++;  // bo'shliq/raqam/belgi — o'zgarmaydi
    }
    return out;
}

export function toCyrillic(text: string): string {
    const t = text || "";
    if (OVERRIDES[t]) return OVERRIDES[t];
    // so'z bo'yicha (OVERRIDES so'z darajasida ham tekshiriladi)
    return t.split(/(\s+)/).map(tok => /^\s+$/.test(tok) ? tok : (OVERRIDES[tok] ?? cyrWord(tok))).join("");
}

/** Umumiy: tanlangan alifboga o'girish (latn = o'zgarmaydi). */
export function convertScript(text: string, script: UzScript): string {
    if (script === "cyrl") return toCyrillic(text);
    if (script === "latn-new") return toNewLatin(text);
    return text;
}
