"use client";

// Sotuvchi dashboard'da QR kartochka: do'kon uchun premium print QR.
// Tema: tungi/tongi. Til: 1-3 tildan tanlab olinadi (bir listda birga chiqadi).

import { useState } from "react";
import { QrCode, Download, Printer, ExternalLink, Sun, Moon, Check } from "lucide-react";
import { BnSelect } from "@/components/bn/bn-select";

type Theme = "dark" | "light";
type Lang = "uz" | "ru" | "en";
const LANG_LABELS: Record<Lang, string> = { uz: "O'zbek", ru: "Русский", en: "English" };

export function BnShopQrPanel({ shopSlug, shopName }: { shopSlug: string; shopName: string }) {
    const [size, setSize] = useState<"a5" | "a4">("a5");
    const [theme, setTheme] = useState<Theme>("dark");
    const [langs, setLangs] = useState<Lang[]>(["uz"]);

    const langsStr = langs.length > 0 ? langs.join(",") : "uz";

    const svgUrl = `/api/bn/shops/${shopSlug}/qr`;
    const pngUrl = `/api/bn/shops/${shopSlug}/qr?format=png`;
    const printUrl = `/api/bn/shops/${shopSlug}/qr/print?size=${size}&theme=${theme}&langs=${langsStr}`;
    const targetUrl = `https://bozornarxida.uz/d/${shopSlug}?scan=1`;

    const openPrint = () => {
        window.open(printUrl, "_blank", "width=920,height=1150");
    };

    const toggleLang = (l: Lang) => {
        setLangs(prev => {
            const has = prev.includes(l);
            if (has) {
                if (prev.length === 1) return prev;   // Kamida 1 til qolishi kerak
                return prev.filter(x => x !== l);
            }
            return [...prev, l];
        });
    };

    return (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3 bg-white dark:bg-neutral-900">
            <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-sm">Do&apos;kon uchun QR-kod (premium)</h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Chop etib do&apos;koningizga qo&apos;ying. Xaridor skan qilsa Bozor Narxida&apos;dan
                For Pay bilan xarid qiladi yoki xaridni tarixga qo&apos;shadi.
            </p>

            {/* Preview */}
            <div className="flex justify-center py-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                <img src={svgUrl} alt="QR" className="w-40 h-40" />
            </div>

            {/* Tema tanlash */}
            <div>
                <div className="text-xs font-medium mb-1.5 text-neutral-600 dark:text-neutral-400">Fon rejimi</div>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setTheme("dark")}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                            theme === "dark"
                                ? "border-amber-500 bg-neutral-900 text-white"
                                : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        }`}
                    >
                        <Moon className="w-3.5 h-3.5" />
                        Tungi (dark)
                    </button>
                    <button
                        onClick={() => setTheme("light")}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                            theme === "light"
                                ? "border-amber-500 bg-white text-neutral-900"
                                : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        }`}
                    >
                        <Sun className="w-3.5 h-3.5" />
                        Tongi (light)
                    </button>
                </div>
            </div>

            {/* Til tanlash */}
            <div>
                <div className="text-xs font-medium mb-1.5 text-neutral-600 dark:text-neutral-400">
                    Til (bittadan uchtagacha)
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {(["uz", "ru", "en"] as Lang[]).map(l => {
                        const active = langs.includes(l);
                        return (
                            <button
                                key={l}
                                onClick={() => toggleLang(l)}
                                className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                    active
                                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                                        : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-500"
                                }`}
                            >
                                {active && <Check className="w-3 h-3" />}
                                {LANG_LABELS[l]}
                            </button>
                        );
                    })}
                </div>
                {langs.length > 1 && (
                    <div className="mt-1.5 text-[10.5px] text-neutral-500">
                        Bitta chop etilgan varaqda {langs.length} til birga chiqadi.
                    </div>
                )}
            </div>

            {/* Hajm */}
            <div className="flex items-center gap-2">
                <label className="text-xs text-neutral-600 dark:text-neutral-400 shrink-0">Hajmi:</label>
                <BnSelect
                    className="flex-1 max-w-[220px]"
                    ariaLabel="Chop etish hajmi"
                    value={size}
                    onChange={v => setSize(v as "a4" | "a5")}
                    options={[
                        { value: "a5", label: "A5 (o'rta)" },
                        { value: "a4", label: "A4 (katta)" },
                    ]}
                />
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={openPrint}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600"
                >
                    <Printer className="w-4 h-4" />
                    Chop etish
                </button>
                <a
                    href={pngUrl}
                    download={`qr-${shopSlug}.png`}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                    <Download className="w-4 h-4" />
                    Faqat QR (PNG)
                </a>
            </div>

            <a
                href={targetUrl}
                target="_blank"
                rel="noopener"
                className="text-[11px] text-neutral-500 hover:text-amber-600 flex items-center justify-center gap-1"
            >
                {targetUrl}
                <ExternalLink className="w-3 h-3" />
            </a>
        </div>
    );
}
