// Support tiket status o'zgarganda yoki admin javob bergach @support_agent
// foydalanuvchining DM'iga xabar yuboradi (Nexus'da chat sifatida ko'rinadi).

import { prisma } from "@/lib/prisma";
import { sendAgentDM } from "@/lib/nexus-agent-send";
import { nexusNotify } from "@/lib/nexus-notify";

interface Params {
    ticketId: string;
    kind: "admin-reply" | "status-changed";
    adminReplyBody?: string;
    newStatus?: string;
}

const STATUS_LABEL: Record<string, string> = {
    open: "ochiq",
    pending: "javob berildi",
    closed: "yopildi",
};

/**
 * Support tiket status o'zgarganda yoki admin javob bergach:
 *   1. @support NexusAgent DM'ga strukturaviy karta yuboradi (mavjud)
 *   2. NexusNotification (SUPPORT type) yaratadi — qo'ng'iroq/bell badge'da ko'rinadi
 *   3. Web Push yuboradi (agar obuna bo'lsa) — qulflangan telefondagi bildirishnoma
 *
 * Uchalasi ham fail-safe (asosiy admin javob berishni buzmaydi).
 */
export async function triggerSupportAgentDM(p: Params): Promise<void> {
    try {
        const ticket = await prisma.supportTicket.findUnique({
            where: { id: p.ticketId },
            select: { id: true, subject: true, status: true, module: true, profileId: true },
        });
        if (!ticket || !ticket.profileId) return;

        let title = "Support javob berdi";
        let body = "";
        if (p.kind === "admin-reply") {
            title = `Support: ${ticket.subject}`;
            body = (p.adminReplyBody ?? "").slice(0, 200);
        } else if (p.kind === "status-changed") {
            const label = STATUS_LABEL[p.newStatus ?? ""] ?? p.newStatus ?? "";
            title = `Tiket holati: ${label}`;
            body = `"${ticket.subject}" — ${label}`;
        }

        // 1. Agent DM karta
        await sendAgentDM({
            agentUsername: "support",
            toProfileId: ticket.profileId,
            kind: "support-status",
            payload: {
                kind: "generic",
                title,
                body,
            },
        });

        // 2 + 3. NexusNotification + Web Push (aktor = @support agent, recipient = mijoz)
        const agent = await prisma.userProfile.findUnique({
            where: { username: "support" },
            select: { id: true },
        });
        if (agent?.id) {
            await nexusNotify({
                recipientId: ticket.profileId,
                actorId: agent.id,
                type: "SUPPORT",
                ticketId: ticket.id,
                customBody: p.kind === "admin-reply"
                    ? `Support: ${body || ticket.subject}`
                    : `Tiket ${STATUS_LABEL[p.newStatus ?? ""] ?? p.newStatus}: ${ticket.subject}`,
            });
        }
    } catch (e) {
        console.error("triggerSupportAgentDM failed:", e);
    }
}
