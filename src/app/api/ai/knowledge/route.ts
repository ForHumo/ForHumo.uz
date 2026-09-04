// Foydalanuvchi o'z bilim bazasi (transparency + control).
// GET    /api/ai/knowledge          — barcha faktlar kategoriyalar bilan
// POST   /api/ai/knowledge          — qo'lda fakt qo'shish/yangilash
// DELETE /api/ai/knowledge?id=X     — bir faktni o'chirish
// DELETE /api/ai/knowledge?all=1    — hammasini o'chirish (GDPR)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    listKnowledge, upsertKnowledge, deleteKnowledge, eraseAllKnowledge,
    KNOWLEDGE_CATEGORIES, type KnowledgeCategory,
} from "@/lib/user-knowledge";

export const dynamic = "force-dynamic";

async function meId(email: string): Promise<string | null> {
    const p = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    return p?.id ?? null;
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const id = await meId(session.user.email);
    if (!id) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const facts = await listKnowledge(id);
    // Kategoriya bo'yicha guruh
    const grouped: Record<string, typeof facts> = {};
    for (const cat of KNOWLEDGE_CATEGORIES) grouped[cat] = [];
    for (const f of facts) {
        if (!grouped[f.category]) grouped[f.category] = [];
        grouped[f.category].push(f);
    }

    return NextResponse.json({
        categories: KNOWLEDGE_CATEGORIES,
        grouped,
        total: facts.length,
    });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const id = await meId(session.user.email);
    if (!id) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const cat = String(body?.category ?? "").toLowerCase();
    if (!KNOWLEDGE_CATEGORIES.includes(cat as KnowledgeCategory)) {
        return NextResponse.json({ error: "invalid_category" }, { status: 400 });
    }
    const key = String(body?.key ?? "").trim().slice(0, 60).replace(/\s+/g, "_").toLowerCase();
    const value = String(body?.value ?? "").trim();
    if (!key || !value) return NextResponse.json({ error: "key_value_required" }, { status: 400 });

    const fact = await upsertKnowledge({
        profileId: id,
        category: cat as KnowledgeCategory,
        key,
        value,
        source: "user",
        confidence: 1.0,
        sensitive: !!body?.sensitive,
        verifiedByUser: true,
    });
    if (!fact) return NextResponse.json({ error: "save_failed" }, { status: 500 });

    return NextResponse.json({ ok: true, fact });
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const id = await meId(session.user.email);
    if (!id) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    const url = new URL(req.url);
    if (url.searchParams.get("all") === "1") {
        const count = await eraseAllKnowledge(id);
        return NextResponse.json({ ok: true, deleted: count });
    }
    const factId = url.searchParams.get("id");
    if (!factId) return NextResponse.json({ error: "id_required" }, { status: 400 });
    const ok = await deleteKnowledge(id, factId);
    return NextResponse.json({ ok });
}
