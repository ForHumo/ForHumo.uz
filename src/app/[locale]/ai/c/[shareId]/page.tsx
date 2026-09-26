// Public AI suhbat sahifasi — shareId orqali ochilishi mumkin.
// Read-only: xabarlar ko'rinadi, javob berish yo'q.
// Dizayn: Humo AI monoxrom qora tema (#0d0d0d) + starfield (chat sahifasi bilan bir xil).
// ⚠️ Bu sahifa ai/layout.tsx ichida (fixed inset-0 overflow-hidden) — shuning uchun
// o'zi h-full + overflow-y-auto bo'lishi SHART (aks holda uzun suhbat kesiladi/skroll bo'lmaydi).

import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { AiStarfield } from "@/components/ai/ai-starfield";
import { Sparkles, ArrowLeft, Brain } from "lucide-react";

interface Props { params: Promise<{ locale: string; shareId: string }> }

// Monoxrom tema (chat sahifasidagi T bilan mos)
const T = {
    primary: "#ECECEC",
    soft: "rgba(255,255,255,0.06)",
    onPrimary: "#0d0d0d",
    border: "rgba(255,255,255,0.09)",
    gradient: "#ECECEC",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { shareId } = await params;
    const conv = await prisma.aiConversation.findUnique({
        where: { shareId }, select: { title: true },
    });
    if (!conv) return { title: "Humo AI suhbat" };
    return {
        title: `${conv.title} · Humo AI`,
        description: "Humo AI orqali qilingan suhbat.",
        robots: { index: false, follow: false },
    };
}

export default async function SharedAiPage({ params }: Props) {
    const { locale, shareId } = await params;
    setRequestLocale(locale);

    const conv = await prisma.aiConversation.findUnique({
        where: { shareId },
        include: {
            messages: { orderBy: { createdAt: "asc" }, take: 200 },
        },
    });
    if (!conv || !conv.shareId) notFound();

    return (
        <div className="dark relative h-full overflow-y-auto text-[var(--foreground)]" style={{ background: "#0d0d0d" }}>
            <AiStarfield />
            <div className="relative z-10 py-8 px-4">
                <div className="max-w-2xl mx-auto space-y-4">
                    <Link href="/ai/chat" className="inline-flex items-center gap-1.5 text-sm hover:opacity-100 opacity-70 transition-opacity"
                        style={{ color: "var(--muted-foreground)" }}>
                        <ArrowLeft size={15} /> Humo AI
                    </Link>

                    {/* Header */}
                    <div className="rounded-3xl p-5 border" style={{ borderColor: T.border, background: "rgba(26,26,26,0.6)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                        <div className="flex items-start gap-3">
                            <span className="w-11 h-11 rounded-2xl grid place-items-center flex-shrink-0"
                                style={{ background: T.gradient, color: T.onPrimary }}>
                                <Brain className="w-5 h-5" />
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70" style={{ color: T.primary }}>
                                    Ulashilgan suhbat
                                </p>
                                <h1 className="text-lg font-black mt-0.5">{conv.title}</h1>
                                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                                    {conv.messages.length} ta xabar · Read-only ko&apos;rish
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Xabarlar */}
                    <div className="space-y-3">
                        {conv.messages.map(m => {
                            const isUser = m.role === "user";
                            return (
                                <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                                    <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words"
                                        style={{
                                            background: isUser ? T.gradient : "rgba(26,26,26,0.78)",
                                            color: isUser ? T.onPrimary : "var(--foreground)",
                                            border: isUser ? "none" : "1px solid rgba(255,255,255,0.06)",
                                            borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                        }}>
                                        {m.attachmentType === "image" && m.attachmentUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={m.attachmentUrl} alt="" className="mb-2 max-w-full max-h-72 rounded-lg" />
                                        )}
                                        {m.body}
                                        <div className={`text-[10px] mt-1 opacity-60 flex items-center gap-1.5 ${isUser ? "justify-end" : ""}`}>
                                            <span>
                                                {new Date(m.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                                                {m.aiModel && ` · ${m.aiModel}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* CTA */}
                    <div className="rounded-2xl p-4 border text-center" style={{ borderColor: T.border, background: "rgba(26,26,26,0.4)" }}>
                        <Sparkles className="w-5 h-5 mx-auto mb-2" style={{ color: T.primary }} />
                        <p className="text-sm mb-2">O&apos;zingizga Humo AI ochib ko&apos;ring</p>
                        <Link href="/ai/chat"
                            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-black"
                            style={{ background: T.gradient, color: T.onPrimary }}>
                            Chatni boshlash →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
