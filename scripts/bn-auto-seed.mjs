// BN AVTO seed — mashina katalogi (marka/model) + chuqur avto qism daraxti + moslik.
// Auto-parts marketplace poydevori. Sergeli avto bozor launch uchun.
//
// Ishga tushirish:
//   DATABASE_URL="postgres://..." node scripts/bn-auto-seed.mjs
//
// Idempotent: slug bo'yicha upsert. Qayta ishga tushsa dublikat yaratmaydi.

import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// ── MASHINA KATALOGI ─────────────────────────────────────────────────────────
// O'zbekistonda haqiqiy ommabop mashinalar. Chevrolet/Daewoo/Ravon (UzAuto) — 95%.
// yearFrom/yearTo — taxminiy ishlab chiqarish oralig'i (null yearTo = hozirgacha).
const MAKES = [
    {
        slug: "chevrolet", name: "Chevrolet", popular: true, order: 1,
        models: [
            { name: "Spark",        yearFrom: 2010, yearTo: null, bodyType: "Xetchbek" },
            { name: "Nexia 3",      yearFrom: 2015, yearTo: null, bodyType: "Sedan" },
            { name: "Cobalt",       yearFrom: 2016, yearTo: null, bodyType: "Sedan" },
            { name: "Gentra",       yearFrom: 2013, yearTo: null, bodyType: "Sedan" },
            { name: "Lacetti",      yearFrom: 2004, yearTo: 2013, bodyType: "Sedan" },
            { name: "Malibu",       yearFrom: 2012, yearTo: 2016, bodyType: "Sedan" },
            { name: "Malibu 2",     yearFrom: 2016, yearTo: null, bodyType: "Sedan" },
            { name: "Captiva",      yearFrom: 2006, yearTo: null, bodyType: "SUV" },
            { name: "Tracker",      yearFrom: 2013, yearTo: null, bodyType: "SUV" },
            { name: "Onix",         yearFrom: 2019, yearTo: null, bodyType: "Sedan" },
            { name: "Monza",        yearFrom: 2019, yearTo: null, bodyType: "Sedan" },
            { name: "Tahoe",        yearFrom: 2000, yearTo: null, bodyType: "SUV" },
            { name: "Equinox",      yearFrom: 2017, yearTo: null, bodyType: "SUV" },
            { name: "Traverse",     yearFrom: 2018, yearTo: null, bodyType: "SUV" },
            { name: "Trailblazer",  yearFrom: 2012, yearTo: null, bodyType: "SUV" },
            { name: "Orlando",      yearFrom: 2011, yearTo: 2018, bodyType: "Minivan" },
            { name: "Epica",        yearFrom: 2006, yearTo: 2011, bodyType: "Sedan" },
            { name: "Aveo",         yearFrom: 2006, yearTo: 2011, bodyType: "Sedan" },
            { name: "Damas",        yearFrom: 1996, yearTo: null, bodyType: "Mikrovan" },
            { name: "Labo",         yearFrom: 1996, yearTo: null, bodyType: "Pikap" },
            { name: "Matiz",        yearFrom: 2001, yearTo: 2015, bodyType: "Xetchbek" },
        ],
    },
    {
        slug: "daewoo", name: "Daewoo", popular: true, order: 2,
        models: [
            { name: "Nexia",   yearFrom: 1995, yearTo: 2008, bodyType: "Sedan" },
            { name: "Nexia 2", yearFrom: 2008, yearTo: 2016, bodyType: "Sedan" },
            { name: "Matiz",   yearFrom: 1998, yearTo: 2015, bodyType: "Xetchbek" },
            { name: "Damas",   yearFrom: 1991, yearTo: null, bodyType: "Mikrovan" },
            { name: "Tico",    yearFrom: 1991, yearTo: 2001, bodyType: "Xetchbek" },
            { name: "Gentra",  yearFrom: 2013, yearTo: 2015, bodyType: "Sedan" },
            { name: "Lacetti", yearFrom: 2004, yearTo: 2013, bodyType: "Sedan" },
            { name: "Nubira",  yearFrom: 1997, yearTo: 2003, bodyType: "Sedan" },
            { name: "Espero",  yearFrom: 1990, yearTo: 1999, bodyType: "Sedan" },
        ],
    },
    {
        slug: "ravon", name: "Ravon", popular: true, order: 3,
        models: [
            { name: "R2",       yearFrom: 2016, yearTo: 2018, bodyType: "Xetchbek" },
            { name: "R3",       yearFrom: 2016, yearTo: null, bodyType: "Sedan" },
            { name: "R4",       yearFrom: 2016, yearTo: null, bodyType: "Sedan" },
            { name: "Nexia R3", yearFrom: 2016, yearTo: null, bodyType: "Sedan" },
            { name: "Gentra",   yearFrom: 2016, yearTo: null, bodyType: "Sedan" },
            { name: "Matiz",    yearFrom: 2016, yearTo: 2018, bodyType: "Xetchbek" },
        ],
    },
    {
        slug: "byd", name: "BYD", popular: true, order: 4,
        models: [
            { name: "Chazor",   yearFrom: 2024, yearTo: null, bodyType: "SUV" },
            { name: "Song Plus", yearFrom: 2023, yearTo: null, bodyType: "SUV" },
            { name: "Han",      yearFrom: 2023, yearTo: null, bodyType: "Sedan" },
            { name: "Tang",     yearFrom: 2023, yearTo: null, bodyType: "SUV" },
        ],
    },
    {
        slug: "lada", name: "Lada (VAZ)", popular: true, order: 5,
        models: [
            { name: "2106",   yearFrom: 1976, yearTo: 2006, bodyType: "Sedan" },
            { name: "2107",   yearFrom: 1982, yearTo: 2012, bodyType: "Sedan" },
            { name: "2114",   yearFrom: 2003, yearTo: 2013, bodyType: "Xetchbek" },
            { name: "Priora", yearFrom: 2007, yearTo: 2018, bodyType: "Sedan" },
            { name: "Granta", yearFrom: 2011, yearTo: null, bodyType: "Sedan" },
            { name: "Vesta",  yearFrom: 2015, yearTo: null, bodyType: "Sedan" },
            { name: "Niva",   yearFrom: 1977, yearTo: null, bodyType: "SUV" },
            { name: "Largus", yearFrom: 2012, yearTo: null, bodyType: "Universal" },
        ],
    },
    {
        slug: "toyota", name: "Toyota", popular: true, order: 6,
        models: [
            { name: "Camry",             yearFrom: 2000, yearTo: null, bodyType: "Sedan" },
            { name: "Corolla",           yearFrom: 2000, yearTo: null, bodyType: "Sedan" },
            { name: "RAV4",              yearFrom: 2005, yearTo: null, bodyType: "SUV" },
            { name: "Land Cruiser 200",  yearFrom: 2007, yearTo: 2021, bodyType: "SUV" },
            { name: "Land Cruiser Prado", yearFrom: 2009, yearTo: null, bodyType: "SUV" },
            { name: "Highlander",        yearFrom: 2013, yearTo: null, bodyType: "SUV" },
        ],
    },
    {
        slug: "hyundai", name: "Hyundai", popular: false, order: 7,
        models: [
            { name: "Sonata",    yearFrom: 2004, yearTo: null, bodyType: "Sedan" },
            { name: "Elantra",   yearFrom: 2006, yearTo: null, bodyType: "Sedan" },
            { name: "Accent",    yearFrom: 2006, yearTo: null, bodyType: "Sedan" },
            { name: "Tucson",    yearFrom: 2004, yearTo: null, bodyType: "SUV" },
            { name: "Santa Fe",  yearFrom: 2006, yearTo: null, bodyType: "SUV" },
            { name: "Creta",     yearFrom: 2016, yearTo: null, bodyType: "SUV" },
        ],
    },
    {
        slug: "kia", name: "Kia", popular: false, order: 8,
        models: [
            { name: "K5",       yearFrom: 2015, yearTo: null, bodyType: "Sedan" },
            { name: "Optima",   yearFrom: 2010, yearTo: 2020, bodyType: "Sedan" },
            { name: "Sportage", yearFrom: 2005, yearTo: null, bodyType: "SUV" },
            { name: "Cerato",   yearFrom: 2008, yearTo: null, bodyType: "Sedan" },
            { name: "Sorento",  yearFrom: 2009, yearTo: null, bodyType: "SUV" },
            { name: "Rio",      yearFrom: 2011, yearTo: null, bodyType: "Sedan" },
        ],
    },
    {
        slug: "nissan", name: "Nissan", popular: false, order: 9,
        models: [
            { name: "Almera",  yearFrom: 2012, yearTo: null, bodyType: "Sedan" },
            { name: "Qashqai", yearFrom: 2013, yearTo: null, bodyType: "SUV" },
            { name: "X-Trail", yearFrom: 2013, yearTo: null, bodyType: "SUV" },
        ],
    },
    {
        slug: "mercedes", name: "Mercedes-Benz", popular: false, order: 10,
        models: [
            { name: "E-Class", yearFrom: 2000, yearTo: null, bodyType: "Sedan" },
            { name: "C-Class", yearFrom: 2000, yearTo: null, bodyType: "Sedan" },
            { name: "GLE",     yearFrom: 2015, yearTo: null, bodyType: "SUV" },
        ],
    },
];

