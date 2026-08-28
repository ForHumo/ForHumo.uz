// LRC formatidan lyrics timing parse qilish.
// Standart LRC: [mm:ss.xx] Line text
// Kengaytirilgan qator boshlanish teglari: [mm:ss] Line
// Metadata teglari: [ti:...] [ar:...] [al:...] [offset:+ms] — parse qilinadi ammo qaytarilmaydi
//
// Chiqadigan format: { lines: [{ timeMs, text, order }...], meta, offsetMs }

export interface LrcLine {
    timeMs: number;      // audio.currentTime * 1000
    text: string;        // "bo'sh matn" = pauza (musiqiy tanaffus)
    order: number;
}

export interface LrcParsed {
    lines: LrcLine[];
    offsetMs: number;
    meta: { title?: string; artist?: string; album?: string };
}

// [mm:ss.xx] yoki [mm:ss.xxx] yoki [mm:ss]  → millisekund
function parseTimestamp(m: string, s: string, ms?: string): number {
    const min = Number(m) || 0;
    const sec = Number(s) || 0;
    const millis = ms ? Number(ms.padEnd(3, "0").slice(0, 3)) : 0;
    return min * 60_000 + sec * 1000 + millis;
}

// [ti:...] [ar:...] [al:...] [offset:...]
const META_RE = /^\[(ti|ar|al|offset):(.+?)\]$/i;
// [mm:ss.xx] yoki [mm:ss.xxx] yoki [mm:ss]  (bir necha timing tegi bir qatorda ham bo'lishi mumkin)
const TIME_RE = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

export function parseLrc(raw: string): LrcParsed {
    if (!raw || typeof raw !== "string") return { lines: [], offsetMs: 0, meta: {} };
    const out: LrcLine[] = [];
    const meta: LrcParsed["meta"] = {};
    let offsetMs = 0;

    const rawLines = raw.replace(/\r\n?/g, "\n").split("\n");
    for (const line of rawLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Meta teglari
        const metaMatch = trimmed.match(META_RE);
        if (metaMatch) {
            const key = metaMatch[1].toLowerCase();
            const val = metaMatch[2].trim();
            if (key === "ti") meta.title = val;
            else if (key === "ar") meta.artist = val;
            else if (key === "al") meta.album = val;
            else if (key === "offset") offsetMs = Math.round(Number(val) || 0);
            continue;
        }

        // Timing teg(lar)i va matn
        const stamps: number[] = [];
        let text = trimmed;
        let m: RegExpExecArray | null;
        // Barcha [mm:ss.xxx] teglarni yig'ib matn qismini qoldiramiz
        TIME_RE.lastIndex = 0;
        while ((m = TIME_RE.exec(trimmed)) !== null) {
            stamps.push(parseTimestamp(m[1], m[2], m[3]));
        }
        if (stamps.length === 0) continue;
        text = trimmed.replace(TIME_RE, "").trim();

        for (const t of stamps) {
            out.push({ timeMs: t, text, order: 0 });
        }
    }

    // Vaqt bo'yicha saralash + offset qo'llash + tartib raqami
    out.sort((a, b) => a.timeMs - b.timeMs);
    const final = out.map((l, i) => ({
        timeMs: Math.max(0, l.timeMs + offsetMs),
        text: l.text.slice(0, 500),
        order: i,
    }));
    return { lines: final, offsetMs, meta };
}

// Karaoke uchun: hozirgi audio vaqtiga mos qator indeksi
// (binary search — 1000+ qator ham tez topiladi)
export function activeLyricIndex(lines: Pick<LrcLine, "timeMs">[], currentMs: number): number {
    if (lines.length === 0) return -1;
    let lo = 0, hi = lines.length - 1;
    if (currentMs < lines[0].timeMs) return -1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (lines[mid].timeMs <= currentMs) lo = mid;
        else hi = mid - 1;
    }
    return lo;
}
