"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { CountrySelect, type Country } from "@/components/ui/country-select";
import { DatePickerCalendar } from "@/components/ui/date-picker-calendar";
import { LocationPicker } from "@/components/ui/location-picker";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

// ─── Country data ─────────────────────────────────────────────────────────────
const COUNTRIES_RAW = [
    { code: "UZ", flag: "🇺🇿", uz: "O'zbekiston", ru: "Узбекистан", en: "Uzbekistan" },
    { code: "RU", flag: "🇷🇺", uz: "Rossiya", ru: "Россия", en: "Russia" },
    { code: "KZ", flag: "🇰🇿", uz: "Qozog'iston", ru: "Казахстан", en: "Kazakhstan" },
    { code: "KG", flag: "🇰🇬", uz: "Qirg'iziston", ru: "Кыргызстан", en: "Kyrgyzstan" },
    { code: "TJ", flag: "🇹🇯", uz: "Tojikiston", ru: "Таджикистан", en: "Tajikistan" },
    { code: "TM", flag: "🇹🇲", uz: "Turkmaniston", ru: "Туркменистан", en: "Turkmenistan" },
    { code: "AZ", flag: "🇦🇿", uz: "Ozarbayjon", ru: "Азербайджан", en: "Azerbaijan" },
    { code: "GE", flag: "🇬🇪", uz: "Gruziya", ru: "Грузия", en: "Georgia" },
    { code: "TR", flag: "🇹🇷", uz: "Turkiya", ru: "Турция", en: "Turkey" },
    { code: "DE", flag: "🇩🇪", uz: "Germaniya", ru: "Германия", en: "Germany" },
    { code: "FR", flag: "🇫🇷", uz: "Frantsiya", ru: "Франция", en: "France" },
    { code: "GB", flag: "🇬🇧", uz: "Britaniya", ru: "Великобритания", en: "United Kingdom" },
    { code: "US", flag: "🇺🇸", uz: "AQSH", ru: "США", en: "USA" },
    { code: "KR", flag: "🇰🇷", uz: "Janubiy Koreya", ru: "Южная Корея", en: "South Korea" },
    { code: "JP", flag: "🇯🇵", uz: "Yaponiya", ru: "Япония", en: "Japan" },
    { code: "CN", flag: "🇨🇳", uz: "Xitoy", ru: "Китай", en: "China" },
    { code: "IN", flag: "🇮🇳", uz: "Hindiston", ru: "Индия", en: "India" },
    { code: "AE", flag: "🇦🇪", uz: "BAA", ru: "ОАЭ", en: "UAE" },
    { code: "SA", flag: "🇸🇦", uz: "Saudiya Arabistoni", ru: "Саудовская Аравия", en: "Saudi Arabia" },
];

function buildCountries(locale: string): Country[] {
    return COUNTRIES_RAW.map((c) => ({
        code: c.code,
        flag: c.flag,
        label: locale === "ru" ? c.ru : locale === "en" ? c.en : c.uz,
    }));
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface WizardProps {
    onComplete: () => void;
    locale: string;
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

// ─── Dots progress bar ────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center gap-2">
            {Array.from({ length: total }).map((_, i) => (
                <motion.div
                    key={i}
                    animate={{
                        width: i === current ? 20 : 8,
                        backgroundColor:
                            i <= current ? "rgb(59,130,246)" : "rgb(100,116,139)",
                        opacity: i <= current ? 1 : 0.35,
                    }}
                    transition={{ duration: 0.25 }}
                    className="h-2 rounded-full"
                />
            ))}
        </div>
    );
}

// ─── Shared input class ───────────────────────────────────────────────────────
const inputCls =
    "w-full bg-background/60 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all";

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({
    label,
    children,
    required,
    optional,
}: {
    label: string;
    children: React.ReactNode;
    required?: boolean;
    optional?: boolean;
}) {
    const t = useTranslations("Onboarding");
    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-foreground">{label}</label>
                {required && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
                        {t("required_badge")}
                    </span>
                )}
                {optional && (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
                        {t("optional_badge")}
                    </span>
                )}
            </div>
            {children}
        </div>
    );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────
