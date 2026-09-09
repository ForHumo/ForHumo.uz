"use client";

// Humo AI Telegram Business Bot — sozlash sahifasi.
// Yo'l: /ai/telegram-bot
// Foydalanuvchi Business akkaunti bilan bot'ni ulaydi, persona/FAQ/ish vaqtini
// yozadi, obuna sotib oladi (faqat For Pay hamyoni orqali).

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Bot, Check, ChevronRight, Copy, ExternalLink, Loader2, MessageSquare,
    Plus, Save, Send, Settings2, Trash2, Users, Wallet, Zap, AlertCircle,
    ShieldCheck, HelpCircle, Clock, Sparkles, Link as LinkIcon, Lock,
    Crown, Percent, Calendar,
} from "lucide-react";
import { formatMoney } from "@/lib/money";
import { HumoTgBotLeads } from "@/components/ai/humo-tg-bot-leads";
import { HumoTgBotPushCard } from "@/components/ai/humo-tg-bot-push-card";

interface FaqItem { q: string; a: string }

interface Config {
    persona: string | null;
    greeting: string | null;
    tone: "professional" | "friendly" | "brief";
    language: "uz" | "ru" | "en" | "auto";
    faqJson: FaqItem[];
    workHours: string | null;
    outOfHoursReply: string | null;
    bannedTopics: string | null;
    escalationRules: string | null;
    autoReplyEnabled: boolean;
    showBranding: boolean;
    showAdFooter: boolean;
    ttsEnabled: boolean;
    linkedBnShopSlug: string | null;
}

interface Connection {
    id: string;
    telegramUserId: string;
    telegramUsername: string | null;
    connectionId: string;
    isEnabled: boolean;
    canReply: boolean;
    connectedAt: string;
    profileId: string;
}

type TierId = "free" | "basic" | "pro" | "enterprise" | "basic_yearly" | "pro_yearly" | "enterprise_yearly";

interface Subscription {
    tier: TierId;
    status: string;
    monthlyLimit: number;
    usedThisMonth: number;
    priceUzs: number;
    expiresAt: string | null;
}

interface Stats { today: number; week: number; month: number; totalMessages: number }

interface ApiData {
    profile: { id: string; username: string | null; humoId: string | null };
    config: Config;
    connection: Connection | null;
    subscription: Subscription;
    stats: Stats;
    botUsername: string;
}

interface TierMeta {
    id: TierId;
    base: "free" | "basic" | "pro" | "enterprise";
    label: string;
    priceMonthly: number;                   // yillikda: oylik ekvivalenti (visual)
    priceTotal: number;                     // haqiqiy to'lov summa
    limit: number;
    yearly: boolean;
    savings: number;                        // yillikda tejaladigan summa (0 oylikda)
    features: string[];
    popular?: boolean;
}

const MONTHLY_TIERS: TierMeta[] = [
    { id: "free", base: "free", label: "Bepul", priceMonthly: 0, priceTotal: 0, limit: 50, yearly: false, savings: 0, features: ["Kunlik 1-2 mijoz", "Asosiy AI javob", "Humo AI branding qoladi"] },
    { id: "basic", base: "basic", label: "Basic", priceMonthly: 29_000, priceTotal: 29_000, limit: 500, yearly: false, savings: 0, features: ["Oyiga 500 xabar", "FAQ + persona", "Ish vaqti"] },
    { id: "pro", base: "pro", label: "Pro", priceMonthly: 99_000, priceTotal: 99_000, limit: 3_000, yearly: false, savings: 0, features: ["Oyiga 3 000 xabar", "Footer reklamani o'chirish", "Prioritet AI"], popular: true },
    { id: "enterprise", base: "enterprise", label: "Enterprise", priceMonthly: 299_000, priceTotal: 299_000, limit: 30_000, yearly: false, savings: 0, features: ["Oyiga 30 000 xabar", "Barcha branding o'chirilishi", "Maxsus qo'llab-quvvatlash"] },
];

