// Do'kon uchun QR print sahifa — Bozor Narxida brendi bilan.
// GET /api/bn/shops/[slug]/qr/print?size=a5|a4
// Ochilishi bilan window.print() chaqiriladi (chop qilishga tayyor).

import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BN_GOLD = "#F5B301";
const BN_DARK = "#0F0F14";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
    const { slug } = await ctx.params;
    const url = new URL(req.url);
    const size = url.searchParams.get("size") === "a4" ? "a4" : "a5";

    const shop = await prisma.bnShop.findUnique({
        where: { slug },
        select: {
            name: true, logoUrl: true,
            city: true,
            market: { select: { name: true } },
        },
    });
    if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // QR bir universal linkga — buyer sahifa'da 2 tugma tanlaydi
    const target = `https://bozornarxida.uz/d/${slug}?scan=1&utm_source=qr&utm_medium=in_shop`;
    const qrDataUrl = await QRCode.toDataURL(target, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 640,
        color: { dark: BN_DARK, light: "#FFFFFF" },
    });

    const location = shop.market?.name
        ? `${shop.market.name}${shop.city ? " · " + shop.city : ""}`
        : shop.city ?? "Toshkent";

    const width = size === "a4" ? 780 : 560;
    const qrSize = size === "a4" ? 460 : 340;

    const html = `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(shop.name)} · Bozor Narxida QR</title>
<style>
  :root { --gold: ${BN_GOLD}; --dark: ${BN_DARK}; --border: #E5E5EA; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #F2F2F5; font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: var(--dark); }
  .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .card {
    width: ${width}px;
    background: #FFFFFF;
    border-radius: 32px;
    padding: 40px 36px 36px;
    box-shadow: 0 24px 60px -20px rgba(0,0,0,0.25), 0 8px 20px -8px rgba(0,0,0,0.10);
    position: relative;
    overflow: hidden;
  }
  .card::before {
    content: ""; position: absolute; inset: 0 0 auto 0; height: 5px;
    background: linear-gradient(90deg, var(--dark) 0%, var(--dark) 45%, var(--gold) 45%, var(--gold) 100%);
  }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-mark {
    width: 44px; height: 44px; border-radius: 12px;
    background: linear-gradient(135deg, var(--dark) 50%, var(--gold) 50%);
    display: grid; place-items: center; color: #FFF;
    font-weight: 900; font-size: 22px; letter-spacing: -0.5px;
    box-shadow: 0 4px 12px rgba(15,15,20,0.15);
  }
  .brand-mark span:nth-child(1) { color: #FFFFFF; }
  .brand-mark span:nth-child(2) { color: #FFFFFF; }
  .brand-text {
    line-height: 1;
  }
  .brand-text .row { display: flex; align-items: baseline; font-weight: 900; font-size: 22px; letter-spacing: -0.5px; }
  .brand-text .b { color: var(--dark); }
  .brand-text .n { color: var(--gold); }
  .brand-text .sub {
    display: block; font-size: 10.5px; color: #6B6B72; font-weight: 600; margin-top: 4px; letter-spacing: 0.4px; text-transform: uppercase;
  }

  .shop-block { margin-top: 26px; display: flex; align-items: center; gap: 14px; padding-bottom: 22px; border-bottom: 2px dashed var(--border); }
  .shop-logo { width: 56px; height: 56px; border-radius: 14px; overflow: hidden; background: #F5F5FA; display: grid; place-items: center; flex-shrink: 0; }
  .shop-logo img { width: 100%; height: 100%; object-fit: cover; }
  .shop-logo-fallback { width: 26px; height: 26px; opacity: 0.35; }
  .shop-name { font-weight: 900; font-size: 26px; letter-spacing: -0.7px; line-height: 1.1; }
  .shop-loc { color: #6B6B72; font-size: 13px; margin-top: 4px; }

  .qr-wrap { margin: 28px auto 18px; display: flex; justify-content: center; }
  .qr-frame {
    width: ${qrSize + 24}px; height: ${qrSize + 24}px;
    padding: 12px; background: #FFFFFF; border: 3px solid var(--dark);
    border-radius: 20px; position: relative;
  }
  .qr-frame::after {
    content: ""; position: absolute; inset: -3px; border-radius: 20px; pointer-events: none;
    background: linear-gradient(135deg, transparent 30%, var(--gold) 50%, transparent 70%); z-index: -1; opacity: 0.5;
  }
  .qr-frame img { width: 100%; height: 100%; display: block; }
  .qr-badge {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 56px; height: 56px; background: #FFFFFF; border-radius: 12px;
    display: grid; place-items: center; border: 3px solid var(--dark);
  }
  .qr-badge-inner {
    width: 40px; height: 40px; border-radius: 8px;
    background: linear-gradient(135deg, var(--dark) 50%, var(--gold) 50%);
    display: grid; place-items: center; color: #FFF; font-weight: 900; font-size: 15px; letter-spacing: -0.5px;
  }

  .headline { text-align: center; font-weight: 900; font-size: 20px; margin-top: 18px; }
  .headline .accent { color: var(--gold); }
  .steps { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .step { padding: 10px 12px; background: #F5F5FA; border-radius: 12px; display: flex; align-items: center; gap: 8px; }
  .step-num { width: 22px; height: 22px; border-radius: 50%; background: var(--gold); color: var(--dark); font-weight: 900; font-size: 12px; display: grid; place-items: center; flex-shrink: 0; }
  .step-txt { font-size: 12.5px; font-weight: 600; line-height: 1.25; }

  .footer { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .url { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: #6B6B72; }
  .cashback { font-size: 11px; font-weight: 700; color: var(--dark); padding: 4px 8px; background: var(--gold); border-radius: 6px; }

  @media print {
    html, body { background: #FFFFFF; }
    .page { padding: 0; min-height: auto; }
    .card { box-shadow: none; border-radius: 0; }
    @page { size: ${size === "a4" ? "A4" : "A5"}; margin: 12mm; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="card">
    <!-- Header: BN logo -->
    <div class="brand">
      <div class="brand-mark"><span>B</span><span>N</span></div>
      <div class="brand-text">
        <div class="row"><span class="b">Bozor</span>&nbsp;<span class="n">Narxida</span></div>
        <span class="sub">Toshkent · marketplace</span>
      </div>
    </div>

    <!-- Shop info -->
    <div class="shop-block">
      <div class="shop-logo">
        ${shop.logoUrl
            ? `<img src="${escapeHtml(shop.logoUrl)}" alt="" />`
            : `<svg class="shop-logo-fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 7l2-4h16l2 4v2a2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0V7z"/><path d="M5 9v11h14V9"/></svg>`
        }
      </div>
      <div>
        <div class="shop-name">${escapeHtml(shop.name)}</div>
        <div class="shop-loc">${escapeHtml(location)}</div>
      </div>
    </div>

    <!-- QR -->
    <div class="qr-wrap">
      <div class="qr-frame">
        <img src="${qrDataUrl}" alt="QR" />
        <div class="qr-badge"><div class="qr-badge-inner">BN</div></div>
      </div>
    </div>

    <!-- Headline + Steps -->
    <div class="headline">QR ni skan qiling — <span class="accent">bir bosishda xarid</span></div>
    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-txt">Kameraga QR ni ushlang</div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-txt">Mahsulotni tanlang</div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-txt">For Pay bilan to&apos;lang</div>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <div class="step-txt">Yoki tarixga qo&apos;shing</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="url">${escapeHtml(target.replace(/^https?:\/\//, ""))}</div>
      <div class="cashback">bozornarxida.uz</div>
    </div>
  </div>
</div>

<script>
  // Ochilgach 400ms kutib print dialogini ochamiz (rasm yuklanishi uchun vaqt)
  window.addEventListener("load", () => {
    setTimeout(() => window.print(), 450);
  });
</script>
</body>
</html>`;

    return new Response(html, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=300",
        },
    });
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
