"use client";

// BN kategoriya tanlash — styled modal + qidiruv.
// Native <select> o'rniga ishlatiladi.

import { useMemo, useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Search, Check, X, LayoutGrid } from "lucide-react";
import { BN } from "@/lib/bn-theme";

export interface CatItem {
    slug: string;
    name: string;
    isSub?: boolean;
    parentSlug?: string | null;
}

interface Props {
    categories: CatItem[];
    value: string;
    onChange: (slug: string) => void;
    placeholder?: string;
}

export function BnCategoryPicker({ categories, value, onChange, placeholder }: Props) {
    const [open, setOpen] = useState(false);
    const selected = categories.find(c => c.slug === value);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full flex items-center justify-between gap-2 h-11 px-3.5 rounded-xl text-[14px] text-left transition-colors"
                style={{
                    background: BN.surfaceUp,
                    border: `1px solid ${BN.border}`,
                    color: selected ? "#fff" : BN.text3,
                }}
            >
                <span className="flex items-center gap-2 truncate">
                    <LayoutGrid className="w-4 h-4 flex-shrink-0" style={{ color: BN.text3 }} />
                    <span className="truncate">
                        {selected ? (
                            <>
                                {selected.parentSlug && (
                                    <span style={{ color: BN.text3 }}>
                                        {categories.find(c => c.slug === selected.parentSlug)?.name} ·{" "}
                                    </span>
                                )}
                                {selected.name}
                            </>
                        ) : (placeholder ?? "Kategoriyani tanlang")}
                    </span>
                </span>
                <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: BN.text3 }} />
            </button>

            {open && (
                <CategoryModal
                    categories={categories}
                    value={value}
                    onSelect={(s) => { onChange(s); setOpen(false); }}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
}

function CategoryModal({
    categories, value, onSelect, onClose,
}: {
    categories: CatItem[];
    value: string;
    onSelect: (slug: string) => void;
    onClose: () => void;
}) {
    const [q, setQ] = useState("");
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    // Root + bolalar strukturasi
    const tree = useMemo(() => {
        const roots = categories.filter(c => !c.parentSlug && !c.isSub);
        return roots.map(r => ({
            root: r,
            children: categories.filter(c => c.parentSlug === r.slug || (c.isSub && !c.parentSlug)),
        }));
    }, [categories]);

    // Qidiruv
    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return null;
        return categories.filter(c => c.name.toLowerCase().includes(s));
    }, [q, categories]);

    // Escape yopish
    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    function toggle(slug: string) {
        setExpanded(prev => {
            const n = new Set(prev);
            if (n.has(slug)) n.delete(slug); else n.add(slug);
            return n;
        });
    }

    return (
        <div
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-[520px] max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 pb-3" style={{ borderBottom: `1px solid ${BN.border}` }}>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-[17px] font-black">Kategoriyani tanlang</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 grid place-items-center rounded-full transition-colors hover:bg-white/10"
                            style={{ color: BN.text3 }}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: BN.text3 }} />
                        <input
                            autoFocus
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Kategoriya nomi..."
                            className="w-full h-11 pl-10 pr-3 rounded-xl text-[14px] outline-none"
                            style={{
                                background: BN.surfaceUp,
                                border: `1px solid ${BN.border}`,
                                color: "#fff",
                            }}
                        />
                    </div>
                </div>

                {/* Ro'yxat */}
                <div className="flex-1 overflow-y-auto">
                    {filtered ? (
                        filtered.length === 0 ? (
                            <div className="p-8 text-center text-[13px]" style={{ color: BN.text3 }}>Topilmadi</div>
                        ) : (
                            <div className="p-2">
                                {filtered.map(c => (
                                    <Row key={c.slug} name={c.name} sub={c.isSub || !!c.parentSlug} selected={c.slug === value} onClick={() => onSelect(c.slug)} />
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="p-2">
                            {tree.map(({ root, children }) => {
                                const isOpen = expanded.has(root.slug);
                                const hasKids = children.length > 0;
                                return (
                                    <div key={root.slug}>
                                        <div className="flex items-center">
                                            <Row
                                                name={root.name}
                                                sub={false}
                                                selected={root.slug === value}
                                                onClick={() => onSelect(root.slug)}
                                                className="flex-1"
                                            />
                                            {hasKids && (
                                                <button
                                                    onClick={() => toggle(root.slug)}
                                                    className="w-9 h-9 grid place-items-center rounded-lg transition-colors hover:bg-white/5"
                                                    style={{ color: BN.text3 }}
                                                >
                                                    <ChevronRight className="w-4 h-4 transition-transform" style={{ transform: isOpen ? "rotate(90deg)" : undefined }} />
                                                </button>
                                            )}
                                        </div>
                                        {isOpen && children.map(c => (
                                            <Row key={c.slug} name={c.name} sub selected={c.slug === value} onClick={() => onSelect(c.slug)} />
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Row({ name, sub, selected, onClick, className }: { name: string; sub: boolean; selected: boolean; onClick: () => void; className?: string }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between gap-2 h-11 rounded-xl text-[14px] text-left transition-colors ${className ?? ""}`}
            style={{
                background: selected ? BN.goldSoft : "transparent",
                color: selected ? BN.gold : "#fff",
                paddingLeft: sub ? 32 : 14,
                paddingRight: 14,
            }}
        >
            <span className={sub ? "font-medium" : "font-bold"}>{name}</span>
            {selected && <Check className="w-4 h-4 flex-shrink-0" />}
        </button>
    );
}
