"use client";

// Humo AI Telegram Business Bot — sozlash sahifasi.
// Yo'l: /ai/telegram-bot
// Foydalanuvchi Business akkaunti bilan bot'ni ulaydi, persona/FAQ/ish vaqtini
// yozadi, obuna sotib oladi (faqat For Pay hamyoni orqali).

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Bot, Check, ChevronRight, Copy, ExternalLink, Loader2, MessageSquare,
    Plus, Save, Send, Settings2, Trash2, Users, Wallet, X, Zap, AlertCircle,
    ShieldCheck, HelpCircle, Clock, Sparkles, Link as LinkIcon,
} from "lucide-react";
import { formatMoney } from "@/lib/money";

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

interface Subscription {
    tier: "free" | "basic" | "pro" | "enterprise";
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

const TIERS = [
    { id: "free", label: "Bepul", price: 0, limit: 50, features: ["Kunlik 1-2 mijoz", "Asosiy AI javob"] },
    { id: "basic", label: "Basic", price: 29_000, limit: 500, features: ["Oyiga 500 xabar", "FAQ + persona", "Prioritet AI"], popular: false },
    { id: "pro", label: "Pro", price: 99_000, limit: 3_000, features: ["Oyiga 3000 xabar", "Kelgusi funksiyalar", "Tez javob"], popular: true },
    { id: "enterprise", label: "Enterprise", price: 299_000, limit: 30_000, features: ["Cheksiz xabarlar", "Maxsus qo'llab-quvvatlash"] },
] as const;

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
    return (
        <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
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
                    <div className="text-sm font-semibold uppercase">{current.tier}</div>
                    {current.expiresAt && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(current.expiresAt).toLocaleDateString("uz-UZ")} gacha
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {TIERS.map(t => {
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
                            {(t as { popular?: boolean }).popular && (
                                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-semibold">
                                    Ommabop
                                </span>
                            )}
                            <div className="font-semibold text-sm">{t.label}</div>
                            <div className="mt-1 text-2xl font-bold">
                                {t.price === 0 ? "0" : formatMoney(t.price, "UZS")}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                                {t.price > 0 ? "/oy" : "har doim bepul"}
                            </div>
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
                                disabled={isCurrent || subscribing !== null || t.id === "free"}
                                onClick={() => onSubscribe(t.id)}
                                className={`mt-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${
                                    isCurrent
                                        ? "bg-muted text-muted-foreground cursor-default"
                                        : t.id === "free"
                                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                                        : "bg-primary text-primary-foreground hover:opacity-90"
                                }`}
                            >
                                {subscribing === t.id
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : isCurrent ? <><Check className="w-4 h-4" />Joriy</>
                                    : t.id === "free" ? "Bepul reja"
                                    : <><Send className="w-4 h-4" />Sotib olish</>}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                    Obuna 30 kunga faollashadi. Uzaytirish uchun qo'lda qayta sotib oling — avto-yangilash yo'q.
                    Bekor qilish istagan vaqtda mumkin (avval to'langan pul qaytmaydi).
                </div>
            </div>
        </div>
    );
}
