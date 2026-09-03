// Belis push notification helper. Web Push (NexusPushSub qayta ishlatiladi).
// Belis o'zi notification jadvali saqlamaydi (kelajakda kerak bo'lsa qo'shiladi).
// Fail-safe — xato bo'lsa asosiy oqim (booking create/status) uzilmaydi.

import { sendPushToProfile } from "@/lib/push";
import { prisma } from "@/lib/prisma";
import { BELIS_ADMIN_USERNAMES } from "@/lib/belis-auth";
import { FOUNDER_USERNAMES } from "@/lib/founders";

const BELIS_ORIGIN = "https://belis.uz";

function belisLink(path?: string | null): string {
    if (!path) return BELIS_ORIGIN;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return `${BELIS_ORIGIN}${path}`;
    return `${BELIS_ORIGIN}/${path}`;
}

/** Bitta profil'ga push yuborish (Belis brand). */
export async function belisPush(profileId: string, args: {
    title: string;
    body?: string;
    link?: string;
    tag?: string;
}) {
    try {
        await sendPushToProfile(profileId, {
            title: args.title,
            body: args.body ?? "",
            url: belisLink(args.link),
            tag: args.tag ?? `belis:${Date.now()}`,
        });
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[belis-notify] push failed", e);
    }
}

/** Belis adminlarga (@sevinch + founderlar) push yuborish. */
export async function belisPushAdmins(args: {
    title: string;
    body?: string;
    link?: string;
    tag?: string;
}) {
    try {
        const adminUsernames = [...new Set([...BELIS_ADMIN_USERNAMES, ...FOUNDER_USERNAMES])];
        const admins = await prisma.userProfile.findMany({
            where: { username: { in: adminUsernames, mode: "insensitive" } },
            select: { id: true },
        });
        await Promise.all(admins.map(a => belisPush(a.id, args)));
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[belis-notify] admins push failed", e);
    }
}
