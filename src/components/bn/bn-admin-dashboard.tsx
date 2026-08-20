"use client";

// BN admin dashboard — bir ekranda butun biznes holati.
// OWNER/MODERATOR ko'radi. Har 60 sek serverda cache, foydalanuvchi kirsa
// darhol chiziladi (yengil aggregate query).

import { useEffect, useState } from "react";
import {
    ClipboardList, Store, ShoppingBag, Radio, UserPlus, Bell,
    TrendingUp, Loader2, LucideIcon,
} from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { formatMoney } from "@/lib/money";

interface Dashboard {
    waitlist: { byStatus: Record<string, number>; today: number; week: number };
    shops: { byStatus: Record<string, number> };
    orders: { byStatus: Record<string, number>; today: number; week: number };
    broadcasts: {
        today: number; week: number;
        weekRecipients: number; weekClicks: number; weekCtr: number;
    };
    referrals: { byStatus: Record<string, number>; rewardedTotal: number };
    pushSubscribers: number;
}

export function BnAdminDashboard() {
    const [d, setD] = useState<Dashboard | null>(null);

    useEffect(() => {
        fetch("/api/bn/admin/dashboard")
            .then(r => r.ok ? r.json() : null)
            .then(setD)
            .catch(() => setD(null));
    }, []);

    if (d === null) {
        return (
            <div className="p-8 grid place-items-center rounded-2xl"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: BN.gold }} />
            </div>
        );
    }

    const waitPending = d.waitlist.byStatus["PENDING"] ?? 0;
    const shopsApproved = d.shops.byStatus["APPROVED"] ?? 0;
    const shopsPending = d.shops.byStatus["PENDING"] ?? 0;
    const ordersActive = ["PLACED", "CONFIRMED", "READY"].reduce((s, k) => s + (d.orders.byStatus[k] ?? 0), 0);
    const ordersCompleted = d.orders.byStatus["COMPLETED"] ?? 0;
    const referralsRewarded = d.referrals.byStatus["REWARDED"] ?? 0;
    const referralsPending = d.referrals.byStatus["PENDING"] ?? 0;

    return (
        <div className="space-y-4">
            {/* 1-qator: Waitlist + Shops + Orders */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <Kpi icon={ClipboardList} title="Waitlist — yangi" mainValue={waitPending}
                    hint={`+${d.waitlist.today} bugun · +${d.waitlist.week} hafta`}
                    tint={waitPending > 0 ? BN.gold : BN.text3} />
                <Kpi icon={Store} title="Do'konlar — faol" mainValue={shopsApproved}
                    hint={shopsPending > 0 ? `${shopsPending} kutmoqda` : "kutish yo'q"}
                    tint={BN.ok} />
                <Kpi icon={ShoppingBag} title="Buyurtma — faol" mainValue={ordersActive}
                    hint={`+${d.orders.today} bugun · ${ordersCompleted} tugagan`}
                    tint={ordersActive > 0 ? BN.gold : BN.text3} />
                <Kpi icon={Bell} title="Push obunachilar" mainValue={d.pushSubscribers}
                    hint="barcha qurilmalar"
                    tint={BN.text2} />
            </div>

            {/* 2-qator: Broadcast + Referral */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="p-4 rounded-2xl"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                    <div className="flex items-center gap-2 mb-3">
                        <Radio className="w-4 h-4" style={{ color: BN.gold }} />
                        <h3 className="text-[13px] font-black">Broadcast (7 kun)</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <Stat label="Yuborilgan" value={`${d.broadcasts.week}`} />
                        <Stat label="Yetib bordi" value={`${d.broadcasts.weekRecipients}`} />
                        <Stat label="CTR" value={`${d.broadcasts.weekCtr}%`}
                            color={d.broadcasts.weekCtr >= 10 ? BN.ok : d.broadcasts.weekCtr >= 3 ? BN.gold : BN.text3} />
                    </div>
                    {d.broadcasts.today > 0 && (
                        <p className="text-[11px] mt-3" style={{ color: BN.text3 }}>
                            Bugun: <span style={{ color: BN.gold }} className="font-black">{d.broadcasts.today}</span>
                            {" "}/ 3
                        </p>
                    )}
                </div>

                <div className="p-4 rounded-2xl"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                    <div className="flex items-center gap-2 mb-3">
                        <UserPlus className="w-4 h-4" style={{ color: BN.gold }} />
                        <h3 className="text-[13px] font-black">Referral</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <Stat label="Kutmoqda" value={`${referralsPending}`} />
                        <Stat label="Bonus olindi" value={`${referralsRewarded}`}
                            color={BN.ok} />
                        <Stat label="Jami to'landi" value={formatMoney(d.referrals.rewardedTotal, "UZS")}
                            color={BN.gold} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function Kpi({ icon: Icon, title, mainValue, hint, tint }: {
    icon: LucideIcon; title: string; mainValue: number; hint: string; tint: string;
}) {
    return (
        <div className="p-4 rounded-2xl"
            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
            <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5" style={{ color: BN.text3 }} />
                <span className="text-[10.5px] font-black uppercase tracking-wider truncate"
                    style={{ color: BN.text3 }}>{title}</span>
            </div>
            <div className="text-[26px] font-black leading-none tabular-nums" style={{ color: tint }}>
                {mainValue}
            </div>
            <div className="text-[10.5px] mt-1.5 truncate" style={{ color: BN.text3 }}>{hint}</div>
        </div>
    );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: BN.text3 }}>{label}</div>
            <div className="text-[15px] font-black tabular-nums truncate" style={{ color: color ?? BN.text2 }}>{value}</div>
        </div>
    );
}
