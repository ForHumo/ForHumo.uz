"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
    ChevronRight, Loader2, Star, ThumbsUp, MessageSquare,
    TrendingDown, TrendingUp, Reply as ReplyIcon, ShoppingBag,
} from "lucide-react";
import { isVideoUrl } from "./media-uploader";
import { formatMoney } from "@/lib/money";

type Tab = "reviews" | "ratings" | "likes" | "spent" | "earned";

interface Data {
    reviews: { id: string; rating: number; text: string | null; media: string[]; createdAt: string; product: { slug: string; name: string; image: string | null } }[];
    replies: { id: string; text: string | null; media: string[]; createdAt: string; product: { slug: string; name: string } }[];
    likes: { id: string; createdAt: string; product: { slug: string; name: string; image: string | null } }[];
    spent: { id: string; type: string; amount: string; description: string | null; createdAt: string }[];
    earned: { id: string; productName: string; productSlug: string; image: string | null; quantity: number; price: string; total: number; createdAt: string; buyer: string }[];
}

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "reviews", label: "Sharhlar",     icon: MessageSquare },
    { key: "ratings", label: "Baholar",      icon: Star },
    { key: "likes",   label: "Qo'shilishlar",icon: ThumbsUp },
    { key: "spent",   label: "Sarflangan",   icon: TrendingDown },
    { key: "earned",  label: "Ishlab olingan",icon: TrendingUp },
];

