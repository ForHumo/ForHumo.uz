import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Country → 2-letter prefix map
const PREFIX_MAP: Record<string, string> = {
    UZ: "UZ", RU: "RU", KZ: "KZ", KG: "KG", TJ: "TJ",
    TM: "TM", AZ: "AZ", GE: "GE", TR: "TR",
    DE: "DE", FR: "FR", GB: "GB", US: "US",
    KR: "KR", JP: "JP", CN: "CN", IN: "IN",
    AE: "AE", SA: "SA",
};

function pad7(n: number): string {
    return String(n).padStart(7, "0");
}

// POST /api/user/generate-humo-id   body: { country: "UZ" }
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { country } = (await req.json()) as { country?: string };
    const prefix = PREFIX_MAP[country?.toUpperCase() ?? ""] ?? "WW";

    // Try up to 15 times to find a unique ID
    for (let attempt = 0; attempt < 15; attempt++) {
        const digits = Math.floor(1_000_000 + Math.random() * 9_000_000); // 7 digits: 1000000–9999999
        const humoId = `${prefix}${pad7(digits)}`;

        const exists = await prisma.userProfile.findUnique({
            where: { humoId },
            select: { id: true },
        });

        if (!exists) {
            return NextResponse.json({ humoId });
        }
    }

    return NextResponse.json({ error: "Could not generate unique ID" }, { status: 500 });
}
