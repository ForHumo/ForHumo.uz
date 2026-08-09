// Bir marta: BN mahsulotlarini AI moderatsiya noto'g'ri (past ishonch bilan) yashirgan bo'lsa,
// ochish uchun. Kalit-so'z hitiga uchragan mahsulotlarni tegmaydi (ular haqiqiy taqiq).
//
// Ishlatish: DATABASE_URL="..." node scripts/bn-unhide-false-positives.mjs
// (kalit-so'z bilan bloklangan mahsulotlarni tegmaslik uchun bn-moderation.ts qayta ishlatiladi)

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Kalit-so'z regex — bn-moderation.ts dan olingan minimal versiya (BLOCK bo'lgan)
const HARD_BLOCK = [
    // Cho'chqa
    /\bcho['`ʻ]?chqa\b/iu, /\bсвин(ин|ой|ая|ое|ого)/iu, /\bpork\b/iu, /\bham\b/iu, /\bbacon\b/iu,
    // Alkogol
    /\baroq\b/iu, /\barok\b/iu, /\bvodka\b/iu, /\bводка/iu, /\bпиво\b/iu, /\bwhiskey\b/iu,
    /\bmusalas\b/iu, /\bмусаллас/iu, /\bvino\b/iu, /\bвино\b/iu, /\bpivo\b/iu,
    /\bkonyak\b/iu, /\bконьяк/iu, /\bсамогон/iu, /\bараг/iu,
    /\btequila\b/iu, /\brum\b/iu, /\bgin\b/iu, /\bchampagne\b/iu, /\bликер/iu,
    // Dori-darmon
    /\banalgin\b/iu, /\banalgi/iu, /\bnurofen\b/iu, /\baspirin\b/iu, /\bсiтrамон\b/iu,
    /\btabletka\b/iu, /\btablet\b/iu, /\bkapsula\b/iu, /\bmazi\b/iu, /\bmaz\b/iu,
    /\bantibiotik\b/iu, /\bantibiotic\b/iu, /\bvitamin\b/iu, /\bсироп/iu,
    // Tamaki
    /\bsigaret\b/iu, /\bсигаре/iu, /\btamaki\b/iu, /\bтабак/iu, /\bmarlboro\b/iu,
    /\bvape\b/iu, /\biqos\b/iu, /\bэлектронн(ая|ой)\s*сигар/iu,
    // Giyohvand
    /\bnarkotik/iu, /\bнаркот/iu, /\bopiy\b/iu, /\bmarihuana/iu, /\bкокаин/iu,
    // Qurol
    /\bpistolet\b/iu, /\bпистолет/iu, /\bstvol\b/iu, /\bствол/iu,
    // Qalbaki
    /\breplika\b/iu, /\bреплика/iu, /\bкопия\s+1:1/iu, /\bAAA\s*copy/iu,
];

function hasHardBlock(text) {
    const t = (text || "").toLowerCase();
    return HARD_BLOCK.some(re => re.test(t));
}

async function main() {
    const products = await prisma.bnProduct.findMany({
        where: { isActive: false, hidden: true },
        select: { id: true, title: true, description: true, shopId: true },
    });

    console.log(`Topildi ${products.length} yashirin mahsulot`);

    let unhidden = 0;
    let kept = 0;
    for (const p of products) {
        const combined = `${p.title} ${p.description ?? ""}`;
        if (hasHardBlock(combined)) {
            console.log(`  KEPT (kalit-so'z): ${p.title}`);
            kept++;
            continue;
        }
        await prisma.bnProduct.update({
            where: { id: p.id },
            data: { isActive: true, hidden: false },
        });
        // Do'kon productCount denorm
        await prisma.bnShop.update({
            where: { id: p.shopId },
            data: { productCount: { increment: 1 } },
        }).catch(() => {});
        // ModerationFlag statusni tozalash
        await prisma.moderationFlag.updateMany({
            where: { module: "BN", targetType: "BN_PRODUCT", targetId: p.id, status: "AUTO_HIDDEN" },
            data: { status: "KEPT" },
        }).catch(() => {});
        console.log(`  UNHIDDEN: ${p.title}`);
        unhidden++;
    }

    console.log(`\nYakun: ${unhidden} ochildi, ${kept} qoldi (haqiqiy taqiq)`);
    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
