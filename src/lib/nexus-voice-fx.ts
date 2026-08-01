// Nexus chaqiruv — mikrofon oqimiga real vaqt effektlar (Web Audio API).
// Ishlash: MediaStream'dan source olib, effekt chain'dan o'tkazib,
// MediaStreamDestinationNode'ga chiqarib, yangi MediaStream qaytariladi.
// Bu track'ni RTCRtpSender.replaceTrack() ga uzatasiz — peer'ga effektli ovoz boradi.

export type VoiceEffect = "none" | "robot" | "echo" | "deep" | "bright";

export interface VoiceFxLabel { id: VoiceEffect; label: string; hint: string }
export const VOICE_FX_LIST: VoiceFxLabel[] = [
    { id: "none", label: "Odatiy", hint: "Effektsiz" },
    { id: "robot", label: "Robot", hint: "Ring modulyator" },
    { id: "echo", label: "Aks-sado", hint: "Kechikish + qaytish" },
    { id: "deep", label: "Chuqur", hint: "Bass kuchli" },
    { id: "bright", label: "Yorqin", hint: "Yuqori chastota" },
];

/** Effekt boshqarma — mavjud graph'ni tozalab qayta qurgan holda ishlaydi. */
export class VoiceFxPipeline {
    private ctx: AudioContext | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private dest: MediaStreamAudioDestinationNode | null = null;
    private inputStream: MediaStream | null = null;
    private current: VoiceEffect = "none";
    private nodesToDisconnect: AudioNode[] = [];

    /**
     * Yangi input stream (mikrofon) qabul qilish. Effekt saqlab qolinadi.
     * Qaytadi: chiqish MediaStream. `none` bo'lsa input'ning o'zi qaytariladi (CPU tejash).
     */
    async setInput(input: MediaStream): Promise<MediaStream> {
        this.inputStream = input;
        if (this.current === "none") {
            this.teardownAudio();
            return input;
        }
        this.buildGraph(this.current);
        return this.dest?.stream ?? input;
    }

    /** Effektni almashtirish. Qaytadi: hozirgi chiqish stream. */
    async setEffect(effect: VoiceEffect): Promise<MediaStream | null> {
        this.current = effect;
        if (!this.inputStream) return null;
        if (effect === "none") {
            this.teardownAudio();
            return this.inputStream;
        }
        this.buildGraph(effect);
        return this.dest?.stream ?? null;
    }

    getCurrent(): VoiceEffect { return this.current; }

    dispose(): void { this.teardownAudio(); }

    private teardownAudio(): void {
        try { for (const n of this.nodesToDisconnect) { try { n.disconnect(); } catch { } } } catch { }
        this.nodesToDisconnect = [];
        try { this.source?.disconnect(); } catch { }
        try { this.dest?.disconnect(); } catch { }
        try { this.ctx?.close(); } catch { }
        this.source = null; this.dest = null; this.ctx = null;
    }

    private buildGraph(effect: VoiceEffect): void {
        if (!this.inputStream) return;
        this.teardownAudio();
        const AC = typeof window !== "undefined"
            ? (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
            : null;
        if (!AC) return;
        const ctx = new AC();
        this.ctx = ctx;
        const src = ctx.createMediaStreamSource(this.inputStream);
        const dst = ctx.createMediaStreamDestination();
        this.source = src; this.dest = dst;

        switch (effect) {
            case "robot": {
                // Ring modulator: input × LFO(50Hz) via GainNode with AudioParam mod
                const mod = ctx.createOscillator();
                mod.type = "sine";
                mod.frequency.value = 50;
                const modGain = ctx.createGain();
                modGain.gain.value = 1;
                mod.connect(modGain.gain);
                const ringGain = ctx.createGain();
                ringGain.gain.value = 0; // gain param modulyator orqali 0..1 oralig'ida tebranadi
                mod.connect(ringGain.gain);
                src.connect(ringGain).connect(dst);
                mod.start();
                this.nodesToDisconnect.push(mod, modGain, ringGain);
                break;
            }
            case "echo": {
                const delay = ctx.createDelay(1.0);
                delay.delayTime.value = 0.28;
                const fb = ctx.createGain();
                fb.gain.value = 0.42;
                const wet = ctx.createGain();
                wet.gain.value = 0.55;
                // dry + wet aralashmasi
                src.connect(dst);            // dry
                src.connect(delay);
                delay.connect(fb);
                fb.connect(delay);           // qaytish loop
                delay.connect(wet).connect(dst);
                this.nodesToDisconnect.push(delay, fb, wet);
                break;
            }
            case "deep": {
                const low = ctx.createBiquadFilter();
                low.type = "lowshelf";
                low.frequency.value = 350;
                low.gain.value = 10;
                const high = ctx.createBiquadFilter();
                high.type = "highshelf";
                high.frequency.value = 2500;
                high.gain.value = -12;
                src.connect(low).connect(high).connect(dst);
                this.nodesToDisconnect.push(low, high);
                break;
            }
            case "bright": {
                const low = ctx.createBiquadFilter();
                low.type = "lowshelf";
                low.frequency.value = 400;
                low.gain.value = -8;
                const high = ctx.createBiquadFilter();
                high.type = "highshelf";
                high.frequency.value = 2000;
                high.gain.value = 10;
                const boost = ctx.createGain();
                boost.gain.value = 1.15;
                src.connect(low).connect(high).connect(boost).connect(dst);
                this.nodesToDisconnect.push(low, high, boost);
                break;
            }
            default: {
                src.connect(dst);
            }
        }
    }
}
