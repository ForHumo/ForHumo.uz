import { timingSafeEqual } from "node:crypto";

// Hamkor (masalan Sevinch Sweets) server-aro chaqiruvlarini tekshiradi.
// Sevinch `Authorization: Bearer <SEVINCH_PARTNER_KEY>` yuboradi; kalit faqat
// Humo ID va Sevinch serverlarida bo'ladi (HTTPS orqali). Constant-time solishtirish.
export function partnerAuthorized(req: Request): boolean {
  const key = process.env.SEVINCH_PARTNER_KEY;
  if (!key) return false; // kalit sozlanmagan bo'lsa — yopiq (fail-closed)

  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (provided.length !== key.length) return false;

  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(key));
  } catch {
    return false;
  }
}
