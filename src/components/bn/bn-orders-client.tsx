"use client";

// BN xaridor buyurtmalari — ro'yxat + bitta buyurtma tafsiloti.
// Server sahifadan initial ma'lumot keladi. Cancel amali client'da.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import {
    Package, LogIn, ChevronRight, Clock, Check, X, Truck, Eye,
    Wallet, Banknote, Store, MapPin, Phone, Loader2, RotateCw,
} from "lucide-react";
import { BN, fmtPrice, ORDER_STATUS_META } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";
import { BnEmpty } from "./bn-cards";
import { BnBackButton } from "./bn-back-button";
import { BnPushCard } from "./bn-push-card";
import { BnRatingModal } from "./bn-rating-modal";

export interface OrderListItem {
    id: string;
    code: string;
    status: keyof typeof ORDER_STATUS_META;
    fulfillType: "PICKUP" | "DELIVERY" | "INSPECT";
    paymentMethod: "WALLET" | "CASH";
    total: number;
    placedAt: string;
    shopName: string;
    shopSlug: string;
    itemCount: number;
    firstImage: string | null;
}

// ── RO'YXAT ─────────────────────────────────────────────────────────────────

export function BnOrdersListClient({
    initial, unauthenticated,
}: { initial: OrderListItem[]; unauthenticated: boolean }) {
    const { status } = useSession();
    const t = useTranslations("bn.orders");
    const tStatus = useTranslations("bn.orderStatus");
    const locale = useLocale();
    const notAuth = unauthenticated || status === "unauthenticated";

    if (notAuth) return <AuthGate />;
    if (initial.length === 0) {
        return (
            <Wrap>
                <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight mb-6">{t("title")}</h1>
                <BnEmpty
                    icon={<Package className="w-6 h-6" />}
                    title={t("emptyTitle")}
                    text={t("emptyText")}
                    action={
                        <BnLink
                            href="/"
                            className="inline-flex h-11 px-5 items-center rounded-xl text-[14px] font-black"
                            style={{ background: BN.gold, color: BN.onGold }}
                        >
                            {t("buy")}
                        </BnLink>
                    }
                />
            </Wrap>
        );
    }

    return (
        <Wrap>
            <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight mb-6">
                {t("title")} <span className="text-[15px] font-bold" style={{ color: BN.text3 }}>{initial.length} {t("countUnit")}</span>
            </h1>
            <BnPushCard />
            <div className="space-y-2.5">
                {initial.map(o => {
                    const meta = ORDER_STATUS_META[o.status];
                    return (
                        <BnLink
                            key={o.id}
                            href={`/buyurtmalarim/${o.code}`}
                            className="group flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.99]"
                            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                        >
                            <span
                                className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
                                style={{ background: BN.surfaceUp }}
                            >
                                {o.firstImage && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={o.firstImage} alt="" className="w-full h-full object-cover" />
                                )}
                            </span>

                            <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-2 mb-1">
                                    <span
                                        className="px-2 py-0.5 rounded-md text-[10px] font-black leading-none"
                                        style={{ background: `${meta.color}1F`, color: meta.color }}
                                    >
                                        {tStatus(o.status)}
                                    </span>
                                    <span className="text-[11px] tabular-nums" style={{ color: BN.text3 }}>#{o.code}</span>
                                </span>
                                <span className="block text-[14px] font-bold truncate transition-colors group-hover:text-[color:var(--bn-gold)]">
                                    {o.shopName}
                                </span>
                                <span className="flex items-center gap-2 text-[11.5px] mt-0.5" style={{ color: BN.text3 }}>
                                    <FulfillIcon type={o.fulfillType} />
                                    <span>{t("productsN", { n: o.itemCount })}</span>
                                    <span>·</span>
                                    <span>{formatDate(o.placedAt, locale)}</span>
                                </span>
                            </span>

                            <span className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="text-[14px] font-black tabular-nums">{fmtPrice(o.total)}</span>
                                <ChevronRight className="w-4 h-4" style={{ color: BN.text3 }} />
                            </span>
                        </BnLink>
                    );
                })}
            </div>
        </Wrap>
    );
}

// ── TAFSILOT ────────────────────────────────────────────────────────────────

