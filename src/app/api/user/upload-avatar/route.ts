import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

// POST /api/user/upload-avatar   form-data: { file: File }
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
    }

    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return NextResponse.json({ error: "invalid_form" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    if (!file || !file.type.startsWith("image/")) {
        return NextResponse.json({ error: "invalid_file" }, { status: 400 });
    }

    // Max 5 MB
    if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `avatars/${session.user.email.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.${ext}`;

    const blob = await put(filename, file, {
        access: "public",
        contentType: file.type,
    });

    // Save URL to profile
    await prisma.userProfile.update({
        where: { email: session.user.email },
        data: { image: blob.url },
    });

    return NextResponse.json({ url: blob.url });
}
