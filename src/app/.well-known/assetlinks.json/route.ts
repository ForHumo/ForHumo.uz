// Digital Asset Links — TWA (Google Play) uchun. HOST-AWARE: har domen o'z TWA paketini
// tasdiqlaydi → ilova manzil chizig'isiz to'liq ekran ochiladi (aks holda tepada URL bar).
//
//   bozornarxida.uz (+www)            → Bozor Narxida TWA
//     TWA_PACKAGE_NAME, TWA_SHA256_FINGERPRINTS
//   forhumo.uz (+www) / humoesport.uz → For Humo (super-app) + eSport + Nexus TWA
//     For Humo: TWA_FORHUMO_PACKAGE_NAME, TWA_FORHUMO_SHA256_FINGERPRINTS  (scope "/" — hammasi)
//     eSport:   TWA_ESPORT_PACKAGE_NAME,  TWA_ESPORT_SHA256_FINGERPRINTS   (path /esport)
//     Nexus:    TWA_NEXUS_PACKAGE_NAME,   TWA_NEXUS_SHA256_FINGERPRINTS    (path /nexus)
//   Bir host bir nechta TWA'ni tasdiqlashi mumkin — javob statement MASSIVI (har ilova bitta).
//
// TO'LDIRISH (Bubblewrap build'dan KEYIN — KOD O'ZGARTIRMASDAN, Vercel env orqali):
//   <PKG>          = uz.forhumo.esport.twa / uz.forhumo.nexus.twa  (Bubblewrap applicationId)
//   <FINGERPRINTS> = AA:BB:CC:...,DD:EE:FF:...  (vergul bilan)
// Play App Signing YOQILGAN bo'lsa: "App signing key" VA "Upload key" SHA-256 IKKALASI.
//
// Env yo'q bo'lsa o'sha ilova statement'i tushib qoladi (bo'sh bo'lsa [] — yaroqli JSON).
// Env qo'yib redeploy qilinsa darhol ishlaydi; sayt hech qachon buzilmaydi.

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

    const entries = isBn
        ? [entry(process.env.TWA_PACKAGE_NAME, process.env.TWA_SHA256_FINGERPRINTS)]
        // forhumo.uz (+www) / humoesport.uz → For Humo super-app + eSport + Nexus (bir host, uch TWA)
        : [
            entry(process.env.TWA_FORHUMO_PACKAGE_NAME, process.env.TWA_FORHUMO_SHA256_FINGERPRINTS),
            entry(process.env.TWA_ESPORT_PACKAGE_NAME, process.env.TWA_ESPORT_SHA256_FINGERPRINTS),
            entry(process.env.TWA_NEXUS_PACKAGE_NAME, process.env.TWA_NEXUS_SHA256_FINGERPRINTS),
        ];

    const body = entries.filter(Boolean);

    return NextResponse.json(body, {
        headers: {
            "Content-Type": "application/json",
            // Google Play verifikatori vaqti-vaqti bilan qayta o'qiydi
            "Cache-Control": "public, max-age=3600",
        },
    });
}
