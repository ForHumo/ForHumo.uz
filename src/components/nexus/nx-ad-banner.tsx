"use client";

// Katta reklama banneri (Asosiy sahifada TOP 50 dan keyin)
// Hozircha static promo — kelajakda backend orqali dinamik reklama
import { Link } from "@/i18n/routing";
import { Sparkles, ArrowRight } from "lucide-react";

export function NxAdBanner() {
    // Placeholder — kelajakda /api/nexus/ads endpoint'dan olinadi
    return (
        <div className="mx-4 mt-3 mb-4">
            <Link href="/pay"
                className="relative block h-32 sm:h-40 rounded-2xl overflow-hidden group active:scale-[0.99] transition-transform"
                style={{
                    background: "linear-gradient(135deg, #2B3EE8 0%, #6D28D9 50%, #EC4899 100%)",
                    boxShadow: "0 12px 40px rgba(43,62,232,0.35)",
                }}>
                {/* Dekorativ elementlar */}
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)" }} />
                <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(0,206,200,0.30) 0%, transparent 70%)" }} />

                <div className="relative h-full flex items-center gap-4 p-5">
                    <div className="flex-1 min-w-0">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-2"
                            style={{ background: "rgba(255,255,255,0.20)", color: "#fff", backdropFilter: "blur(4px)" }}>
                            <Sparkles className="w-2.5 h-2.5" /> Reklama
                        </div>
                        <h3 className="text-lg sm:text-2xl font-black text-white leading-tight mb-1">
                            For Pay hamyoni
                        </h3>
                        <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
                            Nexus ijodkorlariga tip yuboring, pullik postlarni sotib oling
                        </p>
                        <div className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 rounded-xl text-xs font-black text-white"
                            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }}>
                            Ochish <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}
