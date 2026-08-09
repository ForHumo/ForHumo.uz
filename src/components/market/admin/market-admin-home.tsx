"use client";

// Humo Market — admin dashboard bosh sahifasi.
// Owner + Worker uchun umumiy havolalar; Worker'lar bo'limi faqat Owner'ga.

import { Link } from "@/i18n/routing";
import { Users, Package, Store, ClipboardList, Plus, BarChart2, User as UserIcon } from "lucide-react";

const CARDS = [
    { href: "/market/admin/products/add", icon: Plus,   label: "Mahsulot qo'shish", desc: "Yangi e'lon joylash", accent: true },
    { href: "/market/admin/products",     icon: Package, label: "Mahsulotlar",        desc: "Barcha e'lonlar" },
    { href: "/market/admin/brands",       icon: Store,   label: "Brendlar",           desc: "Brend boshqaruvi" },
    { href: "/market/admin/orders",       icon: ClipboardList, label: "Buyurtmalar",  desc: "Kelgan buyurtmalar" },
    { href: "/market/admin/dashboard",    icon: BarChart2, label: "Statistika",       desc: "Sotuv hisobotlari" },
    { href: "/market/admin/profile",      icon: UserIcon, label: "Profil",           desc: "Do'kon profili" },
];

export function MarketAdminHome({ isOwner }: { isOwner: boolean }) {
    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">Humo Market — Boshqaruv</h1>
                <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
                    {isOwner ? "Owner" : "Worker"} paneli. E'lonlar, buyurtmalar va do'kon boshqaruvi.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {isOwner && (
                    <Link href="/market/admin/workers"
                        className="group relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-green-600 text-white active:scale-[0.98] transition">
                        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                            <Users size={20} />
                        </div>
                        <div className="text-sm font-black">Worker'lar</div>
                        <div className="text-[11px] text-white/80 mt-0.5">Xodim taklif qilish va olib tashlash</div>
                        <div className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider bg-white/25 rounded-md px-1.5 py-0.5">Owner</div>
                    </Link>
                )}
                {CARDS.map(c => (
                    <Link key={c.href} href={c.href}
                        className={`rounded-2xl p-5 active:scale-[0.98] transition border ${
                            c.accent
                                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                                : "bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06]"
                        }`}>
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${
                            c.accent ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-white/70"
                        }`}>
                            <c.icon size={20} />
                        </div>
                        <div className="text-sm font-black text-gray-900 dark:text-white">{c.label}</div>
                        <div className="text-[11px] text-gray-500 dark:text-white/50 mt-0.5">{c.desc}</div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
