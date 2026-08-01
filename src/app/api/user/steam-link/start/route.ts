import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildSteamAuthUrl } from "@/lib/steam";

// GET /api/user/steam-link/start — Steam OpenID sahifasiga yo'naltirish.
// Login EMAS: kirgan Google foydalanuvchisi Steam ID'sini bog'laydi.
// ?from=/esport/onboarding — muvaffaqiyatdan keyin qaytariladigan sahifa (default: /esport)
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const url = new URL(req.url);
    const from = url.searchParams.get("from") || "/esport";
    // Faqat ichki sahifalarga qaytamiz (open-redirect'dan himoya)
    const safeFrom = from.startsWith("/") && !from.startsWith("//") ? from : "/esport";
    const returnTo = `/api/user/steam-link/callback?from=${encodeURIComponent(safeFrom)}`;

    return NextResponse.redirect(buildSteamAuthUrl(returnTo));
}
