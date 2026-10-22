import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { generateHumoId } from "@/lib/humo-id";

// POST /api/user/generate-humo-id   body: { country: "UZ" }
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { country } = (await req.json()) as { country?: string };
    const humoId = await generateHumoId(country);
    if (!humoId) return NextResponse.json({ error: "Could not generate unique ID" }, { status: 500 });
    return NextResponse.json({ humoId });
}
