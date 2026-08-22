// Belis admin/util helpers.
// Belis loyihasi single-vendor — Belis o'zi sotadi.
// Adminlar hardcoded (kelajakda BelisAdmin table'iga migratsiya qilish mumkin).

import { prisma } from "@/lib/prisma";
import type { UserProfile } from "@prisma/client";

// Belis admin username'lari (loyihaga kirishga ega).
// - @sevinch: loyiha rahbari (Sevinch opa)
// - @abduvoris: For Humo asoschi (super-admin)
export const BELIS_ADMIN_USERNAMES = ["sevinch", "abduvoris"] as const;

export function isBelisAdmin(profile: Pick<UserProfile, "username"> | null | undefined): boolean {
    if (!profile?.username) return false;
    return BELIS_ADMIN_USERNAMES.includes(profile.username.toLowerCase() as (typeof BELIS_ADMIN_USERNAMES)[number]);
}

// Belis admin gate — server route/action ichida ishlatiladi
export async function requireBelisAdmin(email: string | null | undefined) {
    if (!email) return { ok: false as const, error: "Unauthorized" as const, status: 401 };
    const me = await prisma.userProfile.findUnique({
        where: { email },
        select: { id: true, username: true, humoId: true, name: true },
    });
    if (!me) return { ok: false as const, error: "Profil topilmadi" as const, status: 404 };
    if (!isBelisAdmin(me)) return { ok: false as const, error: "Faqat Belis adminlari" as const, status: 403 };
    return { ok: true as const, me };
}

// Belis buyurtma status label'lari (UI'da tarjima uchun)
export const BELIS_ORDER_STATUS_LABEL: Record<string, { uz: string; ru: string; en: string }> = {
    NEW:        { uz: "Yangi", ru: "Новый", en: "New" },
    ACCEPTED:   { uz: "Qabul qilindi", ru: "Принят", en: "Accepted" },
    PREPARING:  { uz: "Tayyorlanmoqda", ru: "Готовится", en: "Preparing" },
    SHIPPING:   { uz: "Yo'lda", ru: "В пути", en: "Shipping" },
    DELIVERED:  { uz: "Yetkazildi", ru: "Доставлен", en: "Delivered" },
    CANCELLED:  { uz: "Bekor qilingan", ru: "Отменён", en: "Cancelled" },
};

// Slug yaratish helper (kirill/lotin → URL-safe)
export function belisSlug(input: string): string {
    return input
        .toLowerCase()
        .trim()
        // O'zbek harflari → lotin
        .replace(/[ёэ]/g, "e").replace(/ю/g, "yu").replace(/я/g, "ya")
        .replace(/ч/g, "ch").replace(/ш/g, "sh").replace(/щ/g, "sh")
        .replace(/ж/g, "j").replace(/х/g, "x").replace(/ц/g, "ts")
        .replace(/[а-я]/g, (c) => "abvgdejzijklmnoprstufxc"[
            "абвгдежзийклмнопрстуфхц".indexOf(c)
        ] ?? "")
        // Bo'sh joy → tire
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}
