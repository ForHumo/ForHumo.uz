"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Loader2 } from "lucide-react";
import { BELIS } from "@/lib/belis-theme";
import { BelisProductCard, type BelisProductLite } from "./belis-product-card";

type Category = { id: string; slug: string; nameUz: string; nameRu?: string | null; nameEn?: string | null };

export function BelisCatalog() {
    const t = useTranslations("belis");
    const [items, setItems] = useState<BelisProductLite[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [catSlug, setCatSlug] = useState<string | null>(null);
    const [q, setQ] = useState("");
    const [sort, setSort] = useState<"new" | "price-asc" | "price-desc">("new");

    useEffect(() => {
        fetch("/api/belis/categories").then(r => r.ok ? r.json() : null)
            .then(d => setCategories(d?.items ?? []));
    }, []);

    useEffect(() => {
        setLoading(true);
        const p = new URLSearchParams();
        if (catSlug) p.set("category", catSlug);
        if (q.trim()) p.set("q", q.trim());
        p.set("sort", sort);
        fetch(`/api/belis/products?${p.toString()}`).then(r => r.ok ? r.json() : null)
            .then(d => setItems(d?.items ?? []))
            .finally(() => setLoading(false));
    }, [catSlug, q, sort]);

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Sarlavha */}
            <div className="text-center mb-6">
                <h1 style={{ fontFamily: "'Playfair Display', serif", color: BELIS.gold, fontSize: 40, margin: 0 }}>
                    {t("nav.catalog")}
                </h1>
                <p className="text-sm italic mt-1" style={{ color: BELIS.text2 }}>{t("hero.subtitle")}</p>
            </div>

            {/* Qidiruv + sort */}
            <div className="flex flex-col md:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" strokeWidth={1.5} style={{ color: BELIS.text3 }} />
                    <input type="text" value={q} onChange={e => setQ(e.target.value)}
                        placeholder="Qidiruv..."
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-transparent focus:outline-none"
                        style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}`, color: BELIS.text, fontFamily: "'Montserrat', sans-serif" }} />
                </div>
                <select value={sort} onChange={e => setSort(e.target.value as never)}
                    className="px-3 py-2.5 rounded-xl focus:outline-none text-sm"
                    style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}`, color: BELIS.text, fontFamily: "'Montserrat', sans-serif" }}>
                    <option value="new">Yangi</option>
                    <option value="price-asc">Arzon → qimmat</option>
                    <option value="price-desc">Qimmat → arzon</option>
                </select>
            </div>

            {/* Kategoriya chip'lar */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-5 nx-scrollbar">
                <CatChip active={!catSlug} onClick={() => setCatSlug(null)}>Barchasi</CatChip>
                {categories.map(c => (
                    <CatChip key={c.id} active={catSlug === c.slug} onClick={() => setCatSlug(c.slug)}>
                        {c.nameUz}
                    </CatChip>
                ))}
            </div>

            {/* Mahsulotlar */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: BELIS.gold }} />
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-16 rounded-2xl"
                    style={{ background: BELIS.surface, border: `1px dashed ${BELIS.border}` }}>
                    <p className="text-sm" style={{ color: BELIS.text2 }}>
                        Bu bo&apos;yicha mahsulot topilmadi
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.map(p => <BelisProductCard key={p.id} product={p} />)}
                </div>
            )}
        </div>
    );
}

function CatChip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
    return (
        <button onClick={onClick}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition"
            style={active ? {
                background: "linear-gradient(135deg,#EBD79A,#D4AF37)",
                color: BELIS.onGold, boxShadow: "0 4px 12px rgba(212,175,55,0.30)",
                fontFamily: "'Montserrat', sans-serif",
            } : {
                background: BELIS.surface, color: BELIS.text2,
                border: `1px solid ${BELIS.border}`,
                fontFamily: "'Montserrat', sans-serif",
            }}>
            {children}
        </button>
    );
}
