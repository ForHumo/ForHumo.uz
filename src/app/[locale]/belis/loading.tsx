import { BELIS, BELIS_BG_GRADIENT, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";

// Belis modul loading — For Humo emas, Belis brand.
export default function BelisLoading() {
    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4"
            style={{ background: BELIS_BG_GRADIENT }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/belis/belis.png" alt="Belis" className="h-20 w-auto object-contain opacity-90" />
            <div className="relative w-14 h-14 rounded-full grid place-items-center"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                <span className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: BELIS.gold, opacity: 0.28 }} />
                <span className="w-8 h-8 rounded-full"
                    style={{ background: BELIS_GOLD_GRADIENT }} />
            </div>
            <p className="text-xs uppercase tracking-widest" style={{ color: BELIS.text2 }}>
                Yuklanmoqda…
            </p>
        </div>
    );
}
