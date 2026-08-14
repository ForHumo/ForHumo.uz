"use client";

// Nexus profilida "Business" banner + tez amallar (qo'ng'iroq/email/marshrut/website).
// Ma'lumotni /api/user/business/[username] dan olib chiqadi. Yo'q bo'lsa null.

import { useEffect, useState } from "react";
import { Store, Phone, Mail, MapPin, Globe, Clock, Check, X } from "lucide-react";
import { formatHoursShort, isOpenNow, DAY_LABELS_FULL, type BusinessHourSlot } from "@/lib/business-hours";

interface Business {
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

export function NxBusinessBanner({ username }: { username: string }) {
    const [business, setBusiness] = useState<Business | null>(null);
    const [hoursOpen, setHoursOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/user/business/${encodeURIComponent(username)}`)
            .then(r => r.json())
            .then(d => { if (!cancelled) setBusiness(d.business); })
            .catch(() => { if (!cancelled) setBusiness(null); });
        return () => { cancelled = true; };
    }, [username]);

    if (!business) return null;
    const hours = Array.isArray(business.hours) ? business.hours : [];
    const open = hours.length > 0 ? isOpenNow(hours) : null;

    const mapsUrl = business.lat != null && business.lng != null
        ? `https://www.google.com/maps?q=${business.lat},${business.lng}`
        : business.address
            ? `https://www.google.com/maps?q=${encodeURIComponent(business.address)}`
            : null;

    return (
        <div className="rounded-2xl p-4 mb-3" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.10), rgba(43,62,232,0.06))", border: "1px solid rgba(249,115,22,0.25)" }}>
            <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center">
                    <Store className="w-4 h-4" />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-black">{business.category}</div>
                    {business.subcategory && <div className="text-xs opacity-70">{business.subcategory}</div>}
                </div>
                {open !== null && (
                    <span className={`text-xs px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${open ? "bg-emerald-500/20 text-emerald-500" : "bg-gray-500/20 text-gray-500"}`}>
                        {open ? <><Check className="w-3 h-3" /> Ochiq</> : <><X className="w-3 h-3" /> Yopiq</>}
                    </span>
                )}
            </div>

            {business.address && (
                <div className="text-xs opacity-80 flex items-start gap-1.5 mb-2">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{business.address}</span>
                </div>
            )}

            {hours.length > 0 && (
                <button onClick={() => setHoursOpen(v => !v)} className="text-xs opacity-80 flex items-start gap-1.5 mb-3 hover:opacity-100 w-full text-left">
                    <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{formatHoursShort(hours)} <span className="opacity-60 underline">— {hoursOpen ? "yashirish" : "hammasi"}</span></span>
                </button>
            )}

            {hoursOpen && hours.length > 0 && (
                <div className="mb-3 p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] text-xs space-y-1">
                    {[1, 2, 3, 4, 5, 6, 0].map(day => {
                        const daySlots = hours.filter(h => h.day === day);
                        return (
                            <div key={day} className="flex items-center gap-3">
                                <span className="w-24 opacity-70">{DAY_LABELS_FULL[day]}</span>
                                <span className="font-bold">{daySlots.length === 0 ? "Yopiq" : daySlots.map(s => `${s.open}–${s.close}`).join(", ")}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {business.phone && (
                    <a href={`tel:${business.phone}`}
                        className="h-9 px-3 rounded-lg bg-white/80 hover:bg-white text-gray-900 text-xs font-bold flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> Qo'ng'iroq
                    </a>
                )}
                {business.email && (
                    <a href={`mailto:${business.email}`}
                        className="h-9 px-3 rounded-lg bg-white/80 hover:bg-white text-gray-900 text-xs font-bold flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> Email
                    </a>
                )}
                {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                        className="h-9 px-3 rounded-lg bg-white/80 hover:bg-white text-gray-900 text-xs font-bold flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Marshrut
                    </a>
                )}
                {business.website && (
                    <a href={business.website} target="_blank" rel="noopener noreferrer"
                        className="h-9 px-3 rounded-lg bg-white/80 hover:bg-white text-gray-900 text-xs font-bold flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" /> Website
                    </a>
                )}
            </div>
        </div>
    );
}
