// BN logo: 1024x1024 PNG (oq fon) → kerakli formatlar.
// Ishga tushirish: node scripts/bn-logo.mjs
//
// Chiqadi (public/bn/):
//   logo.png        512  shaffof fon, asl ranglar (och fon uchun)
//   logo-dark.png   512  shaffof fon, qora → oq (to'q fon uchun)
//   logo-mark.png   256  belgi (kvadrat, shaffof)
//   favicon.png      64  brauzer tab
//   apple-icon.png  180  iOS
//   og.png         1200x630  ulashuv rasmi (to'q fon + logo)

import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "public/bn/2-version.png";
const OUT = "public/bn";

const isWhite = (r, g, b) => r > 238 && g > 238 && b > 238;
const isGold  = (r, g, b) => r > 130 && r > b + 55 && g > b + 20;

/** Oq fonni shaffof qilish + kerak bo'lsa qorani ochga aylantirish */
async function process({ invertDark }) {
    const img = sharp(SRC).ensureAlpha();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;

    let minX = width, minY = height, maxX = -1, maxY = -1;

    for (let i = 0; i < data.length; i += channels) {
        const r = data[i], g = data[i + 1], b = data[i + 2];

        if (isWhite(r, g, b)) {
            data[i + 3] = 0;                       // oq fon → shaffof
            continue;
        }

        const px = (i / channels) | 0;
        const x = px % width, y = (px / width) | 0;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        if (invertDark && !isGold(r, g, b)) {
            // Qora/kulrang qismni ochga aylantiramiz (yorqinligini teskari qilib)
            const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
            const v = Math.round(250 - lum * 90);  // qora→250, kulrang→~200
            data[i] = v; data[i + 1] = v; data[i + 2] = v;
        }
    }

    const pad = 8;
    const left = Math.max(0, minX - pad);
    const top = Math.max(0, minY - pad);
    const w = Math.min(width - left, maxX - minX + pad * 2);
    const h = Math.min(height - top, maxY - minY + pad * 2);

    return sharp(data, { raw: { width, height, channels } })
        .extract({ left, top, width: w, height: h })
        .png();
}

async function main() {
    await mkdir(OUT, { recursive: true });

    const light = await process({ invertDark: false });
    const dark  = await process({ invertDark: true });

    // Kvadratga joylash (logo kvadrat emas — markazlashtiramiz)
    const square = (pipeline, size) =>
        pipeline.clone().resize(size, size, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        });

    await square(light, 512).toFile(`${OUT}/logo.png`);
    await square(dark, 512).toFile(`${OUT}/logo-dark.png`);
    await square(light, 256).toFile(`${OUT}/logo-mark.png`);
    await square(dark, 256).toFile(`${OUT}/logo-mark-dark.png`);

    // Favicon va apple-icon — qora fon bilan (iOS home screen oq fonda ko'rinsin)
    // Fon: BN scope surface (#17171B)
    async function withBg(pipeline, size, radius = 0) {
        const inner = await pipeline.clone().resize(Math.round(size * 0.72), Math.round(size * 0.72), {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        }).toBuffer();
        const bg = sharp({
            create: { width: size, height: size, channels: 4, background: { r: 23, g: 23, b: 27, alpha: 1 } },
        }).composite([{ input: inner, gravity: "center" }]).png();

        if (radius > 0) {
            // iOS o'zi rounded qiladi — biz PNG'da yumaloq shakl chizmaymiz
            void radius;
        }
        return bg;
    }

    await (await withBg(dark, 64)).toFile(`${OUT}/favicon.png`);
    await (await withBg(dark, 180)).toFile(`${OUT}/apple-icon.png`);

    // OG rasm — to'q fon + markazda logo
    const markBuf = await square(dark, 300).toBuffer();
    await sharp({
        create: { width: 1200, height: 630, channels: 4, background: { r: 21, g: 21, b: 26, alpha: 1 } },
    })
        .composite([{ input: markBuf, gravity: "center" }])
        .png()
        .toFile(`${OUT}/og.png`);

    console.log("Tayyor:");
    for (const f of ["logo.png", "logo-dark.png", "logo-mark.png", "logo-mark-dark.png", "favicon.png", "apple-icon.png", "og.png"]) {
        const m = await sharp(`${OUT}/${f}`).metadata();
        console.log(`  ${f.padEnd(20)} ${m.width}x${m.height}`);
    }
}

main().catch(e => { console.error(e); process.exit(1); });
