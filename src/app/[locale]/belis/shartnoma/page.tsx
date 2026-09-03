import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BELIS_CONTRACT_SECTIONS, BELIS_CONTRACT_VERSION } from "@/lib/belis-contract";
import { FileText, Download } from "lucide-react";

export const metadata: Metadata = {
    title: "Sarpo ijara shartnomasi · Belis",
    description: "Belis sarpo qutilarini ijaraga olish shartnomasi. Ijara muddati, zaklat, shtraf, bekor qilish qoidalari.",
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Hero */}
            <div className="rounded-3xl p-6 sm:p-8 mb-6"
                style={{ background: BELIS_GOLD_GRADIENT }}>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-3"
                    style={{ background: "rgba(58,53,32,0.15)", color: BELIS.onGold }}>
                    <FileText className="w-3 h-3" /> Huquqiy hujjat
                </span>
                <h1 className="text-[26px] sm:text-[32px] font-black leading-tight tracking-tight"
                    style={{ color: BELIS.onGold }}>
                    Sarpo ijara shartnomasi
                </h1>
                <p className="text-[13px] mt-2 opacity-90" style={{ color: BELIS.onGold }}>
                    Versiya: {BELIS_CONTRACT_VERSION} · O&apos;zbek Respublikasi qonunchiligiga asosan
                </p>
            </div>

            {/* Sections */}
            <div className="space-y-5">
                {BELIS_CONTRACT_SECTIONS.map(s => (
                    <section key={s.n} className="rounded-2xl p-5"
                        style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="w-9 h-9 rounded-xl grid place-items-center text-[13px] font-black flex-shrink-0"
                                style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                                {s.n}
                            </span>
                            <h2 className="text-[16px] font-black" style={{ color: BELIS.text }}>{s.title}</h2>
                        </div>
                        <ul className="space-y-2 pl-12">
                            {s.items.map((it, i) => (
                                <li key={i} className="text-[13px] leading-relaxed relative"
                                    style={{ color: BELIS.text2 }}>
                                    <span className="absolute -left-4 top-2 w-1.5 h-1.5 rounded-full"
                                        style={{ background: BELIS.goldDeep }} />
                                    {it}
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>

            {/* Footer */}
            <div className="mt-8 p-5 rounded-2xl text-center"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}` }}>
                <p className="text-[12.5px]" style={{ color: BELIS.text2 }}>
                    Shartnomani PDF/TXT ko&apos;rinishida yuklab olish uchun booking wizard&apos;dagi
                    <b> &quot;Shartnomani to&apos;liq o&apos;qish&quot; </b>
                    tugmasini bosing. Har booking'ga alohida imzolangan hujjat shu shartlar asosida tuziladi.
                </p>
                <a href="/belis" className="inline-flex items-center gap-1.5 mt-3 h-10 px-4 rounded-xl text-[13px] font-black"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    <Download className="w-4 h-4" /> Belis'ga qaytish
                </a>
            </div>
        </div>
    );
}
