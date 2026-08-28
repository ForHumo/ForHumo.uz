// OBS-uslub scene composer + recorder — Canvas 2D contexti orqali
// Camera + Screen share + Overlay (title/thumb) → single composite MediaStream
// Bu stream LiveKit'ga yuboriladi (video track) + MediaRecorder'ga yoziladi (VOD)

export type SceneLayout = "solo" | "pip" | "screen" | "podcast";
export type PipCorner = "br" | "bl" | "tr" | "tl";
export type PipSize = "sm" | "md" | "lg";
// Batch B — Nexus frame ramkalari (camera PiP atrofi)
export type FrameStyle = "none" | "rounded" | "neon" | "gradient" | "brand" | "polaroid";

export interface StudioSource {
    camera?: MediaStream | null;                  // getUserMedia video track
    screen?: MediaStream | null;                  // getDisplayMedia video track
}

export interface StudioOverlay {
    title?: string;
    subtitle?: string;
    logo?: HTMLImageElement | null;               // overlay logo (ixtiyoriy)
    watermark?: HTMLImageElement | null;          // Batch W — pastki-o'ng burchakda logo
}

export interface StudioPip {
    corner?: PipCorner;                           // Batch D — 4 burchakdan
    size?: PipSize;                               // Batch D — 3 o'lcham
    frame?: FrameStyle;                           // Batch B — dekorativ ramka
}

// Batch C — Sahna almashish (transition) turi
export type TransitionKind = "cut" | "fade" | "slide-left" | "slide-right" | "wipe";

export interface Studio {
    canvas: HTMLCanvasElement;
    stream: MediaStream;                          // composited video stream (30fps)
    setLayout: (l: SceneLayout, transition?: TransitionKind) => void;
    setSources: (s: StudioSource) => void;
    setOverlay: (o: StudioOverlay) => void;
    setPip: (p: StudioPip) => void;
    stop: () => void;
}

const W = 1280;
const H = 720;
const FPS = 30;