const YEARLY_TIERS: TierMeta[] = [
    { id: "free", base: "free", label: "Bepul", priceMonthly: 0, priceTotal: 0, limit: 50, yearly: false, savings: 0, features: ["Kunlik 1-2 mijoz", "Asosiy AI javob", "Humo AI branding qoladi"] },
    { id: "basic_yearly", base: "basic", label: "Basic", priceMonthly: Math.round(29_000 * 12 * 0.9 / 12), priceTotal: Math.round(29_000 * 12 * 0.9 / 1000) * 1000, limit: 500, yearly: true, savings: 29_000 * 12 - Math.round(29_000 * 12 * 0.9 / 1000) * 1000, features: ["Yiliga 500 xabar/oy", "FAQ + persona", "−10% tejaysiz"] },
    { id: "pro_yearly", base: "pro", label: "Pro", priceMonthly: Math.round(99_000 * 12 * 0.85 / 12), priceTotal: Math.round(99_000 * 12 * 0.85 / 1000) * 1000, limit: 3_000, yearly: true, savings: 99_000 * 12 - Math.round(99_000 * 12 * 0.85 / 1000) * 1000, features: ["Yiliga 3 000 xabar/oy", "Footer reklama o'chirish", "−15% tejaysiz"], popular: true },
    { id: "enterprise_yearly", base: "enterprise", label: "Enterprise", priceMonthly: Math.round(299_000 * 12 * 0.8 / 12), priceTotal: Math.round(299_000 * 12 * 0.8 / 1000) * 1000, limit: 30_000, yearly: true, savings: 299_000 * 12 - Math.round(299_000 * 12 * 0.8 / 1000) * 1000, features: ["Yiliga 30 000 xabar/oy", "Barcha branding o'chirish", "−20% tejaysiz"] },
];