function PrimaryButton({
    onClick,
    children,
    loading,
    className = "",
}: {
    onClick?: () => void;
    children: React.ReactNode;
    loading?: boolean;
    className?: string;
}) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[.98] text-white font-semibold text-sm transition-all disabled:opacity-60 ${className}`}
        >
            {loading && (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            )}
            {children}
        </button>
    );
}

function SecondaryButton({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center justify-center h-12 px-5 rounded-xl border border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground font-medium text-sm transition-all"
        >
            {children}
        </button>
    );
}

// ─── Card shell ───────────────────────────────────────────────────────────────
function WizardCard({
    step,
    total,
    title,
    desc,
    children,
}: {
    step: number;
    total: number;
    title: string;
    desc: string;
    children: React.ReactNode;
}) {
    const t = useTranslations("Onboarding");
    return (
        <div className="bg-card/80 backdrop-blur-xl border border-border/60 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                        {t("step_of", { current: step + 1, total })}
                    </p>
                    <h2 className="text-xl font-extrabold text-foreground leading-tight">{title}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className="relative w-8 h-8">
                        <Image src="/logo.png" alt="For Humo" fill className="object-contain" />
                    </div>
                    <div className="relative w-8 h-8">
                        <Image src="/logos/humo-id.png" alt="Humo ID" fill className="object-contain" />
                    </div>
                </div>
            </div>
            <StepDots current={step} total={total} />
            {children}
        </div>
    );
}

// ─── Avatar upload with circular crop ────────────────────────────────────────
function AvatarUpload({
    currentUrl,
    onUploaded,
}: {
    currentUrl?: string | null;
    onUploaded: (url: string) => void;
}) {
    const t = useTranslations("Onboarding");
    const [preview, setPreview] = useState<string | null>(null);
    const [deleted, setDeleted] = useState(false);
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    function handleFileSelected(file: File) {
        if (!file.type.startsWith("image/")) { setError(t("file_invalid")); return; }
        if (file.size > 8 * 1024 * 1024) { setError(t("file_too_large")); return; }
        setError("");
        setCropSrc(URL.createObjectURL(file));
    }

    async function handleCropConfirm(blob: Blob) {
        setCropSrc(null);
        setDeleted(false);
        const localUrl = URL.createObjectURL(blob);
        setPreview(localUrl);

        setUploading(true);
        const fd = new FormData();
        fd.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
        try {
            const res = await fetch("/api/user/upload-avatar", { method: "POST", body: fd });
            const data = await res.json();
            if (data.url) {
                onUploaded(data.url);
                setPreview(data.url);
            } else if (data.error === "storage_not_configured") {
                onUploaded(localUrl);
            } else {
                setError(t("upload_error"));
            }
        } catch {
            setError(t("upload_error"));
        } finally {
            setUploading(false);
        }
    }

    function handleDelete() {
        setPreview(null);
        setDeleted(true);
        onUploaded("");
    }

    const displayUrl = deleted ? null : (preview ?? currentUrl);

    return (
        <>
            <div className="flex flex-col items-center gap-3">
                {/* Avatar circle */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="relative group block"
                        disabled={uploading}
                    >
                        <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-border/60 group-hover:ring-blue-500/60 transition-all bg-muted/50 relative">
                            {displayUrl ? (
                                <Image
                                    src={displayUrl}
                                    alt="avatar"
                                    fill
                                    className="object-cover"
                                    sizes="96px"
                                    unoptimized={displayUrl.startsWith("blob:")}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <svg className="w-10 h-10 text-muted-foreground/40" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Camera overlay on hover */}
                        <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/35 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded-full p-2">
                                {uploading ? (
                                    <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    </button>

                    {/* Delete button — only when photo is set */}
                    {displayUrl && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-md transition-colors"
                            title={t("avatar_remove")}
                        >
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                <p className="text-xs text-muted-foreground">{t("avatar_change")}</p>
                {error && <p className="text-xs text-red-500">{error}</p>}

                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileSelected(f);
                        e.target.value = "";
                    }}
                />
            </div>

            {cropSrc && (
                <ImageCropModal
                    imageSrc={cropSrc}
                    onConfirm={handleCropConfirm}
                    onCancel={() => { setCropSrc(null); URL.revokeObjectURL(cropSrc); }}
                />
            )}
        </>
    );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export function OnboardingWizard({ onComplete, locale }: WizardProps) {
    const { data: session, update: updateSession } = useSession();
    const t = useTranslations("Onboarding");

    const [step, setStep] = useState(0); // 0,1,2 = wizard steps; 3 = done
    const [saving, setSaving] = useState(false);
    const countries = buildCountries(locale);

    // Step 1 — personal info + avatar
    const [avatarUrl, setAvatarUrl] = useState<string | null>(session?.user?.image ?? null);
    const [firstName, setFirstName] = useState(
        (session?.user?.name ?? "").split(" ")[0] ?? ""
    );
    const [lastName, setLastName] = useState(
        (session?.user?.name ?? "").split(" ").slice(1).join(" ") ?? ""
    );
    const [fatherName, setFatherName] = useState("");
    const [step1Error, setStep1Error] = useState("");

    // Step 2 — identity
    const [username, setUsername] = useState("");
    const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
    const [country, setCountry] = useState("UZ");
    const [humoId, setHumoId] = useState("");
    const [humoIdLoading, setHumoIdLoading] = useState(false);
    const [step2Error, setStep2Error] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Step 3 — optional extras
    const [birthday, setBirthday] = useState("");
    const [location, setLocation] = useState("");
    const [bio, setBio] = useState("");
    const [finishError, setFinishError] = useState("");

    // ── Generate Humo ID ──────────────────────────────────────────────────────
    const generateHumoId = useCallback(async (c: string) => {
        setHumoIdLoading(true);
        try {
            const res = await fetch("/api/user/generate-humo-id", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ country: c }),
            });
            const data = await res.json();
            if (data.humoId) setHumoId(data.humoId);
        } catch { /* silent */ }
        finally { setHumoIdLoading(false); }
    }, []);

    useEffect(() => {
        if (step === 1 && !humoId) generateHumoId(country);
    }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Username debounce ─────────────────────────────────────────────────────
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!username) { setUsernameStatus("idle"); return; }
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setUsernameStatus("invalid"); return; }
        setUsernameStatus("checking");
        debounceRef.current = setTimeout(async () => {
            const res = await fetch(`/api/user/check-username?q=${encodeURIComponent(username)}`);
            const data = await res.json();
            setUsernameStatus(data.available ? "available" : "taken");
        }, 500);
    }, [username]);

    // ── Validation ────────────────────────────────────────────────────────────
    function validateStep1() {
        if (!firstName.trim()) { setStep1Error(t("firstname_required")); return false; }
        setStep1Error(""); return true;
    }
    function validateStep2() {
        if (!username.trim() || usernameStatus !== "available") { setStep2Error(t("username_required")); return false; }
        if (!humoId) { setStep2Error(t("humoid_generating")); return false; }
        setStep2Error(""); return true;
    }

    // ── Save all & finish ─────────────────────────────────────────────────────
    async function handleFinish() {
        setSaving(true);
        setFinishError("");
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: firstName.trim(),
                    lastName: lastName.trim() || undefined,
                    fatherName: fatherName.trim() || undefined,
                    username: username.trim(),
                    humoId,
                    country,
                    birthday: birthday || undefined,
                    location: location.trim() || undefined,
                    bio: bio.trim() || undefined,
                    onboardingDone: true,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                setFinishError(body.error ?? "save_error");
                return;
            }
            // Only show done screen when DB save confirmed
            setStep(3);
        } catch {
            setFinishError("save_error");
        } finally {
            setSaving(false);
        }
    }

    const TOTAL = 3;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4 overflow-x-hidden overflow-y-auto">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 rounded-full bg-blue-500/10 blur-[120px]" />
                <div className="absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4 rounded-full bg-cyan-400/8 blur-[120px]" />
            </div>

            {/* Language switcher top-right */}
            <div className="absolute top-4 right-4 z-10">
                <LanguageSwitcher />
            </div>

            {/* Sign out top-left — allaqachon hisobi bor foydalanuvchilar uchun
                 (masalan JWT cookie'si bo'shalib qolgan bo'lsa qayta kirish uchun) */}
            <div className="absolute top-4 left-4 z-10">
                <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition-colors backdrop-blur-sm"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Chiqish / boshqa hisob
                </button>
            </div>

            <AnimatePresence mode="wait">

                {/* ── STEP 0: Personal info + Avatar ── */}
                {step === 0 && (
                    <motion.div
                        key="step0"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.25 }}
                        className="w-full max-w-md"
                    >
                        <WizardCard step={0} total={TOTAL} title={t("step1_title")} desc={t("step1_desc")}>
                            <div className="space-y-4">
                                {/* Avatar picker */}
                                <AvatarUpload
                                    currentUrl={avatarUrl}
                                    onUploaded={(url) => setAvatarUrl(url)}
                                />

                                <Field label={t("firstname_label")} required>
                                    <input
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder={t("firstname_placeholder")}
                                        className={inputCls}
                                        autoFocus
                                    />
                                </Field>

                                <Field label={t("lastname_label")} optional>
                                    <input
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder={t("lastname_placeholder")}
                                        className={inputCls}
                                    />
                                </Field>

                                <Field label={t("fathername_label")} optional>
                                    <input
                                        value={fatherName}
                                        onChange={(e) => setFatherName(e.target.value)}
                                        placeholder={t("fathername_placeholder")}
                                        className={inputCls}
                                    />
                                </Field>

                                {step1Error && <p className="text-xs text-red-500">{step1Error}</p>}

                                <PrimaryButton onClick={() => { if (validateStep1()) setStep(1); }}>
                                    {t("next")}
                                </PrimaryButton>
                            </div>
                        </WizardCard>
                    </motion.div>
                )}

                {/* ── STEP 1: Humo ID ── */}
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.25 }}
                        className="w-full max-w-md"
                    >
                        <WizardCard step={1} total={TOTAL} title={t("step2_title")} desc={t("step2_desc")}>
                            <div className="space-y-4">
                                {/* Username */}
                                <Field label={t("username_label")} required>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">@</span>
                                        <input
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                                            placeholder={t("username_placeholder")}
                                            maxLength={20}
                                            className={`${inputCls} pl-7`}
                                            autoFocus
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold">
                                            {usernameStatus === "checking" && (
                                                <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                            )}
                                            {usernameStatus === "available" && <span className="text-green-500">✓</span>}
                                            {(usernameStatus === "taken" || usernameStatus === "invalid") && <span className="text-red-500">✗</span>}
                                        </div>
                                    </div>
                                    <p className={`text-xs mt-1 ${
                                        usernameStatus === "available" ? "text-green-500" :
                                        (usernameStatus === "taken" || usernameStatus === "invalid") ? "text-red-500" :
                                        "text-muted-foreground"
                                    }`}>
                                        {usernameStatus === "checking" ? t("username_checking") :
                                         usernameStatus === "available" ? t("username_available") :
                                         usernameStatus === "taken" ? t("username_taken") :
                                         usernameStatus === "invalid" ? t("username_invalid") :
                                         t("username_hint")}
                                    </p>
                                </Field>

                                {/* Country */}
                                <Field label={t("country_label")} required>
                                    <CountrySelect
                                        countries={countries}
                                        value={country}
                                        onChange={(c) => { setCountry(c); generateHumoId(c); }}
                                    />
                                </Field>

                                {/* Humo ID */}
                                <Field label={t("humoid_label")} required>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 flex items-center bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 min-h-[48px]">
                                            {humoIdLoading ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                                    <span className="text-sm text-muted-foreground">{t("humoid_generating")}</span>
                                                </div>
                                            ) : (
                                                <span className="font-mono font-bold text-base tracking-widest text-blue-400">
                                                    {humoId || "—"}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => generateHumoId(country)}
                                            disabled={humoIdLoading}
                                            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border/60 rounded-xl px-3 h-12 transition-colors disabled:opacity-50 shrink-0"
                                        >
                                            <svg className={`w-3.5 h-3.5 ${humoIdLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            {t("humoid_refresh")}
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{t("humoid_hint")}</p>
                                </Field>

                                {step2Error && <p className="text-xs text-red-500">{step2Error}</p>}

                                <div className="flex gap-3">
                                    <SecondaryButton onClick={() => setStep(0)}>{t("back")}</SecondaryButton>
                                    <PrimaryButton
                                        onClick={() => { if (validateStep2()) setStep(2); }}
                                        className="flex-1"
                                    >
                                        {t("next")}
                                    </PrimaryButton>
                                </div>
                            </div>
                        </WizardCard>
                    </motion.div>
                )}

                {/* ── STEP 2: Optional extras ── */}
                {step === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.25 }}
                        className="w-full max-w-md"
                    >
                        <WizardCard step={2} total={TOTAL} title={t("step3_title")} desc={t("step3_desc")}>
                            <div className="space-y-4">
                                <Field label={t("birthday_label")} optional>
                                    <DatePickerCalendar
                                        value={birthday}
                                        onChange={setBirthday}
                                        maxDate={new Date()}
                                    />
                                </Field>

                                <Field label={t("location_label")} optional>
                                    <LocationPicker
                                        value={location}
                                        onChange={setLocation}
                                    />
                                </Field>

                                <Field label={t("bio_label")} optional>
                                    <textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value.slice(0, 160))}
                                        placeholder={t("bio_placeholder")}
                                        rows={3}
                                        className={`${inputCls} resize-none`}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1 text-right">
                                        {t("bio_hint", { count: bio.length })}
                                    </p>
                                </Field>

                                {finishError && (
                                    <p className="text-xs text-red-500 text-center">{finishError === "save_error" ? t("upload_error") : finishError}</p>
                                )}

                                <div className="flex gap-3">
                                    <SecondaryButton onClick={() => setStep(1)}>{t("back")}</SecondaryButton>
                                    <PrimaryButton onClick={handleFinish} loading={saving} className="flex-1">
                                        {t("finish")}
                                    </PrimaryButton>
                                </div>
                            </div>
                        </WizardCard>
                    </motion.div>
                )}

                {/* ── DONE ── */}
                {step === 3 && (
                    <motion.div
                        key="done"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35, type: "spring", bounce: 0.3 }}
                        className="w-full max-w-md text-center"
                    >
                        <div className="bg-card/80 backdrop-blur-xl border border-border/60 rounded-2xl p-8 shadow-2xl space-y-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.15, type: "spring", bounce: 0.5 }}
                                className="flex justify-center"
                            >
                                <div className="w-20 h-20 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </motion.div>

                            <div>
                                <h2 className="text-2xl font-extrabold text-foreground">{t("done_title")}</h2>
                                <p className="text-muted-foreground text-sm mt-1">{t("done_desc")}</p>
                            </div>

                            {humoId && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl p-4 text-white"
                                >
                                    <p className="text-xs font-medium opacity-80 mb-1">Humo ID</p>
                                    <p className="font-mono text-2xl font-black tracking-widest">{humoId}</p>
                                    {username && <p className="text-xs opacity-75 mt-1">@{username}</p>}
                                </motion.div>
                            )}

                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                                <PrimaryButton onClick={onComplete}>{t("enter_app")}</PrimaryButton>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
