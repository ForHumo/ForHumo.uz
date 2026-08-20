// robots.txt — host'ga qarab boshqa qoidalar (sitemap kabi).
//   bozornarxida.uz  → BN uchun; marketing sahifalari (/haqida, /sotuvchi/waitlist)
//                       ochiq, xususiy oqim (kabinet/savat/scan) yopiq.
//   forhumo.uz       → butun asosiy sayt; admin/kabinet yopiq.
// Sitemap avtomatik URL tomon ko'rsatiladi — Google Search Console'da qo'l bilan
// yuborishga hojat qolmaydi.

import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const BN_HOSTS = new Set(["bozornarxida.uz", "www.bozornarxida.uz"]);

export default async function robots(): Promise<MetadataRoute.Robots> {
    const host = (await headers()).get("host")?.split(":")[0].toLowerCase() ?? "";
    const isBn = BN_HOSTS.has(host);
    const origin = isBn ? "https://bozornarxida.uz" : "https://forhumo.uz";

    // Marketing sahifalari ochiq (SEO uchun kritik), xususiy oqim yopiq.
    // "allow" bir necha marta yozilsa Google eng aniq mos keluvchini oladi —
    // shu sabab /sotuvchi bloki oldidan /sotuvchi/waitlist ochib qo'yiladi.
    const bnRules: MetadataRoute.Robots["rules"] = [{
        userAgent: "*",
        allow: [
            "/",
            "/haqida",              // SEO landing
            "/sotuvchi/waitlist",   // marketing konversiya sahifasi
        ],
        disallow: [
            "/api/",
            "/admin/",
            "/kabinet",
            "/sotuvchi",            // ariza formasi (waitlist ustidan yuqorida ruxsat berilgan)
            "/sozlamalar",
            "/savat",
            "/buyurtmalarim",
            "/sevimlilar",
            "/bildirishnomalar",
            "/scan",
            "/r/",                  // referral deep link — darhol redirect qiladi, SEO qiymati yo'q
            // Locale prefikslari (uz/ru/en) uchun ham
            "/*/kabinet",
            "/*/admin",
            "/*/sozlamalar",
            "/*/savat",
            "/*/buyurtmalarim",
            "/*/sevimlilar",
            "/*/bildirishnomalar",
            "/*/scan",
            "/*/r/",
        ],
    }];

    const mainRules: MetadataRoute.Robots["rules"] = [{
        userAgent: "*",
        allow: "/",
        disallow: [
            "/api/",
            "/admin/",
            "/kabinet/",
            "/sotuvchi/",
            "/sozlamalar/",
            "/savat",
            "/buyurtmalarim",
            "/sevimlilar",
            "/bildirishnomalar",
            "/scan",
            "/*/kabinet",
            "/*/admin",
            "/*/sotuvchi",
            "/*/sozlamalar",
        ],
    }];

    return {
        rules: isBn ? bnRules : mainRules,
        sitemap: `${origin}/sitemap.xml`,
        host: origin,
    };
}
