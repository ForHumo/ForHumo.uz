import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authPartner, withinRateLimit } from "@/lib/partner-auth";

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
  if (!withinRateLimit(partner))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const { id } = await params;
  const profile = await loadOwned(id, partner);
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { getPhone } = await import("@/lib/user-secrets");
  const phone = await getPhone(profile.id);

  return NextResponse.json({
    profileId: profile.id,
    humoId: profile.humoId,
    name: profile.name,
    image: profile.image,
    phone,
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
  if (!withinRateLimit(partner))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const { id } = await params;
  const profile = await loadOwned(id, partner);
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  const data: { name?: string } = {};
  const newPhone = typeof body?.phone === "string" ? body.phone.trim() : undefined;
  if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (Object.keys(data).length === 0 && newPhone === undefined) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const { setPhone, getPhone } = await import("@/lib/user-secrets");
  if (Object.keys(data).length > 0) {
    await prisma.userProfile.update({ where: { id }, data });
  }
  if (newPhone !== undefined) {
    await setPhone(id, newPhone || null);
  }
  const phone = await getPhone(id);
  return NextResponse.json({ ok: true, profileId: id, phone });
}

// DELETE /api/partner/sweet-id/:id — to'liq o'chirish (erasure / GDPR-uslubi).
// SWEET profil + uning identitylari (Identity onDelete: Cascade) o'chiriladi.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const partner = authPartner(req, "");
  if (!partner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!withinRateLimit(partner))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const { id } = await params;
  const profile = await loadOwned(id, partner);
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.userProfile.delete({ where: { id } });
  return NextResponse.json({ ok: true, deleted: id });
}
