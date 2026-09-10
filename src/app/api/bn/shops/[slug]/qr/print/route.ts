// Do'kon uchun QR print sahifa — Bozor Narxida brendi bilan (premium).
// GET /api/bn/shops/[slug]/qr/print?size=a5|a4&theme=dark|light&langs=uz,ru,en
// Ochilishi bilan window.print() chaqiriladi (chop qilishga tayyor).

import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// BN palitrasi
const BN_GOLD = "#F5B301";
const BN_DARK = "#0F0F14";
const BN_DARK_2 = "#1A1A24";     // Gradient uchun ikkinchi ton
const BN_LIGHT_2 = "#FFFDF5";    // Tongi gradient uchun toza fon

type Lang = "uz" | "ru" | "en";
type Theme = "dark" | "light";

interface Copy {
    headline: string;
    accent: string;
    steps: [string, string, string, string];
    footer: string;
}

const COPY: Record<Lang, Copy> = {
    uz: {
        headline: "QR ni skan qiling —",
        accent: "bir bosishda xarid",
        steps: [
            "Kameraga QR ni ushlang",
            "Mahsulotni tanlang",
            "For Pay bilan to'lang",
            "Yoki tarixga qo'shing",
        ],
        footer: "Toshkent · marketplace",
    },
    ru: {
        headline: "Скан QR —",
        accent: "покупка в один клик",
        steps: [
            "Наведите камеру на QR",
            "Выберите товар",
            "Оплатите через For Pay",
            "Или добавьте в историю",
        ],
        footer: "Ташкент · маркетплейс",
    },
    en: {
        headline: "Scan the QR —",
        accent: "shop in one tap",
        steps: [
            "Point the camera at the QR",
            "Pick a product",
            "Pay with For Pay",
            "Or add to your history",
        ],
        footer: "Tashkent · marketplace",
    },
};

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
    const { slug } = await ctx.params;
    const url = new URL(req.url);
    const size = url.searchParams.get("size") === "a4" ? "a4" : "a5";
    const theme: Theme = url.searchParams.get("theme") === "light" ? "light" : "dark";
    const langsRaw = url.searchParams.get("langs") ?? "uz";
    const langs: Lang[] = langsRaw
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter((l): l is Lang => ["uz", "ru", "en"].includes(l));
    if (langs.length === 0) langs.push("uz");

    const shop = await prisma.bnShop.findUnique({
        where: { slug },
        select: {
            name: true, logoUrl: true,
            city: true,
            market: { select: { name: true } },
        },
    });
    if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const target = `https://bozornarxida.uz/d/${slug}?scan=1&utm_source=qr&utm_medium=in_shop`;

    // BN logolarini base64 sifatida embed qilamiz (external URL bo'lmasin — chop dialog ishlaydi)
    const logoMark = await loadLogoAsBase64(theme === "dark" ? "logo-mark-dark.png" : "logo-mark.png");
    const logoFull = await loadLogoAsBase64(theme === "dark" ? "logo-dark.png" : "logo.png");
    const qrDataUrl = await QRCode.toDataURL(target, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 720,
        color: {
            dark: theme === "dark" ? BN_DARK : BN_DARK,     // Ikki holatda ham qora QR (skanerlash uchun)
            light: "#FFFFFF",
        },
    });

    const location = shop.market?.name
        ? `${shop.market.name}${shop.city ? " · " + shop.city : ""}`
        : shop.city ?? "Toshkent";

    const width = size === "a4" ? 780 : 560;
    const qrSize = size === "a4" ? 460 : 340;

    const isDark = theme === "dark";

    // CSS o'zgaruvchilar tema bo'yicha
    const cssVars = isDark ? {
        pageBg: `radial-gradient(ellipse at top, ${BN_DARK_2} 0%, ${BN_DARK} 65%)`,
        cardBg: `linear-gradient(180deg, ${BN_DARK_2} 0%, ${BN_DARK} 100%)`,
        cardBorder: "rgba(245, 179, 1, 0.22)",
        cardShadow: "0 32px 60px -20px rgba(0,0,0,0.55), 0 8px 24px -8px rgba(245, 179, 1, 0.15)",
        textPrimary: "#FFFFFF",
        textSecondary: "#B4B4C0",
        textMuted: "#7A7A88",
        stepBg: "rgba(245, 179, 1, 0.08)",
        stepText: "#FFFFFF",
        divider: "rgba(255,255,255,0.08)",
        shopLogoBg: "#0A0A10",
        qrOuter: BN_DARK,
        qrFrameBg: "#FFFFFF",
        qrShadow: "0 0 0 3px rgba(245,179,1,0.35), 0 20px 40px -8px rgba(245,179,1,0.25)",
        badgeStroke: BN_GOLD,
        urlBg: "rgba(255,255,255,0.05)",
    } : {
        pageBg: `radial-gradient(ellipse at top, ${BN_LIGHT_2} 0%, #F0EEE4 100%)`,
        cardBg: "#FFFFFF",
        cardBorder: "rgba(15, 15, 20, 0.10)",
        cardShadow: "0 32px 60px -20px rgba(0,0,0,0.20), 0 8px 24px -8px rgba(0,0,0,0.08)",
        textPrimary: BN_DARK,
        textSecondary: "#4A4A55",
        textMuted: "#8A8A95",
        stepBg: "rgba(245, 179, 1, 0.12)",
        stepText: BN_DARK,
        divider: "rgba(15,15,20,0.08)",
        shopLogoBg: "#F5F3EA",
        qrOuter: BN_DARK,
        qrFrameBg: "#FFFFFF",
        qrShadow: "0 0 0 3px rgba(245,179,1,0.55), 0 20px 40px -8px rgba(15,15,20,0.15)",
        badgeStroke: BN_DARK,
        urlBg: "rgba(15,15,20,0.04)",
    };

    // Ko'p tilda step matnini tayyorlaymiz
    const stepTexts: string[][] = [[], [], [], []];
    for (const l of langs) {
        COPY[l].steps.forEach((s, i) => stepTexts[i].push(s));
    }
    const headlineHtml = langs
        .map(l => `<div class="hl-row"><span>${escapeHtml(COPY[l].headline)}</span> <span class="accent">${escapeHtml(COPY[l].accent)}</span></div>`)
        .join("");
    const footerText = langs.map(l => COPY[l].footer).join(" · ");

    const html = `<!doctype html>
<html lang="${langs[0]}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(shop.name)} · Bozor Narxida QR</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: ${cssVars.pageBg};
    color: ${cssVars.textPrimary};
    font-family: -apple-system, "Segoe UI", "Inter", Roboto, "Helvetica Neue", Arial, sans-serif;
    min-height: 100vh;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .card {
    width: ${width}px;
    background: ${cssVars.cardBg};
    border-radius: 32px;
    padding: 40px 36px 32px;
    border: 1px solid ${cssVars.cardBorder};
    box-shadow: ${cssVars.cardShadow};
    position: relative;
    overflow: hidden;
  }
  /* Yuqori accent chizig'i */
  .card::before {
    content: ""; position: absolute; inset: 0 0 auto 0; height: 5px;
    background: linear-gradient(90deg, ${BN_DARK} 0%, ${BN_DARK} 40%, ${BN_GOLD} 40%, ${BN_GOLD} 100%);
    ${isDark ? "" : "opacity: 1;"}
  }
  /* Fondagi zaif dekor */
  .card::after {
    content: ""; position: absolute;
    right: -80px; bottom: -80px;
    width: 240px; height: 240px;
    background: radial-gradient(circle, ${BN_GOLD}22 0%, transparent 65%);
    pointer-events: none;
    ${isDark ? "" : "opacity: 0.6;"}
  }

  /* ── Brand header ── */
  .brand { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }
  .brand-logo { height: 44px; width: auto; display: block; }
  .brand-text .row { display: flex; align-items: baseline; font-weight: 900; font-size: 22px; letter-spacing: -0.5px; line-height: 1; }
  .brand-text .b { color: ${cssVars.textPrimary}; }
  .brand-text .n { color: ${BN_GOLD}; }
  .brand-text .sub {
    display: block; font-size: 10.5px; color: ${cssVars.textMuted}; font-weight: 700; margin-top: 5px; letter-spacing: 1.2px; text-transform: uppercase;
  }

  /* ── Shop info ── */
  .shop-block {
    margin-top: 26px; display: flex; align-items: center; gap: 14px;
    padding-bottom: 22px; border-bottom: 1.5px dashed ${cssVars.divider};
    position: relative; z-index: 1;
  }
  .shop-logo {
    width: 60px; height: 60px; border-radius: 16px; overflow: hidden;
    background: ${cssVars.shopLogoBg}; display: grid; place-items: center; flex-shrink: 0;
    border: 1px solid ${cssVars.divider};
  }
  .shop-logo img { width: 100%; height: 100%; object-fit: cover; }
  .shop-logo-fallback { width: 28px; height: 28px; color: ${cssVars.textMuted}; }
  .shop-name { font-weight: 900; font-size: 26px; letter-spacing: -0.7px; line-height: 1.1; color: ${cssVars.textPrimary}; }
  .shop-loc { color: ${cssVars.textSecondary}; font-size: 13px; margin-top: 5px; font-weight: 600; }

  /* ── QR ── */
  .qr-wrap { margin: 30px auto 20px; display: flex; justify-content: center; position: relative; z-index: 1; }
  .qr-frame {
    width: ${qrSize + 28}px; height: ${qrSize + 28}px;
    padding: 14px; background: ${cssVars.qrFrameBg}; border: 3px solid ${cssVars.qrOuter};
    border-radius: 22px; position: relative;
    box-shadow: ${cssVars.qrShadow};
  }
  .qr-frame img { width: 100%; height: 100%; display: block; }
  /* Markazdagi logo badge */
  .qr-badge {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 64px; height: 64px; background: ${cssVars.qrFrameBg}; border-radius: 14px;
    display: grid; place-items: center; border: 3px solid ${cssVars.badgeStroke};
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    overflow: hidden;
  }
  .qr-badge img { width: 44px; height: 44px; object-fit: contain; display: block; }

  /* ── Headline ── */
  .headline { text-align: center; margin-top: 22px; position: relative; z-index: 1; }
  .hl-row { font-weight: 900; font-size: ${langs.length > 1 ? "17px" : "20px"}; line-height: 1.35; color: ${cssVars.textPrimary}; }
  .hl-row .accent { color: ${BN_GOLD}; }
  .hl-row:not(:first-child) { opacity: 0.85; }

  /* ── Steps ── */
  .steps { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; position: relative; z-index: 1; }
  .step {
    padding: 12px 14px; background: ${cssVars.stepBg}; border-radius: 14px;
    display: flex; align-items: flex-start; gap: 10px;
    border: 1px solid ${cssVars.divider};
  }
  .step-num {
    width: 26px; height: 26px; border-radius: 50%; background: ${BN_GOLD}; color: ${BN_DARK};
    font-weight: 900; font-size: 13px; display: grid; place-items: center; flex-shrink: 0;
  }
  .step-content { flex: 1; min-width: 0; }
  .step-lang { font-size: ${langs.length > 1 ? "11.5px" : "13px"}; font-weight: 700; line-height: 1.35; color: ${cssVars.stepText}; }
  .step-lang:not(:first-child) { margin-top: 3px; opacity: 0.72; font-weight: 600; }

  /* ── Footer ── */
  .footer {
    margin-top: 24px; padding-top: 18px; border-top: 1px solid ${cssVars.divider};
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    position: relative; z-index: 1;
  }
  .url {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10.5px; color: ${cssVars.textMuted}; word-break: break-all;
    background: ${cssVars.urlBg}; padding: 5px 8px; border-radius: 6px;
  }
  .cashback {
    font-size: 11.5px; font-weight: 800; color: ${BN_DARK};
    padding: 5px 10px; background: ${BN_GOLD}; border-radius: 7px;
    flex-shrink: 0;
  }

  @media print {
    html, body { background: ${isDark ? BN_DARK : "#FFFFFF"}; }
    .page { padding: 0; min-height: auto; }
    .card {
      box-shadow: none;
      border-radius: 0;
      ${isDark ? "" : "border: none;"}
    }
    @page { size: ${size === "a4" ? "A4" : "A5"}; margin: 10mm; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="card">
    <!-- Brand header -->
    <div class="brand">
      ${logoFull
          ? `<img class="brand-logo" src="${logoFull}" alt="Bozor Narxida" />`
          : `<div class="brand-text">
                 <div class="row"><span class="b">Bozor</span>&nbsp;<span class="n">Narxida</span></div>
                 <span class="sub">${escapeHtml(footerText)}</span>
             </div>`
      }
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
        <div class="qr-badge">
          ${logoMark
              ? `<img src="${logoMark}" alt="BN" />`
              : `<div style="width:100%;height:100%;background:linear-gradient(135deg, ${BN_DARK} 50%, ${BN_GOLD} 50%);display:grid;place-items:center;color:#fff;font-weight:900;font-size:15px;">BN</div>`
          }
        </div>
      </div>
    </div>

    <!-- Headline (ko'p til) -->
    <div class="headline">${headlineHtml}</div>

    <!-- Steps (ko'p til, har qadam ostida boshqa tildagi versiyalar) -->
    <div class="steps">
      ${stepTexts.map((texts, i) => `
        <div class="step">
          <div class="step-num">${i + 1}</div>
          <div class="step-content">
            ${texts.map((t, j) => `<div class="step-lang"${j === 0 ? "" : ' data-alt="1"'}>${escapeHtml(t)}</div>`).join("")}
          </div>
        </div>
      `).join("")}
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="url">${escapeHtml(target.replace(/^https?:\/\//, ""))}</div>
      <div class="cashback">bozornarxida.uz</div>
    </div>
  </div>
</div>

<script>
  window.addEventListener("load", () => {
    setTimeout(() => window.print(), 500);
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

async function loadLogoAsBase64(filename: string): Promise<string | null> {
    try {
        const filePath = path.join(process.cwd(), "public", "bn", filename);
        const buf = await fs.readFile(filePath);
        return `data:image/png;base64,${buf.toString("base64")}`;
    } catch {
        return null;
    }
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
