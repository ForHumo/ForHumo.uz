"use client";

// NxImageEditor — DM'da rasm yuborishdan oldin kesish (crop) va aylantirish (rotate).
// react-easy-crop asosida. Confirm → File (image/jpeg) qaytariladi.

import { useState, useCallback, useEffect } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Check, X, RotateCw, Maximize2, Crop as CropIcon, Loader2 } from "lucide-react";

interface Props {
    file: File;
    onCancel: () => void;
    // Confirm — kesilgan yangi File. name = original + "-edited". Aspect'ni saqlaydi.
    onConfirm: (edited: File) => void;
}

const ASPECT_OPTIONS: Array<{ label: string; value: number | null }> = [
    { label: "Erkin", value: null },
    { label: "1:1", value: 1 },
    { label: "4:3", value: 4 / 3 },
    { label: "16:9", value: 16 / 9 },
    { label: "3:4", value: 3 / 4 },
];

async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result ?? ""));
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

// Rasmni crop + rotate qilib canvas'da rasmning yangi File qaytaradi (image/jpeg)
async function renderCropped(imgSrc: string, cropArea: Area, rotation: number, baseName: string): Promise<File> {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = imgSrc;
    });
    // Aylantirilgan bounding box hisoblanadi
    const rad = (rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const bBoxW = image.width * cos + image.height * sin;
    const bBoxH = image.width * sin + image.height * cos;

    // 1-canvas: to'liq aylantirilgan rasm
    const rotated = document.createElement("canvas");
    rotated.width = bBoxW;
    rotated.height = bBoxH;
    const rctx = rotated.getContext("2d")!;
    rctx.translate(bBoxW / 2, bBoxH / 2);
    rctx.rotate(rad);
    rctx.drawImage(image, -image.width / 2, -image.height / 2);

    // 2-canvas: kesilgan qism
    const cropped = document.createElement("canvas");
    cropped.width = cropArea.width;
    cropped.height = cropArea.height;
    const cctx = cropped.getContext("2d")!;
    cctx.drawImage(rotated,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height);

    const blob = await new Promise<Blob | null>(resolve => cropped.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) throw new Error("crop_failed");
    const outName = baseName.replace(/\.[^.]+$/, "") + "-edited.jpg";
    return new File([blob], outName, { type: "image/jpeg", lastModified: Date.now() });
}

export function NxImageEditor({ file, onCancel, onConfirm }: Props) {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [aspect, setAspect] = useState<number | undefined>(undefined);
    const [croppedArea, setCroppedArea] = useState<Area | null>(null);
    const [saving, setSaving] = useState(false);

    // Faylni URL'ga aylantirib beramiz (bir marta, file o'zgarganda)
    useEffect(() => {
        let stop = false;
        fileToDataUrl(file).then(url => { if (!stop) setImgSrc(url); }).catch(() => { if (!stop) setImgSrc(null); });
        return () => { stop = true; };
    }, [file]);

    const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
        setCroppedArea(areaPixels);
    }, []);

    const handleConfirm = async () => {
        if (!imgSrc || !croppedArea) return;
        setSaving(true);
        try {
            const out = await renderCropped(imgSrc, croppedArea, rotation, file.name);
            onConfirm(out);
        } catch { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[230] flex flex-col" style={{ background: "rgba(3,5,15,0.94)", backdropFilter: "blur(6px)" }}>
            {/* Header */}
            <div className="p-3 flex items-center gap-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.20)" }}>
                <button onClick={onCancel} disabled={saving}
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)" }}>
                    <X className="w-4 h-4" style={{ color: "rgba(220,230,255,0.85)" }} />
                </button>
                <div className="flex-1">
                    <h3 className="text-sm font-black" style={{ color: "rgba(230,238,255,0.98)" }}>Rasmni tahrirlash</h3>
                    <p className="text-[11px]" style={{ color: "rgba(140,160,210,0.70)" }}>{file.name}</p>
                </div>
                <button onClick={handleConfirm} disabled={saving || !croppedArea}
                    className="px-4 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "white", boxShadow: "0 4px 16px rgba(43,62,232,0.35)" }}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Yuborish
                </button>
            </div>

            {/* Crop area */}
            <div className="flex-1 relative min-h-0">
                {imgSrc ? (
                    <Cropper
                        image={imgSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        onCropComplete={onCropComplete}
                        cropShape="rect"
                        showGrid
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-3 flex flex-col gap-2 flex-shrink-0" style={{ borderTop: "1px solid rgba(43,62,232,0.20)", background: "rgba(11,18,40,0.85)" }}>
                {/* Aspect ratio chip'lar */}
                <div className="flex items-center gap-1.5 overflow-x-auto nx-scrollbar">
                    <CropIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(160,176,224,0.75)" }} />
                    {ASPECT_OPTIONS.map(a => {
                        const active = (aspect ?? null) === a.value;
                        return (
                            <button key={a.label} onClick={() => setAspect(a.value ?? undefined)}
                                className="flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition"
                                style={active ? {
                                    background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "white",
                                } : {
                                    background: "rgba(43,62,232,0.10)", color: "rgba(200,215,245,0.85)",
                                    border: "1px solid rgba(43,62,232,0.25)",
                                }}>
                                {a.label}
                            </button>
                        );
                    })}
                    <div className="flex-1" />
                    {/* Rotate */}
                    <button onClick={() => setRotation(r => (r + 90) % 360)} title="90° aylantirish"
                        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition hover:brightness-125"
                        style={{ background: "rgba(0,206,200,0.12)", border: "1px solid rgba(0,206,200,0.30)" }}>
                        <RotateCw className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                    </button>
                </div>
                {/* Zoom slider */}
                <div className="flex items-center gap-2 px-1">
                    <Maximize2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(160,176,224,0.70)" }} />
                    <input type="range" min={1} max={3} step={0.05}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(90deg, #00CEC8 0%, #2B3EE8 ${((zoom - 1) / 2) * 100}%, rgba(43,62,232,0.20) ${((zoom - 1) / 2) * 100}%)`,
                        }} />
                    <span className="text-[10px] font-black tabular-nums w-10 text-right"
                        style={{ color: "rgba(220,230,255,0.85)" }}>{Math.round(zoom * 100)}%</span>
                </div>
            </div>
        </div>
    );
}
