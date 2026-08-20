"use client";

// Sotuvchi WAITLIST formasi — MChJ ochilishidan oldin sotuvchi bo'lmoqchilar
// telefon qoldirishadi. Ochiq (login shart emas).

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Sparkles, Send, ClipboardList } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";
import { BnBackButton } from "./bn-back-button";
import { BnPhoneInput, isValidUzPhone } from "./bn-phone-input";
import { getAttribution } from "@/lib/bn-analytics";
import type { BnMarketDTO } from "@/lib/bn-data";

interface Props {
    markets?: BnMarketDTO[];
}

export function BnSellerWaitlist({ markets = [] }: Props) {
    const t = useTranslations("bn.waitlist");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("+998");
    const [marketSlug, setMarketSlug] = useState("");
    const [category, setCategory] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    // Atributsiya (UTM/ref) — jo'natishdan oldin o'qib olamiz
    const [source, setSource] = useState<string | null>(null);
    const [ref, setRef] = useState<string | null>(null);
    useEffect(() => {
        const attr = getAttribution();
        if (attr?.source) setSource(attr.source);
        else if (attr?.referrer) setSource(attr.referrer);
        if (attr?.ref) setRef(attr.ref);
    }, []);

    const canSubmit = name.trim().length >= 2 && isValidUzPhone(phone) && !busy;

    async function submit() {
        setBusy(true); setErr(null);
        try {
            const r = await fetch("/api/bn/seller/waitlist", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    phone,
                    marketSlug: marketSlug || null,
                    category: category.trim() || null,
                    note: note.trim() || null,
                    source, ref,
                }),
            });
            const d = await r.json();
            if (r.ok && d?.ok) { setSent(true); return; }
            if (d?.error === "invalid_name")     { setErr(t("errInvalidName")); return; }
            if (d?.error === "invalid_phone")    { setErr(t("errInvalidPhone")); return; }
            if (d?.error === "too_many_requests") { setErr(t("errTooMany")); return; }
            setErr(d?.error ?? t("errGeneric"));
        } catch { setErr(t("errNet")); }
        finally { setBusy(false); }
    }

    if (sent) {
        return (
            <div className="mx-auto max-w-[480px] px-4 pt-6 pb-16">
                <div className="p-7 rounded-3xl text-center"
                    style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}>
                    <span className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5"
                        style={{ background: `${BN.ok}22`, color: BN.ok }}>
                        <Check className="w-7 h-7" strokeWidth={3} />
                    </span>
                    <h1 className="text-[20px] font-black mb-2">{t("sentTitle")}</h1>
                    <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: BN.text2 }}>
                        {t("sentText")}
                    </p>
                    <BnLink href="/" className="inline-flex items-center justify-center w-full h-12 rounded-2xl text-[15px] font-black"
                        style={{ background: BN.gold, color: BN.onGold }}>
                        {t("sentBack")}
                    </BnLink>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[640px] px-4 pt-6 pb-16">
            <BnBackButton fallbackHref="/sotuvchi" />

            <div className="mt-5 mb-6">
                <div className="flex items-center gap-3 mb-3">
                    <span className="w-11 h-11 rounded-2xl grid place-items-center flex-shrink-0"
                        style={{ background: BN.goldSoft, color: BN.gold }}>
                        <ClipboardList className="w-5 h-5" />
                    </span>
                    <h1 className="text-[26px] sm:text-[30px] font-black tracking-tight leading-tight">
                        {t("title")}
                    </h1>
                </div>
                <p className="text-[13.5px] leading-relaxed" style={{ color: BN.text2 }}>
                    {t("subtitle")}
                </p>
            </div>

            {/* Imtiyozlar */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[t("benefit1"), t("benefit2"), t("benefit3")].map((b, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-xl"
                        style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                        <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: BN.gold }} />
                        <p className="text-[12.5px] leading-snug" style={{ color: BN.text2 }}>{b}</p>
                    </div>
                ))}
            </div>

            {/* Forma */}
            <div className="p-5 sm:p-6 rounded-3xl space-y-4"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <Field label={t("nameLabel")}>
                    <input value={name} onChange={e => setName(e.target.value)}
                        placeholder={t("namePh")} maxLength={120}
                        className="bn-wl-input" />
                </Field>

                <Field label={t("phoneLabel")} hint={t("phoneHint")}>
                    <BnPhoneInput value={phone} onChange={setPhone} />
                </Field>

                <Field label={t("marketLabel")} hint={t("marketHint")}>
                    <select value={marketSlug} onChange={e => setMarketSlug(e.target.value)}
                        className="bn-wl-input appearance-none">
                        <option value="">{t("marketPlaceholder")}</option>
                        {markets.map(m => (
                            <option key={m.slug} value={m.slug}>{m.name}</option>
                        ))}
                    </select>
                </Field>

                <Field label={t("categoryLabel")} hint={t("categoryHint")}>
                    <input value={category} onChange={e => setCategory(e.target.value)}
                        placeholder={t("categoryPh")} maxLength={60}
                        className="bn-wl-input" />
                </Field>

                <Field label={t("noteLabel")}>
                    <textarea value={note} onChange={e => setNote(e.target.value)}
                        placeholder={t("notePh")} rows={3} maxLength={500}
                        className="bn-wl-input resize-none py-3" />
                </Field>

                {err && (
                    <div className="p-3 rounded-xl text-[12.5px]"
                        style={{ background: BN.errSoft, color: BN.err, border: `1px solid ${BN.err}33` }}>
                        {err}
                    </div>
                )}

                <button onClick={submit} disabled={!canSubmit}
                    className="w-full h-12 rounded-2xl text-[15px] font-black transition-transform active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: BN.gold, color: BN.onGold }}>
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> {t("submit")}</>}
                </button>
            </div>

            <style jsx global>{`
                .bn-wl-input {
                    width: 100%;
                    height: 46px;
                    border-radius: 12px;
                    padding: 0 14px;
                    font-size: 14px;
                    outline: none;
                    background: ${BN.surfaceUp};
                    border: 1px solid ${BN.border};
                    color: ${BN.text};
                    caret-color: ${BN.gold};
                    transition: border-color .15s;
                }
                .bn-wl-input:focus { border-color: ${BN.goldEdge}; }
                .bn-wl-input::placeholder { color: ${BN.text3}; }
                textarea.bn-wl-input { height: auto; }
            `}</style>
        </div>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-[12.5px] font-bold mb-1.5">{label}</label>
            {children}
            {hint && <p className="text-[11.5px] mt-1.5" style={{ color: BN.text3 }}>{hint}</p>}
        </div>
    );
}
