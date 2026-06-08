import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validatePromo } from "@/lib/market-promo";

// POST /api/market/promo/validate — chegirma oldindan ko'rish
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code, subtotal } = await req.json();
    const res = await validatePromo(code, Number(subtotal) || 0);
    if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json({ discount: res.discount, code: res.code });
}
