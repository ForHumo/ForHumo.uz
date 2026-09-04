"use client";

// "Sizni tanib olamiz" — quick onboarding to fill UserKnowledge base.
// ~10 ta savol/kartochka. Foydalanuvchi javob berishi ixtiyoriy;
// skip qilib o'tib ketishi mumkin.

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import {
    ArrowLeft, CheckCircle2, Sparkles,
    Lock, LogIn, Home as HomeIcon, Users, Briefcase, Heart, Target,
    Activity, MoreHorizontal,
} from "lucide-react";
import { moduleTheme } from "@/lib/module-theme";

const T = moduleTheme("id");

interface Question {
    category: string;
    key: string;
    icon: typeof Users;
    color: string;
    title: string;
    hint: string;
    // "chip" = tanlash chip'lar, "text" = matn kiritish, "multi" = ko'p tanlash
    type: "chip" | "text" | "multi";
    options?: string[];
    placeholder?: string;
    sensitive?: boolean;
}

const QUESTIONS: Question[] = [
    {
        category: "family", key: "marital_status", icon: Users, color: "#EC4899",
        title: "Oilaviy holatingiz?",
        hint: "Tavsiyalar (sarpo, sovg'a, dam olish) mos bo'ladi",
        type: "chip",
        options: ["Uylanmagan", "Uylangan", "Yolg'iz", "Boshqa"],
    },
    {
        category: "family", key: "kids", icon: Users, color: "#EC4899",
        title: "Farzandlaringiz bormi?",
        hint: "Beshik to'y, kiyim, o'yinchoq bo'yicha tavsiya uchun",
        type: "chip",
        options: ["Yo'q", "1 ta", "2 ta", "3+"],
    },
    {
        category: "work", key: "occupation", icon: Briefcase, color: "#8B5CF6",
        title: "Kasbingiz yoki soha?",
        hint: "IT, tibbiyot, savdo, ta'lim, tadbirkorlik, ...",
        type: "text",
        placeholder: "Masalan: IT dasturchi",
    },
    {
        category: "interests", key: "hobbies", icon: Heart, color: "#EF4444",
        title: "Nima bilan qiziqasiz?",
        hint: "Bir nechta tanlashingiz mumkin",
        type: "multi",
        options: ["Sport", "Kitob", "Sayohat", "Musiqa", "Kino", "O'yin", "Ovqat pishirish", "Bog'dorchilik", "Fotografiya", "Texnologiya"],
    },
    {
        category: "lifestyle", key: "sport_frequency", icon: Activity, color: "#F59E0B",
        title: "Sport bilan shug'ullanasizmi?",
        hint: "",
        type: "chip",
        options: ["Har kuni", "Haftada 2-3 marta", "Vaqti-vaqti bilan", "Deyarli yo'q"],
    },
    {
        category: "goals", key: "current_goal", icon: Target, color: "#14B8A6",
        title: "Yaqin oylardagi asosiy maqsadingiz?",
        hint: "AI sizga mos yordam beradi",
        type: "text",
        placeholder: "Masalan: uy sotib olish, chet tili o'rganish, ish topish",
    },
    {
        category: "assets", key: "has_car", icon: HomeIcon, color: "#6366F1",
        title: "Mashinangiz bormi?",
        hint: "",
        type: "chip",
        options: ["Ha", "Yo'q", "Aytmayman"],
    },
    {
        category: "assets", key: "housing", icon: HomeIcon, color: "#6366F1",
        title: "Uy sharoiti?",
        hint: "",
        type: "chip",
        options: ["Xususiy uy", "Kvartira", "Ijara", "Ota-ona bilan", "Aytmayman"],
    },
    {
        category: "identity", key: "languages", icon: MoreHorizontal, color: "#3B82F6",
        title: "Qaysi tillarda gaplashasiz?",
        hint: "",
        type: "multi",
        options: ["O'zbekcha", "Ruscha", "Inglizcha", "Turkcha", "Arabcha", "Xitoycha"],
    },
    {
        category: "goals", key: "why_forhumo", icon: Sparkles, color: "#14B8A6",
        title: "For Humo'dan nima uchun foydalanmoqchisiz?",
        hint: "Sizga to'g'ri modul tavsiya qilamiz",
        type: "multi",
        options: ["Do'stlar bilan aloqa", "Xarid", "Ishlash/daromad", "Ma'lumot olish", "Ijara/xizmat", "AI yordam", "Boshqa"],
    },
];

