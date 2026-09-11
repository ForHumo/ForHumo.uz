// DB'da qancha blob URL email'ni ochiq ko'rsatayotganini sanaydi.
// Ishga tushirish: DATABASE_URL="..." node scripts/audit-email-in-blobs.mjs

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Email pattern: har qanday `..._gmail_com_` yoki `..._yahoo_com_` va boshqa
// email domenlarini o'z ichiga oladigan URL — bu bizning eski upload naqshi.
const EMAIL_RE = /_(gmail|yahoo|hotmail|outlook|mail|proton|yandex|icloud|inbox|list|bk|rambler|ya)_(com|ru|uz|net|org|me)_/i;

const shops = await prisma.bnShop.findMany({
    select: { id: true, slug: true, logoUrl: true, coverUrl: true },
});
const products = await prisma.bnProduct.findMany({
    select: { id: true, slug: true, images: true },
});
const banners = await prisma.bnAdBanner.findMany({
    select: { id: true, imageUrl: true },
});

let shopLeaks = 0, productLeaks = 0, bannerLeaks = 0;
const affected = { shops: [], products: [], banners: [] };

for (const s of shops) {
    const urls = [s.logoUrl, s.coverUrl].filter(Boolean);
    for (const u of urls) if (u && EMAIL_RE.test(u)) { shopLeaks++; affected.shops.push({ slug: s.slug, url: u }); break; }
}
for (const p of products) {
    for (const u of p.images) if (u && EMAIL_RE.test(u)) { productLeaks++; affected.products.push({ slug: p.slug, count: p.images.filter(i => EMAIL_RE.test(i)).length }); break; }
}
for (const b of banners) {
    if (b.imageUrl && EMAIL_RE.test(b.imageUrl)) { bannerLeaks++; affected.banners.push({ id: b.id, url: b.imageUrl }); }
}

console.log(`\n=== EMAIL-IN-BLOB LEAK AUDIT ===`);
console.log(`Shops with leak:    ${shopLeaks} / ${shops.length}`);
console.log(`Products with leak: ${productLeaks} / ${products.length}`);
console.log(`Banners with leak:  ${bannerLeaks} / ${banners.length}`);
console.log(`\n--- Ta'sir qilgan yozuvlar (birinchi 5 tasi) ---`);
console.log("Shops:", affected.shops.slice(0, 5));
console.log("Products:", affected.products.slice(0, 5));
console.log("Banners:", affected.banners.slice(0, 5));
console.log(`\nJami tozalash kerak: ${shopLeaks + productLeaks + bannerLeaks} ta yozuv.`);

await prisma.$disconnect();
