"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, ImagePlus, X, AlertCircle } from "lucide-react";

interface Props {
    kind: "product" | "brand";
    images: string[];
    onChange: (urls: string[]) => void;
    max?: number;          // maks rasm soni (product=5, brand=1)
    label?: string;
}

// Qurilmadan rasm yuklab, Vercel Blob URL'ini qaytaradi (link emas).
export function ImageUploader({ kind, images, onChange, max = 5, label }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    async function handleFiles(files: FileList | null) {
        if (!files?.length) return;
        setError("");
        const remaining = max - images.length;
        if (remaining <= 0) { setError(`Maksimal ${max} ta rasm`); return; }

        setUploading(true);
        const uploaded: string[] = [];
        try {
            for (const file of Array.from(files).slice(0, remaining)) {
                const fd = new FormData();
                fd.append("file", file);
                fd.append("kind", kind);
                const res = await fetch("/api/market/upload", { method: "POST", body: fd });
                const data = await res.json();
                if (!res.ok) { setError(data.error || "Yuklashda xatolik"); break; }
                uploaded.push(data.url);
            }
            if (uploaded.length) onChange([...images, ...uploaded]);
        } catch {
            setError("Yuklashda xatolik");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    }

    return (
        <div>
            {label && <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5">{label}</label>}

            <div className="flex flex-wrap gap-2">
                {/* Yuklangan rasmlar */}
                {images.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden
                        bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]">
                        <Image src={url} alt="" width={80} height={80} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80
                                flex items-center justify-center transition">
                            <X size={11} className="text-white" />
                        </button>
                        {i === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-green-500/90 text-white text-[9px] font-bold text-center py-0.5">
                                Asosiy
                            </span>
                        )}
                    </div>
                ))}

                {/* Yuklash tugmasi */}
                {images.length < max && (
                    <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
                        className="w-20 h-20 rounded-xl border-2 border-dashed
                            border-gray-300 dark:border-white/[0.12]
                            hover:border-green-400 dark:hover:border-green-500/50
                            bg-gray-50 dark:bg-white/[0.03]
                            flex flex-col items-center justify-center gap-1 transition-all
                            disabled:opacity-50">
                        {uploading
                            ? <Loader2 size={20} className="animate-spin text-green-500" />
                            : <ImagePlus size={20} className="text-gray-400 dark:text-white/30" />}
                        <span className="text-[10px] text-gray-400 dark:text-white/30">
                            {uploading ? "Yuklanmoqda" : "Yuklash"}
                        </span>
                    </button>
                )}
            </div>

            <input ref={inputRef} type="file" accept="image/*" multiple={max > 1}
                onChange={e => handleFiles(e.target.files)} className="hidden" />

            <p className="text-[11px] text-gray-400 dark:text-white/25 mt-1.5">
                Qurilmangizdan rasm tanlang (JPG/PNG, maks 5 MB){max > 1 ? `, ${max} tagacha` : ""}
            </p>
            {error && <p className="text-red-500 text-xs flex items-center gap-1 mt-1"><AlertCircle size={11} />{error}</p>}
        </div>
    );
}
