// Humo AI logotipini gray fondan chiqarib, shaffof PNG ikonlar yaratamiz
// (huddi BN favicon jarayoni kabi).

import sharp from "sharp";

const SRC = "C:/Users/abduv/Desktop/ForHumo.uz/public/logos/humo-ai-black.png";
const OUT = "C:/Users/abduv/Desktop/ForHumo.uz/public/logos";

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

// 1) Chin qora piksellar mask (kul fondan tashqari)
const mask = Buffer.alloc(width * height, 0);
for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        const i = (y * width + x) * channels;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const maxCh = Math.max(r, g, b);
        const minCh = Math.min(r, g, b);
        if (maxCh < 55 && (maxCh - minCh) < 20) mask[y * width + x] = 255;
    }
}

// 2) Markazdagi eng katta connected cluster (vignette shovqinini olib tashlash)
function flood(sx, sy) {
    const stack = [[sx, sy]];
    const region = [];
    while (stack.length) {
        const [x, y] = stack.pop();
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const k = y * width + x;
        if (mask[k] !== 255) continue;
        mask[k] = 128; region.push(k);
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return region;
}
let best = [];
for (let y = 200; y < 800; y += 30) {
    for (let x = 300; x < 700; x += 30) {
        if (mask[y * width + x] === 255) {
            const r = flood(x, y);
            if (r.length > best.length) best = r;
        }
    }
}

// 3) Bbox + kvadrat kesish
const out = Buffer.alloc(width * height * 4, 0);
let minX = width, minY = height, maxX = 0, maxY = 0;
for (const k of best) {
    const j = k * 4;
    out[j] = 0; out[j + 1] = 0; out[j + 2] = 0; out[j + 3] = 255;
    const x = k % width, y = (k - x) / width;
    if (x < minX) minX = x; if (y < minY) minY = y;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y;
}
console.log(`Cluster: ${best.length} pix, bbox ${maxX - minX + 1}x${maxY - minY + 1}`);

const pad = 10;
const cx = Math.max(0, minX - pad);
const cy = Math.max(0, minY - pad);
const cw = Math.min(width - cx, maxX - minX + 1 + pad * 2);
const ch = Math.min(height - cy, maxY - minY + 1 + pad * 2);
const side = Math.max(cw, ch);
const sq = Buffer.alloc(side * side * 4, 0);
const offX = Math.floor((side - cw) / 2);
const offY = Math.floor((side - ch) / 2);
for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
        const src = ((cy + y) * width + (cx + x)) * 4;
        const dst = ((offY + y) * side + (offX + x)) * 4;
        sq[dst] = out[src]; sq[dst+1] = out[src+1]; sq[dst+2] = out[src+2]; sq[dst+3] = out[src+3];
    }
}

// 4) Faqat cluster piksellarini saqlash — inner teshiklarni saqlaydi
const finalBuf = sq;

const base = sharp(finalBuf, { raw: { width: side, height: side, channels: 4 } });

// Qora versiya (yorug' fon uchun)
await base.clone().resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toFile(`${OUT}/humo-ai-icon-black.png`);

// Oq versiya — sq'dagi alpha bo'yicha, RGB oq
const whiteBuf = Buffer.alloc(side * side * 4, 0);
for (let i = 0; i < side * side; i++) {
    const j = i * 4;
    if (sq[j + 3] > 0) {
        whiteBuf[j] = 255; whiteBuf[j + 1] = 255; whiteBuf[j + 2] = 255; whiteBuf[j + 3] = 255;
    }
}
await sharp(whiteBuf, { raw: { width: side, height: side, channels: 4 } })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toFile(`${OUT}/humo-ai-icon-white.png`);

console.log("Tayyor: humo-ai-icon-black.png, humo-ai-icon-white.png");
