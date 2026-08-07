import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const BN_HOSTS = new Set(["bozornarxida.uz", "www.bozornarxida.uz"]);

export default async function robots(): Promise<MetadataRoute.Robots> {
    const host = (await headers()).get("host")?.split(":")[0].toLowerCase() ?? "";
    const isBn = BN_HOSTS.has(host);
    const origin = isBn ? "https://bozornarxida.uz" : "https://forhumo.uz";

    return {
        rules: [
            {
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
            },
        ],
        sitemap: `${origin}/sitemap.xml`,
        host: origin,
    };
}
