// Belis Fotiha komplekt seed — 1 komplekt (3 nusxa) + 14 quti.
// Placeholder rasmlar (picsum), Sevinch opamning ro'yxati asosida.
// Ishga tushirish: node scripts/belis-seed-fotiha.mjs
//
// TAXMIN narxlar (Sevinch opamdan javob kelgach admin panelda o'zgartiriladi).

import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const KOMPLEKT_SLUG = "fotiha-standart";

// FOTIHA komplekt qutilari (Sevinch opamning ro'yxati)
const ITEMS = [
    { slug: "patir-katta",   kind: "PATIR_KATTA",   nameUz: "Katta patir idish",     qty: 1, dailyRentUzs: 60_000, deposit: 500_000 },
    { slug: "patir-kichik",  kind: "PATIR_KICHIK",  nameUz: "Kichik patir idish",    qty: 1, dailyRentUzs: 40_000, deposit: 300_000 },
    { slug: "togora-1",      kind: "TOGORA",        nameUz: "Tog'ora #1",            qty: 4, dailyRentUzs: 30_000, deposit: 200_000 },
    { slug: "quruq-meva",    kind: "QURUQ_MEVA",    nameUz: "Quruq meva idishi",     qty: 1, dailyRentUzs: 35_000, deposit: 250_000 },
    { slug: "hol-meva",      kind: "HOL_MEVA",      nameUz: "Hol meva idishi",       qty: 1, dailyRentUzs: 35_000, deposit: 250_000 },
    { slug: "holva",         kind: "HOLVA",         nameUz: "Holva idishi",          qty: 1, dailyRentUzs: 35_000, deposit: 200_000 },
    { slug: "tort",          kind: "TORT",          nameUz: "To'rt uchun idish",     qty: 1, dailyRentUzs: 40_000, deposit: 300_000 },
    { slug: "maniken",       kind: "MANIKEN",       nameUz: "Maniken idish",         qty: 2, dailyRentUzs: 50_000, deposit: 400_000 },
    { slug: "parfyum",       kind: "PARFYUM",       nameUz: "Parfyum idishi",        qty: 1, dailyRentUzs: 30_000, deposit: 200_000 },
    { slug: "katta-idish",   kind: "KATTA_IDISH",   nameUz: "Katta idish",           qty: 1, dailyRentUzs: 70_000, deposit: 600_000 },
];

// Yuqoridagi qty larni yig'sak jami 14 quti chiqadi.
// (1+1+4+1+1+1+1+2+1+1 = 14 ✓)

const COMPLEX_PIC = "https://picsum.photos/seed/belis-fotiha/1200/900";

async function main() {
    console.log("[belis-seed] Fotiha komplekt yaratish...");

    // Komplekt
    const komplektData = {
        slug: KOMPLEKT_SLUG,
        kind: "FOTIHA",
        nameUz: "Fotiha to'plami — standart",
        nameRu: "Комплект Фотиха — стандартный",
        descriptionUz: "Fotiha marosimi uchun to'liq 14-quti to'plami. Har komplektga: 1 katta patir idish, 1 kichik patir idish, 4 tog'ora, quruq meva, hol meva, holva, to'rt uchun idish, 2 maniken idish, parfyum idishi va katta idish. Uchun 3 nusxa mavjud.",
        images: [COMPLEX_PIC],
        dailyRentUzs: 800_000,     // TAXMIN — Sevinch opamdan javob kelgach o'zgartiriladi
        deposit: 8_000_000,        // TAXMIN — mahsulot narxining 100%
        itemsCount: 14,
        copyCount: 3,              // 3 nusxa sotib olingan
    };

    const komplekt = await p.belisKomplekt.upsert({
        where: { slug: KOMPLEKT_SLUG },
        create: komplektData,
        update: komplektData,
    });
    console.log(`[belis-seed] Komplekt: ${komplekt.slug} (id=${komplekt.id})`);

    // Qutilar
    let created = 0, updated = 0;
    for (const it of ITEMS) {
        const data = {
            slug: `fotiha-${it.slug}`,
            komplektId: komplekt.id,
            kind: it.kind,
            nameUz: it.nameUz,
            images: [`https://picsum.photos/seed/belis-${it.slug}/600/600`],
            dailyRentUzs: it.dailyRentUzs,
            deposit: it.deposit,
            copyCount: it.qty * komplekt.copyCount,  // 3 komplekt × qty
        };
        const existing = await p.belisItem.findUnique({ where: { slug: data.slug } });
        if (existing) {
            await p.belisItem.update({ where: { slug: data.slug }, data });
            updated++;
        } else {
            await p.belisItem.create({ data });
            created++;
        }
    }
    console.log(`[belis-seed] Qutilar: ${created} yangi, ${updated} yangilangan (jami ${ITEMS.length})`);

    const totalCopies = ITEMS.reduce((s, it) => s + it.qty * komplekt.copyCount, 0);
    console.log(`[belis-seed] Do'kondagi jami: ${totalCopies} quti (${komplekt.copyCount} komplekt × 14 quti)`);
    console.log("[belis-seed] TAMOM. https://belis.uz/katalog");

    await p.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await p.$disconnect();
    process.exit(1);
});
