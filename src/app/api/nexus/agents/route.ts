// Agent yaratish va foydalanuvchining agentlarini ro'yxatlash.
// Telegramdagi @BotFather naqshi — istalgan foydalanuvchi o'z agentini
// yaratadi. Foydalanuvchi maks MAX_AGENTS_PER_USER ta agentga ega.
//
//   GET  /api/nexus/agents            → mening agentlarim
//   POST /api/nexus/agents            → yangi agent (body: {username, name, image?})
//     - username `_agent` bilan tugashi shart
//     - tizim agenti nomlari (id_agent, market_agent, ...) band

import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateAgentUsername, MAX_AGENTS_PER_USER } from "@/lib/nexus-agent";

async function me() {
    const s = await getServerSession(authOptions);
    if (!s?.user?.email) return null;
    return prisma.userProfile.findUnique({
        where: { email: s.user.email },
        select: { id: true, username: true, humoId: true },
    });
}

export async function GET() {
    const owner = await me();
    if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const agents = await prisma.nexusAgent.findMany({
        where: { ownerId: owner.id },
        orderBy: { createdAt: "desc" },
        include: { profile: { select: { username: true, name: true, image: true, humoId: true } } },
    });

    return NextResponse.json({
        max: MAX_AGENTS_PER_USER,
        items: agents.map(a => ({
            id: a.id,
            profileId: a.profileId,
            username: a.profile.username,
            name: a.profile.name,
            image: a.profile.image,
            humoId: a.profile.humoId,
            module: a.module,
            isSystem: a.isSystem,
            webhookUrl: a.webhookUrl,
            createdAt: a.createdAt.toISOString(),
        })),
    });
}

export async function POST(req: Request) {
    const owner = await me();
    if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const usernameRaw = String(body?.username ?? "").trim().replace(/^@/, "").toLowerCase();
    const name = String(body?.name ?? "").trim().slice(0, 50);
    const image = typeof body?.image === "string" ? body.image.trim().slice(0, 500) : null;

    if (!name || name.length < 2) return NextResponse.json({ error: "Ismni kiriting" }, { status: 400 });

    const v = validateAgentUsername(usernameRaw);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    // Cheklov: 1 foydalanuvchida MAX_AGENTS_PER_USER ta agent
    const count = await prisma.nexusAgent.count({ where: { ownerId: owner.id, isSystem: false } });
    if (count >= MAX_AGENTS_PER_USER) {
        return NextResponse.json({
            error: `Har foydalanuvchida maksimal ${MAX_AGENTS_PER_USER} ta agent bo'lishi mumkin`,
        }, { status: 400 });
    }

    // Nom band emasligini tekshirish
    const exists = await prisma.userProfile.findUnique({ where: { username: usernameRaw }, select: { id: true } });
    if (exists) return NextResponse.json({ error: "Bu nom band" }, { status: 409 });

    // Agent profili yaratish (UserProfile) — email fake, humoId "AGENT..."
    const email = `${usernameRaw}@agents.forhumo.uz`;
    const humoId = `AG${String(Math.floor(Math.random() * 9_000_000) + 1_000_000)}`;
    const profile = await prisma.userProfile.create({
        data: {
            email,
            username: usernameRaw,
            name,
            image,
            humoId,
            onboardingDone: true,
            bio: `${name} — foydalanuvchi tomonidan yaratilgan agent.`,
        },
    });

    const agent = await prisma.nexusAgent.create({
        data: {
            profileId: profile.id,
            ownerId: owner.id,
            module: "CUSTOM",
            isSystem: false,
        },
    });

    // Kalit generatsiya (kelajakda webhook uchun kerak — hozircha ko'rsatib qo'yamiz)
    const apiKey = `agk_${crypto.randomBytes(16).toString("hex")}`;

    return NextResponse.json({
        ok: true,
        agent: {
            id: agent.id, profileId: profile.id,
            username: profile.username, name: profile.name, image: profile.image, humoId: profile.humoId,
            module: agent.module, isSystem: false,
            webhookUrl: null,
            createdAt: agent.createdAt.toISOString(),
        },
        // Bir marta ko'rsatiladigan API kalit (hozircha saqlab qo'yish uchun)
        apiKey,
    });
}
