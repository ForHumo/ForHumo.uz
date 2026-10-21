"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import {
    Truck, Package, MapPin, ArrowRight, Phone, ExternalLink,
    Search, Loader2, Clock, Weight, X, Bell, BellRing, Check,
} from "lucide-react";
import { subscribePush, getPushState, type PushState } from "@/lib/push-client";

type LType = "CARGO" | "TRUCK";
interface Listing {
    id: string; type: LType;
    fromText: string | null; fromCity: string | null; fromCountry: string | null;
    toText: string | null; toCity: string | null; toCountry: string | null;
    cargo: string | null; weightTons: number | null; truckTypes: string[]; quantityTrucks: number | null;
    price: { amount: number | null; currency: string | null; negotiable: boolean } | null;
    lang: string | null; createdAt: string; boosted: boolean;
    hasContact: boolean; sourceKind: string; sourceTitle: string | null;
}
interface Contact { phones: string[]; sourceLink: string | null }

const BLUE = "#2563EB", CYAN = "#22D3EE";
const TRUCK_LABELS: Record<string, string> = {
    tent: "Tent", ref: "Refrijerator", open_top: "Tepasi ochiq", fura: "Fura", isuzu: "Isuzu",
};

function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "hozir";
    if (s < 3600) return `${Math.floor(s / 60)} daq`;
    if (s < 86400) return `${Math.floor(s / 3600)} soat`;
    return `${Math.floor(s / 86400)} kun`;
}
function fmtPrice(p: Listing["price"]) {
    if (!p) return null;
    if (p.amount == null) return p.negotiable ? "Kelishiladi" : null;
    const n = p.amount.toLocaleString("ru-RU");
    if (p.currency === "USD") return `$${n}`;
    if (p.currency === "RUB") return `${n} ₽`;
    return `${n} so'm`;
}
function place(city: string | null, text: string | null) {
    return (city || text || "—").replace(/\s+/g, " ").trim();
}

