import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

// POST /api/market/upload  form-data: { file: File, kind?: "product"|"brand" }
// Rasmni qurilmadan Vercel Blob ga yuklaydi, public URL qaytaradi.
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!process.env.BLOB_READ_WRITE_TOKEN)
        return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });

    let formData: FormData;
    try { formData = await req.formData(); }
    catch { return NextResponse.json({ error: "invalid_form" }, { status: 400 }); }

    const file = formData.get("file") as File | null;
    const kind = (formData.get("kind") as string) || "product";

    if (!file || !file.type.startsWith("image/"))
        return NextResponse.json({ error: "Faqat rasm yuklash mumkin" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024)
        return NextResponse.json({ error: "Rasm 5 MB dan katta" }, { status: 413 });

    const ext = file.name.split(".").pop() ?? "jpg";
    const safe = session.user.email.replace(/[^a-z0-9]/gi, "_");
    const filename = `market/${kind}/${safe}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

    const blob = await put(filename, file, { access: "public", contentType: file.type });
    return NextResponse.json({ url: blob.url });
}