export function createStudio(initial: {
    layout?: SceneLayout;
    sources?: StudioSource;
    overlay?: StudioOverlay;
    pip?: StudioPip;
}): Studio {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const raw = canvas.getContext("2d");
    if (!raw) throw new Error("Canvas 2D qo'llab-quvvatlanmaydi");
    const ctx: CanvasRenderingContext2D = raw;

    let layout: SceneLayout = initial.layout ?? "solo";
    let sources: StudioSource = { ...(initial.sources ?? {}) };
    let overlay: StudioOverlay = { ...(initial.overlay ?? {}) };
    let pip: StudioPip = { corner: "br", size: "md", frame: "rounded", ...(initial.pip ?? {}) };

    // Batch C — transition state
    let prevLayout: SceneLayout | null = null;
    let transitionStart = 0;
    const TRANSITION_MS = 320;
    let currentTransition: TransitionKind = "cut";

    // Video elementlar (source → canvas o'tkazish)
    const camVideo = document.createElement("video");
    camVideo.muted = true; camVideo.playsInline = true; camVideo.autoplay = true;
    const scrVideo = document.createElement("video");
    scrVideo.muted = true; scrVideo.playsInline = true; scrVideo.autoplay = true;

    function refreshSources() {
        if (sources.camera && camVideo.srcObject !== sources.camera) {
            camVideo.srcObject = sources.camera;
            camVideo.play().catch(() => { });
        }
        if (sources.screen && scrVideo.srcObject !== sources.screen) {
            scrVideo.srcObject = sources.screen;
            scrVideo.play().catch(() => { });
        }
        if (!sources.camera) camVideo.srcObject = null;
        if (!sources.screen) scrVideo.srcObject = null;
    }
    refreshSources();

    // Composite drawing loop
    let running = true;
    function draw() {
        if (!running) return;
        try {
            // 1) Ground: qorong'i (nothing to draw)
            ctx.fillStyle = "#050818";
            ctx.fillRect(0, 0, W, H);

            const hasCam = !!sources.camera && camVideo.readyState >= 2;
            const hasScr = !!sources.screen && scrVideo.readyState >= 2;

            if (layout === "screen" && hasScr) {
                drawCover(ctx, scrVideo, 0, 0, W, H);
            } else if (layout === "pip" && hasScr && hasCam) {
                // Screen — asosiy, kamera — foydalanuvchi tanlagan burchakda
                drawCover(ctx, scrVideo, 0, 0, W, H);
                const size = pip.size ?? "md";
                const pw = size === "sm" ? 240 : size === "lg" ? 400 : 320;
                const ph = Math.round(pw * 9 / 16);
                const margin = 24;
                const corner = pip.corner ?? "br";
                const px = corner === "tl" || corner === "bl" ? margin : W - pw - margin;
                const py = corner === "tl" || corner === "tr" ? margin : H - ph - margin;
                drawPipFramed(ctx, camVideo, px, py, pw, ph, pip.frame ?? "rounded");
            } else if (layout === "podcast" && hasCam) {
                // Podkast — camera markazda katta + neytral fon
                const cx = W / 2, cy = H / 2;
                const size = Math.min(H - 120, 480);
                drawCover(ctx, camVideo, cx - size / 2, cy - size / 2, size, size);
            } else if (hasCam) {
                // Solo — kamera to'liq
                drawCover(ctx, camVideo, 0, 0, W, H);
            } else if (hasScr) {
                drawCover(ctx, scrVideo, 0, 0, W, H);
            } else {
                // Hech qanday source yo'q — placeholder
                ctx.fillStyle = "rgba(139,92,246,0.15)";
                ctx.fillRect(0, 0, W, H);
                ctx.fillStyle = "#fff";
                ctx.font = "bold 48px system-ui, sans-serif";
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText("Efir kutmoqda...", W / 2, H / 2);
            }

            // 2) Overlay bo'yicha title/subtitle
            if (overlay.title) {
                // Yuqori-chap qora gradient + oq matn
                const gradH = 120;
                const grad = ctx.createLinearGradient(0, 0, 0, gradH);
                grad.addColorStop(0, "rgba(5,8,24,0.75)");
                grad.addColorStop(1, "rgba(5,8,24,0)");
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, W, gradH);

                ctx.fillStyle = "#fff";
                ctx.font = "bold 34px system-ui, sans-serif";
                ctx.textAlign = "left"; ctx.textBaseline = "top";
                ctx.fillText(overlay.title.slice(0, 60), 32, 22);
                if (overlay.subtitle) {
                    ctx.fillStyle = "rgba(200,215,245,0.85)";
                    ctx.font = "500 18px system-ui, sans-serif";
                    ctx.fillText(overlay.subtitle.slice(0, 100), 32, 66);
                }
            }
            // Batch C — transition overlay (fade/slide/wipe)
            if (transitionStart > 0) {
                const elapsed = performance.now() - transitionStart;
                if (elapsed < TRANSITION_MS) {
                    const p = elapsed / TRANSITION_MS;
                    if (currentTransition === "fade") {
                        // qora fadeIn-out
                        const opacity = p < 0.5 ? p * 2 : (1 - p) * 2;
                        ctx.fillStyle = `rgba(5,8,24,${(opacity * 0.85).toFixed(3)})`;
                        ctx.fillRect(0, 0, W, H);
                    } else if (currentTransition === "slide-left") {
                        // qora panel chapdan o'ngga
                        const x = -W + W * (p * 2);
                        ctx.fillStyle = "#050818";
                        ctx.fillRect(x, 0, W, H);
                    } else if (currentTransition === "slide-right") {
                        const x = W - W * (p * 2);
                        ctx.fillStyle = "#050818";
                        ctx.fillRect(x, 0, W, H);
                    } else if (currentTransition === "wipe") {
                        // diagonalli wipe
                        ctx.save();
                        ctx.fillStyle = "rgba(5,8,24,0.85)";
                        const wipeW = W * (p < 0.5 ? p * 2 : (1 - p) * 2);
                        ctx.fillRect(0, 0, wipeW, H);
                        ctx.restore();
                    }
                } else {
                    transitionStart = 0;
                    prevLayout = null;
                }
            }

            // Batch W — Watermark (pastki-o'ng, 12% ekran kengligi)
            if (overlay.watermark && overlay.watermark.complete && overlay.watermark.naturalWidth > 0) {
                const wm = overlay.watermark;
                const targetW = W * 0.12;
                const scale = targetW / wm.naturalWidth;
                const wmW = targetW;
                const wmH = wm.naturalHeight * scale;
                ctx.save();
                ctx.globalAlpha = 0.85;
                ctx.shadowColor = "rgba(0,0,0,0.5)";
                ctx.shadowBlur = 8;
                ctx.drawImage(wm, W - wmW - 24, 24, wmW, wmH);
                ctx.restore();
            }

            // Live badge (pastki chap)
            const badgeW = 90, badgeH = 32;
            ctx.fillStyle = "#EF4444";
            roundRect(ctx, 24, H - 24 - badgeH, badgeW, badgeH, 8);
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.font = "bold 14px system-ui, sans-serif";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("● LIVE", 24 + badgeW / 2, H - 24 - badgeH / 2);
        } catch { /* jim */ }
        requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    const stream = canvas.captureStream(FPS);

    return {
        canvas,
        stream,
        setLayout(l, transition = "fade") {
            if (l === layout) return;
            prevLayout = layout;
            currentTransition = transition;
            transitionStart = performance.now();
            layout = l;
        },
        setSources(s) { sources = { ...s }; refreshSources(); },
        setOverlay(o) { overlay = { ...o }; },
        setPip(p) { pip = { ...pip, ...p }; },
        stop() { running = false; stream.getTracks().forEach(t => t.stop()); },
    };
}

