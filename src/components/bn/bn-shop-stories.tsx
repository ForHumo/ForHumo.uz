"use client";

// BN bosh sahifasida sotuvchilar Nexus stories qatori.
// 24 soat davomida faol — do'kon "tirik" ekanini ko'rsatadi.

import { useState, useEffect } from "react";
import { Store } from "lucide-react";
import { BN } from "@/lib/bn-theme";

interface StoryItem {
    storyId: string;
    shopSlug: string;
    shopName: string;
    avatarUrl: string | null;
    coverUrl: string;
    mediaType: string;
    createdAt: string;
    expiresAt: string;
}

export function BnShopStories() {
    const [items, setItems] = useState<StoryItem[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        fetch("/api/bn/nexus-stories?limit=15")
            .then(r => r.json())
            .then(d => setItems(d.items ?? []))
            .catch(() => { /* ignore */ })
            .finally(() => setLoaded(true));
    }, []);

    if (loaded && items.length === 0) return null;

    return (
        <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-[15px] font-black">Do&apos;konlar hozir</span>
                <span className="text-[11.5px]" style={{ color: BN.text3 }}>
                    Nexus&apos;dagi 24 soatlik hikoyalar
                </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 bn-noscroll">
                {items.map(s => (
                    <a
                        key={s.storyId}
                        href={`https://forhumo.uz/uz/nexus/u/${s.shopSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[76px] group"
                        aria-label={`${s.shopName} hikoyasi`}
                    >
                        <span
                            className="relative w-[68px] h-[68px] rounded-full p-[3px]"
                            style={{
                                background: `linear-gradient(135deg, var(--bn-gold-light), var(--bn-gold-dark))`,
                            }}
                        >
                            <span
                                className="block w-full h-full rounded-full overflow-hidden"
                                style={{ background: BN.surface, border: `2px solid var(--bn-bg)` }}
                            >
                                {s.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={s.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="w-full h-full grid place-items-center" style={{ color: BN.text3 }}>
                                        <Store className="w-5 h-5" />
                                    </span>
                                )}
                            </span>
                        </span>
                        <span className="text-[10.5px] font-bold text-center truncate w-full leading-tight" style={{ color: BN.text2 }}>
                            {s.shopName}
                        </span>
                    </a>
                ))}
            </div>
        </section>
    );
}
