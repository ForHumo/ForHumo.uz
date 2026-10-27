"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname, routing } from "@/i18n/routing";
import { Languages, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { UZ_SCRIPTS, getUzScript, setUzScript, type UzScript } from "@/lib/uz-script-client";

export function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [script, setScript] = useState<UzScript>("latn");
    const dropdownRef = useRef<HTMLDivElement>(null);

    const languages = [
        { code: "uz", name: "O'zbek" },
        { code: "ru", name: "Русский" },
        { code: "en", name: "English" },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => { setScript(getUzScript()); }, []);

    const handleLocaleChange = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
        setIsOpen(false);
    };

    const handleScriptChange = (s: UzScript) => {
        if (s === script) { setIsOpen(false); return; }
        setUzScript(s);            // cookie + reload (SSR xabarlarni qayta o'giradi)
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Select Language"
            >
                <Languages size={20} />
                <span className="text-sm font-medium uppercase">{locale}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-44 origin-top-right rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-1 shadow-xl z-50">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleLocaleChange(lang.code)}
                            className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                locale === lang.code
                                    ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-semibold"
                                    : "text-gray-500 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            <span>{lang.name}</span>
                        </button>
                    ))}

                    {/* Alifbo — faqat o'zbek tilida. Tilni almashtirmaydi, faqat yozuvni. */}
                    {locale === "uz" && (
                        <>
                            <div className="my-1 border-t border-gray-200 dark:border-white/10" />
                            <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/40">Alifbo</p>
                            {UZ_SCRIPTS.map((s) => (
                                <button
                                    key={s.code}
                                    onClick={() => handleScriptChange(s.code)}
                                    className={cn(
                                        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                        script === s.code
                                            ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-semibold"
                                            : "text-gray-500 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white"
                                    )}
                                >
                                    <span>{s.label}</span>
                                    {script === s.code && <Check size={14} />}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
