"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { useSession, signIn } from "next-auth/react";
import {
    LayoutDashboard, Package, ShoppingBag, Store, Wallet, Plus,
    TrendingUp, Eye, Clock, LogIn, Sparkles, ArrowUpRight,
} from "lucide-react";
import { BN, fmtPrice } from "@/lib/bn-theme";
import { BnEmpty } from "./bn-cards";

type Tab = "home" | "products" | "orders" | "shop" | "money";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "home",     label: "Umumiy",       icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { key: "products", label: "Mahsulotlar",  icon: <Package className="w-[18px] h-[18px]" /> },
    { key: "orders",   label: "Buyurtmalar",  icon: <ShoppingBag className="w-[18px] h-[18px]" /> },
    { key: "shop",     label: "Do'kon",       icon: <Store className="w-[18px] h-[18px]" /> },
    { key: "money",    label: "Pul",          icon: <Wallet className="w-[18px] h-[18px]" /> },
];

export function BnCabinet() {
    const { status } = useSession();
    const [tab, setTab] = useState<Tab>("home");

    if (status === "unauthenticated") {
        return (
            <div className="mx-auto max-w-[1280px] px-4 py-8 pb-16">
                <div
                    className="max-w-[440px] mx-auto p-7 rounded-3xl text-center"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <span
                        className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <LayoutDashboard className="w-7 h-7" />
                    </span>
                    <h1 className="text-[20px] font-black mb-2">Kabinet</h1>
                    <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: BN.text2 }}>
                        Kabinetga kirish uchun Humo ID bilan tizimga kiring.
                    </p>
                    <button
                        onClick={() => signIn("google")}
                        className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[15px] font-black"
                        style={{ background: BN.gold, color: "#0A0A0A" }}
                    >
                        <LogIn className="w-5 h-5" />
                        Kirish
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                <div>
                    <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight">Kabinet</h1>
                    <p className="text-[13px] mt-1" style={{ color: BN.text3 }}>
                        Do&apos;koningizni shu yerdan boshqarasiz
                    </p>
                </div>
                <button
                    className="flex items-center gap-2 h-11 px-5 rounded-2xl text-[14px] font-black transition-transform active:scale-[0.98]"
                    style={{ background: BN.gold, color: "#0A0A0A" }}
                >
                    <Plus className="w-[18px] h-[18px]" />
                    Mahsulot qo&apos;shish
                </button>
            </div>

            {/* Tablar */}
            <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className="flex items-center gap-2 h-10 px-3.5 rounded-xl text-[13.5px] font-bold flex-shrink-0 transition-colors"
                        style={{
                            background: tab === t.key ? BN.goldSoft : BN.surface,
                            border: `1px solid ${tab === t.key ? BN.goldEdge : BN.border}`,
                            color: tab === t.key ? BN.gold : BN.text2,
                        }}
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === "home" && <HomeTab />}
            {tab === "products" && (
                <BnEmpty
                    icon={<Package className="w-6 h-6" />}
                    title="Hali mahsulot yo'q"
                    text="Birinchi mahsulotni qo'shing — rasm yuklasangiz Humo AI nomi va tavsifini o'zi yozadi."
                    action={
                        <button
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[14px] font-black"
                            style={{ background: BN.gold, color: "#0A0A0A" }}
                        >
                            <Plus className="w-4 h-4" />
                            Mahsulot qo&apos;shish
                        </button>
                    }
                />
            )}
            {tab === "orders" && (
                <BnEmpty
                    icon={<ShoppingBag className="w-6 h-6" />}
                    title="Hali buyurtma yo'q"
                    text="Xaridor buyurtma berganda shu yerda ko'rinadi va tasdiqlaysiz."
                />
            )}
            {tab === "shop" && (
                <BnEmpty
                    icon={<Store className="w-6 h-6" />}
                    title="Do'kon sozlamalari"
                    text="Do'kon nomi, logo, manzil va ish vaqtini shu yerdan o'zgartirasiz."
                />
            )}
            {tab === "money" && (
                <BnEmpty
                    icon={<Wallet className="w-6 h-6" />}
                    title="Daromad"
                    text="Sotuvdan tushgan pul ALKH Pay hamyoningizga keladi. Bu yerdan bank hisobingizga yechasiz."
                />
            )}
        </div>
    );
}

