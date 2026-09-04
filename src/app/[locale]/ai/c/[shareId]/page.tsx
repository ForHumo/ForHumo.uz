// Public AI suhbat sahifasi — shareId orqali ochilishi mumkin.
// Read-only: xabarlar ko'rinadi, javob berish yo'q.

import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { moduleTheme } from "@/lib/module-theme";
import { Sparkles, ArrowLeft, Brain } from "lucide-react";

interface Props { params: Promise<{ locale: string; shareId: string }> }

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
            messages: { orderBy: { createdAt: "asc" }, take: 100 },
        },
    });
    if (!conv || !conv.shareId) notFound();

    const T = moduleTheme("ai");

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-2xl mx-auto space-y-4">
                <Link href="/ai/chat" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={15} /> Humo AI
                </Link>

                {/* Header */}
                <div className="rounded-3xl p-5 border" style={{ borderColor: T.border, background: T.soft }}>
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
                            <p className="text-xs text-muted-foreground mt-1">
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
                                        background: isUser ? T.gradient : "var(--card, rgba(0,0,0,0.04))",
                                        color: isUser ? T.onPrimary : "var(--foreground)",
                                        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                    }}>
                                    {m.attachmentType === "image" && m.attachmentUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={m.attachmentUrl} alt="" className="mb-2 max-w-full max-h-64 rounded-lg" />
                                    )}
                                    {m.body}
                                    <div className={`text-[10px] mt-1 opacity-60 ${isUser ? "text-right" : ""}`}>
                                        {new Date(m.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CTA */}
                <div className="rounded-2xl p-4 border text-center" style={{ borderColor: T.border }}>
                    <Sparkles className="w-5 h-5 mx-auto mb-2" style={{ color: T.primary }} />
                    <p className="text-sm mb-2">O&apos;zingizga Humo AI ochib ko&apos;ring</p>
                    <Link href="/ai/chat"
                        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-black text-white"
                        style={{ background: T.gradient }}>
                        Chatni boshlash →
                    </Link>
                </div>
            </div>
        </div>
    );
}
