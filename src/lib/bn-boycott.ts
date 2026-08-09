// BN boykot brendlar — mahsulot matnida boykot brendi bormi tekshirish.
// DB'dan barcha boykot brendlarni oladi (kesh — hech qachon ko'p bo'lmaydi)
// va matnda topiladi.

import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export interface BoycottHit {
    brandId: string;
    name: string;
    reason: string;
    matched: string;   // qaysi so'z topildi
}

// Ro'yxat kam o'zgaradi — 5 daq keshlaymiz
export const getBoycottBrands = unstable_cache(
    async () => {
        return prisma.bnBoycottBrand.findMany({
            select: { id: true, name: true, aliases: true, reason: true },
            orderBy: { addedAt: "asc" },
        });
    },
    ["bn-boycott-brands"],
    { revalidate: 300, tags: ["bn-boycott"] },
);

// Word boundary bilan tekshirish (masalan "coca" so'zining ichida bo'lmasin)
function containsWord(haystack: string, needle: string): boolean {
    const n = needle.trim().toLowerCase();
    if (n.length < 2) return false;
    // Maxsus belgilarni escape qilamiz
    const esc = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // U+2019 apostrof va oddiy apostrof ikkalasi ham matched bo'lsin
    const re = new RegExp(`(?:^|[^a-zа-яё0-9-])${esc}(?:$|[^a-zа-яё0-9-])`, "iu");
    return re.test(haystack);
}

export async function checkBoycott(text: string): Promise<BoycottHit | null> {
    const brands = await getBoycottBrands();
    if (brands.length === 0) return null;
    const t = (text || "").toLowerCase();
    if (!t.trim()) return null;
    for (const b of brands) {
        // Asosiy nom
        if (containsWord(t, b.name)) {
            return { brandId: b.id, name: b.name, reason: b.reason, matched: b.name };
        }
        // Aliases
        for (const alias of b.aliases) {
            if (containsWord(t, alias)) {
                return { brandId: b.id, name: b.name, reason: b.reason, matched: alias };
            }
        }
    }
    return null;
}
