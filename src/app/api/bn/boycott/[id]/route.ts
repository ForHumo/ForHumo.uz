import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { isBnOwner } from "@/lib/bn-admin";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnOwner(auth.profileId))) {
        return NextResponse.json({ error: "owner_only" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (typeof body?.name === "string" && body.name.trim().length >= 2) data.name = body.name.trim();
    if (typeof body?.reason === "string" && body.reason.trim().length >= 5) data.reason = body.reason.trim();
    if (typeof body?.detail === "string") data.detail = body.detail.slice(0, 2000) || null;
    if (Array.isArray(body?.aliases)) {
        data.aliases = body.aliases.map((s: unknown) => String(s).trim().toLowerCase()).filter(Boolean).slice(0, 20);
    }
    if (Array.isArray(body?.categories)) {
        data.categories = body.categories.map((s: unknown) => String(s).trim().toLowerCase()).filter(Boolean).slice(0, 10);
    }
    try {
        const updated = await prisma.bnBoycottBrand.update({ where: { id }, data });
        revalidateTag("bn-boycott");
        return NextResponse.json({ ok: true, brand: updated });
    } catch {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnOwner(auth.profileId))) {
        return NextResponse.json({ error: "owner_only" }, { status: 403 });
    }
    const { id } = await params;
    try {
        await prisma.bnBoycottBrand.delete({ where: { id } });
        revalidateTag("bn-boycott");
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
}