export function HumoTgBotSettings() {
    const [data, setData] = useState<ApiData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [linking, setLinking] = useState(false);
    const [subscribing, setSubscribing] = useState<string | null>(null);
    const [toast, setToast] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
    const [tgIdInput, setTgIdInput] = useState("");

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/telegram/humo-bot/settings", { cache: "no-store" });
            if (r.status === 401) { window.location.href = "/id"; return; }
            const d = await r.json() as ApiData;
            setData(d);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void reload(); }, [reload]);

    // Auto-link: URL'da ?tg=<id> bo'lsa
    useEffect(() => {
        if (typeof window === "undefined") return;
        const url = new URL(window.location.href);
        const tg = url.searchParams.get("tg");
        if (tg && /^\d{5,20}$/.test(tg)) setTgIdInput(tg);
    }, []);

    const showToast = useCallback((text: string, kind: "ok" | "err" = "ok") => {
        setToast({ text, kind });
        window.setTimeout(() => setToast(null), 3200);
    }, []);

    const saveConfig = useCallback(async (patch: Partial<Config>) => {
        if (!data) return;
        setSaving(true);
        const merged = { ...data.config, ...patch };
        try {
            const r = await fetch("/api/telegram/humo-bot/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(merged),
            });
            const j = await r.json();
            if (r.ok) {
                setData(d => d ? { ...d, config: { ...merged, ...j.config } } : d);
                showToast("Saqlandi");
            } else {
                showToast(j.error ?? "Xato", "err");
            }
        } catch {
            showToast("Tarmoq xatosi", "err");
        } finally {
            setSaving(false);
        }
    }, [data, showToast]);

    const linkBot = useCallback(async () => {
        if (!/^\d{5,20}$/.test(tgIdInput.trim())) {
            showToast("Telegram ID noto'g'ri", "err");
            return;
        }
        setLinking(true);
        try {
            const r = await fetch("/api/telegram/humo-bot/link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ telegramUserId: tgIdInput.trim() }),
            });
            const j = await r.json();
            if (r.ok) {
                showToast("Bot ulandi!");
                await reload();
            } else {
                showToast(j.hint ?? j.error ?? "Xato", "err");
            }
        } catch {
            showToast("Tarmoq xatosi", "err");
        } finally {
            setLinking(false);
        }
    }, [tgIdInput, showToast, reload]);

    const subscribe = useCallback(async (tier: string) => {
        if (!confirm(`${tier.toUpperCase()} rejaga o'tasizmi? Hamyondan pul chegiriladi.`)) return;
        setSubscribing(tier);
        try {
            const r = await fetch("/api/telegram/humo-bot/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tier }),
            });
            const j = await r.json();
            if (r.ok) {
                showToast(`${tier.toUpperCase()} obuna faollashdi!`);
                await reload();
            } else if (j.error === "insufficient_balance") {
                showToast(`Hamyonda pul yetmayapti (${formatMoney(j.balance, "UZS")} / ${formatMoney(j.required, "UZS")})`, "err");
            } else {
                showToast(j.error ?? "Xato", "err");
            }
        } catch {
            showToast("Tarmoq xatosi", "err");
        } finally {
            setSubscribing(null);
        }
    }, [showToast, reload]);

    if (loading || !data) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            <Header connection={data.connection} botUsername={data.botUsername} />
            {!data.connection || data.connection.profileId.startsWith("pending-") ? (
                <ConnectSection
                    botUsername={data.botUsername}
                    tgIdInput={tgIdInput}
                    setTgIdInput={setTgIdInput}
                    onLink={linkBot}
                    linking={linking}
                />
            ) : (
                <>
                    <StatsRow stats={data.stats} subscription={data.subscription} />
                    <HumoTgBotPushCard />
                    <HumoTgBotLeads />
                    <ConfigEditor
                        config={data.config}
                        onSave={saveConfig}
                        saving={saving}
                    />
                    <FaqEditor
                        items={data.config.faqJson}
                        onChange={items => saveConfig({ faqJson: items })}
                        saving={saving}
                    />
                    <BrandingSection
                        config={data.config}
                        subscription={data.subscription}
                        onSave={saveConfig}
                        saving={saving}
                    />
                    <SubscriptionSection
                        current={data.subscription}
                        onSubscribe={subscribe}
                        subscribing={subscribing}
                    />
                </>
            )}

            {toast && (
                <div
                    className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
                        toast.kind === "ok"
                            ? "bg-emerald-600 text-white"
                            : "bg-rose-600 text-white"
                    }`}
                >
                    {toast.text}
                </div>
            )}
        </div>
    );
}

// ── Sarlavha ─────────────────────────────────────────────────────────────────

function Header({ connection, botUsername }: { connection: ApiData["connection"]; botUsername: string }) {
    const isLinked = connection && !connection.profileId.startsWith("pending-");
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                    <Bot className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold">Humo AI · Telegram Bot</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        <a
                            href={`https://t.me/${botUsername}`}
                            target="_blank"
                            rel="noopener"
                            className="underline hover:text-foreground"
                        >
                            @{botUsername}
                        </a>
                        {" · "}Business akkauntingizda mijoz xabarlariga avto-javob.
                    </p>
                </div>
            </div>
            {isLinked && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Ulangan
                </div>
            )}
        </div>
    );
}

// ── 1. Ulash bosqichi ────────────────────────────────────────────────────────

