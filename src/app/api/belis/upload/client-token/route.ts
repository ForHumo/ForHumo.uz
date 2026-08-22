// Belis rasm yuklash — Vercel Blob client-token oqimi.
// Foydalanuvchi katta faylni to'g'ridan-to'g'ri Blob'ga yuklaydi (4.5MB
// serverless limitini chetlab o'tadi). Faqat Belis adminlari uchun.

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireBelisAdmin } from "@/lib/belis";

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;
    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async () => {
                const session = await getServerSession(authOptions);
                const gate = await requireBelisAdmin(session?.user?.email);
                if (!gate.ok) throw new Error(gate.error);
                return {
                    allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
                    tokenPayload: JSON.stringify({ profileId: gate.me.id }),
                };
            },
            onUploadCompleted: async () => {
                // Ma'lumot yozish shart emas — Product'ga URL saqlanadi
            },
        });
        return NextResponse.json(jsonResponse);
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Xato" }, { status: 400 });
    }
}
