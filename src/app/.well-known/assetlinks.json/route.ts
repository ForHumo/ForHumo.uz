// Digital Asset Links — TWA (Google Play) uchun. HOST-AWARE: har domen o'z TWA paketini
// tasdiqlaydi → ilova manzil chizig'isiz to'liq ekran ochiladi (aks holda tepada URL bar).
//
//   bozornarxida.uz (+www)            → Bozor Narxida TWA
//     TWA_PACKAGE_NAME, TWA_SHA256_FINGERPRINTS
//   forhumo.uz (+www) / humoesport.uz → Humo eSport TWA
//     TWA_ESPORT_PACKAGE_NAME, TWA_ESPORT_SHA256_FINGERPRINTS
//
// TO'LDIRISH (Bubblewrap build'dan KEYIN — KOD O'ZGARTIRMASDAN, Vercel env orqali):
//   <PKG>          = uz.forhumo.esport.twa      (Bubblewrap applicationId)
//   <FINGERPRINTS> = AA:BB:CC:...,DD:EE:FF:...  (vergul bilan)
// Play App Signing YOQILGAN bo'lsa: "App signing key" VA "Upload key" SHA-256 IKKALASI.
//
// Env yo'q bo'lsa bo'sh massiv [] qaytadi (yaroqli JSON) — TWA hali tasdiqlanmaydi,
// lekin sayt buzilmaydi. Env qo'yib redeploy qilinsa darhol ishlaydi.

import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function entry(pkg?: string, fingerprints?: string) {
    const p = pkg?.trim();
    const f = (fingerprints ?? "")
        .split(",")
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
    if (!p || f.length === 0) return null;
    return {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: { namespace: "android_app", package_name: p, sha256_cert_fingerprints: f },
    };
}

export async function GET() {
    const host = (await headers()).get("host")?.split(":")[0].toLowerCase() ?? "";
    const isBn = host === "bozornarxida.uz" || host === "www.bozornarxida.uz";

    const e = isBn
        ? entry(process.env.TWA_PACKAGE_NAME, process.env.TWA_SHA256_FINGERPRINTS)
        // forhumo.uz (+www) / humoesport.uz → Humo eSport TWA
        : entry(process.env.TWA_ESPORT_PACKAGE_NAME, process.env.TWA_ESPORT_SHA256_FINGERPRINTS);

    const body = e ? [e] : [];

    return NextResponse.json(body, {
        headers: {
            "Content-Type": "application/json",
            // Google Play verifikatori vaqti-vaqti bilan qayta o'qiydi
            "Cache-Control": "public, max-age=3600",
        },
    });
}
