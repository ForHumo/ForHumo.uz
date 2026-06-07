"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { motion } from "framer-motion";
import { Loader2, Check, X, ZoomIn } from "lucide-react";

interface Props {
    imageSrc: string;                  // tanlangan faylning object URL'i
    onConfirm: (blob: Blob) => void;   // qirqilgan kvadrat rasm
    onCancel: () => void;
}

// Kvadrat (1:1) qirqim — doira emas, 800x800 JPEG
async function getCroppedBlob(src: string, crop: Area, size = 800): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, size, size);
            canvas.toBlob(b => (b ? resolve(b) : reject(new Error("empty"))), "image/jpeg", 0.9);
        };
        img.onerror = reject;
        img.crossOrigin = "anonymous";
        img.src = src;
    });
}

export function MarketCropModal({ imageSrc, onConfirm, onCancel }: Props) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [pix, setPix] = useState<Area | null>(null);
    const [working, setWorking] = useState(false);

    const onComplete = useCallback((_: Area, p: Area) => setPix(p), []);

    async function confirm() {
        if (!pix) return;
        setWorking(true);
        try { onConfirm(await getCroppedBlob(imageSrc, pix)); }
        finally { setWorking(false); }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center px-4"
            style={{ backdropFilter: "blur(16px)", backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={onCancel}>
            <motion.div onClick={e => e.stopPropagation()}
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-white dark:bg-[#0a1a0d] rounded-3xl overflow-hidden
                    border border-green-100 dark:border-green-900/30 shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/[0.06]">
                    <h3 className="font-bold text-gray-900 dark:text-white">Rasmni tahrirlash</h3>
                    <button onClick={onCancel} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                        <X size={14} className="text-gray-500 dark:text-white/40" />
                    </button>
                </div>

                {/* Crop maydoni */}
                <div className="relative h-72 bg-gray-900">
                    <Cropper
                        image={imageSrc} crop={crop} zoom={zoom} aspect={1}
                        onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onComplete}
                        showGrid />
                </div>

                {/* Zoom slider */}
                <div className="flex items-center gap-3 px-5 py-4">
                    <ZoomIn size={16} className="text-gray-400 shrink-0" />
                    <input type="range" min={1} max={3} step={0.05} value={zoom}
                        onChange={e => setZoom(Number(e.target.value))}
                        className="flex-1 accent-green-500" />
                </div>

                <p className="text-xs text-gray-400 dark:text-white/30 text-center px-5 -mt-1 mb-3">
                    Suring va kattalashtiring — keyin tasdiqlang
                </p>

                <div className="flex gap-2 p-4 pt-0">
                    <button onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-white/50 font-semibold text-sm">
                        Bekor
                    </button>
                    <button onClick={confirm} disabled={working}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-sm
                            flex items-center justify-center gap-2 disabled:opacity-50">
                        {working ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Tasdiqlash
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