// ── AVTO QISM DARAXTI (chuqur) ──────────────────────────────────────────────
// "avto" top kategoriya ostiga part-type bo'limlar. Mavjud avto-* childlar saqlanadi.
const AVTO_CHILDREN = [
    { slug: "avto-dvigatel",      name: "Dvigatel qismlari",   nameRu: "Двигатель",        icon: "Cog",          order: 1 },
    { slug: "avto-tormoz",        name: "Tormoz tizimi",       nameRu: "Тормозная система", icon: "Disc3",        order: 2 },
    { slug: "avto-xoduvoy",       name: "Xoduvoy / podveska",  nameRu: "Подвеска",          icon: "Waypoints",    order: 3 },
    { slug: "avto-transmissiya",  name: "Transmissiya / KPP",  nameRu: "Трансмиссия",       icon: "Settings2",    order: 4 },
    { slug: "avto-rul",           name: "Rul boshqaruvi",      nameRu: "Рулевое",           icon: "Navigation",   order: 5 },
    { slug: "avto-kuzov",         name: "Kuzov va tashqi",     nameRu: "Кузов",             icon: "CarFront",     order: 6 },
    { slug: "avto-optika",        name: "Optika / faralar",    nameRu: "Оптика",            icon: "Lightbulb",    order: 7 },
    { slug: "avto-elektr",        name: "Elektr / akkumulyator", nameRu: "Электрика",       icon: "BatteryCharging", order: 8 },
    { slug: "avto-sovutish",      name: "Sovutish tizimi",     nameRu: "Система охлаждения", icon: "Thermometer",  order: 9 },
    { slug: "avto-filtr",         name: "Filtrlar",            nameRu: "Фильтры",           icon: "Filter",       order: 10 },
    { slug: "avto-salon",         name: "Salon / ichki",       nameRu: "Салон",             icon: "Armchair",     order: 11 },
    { slug: "avto-shina",         name: "Shina va disk",       nameRu: "Шины и диски",      icon: "CircleDot",    order: 12 },
    { slug: "avto-moy",           name: "Moy va suyuqliklar",  nameRu: "Масла и жидкости",  icon: "Droplet",      order: 13 },
    { slug: "avto-aksessuar",     name: "Aksessuar",           nameRu: "Аксессуары",        icon: "Package",      order: 14 },
    { slug: "avto-ehtiyot-qismlar", name: "Boshqa ehtiyot qismlar", nameRu: "Прочие запчасти", icon: "Wrench",   order: 15 },
];

