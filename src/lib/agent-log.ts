// Agent webhook log yozish — audit uchun so'nggi 100 chaqiruv saqlanadi.
// So'nggi 100 dan oshgan yozuvlarni cron o'chirmasdan, insert'da rolling window bilan tozalaymiz.

import { prisma } from "./prisma";

const KEEP_LAST = 100;

export async function logAgentCall(params: {
    agentId: string;
    event: "message.new" | "webhook.ping" | "inline.query" | "message.edited" | "message.deleted";
    ok: boolean;
    statusCode?: number | null;
    elapsedMs: number;
    error?: string | null;
    preview?: string | null;
}): Promise<void> {
    try {
        await prisma.nexusAgentLog.create({
            data: {
                agentId: params.agentId,
                event: params.event,
                ok: params.ok,
                statusCode: params.statusCode ?? null,
                elapsedMs: Math.max(0, Math.min(300_000, Math.floor(params.elapsedMs))),
                error: params.error ? String(params.error).slice(0, 500) : null,
                preview: params.preview ? String(params.preview).slice(0, 200) : null,
            },
        });
        // Rolling window — 100 dan oshsa eski yozuvlarni o'chirish (fail-safe)
        const count = await prisma.nexusAgentLog.count({ where: { agentId: params.agentId } });
        if (count > KEEP_LAST + 10) {
            const old = await prisma.nexusAgentLog.findMany({
                where: { agentId: params.agentId },
                orderBy: { createdAt: "desc" },
                skip: KEEP_LAST,
                select: { id: true },
            });
            if (old.length > 0) {
                await prisma.nexusAgentLog.deleteMany({ where: { id: { in: old.map(o => o.id) } } });
            }
        }
    } catch { /* silent — log yozish DM'ni bloklamasin */ }
}

// Rate-limit tekshiruvi (per-agent). true = to'xtatish kerak.
export async function agentRateLimited(agentId: string, perMinute: number): Promise<boolean> {
    const limit = perMinute > 0 ? perMinute : 60;
    const since = new Date(Date.now() - 60_000);
    const recent = await prisma.nexusAgentLog.count({
        where: { agentId, createdAt: { gte: since } },
    });
    return recent >= limit;
}
