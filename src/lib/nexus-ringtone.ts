// Nexus chaqiruv audio — Web Audio API bilan yaratilgan tovushlar.
// Mualliflik huquqi biznikida (dasturiy generatsiya, sample yo'q).
//
// 2 vazifa:
//   1) Ringtone (kelayotgan chaqiruv, callee tomonda) — 5 variant
//   2) Dial tone (chaqirilyapti, caller tomonda) — "tuut tuut" PSTN standarti

export type RingtoneVariant = "signature" | "whisper" | "pulse" | "melody" | "classic";

export const RINGTONE_LABELS: Record<RingtoneVariant, string> = {
    signature: "Nexus Signature",
    whisper: "Yumshoq",
    pulse: "Puls",
    melody: "Kuy",
    classic: "Klassik",
};

export const RINGTONE_DESCRIPTIONS: Record<RingtoneVariant, string> = {
    signature: "Yumshoq arpeggio — Nexus brend ovozi",
    whisper: "Eng past ovozli, xilma-xil chime",
    pulse: "Ritmli puls — o'tkazib yubormaslik uchun",
    melody: "Qisqa 5-notali kuy",
    classic: "An'anaviy telefon signali",
};

// ── AudioContext singleton ────────────────────────────────────────────────
let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (ctx) return ctx;
    try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        return ctx;
    } catch { return null; }
}

// ── Ringtone (callee tomon) ───────────────────────────────────────────────
let ringStopFn: (() => void) | null = null;

/** Yumshoq envelope bilan bitta nota chalish. Attack quick, release long — Apple estetikasi. */
function playNote(audio: AudioContext, freq: number, startAt: number, duration: number, gainNode: GainNode, peak: number = 0.18, type: OscillatorType = "sine"): OscillatorNode {
    const osc = audio.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const noteGain = audio.createGain();
    noteGain.gain.setValueAtTime(0, startAt);
    noteGain.gain.linearRampToValueAtTime(peak, startAt + 0.02);
    noteGain.gain.setValueAtTime(peak, startAt + Math.max(0.05, duration - 0.25));
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(noteGain);
    noteGain.connect(gainNode);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.05);
    return osc;
}

// Variant scheduler'lari — har biri bitta sikl davomiyligini qaytaradi (sekundlarda)
type Schedule = (audio: AudioContext, startAt: number, master: GainNode) => number;

const SCHEDULES: Record<RingtoneVariant, Schedule> = {
    // 1) Signature: E5 → G#5 → B5 arpeggio (E-major triad), yumshoq va ochiq
    signature(audio, t, master) {
        // Notalar: E5=659.25, G#5=830.61, B5=987.77
        playNote(audio, 659.25, t + 0.00, 0.55, master, 0.16, "sine");
        playNote(audio, 830.61, t + 0.28, 0.55, master, 0.16, "sine");
        playNote(audio, 987.77, t + 0.56, 0.90, master, 0.18, "sine");
        // Yumshoq harmonika (triangle) — chuqurlik uchun
        playNote(audio, 329.63, t + 0.56, 0.90, master, 0.06, "triangle");
        return 3.0;   // 3 sekundda takrorlanadi
    },
    // 2) Whisper: bitta yumshoq chime (C5 + G5 birgalikda), juda past ovoz
    whisper(audio, t, master) {
        playNote(audio, 523.25, t + 0.00, 1.40, master, 0.10, "sine");   // C5
        playNote(audio, 783.99, t + 0.10, 1.30, master, 0.08, "sine");   // G5
        return 3.5;
    },
    // 3) Pulse: har 0.6s'da bitta A5 nota — ritmli puls
    pulse(audio, t, master) {
        for (let i = 0; i < 4; i++) {
            playNote(audio, 880, t + i * 0.6, 0.35, master, 0.17, "sine");
        }
        return 3.2;   // 2.4s puls + 0.8s pauza
    },
    // 4) Melody: 5 notali qisqa kuy (D5-F5-A5-F5-D5)
    melody(audio, t, master) {
        const notes = [
            { f: 587.33, d: 0.25 },   // D5
            { f: 698.46, d: 0.25 },   // F5
            { f: 880.00, d: 0.50 },   // A5
            { f: 698.46, d: 0.25 },   // F5
            { f: 587.33, d: 0.75 },   // D5
        ];
        let offset = 0;
        for (const n of notes) {
            playNote(audio, n.f, t + offset, n.d, master, 0.15, "sine");
            offset += n.d;
        }
        return offset + 1.0;   // kuy + pauza
    },
    // 5) Classic: an'anaviy 440+480Hz PSTN chime (eski nomer)
    classic(audio, t, master) {
        for (let i = 0; i < 2; i++) {
            const s = t + i * 0.6;
            playNote(audio, 440, s, 0.4, master, 0.16, "sine");
            playNote(audio, 480, s, 0.4, master, 0.16, "sine");
        }
        return 3.0;
    },
};

