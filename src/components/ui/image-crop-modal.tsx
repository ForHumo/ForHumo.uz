"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

interface Props {
    imageSrc: string;           // object URL or data URL of the selected file
    onConfirm: (blob: Blob) => void;
    onCancel: () => void;
}

async function getCroppedBlob(src: string, crop: Area, size = 400): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d")!;
            // Circular clip
            ctx.save();
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, size, size);
            ctx.restore();
            canvas.toBlob(
                (b) => (b ? resolve(b) : reject(new Error("canvas empty"))),
                "image/jpeg",
                0.92,
            );
        };
        img.onerror = reject;
        img.crossOrigin = "anonymous";
        img.src = src;
    });
}

export function ImageCropModal({ imageSrc, onConfirm, onCancel }: Props) {
    const t = useTranslations("Onboarding");
    const tCommon = useTranslations("Common");
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [working, setWorking] = useState(false);

    const onCropComplete = useCallback((_: Area, pix: Area) => {
        setCroppedAreaPixels(pix);
    }, []);

    async function handleConfirm() {
        if (!croppedAreaPixels) return;
        setWorking(true);
        try {
            const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
            onConfirm(blob);
        } finally {
            setWorking(false);
        }
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-sm bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-border/60">
                        <h3 className="text-base font-bold text-foreground">{t("crop_title")}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("crop_hint")}</p>
                    </div>

                    {/* Crop area — square, 1:1 circle */}
                    <div className="relative bg-black" style={{ height: 320 }}>
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                            style={{
                                containerStyle: { background: "#000" },
                                cropAreaStyle: {
                                    border: "2px solid rgba(59,130,246,0.8)",
                                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                                },
                            }}
                        />
                    </div>

                    {/* Zoom slider */}
                    <div className="px-5 py-3 flex items-center gap-3 border-b border-border/60">
                        <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.01}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1 accent-blue-500 cursor-pointer"
                        />
                        <svg className="w-5 h-5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10h-6" />
                        </svg>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 p-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 h-10 rounded-xl border border-border/60 hover:bg-muted/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
                        >
                            {tCommon("cancel")}
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={working}
                            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[.98] text-white text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {working && (
                                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            )}
                            {tCommon("done")}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
