"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { Store, Package, MessageSquare, Loader2, ChevronRight, Calendar, Box } from "lucide-react";
import { VerifiedBadge } from "./verified-badge";

interface Brand {
    id: string; slug: string; name: string; logo: string | null; verified: boolean;
    categories: string[]; category: string | null; _count: { products: number };
}
interface Profile {
    id: string; name: string | null; username: string | null; image: string | null;
    bio: string | null; humoId: string | null; createdAt: string;
}
interface Data {
    profile: Profile; brands: Brand[];
    stats: { brandCount: number; productCount: number; reviewsGiven: number };
}

function fz(v: number) { return Number(v).toLocaleString(); }

export function PublicProfile({ username }: { username: string }) {
    const [data, setData] = useState<Data | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        fetch(`/api/market/u/${username}`).then(async r => {
            if (!r.ok) { setNotFound(true); return null; }
            return r.json();
        }).then(d => { if (d) setData(d); }).finally(() => setLoading(false));
    }, [username]);

    if (loading) return (
        <div className="flex justify-center py-32"><Loader2 size={28} className="animate-spin text-green-500" /></div>
    );
    if (notFound || !data) return (
        <div className="text-center py-32">
            <p className="text-gray-500 dark:text-white/40 font-semibold">Foydalanuvchi topilmadi</p>
        </div>
    );

    const { profile, brands, stats } = data;
    const STATS = [
        { icon: Store, label: "Brendlar", value: fz(stats.brandCount), color: "#10B981" },
        { icon: Box, label: "Mahsulotlar", value: fz(stats.productCount), color: "#3B82F6" },
        { icon: MessageSquare, label: "Sharhlar", value: fz(stats.reviewsGiven), color: "#8B5CF6" },
    ];

    return (
        <div className="container mx-auto px-4 max-w-4xl py-8">
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
                <Link href="/market" className="hover:text-green-600 transition-colors">Market</Link>
                <ChevronRight size={11} />
                <span className="text-gray-600 dark:text-white/50">@{profile.username ?? "profil"}</span>
            </nav>

            {/* Profil sarlavhasi */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-white/[0.05] shrink-0">
                    {profile.image
                        ? <Image src={profile.image} alt="" width={80} height={80} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center text-white font-black text-3xl">
                            {(profile.name ?? "U")[0].toUpperCase()}</div>}
                </div>
                <div className="min-w-0">
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white truncate">{profile.name ?? "Foydalanuvchi"}</h1>
                    {profile.username && <p className="text-sm text-gray-400 dark:text-white/30">@{profile.username}</p>}
                    {profile.bio && <p className="text-sm text-gray-500 dark:text-white/50 mt-1 line-clamp-2">{profile.bio}</p>}
                    <p className="text-xs text-gray-400 dark:text-white/25 mt-1 flex items-center gap-1">
                        <Calendar size={11} /> Market&apos;da: {new Date(profile.createdAt).toLocaleDateString("uz-UZ")}
                    </p>
                </div>
            </div>

            {/* Statistika */}
            <div className="grid grid-cols-3 gap-3 mb-10">
                {STATS.map(s => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="bg-white/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] rounded-2xl p-4 text-center">
                            <Icon size={20} style={{ color: s.color }} className="mx-auto mb-2" />
                            <p className="text-xl font-black text-gray-900 dark:text-white">{s.value}</p>
                            <p className="text-xs text-gray-400 dark:text-white/30">{s.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Brendlar */}
            <div className="flex items-center gap-2 mb-4">
                <Store size={20} className="text-green-500" />
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Brendlari</h2>
            </div>
            {!brands.length ? (
                <div className="text-center py-12 bg-gray-50/70 dark:bg-white/[0.02] rounded-2xl">
                    <Store size={36} className="text-gray-200 dark:text-white/10 mx-auto mb-3" />
                    <p className="text-gray-400 dark:text-white/30 text-sm">Hali brend yo&apos;q</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                    {brands.map((b, i) => (
                        <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Link href={`/market/brand/${b.slug}`}
                                className="flex items-center gap-3 bg-white/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06]
                                    hover:border-green-200 dark:hover:border-green-800/30 rounded-2xl p-4 transition-all">
                                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-green-500/10 flex items-center justify-center shrink-0">
                                    {b.logo
                                        ? <Image src={b.logo} alt={b.name} width={48} height={48} className="w-full h-full object-cover" />
                                        : <Store size={20} className="text-green-500" />}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="font-bold text-gray-900 dark:text-white truncate">{b.name}</p>
                                        {b.verified && <VerifiedBadge size={14} />}
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-white/30 flex items-center gap-1 mt-0.5">
                                        <Package size={11} /> {b._count.products} ta mahsulot
                                    </p>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
