"use client";

// BN sevimlilar — real BnFavorite. Login talab qilinadi.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Heart, LogIn } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";
import { BnProductCard } from "./bn-product-card";
import { BnEmpty } from "./bn-cards";
import type { BnProductDTO } from "@/lib/bn-data";

interface Props {
    initial: BnProductDTO[];
    unauthenticated: boolean;
}

export function BnFavoritesClient({ initial, unauthenticated }: Props) {
    const router = useRouter();
    const { status } = useSession();
    const [items, setItems] = useState<BnProductDTO[]>(initial);
    const notAuth = unauthenticated || status === "unauthenticated";

    async function remove(productId: string) {
        setItems(prev => prev.filter(p => p.id !== productId));
        try {
            await fetch("/api/bn/favorites", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ productId }),
            });
            router.refresh();
        } catch { /* ignore */ }
    }

    if (notAuth) {
        return (
            <Wrap>
                <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight mb-6">Sevimlilar</h1>
                <div
                    className="max-w-[440px] mx-auto p-7 rounded-3xl text-center"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <span
                        className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <Heart className="w-7 h-7" />
                    </span>
                    <p className="text-[18px] font-black mb-2">Kiring va davom eting</p>
                    <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: BN.text2 }}>
                        Yoqqan mahsulotlarni saqlash uchun Humo ID bilan kiring.
                    </p>
                    <button
                        onClick={() => signIn("google")}
                        className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[15px] font-black"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        <LogIn className="w-5 h-5" />
                        Humo ID bilan kirish
                    </button>
                </div>
            </Wrap>
        );
    }

    if (items.length === 0) {
        return (
            <Wrap>
                <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight mb-6">Sevimlilar</h1>
                <BnEmpty
                    icon={<Heart className="w-6 h-6" />}
                    title="Hali saqlangan mahsulot yo'q"
                    text="Mahsulot sahifasida yurak belgisini bosing — bu yerda to'planadi."
                    action={
                        <BnLink
                            href="/"
                            className="inline-flex h-11 px-5 items-center rounded-xl text-[14px] font-black"
                            style={{ background: BN.gold, color: BN.onGold }}
                        >
                            Mahsulotlarni ko&apos;rish
                        </BnLink>
                    }
                />
            </Wrap>
        );
    }

    return (
        <Wrap>
            <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight mb-6">
                Sevimlilar <span className="text-[15px] font-bold" style={{ color: BN.text3 }}>{items.length} ta</span>
            </h1>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {items.map(p => (
                    <div key={p.id} className="relative group">
                        <BnProductCard p={p} compact />
                        <button
                            onClick={() => remove(p.id)}
                            aria-label="Sevimlilardan o'chirish"
                            className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full backdrop-blur-sm transition-transform active:scale-90"
                            style={{ background: BN.glass, color: BN.err }}
                        >
                            <Heart className="w-4 h-4 fill-current" />
                        </button>
                    </div>
                ))}
            </div>
        </Wrap>
    );
}

function Wrap({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">{children}</div>;
}
