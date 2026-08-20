"use client";

import { useState } from "react";
import { BnLink } from "./bn-nav";
import { useSession, signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
    Store, Building2, User, MapPin, Globe, Check, ChevronRight, ChevronLeft,
    ShieldCheck, LogIn, Sparkles, Info, ClipboardList,
} from "lucide-react";
import { BN } from "@/lib/bn-theme";
import type { BnMarketDTO } from "@/lib/bn-data";
import { BnPhoneInput } from "./bn-phone-input";
import { BnMapPicker, type BnLatLng } from "./bn-map-picker";

type Step = 0 | 1 | 2 | 3;
type LegalType = "YATT" | "MCHJ";
type LocType = "IN_MARKET" | "STANDALONE" | "ONLINE";

const STEP_KEYS = ["step1", "step2", "step3", "step4"] as const;

export function BnSellerRegister({ markets = [] }: { markets?: BnMarketDTO[] }) {
    const { status } = useSession();
    const t = useTranslations("bn.sellerReg");
    const tAuth = useTranslations("bn.auth");
    const tBanner = useTranslations("bn.sellerBanner");
    const [step, setStep] = useState<Step>(0);
    const [waitlistHidden, setWaitlistHidden] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitErr, setSubmitErr] = useState<string | null>(null);

    // 1-qadam
    const [legalType, setLegalType] = useState<LegalType | null>(null);
    const [inn, setInn] = useState("");
    const [legalName, setLegalName] = useState("");
    const [phone, setPhone] = useState("+998");

    // 2-qadam
    const [shopName, setShopName] = useState("");
    const [shopDesc, setShopDesc] = useState("");

    // 3-qadam
    const [locType, setLocType] = useState<LocType | null>(null);
    const [marketSlug, setMarketSlug] = useState("");
    const [section, setSection] = useState("");
    const [shopNo, setShopNo] = useState("");
    const [address, setAddress] = useState("");
    const [shopLoc, setShopLoc] = useState<{ lat: number; lng: number } | null>(null);

    // 4-qadam
    const [bankName, setBankName] = useState("");
    const [bankAccount, setBankAccount] = useState("");
    const [bankMfo, setBankMfo] = useState("");

    const [sent, setSent] = useState(false);

    const market = markets.find(m => m.slug === marketSlug);

    const canNext =
        step === 0 ? !!legalType && inn.replace(/\D/g, "").length >= 9 && legalName.trim().length > 2 && phone.replace(/\D/g, "").length >= 12 :
        step === 1 ? shopName.trim().length > 1 :
        step === 2 ? (locType === "ONLINE" || (locType === "IN_MARKET" && !!marketSlug) || (locType === "STANDALONE" && address.trim().length > 4)) :
        bankAccount.replace(/\D/g, "").length >= 16 && bankMfo.replace(/\D/g, "").length >= 5;

    // ── Kirish talab qilinadi ──
    if (status === "unauthenticated") {
        return (
            <Wrap>
                <div
                    className="max-w-[460px] mx-auto p-7 rounded-3xl text-center"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <span
                        className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <Store className="w-7 h-7" />
                    </span>
                    <h1 className="text-[20px] font-black mb-2">{t("titleGate")}</h1>
                    <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: BN.text2 }}>
                        {t("gateText")}
                    </p>
                    <button
                        onClick={() => signIn("google")}
                        className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[15px] font-black transition-transform active:scale-[0.98]"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        <LogIn className="w-5 h-5" />
                        {tAuth("signInWithHumoID")}
                    </button>
                </div>
            </Wrap>
        );
    }

    // ── Ariza yuborildi ──
    if (sent) {
        return (
            <Wrap>
                <div
                    className="max-w-[460px] mx-auto p-7 rounded-3xl text-center"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <span
                        className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5"
                        style={{ background: `${BN.ok}1F`, color: BN.ok }}
                    >
                        <Check className="w-7 h-7" strokeWidth={3} />
                    </span>
                    <h1 className="text-[20px] font-black mb-2">{t("sentTitle")}</h1>
                    <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: BN.text2 }}>
                        {t("sentText")}
                    </p>
                    <BnLink
                        href="/"
                        className="inline-flex items-center justify-center w-full h-12 rounded-2xl text-[15px] font-black"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        {t("toHome")}
                    </BnLink>
                </div>
            </Wrap>
        );
    }

    return (
        <Wrap>
            <div className="max-w-[640px] mx-auto">
                <h1 className="text-[26px] sm:text-[32px] font-black tracking-tight mb-2">{t("title")}</h1>
                <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: BN.text2 }}>
                    {t("subtitle")}
                </p>

                {/* MChJ tayyor emas? Waitlist banner (bir marta yashirilishi mumkin) */}
                {!waitlistHidden && (
                    <div className="mb-6 p-4 rounded-2xl flex items-start gap-3 flex-wrap"
                        style={{ background: BN.goldSoft, border: `1px solid ${BN.goldEdge}` }}>
                        <span className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                            style={{ background: BN.gold, color: BN.onGold }}>
                            <ClipboardList className="w-5 h-5" />
                        </span>
                        <div className="flex-1 min-w-[240px]">
                            <p className="text-[14px] font-black" style={{ color: BN.gold }}>{tBanner("waitlistTitle")}</p>
                            <p className="text-[12.5px] leading-relaxed mt-0.5" style={{ color: BN.text2 }}>
                                {tBanner("waitlistText")}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <BnLink href="/sotuvchi/waitlist"
                                className="h-10 px-4 rounded-xl text-[13px] font-black flex items-center gap-1.5"
                                style={{ background: BN.gold, color: BN.onGold }}>
                                {tBanner("waitlistBtn")}
                                <ChevronRight className="w-4 h-4" />
                            </BnLink>
                            <button onClick={() => setWaitlistHidden(true)}
                                className="h-10 px-3 rounded-xl text-[12px] font-bold"
                                style={{ background: "transparent", color: BN.text3 }}>
                                {tBanner("haveDocs")}
                            </button>
                        </div>
                    </div>
                )}

                {/* Qadamlar */}
                <div className="flex items-center gap-1.5 mb-7">
                    {STEP_KEYS.map((k, i) => (
                        <div key={k} className="flex-1 min-w-0">
                            <div
                                className="h-1 rounded-full mb-2 transition-colors"
                                style={{ background: i <= step ? BN.gold : "rgba(255,255,255,0.1)" }}
                            />
                            <p
                                className="text-[11px] font-bold truncate transition-colors"
                                style={{ color: i <= step ? BN.gold : BN.text3 }}
                            >
                                {t(k)}
                            </p>
                        </div>
                    ))}
                </div>

                <div
                    className="p-5 sm:p-6 rounded-3xl"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    {/* ── 1: Yuridik shakl ── */}
                    {step === 0 && (
                        <>
                            <StepTitle
                                title={t("s1Title")}
                                text={t("s1Text")}
                            />
                            <div className="grid grid-cols-2 gap-2.5 mb-5">
                                <Choice
                                    active={legalType === "YATT"}
                                    onClick={() => setLegalType("YATT")}
                                    icon={<User className="w-5 h-5" />}
                                    title={t("legalYatt")}
                                    text={t("legalYattDesc")}
                                />
                                <Choice
                                    active={legalType === "MCHJ"}
                                    onClick={() => setLegalType("MCHJ")}
                                    icon={<Building2 className="w-5 h-5" />}
                                    title={t("legalMchj")}
                                    text={t("legalMchjDesc")}
                                />
                            </div>

                            <Field label={t("innLabel")} hint={t("innHint")}>
                                <input
                                    value={inn}
                                    onChange={e => setInn(e.target.value.replace(/\D/g, "").slice(0, 12))}
                                    inputMode="numeric"
                                    placeholder="123456789"
                                    className="bn-input"
                                />
                            </Field>

                            <Field label={legalType === "MCHJ" ? t("legalNameMchj") : t("legalNameYatt")}>
                                <input
                                    value={legalName}
                                    onChange={e => setLegalName(e.target.value)}
                                    placeholder={legalType === "MCHJ" ? t("legalNamePhMchj") : t("legalNamePhYatt")}
                                    className="bn-input"
                                />
                            </Field>

                            <Field label={t("phoneLabel")} hint={t("phoneHint")}>
                                <BnPhoneInput value={phone} onChange={setPhone} />
                            </Field>
                        </>
                    )}

                    {/* ── 2: Do'kon ── */}
                    {step === 1 && (
                        <>
                            <StepTitle
                                title={t("s2Title")}
                                text={t("s2Text")}
                            />
                            <Field label={t("shopNameLabel")}>
                                <input
                                    value={shopName}
                                    onChange={e => setShopName(e.target.value)}
                                    placeholder={t("shopNamePh")}
                                    className="bn-input"
                                />
                            </Field>
                            <Field label={t("shopDescLabel")} hint={t("shopDescHint")}>
                                <textarea
                                    value={shopDesc}
                                    onChange={e => setShopDesc(e.target.value)}
                                    rows={3}
                                    placeholder={t("shopDescPh")}
                                    className="bn-input resize-none py-3"
                                />
                            </Field>

                            <div
                                className="flex items-start gap-2.5 p-3.5 rounded-xl"
                                style={{ background: BN.goldSoft, border: `1px solid ${BN.goldEdge}` }}
                            >
                                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: BN.gold }} />
                                <p className="text-[12.5px] leading-relaxed" style={{ color: BN.text2 }}>
                                    {t("aiHint")}
                                </p>
                            </div>
                        </>
                    )}

                    {/* ── 3: Joylashuv — rejadagi "bitta savol" ── */}
                    {step === 2 && (
                        <>
                            <StepTitle
                                title={t("s3Title")}
                                text={t("s3Text")}
                            />
                            <div className="space-y-2.5 mb-5">
                                <ChoiceRow
                                    active={locType === "IN_MARKET"}
                                    onClick={() => setLocType("IN_MARKET")}
                                    icon={<Store className="w-5 h-5" />}
                                    title={t("locMarket")}
                                    text={t("locMarketDesc")}
                                />
                                <ChoiceRow
                                    active={locType === "STANDALONE"}
                                    onClick={() => setLocType("STANDALONE")}
                                    icon={<MapPin className="w-5 h-5" />}
                                    title={t("locStreet")}
                                    text={t("locStreetDesc")}
                                />
                                <ChoiceRow
                                    active={locType === "ONLINE"}
                                    onClick={() => setLocType("ONLINE")}
                                    icon={<Globe className="w-5 h-5" />}
                                    title={t("locOnline")}
                                    text={t("locOnlineDesc")}
                                />
                            </div>

                            {locType === "IN_MARKET" && (
                                <>
                                    <Field label={t("whichMarket")}>
                                        <div className="grid grid-cols-1 gap-1.5">
                                            {markets.length === 0 && (
                                                <p className="text-[12.5px] p-2 rounded-lg" style={{ color: BN.text3, background: BN.surfaceUp }}>
                                                    {t("noMarkets")}
                                                </p>
                                            )}
                                            {markets.map(m => (
                                                <button
                                                    key={m.slug}
                                                    onClick={() => { setMarketSlug(m.slug); setSection(""); }}
                                                    className="flex items-center gap-2.5 h-11 px-3 rounded-xl text-[13.5px] font-medium text-left transition-colors"
                                                    style={{ background: marketSlug === m.slug ? BN.goldSoft : BN.surfaceUp }}
                                                >
                                                    <span
                                                        className="w-[18px] h-[18px] rounded-full flex-shrink-0 grid place-items-center"
                                                        style={{ border: `2px solid ${marketSlug === m.slug ? BN.gold : "rgba(255,255,255,0.2)"}` }}
                                                    >
                                                        {marketSlug === m.slug && (
                                                            <span className="w-2 h-2 rounded-full" style={{ background: BN.gold }} />
                                                        )}
                                                    </span>
                                                    <span className="truncate" style={{ color: marketSlug === m.slug ? BN.gold : BN.text }}>
                                                        {m.name}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </Field>

                                    {market && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label={t("sectionLabel")}>
                                                <div className="grid grid-cols-1 gap-1.5 max-h-[152px] overflow-y-auto">
                                                    {market.sections.map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => setSection(s)}
                                                            className="h-10 px-3 rounded-xl text-[13px] font-medium text-left transition-colors truncate"
                                                            style={{
                                                                background: section === s ? BN.goldSoft : BN.surfaceUp,
                                                                color: section === s ? BN.gold : BN.text,
                                                            }}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </Field>
                                            <Field label={t("shopNoLabel")}>
                                                <input
                                                    value={shopNo}
                                                    onChange={e => setShopNo(e.target.value.slice(0, 10))}
                                                    placeholder="45"
                                                    className="bn-input"
                                                />
                                            </Field>
                                        </div>
                                    )}
                                </>
                            )}

                            {locType === "STANDALONE" && (
                                <Field label={t("shopAddressLabel")} hint={t("shopAddressHint")}>
                                    <BnMapPicker
                                        value={shopLoc ? { lat: shopLoc.lat, lng: shopLoc.lng, address } : null}
                                        onChange={(v: BnLatLng) => { setShopLoc({ lat: v.lat, lng: v.lng }); setAddress(v.address); }}
                                        placeholder={t("shopMapPh")}
                                    />
                                </Field>
                            )}

                            {locType === "ONLINE" && (
                                <div
                                    className="flex items-start gap-2.5 p-3.5 rounded-xl"
                                    style={{ background: BN.surfaceUp }}
                                >
                                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: BN.text3 }} />
                                    <p className="text-[12.5px] leading-relaxed" style={{ color: BN.text2 }}>
                                        {t("onlineNote")}
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── 4: Bank ── */}
                    {step === 3 && (
                        <>
                            <StepTitle
                                title={t("s4Title")}
                                text={t("s4Text")}
                            />
                            <Field label={t("bankNameLabel")}>
                                <input
                                    value={bankName}
                                    onChange={e => setBankName(e.target.value)}
                                    placeholder={t("bankNamePh")}
                                    className="bn-input"
                                />
                            </Field>
                            <Field label={t("bankAccountLabel")} hint={t("bankAccountHint")}>
                                <input
                                    value={bankAccount}
                                    onChange={e => setBankAccount(e.target.value.replace(/\D/g, "").slice(0, 20))}
                                    inputMode="numeric"
                                    placeholder="20208000..."
                                    className="bn-input tabular-nums"
                                />
                            </Field>
                            <Field label={t("bankMfoLabel")} hint={t("bankMfoHint")}>
                                <input
                                    value={bankMfo}
                                    onChange={e => setBankMfo(e.target.value.replace(/\D/g, "").slice(0, 5))}
                                    inputMode="numeric"
                                    placeholder="00014"
                                    className="bn-input tabular-nums"
                                />
                            </Field>

                            <div
                                className="flex items-start gap-2.5 p-3.5 rounded-xl"
                                style={{ background: BN.surfaceUp }}
                            >
                                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: BN.ok }} />
                                <p className="text-[12.5px] leading-relaxed" style={{ color: BN.text2 }}>
                                    {t("commissionNote", { pct: 5 })}
                                </p>
                            </div>
                        </>
                    )}

                    {/* Navigatsiya */}
                    {submitErr && (
                        <div
                            className="mt-4 p-3 rounded-xl text-[12.5px]"
                            style={{ background: BN.errSoft, color: BN.err, border: `1px solid ${BN.err}33` }}
                        >
                            {submitErr}
                        </div>
                    )}

                    <div className="flex items-center gap-2.5 mt-6">
                        {step > 0 && (
                            <button
                                onClick={() => setStep(s => (s - 1) as Step)}
                                className="flex items-center justify-center gap-1.5 h-12 px-5 rounded-2xl text-[14px] font-bold"
                                style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text2 }}
                            >
                                <ChevronLeft className="w-4 h-4" />
                                {t("back")}
                            </button>
                        )}
                        <button
                            onClick={async () => {
                                if (step < 3) { setStep(s => (s + 1) as Step); return; }
                                setSubmitting(true); setSubmitErr(null);
                                try {
                                    const r = await fetch("/api/bn/seller/apply", {
                                        method: "POST",
                                        headers: { "content-type": "application/json" },
                                        body: JSON.stringify({
                                            legalType, legalName, innNumber: inn, phone,
                                            shopName, description: shopDesc,
                                            locationType: locType,
                                            marketSlug: locType === "IN_MARKET" ? marketSlug : null,
                                            marketSection: section, marketShopNo: shopNo,
                                            address, city: "Toshkent",
                                            lat: shopLoc?.lat ?? null,
                                            lng: shopLoc?.lng ?? null,
                                            bankName, bankAccount, bankMfo,
                                        }),
                                    });
                                    const d = await r.json();
                                    if (r.ok && d?.ok) { setSent(true); }
                                    else if (d?.error === "inn_taken") setSubmitErr(t("errInnTaken"));
                                    else if (d?.error === "already_has_shop") setSubmitErr(t("errAlreadyShop"));
                                    else setSubmitErr(d?.error ?? t("errGeneric"));
                                } catch {
                                    setSubmitErr(t("errNet"));
                                } finally { setSubmitting(false); }
                            }}
                            disabled={!canNext || submitting}
                            className="flex items-center justify-center gap-1.5 flex-1 h-12 rounded-2xl text-[15px] font-black transition-all active:scale-[0.98] disabled:opacity-35"
                            style={{ background: BN.gold, color: BN.onGold }}
                        >
                            {submitting ? t("sending") : step === 3 ? t("submit") : t("next")}
                            {step < 3 && !submitting && <ChevronRight className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .bn-input {
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
                .bn-input:focus { border-color: ${BN.goldEdge}; }
                .bn-input::placeholder { color: ${BN.text3}; }
                textarea.bn-input { height: auto; }
            `}</style>
        </Wrap>
    );
}

function Wrap({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto max-w-[1280px] px-4 py-8 pb-16">{children}</div>;
}

function StepTitle({ title, text }: { title: string; text: string }) {
    return (
        <div className="mb-5">
            <h2 className="text-[18px] font-black mb-1.5">{title}</h2>
            <p className="text-[13px] leading-relaxed" style={{ color: BN.text3 }}>{text}</p>
        </div>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <label className="block text-[12.5px] font-bold mb-1.5">{label}</label>
            {children}
            {hint && <p className="text-[11.5px] mt-1.5" style={{ color: BN.text3 }}>{hint}</p>}
        </div>
    );
}

function Choice({
    active, onClick, icon, title, text,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; text: string }) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{
                background: active ? BN.goldSoft : BN.surfaceUp,
                border: `1px solid ${active ? BN.gold : BN.border}`,
            }}
        >
            <span style={{ color: active ? BN.gold : BN.text3 }}>{icon}</span>
            <span>
                <span className="block text-[14px] font-black" style={{ color: active ? BN.gold : BN.text }}>
                    {title}
                </span>
                <span className="block text-[11.5px] mt-0.5 leading-snug" style={{ color: BN.text3 }}>{text}</span>
            </span>
        </button>
    );
}

function ChoiceRow({
    active, onClick, icon, title, text,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; text: string }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-3.5 w-full p-4 rounded-2xl text-left transition-all active:scale-[0.99]"
            style={{
                background: active ? BN.goldSoft : BN.surfaceUp,
                border: `1px solid ${active ? BN.gold : BN.border}`,
            }}
        >
            <span
                className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0"
                style={{ background: active ? "rgba(245,179,1,0.16)" : "rgba(255,255,255,0.04)", color: active ? BN.gold : BN.text3 }}
            >
                {icon}
            </span>
            <span className="flex-1 min-w-0">
                <span className="block text-[14.5px] font-black" style={{ color: active ? BN.gold : BN.text }}>
                    {title}
                </span>
                <span className="block text-[12px] mt-0.5 leading-snug" style={{ color: BN.text3 }}>{text}</span>
            </span>
            <span
                className="w-5 h-5 rounded-full flex-shrink-0 grid place-items-center"
                style={{ border: `2px solid ${active ? BN.gold : "rgba(255,255,255,0.18)"}` }}
            >
                {active && <Check className="w-3 h-3" style={{ color: BN.gold }} strokeWidth={4} />}
            </span>
        </button>
    );
}
