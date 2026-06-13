"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Check, X, Loader2, ImageIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { DatePickerCalendar } from "@/components/ui/date-picker-calendar";
import { LocationPicker } from "@/components/ui/location-picker";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { MarketCropModal } from "@/components/market/market-crop-modal";
import { CountrySelect, type Country } from "@/components/ui/country-select";

// ── Country data ───────────────────────────────────────────────────────────────
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

// ── Types ──────────────────────────────────────────────────────────────────────
type UsernameState = "idle" | "checking" | "available" | "taken" | "invalid" | "reserved";

// ── Helpers ────────────────────────────────────────────────────────────────────
const inputCls =
    "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors";

function Field({
    label,
    children,
    optional,
    hint,
}: {
    label: string;
    children: React.ReactNode;
    optional?: boolean;
    hint?: string;
}) {
    const t = useTranslations("HumoID");
    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-foreground">{label}</label>
                {optional && (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
                        {t("optional_label")}
                    </span>
                )}
            </div>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function EditProfilePage() {
    const t = useTranslations("HumoID");
    const locale = useLocale();
    const { data: session } = useSession();
    const router = useRouter();
    const countries = buildCountries(locale);

    // Profile state
    const [firstName, setFirstName]     = useState("");
    const [lastName, setLastName]       = useState("");
    const [fatherName, setFatherName]   = useState("");
    const [bio, setBio]                 = useState("");
    const [birthday, setBirthday]       = useState("");
    const [phone, setPhone]             = useState("");
    const [location, setLocation]       = useState("");
    const [country, setCountry]         = useState("UZ");
    const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
    const [coverUrl, setCoverUrl]       = useState<string | null>(null);

    // UI state
    const [loading, setLoading]         = useState(true);
    const [saving, setSaving]           = useState(false);
    const [saved, setSaved]             = useState(false);
    const [error, setError]             = useState<string | null>(null);
    const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
    const [isFounder, setIsFounder]     = useState(false);

    // Avatar
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [cropSrc, setCropSrc]         = useState<string | null>(null);
    const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null);
    const fileRef                       = useRef<HTMLInputElement>(null);

    // Cover
    const [coverLoading, setCoverLoading] = useState(false);
    const [countrySaving, setCountrySaving] = useState(false);
    const coverRef                      = useRef<HTMLInputElement>(null);
    const countryTimer                  = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Username
    const [usernameInput, setUsernameInput]   = useState("");
    const [usernameState, setUsernameState]   = useState<UsernameState>("idle");
    const [currentUsername, setCurrentUsername] = useState("");
    const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Load profile ───────────────────────────────────────────────────────────
    useEffect(() => {
        fetch("/api/user/profile")
            .then((r) => r.json())
            .then((data) => {
                setFirstName(data.firstName ?? "");
                setLastName(data.lastName ?? "");
                setFatherName(data.fatherName ?? "");
                setBio(data.bio ?? "");
                setBirthday(data.birthday ? data.birthday.slice(0, 10) : "");
                setPhone(data.phone ?? "");
                setLocation(data.location ?? "");
                setCountry(data.country ?? "UZ");
                setAvatarUrl(data.image ?? null);
                setCoverUrl(data.coverImage ?? null);
                setUsernameInput(data.username ?? "");
                setCurrentUsername(data.username ?? "");
                setIsFounder(data.isFounder ?? false);
                if (data.profileEditedAt && !data.isFounder) {
                    const next = new Date(new Date(data.profileEditedAt).getTime() + 14 * 24 * 60 * 60 * 1000);
                    if (next > new Date()) setCooldownUntil(next);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // ── Username debounce ──────────────────────────────────────────────────────
    const checkUsername = useCallback((value: string) => {
        if (usernameTimer.current) clearTimeout(usernameTimer.current);
        if (!value) { setUsernameState("idle"); return; }
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) { setUsernameState("invalid"); return; }
        if (value === currentUsername) { setUsernameState("available"); return; }
        setUsernameState("checking");
        usernameTimer.current = setTimeout(async () => {
            const res = await fetch(`/api/user/check-username?q=${encodeURIComponent(value)}`);
            const data = await res.json();
            if (!data.available) {
                setUsernameState(data.reason === "reserved" ? "reserved" : "taken");
            } else {
                setUsernameState("available");
            }
        }, 500);
    }, [currentUsername]);

    const handleUsernameChange = (v: string) => {
        const clean = v.toLowerCase().replace(/[^a-z0-9_]/g, "");
        setUsernameInput(clean);
        checkUsername(clean);
    };

    // ── Country auto-save ──────────────────────────────────────────────────────
    const handleCountryChange = (code: string) => {
        setCountry(code);
        if (countryTimer.current) clearTimeout(countryTimer.current);
        countryTimer.current = setTimeout(async () => {
            setCountrySaving(true);
            try {
                await fetch("/api/user/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ country: code }),
                });
            } finally {
                setCountrySaving(false);
            }
        }, 400);
    };

    // ── Avatar handlers ────────────────────────────────────────────────────────
    const handleFileSelected = (file: File) => {
        if (!file.type.startsWith("image/")) return;
        if (file.size > 8 * 1024 * 1024) return;
        setCropSrc(URL.createObjectURL(file));
    };

    const handleCropConfirm = async (blob: Blob) => {
        setCropSrc(null);
        setAvatarLoading(true);
        const fd = new FormData();
        fd.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
        try {
            const res = await fetch("/api/user/upload-avatar", { method: "POST", body: fd });
            const data = await res.json();
            if (data.url) setAvatarUrl(data.url);
        } finally {
            setAvatarLoading(false);
        }
    };

    const handleDeleteAvatar = async () => {
        setAvatarLoading(true);
        try {
            await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: null }),
            });
            setAvatarUrl(null);
        } finally {
            setAvatarLoading(false);
        }
    };

    // ── Cover handlers ─────────────────────────────────────────────────────────
    // Crop'dan keyin chiqqan 3:1 blobni yuklash
    const uploadCoverBlob = async (blob: Blob) => {
        setCoverLoading(true);
        const fd = new FormData();
        fd.append("file", new File([blob], `cover_${Date.now()}.jpg`, { type: "image/jpeg" }));
        try {
            const res = await fetch("/api/user/cover-image", { method: "POST", body: fd });
            const data = await res.json();
            if (data.url) setCoverUrl(data.url);
        } finally {
            setCoverLoading(false);
        }
    };

    const handleDeleteCover = async () => {
        setCoverLoading(true);
        try {
            await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coverImage: "" }),
            });
            setCoverUrl(null);
        } finally {
            setCoverLoading(false);
        }
    };

    // ── Save rate-limited fields ───────────────────────────────────────────────
    const handleSave = async () => {
        if (cooldownUntil && cooldownUntil > new Date()) return;
        if (usernameState === "checking" || usernameState === "taken" || usernameState === "invalid" || usernameState === "reserved") return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName:  firstName.trim(),
                    lastName:   lastName.trim() || null,
                    fatherName: fatherName.trim() || null,
                    username:   usernameInput,
                    bio:        bio.trim() || null,
                    birthday:   birthday || null,
                    phone:      phone.trim() || null,
                    location:   location.trim() || null,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                if (body.error === "edit_cooldown" && body.nextEditDate) {
                    const next = new Date(body.nextEditDate);
                    setCooldownUntil(next);
                    setError(t("edit_cooldown", { date: next.toLocaleDateString() }));
                } else if (body.error === "username_taken") {
                    setError(t("username_taken"));
                } else if (body.error === "username_reserved") {
                    setError(t("reserved_username"));
                } else {
                    setError(t("save_error"));
                }
                return;
            }
            if (!isFounder) setCooldownUntil(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
            setCurrentUsername(usernameInput);
            setSaved(true);
            setTimeout(() => { setSaved(false); router.push("/id"); }, 1200);
        } catch {
            setError(t("save_error"));
        } finally {
            setSaving(false);
        }
    };

    const isLocked = !!(cooldownUntil && cooldownUntil > new Date());
    const canSave  = !isLocked && !saving &&
        usernameState !== "checking" && usernameState !== "taken" &&
        usernameState !== "invalid"  && usernameState !== "reserved";
    const displayAvatar = avatarUrl ?? session?.user?.image ?? null;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen py-10 px-4 pb-24">
            <div className="max-w-lg mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/id" className="p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">{t("edit_title")}</h1>
                        <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
                    </div>
                </div>

                {/* Cooldown banner */}
                {isLocked && cooldownUntil && (() => {
                    const diff = cooldownUntil.getTime() - Date.now();
                    const days = Math.floor(diff / 86400000);
                    const hours = Math.floor((diff % 86400000) / 3600000);
                    return (
                        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-4">
                            <p className="text-sm font-semibold text-amber-500">{t("edit_cooldown_title")}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t("cooldown_days_left", { days, hours })}
                            </p>
                        </div>
                    );
                })()}

                {/* ── Cover photo section (not rate-limited) ──────────────── */}
                <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
                    {/* Preview */}
                    <div className="relative w-full h-36 bg-muted/40">
                        {coverUrl ? (
                            <Image src={coverUrl} alt="Cover" fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
                                <ImageIcon size={28} />
                                <span className="text-xs">{t("cover_label")}</span>
                            </div>
                        )}
                        {coverLoading && (
                            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                                <Loader2 size={24} className="animate-spin text-primary" />
                            </div>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 p-3">
                        <button
                            type="button"
                            onClick={() => coverRef.current?.click()}
                            disabled={coverLoading}
                            className="flex-1 text-sm font-semibold border border-border rounded-xl px-4 py-2.5 hover:bg-accent transition-colors disabled:opacity-50"
                        >
                            {t("cover_change")}
                        </button>
                        {coverUrl && (
                            <button
                                type="button"
                                onClick={handleDeleteCover}
                                disabled={coverLoading}
                                className="flex-1 text-sm font-medium text-red-500 hover:text-red-600 border border-red-500/30 hover:border-red-500/60 rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
                            >
                                {t("cover_remove")}
                            </button>
                        )}
                    </div>

                    <input
                        ref={coverRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f && f.type.startsWith("image/") && f.size <= 8 * 1024 * 1024) {
                                setCoverCropSrc(URL.createObjectURL(f));
                            }
                            e.target.value = "";
                        }}
                    />
                </div>

                {/* ── Avatar section (not rate-limited) ──────────────────── */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4">
                    <p className="text-sm font-semibold text-foreground">{t("avatar_change")}</p>
                    <div className="flex items-center gap-5">
                        <div className="relative shrink-0">
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                disabled={avatarLoading}
                                className="relative group w-20 h-20 rounded-full overflow-hidden ring-2 ring-border/60 hover:ring-primary/60 transition-all block"
                            >
                                {displayAvatar ? (
                                    <Image
                                        src={displayAvatar}
                                        alt="avatar"
                                        fill
                                        className="object-cover"
                                        sizes="80px"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                        <svg className="w-9 h-9 text-muted-foreground/40" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                                        </svg>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center rounded-full">
                                    {avatarLoading ? (
                                        <Loader2 size={18} className="text-white opacity-0 group-hover:opacity-100 animate-spin" />
                                    ) : (
                                        <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        </div>
                        <div className="flex flex-col gap-2 flex-1">
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                disabled={avatarLoading}
                                className="w-full text-sm font-semibold border border-border rounded-xl px-4 py-2.5 hover:bg-accent transition-colors disabled:opacity-50"
                            >
                                {t("avatar_change")}
                            </button>
                            {avatarUrl && (
                                <button
                                    type="button"
                                    onClick={handleDeleteAvatar}
                                    disabled={avatarLoading}
                                    className="w-full text-sm font-medium text-red-500 hover:text-red-600 border border-red-500/30 hover:border-red-500/60 rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
                                >
                                    {t("avatar_remove")}
                                </button>
                            )}
                        </div>
                    </div>
                    <input
                        ref={fileRef}
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

                {/* ── Country (not rate-limited, auto-save) ──────────────── */}
                <div className="bg-card border border-border/60 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-foreground">{t("country_label")}</p>
                        {countrySaving && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Loader2 size={11} className="animate-spin" /> saving...
                            </span>
                        )}
                    </div>
                    <CountrySelect
                        countries={countries}
                        value={country}
                        onChange={handleCountryChange}
                    />
                </div>

                {/* ── Rate-limited profile fields ─────────────────────────── */}
                <div className={`space-y-5 ${isLocked ? "opacity-50 pointer-events-none select-none" : ""}`}>

                    {/* Name row */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label={t("firstname_label")}>
                            <input
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder={t("firstname_label")}
                                maxLength={40}
                                className={inputCls}
                            />
                        </Field>
                        <Field label={t("lastname_label")} optional>
                            <input
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder={t("lastname_label")}
                                maxLength={40}
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <Field label={t("fathername_label")} optional>
                        <input
                            value={fatherName}
                            onChange={(e) => setFatherName(e.target.value)}
                            placeholder={t("fathername_placeholder")}
                            maxLength={40}
                            className={inputCls}
                        />
                    </Field>

                    {/* Username */}
                    <Field label={t("username_label")}>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm select-none">@</span>
                            <input
                                value={usernameInput}
                                onChange={(e) => handleUsernameChange(e.target.value)}
                                placeholder={t("username_placeholder")}
                                maxLength={20}
                                className={`${inputCls} pl-8`}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold">
                                {usernameState === "checking" && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                                {usernameState === "available" && <Check size={14} className="text-green-500" />}
                                {(usernameState === "taken" || usernameState === "invalid" || usernameState === "reserved") && <X size={14} className="text-red-500" />}
                            </div>
                        </div>
                        <p className={`text-xs mt-1 ${
                            usernameState === "available" ? "text-green-500" :
                            (usernameState === "taken" || usernameState === "invalid" || usernameState === "reserved") ? "text-red-500" :
                            "text-muted-foreground"
                        }`}>
                            {usernameState === "checking"  ? t("username_checking") :
                             usernameState === "available" ? t("username_available") :
                             usernameState === "taken"     ? t("username_taken") :
                             usernameState === "reserved"  ? t("reserved_username") :
                             usernameState === "invalid"   ? t("username_invalid") :
                             t("username_hint")}
                        </p>
                    </Field>

                    {/* Birthday */}
                    <Field label={t("birthday_label")} optional>
                        <DatePickerCalendar
                            value={birthday}
                            onChange={setBirthday}
                            maxDate={new Date()}
                        />
                    </Field>

                    {/* Phone */}
                    <Field label={t("phone_label")} optional>
                        <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder={t("phone_placeholder")}
                            type="tel"
                            maxLength={20}
                            className={inputCls}
                        />
                    </Field>

                    {/* Location */}
                    <Field label={t("location_label")} optional>
                        <LocationPicker value={location} onChange={setLocation} />
                    </Field>

                    {/* Bio */}
                    <Field label={t("bio_label")} optional>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value.slice(0, 160))}
                            placeholder={t("bio_placeholder")}
                            rows={3}
                            className={`${inputCls} resize-none`}
                        />
                        <p className={`text-xs mt-1 text-right ${bio.length >= 140 ? "text-amber-500" : "text-muted-foreground"}`}>
                            {t("bio_hint", { count: bio.length })}
                        </p>
                    </Field>
                </div>

                {/* Error */}
                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-500">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <Link
                        href="/id"
                        className="flex-1 text-center rounded-xl border border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-accent transition-colors"
                    >
                        {t("cancel")}
                    </Link>
                    <button
                        onClick={handleSave}
                        disabled={!canSave}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {saved ? (
                            <><Check size={15} /> {t("saved")}</>
                        ) : saving ? (
                            <><Loader2 size={15} className="animate-spin" /> {t("saving")}</>
                        ) : (
                            t("save")
                        )}
                    </button>
                </div>
            </div>

            {/* Avatar crop modal (doira) */}
            {cropSrc && (
                <ImageCropModal
                    imageSrc={cropSrc}
                    onConfirm={handleCropConfirm}
                    onCancel={() => { setCropSrc(null); URL.revokeObjectURL(cropSrc); }}
                />
            )}

            {/* Muqova crop modal (3:1 banner — barcha bo'limda bir xil o'lcham) */}
            {coverCropSrc && (
                <MarketCropModal
                    imageSrc={coverCropSrc}
                    aspect={3}
                    outW={1500}
                    onConfirm={async (blob) => {
                        await uploadCoverBlob(blob);
                        URL.revokeObjectURL(coverCropSrc);
                        setCoverCropSrc(null);
                    }}
                    onCancel={() => { URL.revokeObjectURL(coverCropSrc); setCoverCropSrc(null); }}
                />
            )}
        </div>
    );
}
