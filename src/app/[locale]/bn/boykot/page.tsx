// BN boykot brendlar — public ro'yxat + sabablar.
// OWNER admin panelidan boshqaradi.

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { BN } from "@/lib/bn-theme";
import { Ban, ShieldOff } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Boykot brendlar",
    description: "Bozor Narxida platformasida sotilmaydigan brendlar ro'yxati va sabablari.",
};

export default async function Page() {
    const brands = await prisma.bnBoycottBrand.findMany({
        orderBy: [{ addedAt: "desc" }],
    });

    return (
        <div className="pt-6 pb-24 px-4 max-w-3xl mx-auto">
            <div className="mb-6 text-center">
                <div
                    className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-3"
                    style={{ background: `${BN.err}22`, color: BN.err }}
                >
                    <ShieldOff className="w-7 h-7" />
                </div>
                <h1 className="text-[24px] font-black mb-2" style={{ color: BN.text }}>
                    Boykot brendlar
                </h1>
                <p className="text-[14px] max-w-lg mx-auto" style={{ color: BN.text2 }}>
                    Ushbu brendlar Bozor Narxida platformasida sotilmaydi. Har bir qaror asosli va
                    ochiq — sabab quyida ko'rsatilgan.
                </p>
            </div>

            {brands.length === 0 ? (
                <div
                    className="rounded-2xl p-8 text-center"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <Ban className="w-10 h-10 mx-auto mb-3" style={{ color: BN.text3 }} />
                    <p className="text-[15px] font-black mb-1" style={{ color: BN.text }}>Ro&apos;yxat bo&apos;sh</p>
                    <p className="text-[13px]" style={{ color: BN.text2 }}>
                        Hozircha boykot ostidagi brendlar yo&apos;q.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {brands.map(b => (
                        <div
                            key={b.id}
                            className="rounded-2xl p-4"
                            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                                    style={{ background: `${BN.err}18`, color: BN.err }}
                                >
                                    <Ban className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                                        <h2 className="text-[16px] font-black" style={{ color: BN.text }}>
                                            {b.name}
                                        </h2>
                                        {b.categories.map(c => (
                                            <span
                                                key={c}
                                                className="text-[10.5px] font-black uppercase px-1.5 py-0.5 rounded-md leading-none"
                                                style={{ background: BN.surfaceUp, color: BN.text3 }}
                                            >
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-[13.5px] leading-relaxed mb-1" style={{ color: BN.text }}>
                                        {b.reason}
                                    </p>
                                    {b.detail && (
                                        <p className="text-[12.5px] leading-relaxed mt-1" style={{ color: BN.text2 }}>
                                            {b.detail}
                                        </p>
                                    )}
                                    {b.aliases.length > 0 && (
                                        <p className="text-[11px] mt-2" style={{ color: BN.text3 }}>
                                            Boshqa nomlar: {b.aliases.join(", ")}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-[11.5px] text-center mt-6" style={{ color: BN.text3 }}>
                Ro&apos;yxatga qo&apos;shish/olib tashlash faqat OWNER huquqi
            </p>
        </div>
    );
}
