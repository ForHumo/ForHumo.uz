"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

export interface Country {
    code: string;
    flag: string;
    label: string; // already localised before passing in
}

interface Props {
    countries: Country[];
    value: string;
    onChange: (code: string) => void;
    placeholder?: string;
}

export function CountrySelect({ countries, value, onChange, placeholder = "Tanlang" }: Props) {
    const tCommon = useTranslations("Common");
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selected = countries.find((c) => c.code === value);

    const filtered = search.trim()
        ? countries.filter((c) => c.label.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))
        : countries;

    // Close on outside click
    useEffect(() => {
        function onDown(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    // Focus search when opening
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 50);
        else setSearch("");
    }, [open]);

    return (
        <div ref={ref} className="relative">
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-3 bg-background/60 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all hover:border-border"
            >
                {selected ? (
                    <span className="flex items-center gap-2.5">
                        <span className="text-xl leading-none">{selected.flag}</span>
                        <span className="font-medium">{selected.label}</span>
                    </span>
                ) : (
                    <span className="text-muted-foreground">{placeholder}</span>
                )}
                <motion.svg
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-4 h-4 text-muted-foreground shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </motion.svg>
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 top-[calc(100%+6px)] left-0 right-0 bg-card border border-border/80 rounded-xl shadow-2xl overflow-hidden"
                    >
                        {/* Search */}
                        <div className="p-2 border-b border-border/60">
                            <div className="flex items-center gap-2 bg-background/60 border border-border/60 rounded-lg px-3 py-2">
                                <svg className="w-3.5 h-3.5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    ref={inputRef}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={tCommon("search")}
                                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                                />
                                {search && (
                                    <button type="button" onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-52 overflow-y-auto overscroll-contain py-1">
                            {filtered.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">{tCommon("not_found")}</p>
                            ) : (
                                filtered.map((c) => (
                                    <button
                                        key={c.code}
                                        type="button"
                                        onClick={() => { onChange(c.code); setOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left ${
                                            c.code === value
                                                ? "bg-blue-500/15 text-blue-400 font-semibold"
                                                : "hover:bg-muted/60 text-foreground"
                                        }`}
                                    >
                                        <span className="text-xl leading-none w-7 shrink-0">{c.flag}</span>
                                        <span>{c.label}</span>
                                        <span className="ml-auto text-xs text-muted-foreground font-mono">{c.code}</span>
                                        {c.code === value && (
                                            <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