export function YukGoFeed() {
    const [type, setType] = useState<"" | LType>("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [items, setItems] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [contacts, setContacts] = useState<Record<string, Contact>>({});
    const [revealing, setRevealing] = useState<string | null>(null);
    const [needLogin, setNeedLogin] = useState(false);
    // Haydovchi profili (onboarding + bildirishnoma)
    const [driverOpen, setDriverOpen] = useState(false);
    const [dFrom, setDFrom] = useState("");
    const [dTo, setDTo] = useState("");
    const [dVehicle, setDVehicle] = useState("");
    const [dCapacity, setDCapacity] = useState("");
    const [dNotify, setDNotify] = useState(true);
    const [savingDriver, setSavingDriver] = useState(false);
    const [pushState, setPushState] = useState<PushState>("default");
    const [dProUntil, setDProUntil] = useState<string | null>(null);   // Pro obuna muddati
    const [proOpen, setProOpen] = useState(false);                     // Pro upsell modal
    const [proLimit, setProLimit] = useState(10);

    const qs = useCallback((offset: number) => {
        const p = new URLSearchParams();
        if (type) p.set("type", type);
        if (from.trim()) p.set("from", from.trim());
        if (to.trim()) p.set("to", to.trim());
        p.set("limit", "24"); p.set("offset", String(offset));
        return p.toString();
    }, [type, from, to]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const d = await fetch(`/api/yukgo/listings?${qs(0)}`).then(r => r.json());
            setItems(d.listings ?? []); setHasMore(!!d.hasMore);
        } finally { setLoading(false); }
    }, [qs]);

    useEffect(() => { const t = setTimeout(load, (from || to) ? 350 : 0); return () => clearTimeout(t); }, [load, from, to]);
    // Har 25s yangilanadi (yangi e'lonlar)
    useEffect(() => {
        const iv = setInterval(() => {
            fetch(`/api/yukgo/listings?${qs(0)}`).then(r => r.json()).then(d => { setItems(d.listings ?? []); setHasMore(!!d.hasMore); }).catch(() => {});
        }, 25_000);
        return () => clearInterval(iv);
    }, [qs]);

    async function loadMore() {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const d = await fetch(`/api/yukgo/listings?${qs(items.length)}`).then(r => r.json());
            setItems(prev => [...prev, ...(d.listings ?? [])]); setHasMore(!!d.hasMore);
        } finally { setLoadingMore(false); }
    }

    async function reveal(id: string) {
        if (contacts[id] || revealing) return;
        setRevealing(id);
        try {
            const r = await fetch(`/api/yukgo/listings/${id}/contact`);
            if (r.status === 401) { setNeedLogin(true); return; }
            const d = await r.json();
            if (r.status === 402) { setProLimit(d.limit ?? 10); setProOpen(true); return; }
            if (r.ok) setContacts(prev => ({ ...prev, [id]: { phones: d.phones ?? [], sourceLink: d.sourceLink ?? null } }));
        } finally { setRevealing(null); }
    }

    // "Band bo'ldi" — login'li user belgilaydi; muvaffaqiyatda o'zidan yashiriladi
    // (backend: 2 xil user belgilasa butunlay yashiriladi)
    async function reportTaken(id: string) {
        try {
            const r = await fetch(`/api/yukgo/listings/${id}/report`, { method: "POST" });
            if (r.status === 401) { setNeedLogin(true); return; }
            if (r.ok) setItems(prev => prev.filter(x => x.id !== id));
        } catch { /* ignore */ }
    }

    // Haydovchi profili — ochish (mavjudini yuklaydi) / saqlash / push yoqish
    async function openDriver() {
        try {
            const r = await fetch("/api/yukgo/driver");
            if (r.status === 401) { setNeedLogin(true); return; }
            const d = await r.json().catch(() => ({}));
            const dr = d.driver;
            if (dr) {
                setDFrom(dr.routeFromCity || ""); setDTo(dr.routeToCity || "");
                setDVehicle(dr.vehicleType || ""); setDCapacity(dr.capacityTons != null ? String(dr.capacityTons) : "");
                setDNotify(dr.notifyOnMatch !== false);
                setDProUntil(dr.subActiveUntil || null);
            }
        } catch { /* ignore */ }
        try { setPushState(await getPushState()); } catch { /* ignore */ }
        setDriverOpen(true);
    }
    async function saveDriver() {
        setSavingDriver(true);
        try {
            const r = await fetch("/api/yukgo/driver", {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    routeFromCity: dFrom, routeToCity: dTo, vehicleType: dVehicle,
                    capacityTons: dCapacity ? Number(dCapacity) : null, notifyOnMatch: dNotify,
                }),
            });
            if (r.status === 401) { setNeedLogin(true); return; }
            if (r.ok) setDriverOpen(false);
        } finally { setSavingDriver(false); }
    }
    async function enablePush() {
        try { setPushState(await subscribePush()); } catch { /* ignore */ }
    }

    return (
        <div className="min-h-full pb-28">
            {/* Header / brend */}
            <div className="sticky top-0 z-20 px-4 pt-5 pb-3" style={{ background: "linear-gradient(180deg,#0A0F1E 70%,transparent)", backdropFilter: "blur(6px)" }}>
                <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg,${BLUE},${CYAN})` }}>
                        <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black leading-none">
                            <span style={{ color: "#fff" }}>Yuk</span><span style={{ background: `linear-gradient(135deg,${CYAN},${BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Go</span>
                        </h1>
                        <p className="text-[10px] mt-1" style={{ color: "#6B7A99" }}>Yuk va mashina e'lonlari — bir joyda</p>
                    </div>
                    <button onClick={openDriver} className="ml-auto w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95" style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.3)" }} title="Haydovchi profili va bildirishnoma">
                        <Bell className="w-5 h-5" style={{ color: CYAN }} />
                    </button>
                </div>

                {/* Tur tablari */}
                <div className="flex gap-2 mb-2.5">
                    {([["", "Hammasi"], ["CARGO", "Yuklar"], ["TRUCK", "Mashinalar"]] as const).map(([v, label]) => (
                        <button key={v} onClick={() => setType(v)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-black transition active:scale-95"
                            style={type === v
                                ? { background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: "#fff" }
                                : { background: "rgba(37,99,235,0.10)", border: "1px solid rgba(37,99,235,0.25)", color: "#9FB3D9" }}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Qayerdan → qayerga */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#4B5B7A" }} />
                        <input value={from} onChange={e => setFrom(e.target.value)} placeholder="Qayerdan"
                            className="w-full h-9 rounded-lg pl-8 pr-2 text-xs outline-none"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(37,99,235,0.22)", color: "#E8EDF7", caretColor: CYAN }} />
                    </div>
                    <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "#4B5B7A" }} />
                    <div className="relative flex-1">
                        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#4B5B7A" }} />
                        <input value={to} onChange={e => setTo(e.target.value)} placeholder="Qayerga"
                            className="w-full h-9 rounded-lg pl-8 pr-2 text-xs outline-none"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(37,99,235,0.22)", color: "#E8EDF7", caretColor: CYAN }} />
                    </div>
                    {(from || to) && (
                        <button onClick={() => { setFrom(""); setTo(""); }} className="w-9 h-9 flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(37,99,235,0.22)" }}>
                            <X className="w-3.5 h-3.5" style={{ color: "#9FB3D9" }} />
                        </button>
                    )}
                </div>
            </div>

            {/* Lenta */}
            <div className="px-4 mt-2 space-y-2.5">
                {loading ? (
                    [0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(37,99,235,0.12)" }} />)
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-16 text-center">
                        <Search className="w-8 h-8" style={{ color: "#2C3A57" }} />
                        <p className="text-sm font-bold" style={{ color: "#6B7A99" }}>Hozircha e'lon yo'q</p>
                        <p className="text-xs" style={{ color: "#4B5B7A" }}>{(from || to || type) ? "Filtrni o'zgartirib ko'ring" : "Tez orada e'lonlar paydo bo'ladi"}</p>
                    </div>
                ) : (
                    items.map(it => {
                        const isCargo = it.type === "CARGO";
                        const priceStr = fmtPrice(it.price);
                        const c = contacts[it.id];
                        return (
                            <div key={it.id} className="rounded-2xl p-3.5" style={{ background: it.boosted ? "rgba(34,211,238,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${it.boosted ? "rgba(34,211,238,0.35)" : "rgba(37,99,235,0.16)"}` }}>
                                {/* Yuqori qator */}
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black" style={isCargo ? { background: "rgba(16,185,129,0.15)", color: "#34D399" } : { background: "rgba(37,99,235,0.18)", color: "#60A5FA" }}>
                                        {isCargo ? <Package className="w-3 h-3" /> : <Truck className="w-3 h-3" />}{isCargo ? "Yuk" : "Mashina"}
                                    </span>
                                    {it.boosted && <span className="px-1.5 py-0.5 rounded text-[9px] font-black" style={{ background: `linear-gradient(135deg,${CYAN},${BLUE})`, color: "#fff" }}>TOP</span>}
                                    <span className="ml-auto flex items-center gap-1 text-[10px]" style={{ color: "#4B5B7A" }}><Clock className="w-3 h-3" />{timeAgo(it.createdAt)}</span>
                                </div>

                                {/* Yo'nalish */}
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-black text-white truncate">{place(it.fromCity, it.fromText)}</span>
                                    <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: CYAN }} />
                                    <span className="text-sm font-black text-white truncate">{place(it.toCity, it.toText)}</span>
                                </div>

                                {/* Meta */}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] mb-2.5" style={{ color: "#9FB3D9" }}>
                                    {it.weightTons != null && <span className="flex items-center gap-1"><Weight className="w-3 h-3" />{it.weightTons} t</span>}
                                    {it.cargo && <span>{it.cargo}</span>}
                                    {it.truckTypes.map(t => <span key={t} className="px-1.5 py-0.5 rounded" style={{ background: "rgba(37,99,235,0.10)" }}>{TRUCK_LABELS[t] || t}</span>)}
                                    {it.quantityTrucks && it.quantityTrucks > 1 && <span>{it.quantityTrucks} ta mashina</span>}
                                    {priceStr && <span className="font-black" style={{ color: "#34D399" }}>{priceStr}</span>}
                                </div>

                                {/* Kontakt */}
                                {c ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                        {c.phones.map(ph => (
                                            <a key={ph} href={`tel:${ph}`} className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-black" style={{ background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: "#fff" }}>
                                                <Phone className="w-3.5 h-3.5" />{ph}
                                            </a>
                                        ))}
                                        {c.sourceLink && (
                                            <a href={c.sourceLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-bold" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(37,99,235,0.3)", color: "#9FB3D9" }}>
                                                <ExternalLink className="w-3.5 h-3.5" />Telegram
                                            </a>
                                        )}
                                        {c.phones.length === 0 && !c.sourceLink && <span className="text-xs" style={{ color: "#6B7A99" }}>Kontakt topilmadi</span>}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <button onClick={() => reveal(it.id)} disabled={revealing === it.id}
                                            className="flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-xs font-black disabled:opacity-60" style={{ background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: "#fff" }}>
                                            {revealing === it.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}Kontaktni ko&apos;rish
                                        </button>
                                        {it.sourceKind === "TELEGRAM" && <span className="text-[9px]" style={{ color: "#3C4A67" }}>Manba: Telegram</span>}
                                    </div>
                                )}

                                <div className="mt-2 flex justify-end">
                                    <button onClick={() => reportTaken(it.id)}
                                        className="text-[10px] px-2 py-1 rounded-md active:scale-95"
                                        style={{ color: "#6B7A99", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(37,99,235,0.12)" }}
                                        title="Band bo'lgan bo'lsa belgilang — boshqalar vaqt yo'qotmasin">
                                        Band bo&apos;ldi?
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}

                {!loading && hasMore && (
                    <button onClick={loadMore} disabled={loadingMore} className="w-full h-11 rounded-xl text-sm font-black mt-1 disabled:opacity-50" style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.3)", color: "#9FB3D9" }}>
                        {loadingMore ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Ko'proq e'lon"}
                    </button>
                )}
            </div>

            {/* Haydovchi profili / onboarding modal */}
            {driverOpen && (
                <>
                    <div className="fixed inset-0 z-[110]" style={{ background: "rgba(5,8,20,0.8)", backdropFilter: "blur(6px)" }} onClick={() => setDriverOpen(false)} />
                    <div className="fixed inset-x-4 bottom-4 z-[110] rounded-2xl p-5 max-h-[88vh] overflow-y-auto md:inset-x-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[380px]"
                        style={{ background: "#0E1528", border: "1px solid rgba(37,99,235,0.35)" }}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-black text-white">Haydovchi profili</h3>
                            <button onClick={() => setDriverOpen(false)}><X className="w-5 h-5" style={{ color: "#6B7A99" }} /></button>
                        </div>
                        <p className="text-[11px] mb-3" style={{ color: "#9FB3D9" }}>Yo&apos;nalishingizni qo&apos;ying — mos yuk chiqsa darhol bildirishnoma olasiz.</p>

                        {dProUntil && new Date(dProUntil) > new Date() && (
                            <div className="mb-3 px-3 py-2 rounded-lg text-[11px] font-black flex items-center gap-1.5" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#34D399" }}>
                                <Check className="w-3.5 h-3.5" />Pro faol — {new Date(dProUntil).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" })}gacha
                            </div>
                        )}

                        <label className="text-[10px] font-bold" style={{ color: "#6B7A99" }}>Yo&apos;nalish</label>
                        <div className="flex items-center gap-2 mb-3 mt-1">
                            <input value={dFrom} onChange={e => setDFrom(e.target.value)} placeholder="Qayerdan" className="flex-1 h-9 rounded-lg px-3 text-xs outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(37,99,235,0.22)", color: "#E8EDF7" }} />
                            <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "#4B5B7A" }} />
                            <input value={dTo} onChange={e => setDTo(e.target.value)} placeholder="Qayerga" className="flex-1 h-9 rounded-lg px-3 text-xs outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(37,99,235,0.22)", color: "#E8EDF7" }} />
                        </div>

                        <label className="text-[10px] font-bold" style={{ color: "#6B7A99" }}>Mashina turi</label>
                        <div className="flex flex-wrap gap-1.5 mb-3 mt-1">
                            {Object.entries(TRUCK_LABELS).map(([v, label]) => (
                                <button key={v} onClick={() => setDVehicle(dVehicle === v ? "" : v)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold active:scale-95"
                                    style={dVehicle === v ? { background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: "#fff" } : { background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", color: "#9FB3D9" }}>{label}</button>
                            ))}
                        </div>

                        <label className="text-[10px] font-bold" style={{ color: "#6B7A99" }}>Sig&apos;imi (tonna)</label>
                        <input value={dCapacity} onChange={e => setDCapacity(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="masalan 20"
                            className="w-full h-9 rounded-lg px-3 text-xs outline-none mb-3 mt-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(37,99,235,0.22)", color: "#E8EDF7" }} />

                        <button onClick={enablePush} disabled={pushState === "subscribed" || pushState === "denied" || pushState === "unsupported"}
                            className="w-full h-10 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 mb-3 disabled:opacity-70"
                            style={pushState === "subscribed" ? { background: "rgba(16,185,129,0.15)", color: "#34D399", border: "1px solid rgba(16,185,129,0.3)" } : { background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.3)", color: "#9FB3D9" }}>
                            {pushState === "subscribed" ? <><Check className="w-3.5 h-3.5" />Bildirishnoma yoqilgan</>
                                : pushState === "denied" ? "Brauzerda bloklangan"
                                : pushState === "unsupported" ? "Bu qurilmada push yo'q"
                                : <><BellRing className="w-3.5 h-3.5" />Bildirishnomani yoqish</>}
                        </button>

                        <div className="flex items-center justify-between py-1 mb-3">
                            <span className="text-xs" style={{ color: "#9FB3D9" }}>Mos yuk chiqsa xabar ber</span>
                            <button onClick={() => setDNotify(v => !v)} className="w-11 h-6 rounded-full relative transition flex-shrink-0" style={{ background: dNotify ? CYAN : "rgba(255,255,255,0.1)" }}>
                                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: dNotify ? "22px" : "2px" }} />
                            </button>
                        </div>

                        <button onClick={saveDriver} disabled={savingDriver} className="w-full h-11 rounded-xl text-sm font-black text-white disabled:opacity-60" style={{ background: `linear-gradient(135deg,${BLUE},${CYAN})` }}>
                            {savingDriver ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Saqlash"}
                        </button>
                    </div>
                </>
            )}

            {/* Pro upsell modal (bepul limit tugaganda) */}
            {proOpen && (
                <>
                    <div className="fixed inset-0 z-[110]" style={{ background: "rgba(5,8,20,0.8)", backdropFilter: "blur(6px)" }} onClick={() => setProOpen(false)} />
                    <div className="fixed inset-x-4 bottom-4 z-[110] rounded-2xl p-5 md:inset-x-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[360px]"
                        style={{ background: "#0E1528", border: "1px solid rgba(34,211,238,0.35)" }}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-black"><span className="text-white">YukGo </span><span style={{ color: CYAN }}>Pro</span></h3>
                            <button onClick={() => setProOpen(false)}><X className="w-5 h-5" style={{ color: "#6B7A99" }} /></button>
                        </div>
                        <p className="text-xs mb-3" style={{ color: "#9FB3D9" }}>Bugungi bepul limit tugadi ({proLimit} kontakt/kun). Pro bilan:</p>
                        <ul className="space-y-2 mb-4 text-xs" style={{ color: "#E8EDF7" }}>
                            <li className="flex items-center gap-2"><Check className="w-4 h-4" style={{ color: "#34D399" }} />Cheksiz kontakt</li>
                            <li className="flex items-center gap-2"><Check className="w-4 h-4" style={{ color: "#34D399" }} />Ustuvor bildirishnoma</li>
                            <li className="flex items-center gap-2"><Check className="w-4 h-4" style={{ color: "#34D399" }} />Barcha yo&apos;nalishlar</li>
                        </ul>
                        <p className="text-[11px] mb-3" style={{ color: "#6B7A99" }}>To&apos;lov tizimi tez orada ulanadi. Hozircha Pro faollashtirish uchun biz bilan bog&apos;laning.</p>
                        <button onClick={() => setProOpen(false)} className="w-full h-11 rounded-xl text-sm font-black text-white" style={{ background: `linear-gradient(135deg,${BLUE},${CYAN})` }}>Tushundim</button>
                    </div>
                </>
            )}

            {/* Login modal (kontakt ko'rish uchun) */}
            {needLogin && (
                <>
                    <div className="fixed inset-0 z-[110]" style={{ background: "rgba(5,8,20,0.8)", backdropFilter: "blur(6px)" }} onClick={() => setNeedLogin(false)} />
                    <div className="fixed inset-x-4 bottom-4 z-[110] rounded-2xl p-5 md:inset-x-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[360px]"
                        style={{ background: "#0E1528", border: "1px solid rgba(37,99,235,0.35)" }}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-black text-white">Kontaktni ko&apos;rish</h3>
                            <button onClick={() => setNeedLogin(false)}><X className="w-5 h-5" style={{ color: "#6B7A99" }} /></button>
                        </div>
                        <p className="text-xs mb-4" style={{ color: "#9FB3D9" }}>Telefon raqamini ko&apos;rish uchun Humo ID bilan kiring.</p>
                        <button onClick={() => signIn("google", { callbackUrl: "/yukgo" })}
                            className="w-full h-11 rounded-xl text-sm font-black text-white" style={{ background: `linear-gradient(135deg,${BLUE},${CYAN})` }}>
                            Kirish
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
