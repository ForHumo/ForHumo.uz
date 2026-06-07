"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import {
    Store, Package, ShoppingBag, Star, ThumbsUp, Loader2, Heart,
    ChevronRight, Pencil, Wallet, TrendingUp, TrendingDown,
    ShieldCheck, Plus, MessageSquare,
} from "lucide-react";
import { VerifiedBadge } from "./verified-badge";

interface BrandRow {
    id: string; slug: string; name: string; logo: string | null; verified: boolean;
    productCount: number; brandReviewCount: number; totalSales: number; totalReviews: number; avgRating: number;
}
interface ProfileData {
    profile: {
        id: string; name: string | null; firstName: string | null; fatherName: string | null;
        username: string | null; humoId: string | null; image: string | null; coverImage: string | null; phone: string | null;
    };
    brands: BrandRow[];
    stats: { brandCount: number; reviewsGiven: number; likesReceived: number; likesGiven: number; ordersCount: number; zijSpent: number; zijEarned: number };
}

function fz(v: number | string) { return Number(v).toLocaleString(); }

export function MarketProfile() {
    const { data: session } = useSession();
    const [data, setData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/market/profile").then(r => r.ok ? r.json() : Promise.reject())
            .then(setData).catch(() => {}).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center py-32"><Loader2 size={28} className="animate-spin text-green-500" /></div>;
    if (!data) return (
        <div className="text-center py-32">
            <Store size={48} className="text-gray-200 dark:text-white/10 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-white/40 mb-4">Profilni ko&apos;rish uchun tizimga kiring</p>
            <Link href="/id" className="text-green-600 dark:text-green-400 font-semibold text-sm">Humo ID</Link>
        </div>
    );

    const { profile, brands, stats } = data;
    const displayName = profile.name ?? [profile.firstName, profile.fatherName].filter(Boolean).join(" ") ?? "Foydalanuvchi";
    // DB rasmi bo'lmasa session (navbar bilan bir manba)
    const avatarSrc = profile.image || session?.user?.image || null;
    const coverSrc = profile.coverImage || null;

    const STATS = [
        { icon: Store,        label: "Brendlar",      value: fz(stats.brandCount),    color: "#10B981", href: "/market/brand/manage" },
        { icon: ShoppingBag,  label: "Haridlar",      value: fz(stats.ordersCount),   color: "#3B82F6", href: "/market/orders" },
        { icon: MessageSquare,label: "Sharhlar",      value: fz(stats.reviewsGiven),  color: "#8B5CF6", href: "/market/profile/activity?tab=reviews" },
        { icon: Star,         label: "Baholar",       value: fz(stats.reviewsGiven),  color: "#EC4899", href: "/market/profile/activity?tab=ratings" },
        { icon: ThumbsUp,     label: "Qo'shilishlar", value: fz(stats.likesGiven),    color: "#F59E0B", href: "/market/profile/activity?tab=likes" },
    ];

    return (
        <div>
            {/* Cover banner (Humo ID dan) — barcha bo'limda 3:1 aspect bilan bir xil */}
            <div className="relative w-full aspect-[3/1] max-h-52 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 overflow-hidden">
                {coverSrc && (
                    <Image src={coverSrc} alt="" fill className="object-cover object-center opacity-90" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>

            <div className="container mx-auto px-4 max-w-4xl">
                {/* Avatar + ism */}
                <div className="flex items-end gap-4 -mt-12 relative z-10 mb-2">
                    <div className="w-24 h-24 rounded-3xl overflow-hidden shrink-0
                        bg-white dark:bg-[#0a1a0d] border-4 border-white dark:border-[#050F07] shadow-xl">
                        {avatarSrc ? (
                            <Image src={avatarSrc} alt={displayName} width={96} height={96} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center text-white text-3xl font-black">
                                {displayName[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="pb-1 flex-1 min-w-0">
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white truncate">{displayName}</h1>
                        <p className="text-sm text-gray-400 dark:text-white/30">
                            {profile.username ? `@${profile.username}` : ""} {profile.humoId ? `· ${profile.humoId}` : ""}
                        </p>
                    </div>
                </div>

                {/* Humo ID eslatmasi */}
                <div className="flex items-center gap-2 bg-blue-50/80 dark:bg-blue-900/10
                    border border-blue-200/60 dark:border-blue-800/20 rounded-2xl px-4 py-2.5 mb-6 mt-3">
                    <ShieldCheck size={14} className="text-blue-500 shrink-0" />
                    <p className="text-xs text-gray-600 dark:text-white/50 flex-1">
                        Rasm, ism, telefon kabi shaxsiy ma&apos;lumotlar <b>Humo ID</b> orqali o&apos;zgartiriladi
                    </p>
                    <Link href="/id/edit"
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0
                            hover:underline">
                        <Pencil size={11} /> Humo ID
                    </Link>
                </div>

                {/* Asosiy statistika — bosiladigan */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
                    {STATS.map((s, i) => (
                        <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Link href={s.href}
                                className="block bg-white/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06]
                                    hover:border-green-300 dark:hover:border-green-700/40 hover:bg-white dark:hover:bg-white/[0.05]
                                    rounded-2xl p-4 text-center transition-all">
                                <s.icon size={18} className="mx-auto mb-1.5" style={{ color: s.color }} />
                                <p className="text-xl font-black text-gray-900 dark:text-white">{s.value}</p>
                                <p className="text-xs text-gray-400 dark:text-white/30">{s.label}</p>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* Zij — ishlatilgan / ishlab olingan (bosiladigan) */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <Link href="/market/profile/activity?tab=spent"
                        className="bg-red-50/70 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 hover:border-red-300 dark:hover:border-red-800/40 rounded-2xl p-4 transition-all">
                        <div className="flex items-center gap-1.5 mb-1">
                            <TrendingDown size={14} className="text-red-500" />
                            <span className="text-xs text-gray-500 dark:text-white/40">Sarflangan</span>
                        </div>
                        <p className="text-xl font-black text-red-500 dark:text-red-400">{fz(stats.zijSpent)} <span className="text-sm">Ƶ</span></p>
                    </Link>
                    <Link href="/market/profile/activity?tab=earned"
                        className="bg-green-50/70 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 hover:border-green-300 dark:hover:border-green-800/40 rounded-2xl p-4 transition-all">
                        <div className="flex items-center gap-1.5 mb-1">
                            <TrendingUp size={14} className="text-green-500" />
                            <span className="text-xs text-gray-500 dark:text-white/40">Ishlab olingan</span>
                        </div>
                        <p className="text-xl font-black text-green-600 dark:text-green-400">{fz(stats.zijEarned)} <span className="text-sm">Ƶ</span></p>
                    </Link>
                </div>

                {/* Tezkor havolalar */}
                <div className="flex gap-3 mb-8">
                    <Link href="/market/orders" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl
                        bg-gray-100/80 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.08]
                        text-gray-700 dark:text-white/60 font-semibold text-sm transition-all">
                        <ShoppingBag size={15} /> Buyurtmalarim
                    </Link>
                    <Link href="/market/wishlist" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl
                        bg-gray-100/80 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.08]
                        text-gray-700 dark:text-white/60 font-semibold text-sm transition-all">
                        <Heart size={15} /> Sevimlilar
                    </Link>
                </div>

                {/* Brendlarim */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Store size={18} className="text-green-500" />
                        <h2 className="font-bold text-gray-900 dark:text-white text-lg">Brendlarim</h2>
                    </div>
                    <Link href="/market/brand/manage"
                        className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-semibold hover:underline">
                        <Plus size={14} /> Boshqarish
                    </Link>
                </div>

                {!brands.length ? (
                    <div className="text-center py-12 bg-white/60 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] rounded-2xl mb-10">
                        <Store size={36} className="text-gray-200 dark:text-white/10 mx-auto mb-3" />
                        <p className="text-gray-400 dark:text-white/30 text-sm mb-4">Hali brendingiz yo&apos;q</p>
                        <Link href="/market/brand/manage"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-sm">
                            <Plus size={15} /> Brend ochish
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3 mb-10">
                        {brands.map((b, i) => (
                            <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Link href={`/market/brand/${b.slug}`}
                                    className="flex items-center gap-3 bg-white/70 dark:bg-white/[0.03]
                                        border border-gray-100 dark:border-white/[0.06]
                                        hover:border-green-200 dark:hover:border-green-800/30 rounded-2xl p-4 transition-all">
                                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-green-500/10 flex items-center justify-center shrink-0">
                                        {b.logo ? <Image src={b.logo} alt={b.name} width={48} height={48} className="w-full h-full object-cover" />
                                            : <Store size={20} className="text-green-500" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="font-bold text-gray-900 dark:text-white truncate">{b.name}</p>
                                            {b.verified && <VerifiedBadge size={13} />}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-white/30 mt-0.5">
                                            <span className="flex items-center gap-1"><Package size={11} />{fz(b.productCount)}</span>
                                            <span className="flex items-center gap-1"><ShoppingBag size={11} />{fz(b.totalSales)}</span>
                                            <span className="flex items-center gap-1"><Star size={11} className="text-amber-400" />{b.avgRating || "—"}</span>
                                            <span className="flex items-center gap-1"><MessageSquare size={11} />{fz(b.totalReviews)}</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-300 dark:text-white/20 shrink-0" />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
