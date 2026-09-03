"use client";

// Belis 3-qadamli booking wizard.
// Step 1: Marosim sanasi tanlash + availability check
// Step 2: Mijoz ma'lumoti + pasport rasm
// Step 3: Tasdiq + jo'natish

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "@/i18n/routing";
import {
    X, ChevronRight, ChevronLeft, Calendar, User, Phone, MapPin, Upload,
    Loader2, CheckCircle2, AlertTriangle, Info, CreditCard, Truck, LogIn, FileText,
} from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisContractModal } from "./belis-contract-modal";

type Step = 1 | 2 | 3 | 4;
type Fulfill = "PICKUP" | "YANDEX_CUSTOMER";

interface Availability {
    available: boolean;
    totalCopies: number;
    bookedCount: number;
    schedule: { eventDate: string; pickupDate: string; returnDate: string; daysCount: number };
    totals: { rentDailyUzs: number; daysCount: number; rentTotalUzs: number; depositUzs: number; grandTotalUzs: number };
}

interface Props {
    komplektSlug: string;
    komplektName: string;
    onClose: () => void;
}

function fmtSom(n: number): string {
    return `${n.toLocaleString("uz-UZ")} so'm`;
}
function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "long", year: "numeric" });
}
function todayISO(): string {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate() + 1).padStart(2, "0")}`;
}

export function BelisBookingWizard({ komplektSlug, komplektName, onClose }: Props) {
    const { status } = useSession();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState<Step>(1);

    // Step 1: sana
    const [eventDate, setEventDate] = useState<string>(todayISO());
    const [availLoading, setAvailLoading] = useState(false);
    const [avail, setAvail] = useState<Availability | null>(null);

    // Step 2: mijoz
    const [buyerName, setBuyerName] = useState("");
    const [buyerPhone, setBuyerPhone] = useState("+998");
    const [fulfill, setFulfill] = useState<Fulfill>("PICKUP");
    const [address, setAddress] = useState("");
    const [passportSeries, setPassportSeries] = useState("");
    const [passportUrl, setPassportUrl] = useState<string | null>(null);
    const [passportUploading, setPassportUploading] = useState(false);
    const [note, setNote] = useState("");
    const [acceptTerms, setAcceptTerms] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [successCode, setSuccessCode] = useState<string | null>(null);
    const [contractOpen, setContractOpen] = useState(false);

    const passportRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setMounted(true); }, []);

    // Availability check har sana o'zgarishida
    useEffect(() => {
        if (!eventDate) return;
        setAvailLoading(true);
        setAvail(null);
        fetch(`/api/belis/komplektlar/${komplektSlug}/availability?eventDate=${eventDate}`)
            .then(r => r.json())
            .then((d: Availability | { error?: string }) => {
                if ("available" in d) setAvail(d as Availability);
            })
            .catch(() => setAvail(null))
            .finally(() => setAvailLoading(false));
    }, [eventDate, komplektSlug]);

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
                    komplektSlug,
                    eventDate,
                    buyerName: buyerName.trim(),
                    buyerPhone: buyerPhone.trim(),
                    passportUrl,
                    passportSeries: passportSeries.trim() || undefined,
                    fulfillType: fulfill,
                    address: fulfill === "YANDEX_CUSTOMER" ? address.trim() : undefined,
                    note: note.trim() || undefined,
                }),
            });
            const d = await r.json();
            if (!r.ok) {
                const msg = d?.error === "not_available" ? "Tanlangan sanada band"
                    : d?.error === "phone_invalid" ? "Telefon noto'g'ri"
                    : d?.error === "name_too_short" ? "Ism qisqa (kamida 2 belgi)"
                    : d?.error === "address_required_for_yandex" ? "Manzil kiriting"
                    : d?.error === "past_date" ? "O'tgan sana tanlanmagan"
                    : d?.error ?? "Xatolik";
                setErr(msg);
                return;
            }
            setSuccessCode(d.booking?.code ?? null);
            setStep(4);
        } catch {
            setErr("Tarmoq xatosi");
        } finally {
            setSubmitting(false);
        }
    }

    const canGo2 = !!avail?.available && !availLoading;
    const canGo3 = buyerName.trim().length >= 2
        && buyerPhone.trim().length >= 12
        && (fulfill === "PICKUP" || address.trim().length >= 5);
    const canSubmit = acceptTerms && canGo3 && canGo2;

    if (!mounted) return null;

    // Anonim → login CTA
    if (status === "unauthenticated") {
        const content = (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
                <div
                    className="w-full max-w-sm rounded-3xl p-6 text-center"
                    style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}
                    onClick={e => e.stopPropagation()}
                >
                    <span className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4"
                        style={{ background: BELIS.goldSoft, color: BELIS.goldDeep }}>
                        <LogIn className="w-7 h-7" />
                    </span>
                    <p className="text-[16px] font-black mb-1" style={{ color: BELIS.text }}>Kirish talab qilinadi</p>
                    <p className="text-[13px] mb-5" style={{ color: BELIS.text2 }}>
                        Ijara arizasi berish uchun Google orqali kirasiz.
                    </p>
                    <button
                        onClick={() => signIn("google")}
                        className="w-full h-12 rounded-xl text-[14px] font-black flex items-center justify-center gap-2"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}
                    >
                        <LogIn className="w-4 h-4" /> Google bilan kirish
                    </button>
                    <button onClick={onClose} className="mt-2 text-[12.5px]" style={{ color: BELIS.text3 }}>Bekor</button>
                </div>
            </div>
        );
        return createPortal(content, document.body);
    }

    const content = (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={onClose}>
            <div
                className="w-full sm:max-w-lg max-h-[95vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-4" style={{ borderBottom: `1px solid ${BELIS.border}`, background: BELIS.surface }}>
                    <span className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                        <Calendar className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[14.5px] font-black" style={{ color: BELIS.text }}>Ijara arizasi</p>
                        <p className="text-[11.5px]" style={{ color: BELIS.text2 }}>
                            {komplektName} · {step <= 3 ? `${step}/3` : "Tayyor"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1" style={{ color: BELIS.text3 }}><X className="w-5 h-5" /></button>
                </div>

                {/* Progress */}
                {step <= 3 && (
                    <div className="h-1" style={{ background: BELIS.borderSoft }}>
                        <div className="h-full transition-all"
                            style={{ width: `${(step / 3) * 100}%`, background: BELIS_GOLD_GRADIENT }} />
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {step === 1 && (
                        <div>
                            <h3 className="text-[15px] font-black mb-3" style={{ color: BELIS.text }}>Marosim sanasi</h3>
                            <p className="text-[12.5px] mb-3" style={{ color: BELIS.text2 }}>
                                Qaysi kuni marosim bo&apos;ladi? Sarpo bir kun oldin olib ketiladi va 3 kun ichida qaytariladi.
                            </p>
                            <input
                                type="date"
                                value={eventDate}
                                onChange={e => setEventDate(e.target.value)}
                                min={todayISO()}
                                className="w-full h-12 rounded-xl px-4 text-[15px] font-bold focus:outline-none"
                                style={{ background: BELIS.bg, color: BELIS.text, border: `1px solid ${BELIS.border}` }}
                            />

                            {availLoading && (
                                <div className="mt-4 p-4 rounded-xl flex items-center gap-2 justify-center"
                                    style={{ background: BELIS.bg }}>
                                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: BELIS.gold }} />
                                    <span className="text-[13px]" style={{ color: BELIS.text2 }}>Mavjudlik tekshirilyapti…</span>
                                </div>
                            )}

                            {!availLoading && avail && (
                                <div className="mt-4 rounded-xl overflow-hidden"
                                    style={{ background: avail.available ? BELIS.okSoft : BELIS.errSoft, border: `1px solid ${avail.available ? BELIS.ok : BELIS.err}` }}>
                                    <div className="p-3 flex items-center gap-2">
                                        {avail.available ? <CheckCircle2 className="w-4 h-4" style={{ color: BELIS.ok }} /> : <AlertTriangle className="w-4 h-4" style={{ color: BELIS.err }} />}
                                        <span className="text-[13px] font-black" style={{ color: avail.available ? BELIS.ok : BELIS.err }}>
                                            {avail.available
                                                ? `Mavjud (${avail.totalCopies - avail.bookedCount}/${avail.totalCopies} nusxa bo'sh)`
                                                : `Band (${avail.bookedCount}/${avail.totalCopies} band)`}
                                        </span>
                                    </div>
                                    {avail.available && (
                                        <div className="p-3 space-y-1 text-[12.5px]" style={{ background: BELIS.surface, color: BELIS.text2 }}>
                                            <div className="flex justify-between"><span>Olib ketish:</span><span className="font-bold">{fmtDate(avail.schedule.pickupDate)}</span></div>
                                            <div className="flex justify-between"><span>Marosim:</span><span className="font-bold">{fmtDate(avail.schedule.eventDate)}</span></div>
                                            <div className="flex justify-between"><span>Qaytarish (oxirgi):</span><span className="font-bold">{fmtDate(avail.schedule.returnDate)}</span></div>
                                            <div className="pt-2 mt-2 flex justify-between" style={{ borderTop: `1px dashed ${BELIS.border}` }}>
                                                <span>Ijara ({avail.totals.daysCount} kun):</span><span className="font-black">{fmtSom(avail.totals.rentTotalUzs)}</span>
                                            </div>
                                            <div className="flex justify-between"><span>Zaklat:</span><span className="font-black">{fmtSom(avail.totals.depositUzs)}</span></div>
                                            <div className="pt-1 mt-1 flex justify-between text-[14px]" style={{ borderTop: `1px solid ${BELIS.border}`, color: BELIS.text }}>
                                                <span className="font-black">Jami to&apos;lov:</span>
                                                <span className="font-black" style={{ color: BELIS.goldDeep }}>{fmtSom(avail.totals.grandTotalUzs)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="text-[15px] font-black" style={{ color: BELIS.text }}>Sizning ma&apos;lumotingiz</h3>

                            <Field label="Ism va familiya" icon={<User className="w-4 h-4" />}>
                                <input value={buyerName} onChange={e => setBuyerName(e.target.value.slice(0, 120))}
                                    placeholder="Sardor Ergashev"
                                    className="belis-input" />
                            </Field>

                            <Field label="Telefon" icon={<Phone className="w-4 h-4" />}>
                                <input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value.slice(0, 20))}
                                    placeholder="+998 90 123 45 67" type="tel"
                                    className="belis-input" />
                            </Field>

                            <div>
                                <label className="text-[12.5px] font-black mb-1.5 block" style={{ color: BELIS.text }}>Yetkazish usuli</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { key: "PICKUP" as const, icon: <MapPin className="w-4 h-4" />, label: "Do'konga o'zim boraman" },
                                        { key: "YANDEX_CUSTOMER" as const, icon: <Truck className="w-4 h-4" />, label: "Yandex chaqiraman" },
                                    ].map(o => {
                                        const active = fulfill === o.key;
                                        return (
                                            <button key={o.key} onClick={() => setFulfill(o.key)}
                                                className="p-3 rounded-xl text-left transition-colors"
                                                style={{
                                                    background: active ? BELIS.goldSoft : BELIS.bg,
                                                    border: `1px solid ${active ? BELIS.gold : BELIS.border}`,
                                                    color: BELIS.text,
                                                }}>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    {o.icon}
                                                    <span className="text-[12px] font-black">{o.label}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {fulfill === "YANDEX_CUSTOMER" && (
                                    <p className="text-[11.5px] mt-1.5" style={{ color: BELIS.text2 }}>
                                        <Info className="w-3 h-3 inline" /> Yandex to&apos;lovini kuryerga o&apos;zingiz to&apos;laysiz.
                                    </p>
                                )}
                            </div>

                            {fulfill === "YANDEX_CUSTOMER" && (
                                <Field label="Manzil (yetkazish)" icon={<MapPin className="w-4 h-4" />}>
                                    <input value={address} onChange={e => setAddress(e.target.value.slice(0, 300))}
                                        placeholder="Toshkent, Yakkasaroy tumani, Bobur ko'chasi 42"
                                        className="belis-input" />
                                </Field>
                            )}

                            <div>
                                <label className="text-[12.5px] font-black mb-1.5 block" style={{ color: BELIS.text }}>
                                    Pasport nusxasi <span className="opacity-60">(ixtiyoriy hozircha, do&apos;konda kerak)</span>
                                </label>
                                <input ref={passportRef} type="file" accept="image/*" className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadPassport(f); }} />
                                {passportUrl ? (
                                    <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: BELIS.okSoft, border: `1px solid ${BELIS.ok}` }}>
                                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: BELIS.ok }} />
                                        <span className="flex-1 text-[12px]" style={{ color: BELIS.text }}>Yuklandi (ko&apos;rish faqat sizga va adminga)</span>
                                        <button onClick={() => setPassportUrl(null)} className="text-[11px] font-bold" style={{ color: BELIS.err }}>O&apos;chirish</button>
                                    </div>
                                ) : (
                                    <button onClick={() => passportRef.current?.click()} disabled={passportUploading}
                                        className="w-full h-11 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-[12.5px] font-bold disabled:opacity-60"
                                        style={{ borderColor: BELIS.border, color: BELIS.text2, background: BELIS.bg }}>
                                        {passportUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4" /> Pasport rasmini yuklash</>}
                                    </button>
                                )}
                            </div>

                            <Field label="Pasport seriya + raqam (ixtiyoriy)">
                                <input value={passportSeries} onChange={e => setPassportSeries(e.target.value.toUpperCase().slice(0, 20))}
                                    placeholder="AB1234567" className="belis-input" />
                            </Field>

                            <Field label="Qo'shimcha izoh (ixtiyoriy)">
                                <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 500))}
                                    rows={2} placeholder="Masalan: ertaroq olib ketishim mumkinmi?"
                                    className="belis-input" style={{ height: "auto" }} />
                            </Field>
                        </div>
                    )}

                    {step === 3 && avail && (
                        <div>
                            <h3 className="text-[15px] font-black mb-3" style={{ color: BELIS.text }}>Yuborishdan oldin tekshiring</h3>
                            <div className="rounded-xl p-4 space-y-2 text-[13px]" style={{ background: BELIS.bg }}>
                                <Row label="Komplekt" value={komplektName} />
                                <Row label="Marosim" value={fmtDate(avail.schedule.eventDate)} />
                                <Row label="Olib ketish" value={fmtDate(avail.schedule.pickupDate)} />
                                <Row label="Qaytarish (oxirgi)" value={fmtDate(avail.schedule.returnDate)} />
                                <Row label="Ism" value={buyerName} />
                                <Row label="Telefon" value={buyerPhone} />
                                <Row label="Usul" value={fulfill === "PICKUP" ? "Do'konga o'zim" : `Yandex (${address})`} />
                                <div className="pt-2 mt-2" style={{ borderTop: `1px solid ${BELIS.border}` }}>
                                    <Row label="Ijara puli" value={fmtSom(avail.totals.rentTotalUzs)} />
                                    <Row label="Zaklat" value={fmtSom(avail.totals.depositUzs)} />
                                    <div className="pt-2 mt-2 flex justify-between" style={{ borderTop: `1px solid ${BELIS.border}` }}>
                                        <span className="font-black" style={{ color: BELIS.text }}>Jami</span>
                                        <span className="font-black text-[16px]" style={{ color: BELIS.goldDeep }}>{fmtSom(avail.totals.grandTotalUzs)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 p-3 rounded-xl text-[11.5px] flex items-start gap-2"
                                style={{ background: BELIS.goldSoft, color: BELIS.onGold }}>
                                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <span>Ariza yuborilgach @sevinch qo&apos;ng&apos;iroq qiladi, aniqlashtiradi va tasdiqlaydi. Pul do&apos;konda naqd to&apos;laydi.</span>
                            </div>

                            <button type="button" onClick={() => setContractOpen(true)}
                                className="mt-4 w-full h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-2"
                                style={{ background: BELIS.bg, color: BELIS.text, border: `1px solid ${BELIS.border}` }}>
                                <FileText className="w-4 h-4" /> Shartnomani to&apos;liq o&apos;qish
                            </button>

                            <label className="mt-3 flex items-start gap-2 cursor-pointer">
                                <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)}
                                    className="mt-1 w-4 h-4" style={{ accentColor: BELIS.gold }} />
                                <span className="text-[12px]" style={{ color: BELIS.text }}>
                                    Sarpo ijara shartnomasi bilan tanishib chiqdim va uning barcha shartlariga rozimen.
                                    Sarpo qutilarini butun holida saqlab qaytarishga majburiman, buzilsa/kam qaytsa shtraf ijara pulidan qimmatga tushishini tushunaman.
                                </span>
                            </label>
                        </div>
                    )}

                    {contractOpen && <BelisContractModal onClose={() => setContractOpen(false)} />}

                    {step === 4 && successCode && (
                        <div className="text-center py-8">
                            <span className="w-16 h-16 rounded-full grid place-items-center mx-auto mb-4"
                                style={{ background: BELIS.okSoft, color: BELIS.ok }}>
                                <CheckCircle2 className="w-8 h-8" />
                            </span>
                            <p className="text-[18px] font-black mb-1" style={{ color: BELIS.text }}>Ariza yuborildi</p>
                            <p className="text-[13px] mb-3" style={{ color: BELIS.text2 }}>Kod: <b style={{ color: BELIS.goldDeep }}>{successCode}</b></p>
                            <p className="text-[12.5px]" style={{ color: BELIS.text2 }}>
                                @sevinch tez orada bog&apos;lanadi. Bildirishnoma push orqali keladi.
                            </p>
                        </div>
                    )}

                    {err && (
                        <div className="mt-3 p-3 rounded-xl text-[12.5px] flex items-start gap-2"
                            style={{ background: BELIS.errSoft, color: BELIS.err }}>
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{err}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 flex items-center gap-2" style={{ borderTop: `1px solid ${BELIS.border}` }}>
                    {step > 1 && step < 4 && (
                        <button onClick={() => setStep(s => (Math.max(1, s - 1)) as Step)}
                            className="h-11 px-4 rounded-xl text-[13px] font-black flex items-center gap-1"
                            style={{ background: BELIS.bg, color: BELIS.text }}>
                            <ChevronLeft className="w-4 h-4" /> Ortga
                        </button>
                    )}
                    {step === 1 && (
                        <button onClick={() => setStep(2)} disabled={!canGo2}
                            className="ml-auto h-11 px-5 rounded-xl text-[13px] font-black flex items-center gap-1 disabled:opacity-50"
                            style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                            Davom etish <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                    {step === 2 && (
                        <button onClick={() => setStep(3)} disabled={!canGo3}
                            className="ml-auto h-11 px-5 rounded-xl text-[13px] font-black flex items-center gap-1 disabled:opacity-50"
                            style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                            Davom etish <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                    {step === 3 && (
                        <button onClick={submit} disabled={!canSubmit || submitting}
                            className="ml-auto h-11 px-5 rounded-xl text-[13px] font-black flex items-center gap-2 disabled:opacity-50"
                            style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CreditCard className="w-4 h-4" /> Ariza yuborish</>}
                        </button>
                    )}
                    {step === 4 && (
                        <button onClick={() => { onClose(); router.push(`/belis/buyurtma/${successCode}` as never); }}
                            className="w-full h-11 rounded-xl text-[13px] font-black"
                            style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                            Buyurtmani ko&apos;rish
                        </button>
                    )}
                </div>

                <style jsx global>{`
                    .belis-input {
                        width: 100%;
                        height: 46px;
                        border-radius: 12px;
                        padding: 0 14px;
                        font-size: 14px;
                        outline: none;
                        background: ${BELIS.bg};
                        border: 1px solid ${BELIS.border};
                        color: ${BELIS.text};
                        caret-color: ${BELIS.gold};
                        transition: border-color .15s;
                    }
                    .belis-input:focus { border-color: ${BELIS.gold}; }
                    .belis-input::placeholder { color: ${BELIS.text3}; }
                    textarea.belis-input { padding: 12px 14px; resize: none; }
                `}</style>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-[12.5px] font-black mb-1.5 flex items-center gap-1" style={{ color: BELIS.text }}>
                {icon}{label}
            </label>
            {children}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span style={{ color: BELIS.text3 }}>{label}</span>
            <span className="font-bold" style={{ color: BELIS.text }}>{value}</span>
        </div>
    );
}
