import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Reserved usernames that map to real routes or brand names
const RESERVED = new Set([
    "edit", "verify", "settings", "admin", "api", "help",
    "support", "pay", "market", "nexus", "esport", "ai", "id",
    "forhumo", "humo", "humoid",
]);

// Simple in-memory rate limit: max 40 checks/min per user
const rl = new Map<string, number[]>();
function checkRateLimit(email: string): boolean {
    const now = Date.now();
    const list = (rl.get(email) ?? []).filter(t => now - t < 60_000);
    list.push(now);
    rl.set(email, list);
    return list.length > 40;
}

// GET /api/user/check-username?q=someusername
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (checkRateLimit(session.user.email)) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (!q) return NextResponse.json({ available: false, reason: "empty" });

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(q)) {
        return NextResponse.json({ available: false, reason: "invalid" });
    }

    if (RESERVED.has(q.toLowerCase())) {
        return NextResponse.json({ available: false, reason: "reserved" });
    }

    const existing = await prisma.userProfile.findUnique({
        where: { username: q },
        select: { email: true },
    });

    if (existing && existing.email !== session.user.email) {
        return NextResponse.json({ available: false, reason: "taken" });
    }

    return NextResponse.json({ available: true });
}
