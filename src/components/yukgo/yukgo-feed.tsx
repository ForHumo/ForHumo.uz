"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import {
    Truck, Package, MapPin, ArrowRight, Phone, ExternalLink,
    Search, Loader2, Clock, Weight, X, Bell, BellRing, Check,
} from "lucide-react";
import { subscribePush, getPushState, type PushState } from "@/lib/push-client";
import { useTranslations, useLocale } from "next-intl";
import { TgLoginButton } from "@/components/yukgo/tg-login-button";

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
interface BIPEvent extends Event { prompt: () => void; userChoice: Promise<{ outcome: string }> }

const BLUE = "#2563EB", CYAN = "#22D3EE";
const TRUCK_TYPES = ["tent", "ref", "open_top", "fura", "isuzu"];
// @YukGo_tgbot (@ siz). BotFather'da /setdomain = forhumo.uz bo'lishi SHART.
const BOT_USERNAME = process.env.NEXT_PUBLIC_YUKGO_BOT_USERNAME || "YukGo_tgbot";

function place(city: string | null, text: string | null) {
    return (city || text || "—").replace(/\s+/g, " ").trim();
}

export function YukGoFeed() {
    const t = useTranslations("yukgo");
    const locale = useLocale();
    const timeAgo = (iso: string) => {
        const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
        if (s < 60) return t("now");
        if (s < 3600) return t("minAgo", { n: Math.floor(s / 60) });
        if (s < 86400) return t("hourAgo", { n: Math.floor(s / 3600) });
        return t("dayAgo", { n: Math.floor(s / 86400) });
    };
    const fmtPrice = (p: Listing["price"]) => {
        if (!p) return null;
        if (p.amount == null) return p.negotiable ? t("negotiable") : null;
        const n = p.amount.toLocaleString("ru-RU");
        if (p.currency === "USD") return `$${n}`;
        if (p.currency === "RUB") return `${n} ₽`;
        return `${n} ${t("sum")}`;
    };
    const truckLabel = (tt: string) => (TRUCK_TYPES.includes(tt) ? t(`truck_${tt}`) : tt);

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
    // Telegram Login Widget orqali kirish (BEPUL, telefonsiz)
    const [loginBusy, setLoginBusy] = useState(false);
    const [loginErr, setLoginErr] = useState<string | null>(null);
    const [pendingReveal, setPendingReveal] = useState<string | null>(null);
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
    // PWA o'rnatish
    const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
    const [showInstall, setShowInstall] = useState(false);
    const [iosInstall, setIosInstall] = useState(false);

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
            if (r.status === 401) { setPendingReveal(id); setNeedLogin(true); return; }
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

    // ── Telegram Login Widget (BEPUL — balans talab qilmaydi) ──
    // Widget 1 bosishda payload beradi; biz uni telegram-widget provayderiga
    // yuboramiz (server imzoni tekshiradi → Humo ID IP-prefiks bilan avto ochiladi).
    const loginTelegram = useCallback(async (user: Record<string, unknown>) => {
        setLoginBusy(true); setLoginErr(null);
        try {
            const res = await signIn("telegram-widget", { payload: JSON.stringify(user), redirect: false });
            if (res?.ok) {
                setNeedLogin(false);
                const pend = pendingReveal; setPendingReveal(null);
                if (pend) setTimeout(() => reveal(pend), 300);   // login bo'lgach kontaktni avtomatik ochamiz
            } else {
                setLoginErr(t("loginError"));
            }
        } catch { setLoginErr(t("loginError")); }
        finally { setLoginBusy(false); }
    }, [pendingReveal, reveal, t]);

    // PWA o'rnatish tavsiyasi (Android/Chrome beforeinstallprompt + iOS qo'lda)
    useEffect(() => {
        try { if (localStorage.getItem("yukgo-install-dismissed")) return; } catch { /* */ }
        const nav = window.navigator as unknown as { standalone?: boolean };
        const standalone = (window.matchMedia?.("(display-mode: standalone)")?.matches) || nav.standalone === true;
        if (standalone) return;
        const onBip = (e: Event) => { e.preventDefault(); setInstallEvt(e as BIPEvent); setShowInstall(true); };
        window.addEventListener("beforeinstallprompt", onBip);
        const ua = navigator.userAgent || "";
        const isIOS = /iphone|ipad|ipod/i.test(ua);
        const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
        if (isIOS && isSafari) { setIosInstall(true); setShowInstall(true); }
        return () => window.removeEventListener("beforeinstallprompt", onBip);
    }, []);

    async function doInstall() {
        if (!installEvt) return;
        installEvt.prompt();
        try { await installEvt.userChoice; } catch { /* */ }
        setInstallEvt(null); setShowInstall(false);
    }
    function dismissInstall() {
        setShowInstall(false);
        try { localStorage.setItem("yukgo-install-dismissed", "1"); } catch { /* */ }
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
                        <p className="text-[10px] mt-1" style={{ color: "#6B7A99" }}>{t("tagline")}</p>
                    </div>
                    <a href="https://t.me/YukGo_tgbot" target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1.5 px-3 h-10 rounded-xl text-xs font-black text-white flex-shrink-0 active:scale-95" style={{ background: `linear-gradient(135deg,${BLUE},${CYAN})` }}>
                        <Truck className="w-4 h-4" />{t("postViaBot")}
                    </a>
                    <button onClick={openDriver} className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95" style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.3)" }} title={t("driverTitle")}>
                        <Bell className="w-5 h-5" style={{ color: CYAN }} />
                    </button>
                </div>

                {/* Tur tablari */}
                <div className="flex gap-2 mb-2.5">
                    {([["", t("tabAll")], ["CARGO", t("tabCargo")], ["TRUCK", t("tabTrucks")]] as [("" | LType), string][]).map(([v, label]) => (
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
                        <input value={from} onChange={e => setFrom(e.target.value)} placeholder={t("from")}
                            className="w-full h-9 rounded-lg pl-8 pr-2 text-xs outline-none"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(37,99,235,0.22)", color: "#E8EDF7", caretColor: CYAN }} />
                    </div>
                    <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "#4B5B7A" }} />
                    <div className="relative flex-1">
                        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#4B5B7A" }} />
                        <input value={to} onChange={e => setTo(e.target.value)} placeholder={t("to")}
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

            {/* PWA o'rnatish banneri */}
            {showInstall && (
                <div className="mx-4 mt-2 p-3 rounded-2xl flex items-center gap-3" style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.3)" }}>
                    <img src="/yukgo/icon-192.png" alt="" className="w-10 h-10 rounded-xl flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-white">{t("installTitle")}</p>
                        <p className="text-[10px]" style={{ color: "#9FB3D9" }}>
                            {iosInstall ? t("installIos") : t("installHint")}
                        </p>
                    </div>
                    {!iosInstall && installEvt && (
                        <button onClick={doInstall} className="px-3 h-8 rounded-lg text-[11px] font-black text-white flex-shrink-0" style={{ background: `linear-gradient(135deg,${BLUE},${CYAN})` }}>{t("install")}</button>
                    )}
                    <button onClick={dismissInstall} className="flex-shrink-0"><X className="w-4 h-4" style={{ color: "#6B7A99" }} /></button>
                </div>
            )}

            {/* Lenta */}
            <div className="px-4 mt-2 space-y-2.5">
                {loading ? (
                    [0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(37,99,235,0.12)" }} />)
                ) : items.length === 0 ? (
                    (from || to || type) ? (
                        <div className="flex flex-col items-center gap-2 py-16 text-center">
                            <Search className="w-8 h-8" style={{ color: "#2C3A57" }} />
                            <p className="text-sm font-bold" style={{ color: "#6B7A99" }}>{t("empty")}</p>
                            <p className="text-xs" style={{ color: "#4B5B7A" }}>{t("emptyFilter")}</p>
                        </div>
                    ) : (
                        <div className="py-6">
                            <p className="text-sm text-white font-bold mb-5 text-center px-2 leading-relaxed">{t("heroValue")}</p>
                            <p className="text-[11px] font-black mb-3 text-center" style={{ color: "#6B7A99" }}>{t("howTitle")}</p>
                            <div className="grid grid-cols-3 gap-2 mb-5">
                                {[t("how1"), t("how2"), t("how3")].map((txt, i) => (
                                    <div key={i} className="flex flex-col items-center text-center gap-1.5">
                                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: `linear-gradient(135deg,${BLUE},${CYAN})` }}>{i + 1}</span>
                                        <span className="text-[10px] leading-tight" style={{ color: "#9FB3D9" }}>{txt}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-center mb-3 px-2" style={{ color: "#6B7A99" }}>{t("emptyBot")}</p>
                            <a href="https://t.me/YukGo_tgbot" target="_blank" rel="noopener noreferrer" className="mx-auto flex items-center justify-center gap-1.5 w-[220px] h-11 rounded-xl text-sm font-black text-white active:scale-95" style={{ background: `linear-gradient(135deg,${BLUE},${CYAN})` }}>
                                <Truck className="w-4 h-4" />{t("postViaBot")}
                            </a>
                        </div>
                    )
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
                                        {isCargo ? <Package className="w-3 h-3" /> : <Truck className="w-3 h-3" />}{isCargo ? t("badgeCargo") : t("badgeTruck")}
                                    </span>
                                    {it.boosted && <span className="px-1.5 py-0.5 rounded text-[9px] font-black" style={{ background: `linear-gradient(135deg,${CYAN},${BLUE})`, color: "#fff" }}>{t("top")}</span>}
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
                                    {it.weightTons != null && <span className="flex items-center gap-1"><Weight className="w-3 h-3" />{t("tons", { n: it.weightTons })}</span>}
                                    {it.cargo && <span>{it.cargo}</span>}
                                    {it.truckTypes.map(tt => <span key={tt} className="px-1.5 py-0.5 rounded" style={{ background: "rgba(37,99,235,0.10)" }}>{truckLabel(tt)}</span>)}
                                    {it.quantityTrucks && it.quantityTrucks > 1 && <span>{t("trucksCount", { n: it.quantityTrucks })}</span>}
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
                                                <ExternalLink className="w-3.5 h-3.5" />{t("telegram")}
                                            </a>
                                        )}
                                        {c.phones.length === 0 && !c.sourceLink && <span className="text-xs" style={{ color: "#6B7A99" }}>{t("noContact")}</span>}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <button onClick={() => reveal(it.id)} disabled={revealing === it.id}
                                            className="flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-xs font-black disabled:opacity-60" style={{ background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: "#fff" }}>
                                            {revealing === it.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}{t("showContact")}
                                        </button>
                                        {it.sourceKind === "TELEGRAM" && <span className="text-[9px]" style={{ color: "#3C4A67" }}>{t("source")}</span>}
                                    </div>
                                )}

                                <div className="mt-2 flex justify-end">
                                    <button onClick={() => reportTaken(it.id)}
                                        className="text-[10px] px-2 py-1 rounded-md active:scale-95"
                                        style={{ color: "#6B7A99", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(37,99,235,0.12)" }}
                                        title={t("taken")}>
                                        {t("taken")}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}

                {!loading && hasMore && (
                    <button onClick={loadMore} disabled={loadingMore} className="w-full h-11 rounded-xl text-sm font-black mt-1 disabled:opacity-50" style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.3)", color: "#9FB3D9" }}>
                        {loadingMore ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t("more")}
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
                            <h3 className="text-base font-black text-white">{t("driverTitle")}</h3>
                            <button onClick={() => setDriverOpen(false)}><X className="w-5 h-5" style={{ color: "#6B7A99" }} /></button>
                        </div>
                        <p className="text-[11px] mb-3" style={{ color: "#9FB3D9" }}>{t("driverHint")}</p>

                        {dProUntil && new Date(dProUntil) > new Date() && (
                            <div className="mb-3 px-3 py-2 rounded-lg text-[11px] font-black flex items-center gap-1.5" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#34D399" }}>
                                <Check className="w-3.5 h-3.5" />{t("proActive", { date: new Date(dProUntil).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) })}
                            </div>
                        )}

                        <label className="text-[10px] font-bold" style={{ color: "#6B7A99" }}>{t("route")}</label>
                        <div className="flex items-center gap-2 mb-3 mt-1">
                            <input value={dFrom} onChange={e => setDFrom(e.target.value)} placeholder={t("from")} className="flex-1 h-9 rounded-lg px-3 text-xs outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(37,99,235,0.22)", color: "#E8EDF7" }} />
                            <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "#4B5B7A" }} />
                            <input value={dTo} onChange={e => setDTo(e.target.value)} placeholder={t("to")} className="flex-1 h-9 rounded-lg px-3 text-xs outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(37,99,235,0.22)", color: "#E8EDF7" }} />
                        </div>

                        <label className="text-[10px] font-bold" style={{ color: "#6B7A99" }}>{t("vehicle")}</label>
                        <div className="flex flex-wrap gap-1.5 mb-3 mt-1">
                            {TRUCK_TYPES.map(v => (
                                <button key={v} onClick={() => setDVehicle(dVehicle === v ? "" : v)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold active:scale-95"
                                    style={dVehicle === v ? { background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: "#fff" } : { background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", color: "#9FB3D9" }}>{truckLabel(v)}</button>
                            ))}
                        </div>

                        <label className="text-[10px] font-bold" style={{ color: "#6B7A99" }}>{t("capacity")}</label>
                        <input value={dCapacity} onChange={e => setDCapacity(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder={t("capacityPh")}
                            className="w-full h-9 rounded-lg px-3 text-xs outline-none mb-3 mt-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(37,99,235,0.22)", color: "#E8EDF7" }} />

                        <button onClick={enablePush} disabled={pushState === "subscribed" || pushState === "denied" || pushState === "unsupported"}
                            className="w-full h-10 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 mb-3 disabled:opacity-70"
                            style={pushState === "subscribed" ? { background: "rgba(16,185,129,0.15)", color: "#34D399", border: "1px solid rgba(16,185,129,0.3)" } : { background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.3)", color: "#9FB3D9" }}>
                            {pushState === "subscribed" ? <><Check className="w-3.5 h-3.5" />{t("pushOn")}</>
                                : pushState === "denied" ? t("pushDenied")
                                : pushState === "unsupported" ? t("pushUnsupported")
                                : <><BellRing className="w-3.5 h-3.5" />{t("pushEnable")}</>}
                        </button>

                        <div className="flex items-center justify-between py-1 mb-3">
                            <span className="text-xs" style={{ color: "#9FB3D9" }}>{t("notifyMatch")}</span>
                            <button onClick={() => setDNotify(v => !v)} className="w-11 h-6 rounded-full relative transition flex-shrink-0" style={{ background: dNotify ? CYAN : "rgba(255,255,255,0.1)" }}>
                                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: dNotify ? "22px" : "2px" }} />
                            </button>
                        </div>

                        <button onClick={saveDriver} disabled={savingDriver} className="w-full h-11 rounded-xl text-sm font-black text-white disabled:opacity-60" style={{ background: `linear-gradient(135deg,${BLUE},${CYAN})` }}>
                            {savingDriver ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t("save")}
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
                            <h3 className="text-base font-black"><span className="text-white">YukGo </span><span style={{ color: CYAN }}>{t("proTitle")}</span></h3>
                            <button onClick={() => setProOpen(false)}><X className="w-5 h-5" style={{ color: "#6B7A99" }} /></button>
                        </div>
                        <p className="text-xs mb-3" style={{ color: "#9FB3D9" }}>{t("proLimitReached", { n: proLimit })}</p>
                        <ul className="space-y-2 mb-4 text-xs" style={{ color: "#E8EDF7" }}>
                            <li className="flex items-center gap-2"><Check className="w-4 h-4" style={{ color: "#34D399" }} />{t("proBenefit1")}</li>
                            <li className="flex items-center gap-2"><Check className="w-4 h-4" style={{ color: "#34D399" }} />{t("proBenefit2")}</li>
                            <li className="flex items-center gap-2"><Check className="w-4 h-4" style={{ color: "#34D399" }} />{t("proBenefit3")}</li>
                        </ul>
                        <p className="text-[11px] mb-3" style={{ color: "#6B7A99" }}>{t("proPaymentSoon")}</p>
                        <button onClick={() => setProOpen(false)} className="w-full h-11 rounded-xl text-sm font-black text-white" style={{ background: `linear-gradient(135deg,${BLUE},${CYAN})` }}>{t("gotIt")}</button>
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
                            <h3 className="text-base font-black text-white">{t("loginTitle")}</h3>
                            <button onClick={() => setNeedLogin(false)}><X className="w-5 h-5" style={{ color: "#6B7A99" }} /></button>
                        </div>

                        <p className="text-xs mb-4" style={{ color: "#9FB3D9" }}>{t("loginTgHint")}</p>
                        <TgLoginButton bot={BOT_USERNAME} lang={locale} onAuth={loginTelegram} />
                        {loginBusy && <div className="flex justify-center mt-3"><Loader2 className="w-5 h-5 animate-spin" style={{ color: CYAN }} /></div>}
                        {loginErr && <p className="text-[11px] text-red-400 mt-3 text-center">{loginErr}</p>}

                        <button onClick={() => signIn("google", { callbackUrl: "/yukgo" })} className="w-full mt-4 text-[11px]" style={{ color: "#4B5B7A" }}>{t("orGoogle")}</button>
                    </div>
                </>
            )}
        </div>
    );
}
