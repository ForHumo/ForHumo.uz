"use client";

// Bozor Narxida — shared header (barcha BN sahifalarida ishlatiladi).
// Qora + oltin brend rangi.

import { Link } from "@/i18n/routing";
import { Store, LayoutDashboard, ShoppingBag, User, Menu } from "lucide-react";
import { useState } from "react";

interface Props {
    active?: "home" | "dashboard" | "orders";
}

export function BnHeader({ active }: Props) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14 backdrop-blur-xl"
            style={{ background: "rgba(10,10,10,0.85)", borderBottom: "1px solid rgba(234,179,8,0.20)" }}>
            <Link href="/bn" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "#0a0a0a", border: "2px solid #EAB308" }}>
                    <span className="text-xs font-black" style={{ color: "#EAB308", fontFamily: "serif" }}>BN</span>
                </div>
                <span className="text-sm font-black text-white hidden sm:inline">Bozor Narxida</span>
            </Link>

            <div className="flex-1" />

            <nav className="hidden md:flex items-center gap-1">
                <Link href="/bn" className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={active === "home" ? { background: "rgba(234,179,8,0.15)", color: "#EAB308" } : { color: "rgba(255,255,255,0.7)" }}>
                    Katalog
                </Link>
                <Link href="/bn/seller/dashboard" className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={active === "dashboard" ? { background: "rgba(234,179,8,0.15)", color: "#EAB308" } : { color: "rgba(255,255,255,0.7)" }}>
                    <LayoutDashboard className="w-3 h-3" /> Sotuvchi
                </Link>
                <Link href="/nexus" className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>
                    For Humo →
                </Link>
            </nav>

            <button onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <Menu className="w-4 h-4 text-white" />
            </button>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="md:hidden absolute top-14 left-0 right-0 z-40 flex flex-col p-3 gap-1"
                    style={{ background: "rgba(10,10,10,0.98)", borderBottom: "1px solid rgba(234,179,8,0.20)" }}>
                    <Link href="/bn" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold"
                        style={active === "home" ? { background: "rgba(234,179,8,0.15)", color: "#EAB308" } : { color: "rgba(255,255,255,0.85)" }}>
                        <Store className="w-4 h-4" /> Katalog
                    </Link>
                    <Link href="/bn/seller/dashboard" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold"
                        style={active === "dashboard" ? { background: "rgba(234,179,8,0.15)", color: "#EAB308" } : { color: "rgba(255,255,255,0.85)" }}>
                        <LayoutDashboard className="w-4 h-4" /> Sotuvchi paneli
                    </Link>
                    <Link href="/bn/orders" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold"
                        style={{ color: "rgba(255,255,255,0.85)" }}>
                        <ShoppingBag className="w-4 h-4" /> Buyurtmalarim
                    </Link>
                    <Link href="/nexus" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold" style={{ color: "rgba(255,255,255,0.55)" }}>
                        <User className="w-4 h-4" /> For Humo'ga qaytish
                    </Link>
                </div>
            )}
        </header>
    );
}