function HomeTab() {
    return (
        <>
            {/* Statistika */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <Stat icon={<ShoppingBag className="w-[18px] h-[18px]" />} label="Buyurtmalar" value="0" hint="Bu oyda" />
                <Stat icon={<TrendingUp className="w-[18px] h-[18px]" />} label="Daromad" value={fmtPrice(0)} hint="Bu oyda" />
                <Stat icon={<Eye className="w-[18px] h-[18px]" />} label="Ko'rishlar" value="0" hint="Bu haftada" />
                <Stat icon={<Package className="w-[18px] h-[18px]" />} label="Mahsulotlar" value="0" hint="Faol" />
            </div>

            {/* Boshlash qadamlari */}
            <div
                className="p-5 rounded-2xl mb-6"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
            >
                <h2 className="text-[15px] font-black mb-4">Boshlash</h2>
                <div className="space-y-2.5">
                    <Todo done title="Ariza yuborildi" text="Hujjatlaringiz tekshirilmoqda" />
                    <Todo title="Do'kon logosini yuklang" text="Xaridorlar do'koningizni tanib olishadi" />
                    <Todo title="Birinchi mahsulotni qo'shing" text="Rasm yuklang — qolganini AI yozadi" />
                    <Todo title="Ish vaqtini belgilang" text="Xaridor qachon kelishini biladi" />
                </div>
            </div>

            {/* AI eslatmasi */}
            <div
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
            >
                <span
                    className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0"
                    style={{ background: BN.goldSoft, color: BN.gold }}
                >
                    <Sparkles className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-black mb-1">Humo AI mahsulot kartasini o&apos;zi yozadi</p>
                    <p className="text-[12.5px] leading-relaxed" style={{ color: BN.text2 }}>
                        Telefonda rasmga oling — AI nomi, tavsifi, kategoriyasi va bozor narxi tavsiyasini beradi.
                        Siz faqat tekshirib tasdiqlaysiz.
                    </p>
                </div>
                <Link
                    href="/bn"
                    className="flex items-center gap-1.5 h-10 px-4 rounded-xl text-[13px] font-bold flex-shrink-0"
                    style={{ background: BN.goldSoft, color: BN.gold, border: `1px solid ${BN.goldEdge}` }}
                >
                    Sinab ko&apos;rish
                    <ArrowUpRight className="w-4 h-4" />
                </Link>
            </div>
        </>
    );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
    return (
        <div className="p-4 rounded-2xl" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
            <div className="flex items-center gap-2 mb-2.5" style={{ color: BN.text3 }}>
                {icon}
                <span className="text-[11.5px] font-bold uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-[20px] font-black tabular-nums leading-none mb-1">{value}</p>
            <p className="text-[11px]" style={{ color: BN.text3 }}>{hint}</p>
        </div>
    );
}

function Todo({ done, title, text }: { done?: boolean; title: string; text: string }) {
    return (
        <div className="flex items-start gap-3">
            <span
                className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 grid place-items-center"
                style={{
                    background: done ? BN.ok : "transparent",
                    border: `2px solid ${done ? BN.ok : "rgba(255,255,255,0.18)"}`,
                }}
            >
                {done && <Clock className="w-3 h-3" style={{ color: "#0A0A0A" }} strokeWidth={3} />}
            </span>
            <span className="min-w-0">
                <span
                    className="block text-[13.5px] font-bold"
                    style={{ color: done ? BN.text3 : BN.text, textDecoration: done ? "line-through" : undefined }}
                >
                    {title}
                </span>
                <span className="block text-[12px] mt-0.5" style={{ color: BN.text3 }}>{text}</span>
            </span>
        </div>
    );
}
