// BN do'kon ish vaqti — "hozir ochiqmi?" hisoblash (FTC qo'ng'iroq gate + badge).
// Toshkent vaqti (UTC+5, DST yo'q). Format erkin: "Dush–Yak 08:00–18:00",
// "Har kuni 07:00–19:00", "Du-Ju 09:00-18:00". Parse bo'lmasa open=null (gate yo'q).

export interface ShopAvailability {
    /** true=ochiq, false=yopiq, null=noma'lum (ish vaqti ko'rsatilmagan/tushunarsiz) */
    open: boolean | null;
    /** Bugungi ish vaqti matni ("08:00–18:00") yoki null */
    todayHours: string | null;
    /** Foydalanuvchiga ko'rsatiladigan qisqa yorliq */
    label: string;
    /** Xom ish vaqti satri */
    raw: string | null;
}

// JS getUTCDay: 0=Yak ... 6=Shan. Uzbek tokenlarini indeksga bog'laymiz.
const DAY_TOKENS: { re: RegExp; idx: number }[] = [
    { re: /yak|воскр|sun/i, idx: 0 },
    { re: /dush|du\b|пон|mon/i, idx: 1 },
    { re: /sesh|se\b|втор|tue/i, idx: 2 },
    { re: /chor|ch\b|сред|wed/i, idx: 3 },
    { re: /pay|pa\b|четв|thu/i, idx: 4 },
    { re: /jum|ju\b|пятн|fri/i, idx: 5 },
    { re: /shan|sha|суб|sat/i, idx: 6 },
];

function dayIndexFrom(token: string): number | null {
    for (const d of DAY_TOKENS) if (d.re.test(token)) return d.idx;
    return null;
}

// Toshkent (UTC+5) hozirgi kun (0-6) va daqiqa (0-1439)
function tashkentNow(): { day: number; minutes: number } {
    const t = new Date(Date.now() + 5 * 3600 * 1000);
    return { day: t.getUTCDay(), minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

function daysInRange(a: number, b: number): Set<number> {
    const out = new Set<number>();
    if (a <= b) for (let d = a; d <= b; d++) out.add(d);
    else { for (let d = a; d <= 6; d++) out.add(d); for (let d = 0; d <= b; d++) out.add(d); }
    return out;
}

export function shopAvailability(workHours: string | null | undefined): ShopAvailability {
    const raw = (workHours ?? "").trim() || null;
    if (!raw) return { open: null, todayHours: null, label: "Ish vaqti ko'rsatilmagan", raw: null };

    const s = raw.replace(/[–—]/g, "-");

    // Vaqt oralig'i: HH:MM - HH:MM
    const tm = s.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!tm) return { open: null, todayHours: null, label: raw, raw };
    const startMin = Number(tm[1]) * 60 + Number(tm[2]);
    const endMin = Number(tm[3]) * 60 + Number(tm[4]);
    const hoursText = `${tm[1].padStart(2, "0")}:${tm[2]}–${tm[3].padStart(2, "0")}:${tm[4]}`;

    // Kunlar to'plami
    let days: Set<number>;
    if (/har\s*kuni|ежедн|daily|everyday/i.test(s)) {
        days = new Set([0, 1, 2, 3, 4, 5, 6]);
    } else {
        // "Dush-Yak" kabi kun oralig'i (vaqtdan oldingi qism)
        const dayPart = s.slice(0, tm.index ?? s.length);
        const rangeMatch = dayPart.match(/([A-Za-zА-Яа-яʼ']+)\s*-\s*([A-Za-zА-Яа-яʼ']+)/);
        if (rangeMatch) {
            const a = dayIndexFrom(rangeMatch[1]);
            const b = dayIndexFrom(rangeMatch[2]);
            days = a != null && b != null ? daysInRange(a, b) : new Set([0, 1, 2, 3, 4, 5, 6]);
        } else {
            const single = dayIndexFrom(dayPart);
            days = single != null ? new Set([single]) : new Set([0, 1, 2, 3, 4, 5, 6]);
        }
    }

    const now = tashkentNow();
    const worksToday = days.has(now.day);
    // Yarim tunni kesib o'tuvchi (masalan 20:00-02:00)
    const inTime = startMin <= endMin
        ? now.minutes >= startMin && now.minutes < endMin
        : now.minutes >= startMin || now.minutes < endMin;
    const open = worksToday && inTime;

    return {
        open,
        todayHours: worksToday ? hoursText : null,
        label: open ? "Hozir ochiq" : worksToday ? `Yopiq · bugun ${hoursText}` : "Bugun dam olish kuni",
        raw,
    };
}