// Mavjud seed mahsulotlarni realistik kategoriya + moslikka bog'lash (demo uchun).
// modelSlug'lar quyida makeSlug-modelSlug formatida (slugify bilan mos).
const PRODUCT_FITS = [
    { productSlug: "nexia-3-old-tormoz-kolodka", catSlug: "avto-tormoz",   models: ["chevrolet-nexia-3", "ravon-nexia-r3", "ravon-r3"] },
    { productSlug: "damas-radiator",             catSlug: "avto-sovutish", models: ["chevrolet-damas", "daewoo-damas"] },
    { productSlug: "cobalt-amortizator-juft",    catSlug: "avto-xoduvoy",  models: ["chevrolet-cobalt", "ravon-r4"] },
    { productSlug: "nexia-2-fara-chap",          catSlug: "avto-optika",   models: ["daewoo-nexia-2"] },
];

function slugify(s) {
    return s.toLowerCase()
        .replace(/[’'`]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

async function seed() {
    console.log("🚗 BN AVTO seed boshlandi\n");

    // 1) Marka + model katalog
    console.log("── Marka + model ──");
    const modelBySlug = new Map();
    for (const mk of MAKES) {
        const make = await p.bnCarMake.upsert({
            where: { slug: mk.slug },
            update: { name: mk.name, popular: mk.popular, order: mk.order, isActive: true },
            create: { slug: mk.slug, name: mk.name, popular: mk.popular, order: mk.order, isActive: true },
        });
        let mi = 0;
        for (const md of mk.models) {
            const modelSlug = `${mk.slug}-${slugify(md.name)}`;
            const model = await p.bnCarModel.upsert({
                where: { slug: modelSlug },
                update: { makeId: make.id, name: md.name, yearFrom: md.yearFrom ?? null, yearTo: md.yearTo ?? null, bodyType: md.bodyType ?? null, order: mi, isActive: true },
                create: { slug: modelSlug, makeId: make.id, name: md.name, yearFrom: md.yearFrom ?? null, yearTo: md.yearTo ?? null, bodyType: md.bodyType ?? null, order: mi, isActive: true },
            });
            modelBySlug.set(modelSlug, model.id);
            mi++;
        }
        console.log(`   ✓ ${mk.name} (${mk.models.length} model)`);
    }

    // 2) Avto qism daraxti — "avto" top kategoriya ostiga.
    // Moslik (marka/model/yil) endi BnProductFit orqali — shuning uchun eski
    // attributeSchema'dan mashina identifikatsiyasini olib tashlaymiz, faqat
    // QISM darajasidagi atributlar qoladi (holat, asl, tomon).
    const AVTO_ATTRS = [
        { key: "condition", label: "Holati", labelRu: "Состояние", type: "select", options: ["Yangi", "Ishlatilgan", "Restavratsiya"], required: true, filterable: true },
        { key: "origin",    label: "Asli",   labelRu: "Оригинальность", type: "select", options: ["Original", "Analog", "Dubl"], filterable: true },
        { key: "side",      label: "Tomon",  labelRu: "Сторона", type: "select", options: ["Old", "Orqa", "Chap", "O'ng", "Yuqori", "Past"], filterable: true },
    ];
    console.log("\n── Avto qism daraxti ──");
    let avto = await p.bnCategory.findUnique({ where: { slug: "avto" }, select: { id: true } });
    if (!avto) {
        avto = await p.bnCategory.create({
            data: { slug: "avto", name: "Avto", nameRu: "Авто", icon: "Car", order: 1, isActive: true, attributeSchema: AVTO_ATTRS },
            select: { id: true },
        });
        console.log("   ✓ 'avto' top kategoriya yaratildi");
    } else {
        await p.bnCategory.update({ where: { id: avto.id }, data: { attributeSchema: AVTO_ATTRS } });
        console.log("   ✓ 'avto' attributeSchema tozalandi (moslik → BnProductFit)");
    }
    for (const ch of AVTO_CHILDREN) {
        await p.bnCategory.upsert({
            where: { slug: ch.slug },
            update: { name: ch.name, nameRu: ch.nameRu, icon: ch.icon, order: ch.order, parentId: avto.id, isActive: true },
            create: { slug: ch.slug, name: ch.name, nameRu: ch.nameRu, icon: ch.icon, order: ch.order, parentId: avto.id, isActive: true, attributeSchema: [] },
        });
        console.log(`   └─ ${ch.name}`);
    }

    // 3) Mavjud demo mahsulotlarni kategoriya + moslikka bog'lash
    console.log("\n── Demo mahsulot moslik ──");
    for (const pf of PRODUCT_FITS) {
        const product = await p.bnProduct.findUnique({ where: { slug: pf.productSlug }, select: { id: true } });
        if (!product) { console.log(`   ⚠ ${pf.productSlug}: mahsulot topilmadi (o'tkazildi)`); continue; }
        const cat = await p.bnCategory.findUnique({ where: { slug: pf.catSlug }, select: { id: true } });
        if (cat) await p.bnProduct.update({ where: { id: product.id }, data: { categoryId: cat.id } });
        for (const ms of pf.models) {
            const modelId = modelBySlug.get(ms);
            if (!modelId) { console.log(`   ⚠ model ${ms} topilmadi`); continue; }
            await p.bnProductFit.upsert({
                where: { productId_modelId: { productId: product.id, modelId } },
                update: {},
                create: { productId: product.id, modelId },
            });
        }
        console.log(`   ✓ ${pf.productSlug} → ${pf.catSlug} (${pf.models.length} model)`);
    }

    // 4) Kategoriya productCount denorm (avto shajarasi)
    const avtoCats = await p.bnCategory.findMany({ where: { OR: [{ slug: "avto" }, { parentId: avto.id }] }, select: { id: true } });
    for (const c of avtoCats) {
        const cnt = await p.bnProduct.count({ where: { categoryId: c.id, isActive: true, hidden: false } });
        await p.bnCategory.update({ where: { id: c.id }, data: { productCount: cnt } });
    }

    const [makes, models, fits] = await Promise.all([
        p.bnCarMake.count(), p.bnCarModel.count(), p.bnProductFit.count(),
    ]);
    console.log(`\n✅ Tugadi. Marka=${makes} model=${models} moslik=${fits}\n`);
}

seed()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => p.$disconnect());
