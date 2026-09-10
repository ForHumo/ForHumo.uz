"use client";

// BN AI scan — foydalanuvchi mahsulot rasmini yuklaydi (kamera yoki fayl),
// Vision AI aniqlab, DB'da o'xshash mahsulotlarni topib qaytaradi.

import { useState, useRef, useEffect } from "react";
import {
    Camera, Upload, ScanLine, Loader2, Sparkles, X, ArrowRight, RefreshCw,
} from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnProductCard } from "./bn-product-card";
import { BnEmpty } from "./bn-cards";
import { BnLink } from "./bn-nav";
import type { BnProductDTO } from "@/lib/bn-data";

interface Detected {
    title: string;
    categorySlug: string | null;
    keywords: string[];
    hasProblem: string | null;
}

interface ScanResult {
    ok: boolean;
    detected: Detected | null;
    products: BnProductDTO[];
    reason?: string;
}

export function BnScanClient() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment");

    // Kamera oqimini boshlash / yopish
    async function openCamera(facing: "user" | "environment" = cameraFacing) {
        setErr(null);
        if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
            // getUserMedia mavjud emas — file picker fallback
            cameraInputRef.current?.click();
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            streamRef.current = stream;
            setCameraOpen(true);
            setCameraFacing(facing);
            // Video srcObject'ni useEffect keyingi renderda qo'yadi (video hali mount qilinmagan)
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    void videoRef.current.play().catch(() => { /* noop */ });
                }
            }, 30);
        } catch {
            // Ruxsat berilmadi yoki kamera yo'q — file picker'ga tushamiz
            setErr("Kameraga ruxsat berilmadi. Fayldan tanlashga o'ting.");
            cameraInputRef.current?.click();
        }
    }
    function closeCamera() {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setCameraOpen(false);
    }
    // Component unmount'da to'xtatish
    useEffect(() => () => { closeCamera(); }, []);

    // Snap → Blob → File → upload
    async function snap() {
        const video = videoRef.current;
        if (!video || video.videoWidth === 0) return;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(async blob => {
            if (!blob) return;
            const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
            closeCamera();
            await uploadFile(file);
        }, "image/jpeg", 0.9);
    }

    function flipCamera() {
        closeCamera();
        void openCamera(cameraFacing === "user" ? "environment" : "user");
    }

    async function uploadFile(file: File) {
        setErr(null);
        setUploading(true);
        setResult(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("kind", "scan");
            const r = await fetch("/api/bn/upload", { method: "POST", body: fd });
            const d = await r.json();
            if (!r.ok) {
                if (d?.error === "storage_not_configured") setErr("Rasm yuklash sozlanmagan. Admin bilan bog'laning.");
                else if (r.status === 401) setErr("Kirish talab qilinadi.");
                else setErr(d?.error ?? "Yuklashda xatolik");
                return;
            }
            setImageUrl(d.url);
            await scan(d.url);
        } catch { setErr("Ulanish xatoligi"); }
        finally { setUploading(false); }
    }

    async function scan(url: string) {
        setScanning(true); setErr(null);
        try {
            const r = await fetch("/api/bn/ai/scan", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ imageUrl: url }),
            });
            const d = await r.json();
            if (r.status === 503) setErr("AI hozircha ishlamayapti.");
            else if (!r.ok) setErr(d?.error ?? "Xatolik");
            else setResult(d);
        } catch { setErr("Ulanish xatoligi"); }
        finally { setScanning(false); }
    }

    function reset() {
        setImageUrl(null); setResult(null); setErr(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (cameraInputRef.current) cameraInputRef.current.value = "";
    }

    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            <div className="flex items-center gap-3 mb-2">
                <span
                    className="w-11 h-11 rounded-2xl grid place-items-center flex-shrink-0"
                    style={{ background: BN.goldSoft, color: BN.gold }}
                >
                    <ScanLine className="w-5 h-5" />
                </span>
                <div>
                    <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight leading-none">Skaner</h1>
                    <p className="text-[12.5px] mt-1" style={{ color: BN.text3 }}>
                        Mahsulot rasmini yuklang — AI uni aniqlab, sotayotgan do&apos;konlarni topadi
                    </p>
                </div>
            </div>

            {/* Rasm oldindan ko'rish yoki tugmalar */}
            {!imageUrl ? (
                <div
                    className="mt-6 p-8 rounded-3xl text-center"
                    style={{ background: BN.surface, border: `2px dashed ${BN.borderGold}` }}
                >
                    <span
                        className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-5"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <Sparkles className="w-8 h-8" />
                    </span>
                    <p className="text-[15px] font-black mb-2">Rasmni yuklang yoki suratga oling</p>
                    <p className="text-[13px] max-w-[380px] mx-auto mb-6" style={{ color: BN.text2 }}>
                        AI mahsulotni tanib olib, uni sotayotgan barcha do&apos;konlarni
                        va narxlarini bir zumda ko&apos;rsatadi.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2.5 max-w-[420px] mx-auto">
                        <button
                            onClick={() => openCamera()}
                            disabled={uploading}
                            className="flex items-center justify-center gap-2 flex-1 h-12 rounded-2xl text-[14px] font-black disabled:opacity-60"
                            style={{ background: BN.gold, color: BN.onGold }}
                        >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Camera className="w-4 h-4" /> Kamera</>}
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center justify-center gap-2 flex-1 h-12 rounded-2xl text-[14px] font-black disabled:opacity-60"
                            style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
                        >
                            <Upload className="w-4 h-4" /> Fayldan
                        </button>
                    </div>

                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) void uploadFile(f); }}
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) void uploadFile(f); }}
                    />

                    <p className="text-[11.5px] mt-4" style={{ color: BN.text3 }}>
                        Maks 5 MB. Kamera Chrome/Safari mobil brauzerda ishlaydi.
                    </p>
                </div>
            ) : (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
                    <div
                        className="relative rounded-2xl overflow-hidden aspect-square"
                        style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="Yuklangan" className="w-full h-full object-cover" />
                        <button
                            onClick={reset}
                            aria-label="O'zgartirish"
                            className="absolute top-2 right-2 w-9 h-9 grid place-items-center rounded-full backdrop-blur-sm"
                            style={{ background: BN.glass }}
                        >
                            <X className="w-4 h-4" />
                        </button>
                        {scanning && (
                            <div className="absolute inset-0 grid place-items-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                                <div className="text-center">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" style={{ color: BN.gold }} />
                                    <p className="text-[12.5px] font-bold" style={{ color: "#fff" }}>AI tahlil qilyapti...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        {result?.detected && (
                            <div
                                className="p-4 rounded-2xl mb-4"
                                style={{ background: BN.goldSoft, border: `1px solid ${BN.goldEdge}` }}
                            >
                                <div className="flex items-center gap-2 mb-2" style={{ color: BN.gold }}>
                                    <Sparkles className="w-4 h-4" />
                                    <span className="text-[11.5px] font-black uppercase tracking-wider">AI aniqladi</span>
                                </div>
                                <p className="text-[16px] font-black mb-1">{result.detected.title}</p>
                                {result.detected.categorySlug && (
                                    <BnLink
                                        href={`/k/${result.detected.categorySlug}`}
                                        className="inline-flex items-center gap-1 text-[12.5px] font-bold mt-1"
                                        style={{ color: BN.gold }}
                                    >
                                        Kategoriya: {result.detected.categorySlug}
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </BnLink>
                                )}
                                {result.detected.keywords?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {result.detected.keywords.map(k => (
                                            <span
                                                key={k}
                                                className="px-2 py-0.5 rounded-md text-[11px] font-bold"
                                                style={{ background: BN.surface, color: BN.text2 }}
                                            >
                                                {k}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {result?.reason && (
                            <div className="p-3 rounded-xl text-[12.5px]" style={{ background: BN.errSoft, color: BN.err }}>
                                Rasmni tahlil qilib bo&apos;lmadi: {result.reason}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {err && (
                <div className="mt-4 p-3 rounded-xl text-[13px]" style={{ background: BN.errSoft, color: BN.err }}>
                    {err}
                </div>
            )}

            {/* Kamera overlay — getUserMedia real oqim */}
            {cameraOpen && (
                <div className="fixed inset-0 z-[300] bg-black flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3"
                        style={{ background: "rgba(0,0,0,0.7)" }}>
                        <button onClick={closeCamera} className="w-10 h-10 grid place-items-center rounded-full bg-white/10 text-white">
                            <X className="w-5 h-5" />
                        </button>
                        <div className="text-white text-sm font-bold">Mahsulotni suratga oling</div>
                        <button onClick={flipCamera} className="w-10 h-10 grid place-items-center rounded-full bg-white/10 text-white" aria-label="Kamerani almashtirish">
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                        <video ref={videoRef} className="max-h-full max-w-full" playsInline muted autoPlay />
                        {/* Ramka */}
                        <div className="pointer-events-none absolute inset-8 rounded-3xl"
                            style={{ border: `2px dashed ${BN.gold}`, boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)" }} />
                    </div>
                    <div className="flex items-center justify-center py-5" style={{ background: "rgba(0,0,0,0.85)" }}>
                        <button
                            onClick={snap}
                            className="w-[72px] h-[72px] rounded-full grid place-items-center"
                            style={{ background: "#fff", boxShadow: `0 0 0 4px rgba(255,255,255,0.25)` }}
                            aria-label="Suratga olish"
                        >
                            <div className="w-14 h-14 rounded-full" style={{ background: BN.gold }} />
                        </button>
                    </div>
                </div>
            )}

            {/* Natijalar */}
            {result && result.ok && (
                <>
                    <div className="mt-8 flex items-baseline justify-between">
                        <h2 className="text-[18px] font-black">O&apos;xshash mahsulotlar</h2>
                        <span className="text-[12.5px]" style={{ color: BN.text3 }}>
                            {result.products.length} ta topildi
                        </span>
                    </div>

                    {result.products.length === 0 ? (
                        <BnEmpty
                            icon={<ScanLine className="w-6 h-6" />}
                            title="Bu mahsulot hali BN'da yo'q"
                            text="Sotuvchilar tez orada qo'shishadi. Yoki qidiruvda boshqa nom bilan izlab ko'ring."
                        />
                    ) : (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {result.products.map(p => <BnProductCard key={p.id} p={p} compact />)}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
