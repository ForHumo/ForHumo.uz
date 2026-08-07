"use client";

// BN sharh bo'limi — mahsulot yoki do'kon sahifasida ishlatiladi.
// Xaridor COMPLETED buyurtma qilgan bo'lsa "Sharh yozish" formasi paydo bo'ladi,
// aks holda faqat ro'yxat va yorlanma xato.

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { Star, User, Loader2 } from "lucide-react";
import { BN } from "@/lib/bn-theme";

interface Review {
    id: string;
    rating: number;
    text: string | null;
    images?: string[];
    createdAt: string;
    author: { name: string | null; username: string | null; image: string | null } | null;
}

interface Props {
    /** "product" yoki "shop" — API endpointini aniqlash uchun */
    kind: "product" | "shop";
    slug: string;
}

export function BnReviews({ kind, slug }: Props) {
    const { status } = useSession();
    const [items, setItems] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const base = kind === "product" ? "products" : "shops";

    useEffect(() => {
        fetch(`/api/bn/${base}/${slug}/reviews`)
            .then(r => r.json())
            .then(d => setItems(d.items ?? []))
            .catch(() => { /* ignore */ })
            .finally(() => setLoading(false));
    }, [base, slug]);

    async function submit(rating: number, text: string) {
        const r = await fetch(`/api/bn/${base}/${slug}/reviews`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ rating, text }),
        });
        const d = await r.json();
        if (!r.ok) {
            if (d?.error === "no_completed_order") {
                alert("Sharh yozish uchun avval bu " + (kind === "product" ? "mahsulotni" : "do'kondan biror mahsulot") + " sotib olib, buyurtma yakunlangan bo'lishi kerak.");
            } else if (d?.error === "already_reviewed") {
                alert("Siz allaqachon sharh qoldirgansiz.");
            } else {
                alert(d?.error ?? "Xatolik");
            }
            return;
        }
        setShowForm(false);
        // Refetch
        setLoading(true);
        fetch(`/api/bn/${base}/${slug}/reviews`)
            .then(r => r.json())
            .then(d => setItems(d.items ?? []))
            .finally(() => setLoading(false));
    }

    const alreadyReviewed = false; // API xato beradi shu holatda, foydalanuvchi urinsa

    return (
        <section className="mt-12">
            <div className="flex items-baseline justify-between gap-3 mb-4">
                <h2 className="text-[19px] sm:text-[22px] font-black tracking-tight leading-none">
                    Sharhlar <span className="text-[14px] font-bold" style={{ color: BN.text3 }}>{items.length}</span>
                </h2>
                {status === "authenticated" && !showForm && !alreadyReviewed && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="h-9 px-4 rounded-xl text-[13px] font-black"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        Sharh yozish
                    </button>
                )}
                {status === "unauthenticated" && (
                    <button
                        onClick={() => signIn("google")}
                        className="h-9 px-4 rounded-xl text-[13px] font-bold"
                        style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}
                    >
                        Kirish
                    </button>
                )}
            </div>

            {showForm && <ReviewForm onSubmit={submit} onCancel={() => setShowForm(false)} />}

            {loading ? (
                <div className="flex items-center justify-center py-8" style={{ color: BN.text3 }}>
                    <Loader2 className="w-5 h-5 animate-spin" />
                </div>
            ) : items.length === 0 ? (
                <div className="p-6 text-center rounded-2xl" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                    <p className="text-[13.5px]" style={{ color: BN.text3 }}>
                        Hali sharh yo&apos;q. Birinchi bo&apos;lib sharh qoldiring.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map(r => (
                        <article
                            key={r.id}
                            className="p-4 rounded-2xl"
                            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <span
                                    className="w-9 h-9 rounded-full overflow-hidden grid place-items-center flex-shrink-0"
                                    style={{ background: BN.surfaceUp }}
                                >
                                    {r.author?.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={r.author.image} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-4 h-4" style={{ color: BN.text3 }} />
                                    )}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-black truncate">
                                        {r.author?.name ?? r.author?.username ?? "Xaridor"}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="flex items-center gap-0.5" style={{ color: BN.gold }}>
                                            {Array.from({ length: 5 }, (_, i) => (
                                                <Star
                                                    key={i}
                                                    className="w-3 h-3"
                                                    style={{ fill: i < r.rating ? BN.gold : "transparent" }}
                                                />
                                            ))}
                                        </span>
                                        <span className="text-[11px]" style={{ color: BN.text3 }}>
                                            {formatDate(r.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {r.text && (
                                <p className="text-[13.5px] leading-relaxed" style={{ color: BN.text }}>
                                    {r.text}
                                </p>
                            )}
                            {r.images && r.images.length > 0 && (
                                <div className="flex gap-2 mt-3 flex-wrap">
                                    {r.images.map((u, i) => (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            key={i}
                                            src={u}
                                            alt=""
                                            className="w-16 h-16 rounded-lg object-cover"
                                            style={{ border: `1px solid ${BN.border}` }}
                                        />
                                    ))}
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

function ReviewForm({
    onSubmit, onCancel,
}: { onSubmit: (rating: number, text: string) => void | Promise<void>; onCancel: () => void }) {
    const [rating, setRating] = useState(0);
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);

    async function handle() {
        if (rating < 1) return;
        setBusy(true);
        try { await onSubmit(rating, text); }
        finally { setBusy(false); }
    }

    return (
        <div
            className="p-4 rounded-2xl mb-4"
            style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
        >
            <p className="text-[13px] font-bold mb-3">Bahoyingiz</p>
            <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => setRating(i + 1)}
                        aria-label={`${i + 1} yulduz`}
                        className="p-1"
                    >
                        <Star
                            className="w-7 h-7 transition-transform"
                            style={{
                                fill: i < rating ? BN.gold : "transparent",
                                color: i < rating ? BN.gold : BN.text3,
                                transform: i < rating ? "scale(1.05)" : undefined,
                            }}
                        />
                    </button>
                ))}
            </div>
            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Mahsulot yoki xizmat haqida qisqacha (ixtiyoriy)"
                className="w-full p-3 rounded-xl text-[13.5px] resize-none outline-none"
                style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
            />
            <div className="flex items-center gap-2 mt-3">
                <button
                    onClick={handle}
                    disabled={rating < 1 || busy}
                    className="flex-1 h-11 rounded-xl text-[14px] font-black disabled:opacity-60"
                    style={{ background: BN.gold, color: BN.onGold }}
                >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Yuborish"}
                </button>
                <button
                    onClick={onCancel}
                    className="h-11 px-4 rounded-xl text-[13px] font-bold"
                    style={{ background: BN.surfaceUp, color: BN.text2 }}
                >
                    Bekor
                </button>
            </div>
        </div>
    );
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return iso; }
}
