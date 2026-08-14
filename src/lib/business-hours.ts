// Business ish vaqti tekshiruvi va formatlash.
// Hours: [{ day: 0=Ya .. 6=Sha, open: "HH:MM", close: "HH:MM" }]
// Kun yozuvsiz = shu kuni yopiq. Bir kunda 1 dan ko'p yozuv bo'lsa mumkin (tanaffus).

export interface BusinessHourSlot { day: number; open: string; close: string }

const DAY_UZ = ["Ya", "Du", "Se", "Cho", "Pa", "Ju", "Sha"];
const DAY_UZ_FULL = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];

function parseHM(s: string): number | null {
    const m = s?.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = Number(m[1]), mn = Number(m[2]);
    if (h < 0 || h > 23 || mn < 0 || mn > 59) return null;
    return h * 60 + mn;
}

export function normalizeHours(input: unknown): BusinessHourSlot[] {
    if (!Array.isArray(input)) return [];
    const out: BusinessHourSlot[] = [];
    for (const raw of input.slice(0, 40)) {
        if (!raw || typeof raw !== "object") continue;
        const s = raw as { day?: unknown; open?: unknown; close?: unknown };
        if (typeof s.day !== "number" || s.day < 0 || s.day > 6) continue;
        if (typeof s.open !== "string" || typeof s.close !== "string") continue;
        if (parseHM(s.open) === null || parseHM(s.close) === null) continue;
        out.push({ day: s.day, open: s.open, close: s.close });
    }
    return out;
}

export function isOpenNow(hours: BusinessHourSlot[], now: Date = new Date()): boolean {
    const day = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    for (const s of hours) {
        if (s.day !== day) continue;
        const o = parseHM(s.open)!, c = parseHM(s.close)!;
        if (c > o && mins >= o && mins < c) return true;
        if (c <= o && (mins >= o || mins < c)) return true;   // yarim tunda tugaydigan slot
    }
    return false;
}

export function formatHoursShort(hours: BusinessHourSlot[]): string {
    if (hours.length === 0) return "Ish vaqti belgilanmagan";
    const now = new Date();
    const day = now.getDay();
    const today = hours.filter(h => h.day === day);
    if (today.length === 0) return `Bugun (${DAY_UZ_FULL[day]}) yopiq`;
    return `Bugun: ${today.map(h => `${h.open}–${h.close}`).join(", ")}`;
}

export const DAY_LABELS_SHORT = DAY_UZ;
export const DAY_LABELS_FULL = DAY_UZ_FULL;
