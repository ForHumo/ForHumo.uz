"use client";

import { Sparkles, MessageCircle } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";

export function BelisAI() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-12">
            {/* Hero */}
            <div className="text-center mb-10">
                <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: BELIS_GOLD_GRADIENT, boxShadow: "0 12px 32px rgba(212,175,55,0.35)" }}>
                    <Sparkles className="w-9 h-9" strokeWidth={1.25} style={{ color: BELIS.onGold }} />
                </div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", color: BELIS.gold, fontSize: 40, margin: "0 0 8px" }}>
                    Humo AI
                </h1>
                <p className="text-sm italic" style={{ color: BELIS.text2, fontFamily: "'Playfair Display', serif" }}>
                    Aytib bering — biz topamiz
                </p>
            </div>

            {/* Placeholder */}
            <div className="p-8 rounded-3xl text-center"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                <MessageCircle className="w-12 h-12 mx-auto mb-3" strokeWidth={1} style={{ color: BELIS.gold }} />
                <p className="text-sm font-bold mb-2" style={{ color: BELIS.text, fontFamily: "'Playfair Display', serif" }}>
                    Tez kunlarda ochiladi
                </p>
                <p className="text-xs max-w-md mx-auto leading-relaxed" style={{ color: BELIS.text2 }}>
                    Humo AI sizga mahsulot topishga yordam beradi. Kimga sovg&apos;a? Qanday byudjet? Qaysi rangda? —
                    aytib bersangiz, biz eng mos to&apos;plamlarni tanlab beramiz.
                </p>
                <BelisLink href="/belis/katalog"
                    className="inline-block mt-5 px-5 py-2.5 rounded-full text-xs font-bold transition hover:brightness-110"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold, fontFamily: "'Montserrat', sans-serif" }}>
                    Hozircha katalogni ko&apos;ring
                </BelisLink>
            </div>

            {/* Tavsiyalar */}
            <div className="mt-8">
                <p className="text-[10px] uppercase tracking-widest text-center mb-3" style={{ color: BELIS.text3 }}>
                    Kelayotgan imkoniyatlar
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                        { t: "🎁 Sovg'a maslahati", d: "Kimga, qanday hodisa uchun — biz taklif qilamiz" },
                        { t: "💬 Ovozli qidiruv", d: "Aytib bering — matn kiritish shart emas" },
                        { t: "📸 Rasmga qarab qidirish", d: "Rasm yuboring — o'xshashini topamiz" },
                    ].map((f, i) => (
                        <div key={i} className="p-4 rounded-2xl text-center"
                            style={{ background: BELIS.surface, border: `1px dashed ${BELIS.borderSoft}` }}>
                            <p className="text-sm font-bold mb-1" style={{ color: BELIS.text }}>{f.t}</p>
                            <p className="text-[11px]" style={{ color: BELIS.text2 }}>{f.d}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
