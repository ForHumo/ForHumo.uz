// Nexus chaqiruv ringtoni — Web Audio API (fayl yuklab olish shart emas).
// Telegramnikiga o'xshash "ring-ring" naqshi: 2 marta ovoz + pauza, cheksiz.
// Autoplay policy: birinchi foydalanuvchi harakati bo'lmaguncha AudioContext yopiq bo'lishi mumkin.

let ctx: AudioContext | null = null;
let stopFn: (() => void) | null = null;

function getCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (ctx) return ctx;
    try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        return ctx;
    } catch {
        return null;
    }
}

/** Cheksiz chaqiruv ovozi. Yopish uchun qaytgan funksiyani chaqiring yoki `stopRingtone()`. */
export function playRingtone(): () => void {
    stopRingtone();
    const audio = getCtx();
    if (!audio) return () => { };
    if (audio.state === "suspended") audio.resume().catch(() => { });

    // Naqsh: [beep 0.4s @ 440Hz, silence 0.2s, beep 0.4s @ 440Hz, silence 2s] takrorlanadi
    const gain = audio.createGain();
    gain.gain.value = 0;
    gain.connect(audio.destination);

    const osc1 = audio.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = 440;
    osc1.connect(gain);

    const osc2 = audio.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 480;
    osc2.connect(gain);

    let stopped = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const schedule = (t: number) => {
        const CYCLE = 3.0;
        for (let i = 0; i < 4; i++) {
            const s = t + i * CYCLE;
            gain.gain.setValueAtTime(0, s);
            gain.gain.linearRampToValueAtTime(0.18, s + 0.03);
            gain.gain.setValueAtTime(0.18, s + 0.4);
            gain.gain.linearRampToValueAtTime(0, s + 0.43);
            gain.gain.setValueAtTime(0, s + 0.6);
            gain.gain.linearRampToValueAtTime(0.18, s + 0.63);
            gain.gain.setValueAtTime(0.18, s + 1.0);
            gain.gain.linearRampToValueAtTime(0, s + 1.03);
        }
    };

    try {
        osc1.start();
        osc2.start();
        schedule(audio.currentTime);
        // Har 12 sekundda yangi 4 sikl rejalashtiramiz
        intervalId = setInterval(() => {
            if (stopped) return;
            schedule(audio.currentTime);
        }, 11500);
    } catch {
        // start() ikkinchi marta chaqirilsa ba'zi brauzerlarda xato
    }

    stopFn = () => {
        if (stopped) return;
        stopped = true;
        if (intervalId) clearInterval(intervalId);
        try { gain.gain.cancelScheduledValues(audio.currentTime); gain.gain.setValueAtTime(0, audio.currentTime); } catch { }
        try { osc1.stop(); } catch { }
        try { osc2.stop(); } catch { }
        try { osc1.disconnect(); osc2.disconnect(); gain.disconnect(); } catch { }
        stopFn = null;
    };
    return stopFn;
}

export function stopRingtone(): void {
    if (stopFn) stopFn();
}
