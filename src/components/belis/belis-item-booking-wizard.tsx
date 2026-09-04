"use client";

// Alohida qutilar ijara wizardi.
// Komplekt wizardidan qisqartirilgan variant: items[] jo'natadi.
// Step 1: sana + qaytish davomiyligi
// Step 2: mijoz ma'lumoti + pasport + yetkazish
// Step 3: tasdiq
// Step 4: muvaffaqiyat

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "@/i18n/routing";
import {
    X, ChevronRight, ChevronLeft, User, Phone, MapPin, Upload,
    Loader2, CheckCircle2, Truck, LogIn, FileText,
} from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisDatePicker } from "./belis-date-picker";
import { BelisContractModal } from "./belis-contract-modal";

type Step = 1 | 2 | 3 | 4;
type Fulfill = "PICKUP" | "YANDEX_CUSTOMER" | "YANDEX_BELIS";

interface CartItem {
    slug: string;
    nameUz: string;
    qty: number;
    dailyRentUzs: number;
    deposit: number;
    images: string[];
}

interface Props {
    items: CartItem[];
    onClose: () => void;
    onClearCart: () => void;
}

function fmtSom(n: number): string { return `${n.toLocaleString("uz-UZ")} so'm`; }
function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "long", year: "numeric" });
}
function todayISO(): string {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate() + 1).padStart(2, "0")}`;
}
function maxDateISO(): string {
    const t = new Date();
    t.setMonth(t.getMonth() + 6);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

export function BelisItemBookingWizard({ items, onClose, onClearCart }: Props) {
    const { status } = useSession();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState<Step>(1);

    const [eventDate, setEventDate] = useState<string>(todayISO());
    const [returnDaysAfter, setReturnDaysAfter] = useState<1 | 2>(1);

    const [buyerName, setBuyerName] = useState("");
    const [buyerPhone, setBuyerPhone] = useState("+998");
    const [fulfill, setFulfill] = useState<Fulfill>("PICKUP");
    const [address, setAddress] = useState("");
    const [passportSeries, setPassportSeries] = useState("");
    const [passportUrl, setPassportUrl] = useState<string | null>(null);
    const [passportUploading, setPassportUploading] = useState(false);
    const [note, setNote] = useState("");
    const [acceptTerms, setAcceptTerms] = useState(false);
    // For Pay to'lov usuli
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "WALLET">("CASH");
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [walletCurrency, setWalletCurrency] = useState<"UZS" | "USD">("UZS");

    useEffect(() => {
        if (status !== "authenticated") return;
        fetch("/api/pay/wallet", { cache: "no-store" })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (!d) return;
                setWalletBalance(Number(d.balance ?? 0));
                setWalletCurrency(d.currency === "USD" ? "USD" : "UZS");
            })
            .catch(() => {});
    }, [status]);

    const [submitting, setSubmitting] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [successCode, setSuccessCode] = useState<string | null>(null);
    const [contractOpen, setContractOpen] = useState(false);

    const passportRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setMounted(true); }, []);

    // Autofill from Belis /me
    useEffect(() => {
        if (status !== "authenticated") return;
        fetch("/api/belis/me", { cache: "no-store" })
            .then(r => r.json())
            .then(d => {
                if (d?.name) setBuyerName(prev => prev || d.name);
                if (d?.phone) setBuyerPhone(prev => (prev === "+998" ? d.phone : prev));
            })
            .catch(() => {});
    }, [status]);

    // Umumiy narx hisoblash (client-side preview)
    const daysCount = returnDaysAfter === 1 ? 2 : 3;
    const sumDaily = items.reduce((s, it) => s + it.dailyRentUzs * it.qty, 0);
    const sumDeposit = items.reduce((s, it) => s + it.deposit * it.qty, 0);
    const rentTotal = sumDaily * daysCount;
    const grand = rentTotal + sumDeposit;

    async function uploadPassport(file: File) {
        setPassportUploading(true);
        setErr(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await fetch("/api/belis/upload/passport", { method: "POST", body: fd });
            const d = await r.json();
            if (!r.ok) throw new Error(d?.error || "upload_failed");
            setPassportUrl(d.url);
        } catch (e) {
            setErr(e instanceof Error ? e.message : "upload_failed");
        } finally {
            setPassportUploading(false);
        }
    }

    async function submit() {
        setSubmitting(true);
        setErr(null);
        try {
            const r = await fetch("/api/belis/bookings", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    items: items.map(it => ({ slug: it.slug, qty: it.qty })),
                    eventDate,
                    buyerName: buyerName.trim(),
                    buyerPhone: buyerPhone.trim(),
                    passportUrl,
                    passportSeries: passportSeries.trim() || undefined,
                    fulfillType: fulfill,
                    address: (fulfill === "YANDEX_CUSTOMER" || fulfill === "YANDEX_BELIS") ? address.trim() : undefined,
                    note: note.trim() || undefined,
                    returnDaysAfter,
                    paymentMethod,
                }),
            });
            const d = await r.json();
            if (!r.ok) {
                const msg = d?.error === "item_not_available" ? `Ba'zi qutilar band (${d.itemSlug}, faqat ${d.available} ta bo'sh)`
                    : d?.error === "some_items_not_found" ? "Ba'zi qutilar topilmadi"
                    : d?.error === "phone_invalid" ? "Telefon noto'g'ri"
                    : d?.error === "name_too_short" ? "Ism qisqa"
                    : d?.error === "passport_required" ? "Pasport nusxasi majburiy"
                    : d?.error === "address_required_for_yandex" ? "Manzil kiriting"
                    : d?.error ?? "Xatolik";
                setErr(msg);
                return;
            }
            setSuccessCode(d.booking?.code ?? null);
            setStep(4);
            onClearCart();
        } catch {
            setErr("Tarmoq xatosi");
        } finally {
            setSubmitting(false);
        }
    }

    const canGo2 = eventDate.length > 0;
    const canGo3 = buyerName.trim().length >= 2
        && buyerPhone.trim().length >= 12
        && (fulfill === "PICKUP" || address.trim().length >= 5)
        && !!passportUrl;
    const canSubmit = acceptTerms && canGo3;

    if (!mounted) return null;

    if (status === "unauthenticated") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
                <div className="w-full max-w-sm rounded-3xl p-6 text-center"
                    style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}
                    onClick={e => e.stopPropagation()}>
                    <span className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                        <LogIn className="w-7 h-7" />
                    </span>
                    <p className="text-[16px] font-black mb-3" style={{ color: BELIS.text }}>
                        Ijara berish uchun kiring
                    </p>
                    <button onClick={() => signIn("google")}
                        className="w-full h-12 rounded-xl text-[14px] font-black flex items-center justify-center gap-2"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                        <LogIn className="w-4 h-4" /> Google bilan kirish
                    </button>
                </div>
            </div>,
            document.body,
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={onClose}>
            <div className="w-full sm:max-w-lg h-[92vh] sm:h-auto sm:max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
                style={{ background: BELIS.bg, border: `1px solid ${BELIS.border}` }}
                onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between p-4 flex-shrink-0"
                    style={{ background: BELIS.surface, borderBottom: `1px solid ${BELIS.borderSoft}` }}>
                    <div className="flex items-center gap-2">
                        <span className="w-9 h-9 rounded-xl grid place-items-center"
                            style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                            <FileText className="w-4 h-4" />
                        </span>
                        <div>
                            <p className="text-[14px] font-black" style={{ color: BELIS.text }}>Alohida qutilar ijarasi</p>
                            <p className="text-[11px]" style={{ color: BELIS.text3 }}>{items.length} tur · {items.reduce((s, i) => s + i.qty, 0)} dona · {step}/3</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1" style={{ color: BELIS.text3 }}><X className="w-5 h-5" /></button>
                </div>

                {step <= 3 && (
                    <div className="h-1 flex-shrink-0" style={{ background: BELIS.borderSoft }}>
                        <div className="h-full transition-all"
                            style={{ width: `${(step / 3) * 100}%`, background: BELIS_GOLD_GRADIENT }} />
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-5">
                    {step === 1 && (
                        <div>
                            <h3 className="text-[15px] font-black mb-3" style={{ color: BELIS.text }}>Marosim sanasi</h3>
                            <BelisDatePicker
                                value={eventDate}
                                onChange={setEventDate}
                                min={todayISO()}
                                max={maxDateISO()}
                                placeholder="Sanani tanlang"
                            />

                            <div className="mt-4">
                                <label className="text-[12.5px] font-black mb-1.5 block" style={{ color: BELIS.text }}>Qaytarish kuni</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { key: 1 as const, label: "Marosim ertasi", hint: "2 kun ijara" },
                                        { key: 2 as const, label: "2 kun keyin",   hint: "3 kun ijara" },
                                    ].map(o => {
                                        const active = returnDaysAfter === o.key;
                                        return (
                                            <button key={o.key} onClick={() => setReturnDaysAfter(o.key)}
                                                className="p-3 rounded-xl text-left"
                                                style={{ background: active ? BELIS.goldSoft : BELIS.bg,
                                                    border: `1px solid ${active ? BELIS.gold : BELIS.border}`, color: BELIS.text }}>
                                                <p className="text-[12.5px] font-black">{o.label}</p>
                                                <p className="text-[11px] mt-0.5" style={{ color: BELIS.text2 }}>{o.hint}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Savat oldindan ko'rish */}
                            <div className="mt-5 rounded-xl p-3" style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                                <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: BELIS.text3 }}>
                                    Tanlangan qutilar
                                </p>
                                <div className="space-y-1.5">
                                    {items.map(it => (
                                        <div key={it.slug} className="flex items-center justify-between text-[12.5px]">
                                            <span style={{ color: BELIS.text }}>{it.nameUz} · <b>{it.qty} dona</b></span>
                                            <span className="tabular-nums" style={{ color: BELIS.text2 }}>{fmtSom(it.dailyRentUzs * it.qty)}/kun</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-3 space-y-1 text-[12.5px]" style={{ borderTop: `1px dashed ${BELIS.border}`, color: BELIS.text2 }}>
                                    <div className="flex justify-between">
                                        <span>Ijara ({daysCount} kun):</span>
                                        <span className="font-black" style={{ color: BELIS.text }}>{fmtSom(rentTotal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Zaklat:</span>
                                        <span className="font-black" style={{ color: BELIS.text }}>{fmtSom(sumDeposit)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 mt-1 border-t border-dashed" style={{ borderColor: BELIS.border }}>
                                        <span className="font-black">JAMI:</span>
                                        <span className="font-black" style={{ color: BELIS.goldDeep }}>{fmtSom(grand)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="text-[15px] font-black" style={{ color: BELIS.text }}>Mijoz ma&apos;lumoti</h3>
                            <Field label="Ism familiya" icon={<User className="w-4 h-4" />}>
                                <input value={buyerName} onChange={e => setBuyerName(e.target.value.slice(0, 120))}
                                    placeholder="Ism Familiya" className="belis-input" />
                            </Field>
                            <Field label="Telefon" icon={<Phone className="w-4 h-4" />}>
                                <input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value.slice(0, 20))}
                                    placeholder="+998 90 123 45 67" type="tel" className="belis-input" />
                            </Field>

                            <div>
                                <label className="text-[12.5px] font-black mb-1.5 block" style={{ color: BELIS.text }}>Yetkazish usuli</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { key: "PICKUP" as const, label: "Do'konga o'zim boraman", hint: "Belisdan olib ketaman" },
                                        { key: "YANDEX_CUSTOMER" as const, label: "Yandex chaqiraman", hint: "Kuryer to'lovini o'zim to'layman" },
                                        { key: "YANDEX_BELIS" as const, label: "Belis chaqirsin", hint: "Kuryer to'lovi qutiga qo'shiladi" },
                                    ].map(o => {
                                        const active = fulfill === o.key;
                                        return (
                                            <button key={o.key} onClick={() => setFulfill(o.key)}
                                                className="p-3 rounded-xl text-left"
                                                style={{ background: active ? BELIS.goldSoft : BELIS.bg,
                                                    border: `1px solid ${active ? BELIS.gold : BELIS.border}`, color: BELIS.text }}>
                                                <div className="flex items-center gap-1.5">
                                                    <Truck className="w-4 h-4" />
                                                    <span className="text-[13px] font-black">{o.label}</span>
                                                </div>
                                                <p className="text-[11px] mt-1 ml-6" style={{ color: BELIS.text2 }}>{o.hint}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {(fulfill === "YANDEX_CUSTOMER" || fulfill === "YANDEX_BELIS") && (
                                <Field label="Manzil (yetkazish)" icon={<MapPin className="w-4 h-4" />}>
                                    <input value={address} onChange={e => setAddress(e.target.value.slice(0, 300))}
                                        placeholder="Toshkent, ..." className="belis-input" />
                                </Field>
                            )}

                            <div>
                                <label className="text-[12.5px] font-black mb-1.5 block" style={{ color: BELIS.text }}>
                                    Pasport nusxasi <span style={{ color: BELIS.err }}>*</span>
                                </label>
                                <p className="text-[11px] mb-2" style={{ color: BELIS.text2 }}>
                                    Rasm sifatida yuklang. Asl pasport ushlab qolinmaydi (qonuniy taqiq).
                                </p>
                                {passportUrl ? (
                                    <div className="flex items-center gap-2 p-2 rounded-xl"
                                        style={{ background: BELIS.okSoft, border: `1px solid ${BELIS.ok}` }}>
                                        <CheckCircle2 className="w-5 h-5" style={{ color: BELIS.ok }} />
                                        <span className="text-[12.5px]" style={{ color: BELIS.ok }}>Pasport yuklangan</span>
                                        <button onClick={() => setPassportUrl(null)} className="ml-auto text-[11px]" style={{ color: BELIS.text3 }}>
                                            O&apos;chirish
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => passportRef.current?.click()}
                                        disabled={passportUploading}
                                        className="w-full h-12 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 disabled:opacity-60"
                                        style={{ borderColor: BELIS.border, background: BELIS.bg, color: BELIS.text2 }}>
                                        {passportUploading
                                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Yuklanmoqda…</>
                                            : <><Upload className="w-4 h-4" /> Rasm tanlang</>}
                                    </button>
                                )}
                                <input ref={passportRef} type="file" accept="image/*" hidden
                                    onChange={e => e.target.files?.[0] && uploadPassport(e.target.files[0])} />
                            </div>

                            <Field label="Pasport seriyasi (ixtiyoriy)" icon={<FileText className="w-4 h-4" />}>
                                <input value={passportSeries} onChange={e => setPassportSeries(e.target.value.slice(0, 20).toUpperCase())}
                                    placeholder="AA1234567" className="belis-input" />
                            </Field>

                            <Field label="Izoh (ixtiyoriy)">
                                <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 500))}
                                    placeholder="Marosim vaqti, qo'shimcha talab..." rows={2} className="belis-input" />
                            </Field>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-3">
                            <h3 className="text-[15px] font-black" style={{ color: BELIS.text }}>Tasdiqlash</h3>

                            <div className="rounded-xl p-4 space-y-2" style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                                <Row label="Marosim" value={fmtDate(eventDate)} />
                                <Row label="Kunlar" value={`${daysCount} kun`} />
                                <Row label="Mijoz" value={`${buyerName} · ${buyerPhone}`} />
                                <Row label="Usul" value={
                                    fulfill === "PICKUP" ? "Do'konga o'zim"
                                    : fulfill === "YANDEX_CUSTOMER" ? `Yandex (mijoz to'laydi) — ${address}`
                                    : `Yandex (Belis chaqiradi) — ${address}`
                                } />
                                <div className="pt-2 mt-2 space-y-1" style={{ borderTop: `1px dashed ${BELIS.border}` }}>
                                    {items.map(it => (
                                        <Row key={it.slug} label={it.nameUz} value={`${it.qty} dona · ${fmtSom(it.dailyRentUzs * it.qty * daysCount)}`} />
                                    ))}
                                </div>
                                <div className="pt-2 mt-2 space-y-1" style={{ borderTop: `1px dashed ${BELIS.border}` }}>
                                    <Row label="Ijara jami" value={fmtSom(rentTotal)} />
                                    <Row label="Zaklat" value={fmtSom(sumDeposit)} />
                                    <div className="flex justify-between text-[15px] font-black pt-1">
                                        <span style={{ color: BELIS.text }}>JAMI:</span>
                                        <span style={{ color: BELIS.goldDeep }}>{fmtSom(grand)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* To'lov usuli */}
                            <div className="mt-3">
                                <label className="text-[12.5px] font-black mb-1.5 block" style={{ color: BELIS.text }}>To&apos;lov usuli</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setPaymentMethod("CASH")}
                                        className="p-2.5 rounded-xl text-left text-[12px] font-black"
                                        style={{
                                            background: paymentMethod === "CASH" ? BELIS.goldSoft : BELIS.bg,
                                            border: `1px solid ${paymentMethod === "CASH" ? BELIS.gold : BELIS.border}`,
                                            color: BELIS.text,
                                        }}>
                                        Do&apos;konda naqd
                                    </button>
                                    {(() => {
                                        const balance = walletBalance ?? 0;
                                        const hasEnough = balance >= grand;
                                        return (
                                            <button type="button"
                                                onClick={() => hasEnough && setPaymentMethod("WALLET")}
                                                disabled={!hasEnough}
                                                className="p-2.5 rounded-xl text-left text-[12px] font-black disabled:opacity-60"
                                                style={{
                                                    background: paymentMethod === "WALLET" ? BELIS.goldSoft : BELIS.bg,
                                                    border: `1px solid ${paymentMethod === "WALLET" ? BELIS.gold : BELIS.border}`,
                                                    color: BELIS.text,
                                                }}>
                                                For Pay hamyondan
                                                <div className="text-[10px] font-normal mt-0.5" style={{ color: hasEnough ? BELIS.text2 : BELIS.err }}>
                                                    {walletBalance !== null
                                                        ? `${balance.toLocaleString("uz-UZ")} ${walletCurrency === "USD" ? "$" : "so'm"}`
                                                        : "Yuklanmoqda…"}
                                                </div>
                                            </button>
                                        );
                                    })()}
                                </div>
                            </div>

                            <label className="flex items-start gap-2 cursor-pointer">
                                <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)}
                                    className="mt-1" />
                                <span className="text-[12px] leading-relaxed" style={{ color: BELIS.text2 }}>
                                    Zaklat, pasport nusxasi va{" "}
                                    <button type="button" onClick={() => setContractOpen(true)}
                                        className="underline font-black" style={{ color: BELIS.goldDeep }}>
                                        ijara qoidalari
                                    </button>
                                    ga roziman. Qutilarni butun holida qaytaraman.
                                </span>
                            </label>

                            {err && <p className="text-[12px]" style={{ color: BELIS.err }}>{err}</p>}
                        </div>
                    )}

                    {step === 4 && successCode && (
                        <div className="text-center py-8">
                            <span className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-3"
                                style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                                <CheckCircle2 className="w-8 h-8" />
                            </span>
                            <p className="text-[18px] font-black" style={{ color: BELIS.text }}>Ariza qabul qilindi!</p>
                            <p className="text-[13px] mt-2" style={{ color: BELIS.text2 }}>
                                Kod: <b style={{ color: BELIS.goldDeep }}>#{successCode}</b>
                            </p>
                            <p className="text-[12px] mt-1" style={{ color: BELIS.text3 }}>
                                Sevinch tez orada tasdiqlash uchun bog&apos;lanadi.
                            </p>
                            <button onClick={() => { onClose(); router.push("/belis/kabinet"); }}
                                className="mt-5 h-11 px-6 rounded-xl text-[13px] font-black"
                                style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                                Arizalarim
                            </button>
                        </div>
                    )}
                </div>

                {step < 4 && (
                    <div className="flex items-center gap-2 p-4 flex-shrink-0"
                        style={{ borderTop: `1px solid ${BELIS.borderSoft}`, background: BELIS.surface }}>
                        {step > 1 && (
                            <button onClick={() => setStep((step - 1) as Step)}
                                className="h-11 px-4 rounded-xl text-[12.5px] font-black flex items-center gap-1"
                                style={{ background: BELIS.bg, color: BELIS.text, border: `1px solid ${BELIS.border}` }}>
                                <ChevronLeft className="w-4 h-4" /> Ortga
                            </button>
                        )}
                        {step < 3 ? (
                            <button onClick={() => setStep((step + 1) as Step)}
                                disabled={(step === 1 && !canGo2) || (step === 2 && !canGo3)}
                                className="flex-1 h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-1 disabled:opacity-50"
                                style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                                Davom etish <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button onClick={submit} disabled={!canSubmit || submitting}
                                className="flex-1 h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-1 disabled:opacity-50"
                                style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Yuborilyapti…</> : "Arizani yuborish"}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {contractOpen && <BelisContractModal onClose={() => setContractOpen(false)} />}

            <style jsx global>{`
                .belis-input {
                    width: 100%; height: 46px; border-radius: 12px; padding: 0 14px;
                    font-size: 14px; outline: none;
                    background: ${BELIS.bg}; border: 1px solid ${BELIS.border};
                    color: ${BELIS.text}; caret-color: ${BELIS.gold};
                    transition: border-color .15s;
                }
                .belis-input:focus { border-color: ${BELIS.gold}; }
                .belis-input::placeholder { color: ${BELIS.text3}; }
                textarea.belis-input { padding: 12px 14px; resize: none; height: auto; }
            `}</style>
        </div>,
        document.body,
    );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-[12.5px] font-black mb-1.5 block flex items-center gap-1" style={{ color: BELIS.text }}>
                {icon} {label}
            </label>
            {children}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-[12.5px]">
            <span style={{ color: BELIS.text3 }}>{label}</span>
            <span className="font-black" style={{ color: BELIS.text }}>{value}</span>
        </div>
    );
}

