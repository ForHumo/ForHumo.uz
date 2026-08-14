"use client";

// Kontakt sinxronizatsiya paneli (Nexus ichida).
// Foydalanuvchi telefondan kontakt yuklaydi → ForHumo'dagi tanish odamlar chiqadi.
//
// Uch usul kiritish:
//   1. Browser Contact Picker API (Chrome mobile) — bir tugma bilan
//   2. Matn qatorda ({+998901234567, ...}) yuklash — barcha brauzerlarda
//   3. VCF fayl yuklash — tez birinchi bosqichda emas (keyingi PR)

import { useEffect, useState } from "react";
import { UserRound, Loader2, Upload, Trash2, Check, AlertCircle, Smartphone, X } from "lucide-react";
import { Link } from "@/i18n/routing";

interface Match {
    profileId: string;
    username: string | null;
    name: string | null;
    image: string | null;
    humoId: string | null;
    nameHint: string | null;
    verified: boolean;
}

interface ContactWithSupport {
    select(props?: { multiple: boolean }): Promise<Array<{ tel?: string[]; name?: string[] }>>;
    getProperties(): Promise<string[]>;
}

interface WindowWithContacts extends Window {
    contacts?: ContactWithSupport;
}

export function NxContactsPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);
    const [manualOpen, setManualOpen] = useState(false);
    const [hasContactPicker, setHasContactPicker] = useState(false);

    async function loadMatches() {
        setLoading(true);
        try {
            const r = await fetch("/api/nexus/contacts/matches?limit=500");
            if (r.ok) {
                const d = await r.json();
                setMatches(d.matches || []);
            }
        } finally { setLoading(false); }
    }

    useEffect(() => {
        loadMatches();
        // Contact Picker API tekshiruv (Chrome/Android)
        const w = window as WindowWithContacts;
        setHasContactPicker(typeof navigator !== "undefined" && "contacts" in navigator && !!w.contacts);
    }, []);

    async function syncBrowserContacts() {
        if (busy) return;
        setBusy(true); setError(null); setOk(null);
        try {
            const w = window as unknown as { contacts?: ContactWithSupport };
            if (!w.contacts) throw new Error("Contact Picker mavjud emas");
            const selected = await w.contacts.select({ multiple: true });
            if (!selected || selected.length === 0) { setBusy(false); return; }
            const contacts = selected
                .flatMap(c => (c.tel || []).map(tel => ({ phone: tel, name: (c.name && c.name[0]) || undefined })))
                .filter(c => c.phone);
            await sync(contacts);
        } catch (e) {
            setError((e as Error).message || "Kontaktlarni olishda xato");
            setBusy(false);
        }
    }

    async function sync(contacts: Array<{ phone: string; name?: string }>) {
        if (contacts.length === 0) { setError("Kontakt topilmadi"); setBusy(false); return; }
        try {
            const r = await fetch("/api/nexus/contacts/sync", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contacts }),
            });
            const d = await r.json();
            if (!r.ok) { setError(d?.error || "Sinxronizatsiya bajarilmadi"); setBusy(false); return; }
            setOk(`${d.synced} raqam tekshirildi, ${d.matches.length} ta ForHumo'da topildi`);
            setBusy(false);
            loadMatches();
        } catch {
            setError("Tarmoq xatosi");
            setBusy(false);
        }
    }

    async function clearAll() {
        if (!confirm("Barcha sinxronlangan kontaktlarni o'chirishmi? Bu qaytarilmaydi.")) return;
        setBusy(true);
        try {
            const r = await fetch("/api/nexus/contacts/matches", { method: "DELETE" });
            if (r.ok) { setMatches([]); setOk("Barcha kontaktlar o'chirildi"); }
        } finally { setBusy(false); }
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
                    <UserRound className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <h1 className="text-xl font-black">Kontaktlarim ForHumo'da</h1>
                    <p className="text-xs opacity-70">Telefondagi kontaktlaringizdan qay biri ForHumo'da borligini toping.</p>
                </div>
            </div>

            {/* Sync tugmalar */}
            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 p-4 mb-4">
                {hasContactPicker && (
                    <button onClick={syncBrowserContacts} disabled={busy}
                        className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 mb-2">
                        {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Yuklanmoqda</> : <><Smartphone className="w-4 h-4" /> Telefondan kontaktlar tanlash</>}
                    </button>
                )}
                <button onClick={() => setManualOpen(true)} disabled={busy}
                    className="w-full h-11 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                    <Upload className="w-4 h-4" /> Qo'lda kiritish
                </button>
                <div className="text-xs opacity-60 mt-2">
                    Xavfsizlik: raqamlar SHA-256 bilan hashlanadi. Raw raqamlar serverda saqlanmaydi.
                </div>
            </div>

            {ok && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-bold flex items-center gap-2 mb-3">
                    <Check className="w-4 h-4" /> {ok}
                </div>
            )}
            {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-xs font-bold flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}

            {/* Match ro'yxati */}
            <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-bold opacity-80">Topildi ({matches.length})</div>
                {matches.length > 0 && (
                    <button onClick={clearAll} className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" /> Barchasini o'chirish
                    </button>
                )}
            </div>
            {loading && <div className="text-center py-4 opacity-60"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>}
            {!loading && matches.length === 0 && (
                <div className="text-center py-10 opacity-60 text-xs">
                    Hali sinxronlanmagan. Yuqoridagi tugma bilan boshlang.
                </div>
            )}
            <div className="space-y-1">
                {matches.map(m => (
                    <Link key={m.profileId} href={m.username ? `/nexus/u/${m.username}` : "/nexus"}
                        className="w-full p-3 rounded-xl bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-white/5 flex items-center gap-3 transition-colors">
                        {m.image
                            ? <img src={m.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                            : <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-sm font-bold">{(m.name || m.username || "?").charAt(0).toUpperCase()}</div>}
                        <div className="flex-1 min-w-0">
                            <div className="font-bold truncate flex items-center gap-1">
                                {m.name || m.username || "?"}
                                {m.verified && <span className="text-blue-500">✓</span>}
                            </div>
                            <div className="text-xs opacity-60 truncate">
                                {m.username && <>@{m.username}</>}
                                {m.nameHint && m.nameHint !== m.name && <> · <span className="opacity-70">telefonda: {m.nameHint}</span></>}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {manualOpen && <ManualInputModal onClose={() => setManualOpen(false)} onSubmit={contacts => { setManualOpen(false); setBusy(true); sync(contacts); }} />}
        </div>
    );
}

function ManualInputModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (contacts: Array<{ phone: string; name?: string }>) => void }) {
    const [text, setText] = useState("");
    const lines = text.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    const contacts = lines.map(l => {
        // Format: "+998901234567" yoki "Ismi +998901234567"
        const m = l.match(/^(.*?)\s*(\+?[\d\s()-]{7,})$/);
        if (m) return { phone: m[2].trim(), name: m[1].trim() || undefined };
        return { phone: l };
    });

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-lg p-5 rounded-2xl bg-white dark:bg-neutral-900" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-3">
                    <div className="font-black text-lg flex-1">Telefon raqamlarni kiriting</div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button>
                </div>
                <div className="text-xs opacity-70 mb-2">
                    Har qatorda bitta raqam. Ism ixtiyoriy (raqamdan oldin).
                </div>
                <textarea value={text} onChange={e => setText(e.target.value)}
                    placeholder="+998901234567&#10;Ali +998907654321&#10;+998551112233"
                    className="w-full min-h-[160px] p-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none font-mono text-sm resize-none" autoFocus />
                <div className="text-xs opacity-60 mt-2 mb-3">{contacts.length} ta raqam aniqlandi (maks 500)</div>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={onClose} className="h-11 rounded-xl bg-black/5 dark:bg-white/5 text-sm font-bold">Bekor</button>
                    <button onClick={() => contacts.length > 0 && onSubmit(contacts)} disabled={contacts.length === 0}
                        className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50">
                        Sinxronlash
                    </button>
                </div>
            </div>
        </div>
    );
}