// ─── Chizish yordamchi ────────────────────────────────────────────────────────
function drawCover(ctx: CanvasRenderingContext2D, v: HTMLVideoElement, x: number, y: number, w: number, h: number) {
    if (v.videoWidth === 0 || v.videoHeight === 0) return;
    const srcRatio = v.videoWidth / v.videoHeight;
    const dstRatio = w / h;
    let sx = 0, sy = 0, sw = v.videoWidth, sh = v.videoHeight;
    if (srcRatio > dstRatio) {
        // Source kengroq — chap/o'ng qismini kesamiz
        const targetW = v.videoHeight * dstRatio;
        sx = (v.videoWidth - targetW) / 2;
        sw = targetW;
    } else {
        const targetH = v.videoWidth / dstRatio;
        sy = (v.videoHeight - targetH) / 2;
        sh = targetH;
    }
    ctx.drawImage(v, sx, sy, sw, sh, x, y, w, h);
}
function drawPip(ctx: CanvasRenderingContext2D, v: HTMLVideoElement, x: number, y: number, w: number, h: number) {
    drawPipFramed(ctx, v, x, y, w, h, "rounded");
}

// Batch B — Nexus-branded PiP ramkalari
function drawPipFramed(ctx: CanvasRenderingContext2D, v: HTMLVideoElement, x: number, y: number, w: number, h: number, frame: FrameStyle) {
    if (frame === "none") {
        // Ramka yo'q — toza to'rtburchak
        drawCover(ctx, v, x, y, w, h);
        return;
    }

    if (frame === "polaroid") {
        // Polaroid — pastda joy bilan oq fon
        const pad = 10, bottomPad = 34;
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = 22;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = "#fff";
        ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad + bottomPad);
        ctx.restore();
        ctx.save();
        ctx.rect(x, y, w, h);
        ctx.clip();
        drawCover(ctx, v, x, y, w, h);
        ctx.restore();
        // Kaption (streamer nomi joyi)
        ctx.fillStyle = "#050818";
        ctx.font = "bold 14px system-ui, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("● JONLI", x + w / 2, y + h + bottomPad / 2);
        return;
    }

    if (frame === "brand") {
        // Nexus brend: gradient border + Nexus rangda oxirgi chiziq
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.55)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 8;
        roundRect(ctx, x, y, w, h, 14);
        ctx.fillStyle = "#050818";
        ctx.fill();
        ctx.restore();
        ctx.save();
        roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 10);
        ctx.clip();
        drawCover(ctx, v, x + 4, y + 4, w - 8, h - 8);
        ctx.restore();
        // Gradient border (turquoise → blue)
        const gr = ctx.createLinearGradient(x, y, x + w, y + h);
        gr.addColorStop(0, "#00CEC8"); gr.addColorStop(1, "#2B3EE8");
        ctx.strokeStyle = gr; ctx.lineWidth = 3;
        roundRect(ctx, x, y, w, h, 14);
        ctx.stroke();
        // Kichik "N" brand pastda
        ctx.fillStyle = "#00CEC8";
        ctx.fillRect(x + w - 26, y + h - 20, 18, 4);
        return;
    }

    if (frame === "neon") {
        // Neon — pulsing glow
        ctx.save();
        const t = performance.now() / 1000;
        const pulse = 0.6 + Math.sin(t * 3) * 0.4;
        ctx.shadowColor = `rgba(0,206,200,${pulse.toFixed(2)})`;
        ctx.shadowBlur = 26;
        roundRect(ctx, x, y, w, h, 12);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.restore();
        ctx.save();
        roundRect(ctx, x, y, w, h, 12);
        ctx.clip();
        drawCover(ctx, v, x, y, w, h);
        ctx.restore();
        ctx.strokeStyle = "#00CEC8"; ctx.lineWidth = 3;
        roundRect(ctx, x, y, w, h, 12);
        ctx.stroke();
        return;
    }

    if (frame === "gradient") {
        // Gradient border — Nexus qizil-narin
        ctx.save();
        ctx.shadowColor = "rgba(239,68,68,0.55)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 6;
        roundRect(ctx, x, y, w, h, 12);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.restore();
        ctx.save();
        roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 9);
        ctx.clip();
        drawCover(ctx, v, x + 3, y + 3, w - 6, h - 6);
        ctx.restore();
        const gr = ctx.createLinearGradient(x, y, x + w, y);
        gr.addColorStop(0, "#EF4444"); gr.addColorStop(1, "#F97316");
        ctx.strokeStyle = gr; ctx.lineWidth = 3;
        roundRect(ctx, x, y, w, h, 12);
        ctx.stroke();
        return;
    }

    // "rounded" — default
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    roundRect(ctx, x, y, w, h, 12);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, x, y, w, h, 12);
    ctx.clip();
    drawCover(ctx, v, x, y, w, h);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.30)"; ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 12);
    ctx.stroke();
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ─── Recorder ─────────────────────────────────────────────────────────────────
// Composite stream + audio mixin — MediaRecorder bilan VOD yozamiz
export interface StudioRecorder {
    stop: () => Promise<Blob>;
    cancel: () => void;
}

export function startStudioRecorder(compositeVideo: MediaStream, audio: MediaStream | null): StudioRecorder {
    const tracks: MediaStreamTrack[] = compositeVideo.getVideoTracks();
    if (audio) tracks.push(...audio.getAudioTracks());
    const combined = new MediaStream(tracks);
    const mime = pickMime();
    const rec = new MediaRecorder(combined, mime ? { mimeType: mime, videoBitsPerSecond: 4_500_000, audioBitsPerSecond: 128_000 } : { videoBitsPerSecond: 4_500_000, audioBitsPerSecond: 128_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    rec.start(2000);
    return {
        cancel() { try { if (rec.state !== "inactive") rec.stop(); } catch { /* jim */ } },
        stop() {
            return new Promise<Blob>(resolve => {
                rec.onstop = () => resolve(new Blob(chunks, { type: mime || "video/webm" }));
                try { rec.stop(); } catch { resolve(new Blob(chunks)); }
            });
        },
    };
}

function pickMime(): string | null {
    const candidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4;codecs=h264,aac",
        "video/mp4",
    ];
    for (const m of candidates) {
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(m)) return m;
    }
    return null;
}
