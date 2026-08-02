"use client";

import React from "react";
import { Plus, Trash2, Layers } from "lucide-react";

export interface VariantDraft { name: string; price: string; oldPrice: string; stock: string; }

export function emptyVariant(): VariantDraft { return { name: "", price: "", oldPrice: "", stock: "" }; }

export function VariantEditor({ label, onLabel, variants, onChange }: {
    label: string;
    onLabel: (v: string) => void;
    variants: VariantDraft[];
    onChange: (v: VariantDraft[]) => void;
}) {
    const add = () => onChange([...variants, emptyVariant()]);
    const remove = (i: number) => onChange(variants.filter((_, k) => k !== i));
    const set = (i: number, key: keyof VariantDraft, val: string) =>
        onChange(variants.map((v, k) => (k === i ? { ...v, [key]: val } : v)));

    const inputCls = "bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] focus:border-green-400 dark:focus:border-green-500/50 rounded-lg px-2.5 py-2 text-sm text-gray-900 dark:text-white outline-none transition w-full";

    return (
        <div className="bg-green-50/40 dark:bg-green-900/5 border border-green-100 dark:border-green-900/20 rounded-2xl p-4 space-y-3">
            <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1 block">
                    Variant guruh nomi <span className="text-gray-300 dark:text-white/20">(masalan: O&apos;lcham, Rang, Xotira)</span>
                </label>
                <input value={label} onChange={e => onLabel(e.target.value)} maxLength={30}
                    placeholder="O'lcham"
                    className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] focus:border-green-400 dark:focus:border-green-500/50 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none transition" />
            </div>

            {/* Sarlavha */}
            <div className="hidden sm:grid grid-cols-[1fr_5rem_5rem_4rem_2rem] gap-2 text-[11px] font-semibold text-gray-400 dark:text-white/30 px-1">
                <span>Nom</span><span>Narx (so'm)</span><span>Eski narx</span><span>Stock</span><span></span>
            </div>

            {variants.map((v, i) => (
                <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_5rem_5rem_4rem_2rem] gap-2 items-center">
                    <input value={v.name} onChange={e => set(i, "name", e.target.value)} placeholder="Qora / XL" maxLength={40}
                        className={`${inputCls} col-span-2 sm:col-span-1`} />
                    <input value={v.price} onChange={e => set(i, "price", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Narx" inputMode="decimal" className={inputCls} />
                    <input value={v.oldPrice} onChange={e => set(i, "oldPrice", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="—" inputMode="decimal" className={inputCls} />
                    <input value={v.stock} onChange={e => set(i, "stock", e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" inputMode="numeric" className={inputCls} />
                    <button type="button" onClick={() => remove(i)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition justify-self-end">
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}

            <button type="button" onClick={add}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 font-semibold text-xs hover:bg-green-500/20 transition">
                <Plus size={13} /> Variant qo&apos;shish
            </button>

            {!variants.length && (
                <p className="text-xs text-gray-400 dark:text-white/30 flex items-center gap-1.5">
                    <Layers size={12} /> Har bir variantga alohida narx va stock belgilanadi
                </p>
            )}
        </div>
    );
}