function ConnectSection({
    botUsername, tgIdInput, setTgIdInput, onLink, linking,
}: {
    botUsername: string;
    tgIdInput: string;
    setTgIdInput: (v: string) => void;
    onLink: () => void;
    linking: boolean;
}) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(`@${botUsername}`);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };
    return (
        <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
            <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    Botni Telegram Business'ga ulash
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Business Mode faqat Telegram Premium yoki Business obunachilariga ochiq.
                </p>
            </div>

            <ol className="space-y-3 text-sm">
                <Step n={1}>
                    Telegram → <b>Sozlamalar</b> → <b>Telegram Business</b> → <b>Автоматизация чатов</b> (Chats automation).
                </Step>
                <Step n={2}>
                    <b>Boshqarish</b> (Manage) bandiga bosing va bot username'ni yozing:
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted font-mono text-sm">
                        @{botUsername}
                        <button
                            onClick={copy}
                            className="hover:text-primary"
                            title="Nusxa"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </Step>
                <Step n={3}>
                    Botga <b>Xabarlarga javob berish</b> (Reply to messages) huquqini bering.
                </Step>
                <Step n={4}>
                    Bot sizga xush kelibsiz xabari yuboradi va Telegram ID beradi. Uni pastga kiriting:
                </Step>
            </ol>

            <div className="flex gap-2 pt-1">
                <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Telegram ID (masalan 123456789)"
                    value={tgIdInput}
                    onChange={e => setTgIdInput(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
                <button
                    onClick={onLink}
                    disabled={linking || tgIdInput.length < 5}
                    className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-sky-700 flex items-center gap-1.5"
                >
                    {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    Bog'lash
                </button>
            </div>

            <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:underline"
            >
                Telegram'da botni ochish
                <ExternalLink className="w-3.5 h-3.5" />
            </a>
        </div>
    );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
    return (
        <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                {n}
            </span>
            <div>{children}</div>
        </li>
    );
}

// ── 2. Statistika ────────────────────────────────────────────────────────────

function StatsRow({ stats, subscription }: { stats: Stats; subscription: Subscription }) {
    const usagePercent = subscription.monthlyLimit > 0
        ? Math.min(100, (subscription.usedThisMonth / subscription.monthlyLimit) * 100)
        : 0;
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<Zap className="w-4 h-4" />} label="Bugun" value={stats.today} />
            <StatCard icon={<MessageSquare className="w-4 h-4" />} label="7 kun" value={stats.week} />
            <StatCard icon={<Users className="w-4 h-4" />} label="30 kun" value={stats.month} />
            <div className="rounded-xl border border-border/50 bg-card p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Wallet className="w-4 h-4" />
                    Ushbu oyda
                </div>
                <div className="mt-1.5 text-lg font-semibold">
                    {subscription.usedThisMonth} / {subscription.monthlyLimit}
                </div>
                <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all ${
                            usagePercent > 90 ? "bg-rose-500" : usagePercent > 70 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${usagePercent}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="rounded-xl border border-border/50 bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {icon}{label}
            </div>
            <div className="mt-1.5 text-lg font-semibold">{value.toLocaleString("uz-UZ")}</div>
        </div>
    );
}

// ── 3. Persona/til/ton sozlagichi ────────────────────────────────────────────

function ConfigEditor({
    config, onSave, saving,
}: {
    config: Config;
    onSave: (patch: Partial<Config>) => void;
    saving: boolean;
}) {
    const [local, setLocal] = useState<Config>(config);
    useEffect(() => { setLocal(config); }, [config]);

    const dirty = useMemo(() => JSON.stringify(local) !== JSON.stringify(config), [local, config]);

    return (
        <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    Persona va uslub
                </h2>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                        type="checkbox"
                        checked={local.autoReplyEnabled}
                        onChange={e => setLocal({ ...local, autoReplyEnabled: e.target.checked })}
                        className="w-4 h-4"
                    />
                    Avto-javob {local.autoReplyEnabled ? "yoqilgan" : "o'chirilgan"}
                </label>
            </div>

            <Field label="Biznes persona" hint="Kim sifatida javob beradi? Nima biznes? (masalan &laquo;Toshkent uy ijara agenti&raquo;)">
                <textarea
                    rows={2}
                    maxLength={500}
                    value={local.persona ?? ""}
                    onChange={e => setLocal({ ...local, persona: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
                    placeholder="Men Chorsu bozorida quruq mevalar sotuvchisiman..."
                />
            </Field>

            <Field label="Xush kelibsiz xabari" hint="Ixtiyoriy — Chat boshida yuboradi (yoki AI javobga qo'shadi)">
                <input
                    type="text"
                    maxLength={300}
                    value={local.greeting ?? ""}
                    onChange={e => setLocal({ ...local, greeting: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    placeholder="Assalomu alaykum! Savolingiz bo'lsa yozing."
                />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Ton">
                    <select
                        value={local.tone}
                        onChange={e => setLocal({ ...local, tone: e.target.value as Config["tone"] })}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    >
                        <option value="professional">Professional (rasmiy)</option>
                        <option value="friendly">Do'stona (samimiy)</option>
                        <option value="brief">Qisqa (1-2 gap)</option>
                    </select>
                </Field>
                <Field label="Til">
                    <select
                        value={local.language}
                        onChange={e => setLocal({ ...local, language: e.target.value as Config["language"] })}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    >
                        <option value="uz">O'zbek</option>
                        <option value="ru">Русский</option>
                        <option value="en">English</option>
                        <option value="auto">Avto</option>
                    </select>
                </Field>
            </div>

            <Field label="Ish vaqti" hint="Masalan &laquo;09:00-18:00&raquo;. Bu oralig'idan tashqarida faqat off-hours javob yuboradi.">
                <input
                    type="text"
                    maxLength={80}
                    value={local.workHours ?? ""}
                    onChange={e => setLocal({ ...local, workHours: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    placeholder="09:00-18:00"
                />
            </Field>

            <Field label="Ish vaqti tashqari javob" hint="Ixtiyoriy">
                <textarea
                    rows={2}
                    maxLength={400}
                    value={local.outOfHoursReply ?? ""}
                    onChange={e => setLocal({ ...local, outOfHoursReply: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
                    placeholder="Hozir ish vaqti emas. Ertaga 09:00 dan javob beraman."
                />
            </Field>

            <Field label="Taqiq mavzular" hint="Bot javob bermaydigan mavzular (siyosat, din, ...)">
                <input
                    type="text"
                    maxLength={300}
                    value={local.bannedTopics ?? ""}
                    onChange={e => setLocal({ ...local, bannedTopics: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
            </Field>

            <div className="flex justify-end pt-1">
                <button
                    onClick={() => onSave(local)}
                    disabled={!dirty || saving}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Saqlash
                </button>
            </div>
        </div>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-sm font-medium block mb-1">{label}</label>
            {hint && <p className="text-xs text-muted-foreground mb-1.5" dangerouslySetInnerHTML={{ __html: hint }} />}
            {children}
        </div>
    );
}

// ── Branding / reklama toggles ──────────────────────────────────────────────

function BrandingSection({
    config, subscription, onSave, saving,
}: {
    config: Config;
    subscription: Subscription;
    onSave: (patch: Partial<Config>) => void;
    saving: boolean;
}) {
    const tier = subscription.tier;
    const canRemoveFooter = tier === "pro" || tier === "pro_yearly" || tier === "enterprise" || tier === "enterprise_yearly";
    const canRemoveBranding = tier === "enterprise" || tier === "enterprise_yearly";

    return (
        <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
            <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" />
                    Humo AI branding
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                    Bot javoblarining boshidagi <b>&laquo;Humo AI&raquo;</b> yozuvi va pastdagi reklama footer'i.
                    Obuna darajasiga qarab o'chira olasiz.
                </p>
            </div>

            <ToggleRow
                title="Xabar boshidagi &laquo;Humo AI&raquo; matnini o'chirish"
                subtitle={`Yoqilsa: "Men [ismingiz]ning shaxsiy AI yordamchisiman" (Humo AI so'zisiz).`}
                checked={canRemoveBranding && !config.showBranding}
                disabled={!canRemoveBranding || saving}
                lockLabel="Faqat Enterprise"
                onChange={v => onSave({ showBranding: !v })}
            />

            <ToggleRow
                title="Pastdagi &laquo;— Humo AI&raquo; reklama footer'ini o'chirish"
                subtitle="Yoqilsa: har javob so'ngida &laquo;— Humo AI&raquo; havolasi qo'shilmaydi."
                checked={canRemoveFooter && !config.showAdFooter}
                disabled={!canRemoveFooter || saving}
                lockLabel="Faqat Pro yoki Enterprise"
                onChange={v => onSave({ showAdFooter: !v })}
            />

            <ToggleRow
                title="Ovozli javob (TTS) — mijoz voice yuborsa"
                subtitle="Mijoz voice yuborsa AI matn + ovoz bilan javob beradi. Pro tarifda faol."
                checked={canRemoveFooter && config.ttsEnabled}
                disabled={!canRemoveFooter || saving}
                lockLabel="Faqat Pro yoki Enterprise"
                onChange={v => onSave({ ttsEnabled: v })}
            />

            <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                    Branding — Humo AI'ning tabiiy tarqalishi. Iltimos, o'chirishdan avval
                    o'ylab ko'ring: har xabar ostidagi kichkina havola boshqa biznesga botni topishga yordam beradi.
                </span>
            </div>

            {/* BN do'kon bog'lash */}
            <div className="pt-3 border-t border-border">
                <label className="text-sm font-medium block mb-1">Bozor Narxida do'kon (ixtiyoriy)</label>
                <p className="text-xs text-muted-foreground mb-2">
                    Do'koningiz slug'ini kiriting — lead <b>Yakunlandi</b> qilinganda sotuv avto ravishda BN'da <b>xarid tarixi</b>ga yoziladi (kabinet Home statistikada ko'rinadi).
                </p>
                <input
                    type="text"
                    placeholder="masalan: umid-dokoni"
                    defaultValue={config.linkedBnShopSlug ?? ""}
                    onBlur={e => {
                        const v = e.target.value.trim().toLowerCase();
                        if (v !== (config.linkedBnShopSlug ?? "")) onSave({ linkedBnShopSlug: v || null });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
                />
            </div>
        </div>
    );
}

function ToggleRow({
    title, subtitle, checked, disabled, lockLabel, onChange,
}: {
    title: string;
    subtitle?: string;
    checked: boolean;
    disabled: boolean;
    lockLabel?: string;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${disabled ? "border-border/40 bg-muted/20" : "border-border bg-background/50"}`}>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium flex items-center gap-1.5" dangerouslySetInnerHTML={{ __html: title }} />
                {subtitle && (
                    <div className="text-xs text-muted-foreground mt-0.5" dangerouslySetInnerHTML={{ __html: subtitle }} />
                )}
                {disabled && lockLabel && (
                    <div className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {lockLabel}
                    </div>
                )}
            </div>
            <button
                onClick={() => !disabled && onChange(!checked)}
                disabled={disabled}
                className={`shrink-0 relative w-11 h-6 rounded-full transition-colors ${
                    checked ? "bg-emerald-500" : "bg-muted"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
                <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        checked ? "translate-x-5" : "translate-x-0.5"
                    }`}
                />
            </button>
        </div>
    );
}

// ── 4. FAQ tahriri ───────────────────────────────────────────────────────────

function FaqEditor({
    items, onChange, saving,
}: {
    items: FaqItem[];
    onChange: (items: FaqItem[]) => void;
    saving: boolean;
}) {
    const add = () => onChange([...items, { q: "", a: "" }]);
    const update = (i: number, patch: Partial<FaqItem>) =>
        onChange(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

    return (
        <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold flex items-center gap-2">
                        <HelpCircle className="w-4 h-4" />
                        Tez-tez so'raladigan savollar
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Bot avval FAQ'ni tekshiradi (30 tagacha). Mos kelsa AI o'rniga aynan javob beradi.
                    </p>
                </div>
                <button
                    onClick={add}
                    disabled={items.length >= 30}
                    className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-50 flex items-center gap-1.5"
                >
                    <Plus className="w-4 h-4" />
                    Qo'shish
                </button>
            </div>

            {items.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                    Hali FAQ yo'q. Yuqoridagi &laquo;Qo'shish&raquo; tugmasi bilan boshlang.
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((it, i) => (
                        <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-background/50">
                            <div className="flex items-start gap-2">
                                <input
                                    type="text"
                                    placeholder="Savol"
                                    maxLength={200}
                                    value={it.q}
                                    onChange={e => update(i, { q: e.target.value })}
                                    className="flex-1 px-2.5 py-1.5 rounded-md border border-border bg-background text-sm"
                                />
                                <button
                                    onClick={() => remove(i)}
                                    className="p-1.5 text-muted-foreground hover:text-rose-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <textarea
                                rows={2}
                                placeholder="Javob"
                                maxLength={800}
                                value={it.a}
                                onChange={e => update(i, { a: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm resize-none"
                            />
                        </div>
                    ))}
                </div>
            )}

            {saving && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saqlanmoqda...
                </div>
            )}
        </div>
    );
}

// ── 5. Obuna ─────────────────────────────────────────────────────────────────

function SubscriptionSection({
    current, onSubscribe, subscribing,
}: {
    current: Subscription;
    onSubscribe: (tier: string) => void;
    subscribing: string | null;
}) {
    const [billing, setBilling] = useState<"monthly" | "yearly">(
        current.tier.endsWith("_yearly") ? "yearly" : "monthly"
    );
    const tiers = billing === "yearly" ? YEARLY_TIERS : MONTHLY_TIERS;

    return (
        <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h2 className="text-base font-semibold flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Obuna rejasi
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Faqat For Pay hamyoni orqali. Payme/Click yo'q — hamyoningizga oldindan pul quying.
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-xs text-muted-foreground">Joriy reja</div>
                    <div className="text-sm font-semibold uppercase">{current.tier.replace("_", " ")}</div>
                    {current.expiresAt && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(current.expiresAt).toLocaleDateString("uz-UZ")} gacha
                        </div>
                    )}
                </div>
            </div>

            {/* Monthly / Yearly toggle */}
            <div className="flex items-center justify-center gap-2">
                <div className="inline-flex rounded-lg bg-muted p-1">
                    <button
                        onClick={() => setBilling("monthly")}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                            billing === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground"
                        }`}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        Oylik
                    </button>
                    <button
                        onClick={() => setBilling("yearly")}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                            billing === "yearly" ? "bg-background shadow-sm" : "text-muted-foreground"
                        }`}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        Yillik
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 text-[10px] font-semibold">
                            −20% gacha
                        </span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {tiers.map(t => {
                    const isCurrent = current.tier === t.id;
                    return (
                        <div
                            key={t.id}
                            className={`rounded-xl border p-4 flex flex-col relative ${
                                isCurrent
                                    ? "border-primary bg-primary/5"
                                    : "border-border bg-background/50"
                            }`}
                        >
                            {t.popular && (
                                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-semibold whitespace-nowrap">
                                    Ommabop
                                </span>
                            )}
                            {t.yearly && t.savings > 0 && (
                                <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-semibold whitespace-nowrap flex items-center gap-0.5">
                                    <Percent className="w-2.5 h-2.5" />
                                    Tejang
                                </span>
                            )}

                            <div className="font-semibold text-sm">{t.label}</div>

                            {t.priceTotal === 0 ? (
                                <>
                                    <div className="mt-1 text-2xl font-bold">0</div>
                                    <div className="text-[11px] text-muted-foreground">har doim bepul</div>
                                </>
                            ) : t.yearly ? (
                                <>
                                    <div className="mt-1 text-2xl font-bold">
                                        {formatMoney(t.priceMonthly, "UZS")}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        /oy · yillik {formatMoney(t.priceTotal, "UZS")}
                                    </div>
                                    <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                                        {formatMoney(t.savings, "UZS")} tejaysiz
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="mt-1 text-2xl font-bold">{formatMoney(t.priceTotal, "UZS")}</div>
                                    <div className="text-[11px] text-muted-foreground">/oy</div>
                                </>
                            )}

                            <div className="mt-2 text-xs text-muted-foreground">
                                {t.limit.toLocaleString("uz-UZ")} xabar / oy
                            </div>

                            <ul className="mt-3 space-y-1.5 text-xs flex-1">
                                {t.features.map(f => (
                                    <li key={f} className="flex items-start gap-1.5">
                                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <button
                                disabled={isCurrent || subscribing !== null || t.priceTotal === 0}
                                onClick={() => onSubscribe(t.id)}
                                className={`mt-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${
                                    isCurrent
                                        ? "bg-muted text-muted-foreground cursor-default"
                                        : t.priceTotal === 0
                                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                                        : "bg-primary text-primary-foreground hover:opacity-90"
                                }`}
                            >
                                {subscribing === t.id
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : isCurrent ? <><Check className="w-4 h-4" />Joriy</>
                                    : t.priceTotal === 0 ? "Bepul reja"
                                    : <><Send className="w-4 h-4" />Sotib olish</>}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                    {billing === "yearly"
                        ? "Yillik obuna 365 kunga faollashadi. Uzaytirish uchun qo'lda qayta sotib oling — avto-yangilash yo'q. Bekor qilish istagan vaqtda mumkin (avval to'langan pul qaytmaydi)."
                        : "Oylik obuna 30 kunga faollashadi. Uzaytirish uchun qo'lda qayta sotib oling — avto-yangilash yo'q. Bekor qilish istagan vaqtda mumkin (avval to'langan pul qaytmaydi)."}
                </div>
            </div>
        </div>
    );
}
