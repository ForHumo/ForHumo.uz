// Last seen formatlash — "onlayn" / "5 daqiqa oldin" / "kecha 14:30" / "3 kun oldin"
// WhatsApp/Telegram uslubi. Til: o'zbekcha (default). i18n keyingi bosqichda.

export function formatLastSeen(lastSeenAt: string | Date | null | undefined, isOnlineNow: boolean): string {
    if (isOnlineNow) return "onlayn";
    if (!lastSeenAt) return "yaqinda onlayn edi";
    const t = typeof lastSeenAt === "string" ? new Date(lastSeenAt) : lastSeenAt;
    if (isNaN(t.getTime())) return "yaqinda onlayn edi";
    const now = Date.now();
    const diffSec = Math.floor((now - t.getTime()) / 1000);
    if (diffSec < 60) return "hozirgina onlayn edi";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} daqiqa oldin onlayn edi`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} soat oldin onlayn edi`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) {
        return `kecha ${t.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })} da onlayn edi`;
    }
    if (diffD < 7) return `${diffD} kun oldin onlayn edi`;
    if (diffD < 30) {
        const w = Math.floor(diffD / 7);
        return `${w} hafta oldin onlayn edi`;
    }
    if (diffD < 365) {
        const mo = Math.floor(diffD / 30);
        return `${mo} oy oldin onlayn edi`;
    }
    return `${t.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })} da onlayn edi`;
}

// Qisqa versiya — chat list, member list uchun (joy tor)
export function formatLastSeenShort(lastSeenAt: string | Date | null | undefined, isOnlineNow: boolean): string {
    if (isOnlineNow) return "onlayn";
    if (!lastSeenAt) return "";
    const t = typeof lastSeenAt === "string" ? new Date(lastSeenAt) : lastSeenAt;
    if (isNaN(t.getTime())) return "";
    const now = Date.now();
    const diffSec = Math.floor((now - t.getTime()) / 1000);
    if (diffSec < 60) return "hozirgina";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} daq oldin`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} soat oldin`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return "kecha";
    if (diffD < 7) return `${diffD} kun oldin`;
    if (diffD < 30) return `${Math.floor(diffD / 7)} hafta oldin`;
    if (diffD < 365) return `${Math.floor(diffD / 30)} oy oldin`;
    return t.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}
