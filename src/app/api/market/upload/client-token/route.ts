import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Katta videolar uchun to'g'ridan-to'g'ri brauzerdan Vercel Blob'ga yuklash
// (serverless 4.5MB limitini chetlab o'tadi)
export async function POST(req: Request): Promise<NextResponse> {
    const body = (await req.json()) as HandleUploadBody;
    try {
        const json = await handleUpload({
            body,
            request: req,
            onBeforeGenerateToken: async () => {
                const session = await getServerSession(authOptions);
                if (!session?.user?.email) throw new Error("Unauthorized");
                return {
                    allowedContentTypes: [
                        "video/mp4", "video/webm", "video/quicktime",
                        "video/x-m4v", "video/ogg", "video/x-msvideo", "video/x-matroska",
                    ],
                    maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
                    tokenPayload: JSON.stringify({ email: session.user.email }),
                };
            },
            onUploadCompleted: async () => { /* Vercel callback — lokal muhitda ishlamaydi, kerak emas */ },
        });
        return NextResponse.json(json);
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
}
