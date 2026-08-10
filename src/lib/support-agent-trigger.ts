// Support tiket status o'zgarganda yoki admin javob bergach @support_agent
// foydalanuvchining DM'iga xabar yuboradi (Nexus'da chat sifatida ko'rinadi).

import { prisma } from "@/lib/prisma";
import { sendAgentDM } from "@/lib/nexus-agent-send";

interface Params {
    ticketId: string;
    kind: "admin-reply" | "status-changed";
    adminReplyBody?: string;
    newStatus?: string;
}

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
            const statusLabel: Record<string, string> = {
                open: "ochiq",
                pending: "javob berildi",
                closed: "yopildi",
            };
            title = `Tiket holati: ${statusLabel[p.newStatus ?? ""] ?? p.newStatus}`;
            body = `"${ticket.subject}" — ${statusLabel[p.newStatus ?? ""] ?? p.newStatus ?? ""}`;
        }

        await sendAgentDM({
            agentUsername: "support_agent",
            toProfileId: ticket.profileId,
            kind: "support-status",
            payload: {
                kind: "generic",
                title,
                body,
            },
        });
    } catch (e) {
        console.error("triggerSupportAgentDM failed:", e);
    }
}
