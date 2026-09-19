// Digital Asset Links — TWA (Google Play) uchun.
// bozornarxida.uz shu faylda Android ilovani "tasdiqlaydi" → TWA brauzer
// manzil chizig'isiz, to'liq ekran ochiladi (aks holda tepada URL bar qoladi).
//
// TO'LDIRISH (Bubblewrap build'dan KEYIN — KOD O'ZGARTIRMASDAN, Vercel env orqali):
//   TWA_PACKAGE_NAME         = uz.bozornarxida.twa      (Bubblewrap applicationId)
//   TWA_SHA256_FINGERPRINTS  = AA:BB:CC:...,DD:EE:FF:... (vergul bilan; probel shart emas)
//
// Fingerprint(lar)ni qayerdan olish:
//   - Play App Signing YOQILGAN bo'lsa (tavsiya): Play Console → Test and release →
//     Setup → App integrity → "App signing key certificate" VA "Upload key certificate"
//     ikkalasining SHA-256 ini qo'shing (ikkalasi ham kerak).
//   - Yoki lokal keystore'dan: `keytool -list -v -keystore <fayl>.keystore` → SHA-256.
//
// Env yo'q bo'lsa bo'sh massiv [] qaytadi (yaroqli JSON) — TWA hali tasdiqlanmaydi,
// lekin sayt buzilmaydi. Env qo'yib redeploy qilinsa darhol ishlaydi.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const pkg = process.env.TWA_PACKAGE_NAME?.trim();
    const fingerprints = (process.env.TWA_SHA256_FINGERPRINTS ?? "")
        .split(",")
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);

    const body = pkg && fingerprints.length > 0
        ? [{
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
                namespace: "android_app",
                package_name: pkg,
                sha256_cert_fingerprints: fingerprints,
            },
        }]
        : [];

    return NextResponse.json(body, {
        headers: {
            "Content-Type": "application/json",
            // Google Play verifikatori vaqti-vaqti bilan qayta o'qiydi
            "Cache-Control": "public, max-age=3600",
        },
    });
}
