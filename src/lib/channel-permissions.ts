// Guruh (va kanal) ruxsatlari — Telegram/Discord uslubi.
// Owner/admin har doim to'liq. Oddiy a'zolar uchun:
//   - guruh default (channel.defaultPermissions)
//   - alohida member override (member.permissions)
// Har flag: undefined = default (true), false = taqiqlangan.

export interface ChannelPermissions {
    sendMessages?: boolean;
    sendMedia?: boolean;
    sendLinks?: boolean;
    embedLinks?: boolean;
    addMembers?: boolean;
    pinMessages?: boolean;
    changeInfo?: boolean;
}

export const DEFAULT_PERMISSIONS: Required<ChannelPermissions> = {
    sendMessages: true,
    sendMedia: true,
    sendLinks: true,
    embedLinks: true,
    addMembers: false,
    pinMessages: false,
    changeInfo: false,
};

// Yakuniy huquqni hisoblash: member override > channel default > global default
export function effectivePermissions(
    role: string | null | undefined,
    channelDefault: unknown,
    memberOverride: unknown,
): Required<ChannelPermissions> {
    // Owner/Admin har doim to'liq huquqli
    if (role === "OWNER" || role === "ADMIN") {
        return {
            sendMessages: true, sendMedia: true, sendLinks: true, embedLinks: true,
            addMembers: true, pinMessages: true, changeInfo: true,
        };
    }
    const ch = normalizePerms(channelDefault);
    const mm = normalizePerms(memberOverride);
    return {
        sendMessages: mm.sendMessages ?? ch.sendMessages ?? DEFAULT_PERMISSIONS.sendMessages,
        sendMedia:    mm.sendMedia    ?? ch.sendMedia    ?? DEFAULT_PERMISSIONS.sendMedia,
        sendLinks:    mm.sendLinks    ?? ch.sendLinks    ?? DEFAULT_PERMISSIONS.sendLinks,
        embedLinks:   mm.embedLinks   ?? ch.embedLinks   ?? DEFAULT_PERMISSIONS.embedLinks,
        addMembers:   mm.addMembers   ?? ch.addMembers   ?? DEFAULT_PERMISSIONS.addMembers,
        pinMessages:  mm.pinMessages  ?? ch.pinMessages  ?? DEFAULT_PERMISSIONS.pinMessages,
        changeInfo:   mm.changeInfo   ?? ch.changeInfo   ?? DEFAULT_PERMISSIONS.changeInfo,
    };
}

function normalizePerms(input: unknown): ChannelPermissions {
    if (!input || typeof input !== "object") return {};
    const obj = input as Record<string, unknown>;
    const out: ChannelPermissions = {};
    if (typeof obj.sendMessages === "boolean") out.sendMessages = obj.sendMessages;
    if (typeof obj.sendMedia === "boolean") out.sendMedia = obj.sendMedia;
    if (typeof obj.sendLinks === "boolean") out.sendLinks = obj.sendLinks;
    if (typeof obj.embedLinks === "boolean") out.embedLinks = obj.embedLinks;
    if (typeof obj.addMembers === "boolean") out.addMembers = obj.addMembers;
    if (typeof obj.pinMessages === "boolean") out.pinMessages = obj.pinMessages;
    if (typeof obj.changeInfo === "boolean") out.changeInfo = obj.changeInfo;
    return out;
}

// Xabar matnida havola bormi (link cheklovi uchun)
export function containsUrl(text: string): boolean {
    if (!text) return false;
    return /https?:\/\/[^\s]+/i.test(text) || /\bwww\.[a-z0-9-]+\.[a-z]{2,}/i.test(text);
}

// Slow mode qoldiq sekundlar (0 = xabar yuborish mumkin)
export function slowModeRemaining(
    slowModeSeconds: number,
    lastMsgAt: Date | null | undefined,
): number {
    if (!slowModeSeconds || slowModeSeconds <= 0) return 0;
    if (!lastMsgAt) return 0;
    const diffSec = Math.floor((Date.now() - lastMsgAt.getTime()) / 1000);
    if (diffSec >= slowModeSeconds) return 0;
    return slowModeSeconds - diffSec;
}