export function DiscoverOnboarding() {
    const { status } = useSession();
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
    const [textInput, setTextInput] = useState("");
    const [selected, setSelected] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);

    const q = QUESTIONS[step];
    const isLast = step === QUESTIONS.length - 1;

    // Reset input when step changes
    useEffect(() => {
        setTextInput("");
        setSelected([]);
    }, [step]);

    async function saveAndNext(value: string | string[] | null) {
        if (value !== null && q) {
            setAnswers(prev => ({ ...prev, [step]: value }));
            // Fon rejim yozamiz — foydalanuvchi kutmaydi
            fetch("/api/ai/knowledge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category: q.category,
                    key: q.key,
                    value: Array.isArray(value) ? value.join(", ") : value,
                    sensitive: q.sensitive ?? false,
                }),
            }).catch(() => {});
        }
        if (isLast) {
            setSaving(true);
            setDone(true);
            setTimeout(() => router.push("/id"), 1500);
        } else {
            setStep(s => s + 1);
        }
    }

    if (status === "unauthenticated") {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="max-w-sm w-full text-center rounded-3xl p-8 border" style={{ borderColor: T.border }}>
                    <span className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4"
                        style={{ background: T.gradient, color: T.onPrimary }}>
                        <Sparkles className="w-7 h-7" />
                    </span>
                    <h1 className="text-xl font-black mb-2">Sizni tanib olamiz</h1>
                    <button onClick={() => signIn("google")}
                        className="w-full h-11 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 mt-3"
                        style={{ background: T.gradient }}>
                        <LogIn className="w-4 h-4" /> Google bilan kirish
                    </button>
                </div>
            </div>
        );
    }

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="max-w-sm w-full text-center">
                    <span className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-4"
                        style={{ background: T.gradient, color: T.onPrimary }}>
                        <CheckCircle2 className="w-8 h-8" />
                    </span>
                    <h1 className="text-2xl font-black mb-2">Rahmat!</h1>
                    <p className="text-sm text-muted-foreground">
                        For Humo AI endi sizni yaxshiroq tushunadi.<br />
                        Profilingizga qaytamiz...
                    </p>
                </div>
            </div>
        );
    }

    const Icon = q?.icon ?? Sparkles;

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-lg mx-auto space-y-6">
                <Link href="/id" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={15} /> O&apos;tkazib yuborish
                </Link>

                {/* Hero */}
                <div className="text-center pt-4">
                    <div className="flex items-center justify-center gap-1.5 text-xs mb-3" style={{ color: T.primary }}>
                        <Lock className="w-3 h-3" />
                        Faqat siz ko&apos;rasiz — shifrlangan
                    </div>
                    <h1 className="text-2xl font-black mb-1">Sizni tanib olamiz</h1>
                    <p className="text-sm text-muted-foreground">
                        For Humo AI o&apos;z tavsiyalarini sizga mos qilishi uchun.
                    </p>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-1">
                    {QUESTIONS.map((_, i) => (
                        <div key={i} className="flex-1 h-1 rounded-full transition-colors"
                            style={{ background: i <= step ? T.primary : `${T.primary}22` }} />
                    ))}
                </div>
                <p className="text-center text-[11px] text-muted-foreground">
                    {step + 1} / {QUESTIONS.length}
                </p>

                {/* Question card */}
                {q && (
                    <div className="rounded-3xl p-6 border" style={{ borderColor: T.border, background: `${q.color}0a` }}>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-9 h-9 rounded-xl grid place-items-center"
                                style={{ background: `${q.color}22`, color: q.color }}>
                                <Icon className="w-4 h-4" />
                            </span>
                            <div>
                                <h2 className="text-base font-black">{q.title}</h2>
                                {q.hint && <p className="text-[11px] text-muted-foreground mt-0.5">{q.hint}</p>}
                            </div>
                        </div>

                        {/* Input types */}
                        {q.type === "chip" && q.options && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {q.options.map(opt => (
                                    <button key={opt}
                                        onClick={() => saveAndNext(opt)}
                                        className="p-3 rounded-xl text-left text-sm font-semibold border hover:brightness-95"
                                        style={{ borderColor: T.border }}>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {q.type === "multi" && q.options && (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    {q.options.map(opt => {
                                        const isSel = selected.includes(opt);
                                        return (
                                            <button key={opt}
                                                onClick={() => setSelected(s => isSel ? s.filter(x => x !== opt) : [...s, opt])}
                                                className="p-3 rounded-xl text-left text-sm font-semibold border transition-colors"
                                                style={{
                                                    borderColor: isSel ? T.primary : T.border,
                                                    background: isSel ? T.soft : "transparent",
                                                    color: isSel ? T.primary : "var(--foreground)",
                                                }}>
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => saveAndNext(selected.length > 0 ? selected : null)}
                                    className="mt-4 w-full h-11 rounded-xl text-sm font-black text-white disabled:opacity-40"
                                    style={{ background: T.gradient }}
                                    disabled={selected.length === 0}>
                                    Davom etish ({selected.length})
                                </button>
                            </>
                        )}

                        {q.type === "text" && (
                            <>
                                <input
                                    value={textInput}
                                    onChange={e => setTextInput(e.target.value.slice(0, 200))}
                                    placeholder={q.placeholder}
                                    className="w-full h-11 px-4 rounded-xl border text-sm focus:outline-none focus:ring-2"
                                    style={{ borderColor: T.border, ["--tw-ring-color" as string]: T.primary + "50" }} />
                                <button
                                    onClick={() => saveAndNext(textInput.trim() || null)}
                                    className="mt-4 w-full h-11 rounded-xl text-sm font-black text-white disabled:opacity-40"
                                    style={{ background: T.gradient }}
                                    disabled={saving}>
                                    Davom etish
                                </button>
                            </>
                        )}

                        <button onClick={() => saveAndNext(null)}
                            className="mt-2 w-full text-xs text-muted-foreground hover:underline">
                            O&apos;tkazib yuborish
                        </button>
                    </div>
                )}

                <p className="text-center text-[11px] text-muted-foreground">
                    Har savol ixtiyoriy. Xohlagan vaqtda o&apos;zgartirishingiz mumkin —
                    <Link href={"/id/knowledge" as never} className="underline ml-1" style={{ color: T.primary }}>Bilim bazam</Link>
                </p>
            </div>
        </div>
    );
}

