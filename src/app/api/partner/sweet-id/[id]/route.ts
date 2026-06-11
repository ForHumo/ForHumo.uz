import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authPartner } from "@/lib/partner-auth";

// Hamkor faqat O'ZI yaratgan SWEET profillarni o'qiy/yangilay oladi
// (accountType SWEET + origin = tasdiqlangan hamkor). Google (For Humo)
// foydalanuvchilariga yoki boshqa hamkor profillariga teginmaydi.
async function loadOwned(id: string, partner: string) {
  const p = await prisma.userProfile.findUnique({ where: { id } });
  return p && p.accountType === "SWEET" && p.origin === partner ? p : null;
}

// GET /api/partner/sweet-id/:id
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const partner = authPartner(req, "");
  if (!partner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const profile = await loadOwned(id, partner);
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    profileId: profile.id,
    humoId: profile.humoId,
    name: profile.name,
    image: profile.image,
    phone: profile.phone,
  });
}

// PATCH /api/partner/sweet-id/:id — telefon/ismni yangilash (PII Humo ID'da)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const raw = await req.text();
  const partner = authPartner(req, raw);
  if (!partner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const profile = await loadOwned(id, partner);
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  const data: { phone?: string; name?: string } = {};
  if (typeof body?.phone === "string") data.phone = body.phone.trim();
  if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const updated = await prisma.userProfile.update({ where: { id }, data });
  return NextResponse.json({ ok: true, profileId: updated.id, phone: updated.phone });
}
