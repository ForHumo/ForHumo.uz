// Foydalanuvchi yoqib-o'chirishi mumkin bo'lgan bildirishnoma turlari.
// Ro'yxatda YO'Q tur = default yoqilgan. Faqat OFF holatlar saqlanadi.

export const NOTIF_TYPES = [
    "LIKE", "COMMENT", "FOLLOW", "REPLY",
    "VIDEO_LIKE", "VIDEO_COMMENT", "TRACK_LIKE",
    "PURCHASE", "LIVE", "TIP", "MENTION",
] as const;

export type NotifTypeKey = (typeof NOTIF_TYPES)[number];

// UI uchun ko'rsatiladigan sarlavhalar
export const NOTIF_LABELS: Record<NotifTypeKey, string> = {
    LIKE: "Postingizga layk",
    COMMENT: "Postingizga izoh",
    FOLLOW: "Yangi obunachi",
    REPLY: "Izohingizga javob",
    VIDEO_LIKE: "Videongizga layk",
    VIDEO_COMMENT: "Videongizga izoh",
    TRACK_LIKE: "Trekingizga layk",
    PURCHASE: "Sizning videongiz sotib olindi",
    LIVE: "Kuzatgan odam jonli efirni boshladi",
    TIP: "Sizga tip yuborildi",
    MENTION: "Sizni post/izohda eslatib o'tishdi",
};
