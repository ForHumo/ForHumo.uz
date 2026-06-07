"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence } from "framer-motion";
import { Loader2, ImagePlus, Video, X, AlertCircle } from "lucide-react";
import { MarketCropModal } from "./market-crop-modal";

interface Props {
    kind: "review" | "reply" | "product";
    media: string[];
    onChange: (urls: string[]) => void;
    max?: number;
    accept?: "all" | "video";   // "video" = faqat video (mahsulot videosi)
}

export function isVideoUrl(url: string) {
    return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url);
}

// Sharh/javob uchun: rasm (crop) + video (to'g'ridan) yuklash
export function MediaUploader({ kind, media, onChange, max = 4, accept = "all" }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [cropSrc, setCropSrc] = useState<string | null>(null);

    async function uploadFile(file: Blob, name: string) {
        setUploading(true); setError("");
        try {
            const fd = new FormData();
            fd.append("file", new File([file], name, { type: file.type }));
            fd.append("kind", kind);
            const res = await fetch("/api/market/upload", { method: "POST", body: fd });
            const d = await res.json();
            if (!res.ok) { setError(d.error || "Xatolik"); return; }
            onChange([...media, d.url]);
        } catch { setError("Yuklashda xatolik"); }
        finally { setUploading(false); }
    }

    function pick(files: FileList | null) {
        if (!files?.length) return;
        setError("");
        if (media.length >= max) { setError(`Maksimal ${max} ta`); return; }
        const file = files[0];
        if (file.type.startsWith("image/")) {
            setCropSrc(URL.createObjectURL(file));   // rasm → crop
        } else if (file.type.startsWith("video/")) {
            uploadFile(file, file.name);             // video → to'g'ridan
        }
        if (inputRef.current) inputRef.current.value = "";
    }

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-2">
                {media.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]">
                        {isVideoUrl(url)
                            ? <video src={url} className="w-full h-full object-cover" />
                            : <Image src={url} alt="" width={64} height={64} className="w-full h-full object-cover" />}
                        {isVideoUrl(url) && <Video size={14} className="absolute bottom-1 left-1 text-white drop-shadow" />}
                        <button type="button" onClick={() => onChange(media.filter((_, idx) => idx !== i))}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center">
                            <X size={10} className="text-white" />
                        </button>
                    </div>
                ))}
                {media.length < max && (
                    <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
                        className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/[0.12]
                            hover:border-green-400 bg-gray-50 dark:bg-white/[0.03] flex items-center justify-center transition-all disabled:opacity-50">
                        {uploading ? <Loader2 size={16} className="animate-spin text-green-500" /> : <ImagePlus size={16} className="text-gray-400 dark:text-white/30" />}
                    </button>
                )}
            </div>
            <input ref={inputRef} type="file" accept={accept === "video" ? "video/*" : "image/*,video/*"} onChange={e => pick(e.target.files)} className="hidden" />
            {error && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11} />{error}</p>}

            <AnimatePresence>
                {cropSrc && (
                    <MarketCropModal imageSrc={cropSrc} aspect={1} outW={800}
                        onConfirm={async (blob) => { await uploadFile(blob, `crop_${Date.now()}.jpg`); URL.revokeObjectURL(cropSrc); setCropSrc(null); }}
                        onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null); }} />
                )}
            </AnimatePresence>
        </div>
    );
}
