// Nexus chaqiruv — video fon xiralashtirish/almashtirish (MediaPipe Selfie Segmentation).
// Ishlash: kadr → segmentatsiya maskasi → canvas kompozitsiya (odam + blurred/rasm fon) → captureStream.
// WASM va model CDN'dan lazy yuklanadi (dastlabki chaqiruv sekin, keyingi hollarda cache).

import type { ImageSegmenter as ImgSeg, ImageSegmenterResult } from "@mediapipe/tasks-vision";

export type BgEffect = "none" | "blur" | "image";

const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.13/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

let segmenterPromise: Promise<ImgSeg | null> | null = null;

async function loadSegmenter(): Promise<ImgSeg | null> {
    if (segmenterPromise) return segmenterPromise;
    segmenterPromise = (async () => {
        try {
            const mod = await import("@mediapipe/tasks-vision");
            const filesetResolver = await mod.FilesetResolver.forVisionTasks(WASM_ROOT);
            const seg = await mod.ImageSegmenter.createFromOptions(filesetResolver, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
                runningMode: "VIDEO",
                outputCategoryMask: true,
                outputConfidenceMasks: false,
            });
            return seg as unknown as ImgSeg;
        } catch (e) {
            console.warn("Segmenter yuklanmadi:", e);
            return null;
        }
    })();
    return segmenterPromise;
}

export class BackgroundFxPipeline {
    private effect: BgEffect = "none";
    private inputTrack: MediaStreamTrack | null = null;
    private inputVideo: HTMLVideoElement | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private outputStream: MediaStream | null = null;
    private rafId: number | null = null;
    private bgImage: HTMLImageElement | null = null;
    private stopped = false;

    getEffect(): BgEffect { return this.effect; }

    /** Effekt bilan qayta ishlangan MediaStreamni qaytaradi. `none` bo'lsa asl track qaytariladi. */
    async apply(inputTrack: MediaStreamTrack, effect: BgEffect, imageUrl?: string): Promise<MediaStream> {
        this.inputTrack = inputTrack;
        this.effect = effect;
        this.stopped = false;

        if (effect === "none") {
            this.dispose();
            const s = new MediaStream([inputTrack]);
            return s;
        }
        if (effect === "image" && imageUrl) {
            this.bgImage = await loadImage(imageUrl);
        }

        // Video element
        const video = document.createElement("video");
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.srcObject = new MediaStream([inputTrack]);
        await video.play().catch(() => { });
        this.inputVideo = video;

        // Canvas
        const settings = inputTrack.getSettings();
        const w = settings.width ?? 640;
        const h = settings.height ?? 480;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        this.canvas = canvas;

        const seg = await loadSegmenter();
        if (!seg) {
            // Fallback: asl track (segmenter yuklanmadi)
            this.dispose();
            return new MediaStream([inputTrack]);
        }
        const ctx = canvas.getContext("2d", { willReadFrequently: false });
        if (!ctx) {
            this.dispose();
            return new MediaStream([inputTrack]);
        }

        const bgCanvas = document.createElement("canvas");
        bgCanvas.width = w; bgCanvas.height = h;
        const bgCtx = bgCanvas.getContext("2d")!;

        const loop = () => {
            if (this.stopped || !this.inputVideo) return;
            const ts = performance.now();
            try {
                const result: ImageSegmenterResult = seg.segmentForVideo(this.inputVideo, ts);
                const maskArr = result.categoryMask?.getAsUint8Array();
                if (maskArr) {
                    // 1) Fon rasmi/blur canvas'ga
                    if (this.effect === "blur") {
                        bgCtx.filter = "blur(14px)";
                        bgCtx.drawImage(this.inputVideo, 0, 0, w, h);
                        bgCtx.filter = "none";
                    } else if (this.effect === "image" && this.bgImage) {
                        drawCover(bgCtx, this.bgImage, w, h);
                    } else {
                        bgCtx.clearRect(0, 0, w, h);
                    }
                    // 2) Odam maskasi bilan asl kadr ustidan qo'shish
                    ctx.drawImage(bgCanvas, 0, 0, w, h);
                    // Odam qismini asl'dan chizamiz
                    const frame = ctx.getImageData(0, 0, w, h);
                    // Video kadrini alohida canvas'dan olamiz
                    bgCtx.filter = "none";
                    bgCtx.drawImage(this.inputVideo, 0, 0, w, h);
                    const original = bgCtx.getImageData(0, 0, w, h);
                    // MediaPipe: 0 = odam, 255 = fon (float16, category)
                    for (let i = 0, p = 0; i < maskArr.length; i++, p += 4) {
                        if (maskArr[i] === 0) {
                            frame.data[p] = original.data[p];
                            frame.data[p + 1] = original.data[p + 1];
                            frame.data[p + 2] = original.data[p + 2];
                            frame.data[p + 3] = 255;
                        }
                    }
                    ctx.putImageData(frame, 0, 0);
                }
                result.close?.();
            } catch (e) {
                console.warn("segmentForVideo:", e);
            }
            this.rafId = requestAnimationFrame(loop);
        };
        loop();

        const captured = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(24);
        this.outputStream = captured;
        return captured;
    }

    dispose(): void {
        this.stopped = true;
        if (this.rafId != null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
        try { this.inputVideo?.pause(); } catch { }
        try {
            if (this.inputVideo?.srcObject) {
                (this.inputVideo.srcObject as MediaStream).getTracks().forEach(() => { });
            }
        } catch { }
        this.inputVideo = null;
        this.canvas = null;
        this.outputStream = null;
        this.bgImage = null;
    }
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((res, rej) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = url;
    });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number): void {
    const ir = img.width / img.height;
    const cr = w / h;
    let sw: number, sh: number, sx: number, sy: number;
    if (ir > cr) {
        sh = img.height; sw = sh * cr; sy = 0; sx = (img.width - sw) / 2;
    } else {
        sw = img.width; sh = sw / cr; sx = 0; sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}
