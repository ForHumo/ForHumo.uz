// Humo AI Business Bot — sozlash API (auth talab qilinadi).
//
//   GET  /api/telegram/humo-bot/settings
//     → { config, connection, subscription, stats }
//   PUT  /api/telegram/humo-bot/settings
//     body: { persona, greeting, tone, language, faqJson, workHours, outOfHoursReply,
//             bannedTopics, escalationRules, autoReplyEnabled }
//   POST /api/telegram/humo-bot/settings/link
//     body: { telegramUserId }  — pending ulanishni foydalanuvchi profiliga bog'laydi

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireProfile() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    return prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, username: true, humoId: true },
    });
}

export async function GET() {
    const profile = await requireProfile();
    if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const [config, connection, subscription, stats] = await Promise.all([
        prisma.humoBotConfig.findUnique({ where: { profileId: profile.id } }),
        prisma.humoBotConnection.findUnique({ where: { profileId: profile.id } }),
        prisma.humoBotSubscription.findUnique({ where: { profileId: profile.id } }),
        computeStats(profile.id),
    ]);

    return NextResponse.json({
        profile,
        config: config ?? defaultConfig(),
        connection,
        subscription: subscription ?? defaultSubscription(),
        stats,
        botUsername: "ForHumo_AIBot",
    });
}

export async function PUT(req: Request) {
    const profile = await requireProfile();
    if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    // Har bir maydonni validatsiya
    const data = {
        persona: str(body.persona, 500),
        greeting: str(body.greeting, 300),
        tone: pick(body.tone, ["professional", "friendly", "brief"], "professional"),
        language: pick(body.language, ["uz", "ru", "en", "auto"], "uz"),
        faqJson: validateFaq(body.faqJson),
        workHours: str(body.workHours, 80),
        outOfHoursReply: str(body.outOfHoursReply, 400),
        bannedTopics: str(body.bannedTopics, 300),
        escalationRules: str(body.escalationRules, 300),
        autoReplyEnabled: body.autoReplyEnabled !== false,
    };

    const config = await prisma.humoBotConfig.upsert({
        where: { profileId: profile.id },
        create: { profileId: profile.id, ...data },
        update: data,
    });

    return NextResponse.json({ ok: true, config });
}

// ── Yordamchi ────────────────────────────────────────────────────────────────

function str(v: unknown, max: number): string | null {
    if (typeof v !== "string") return null;
    const s = v.trim();
    return s.length === 0 ? null : s.slice(0, max);
}

function pick<T extends string>(v: unknown, allowed: T[], fallback: T): T {
    return typeof v === "string" && (allowed as string[]).includes(v) ? (v as T) : fallback;
}

function validateFaq(v: unknown): { q: string; a: string }[] {
    if (!Array.isArray(v)) return [];
    return v
        .filter((x): x is { q: string; a: string } =>
            !!x && typeof x === "object"
            && typeof (x as { q?: unknown }).q === "string"
            && typeof (x as { a?: unknown }).a === "string"
            && (x as { q: string }).q.trim().length > 0
            && (x as { a: string }).a.trim().length > 0
        )
        .slice(0, 30)
        .map(x => ({ q: x.q.trim().slice(0, 200), a: x.a.trim().slice(0, 800) }));
}

function defaultConfig() {
    return {
        persona: "",
        greeting: "",
        tone: "professional",
        language: "uz",
        faqJson: [] as { q: string; a: string }[],
        workHours: "",
        outOfHoursReply: "",
        bannedTopics: "",
        escalationRules: "",
        autoReplyEnabled: true,
    };
}

function defaultSubscription() {
    return {
        tier: "free",
        status: "active",
        monthlyLimit: 50,
        usedThisMonth: 0,
        expiresAt: null as Date | null,
        priceUzs: 0,
    };
}

async function computeStats(profileId: string) {
    const [today, week, month, totalMessages] = await Promise.all([
        prisma.humoBotMessage.count({
            where: { profileId, createdAt: { gte: dayStart() } },
        }),
        prisma.humoBotMessage.count({
            where: { profileId, createdAt: { gte: daysAgo(7) } },
        }),
        prisma.humoBotMessage.count({
            where: { profileId, createdAt: { gte: daysAgo(30) } },
        }),
        prisma.humoBotMessage.count({ where: { profileId } }),
    ]);
    return { today, week, month, totalMessages };
}

function dayStart(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}
function daysAgo(n: number): Date {
    return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
