// Karaoke recorder — MediaRecorder wrapper + real-time energy tracking (score uchun)
// Foydalanuvchi mikrofonidan yozib oladi; AnalyserNode bilan volume monitoring.
// Score: recording coverage (necha % vaqt gapirilgan) + average energy stability.

export interface RecorderHandle {
    stop: () => Promise<{ blob: Blob; durationMs: number; score: number; energySamples: number[] }>;
    cancel: () => void;
    onEnergy: (cb: (level: number) => void) => void;   // 0-1 volume (UI vizualizatsiya)
}

export async function startKaraokeRecorder(): Promise<RecorderHandle> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Mikrofon qo'llab-quvvatlanmaydi");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

    // MediaRecorder — codec fallback
    const mime = pickMime();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

    // AnalyserNode — real-time volume
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);

    let energyCb: ((v: number) => void) | null = null;
    const energySamples: number[] = [];
    let rafId = 0;
    const startTs = performance.now();
    function tick() {
        analyser.getByteTimeDomainData(buf);
        // RMS volume (0..1)
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);        // ~0.02-0.3 tipik
        const level = Math.min(1, rms * 4);              // UI uchun kuchaytirish
        energySamples.push(level);
        if (energyCb) energyCb(level);
        rafId = requestAnimationFrame(tick);
    }
    tick();

    rec.start(1000); // 1s chunk

    function cleanup() {
        cancelAnimationFrame(rafId);
        stream.getTracks().forEach(t => t.stop());
        ctx.close().catch(() => { });
    }

    return {
        onEnergy(cb) { energyCb = cb; },
        cancel() {
            try { if (rec.state !== "inactive") rec.stop(); } catch { /* jim */ }
            cleanup();
        },
        stop() {
            return new Promise<{ blob: Blob; durationMs: number; score: number; energySamples: number[] }>(resolve => {
                rec.onstop = () => {
                    const durationMs = performance.now() - startTs;
                    const blob = new Blob(chunks, { type: mime || "audio/webm" });
                    const score = computeScore(energySamples);
                    cleanup();
                    resolve({ blob, durationMs, score, energySamples });
                };
                try { rec.stop(); } catch { cleanup(); resolve({ blob: new Blob(chunks), durationMs: 0, score: 0, energySamples }); }
            });
        },
    };
}

function pickMime(): string | null {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    for (const m of candidates) {
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(m)) return m;
    }
    return null;
}

// Score 0-100:
//   • coverage: activeframes / totalframes (0-60 ball) — nechchi % vaqt gapirilgan
//   • stability: energiya standart og'ishi past bo'lsa (0-25 ball)
//   • loudness: o'rtacha volume yaxshi bo'lsa (0-15 ball) — juda past yoki juda past cezalanadi
function computeScore(samples: number[]): number {
    if (samples.length < 8) return 0;
    const ACTIVE = 0.10;                                 // 10%+ RMS = "gapirmoqda"
    const active = samples.filter(s => s > ACTIVE);
    if (active.length === 0) return 0;

    // 1) coverage
    const coverage = active.length / samples.length;     // 0..1
    const covScore = Math.min(1, coverage / 0.60) * 60;  // 60% coverage = to'liq ball

    // 2) stability — active samples std / mean
    const mean = active.reduce((a, b) => a + b, 0) / active.length;
    let sq = 0;
    for (const s of active) { const d = s - mean; sq += d * d; }
    const std = Math.sqrt(sq / active.length);
    const stabilityScore = Math.max(0, 25 - std * 80);   // std=0 → 25, std=0.31 → 0

    // 3) loudness — mean ~0.2-0.4 yaxshi; juda past → jazoyi
    const loudDist = Math.abs(mean - 0.30);
    const loudScore = Math.max(0, 15 - loudDist * 60);   // mean=0.30 → 15, mean=0.05 or 0.55 → 0

    return Math.round(covScore + stabilityScore + loudScore);
}
