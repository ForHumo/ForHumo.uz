// OBS-uslub scene composer + recorder — Canvas 2D contexti orqali
// Camera + Screen share + Overlay (title/thumb) → single composite MediaStream
// Bu stream LiveKit'ga yuboriladi (video track) + MediaRecorder'ga yoziladi (VOD)

export type SceneLayout = "solo" | "pip" | "screen" | "podcast";

export interface StudioSource {
    camera?: MediaStream | null;                  // getUserMedia video track
    screen?: MediaStream | null;                  // getDisplayMedia video track
}

export interface StudioOverlay {
    title?: string;
    subtitle?: string;
    logo?: HTMLImageElement | null;               // overlay logo (ixtiyoriy)
}

export interface Studio {
    canvas: HTMLCanvasElement;
    stream: MediaStream;                          // composited video stream (25fps)
    setLayout: (l: SceneLayout) => void;
    setSources: (s: StudioSource) => void;
    setOverlay: (o: StudioOverlay) => void;
    stop: () => void;
}

const W = 1280;
const H = 720;
const FPS = 30;

export function createStudio(initial: {
    layout?: SceneLayout;
    sources?: StudioSource;
    overlay?: StudioOverlay;
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
                // Screen — asosiy, camera — o'ng past PiP
                drawCover(ctx, scrVideo, 0, 0, W, H);
                drawPip(ctx, camVideo, W - 320 - 24, H - 180 - 24, 320, 180);
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
        setLayout(l) { layout = l; },
        setSources(s) { sources = { ...s }; refreshSources(); },
        setOverlay(o) { overlay = { ...o }; },
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
    // Qorong'i shadow border
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    roundRect(ctx, x, y, w, h, 12);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();
    // Clipping bilan rounded
    ctx.save();
    roundRect(ctx, x, y, w, h, 12);
    ctx.clip();
    drawCover(ctx, v, x, y, w, h);
    ctx.restore();
    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.30)";
    ctx.lineWidth = 2;
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