function fz(v: number | string) { return Number(v).toLocaleString(); }
function dt(d: string) { return new Date(d).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" }); }

function MediaThumbs({ media }: { media: string[] }) {
    if (!media?.length) return null;
    return (
        <div className="flex gap-1.5 mt-2">
            {media.map((u, i) => (
                <div key={i} className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/[0.05]">
                    {isVideoUrl(u) ? <video src={u} className="w-full h-full object-cover" /> : <Image src={u} alt="" width={48} height={48} className="w-full h-full object-cover" />}
                </div>
            ))}
        </div>
    );
}

const TX_LABEL: Record<string, string> = { PURCHASE: "Xarid", TRANSFER_OUT: "Yuborildi", SAFE_IN: "Seyfga" };

export function ProfileActivity() {
    const params = useSearchParams();
    const initial = (params.get("tab") as Tab) || "reviews";
    const [tab, setTab] = useState<Tab>(["reviews","ratings","likes","spent","earned"].includes(initial) ? initial : "reviews");
    const [data, setData] = useState<Data | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/market/profile/activity").then(r => r.json()).then(setData).finally(() => setLoading(false));
    }, []);

    return (
        <div className="container mx-auto px-4 max-w-2xl py-8">
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
                <Link href="/market" className="hover:text-green-600 transition-colors">Market</Link>
                <ChevronRight size={11} />
                <Link href="/market/profile" className="hover:text-green-600 transition-colors">Profil</Link>
                <ChevronRight size={11} />
                <span className="text-gray-600 dark:text-white/50">Faoliyatim</span>
            </nav>

            {/* Tablar */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5 scrollbar-hide">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all
                            ${tab === t.key ? "bg-green-500 text-white shadow-sm shadow-green-500/30" : "bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/[0.08]"}`}>
                        <t.icon size={14} /> {t.label}
                    </button>
                ))}
            </div>

            {loading || !data ? (
                <div className="flex justify-center py-20"><Loader2 size={26} className="animate-spin text-green-500" /></div>
            ) : (
                <div className="space-y-3">
                    {/* SHARHLAR (sharhlar + javoblar) */}
                    {tab === "reviews" && (<>
                        {!data.reviews.length && !data.replies.length && <Empty text="Hali sharh yo'q" />}
                        {data.reviews.map(r => (
                            <Card key={r.id} href={`/market/product/${r.product.slug}`} image={r.product.image} title={r.product.name} time={r.createdAt}
                                badge={<Stars n={r.rating} />}>
                                {r.text && <p className="text-sm text-gray-600 dark:text-white/50">{r.text}</p>}
                                <MediaThumbs media={r.media} />
                                <Link href={`/market/product/${r.product.slug}`} className="text-xs text-green-600 dark:text-green-400 mt-1.5 inline-block hover:underline">Tahrirlash / ko'rish →</Link>
                            </Card>
                        ))}
                        {data.replies.map(r => (
                            <Card key={r.id} href={`/market/product/${r.product.slug}`} icon={<ReplyIcon size={16} className="text-cyan-500" />} title={`Javob — ${r.product.name}`} time={r.createdAt}>
                                {r.text && <p className="text-sm text-gray-600 dark:text-white/50">{r.text}</p>}
                                <MediaThumbs media={r.media} />
                            </Card>
                        ))}
                    </>)}

                    {/* BAHOLAR */}
                    {tab === "ratings" && (<>
                        {!data.reviews.length && <Empty text="Hali baho qo'ymagansiz" />}
                        {data.reviews.map(r => (
                            <Card key={r.id} href={`/market/product/${r.product.slug}`} image={r.product.image} title={r.product.name} time={r.createdAt} badge={<Stars n={r.rating} />} />
                        ))}
                    </>)}

                    {/* QO'SHILISHLAR */}
                    {tab === "likes" && (<>
                        {!data.likes.length && <Empty text="Hali hech narsaga qo'shilmagansiz" />}
                        {data.likes.map(l => (
                            <Card key={l.id} href={`/market/product/${l.product.slug}`} image={l.product.image} title={l.product.name} time={l.createdAt}
                                badge={<span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-semibold"><ThumbsUp size={12} className="fill-current" />Qo'shildingiz</span>} />
                        ))}
                    </>)}

                    {/* SARFLANGAN */}
                    {tab === "spent" && (<>
                        {!data.spent.length && <Empty text="Hali sarflanmagan" />}
                        {data.spent.map(t => (
                            <div key={t.id} className="flex items-center gap-3 bg-white/60 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] rounded-2xl px-4 py-3">
                                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0"><TrendingDown size={16} className="text-red-500" /></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{t.description || TX_LABEL[t.type] || t.type}</p>
                                    <p className="text-xs text-gray-400 dark:text-white/30">{dt(t.createdAt)}</p>
                                </div>
                                <span className="font-bold text-red-500 dark:text-red-400 shrink-0">-{formatMoney(Number(t.amount), "UZS")}</span>
                            </div>
                        ))}
                    </>)}

                    {/* ISHLAB OLINGAN */}
                    {tab === "earned" && (<>
                        {!data.earned.length && <Empty text="Hali sotuv yo'q" />}
                        {data.earned.map(e => (
                            <div key={e.id} className="flex items-center gap-3 bg-white/60 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] rounded-2xl px-4 py-3">
                                <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/[0.05] shrink-0">
                                    {e.image ? <Image src={e.image} alt="" width={44} height={44} className="w-full h-full object-cover" /> : <ShoppingBag size={18} className="text-gray-300 m-auto mt-3" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{e.productName}</p>
                                    <p className="text-xs text-gray-400 dark:text-white/30">{e.buyer} · {e.quantity} dona · {dt(e.createdAt)}</p>
                                </div>
                                <span className="font-bold text-green-600 dark:text-green-400 shrink-0">+{formatMoney(Number(e.total), "UZS")}</span>
                            </div>
                        ))}
                    </>)}
                </div>
            )}
        </div>
    );
}

function Stars({ n }: { n: number }) {
    return <div className="flex items-center gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= n ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-white/10"} />)}</div>;
}
function Empty({ text }: { text: string }) {
    return <p className="text-sm text-gray-400 dark:text-white/25 py-16 text-center">{text}</p>;
}
function Card({ href, image, icon, title, time, badge, children }: {
    href: string; image?: string | null; icon?: React.ReactNode; title: string; time: string; badge?: React.ReactNode; children?: React.ReactNode;
}) {
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white/60 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-start gap-3">
                <Link href={href} className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center shrink-0">
                    {image ? <Image src={image} alt="" width={44} height={44} className="w-full h-full object-cover" /> : icon}
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <Link href={href} className="text-sm font-semibold text-gray-900 dark:text-white truncate hover:text-green-600 dark:hover:text-green-400">{title}</Link>
                        <span className="text-xs text-gray-300 dark:text-white/20 shrink-0">{dt(time)}</span>
                    </div>
                    {badge && <div className="mt-1">{badge}</div>}
                    {children}
                </div>
            </div>
        </motion.div>
    );
}