export interface OrderDetailDTO {
    id: string;
    code: string;
    status: keyof typeof ORDER_STATUS_META;
    fulfillType: "PICKUP" | "DELIVERY" | "INSPECT";
    paymentMethod: "WALLET" | "CASH";
    paymentStatus: string;
    escrowHeld: boolean;
    subtotal: number;
    deliveryFee: number;
    commission: number;
    total: number;
    phone: string;
    address: string | null;
    note: string | null;
    cancelReason: string | null;
    placedAt: string;
    confirmedAt: string | null;
    readyAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    shop: {
        slug: string; name: string; phone: string | null;
        marketName: string | null; city: string;
    };
    items: {
        id: string; productId: string; title: string; price: number; qty: number;
        imageUrl: string | null; productSlug: string | null;
    }[];
    /** Foydalanuvchi shu do'kon uchun sharh yozganmi (rating modali uchun) */
    alreadyRated?: boolean;
}

export function BnOrderDetailClient({ order }: { order: OrderDetailDTO }) {
    const router = useRouter();
    const t = useTranslations("bn.orders");
    const tStatus = useTranslations("bn.orderStatus");
    const tCrumb = useTranslations("bn.breadcrumb");
    const locale = useLocale();
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const meta = ORDER_STATUS_META[order.status];
    const canCancel = order.status === "PLACED";

    // Live polling: har 8 soniyada status'ni tekshiramiz. Terminal holatlarda
    // (COMPLETED/CANCELLED) to'xtaymiz. Server statusi o'zgargan bo'lsa
    // router.refresh() to'liq RSC qayta yuklaydi (order timestamplari yangilanadi).
    useEffect(() => {
        if (order.status === "COMPLETED" || order.status === "CANCELLED") return;
        let stopped = false;
        const timer = setInterval(async () => {
            if (stopped) return;
            try {
                const r = await fetch(`/api/bn/orders/${order.id}/live`, { cache: "no-store" });
                if (!r.ok) return;
                const d = await r.json();
                if (d.status !== order.status) router.refresh();
            } catch { /* ignore */ }
        }, 8000);
        return () => { stopped = true; clearInterval(timer); };
    }, [order.id, order.status, router]);

    async function cancel() {
        if (!confirm(t("cancelConfirm") + (order.paymentMethod === "WALLET" ? t("cancelConfirmRefund") : ""))) return;
        setBusy(true); setErr(null);
        try {
            const r = await fetch(`/api/bn/orders/${order.id}/cancel`, { method: "POST" });
            const d = await r.json();
            if (!r.ok) setErr(d?.error ?? t("cancelErr"));
            else router.refresh();
        } catch { setErr(t("netErr")); }
        finally { setBusy(false); }
    }

    // Steppera holatlar
    const steps = [
        { key: "PLACED",    label: t("stepPlaced"),    at: order.placedAt },
        { key: "CONFIRMED", label: t("stepConfirmed"), at: order.confirmedAt },
        { key: "READY",     label: t("stepReady"),     at: order.readyAt },
        { key: "COMPLETED", label: t("stepCompleted"), at: order.completedAt },
    ];
    const order_ = ["PLACED", "CONFIRMED", "READY", "COMPLETED"] as const;
    const curIdx = order_.indexOf(order.status as typeof order_[number]);
    const isTerminal = order.status === "COMPLETED" || order.status === "CANCELLED";

    return (
        <Wrap>
            <BnBackButton className="mb-4" fallbackHref="/buyurtmalarim" />
            <nav className="flex items-center gap-1.5 text-[12px] mb-5" style={{ color: BN.text3 }}>
                <BnLink href="/" className="hover:opacity-70">{tCrumb("home")}</BnLink>
                <ChevronRight className="w-3 h-3" />
                <BnLink href="/buyurtmalarim" className="hover:opacity-70">{t("title")}</BnLink>
            </nav>

            <div className="flex items-baseline justify-between gap-3 mb-6 flex-wrap">
                <div className="min-w-0">
                    <h1 className="text-[24px] font-black tracking-tight leading-tight">{t("orderNo", { code: order.code })}</h1>
                    <p className="text-[12.5px] mt-1" style={{ color: BN.text3 }}>{formatDate(order.placedAt, locale)}</p>
                </div>
                <span
                    className="px-3 py-1.5 rounded-lg text-[12.5px] font-black leading-none inline-flex items-center gap-2"
                    style={{ background: `${meta.color}1F`, color: meta.color }}
                >
                    {!isTerminal && (
                        <span className="relative flex items-center justify-center w-2 h-2" title={t("live")}>
                            <span className="absolute inset-0 rounded-full animate-ping"
                                style={{ background: meta.color, opacity: 0.6 }} />
                            <span className="relative w-2 h-2 rounded-full"
                                style={{ background: meta.color }} />
                        </span>
                    )}
                    {tStatus(order.status)}
                </span>
            </div>

            {/* Stepper */}
            {order.status !== "CANCELLED" && (
                <div
                    className="p-5 rounded-2xl mb-4"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <div className="flex items-center justify-between">
                        {steps.map((s, i) => {
                            const done = i <= curIdx && !isTerminal ? i < curIdx : i <= curIdx;
                            const active = i === curIdx;
                            return (
                                <div key={s.key} className="flex flex-col items-center flex-1 min-w-0">
                                    <span
                                        className="relative w-8 h-8 rounded-full grid place-items-center text-[11px] font-black transition-all"
                                        style={{
                                            background: done ? BN.gold : active ? BN.goldSoft : BN.surfaceUp,
                                            color:      done ? BN.onGold : active ? BN.gold : BN.text3,
                                            border: active ? `2px solid ${BN.gold}` : "2px solid transparent",
                                            boxShadow: active ? `0 0 0 4px ${BN.gold}22` : undefined,
                                        }}
                                    >
                                        {active && !isTerminal && (
                                            <span className="absolute inset-0 rounded-full animate-ping" style={{ background: BN.gold, opacity: 0.35 }} />
                                        )}
                                        <span className="relative">{done ? <Check className="w-4 h-4" /> : i + 1}</span>
                                    </span>
                                    <span className="text-[10.5px] font-bold mt-1.5 text-center" style={{ color: done || active ? BN.text : BN.text3 }}>
                                        {s.label}
                                    </span>
                                    {s.at && (
                                        <span className="text-[9.5px] mt-0.5 tabular-nums" style={{ color: BN.text3 }}>
                                            {formatShort(s.at, locale)}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {order.status === "CANCELLED" && (
                <div
                    className="flex items-start gap-3 p-4 rounded-2xl mb-4"
                    style={{ background: BN.errSoft, border: `1px solid ${BN.err}33` }}
                >
                    <X className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: BN.err }} />
                    <div className="min-w-0">
                        <p className="text-[13px] font-black" style={{ color: BN.err }}>{t("cancelledTitle")}</p>
                        {order.cancelReason && (
                            <p className="text-[12.5px] mt-1" style={{ color: BN.text2 }}>{order.cancelReason}</p>
                        )}
                        {order.paymentMethod === "WALLET" && (
                            <p className="text-[12px] mt-1" style={{ color: BN.text3 }}>
                                {t("refundedNote")}
                            </p>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
                {/* Chap */}
                <div className="min-w-0 space-y-4">
                    {/* Do'kon */}
                    <Panel>
                        <div className="flex items-center gap-3">
                            <span
                                className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0"
                                style={{ background: BN.goldSoft, color: BN.gold }}
                            >
                                <Store className="w-5 h-5" />
                            </span>
                            <div className="flex-1 min-w-0">
                                <BnLink
                                    href={`/d/${order.shop.slug}`}
                                    className="block text-[14.5px] font-black truncate hover:text-[color:var(--bn-gold)]"
                                >
                                    {order.shop.name}
                                </BnLink>
                                <p className="text-[12px]" style={{ color: BN.text3 }}>
                                    {order.shop.marketName ?? order.shop.city}
                                </p>
                            </div>
                            {order.shop.phone && (
                                <a
                                    href={`tel:${order.shop.phone.replace(/\s/g, "")}`}
                                    className="w-10 h-10 grid place-items-center rounded-xl"
                                    style={{ background: BN.surfaceUp, color: BN.text }}
                                    aria-label={t("shopCall")}
                                >
                                    <Phone className="w-4 h-4" />
                                </a>
                            )}
                        </div>
                    </Panel>

                    {/* Mahsulotlar */}
                    <Panel>
                        <h2 className="text-[14px] font-black mb-3">{t("productsHead")}</h2>
                        <ul className="space-y-3">
                            {order.items.map(it => (
                                <li key={it.id} className="flex gap-3">
                                    <span
                                        className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
                                        style={{ background: BN.surfaceUp }}
                                    >
                                        {it.imageUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={it.imageUrl} alt="" className="w-full h-full object-cover" />
                                        )}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        {it.productSlug ? (
                                            <BnLink href={`/p/${it.productSlug}`} className="block text-[13px] font-bold line-clamp-2 hover:text-[color:var(--bn-gold)]">
                                                {it.title}
                                            </BnLink>
                                        ) : (
                                            <p className="text-[13px] font-bold line-clamp-2">{it.title}</p>
                                        )}
                                        <p className="text-[12px] mt-1" style={{ color: BN.text3 }}>
                                            {it.qty} × {fmtPrice(it.price)}
                                        </p>
                                    </div>
                                    <span className="text-[13px] font-black tabular-nums flex-shrink-0">
                                        {fmtPrice(it.price * it.qty)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </Panel>

                    {/* Yetkazish/olish */}
                    <Panel>
                        <h2 className="text-[14px] font-black mb-3">{t("fulfillHead")}</h2>
                        <div className="flex items-start gap-3">
                            <span
                                className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0"
                                style={{ background: BN.goldSoft, color: BN.gold }}
                            >
                                <FulfillIcon type={order.fulfillType} />
                            </span>
                            <div className="min-w-0 text-[13px]">
                                <p className="font-bold">{fulfillLabel(order.fulfillType, t)}</p>
                                {order.address && (
                                    <p className="flex items-start gap-1.5 mt-1" style={{ color: BN.text2 }}>
                                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: BN.gold }} />
                                        {order.address}
                                    </p>
                                )}
                                <p className="flex items-center gap-1.5 mt-1" style={{ color: BN.text2 }}>
                                    <Phone className="w-3.5 h-3.5" style={{ color: BN.gold }} />
                                    {order.phone}
                                </p>
                                {order.note && (
                                    <p className="mt-2 p-2 rounded-lg text-[12px]" style={{ background: BN.surfaceUp, color: BN.text2 }}>
                                        {order.note}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Panel>
                </div>

                {/* O'ng — yig'indi */}
                <aside className="lg:sticky lg:top-[132px] lg:self-start">
                    <Panel>
                        <h2 className="text-[14px] font-black mb-4">{t("summaryHead")}</h2>
                        <div className="space-y-2 text-[13px]">
                            <SumRow label={t("productsRow")} value={fmtPrice(order.subtotal)} />
                            {order.deliveryFee > 0 && <SumRow label={t("deliveryRow")} value={fmtPrice(order.deliveryFee)} />}
                            <div
                                className="flex items-baseline justify-between pt-3 mt-1"
                                style={{ borderTop: `1px solid ${BN.border}` }}
                            >
                                <span className="text-[14px] font-bold">{t("total")}</span>
                                <span className="text-[20px] font-black tabular-nums">{fmtPrice(order.total)}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4 text-[12px]" style={{ color: BN.text3 }}>
                            {order.paymentMethod === "WALLET"
                                ? <><Wallet className="w-3.5 h-3.5" style={{ color: BN.gold }} /> {t("payWallet")}</>
                                : <><Banknote className="w-3.5 h-3.5" style={{ color: BN.gold }} /> {t("payCash")}</>}
                            {order.escrowHeld && (
                                <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-black" style={{ background: BN.okSoft, color: BN.ok }}>
                                    {t("escrow")}
                                </span>
                            )}
                        </div>

                        {canCancel && (
                            <>
                                <button
                                    onClick={cancel}
                                    disabled={busy}
                                    className="flex items-center justify-center gap-2 w-full h-11 mt-5 rounded-xl text-[13.5px] font-black transition-colors disabled:opacity-60"
                                    style={{ background: BN.errSoft, color: BN.err, border: `1px solid ${BN.err}33` }}
                                >
                                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t("cancelBtn")}
                                </button>
                                {err && <p className="text-[11.5px] mt-2 text-center" style={{ color: BN.err }}>{err}</p>}
                            </>
                        )}

                        {(order.status === "COMPLETED" || order.status === "CANCELLED") && (
                            <button
                                onClick={async () => {
                                    setBusy(true);
                                    try {
                                        const r = await fetch(`/api/bn/orders/${order.id}/reorder`, { method: "POST" });
                                        const d = await r.json();
                                        if (r.ok) {
                                            const skippedText = d.skipped ? t("reorderSkipped", { n: d.skipped }) : "";
                                            alert(t("reorderMsg", { added: d.added, skipped: skippedText }));
                                            router.refresh();
                                        } else {
                                            alert(d?.error ?? t("reorderErr"));
                                        }
                                    } finally { setBusy(false); }
                                }}
                                disabled={busy}
                                className="flex items-center justify-center gap-2 w-full h-11 mt-5 rounded-xl text-[13.5px] font-black transition-colors disabled:opacity-60"
                                style={{ background: BN.gold, color: BN.onGold }}
                            >
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RotateCw className="w-4 h-4" /> {t("reorder")}</>}
                            </button>
                        )}

                        {/* Sotuvchini baholash (COMPLETED bo'lsa + hali sharh yozmagan bo'lsa) */}
                        {order.status === "COMPLETED" && !order.alreadyRated && (
                            <div className="mt-3">
                                <BnRatingModal
                                    orderId={order.id}
                                    shopName={order.shop.name}
                                    alreadyRated={false}
                                    autoOpen
                                />
                            </div>
                        )}
                    </Panel>
                </aside>
            </div>
        </Wrap>
    );
}

// ── Yordamchilar ────────────────────────────────────────────────────────────

function AuthGate() {
    const t = useTranslations("bn.orders");
    const tAuth = useTranslations("bn.auth");
    return (
        <Wrap>
            <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight mb-6">{t("title")}</h1>
            <div
                className="max-w-[440px] mx-auto p-7 rounded-3xl text-center"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
            >
                <span
                    className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5"
                    style={{ background: BN.goldSoft, color: BN.gold }}
                >
                    <Package className="w-7 h-7" />
                </span>
                <p className="text-[18px] font-black mb-2">{t("authSignInTitle")}</p>
                <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: BN.text2 }}>
                    {t("authSignInText")}
                </p>
                <button
                    onClick={() => signIn("google")}
                    className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[15px] font-black"
                    style={{ background: BN.gold, color: BN.onGold }}
                >
                    <LogIn className="w-5 h-5" />
                    {tAuth("signInWithHumoID")}
                </button>
            </div>
        </Wrap>
    );
}

function Wrap({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">{children}</div>;
}

function Panel({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="rounded-2xl p-4 sm:p-5"
            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
        >
            {children}
        </div>
    );
}

function SumRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between">
            <span style={{ color: BN.text3 }}>{label}</span>
            <span className="font-bold tabular-nums">{value}</span>
        </div>
    );
}

function FulfillIcon({ type }: { type: "PICKUP" | "DELIVERY" | "INSPECT" }) {
    if (type === "PICKUP")   return <Package className="w-3.5 h-3.5" style={{ color: BN.gold }} />;
    if (type === "DELIVERY") return <Truck className="w-3.5 h-3.5" style={{ color: BN.gold }} />;
    return <Eye className="w-3.5 h-3.5" style={{ color: BN.gold }} />;
}

function fulfillLabel(type: "PICKUP" | "DELIVERY" | "INSPECT", t: (k: string) => string): string {
    if (type === "PICKUP")   return t("fulfillPickup");
    if (type === "DELIVERY") return t("fulfillDelivery");
    return t("fulfillInspect");
}

function formatDate(iso: string, locale = "uz"): string {
    try {
        const d = new Date(iso);
        return d.toLocaleString(locale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
}

function formatShort(iso: string, locale = "uz"): string {
    try {
        const d = new Date(iso);
        return d.toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
}

// Clock unused olib tashlaymiz — tsc unused warning uchun
void Clock;
