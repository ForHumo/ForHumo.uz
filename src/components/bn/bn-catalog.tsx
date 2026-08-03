"use client";

import { useState, useMemo } from "react";
import { BnLink } from "./bn-nav";
import { SlidersHorizontal, X, Search, ChevronRight, Store, Package } from "lucide-react";
import { BN, fmtPrice } from "@/lib/bn-theme";
import { BnProductCard } from "./bn-product-card";
import { BnEmpty } from "./bn-cards";
import {
    MOCK_PRODUCTS, MOCK_MARKETS, MOCK_CATEGORIES,
    mockProductsByCategory, mockSearch, type MockProduct,
} from "@/lib/bn-mock";

type SortKey = "new" | "cheap" | "price_asc" | "price_desc" | "rating";

const SORTS: { key: SortKey; label: string }[] = [
    { key: "new",        label: "Yangi" },
    { key: "cheap",      label: "Bozordan arzon" },
    { key: "price_asc",  label: "Narx: arzondan" },
    { key: "price_desc", label: "Narx: qimmatdan" },
    { key: "rating",     label: "Reyting" },
];

interface Props {
    /** Kategoriya rejimi */
    categorySlug?: string;
    /** Qidiruv rejimi */
    query?: string;
    initialSort?: SortKey;
}

export function BnCatalog({ categorySlug, query, initialSort = "new" }: Props) {
    const [sort, setSort] = useState<SortKey>(initialSort);
    const [filterOpen, setFilterOpen] = useState(false);
    const [marketSlug, setMarketSlug] = useState<string | null>(null);
    const [onlyCheap, setOnlyCheap] = useState(initialSort === "cheap");
    const [onlyInspect, setOnlyInspect] = useState(false);
    const [onlyDelivery, setOnlyDelivery] = useState(false);
    const [maxPrice, setMaxPrice] = useState<number | null>(null);

    const category = categorySlug
        ? MOCK_CATEGORIES.find(c => c.slug === categorySlug || c.children?.some(ch => ch.slug === categorySlug))
        : null;
    const subCategory = category?.children?.find(ch => ch.slug === categorySlug);

    const base: MockProduct[] = useMemo(() => {
        if (categorySlug) return mockProductsByCategory(categorySlug);
        if (query !== undefined) return mockSearch(query);
        return MOCK_PRODUCTS;
    }, [categorySlug, query]);

    const items = useMemo(() => {
        let list = [...base];
        if (marketSlug) {
            const mName = MOCK_MARKETS.find(m => m.slug === marketSlug)?.name;
            list = list.filter(p => p.marketName === mName);
        }
        if (onlyCheap)    list = list.filter(p => p.marketAvgPrice && p.price < p.marketAvgPrice);
        if (onlyInspect)  list = list.filter(p => p.allowInspect);
        if (onlyDelivery) list = list.filter(p => p.allowDelivery);
        if (maxPrice)     list = list.filter(p => p.price <= maxPrice);

        switch (sort) {
            case "cheap":
                list.sort((a, b) =>
                    (a.price / (a.marketAvgPrice || a.price)) - (b.price / (b.marketAvgPrice || b.price)));
                break;
            case "price_asc":  list.sort((a, b) => a.price - b.price); break;
            case "price_desc": list.sort((a, b) => b.price - a.price); break;
            case "rating":     list.sort((a, b) => b.rating - a.rating); break;
            default: break;
        }
        return list;
    }, [base, marketSlug, onlyCheap, onlyInspect, onlyDelivery, maxPrice, sort]);

    const activeFilters =
        (marketSlug ? 1 : 0) + (onlyCheap ? 1 : 0) + (onlyInspect ? 1 : 0)
        + (onlyDelivery ? 1 : 0) + (maxPrice ? 1 : 0);

    function reset() {
        setMarketSlug(null); setOnlyCheap(false);
        setOnlyInspect(false); setOnlyDelivery(false); setMaxPrice(null);
    }

    const title = subCategory?.name ?? category?.name
        ?? (query ? `"${query}" bo'yicha natijalar` : "Barcha mahsulotlar");

    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            {/* Sarlavha */}
            <div className="mb-5">
                <nav className="flex items-center gap-1.5 text-[12px] mb-2.5 flex-wrap" style={{ color: BN.text3 }}>
                    <BnLink href="/" className="hover:opacity-70 transition-colors">Bosh sahifa</BnLink>
                    <ChevronRight className="w-3 h-3" />
                    {category && subCategory ? (
                        <>
                            <BnLink href={`/k/${category.slug}`} className="hover:opacity-70 transition-colors">
                                {category.name}
                            </BnLink>
                            <ChevronRight className="w-3 h-3" />
                            <span style={{ color: BN.text2 }}>{subCategory.name}</span>
                        </>
                    ) : (
                        <span style={{ color: BN.text2 }}>{category?.name ?? "Katalog"}</span>
                    )}
                </nav>
                <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight leading-tight">{title}</h1>
                <p className="text-[13px] mt-1.5" style={{ color: BN.text3 }}>
                    {items.length.toLocaleString("uz-UZ")} ta mahsulot topildi
                </p>
            </div>

            {/* Pastki kategoriyalar */}
            {category?.children && !subCategory && (
                <div className="flex flex-wrap gap-2 mb-5">
                    {category.children.map(ch => (
                        <BnLink
                            key={ch.slug}
                            href={`/k/${ch.slug}`}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-bold transition-colors hover:opacity-70"
                            style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}
                        >
                            {ch.name}
                            <span className="text-[11px]" style={{ color: BN.text3 }}>{ch.productCount}</span>
                        </BnLink>
                    ))}
                </div>
            )}

            {/* Boshqaruv paneli */}
            <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
                <button
                    onClick={() => setFilterOpen(true)}
                    className="flex items-center gap-2 h-10 px-3.5 rounded-xl text-[13px] font-bold flex-shrink-0 transition-colors"
                    style={{
                        background: activeFilters ? BN.goldSoft : BN.surface,
                        border: `1px solid ${activeFilters ? BN.goldEdge : BN.border}`,
                        color: activeFilters ? BN.gold : BN.text2,
                    }}
                >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filtr
                    {activeFilters > 0 && (
                        <span
                            className="min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[10px] font-black"
                            style={{ background: BN.gold, color: BN.onGold }}
                        >
                            {activeFilters}
                        </span>
                    )}
                </button>

                <div className="w-px h-6 flex-shrink-0" style={{ background: BN.border }} />

                {SORTS.map(s => (
                    <button
                        key={s.key}
                        onClick={() => { setSort(s.key); if (s.key === "cheap") setOnlyCheap(true); }}
                        className="h-10 px-3.5 rounded-xl text-[13px] font-bold flex-shrink-0 transition-colors"
                        style={{
                            background: sort === s.key ? BN.surfaceUp : "transparent",
                            color: sort === s.key ? BN.text : BN.text3,
                        }}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Natijalar */}
            {items.length === 0 ? (
                <BnEmpty
                    icon={<Search className="w-6 h-6" />}
                    title="Hech narsa topilmadi"
                    text={
                        activeFilters
                            ? "Filtrlarni yumshatib ko'ring."
                            : "Boshqa so'z bilan qidirib ko'ring yoki kategoriyalarni ko'rib chiqing."
                    }
                    action={
                        activeFilters ? (
                            <button
                                onClick={reset}
                                className="h-11 px-5 rounded-xl text-[14px] font-black"
                                style={{ background: BN.gold, color: BN.onGold }}
                            >
                                Filtrlarni tozalash
                            </button>
                        ) : (
                            <BnLink
                                href="/"
                                className="inline-flex h-11 px-5 items-center rounded-xl text-[14px] font-black"
                                style={{ background: BN.gold, color: BN.onGold }}
                            >
                                Bosh sahifaga
                            </BnLink>
                        )
                    }
                />
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {items.map(p => <BnProductCard key={p.id} p={p} compact />)}
                </div>
            )}

            {/* Filtr paneli */}
            {filterOpen && (
                <div className="fixed inset-0 z-[120]">
                    <div
                        className="absolute inset-0"
                        style={{ background: "rgba(0,0,0,0.55)" }}
                        onClick={() => setFilterOpen(false)}
                    />
                    <div
                        className="absolute inset-y-0 right-0 w-full sm:w-[400px] overflow-y-auto"
                        style={{ background: BN.surface, borderLeft: `1px solid ${BN.border}` }}
                    >
                        <div
                            className="sticky top-0 flex items-center justify-between h-16 px-4"
                            style={{ background: BN.surface, borderBottom: `1px solid ${BN.border}` }}
                        >
                            <span className="font-black text-[16px]">Filtr</span>
                            <div className="flex items-center gap-2">
                                {activeFilters > 0 && (
                                    <button
                                        onClick={reset}
                                        className="text-[13px] font-bold"
                                        style={{ color: BN.gold }}
                                    >
                                        Tozalash
                                    </button>
                                )}
                                <button
                                    onClick={() => setFilterOpen(false)}
                                    aria-label="Yopish"
                                    className="w-9 h-9 grid place-items-center rounded-lg"
                                    style={{ background: BN.surfaceUp }}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 space-y-6">
                            <FilterGroup title="Tez tanlash">
                                <Toggle checked={onlyCheap} onChange={setOnlyCheap}
                                    label="Bozor narxidan arzon" />
                                <Toggle checked={onlyInspect} onChange={setOnlyInspect}
                                    label="Ko'rib sotib olish mumkin" />
                                <Toggle checked={onlyDelivery} onChange={setOnlyDelivery}
                                    label="Yetkazib berish bor" />
                            </FilterGroup>

                            <FilterGroup title="Bozor">
                                <Radio
                                    checked={marketSlug === null}
                                    onChange={() => setMarketSlug(null)}
                                    label="Barcha bozorlar va do'konlar"
                                />
                                {MOCK_MARKETS.map(m => (
                                    <Radio
                                        key={m.slug}
                                        checked={marketSlug === m.slug}
                                        onChange={() => setMarketSlug(m.slug)}
                                        label={m.name}
                                    />
                                ))}
                            </FilterGroup>

                            <FilterGroup title="Eng yuqori narx">
                                {[500_000, 1_000_000, 3_000_000, 10_000_000].map(v => (
                                    <Radio
                                        key={v}
                                        checked={maxPrice === v}
                                        onChange={() => setMaxPrice(maxPrice === v ? null : v)}
                                        label={`${fmtPrice(v)} gacha`}
                                    />
                                ))}
                            </FilterGroup>
                        </div>

                        <div
                            className="sticky bottom-0 p-4"
                            style={{ background: BN.surface, borderTop: `1px solid ${BN.border}` }}
                        >
                            <button
                                onClick={() => setFilterOpen(false)}
                                className="w-full h-12 rounded-2xl text-[15px] font-black"
                                style={{ background: BN.gold, color: BN.onGold }}
                            >
                                {items.length} ta mahsulotni ko&apos;rish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[11px] font-black uppercase tracking-wider mb-2.5" style={{ color: BN.text3 }}>
                {title}
            </p>
            <div className="space-y-1">{children}</div>
        </div>
    );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between w-full h-11 px-3 rounded-xl text-[13.5px] font-medium text-left transition-colors"
            style={{ background: checked ? BN.goldSoft : BN.surfaceUp }}
        >
            <span style={{ color: checked ? BN.gold : BN.text }}>{label}</span>
            <span
                className="relative w-10 h-6 rounded-full flex-shrink-0 transition-colors"
                style={{ background: checked ? BN.gold : "rgba(255,255,255,0.14)" }}
            >
                <span
                    className="absolute top-1 w-4 h-4 rounded-full transition-all"
                    style={{ left: checked ? 20 : 4, background: checked ? BN.onGold : BN.text2 }}
                />
            </span>
        </button>
    );
}

function Radio({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
    return (
        <button
            onClick={onChange}
            className="flex items-center gap-2.5 w-full h-11 px-3 rounded-xl text-[13.5px] font-medium text-left transition-colors"
            style={{ background: checked ? BN.goldSoft : "transparent" }}
        >
            <span
                className="w-[18px] h-[18px] rounded-full flex-shrink-0 grid place-items-center transition-colors"
                style={{ border: `2px solid ${checked ? BN.gold : "rgba(255,255,255,0.2)"}` }}
            >
                {checked && <span className="w-2 h-2 rounded-full" style={{ background: BN.gold }} />}
            </span>
            <span className="truncate" style={{ color: checked ? BN.gold : BN.text }}>{label}</span>
        </button>
    );
}

/** Bozorlar ro'yxati sahifasi */
export function BnMarketsList() {
    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight mb-2">Bozorlar</h1>
            <p className="text-[13.5px] mb-6 max-w-[600px] leading-relaxed" style={{ color: BN.text2 }}>
                Jismoniy bozorlar — do&apos;konlarni ko&apos;rib, mahsulotni band qilib borib ko&apos;rishingiz mumkin.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {MOCK_MARKETS.map(m => (
                    <BnLink
                        key={m.id}
                        href={`/m/${m.slug}`}
                        className="group rounded-2xl overflow-hidden transition-all active:scale-[0.99]"
                        style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                    >
                        <div className="aspect-[16/9] overflow-hidden" style={{ background: BN.surfaceUp }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={m.coverUrl}
                                alt={m.name}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        </div>
                        <div className="p-4">
                            <p className="text-[15px] font-black mb-1.5 transition-colors group-hover:text-[color:var(--bn-gold)]">
                                {m.name}
                            </p>
                            <p className="text-[12.5px] mb-2" style={{ color: BN.text3 }}>{m.district}</p>
                            <div className="flex items-center gap-3 text-[12px]" style={{ color: BN.text2 }}>
                                <span className="flex items-center gap-1">
                                    <Store className="w-3.5 h-3.5" />{m.shopCount} do&apos;kon
                                </span>
                                <span className="flex items-center gap-1">
                                    <Package className="w-3.5 h-3.5" />{m.sections.length} bo&apos;lim
                                </span>
                            </div>
                        </div>
                    </BnLink>
                ))}
            </div>
        </div>
    );
}
