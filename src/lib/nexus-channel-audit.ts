// Guruh/kanal admin audit log helper — fail-safe wrapper.

import { prisma } from "@/lib/prisma";

export type ChannelAuditAction =
    | "kick" | "ban" | "unban" | "promote" | "demote"
    | "pin" | "unpin" | "delete-msg" | "delete-msg-everyone"
    | "change-info" | "approve-join" | "reject-join"
    | "slow-mode" | "auto-delete" | "restrict-fwd" | "channel-delete";

export async function logChannelAudit(input: {
    channelId: string;
    actorId: string;
    action: ChannelAuditAction;
    targetId?: string | null;
    detail?: string | null;
}) {
    try {
        await prisma.nexusChannelAudit.create({
            data: {
                channelId: input.channelId,
                actorId: input.actorId,
                action: input.action,
                targetId: input.targetId ?? null,
                detail: input.detail ? input.detail.slice(0, 500) : null,
            },
        });
    } catch {
        /* audit fail-safe */
    }
}
