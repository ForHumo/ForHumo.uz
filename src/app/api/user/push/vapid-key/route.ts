// VAPID public key — client tomonda push obunani yaratishda kerak.
//   GET /api/user/push/vapid-key

import { NextResponse } from "next/server";

export async function GET() {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
        return NextResponse.json({
            error: "VAPID kalitlar sozlanmagan",
            hint: "Serverga VAPID_PUBLIC_KEY va VAPID_PRIVATE_KEY env qo'shing. Kalitlarni yaratish: npx web-push generate-vapid-keys",
        }, { status: 503 });
    }
    return NextResponse.json({ publicKey: key });
}
