// Admin audit log - barcha muhim harakatlar bir joyda.
//
//   GET /api/admin/audit-log?limit=50

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

interface AuditItem {
    id: string;
    kind: "broadcast" | "moderation" | "ban" | "termination" | "shop_status" | "waitlist" | "feedback";
    actor: string;
    target?: string;
    details?: string;
    at: string;
}

export async function GET(req: Request) {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "founder_required" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(200, Math.max(20, Number(searchParams.get("limit")) || 50));

    const [broadcasts, mods, bans, terms, waitlists, feedbacks] = await Promise.all([
        prisma.bnBroadcast.findMany({
            orderBy: { createdAt: "desc" }, take: limit,
            select: { id: true, title: true, segment: true, recipients: true, ownerId: true, createdAt: true },
        }).catch(() => []),
        prisma.moderationFlag.findMany({
            where: { status: { in: ["HIDDEN", "AUTO_HIDDEN"] } },
            orderBy: { updatedAt: "desc" }, take: limit,
            select: { id: true, targetType: true, targetId: true, aiVerdict: true, updatedAt: true },
        }).catch(() => []),
        prisma.bnBan.findMany({
            orderBy: { createdAt: "desc" }, take: 30,
            select: { id: true, type: true, reason: true, decidedBy: true, createdAt: true, profileId: true },
        }).catch(() => []),
        prisma.bnTerminationRequest.findMany({
            orderBy: { createdAt: "desc" }, take: 30,
            select: { id: true, status: true, reason: true, requestedById: true, createdAt: true },
        }).catch(() => []),
        prisma.bnSellerWaitlist.findMany({
            where: { status: { not: "PENDING" } },
            orderBy: { updatedAt: "desc" }, take: 30,
            select: { id: true, name: true, phone: true, status: true, updatedAt: true, contactedById: true },
        }).catch(() => []),
        prisma.humoFeedback.findMany({
            orderBy: { createdAt: "desc" }, take: 30,
            select: { id: true, mood: true, module: true, message: true, createdAt: true, profileId: true },
        }).catch(() => []),
    ]);

    // Get all actor profiles in one query
    const actorIds = new Set<string>();
    for (const b of broadcasts) if (b.ownerId) actorIds.add(b.ownerId);
    for (const b of bans) if (b.profileId) actorIds.add(b.profileId);
    for (const t of terms) if (t.requestedById) actorIds.add(t.requestedById);
    for (const w of waitlists) if (w.contactedById) actorIds.add(w.contactedById);
    for (const f of feedbacks) if (f.profileId) actorIds.add(f.profileId);

    const profiles = actorIds.size > 0 ? await prisma.userProfile.findMany({
        where: { id: { in: [...actorIds] } },
        select: { id: true, username: true, humoId: true, name: true },
    }) : [];
    const profileMap = new Map(profiles.map(p => [p.id, p.username || p.humoId || p.name || "—"]));

    const items: AuditItem[] = [];

    for (const b of broadcasts) {
        items.push({
            id: `br-${b.id}`, kind: "broadcast",
            actor: profileMap.get(b.ownerId) || "—",
            target: b.segment, details: `${b.title.slice(0, 50)} (${b.recipients} kishiga)`,
            at: b.createdAt.toISOString(),
        });
    }
    for (const m of mods) {
        items.push({
            id: `mod-${m.id}`, kind: "moderation",
            actor: "AI/moderator",
            target: `${m.targetType}:${m.targetId.slice(0, 8)}`, details: m.aiVerdict || "manual",
            at: m.updatedAt.toISOString(),
        });
    }
    for (const b of bans) {
        items.push({
            id: `ban-${b.id}`, kind: "ban",
            actor: b.decidedBy,
            target: profileMap.get(b.profileId) || b.profileId.slice(0, 8),
            details: `${b.type}: ${b.reason.slice(0, 60)}`,
            at: b.createdAt.toISOString(),
        });
    }
    for (const t of terms) {
        items.push({
            id: `trm-${t.id}`, kind: "termination",
            actor: profileMap.get(t.requestedById) || "—",
            details: `${t.status}: ${t.reason.slice(0, 60)}`,
            at: t.createdAt.toISOString(),
        });
    }
    for (const w of waitlists) {
        items.push({
            id: `wl-${w.id}`, kind: "waitlist",
            actor: w.contactedById ? profileMap.get(w.contactedById) || "—" : "system",
            target: w.name, details: `${w.status} (${w.phone})`,
            at: w.updatedAt.toISOString(),
        });
    }
    for (const f of feedbacks) {
        items.push({
            id: `fb-${f.id}`, kind: "feedback",
            actor: f.profileId ? profileMap.get(f.profileId) || "—" : "anonim",
            target: f.module || "humo", details: `${f.mood}: ${f.message.slice(0, 60)}`,
            at: f.createdAt.toISOString(),
        });
    }

    items.sort((a, b) => (a.at < b.at ? 1 : -1));
    return NextResponse.json({ items: items.slice(0, limit) });
}
