"use client";

import { useEffect, useState } from "react";
import { Store, Loader2, Save, Trash2, Plus, X, Check, AlertCircle } from "lucide-react";
import { DAY_LABELS_FULL, type BusinessHourSlot } from "@/lib/business-hours";

interface Business {
    id: string;
    category: string;
    subcategory: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    hours: BusinessHourSlot[] | null;
}

export function BusinessProfilePanel() {
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Form state
    const [category, setCategory] = useState("");
    const [subcategory, setSubcategory] = useState("");
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [website, setWebsite] = useState("");
    const [hours, setHours] = useState<BusinessHourSlot[]>([]);

    async function load() {
        setLoading(true);
        try {
            const r = await fetch("/api/user/business");
            const d = await r.json();
            setBusiness(d.business);
            if (d.business) {
                setCategory(d.business.category || "");
                setSubcategory(d.business.subcategory || "");
                setAddress(d.business.address || "");
                setPhone(d.business.phone || "");
                setEmail(d.business.email || "");
                setWebsite(d.business.website || "");
                setHours(Array.isArray(d.business.hours) ? d.business.hours : []);
            }
        } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    async function save() {
        if (busy) return;
        setBusy(true); setError(null); setSaved(false);
        try {
            const r = await fetch("/api/user/business", {
                method: business ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category, subcategory, address, phone, email, website, hours }),
            });
            const d = await r.json();
            if (!r.ok) { setError(d?.error || "Saqlanmadi"); setBusy(false); return; }
            setBusiness(d.business);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } finally { setBusy(false); }
    }

    async function remove() {
        setBusy(true); setError(null); setConfirmDelete(false);
        try {
            await fetch("/api/user/business", { method: "DELETE" });
            setBusiness(null);
            setCategory(""); setSubcategory(""); setAddress(""); setPhone(""); setEmail(""); setWebsite(""); setHours([]);
        } finally { setBusy(false); }
    }

    function addHourSlot(day: number) {
        setHours(prev => [...prev, { day, open: "09:00", close: "18:00" }]);
    }
    function removeHourSlot(idx: number) {
        setHours(prev => prev.filter((_, i) => i !== idx));
    }
    function updateSlot(idx: number, field: "open" | "close", val: string) {
        setHours(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
    }

    return (
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 p-5 mt-4">
            <div className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${business ? "bg-orange-500/15 text-orange-500" : "bg-white/5 text-gray-400"}`}>
                    <Store className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <div className="font-black text-base">Business profil</div>
                    <div className="text-xs opacity-70 mt-0.5">
                        {business
                            ? <>Nexus profilingizda "Business" badge, kategoriya, ish vaqti va qo'ng'iroq/marshrut tugmalari ko'rinadi.</>
                            : <>Profilingizni biznes sifatida ko'rsating — Instagram Business uslub.</>}
                    </div>
                </div>
            </div>

            {loading && <div className="text-center py-4 opacity-60"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}

            {!loading && (
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold opacity-80">Kategoriya *</label>
                        <input value={category} onChange={e => setCategory(e.target.value)} maxLength={60}
                            placeholder="Kafe, Barber, Studio, Yetkazib berish..."
                            className="w-full h-11 px-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none mt-1" />
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-80">Ichki kategoriya</label>
                        <input value={subcategory} onChange={e => setSubcategory(e.target.value)} maxLength={60}
                            placeholder="Italyan taomlari, Erkak sartaroshi..."
                            className="w-full h-11 px-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none mt-1" />
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-80">Manzil</label>
                        <input value={address} onChange={e => setAddress(e.target.value)} maxLength={300}
                            placeholder="Toshkent, Amir Temur ko'chasi 15"
                            className="w-full h-11 px-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold opacity-80">Telefon</label>
                            <input value={phone} onChange={e => setPhone(e.target.value)} maxLength={40}
                                placeholder="+998901234567"
                                className="w-full h-11 px-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none mt-1" />
                        </div>
                        <div>
                            <label className="text-xs font-bold opacity-80">Email</label>
                            <input value={email} onChange={e => setEmail(e.target.value)} maxLength={120} type="email"
                                placeholder="hello@example.com"
                                className="w-full h-11 px-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none mt-1" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-80">Website</label>
                        <input value={website} onChange={e => setWebsite(e.target.value)} maxLength={200}
                            placeholder="https://example.com"
                            className="w-full h-11 px-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none mt-1" />
                    </div>

                    <div>
                        <div className="text-xs font-bold opacity-80 mb-2">Ish vaqti</div>
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5, 6, 0].map(day => {
                                const dayHours = hours.map((h, i) => ({ ...h, _i: i })).filter(h => h.day === day);
                                return (
                                    <div key={day} className="flex items-start gap-2">
                                        <div className="w-24 pt-2 text-xs font-bold">{DAY_LABELS_FULL[day]}</div>
                                        <div className="flex-1 space-y-1">
                                            {dayHours.length === 0 && <div className="text-xs opacity-50 h-9 flex items-center">Yopiq</div>}
                                            {dayHours.map(h => (
                                                <div key={h._i} className="flex items-center gap-2">
                                                    <input type="time" value={h.open} onChange={e => updateSlot(h._i, "open", e.target.value)}
                                                        className="h-9 px-2 rounded-lg bg-black/5 dark:bg-white/5 outline-none text-sm" />
                                                    <span className="opacity-60">—</span>
                                                    <input type="time" value={h.close} onChange={e => updateSlot(h._i, "close", e.target.value)}
                                                        className="h-9 px-2 rounded-lg bg-black/5 dark:bg-white/5 outline-none text-sm" />
                                                    <button onClick={() => removeHourSlot(h._i)} className="w-7 h-7 rounded-lg hover:bg-red-500/10 text-red-500 flex items-center justify-center">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => addHourSlot(day)} className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 flex items-center justify-center flex-shrink-0" title="Slot qo'shish">
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
                    {saved && <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-bold flex items-center gap-2"><Check className="w-4 h-4" />Saqlandi</div>}

                    <div className="flex items-center gap-2 pt-2">
                        <button onClick={save} disabled={busy || category.trim().length < 2}
                            className="flex-1 h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {business ? "Saqlash" : "Business profilni yoqish"}
                        </button>
                        {business && (
                            <button onClick={() => setConfirmDelete(true)} className="h-11 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold flex items-center gap-2">
                                <Trash2 className="w-4 h-4" /> O'chirish
                            </button>
                        )}
                    </div>
                </div>
            )}

            {confirmDelete && (
                <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirmDelete(false)}>
                    <div className="w-full max-w-sm p-5 rounded-2xl bg-white dark:bg-neutral-900" onClick={e => e.stopPropagation()}>
                        <div className="font-black mb-2">Business profilni o'chirishmi?</div>
                        <div className="text-xs opacity-70 mb-4">Barcha business ma'lumotlari (manzil, ish vaqti, kontaktlar) o'chiriladi. Oddiy profil qoladi.</div>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setConfirmDelete(false)} className="h-11 rounded-xl bg-black/5 dark:bg-white/5 text-sm font-bold">Bekor</button>
                            <button onClick={remove} className="h-11 rounded-xl bg-red-600 text-white text-sm font-bold">O'chirish</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
