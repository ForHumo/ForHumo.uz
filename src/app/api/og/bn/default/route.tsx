// BN umumiy OG rasmi (1200×630) — o'z rasmi bo'lmagan sahifalar uchun
// (bosh sahifa, ro'yxatlar, haqida, yordam...). Brend nomi + shior, tilga mos.
//   URL: /api/og/bn/default?l=<uz|ru|en>

import { getTranslations } from "next-intl/server";
import { OgBrandCard, ogHandler, ogLocale, renderOg } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(req: Request) {
    return ogHandler(async () => {
        const t = await getTranslations({ locale: ogLocale(req), namespace: "bn" });
        const tagline = t("tagline");
        return renderOg(<OgBrandCard tagline={tagline} />, tagline);
    });
}