/** Cheksiz chaqiruv ovozi (variant tanlanadi). Qaytgan funksiya to'xtatadi. */
export function playRingtone(variant: RingtoneVariant = "signature"): () => void {
    stopRingtone();
    const audio = getCtx();
    if (!audio) return () => { };
    if (audio.state === "suspended") audio.resume().catch(() => { });

    const schedule = SCHEDULES[variant] ?? SCHEDULES.signature;

    const master = audio.createGain();
    master.gain.value = 0.9;   // umumiy ovoz balandligi
    master.connect(audio.destination);

    let stopped = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    // Bir vaqtning o'zida bir necha siklni oldindan rejalashtiramiz (uzluksiz oqim)
    let nextT = audio.currentTime + 0.05;
    const scheduleAhead = () => {
        if (stopped) return;
        const cycleDur = schedule(audio, nextT, master);
        nextT += cycleDur;
    };
    // Boshida 3 sikl (0-3-6-9 s ~ 12s bufer)
    scheduleAhead(); scheduleAhead(); scheduleAhead();
    // Har 5s'da yangi bufer
    intervalId = setInterval(scheduleAhead, 5000);

    ringStopFn = () => {
        if (stopped) return;
        stopped = true;
        if (intervalId) clearInterval(intervalId);
        try { master.gain.cancelScheduledValues(audio.currentTime); master.gain.setValueAtTime(0, audio.currentTime); } catch { }
        try { setTimeout(() => master.disconnect(), 200); } catch { }
        ringStopFn = null;
    };
    return ringStopFn;
}

export function stopRingtone(): void {
    if (ringStopFn) ringStopFn();
}

/** Ringtone'ni bir marta demo qilib eshittirish (2.5 sekund). Selektor UI uchun. */
export function previewRingtone(variant: RingtoneVariant): void {
    const audio = getCtx();
    if (!audio) return;
    if (audio.state === "suspended") audio.resume().catch(() => { });

    const master = audio.createGain();
    master.gain.value = 0.9;
    master.connect(audio.destination);

    const schedule = SCHEDULES[variant] ?? SCHEDULES.signature;
    schedule(audio, audio.currentTime + 0.05, master);
    setTimeout(() => { try { master.disconnect(); } catch { } }, 3200);
}

// ── Dial tone (caller tomon — "tuut tuut") ────────────────────────────────
// PSTN standart: 450Hz + 380Hz aralashma, davomiy pulse
let dialStopFn: (() => void) | null = null;

/** Chaqirilyapti signali (caller uchun). Peer javob berguncha yoki tugmani bosgunga qadar. */
export function playDialTone(): () => void {
    stopDialTone();
    const audio = getCtx();
    if (!audio) return () => { };
    if (audio.state === "suspended") audio.resume().catch(() => { });

    // Sikl: 1s ovoz (450+380Hz) + 4s pauza — Amerika standarti
    // Qisqartirilgan: 1s ovoz + 2s pauza (foydalanuvchi tezroq eshitadi)
    const master = audio.createGain();
    master.gain.value = 0;
    master.connect(audio.destination);

    const osc1 = audio.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = 450;
    osc1.connect(master);

    const osc2 = audio.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 380;
    osc2.connect(master);

    let stopped = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const scheduleCycle = (startAt: number, cycles: number) => {
        const CYCLE = 3.0;
        for (let i = 0; i < cycles; i++) {
            const s = startAt + i * CYCLE;
            // 1 sekund ovoz (fade-in 30ms, hold, fade-out 30ms)
            master.gain.setValueAtTime(0, s);
            master.gain.linearRampToValueAtTime(0.12, s + 0.03);
            master.gain.setValueAtTime(0.12, s + 0.97);
            master.gain.linearRampToValueAtTime(0, s + 1.0);
            // 2 sekund jimlik
            master.gain.setValueAtTime(0, s + 1.0);
        }
    };

    try {
        osc1.start();
        osc2.start();
        scheduleCycle(audio.currentTime, 4);
        intervalId = setInterval(() => {
            if (stopped) return;
            scheduleCycle(audio.currentTime, 4);
        }, 11500);
    } catch { }

    dialStopFn = () => {
        if (stopped) return;
        stopped = true;
        if (intervalId) clearInterval(intervalId);
        try { master.gain.cancelScheduledValues(audio.currentTime); master.gain.setValueAtTime(0, audio.currentTime); } catch { }
        try { osc1.stop(); } catch { }
        try { osc2.stop(); } catch { }
        try { osc1.disconnect(); osc2.disconnect(); master.disconnect(); } catch { }
        dialStopFn = null;
    };
    return dialStopFn;
}

export function stopDialTone(): void {
    if (dialStopFn) dialStopFn();
}
