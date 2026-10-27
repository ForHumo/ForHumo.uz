"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { Languages, Check } from "lucide-react";
import { UZ_SCRIPTS, getUzScript, setUzScript, type UzScript } from "@/lib/uz-script-client";

const BLUE = "#2563EB", CYAN = "#22D3EE";
const LANGS = [
    { code: "uz", name: "O'zbek" },
    { code: "ru", name: "Русский" },
    { code: "en", name: "English" },
];

// YukGo header uchun til + alifbo almashtirgich (dark/ko'k shell'ga mos).
// Global LanguageSwitcher YukGo overlay'i ostida ko'rinmaydi, shuning uchun alohida.
export function YukGoLangMenu() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [script, setScript] = useState<UzScript>("latn");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => { setScript(getUzScript()); }, []);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const row = (active: boolean): React.CSSProperties => ({
        background: active ? "rgba(37,99,235,0.18)" : "transparent",
        color: active ? "#E8EDF7" : "#9FB3D9",
    });

    return (
        <div className="relative flex-shrink-0" ref={ref}>
            <button onClick={() => setOpen(!open)}
                className="h-10 px-2.5 rounded-xl flex items-center gap-1 active:scale-95"
                style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.3)" }}
                aria-label="Til / Alifbo">
                <Languages className="w-4 h-4" style={{ color: CYAN }} />
                <span className="text-[11px] font-black uppercase" style={{ color: "#9FB3D9" }}>{locale}</span>
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl p-1 shadow-2xl z-50"
                    style={{ background: "#0E1528", border: "1px solid rgba(37,99,235,0.35)" }}>
                    {LANGS.map((l) => (
                        <button key={l.code}
                            onClick={() => { router.replace(pathname, { locale: l.code }); setOpen(false); }}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition"
                            style={row(locale === l.code)}>
                            <span>{l.name}</span>
                            {locale === l.code && <Check className="w-3.5 h-3.5" style={{ color: CYAN }} />}
                        </button>
                    ))}

                    {locale === "uz" && (
                        <>
                            <div className="my-1 border-t" style={{ borderColor: "rgba(37,99,235,0.2)" }} />
                            <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: "#4B5B7A" }}>Alifbo</p>
                            {UZ_SCRIPTS.map((s) => (
                                <button key={s.code}
                                    onClick={() => { if (s.code === script) { setOpen(false); return; } setUzScript(s.code); }}
                                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition"
                                    style={row(script === s.code)}>
                                    <span>{s.label}</span>
                                    {script === s.code && <Check className="w-3.5 h-3.5" style={{ color: CYAN }} />}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
