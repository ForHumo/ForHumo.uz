"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { formatMoney } from "@/lib/money";
import { TrendingUp, Clock, Radio, Users, Shield, Heart, UserCheck, CreditCard, Settings, LogOut, BadgeCheck, Edit3, Save, X, Loader2, Trash2, Bookmark, ShoppingBag, Wallet, Play, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useNxPlayer } from "./nx-player-ctx";
import { NxStories } from "./nx-stories";
import { NxHomeRows } from "./nx-home-rows";
import { NxTopWritersRow } from "./nx-top-writers-row";
import { NxAdBanner } from "./nx-ad-banner";
import { NxTrendingBanner } from "./nx-trending-banner";
import { NxSocialDesktop } from "./nx-social-desktop";
import { NxSocialFeed } from "./nx-social-feed";
import { NexusFollowList } from "./nexus-follow-list";
import { NxOnboarding } from "./nx-onboarding";
import { QrCode } from "lucide-react";
import { NxProfileAchievements, NxProfileActivity, NxProfileQrModal } from "./nx-profile-extras";

// ─────────────────────────────────────────────────────────────────────────────
// Umumiy yordamchi komponentlar
// ─────────────────────────────────────────────────────────────────────────────
function ViewShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-250 pb-32">
            {children}
        </div>
    );
}

// SearchBar, FilterChips va ViewHeader Video/Live bo'limlari bilan birga o'z fayllariga ko'chirildi

