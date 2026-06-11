import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { partnerAuthorized } from "@/lib/partner-auth";

// Hamkor faqat SWEET profillarni o'qiy/yangilay oladi — Google (For Humo)
// foydalanuvchilarining ma'lumotiga teginmaydi.
async function loadSweet(id: string) {
  const p = await prisma.userProfile.findUnique({ where: { id } });
  return p && p.accountType === "SWEET" ? p : null;
}

// GET /api/partner/sweet-id/:id — profilni o'qish
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!partnerAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const profile = await loadSweet(id);
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    profileId: profile.id,
    name: profile.name,
    image: profile.image,
    phone: profile.phone,
  });
}

// PATCH /api/partner/sweet-id/:id — telefon/ismni yangilash (PII Humo ID'da saqlanadi)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!partnerAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const profile = await loadSweet(id);
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: { phone?: string; name?: string } = {};
  if (typeof body?.phone === "string") data.phone = body.phone.trim();
  if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const updated = await prisma.userProfile.update({ where: { id }, data });
  return NextResponse.json({ ok: true, profileId: updated.id, phone: updated.phone });
}