// ─────────────────────────────────────────────────────────────────────────────
// FEED VIEW — bosh sahifa
// ─────────────────────────────────────────────────────────────────────────────
export function FeedView() {
    const [feedTab, setFeedTab] = useState<"foryou" | "following" | "explore">("foryou");
    return (
        <ViewShell>
            {/* Top-level tab bar (Telegram-style) */}
            <div className="mx-4 mt-4 mb-3 flex gap-2 overflow-x-auto scrollbar-hide">
                {([
                    { id: "foryou",    label: "Recommendation" },
                    { id: "following", label: "Following" },
                    { id: "explore",   label: "Trending" },
                ] as const).map(t => (
                    <button
                        key={t.id}
                        onClick={() => setFeedTab(t.id)}
                        className="px-4 py-2 rounded-xl text-xs font-black flex-shrink-0 transition-all duration-200 active:scale-95"
                        style={feedTab === t.id ? {
                            background: "var(--nx-accent)",
                            color: "white",
                        } : {
                            background: "var(--nx-surface)",
                            border: "1px solid rgb(var(--nx-accent-rgb) / 0.22)",
                            color: "rgb(var(--nx-text-2-rgb)/0.85)",
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            <NxStories />
            {/* Yangi foydalanuvchi uchun 5 qadam checklist (bajarilsa avtomatik yashadi) */}
            <NxOnboarding />
            {/* Yangi tartib (foydalanuvchi so'rovi bo'yicha):
                1. Bu haftaning yulduzlari (TOP 50)
                2. Katta AD banner
                3. Kinolar → Musiqalar → G.Video → V.Video → G.Stream → V.Stream
                   → Podkast → Audiokitob → Kitoblar → Kanallar (DM'dagi)
                4. Ijtimoiy feed (post lentasi)
                5. Kimni kuzatishga arziydi (eng oxirida — TrendingBanner) */}
            {feedTab === "foryou" && <>
                <NxTopWritersRow />
                <NxAdBanner />
                <NxHomeRows />
            </>}
            {/* Real postlar lentasi (composer bilan) — tabga qarab filtrlanadi */}
            <NxSocialFeed controlledTab={feedTab} hideTabBar />
            {/* Kimni kuzatishga arziydi — eng pastda */}
            {feedTab === "foryou" && <NxTrendingBanner />}
        </ViewShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO VIEW — real (nx-video-view.tsx)
// ─────────────────────────────────────────────────────────────────────────────
export { VideoView } from "./nx-video-view";

// ─────────────────────────────────────────────────────────────────────────────
// LIVE VIEW — real (nx-live-view.tsx)
// ─────────────────────────────────────────────────────────────────────────────
export { LiveView } from "./nx-live-view";

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA VIEW — real (nx-media-view.tsx)
// ─────────────────────────────────────────────────────────────────────────────
export { MediaView } from "./nx-media-view";

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL VIEW — Postlar, Chat, Kanal, Guruh, Bot
// ─────────────────────────────────────────────────────────────────────────────
export function SocialView() {
    return (
        <>
            {/* Barcha qurilmada bitta Telegram uslubidagi layout (NxSocialDesktop — responsive):
                 telefonda ro'yxat/chat almashinib (single-column), planshet+ da 2-3 ustun.
                 Eski tabsli SocialViewMobile olib tashlandi (feed bosh sahifada — FeedView'da). */}
            <div className="absolute inset-0">
                <NxSocialDesktop />
            </div>
        </>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// PROFILE VIEW — Humo ID + real data + edit modal
// ─────────────────────────────────────────────────────────────────────────────
interface ProfileData {
    name?: string | null; firstName?: string | null; lastName?: string | null;
    bio?: string | null; username?: string | null; city?: string | null;
    image?: string | null; humoId?: string | null; emailVerified?: boolean;
}

export function ProfileView() {
    const { data: session } = useSession();
    const { watchHistory, clearHistory, openVideo, openSavedHistory, setSavedOpen, setSubsOpen, setExploreOpen, setGoLiveOpen } = useNxPlayer();

    const sessionName  = session?.user?.name  ?? "Mehmon";
    const sessionEmail = session?.user?.email ?? "—";
    const sessionImage = session?.user?.image ?? null;

    const [profile,     setProfile]     = useState<ProfileData | null>(null);
    const [editOpen,    setEditOpen]    = useState(false);
    const [editFirst,   setEditFirst]   = useState("");
    const [editLast,    setEditLast]    = useState("");
    const [editBio,     setEditBio]     = useState("");
    const [saving,      setSaving]      = useState(false);
    const [saveError,   setSaveError]   = useState("");
    const [nx,          setNx]          = useState<{ posts: number; followers: number; following: number; likes?: number } | null>(null);
    const [verified,    setVerified]    = useState(false);
    const [balance,     setBalance]     = useState<number | null>(null);
    const [balanceCurrency, setBalanceCurrency] = useState<"UZS" | "USD">("UZS");
    const [followList,  setFollowList]  = useState<"followers" | "following" | null>(null);
    const [qrOpen,      setQrOpen]      = useState(false);

    /* Real profil ma'lumotlarini yuklash */
    const fetchProfile = useCallback(async () => {
        if (!session?.user?.email) return;
        try {
            const res = await fetch("/api/user/profile");
            if (res.ok) setProfile(await res.json());
        } catch { /* ignore */ }
    }, [session?.user?.email]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    /* Nexus real statistika (post/kuzatuvchi/layk) + tasdiq belgisi */
    useEffect(() => {
        if (!session?.user?.email) return;
        fetch("/api/nexus/profile")
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d?.stats) setNx(d.stats);
                if (d?.profile) setVerified(!!d.profile.verified);
            })
            .catch(() => { });
        // Real Zij balansi (For Pay)
        fetch("/api/pay/wallet")
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d && d.balance != null) { setBalance(Number(d.balance)); setBalanceCurrency(d.currency === "USD" ? "USD" : "UZS"); } })
            .catch(() => { });
    }, [session?.user?.email]);

    /* Edit modal ochilganda mavjud qiymatlarni to'ldirish */
    const openEdit = () => {
        setEditFirst(profile?.firstName ?? sessionName.split(" ")[0] ?? "");
        setEditLast(profile?.lastName  ?? sessionName.split(" ")[1] ?? "");
        setEditBio(profile?.bio ?? "");
        setSaveError("");
        setEditOpen(true);
    };

    const handleSave = async () => {
        setSaving(true); setSaveError("");
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstName: editFirst, lastName: editLast, bio: editBio }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                setSaveError(d?.error ?? "Xatolik yuz berdi");
            } else {
                setProfile(await res.json());
                setEditOpen(false);
            }
        } catch { setSaveError("Tarmoq xatosi"); }
        finally { setSaving(false); }
    };

    const displayName  = profile?.firstName
        ? [profile.firstName, profile.lastName].filter(Boolean).join(" ")
        : sessionName;
    const displayImage = profile?.image ?? sessionImage;
    const initial      = displayName[0]?.toUpperCase() ?? "U";

    return (
        <ViewShell>
            {/* ── Profil kartasi ────────────────────────────────────────── */}
            <div className="mx-4 mt-4 rounded-2xl p-6 relative overflow-hidden"
                style={{ background: "var(--nx-surface)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.25)" }}>
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle,rgb(var(--nx-accent-rgb) / 0.22) 0%,transparent 70%)" }} />
                <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle,rgb(var(--nx-accent-rgb) / 0.12) 0%,transparent 70%)" }} />

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-2xl p-[2.5px] flex-shrink-0"
                        style={{ background: "var(--nx-accent)", boxShadow: "0 0 32px rgb(var(--nx-accent-rgb) / 0.45)" }}>
                        <div className="w-full h-full rounded-[14px] bg-[var(--nx-bg)] overflow-hidden flex items-center justify-center text-2xl font-black text-[var(--nx-text)]">
                            {displayImage
                                ? <img src={displayImage} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                : initial}
                        </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-2xl font-black text-[var(--nx-text)] mb-0.5">{displayName}</h2>
                        {profile?.username && (
                            <p className="text-xs font-mono mb-1" style={{ color: "var(--nx-accent)" }}>@{profile.username}</p>
                        )}
                        <p className="text-sm font-mono mb-2" style={{ color: "rgb(var(--nx-text-3-rgb)/0.80)" }}>{sessionEmail}</p>
                        {profile?.bio && (
                            <p className="text-xs mb-3 leading-relaxed" style={{ color: "rgb(var(--nx-text-2-rgb)/0.80)" }}>
                                {profile.bio}
                            </p>
                        )}
                        {/* Real badge'lar: tasdiq (founder/verified), Humo ID, email holati */}
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                            {verified && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--nx-text)]"
                                    style={{ background: "rgb(var(--nx-accent-rgb) / 0.14)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.35)" }}>
                                    <BadgeCheck className="w-3 h-3" style={{ color: "var(--nx-accent)" }} />
                                    Tasdiqlangan
                                </span>
                            )}
                            {profile?.humoId && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--nx-text)] font-mono"
                                    style={{ background: "rgb(var(--nx-accent-rgb) / 0.18)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.30)" }}>
                                    <Shield className="w-3 h-3" style={{ color: "var(--nx-accent)" }} />
                                    {profile.humoId}
                                </span>
                            )}
                            {profile?.emailVerified && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--nx-text)]"
                                    style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.30)" }}>
                                    <UserCheck className="w-3 h-3" style={{ color: "#10B981" }} />
                                    Email tasdiqlangan
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                            onClick={openEdit}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-[var(--nx-text)] transition-opacity duration-150 hover:opacity-85 active:scale-95"
                            style={{ background: "var(--nx-accent)", boxShadow: "0 4px 18px rgb(var(--nx-accent-rgb) / 0.45)" }}
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            Tahrirlash
                        </button>
                        <button
                            onClick={() => setGoLiveOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-[var(--nx-text)] transition-opacity duration-150 hover:opacity-85 active:scale-95"
                            style={{ background: "linear-gradient(135deg,#EF4444,#F97316)" }}
                        >
                            <Radio className="w-3.5 h-3.5" />
                            Go Live
                        </button>
                        {profile?.username && (
                            <>
                                <Link href={`/nexus/u/${profile.username}`}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-[var(--nx-text)] transition-opacity duration-150 hover:opacity-85 active:scale-95"
                                    style={{ background: "rgb(var(--nx-accent-rgb) / 0.12)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.30)" }}>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Ommaviy profil
                                </Link>
                                <button onClick={() => setQrOpen(true)}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-[var(--nx-text)] transition-opacity duration-150 hover:opacity-85 active:scale-95"
                                    style={{ background: "rgb(var(--nx-accent-rgb) / 0.12)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.30)" }}>
                                    <QrCode className="w-3.5 h-3.5" />
                                    QR ulashish
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Follower / Following ──────────────────────────────────── */}
            <div className="mx-4 mt-3 grid grid-cols-3 gap-3">
                {[
                    { label: "Kuzatuvchilar", value: nx ? String(nx.followers) : "—", action: profile?.username ? () => setFollowList("followers") : undefined },
                    { label: "Kuzatilmoqda",  value: nx ? String(nx.following) : "—", action: profile?.username ? () => setFollowList("following") : undefined },
                    { label: "Postlar",        value: nx ? String(nx.posts) : "—",     action: undefined },
                ].map(({ label, value, action }, i) => (
                    <button key={i} onClick={action}
                        className="flex flex-col items-center py-4 rounded-2xl transition-all duration-150"
                        style={{ background: "var(--nx-surface)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.18)", cursor: action ? "pointer" : "default" }}
                        onMouseEnter={e => action && ((e.currentTarget as HTMLElement).style.borderColor = "rgb(var(--nx-accent-rgb) / 0.40)")}
                        onMouseLeave={e => action && ((e.currentTarget as HTMLElement).style.borderColor = "rgb(var(--nx-accent-rgb) / 0.18)")}
                    >
                        <p className="text-2xl font-black text-[var(--nx-text)]">{value}</p>
                        <p className="text-[10px] mt-0.5 font-bold" style={{ color: "rgb(var(--nx-text-3-rgb)/0.75)" }}>{label}</p>
                    </button>
                ))}
            </div>

            {/* ── Tezkor havolalar (faqat real ishlaydiganlar) ──────────── */}
            <div className="mx-4 mt-3 grid grid-cols-3 gap-3">
                {[
                    { label: "Saqlangan", icon: Bookmark,    grad: "linear-gradient(135deg,#F59E0B,#EF4444)", action: () => setSavedOpen(true) },
                    { label: "Obunalar",  icon: Users,       grad: "linear-gradient(135deg,#8B5CF6,#6366F1)", action: () => setSubsOpen(true) },
                    { label: "Kashfiyot", icon: TrendingUp,  grad: "linear-gradient(135deg,#F97316,#EF4444)", action: () => setExploreOpen(true) },
                    { label: "Hamyon",    icon: Wallet,      grad: "linear-gradient(135deg,#10B981,#14B8A6)", href: "/pay" },
                    { label: "Market",    icon: ShoppingBag, grad: "linear-gradient(135deg,#F59E0B,#F97316)", href: "/market" },
                    { label: "Jonli efir",icon: Radio,       grad: "linear-gradient(135deg,#EF4444,#F97316)", action: () => setGoLiveOpen(true) },
                ].map(({ label, icon: Icon, grad, action, href }, i) => {
                    const inner = (
                        <>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: grad }}>
                                <Icon className="w-5 h-5 text-[var(--nx-text)]" />
                            </div>
                            <p className="text-xs font-black text-[var(--nx-text)]">{label}</p>
                        </>
                    );
                    const cls = "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-150 active:scale-95";
                    const st = { background: "var(--nx-surface)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.18)" };
                    return href
                        ? <Link key={i} href={href} className={cls} style={st}>{inner}</Link>
                        : <button key={i} onClick={action} className={cls} style={st}>{inner}</button>;
                })}
            </div>

            {/* ── Statistika (REAL) ─────────────────────────────────────── */}
            <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
                {([
                    { icon: Heart,      label: "Olingan layklar", value: nx?.likes != null ? String(nx.likes) : "—", gradient: "from-red-500 to-pink-600" },
                    { icon: UserCheck,  label: "Obunachi",   value: nx ? String(nx.followers) : "—",  gradient: "from-[var(--nx-accent)] to-[var(--nx-accent)]",  action: profile?.username ? () => setFollowList("followers") : undefined },
                    { icon: CreditCard, label: "Hamyon",     value: balance != null ? formatMoney(balance, balanceCurrency) : "—", gradient: "from-emerald-500 to-teal-600", href: "/pay" as const },
                    { icon: Shield,     label: "Xavfsizlik", value: profile?.emailVerified ? "Yaxshi" : "Boshlang'ich", gradient: "from-violet-500 to-indigo-600" },
                ] as Array<{ icon: typeof Heart; label: string; value: string; gradient: string; action?: (() => void) | undefined; href?: string }>).map(({ icon: Icon, label, value, gradient, action, href }, i) => {
                    const inner = (
                        <>
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${gradient}`}>
                                <Icon className="w-5 h-5 text-[var(--nx-text)]" />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "var(--nx-text-2)" }}>{label}</p>
                                <p className="text-lg font-black text-[var(--nx-text)]">{value}</p>
                            </div>
                        </>
                    );
                    const cls = "flex items-center gap-3 p-4 rounded-2xl transition-all duration-150 text-left";
                    const st = { background: "var(--nx-surface)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.18)" };
                    if (href) return <Link key={i} href={href} className={cls} style={st}>{inner}</Link>;
                    return (
                        <button key={i} onClick={action}
                            className={cls}
                            style={{ ...st, cursor: action ? "pointer" : "default" }}
                            onMouseEnter={e => action && ((e.currentTarget as HTMLElement).style.borderColor = "rgb(var(--nx-accent-rgb) / 0.40)")}
                            onMouseLeave={e => action && ((e.currentTarget as HTMLElement).style.borderColor = "rgb(var(--nx-accent-rgb) / 0.18)")}
                        >{inner}</button>
                    );
                })}
            </div>

            {/* ── Yutuqlar (cross-modul) ────────────────────────────────── */}
            <NxProfileAchievements />

            {/* ── So'nggi faoliyat (post/video/musiqa) ───────────────────── */}
            <NxProfileActivity />

            {/* ── Ko'rish tarixi ────────────────────────────────────────── */}
            {watchHistory.length > 0 && (
                <div className="mx-4 mt-3 rounded-2xl overflow-hidden"
                    style={{ background: "var(--nx-surface)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.18)" }}>
                    <div className="flex items-center justify-between px-5 py-3"
                        style={{ borderBottom: "1px solid rgb(var(--nx-accent-rgb) / 0.12)" }}>
                        <h3 className="text-sm font-black text-[var(--nx-text)] flex items-center gap-2">
                            <Clock className="w-4 h-4" style={{ color: "var(--nx-accent)" }} />
                            Ko&apos;rish tarixi ({watchHistory.length})
                        </h3>
                        <div className="flex items-center gap-2">
                            <button onClick={openSavedHistory}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                                style={{ color: "var(--nx-accent)", background: "rgb(var(--nx-accent-rgb) / 0.08)" }}>
                                Barchasi
                            </button>
                            <button onClick={clearHistory}
                                className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg"
                                style={{ color: "rgba(239,68,68,0.80)", background: "rgba(239,68,68,0.08)" }}>
                                <Trash2 className="w-3 h-3" />
                                Tozalash
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-3 overflow-x-auto px-4 py-3" style={{ scrollbarWidth: "none" }}>
                        {watchHistory.slice(0, 12).map((v, i) => (
                            <button
                                key={i}
                                onClick={() => openVideo(v)}
                                className="flex-shrink-0 w-32 group text-left"
                            >
                                <div className="relative aspect-video rounded-lg overflow-hidden mb-1"
                                    style={{ border: "1px solid rgb(var(--nx-accent-rgb) / 0.15)" }}>
                                    <img src={v.image} alt={v.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                        style={{ background: "var(--nx-surface)" }}>
                                        <Play className="w-5 h-5 text-white fill-white" />
                                    </div>
                                    <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[8px] font-bold text-white"
                                        style={{ background: "rgba(5,8,24,0.80)" }}>{v.duration}</div>
                                </div>
                                <p className="text-[10px] font-bold text-[var(--nx-text)] line-clamp-2 leading-snug group-hover:text-[var(--nx-accent)] transition-colors">{v.title}</p>
                                <p className="text-[9px] mt-0.5" style={{ color: "var(--nx-text-2)" }}>{v.author}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Hisob ─────────────────────────────────────────────────── */}
            <div className="mx-4 mt-3 rounded-2xl p-5"
                style={{ background: "var(--nx-surface)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.20)" }}>
                <h3 className="text-sm font-black text-[var(--nx-text)] mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4" style={{ color: "var(--nx-accent)" }} />
                    Hisob
                </h3>
                <div className="space-y-2">
                    <Link href="/id"
                        className="flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-colors duration-150"
                        style={{ background: "var(--nx-surface)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.12)", color: "rgb(var(--nx-text-2-rgb)/0.85)" }}>
                        <span>Humo ID sozlamalari</span>
                        <ExternalLink className="w-4 h-4" style={{ color: "rgb(var(--nx-accent-rgb) / 0.6)" }} />
                    </Link>
                    <button
                        onClick={() => signOut()}
                        className="w-full flex items-center justify-between p-3 rounded-xl font-bold text-sm text-red-400 transition-colors duration-150 group"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.14)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"}
                    >
                        <span>Chiqish</span>
                        <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
                    </button>
                </div>
            </div>

            {/* ── Profil tahrirlash modali ───────────────────────────────── */}
            {editOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[60]"
                        style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                        onClick={() => setEditOpen(false)}
                    />
                    <div
                        className="fixed inset-x-4 bottom-0 z-[60] rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] md:rounded-3xl"
                        style={{
                            background: "var(--nx-elevated)",
                            border: "1px solid rgb(var(--nx-accent-rgb) / 0.25)",
                            boxShadow: "0 32px 80px rgba(0,0,0,0.60)",
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4"
                            style={{ borderBottom: "1px solid rgb(var(--nx-accent-rgb) / 0.14)" }}>
                            <h3 className="text-base font-black text-[var(--nx-text)]">Profilni tahrirlash</h3>
                            <button
                                onClick={() => setEditOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl"
                                style={{ background: "rgb(var(--nx-accent-rgb) / 0.10)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.20)" }}
                            >
                                <X className="w-4 h-4" style={{ color: "rgb(var(--nx-text-2-rgb)/0.80)" }} />
                            </button>
                        </div>

                        {/* Fields */}
                        <div className="px-5 py-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5"
                                        style={{ color: "rgb(var(--nx-accent-rgb) / 0.70)" }}>Ism</label>
                                    <input
                                        value={editFirst}
                                        onChange={e => setEditFirst(e.target.value)}
                                        placeholder="Ism"
                                        className="w-full h-10 px-3 rounded-xl text-sm text-[var(--nx-text)] outline-none"
                                        style={{
                                            background: "var(--nx-surface)",
                                            border: "1px solid rgb(var(--nx-accent-rgb) / 0.25)",
                                            caretColor: "var(--nx-accent)",
                                        }}
                                        onFocus={e => (e.currentTarget.style.borderColor = "rgb(var(--nx-accent-rgb) / 0.55)")}
                                        onBlur={e  => (e.currentTarget.style.borderColor = "rgb(var(--nx-accent-rgb) / 0.25)")}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5"
                                        style={{ color: "rgb(var(--nx-accent-rgb) / 0.70)" }}>Familiya</label>
                                    <input
                                        value={editLast}
                                        onChange={e => setEditLast(e.target.value)}
                                        placeholder="Familiya"
                                        className="w-full h-10 px-3 rounded-xl text-sm text-[var(--nx-text)] outline-none"
                                        style={{
                                            background: "var(--nx-surface)",
                                            border: "1px solid rgb(var(--nx-accent-rgb) / 0.25)",
                                            caretColor: "var(--nx-accent)",
                                        }}
                                        onFocus={e => (e.currentTarget.style.borderColor = "rgb(var(--nx-accent-rgb) / 0.55)")}
                                        onBlur={e  => (e.currentTarget.style.borderColor = "rgb(var(--nx-accent-rgb) / 0.25)")}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5"
                                    style={{ color: "rgb(var(--nx-accent-rgb) / 0.70)" }}>Bio ({editBio.length}/160)</label>
                                <textarea
                                    value={editBio}
                                    onChange={e => setEditBio(e.target.value.slice(0, 160))}
                                    placeholder="O'zingiz haqingizda..."
                                    rows={3}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm text-[var(--nx-text)] outline-none resize-none"
                                    style={{
                                        background: "var(--nx-surface)",
                                        border: "1px solid rgb(var(--nx-accent-rgb) / 0.25)",
                                        caretColor: "var(--nx-accent)",
                                    }}
                                    onFocus={e => (e.currentTarget.style.borderColor = "rgb(var(--nx-accent-rgb) / 0.55)")}
                                    onBlur={e  => (e.currentTarget.style.borderColor = "rgb(var(--nx-accent-rgb) / 0.25)")}
                                />
                            </div>

                            {saveError && (
                                <p className="text-xs text-red-400 font-bold">{saveError}</p>
                            )}

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full h-11 rounded-xl text-sm font-black text-[var(--nx-text)] flex items-center justify-center gap-2 transition-opacity duration-150"
                                style={{
                                    background: "var(--nx-accent)",
                                    boxShadow: "0 4px 18px rgb(var(--nx-accent-rgb) / 0.40)",
                                    opacity: saving ? 0.70 : 1,
                                }}
                            >
                                {saving
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <><Save className="w-4 h-4" />Saqlash</>}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {followList && profile?.username && (
                <NexusFollowList username={profile.username} type={followList} onClose={() => setFollowList(null)} />
            )}

            {/* QR ulashish modali */}
            <NxProfileQrModal username={profile?.username ?? null} open={qrOpen} onClose={() => setQrOpen(false)} />
        </ViewShell>
    );
}
