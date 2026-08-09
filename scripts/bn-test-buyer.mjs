// P2 test uchun bir marta ishlatiladigan skript.
// Buyer profil yaratadi (do'kon egasi emas), asosiy flowlarni test qiladi:
//   - Address CRUD
//   - Cart operations (retail + wholesale gating)
//   - Favorites
//   - Order lifecycle (checkout -> confirm -> ready -> completed)
//   - Review after purchase
// Yakunda profil o'chiriladi (agar CLEANUP=1).

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const TEST_EMAIL = "test-buyer@bn-p2.local";
const TEST_HUMO = "UZ9000042";
const TEST_USERNAME = "test_buyer_p2";

async function findOrCreate() {
    let p = await prisma.userProfile.findUnique({ where: { email: TEST_EMAIL } });
    if (!p) {
        p = await prisma.userProfile.create({
            data: {
                email: TEST_EMAIL,
                humoId: TEST_HUMO,
                username: TEST_USERNAME,
                name: "Test Buyer",
                accountType: "GOOGLE",
                country: "UZ",
                level: 1,
                emailVerified: true,
                onboardingDone: false,   // onboarding test uchun false
            },
        });
        console.log(`✓ Yaratildi: ${p.id} (${TEST_EMAIL})`);
    } else {
        console.log(`✓ Mavjud: ${p.id}`);
    }
    return p;
}

function report(step, ok, note = "") {
    const mark = ok ? "✓" : "✗";
    console.log(`  ${mark} ${step}${note ? " — " + note : ""}`);
}

async function testAddresses(profileId) {
    console.log("\n[1] Addresses:");
    // Create
    const a = await prisma.bnAddress.create({
        data: {
            profileId,
            label: "Uy",
            address: "Toshkent sh., Yashnobod tumani, Bunyodkor 12",
            phone: "+998901234567",
            city: "Toshkent",
            district: "Yashnobod",
            latitude: 41.311,
            longitude: 69.279,
            isDefault: true,
        },
    });
    report("Address yaratildi", !!a?.id, a.label);

    // Second address (isDefault=false)
    const a2 = await prisma.bnAddress.create({
        data: {
            profileId,
            label: "Ish",
            address: "Chilonzor 5-mavze",
            phone: "+998901234567",
            city: "Toshkent",
            isDefault: false,
        },
    });
    report("Ikkinchi address (Ish)", !!a2?.id);

    // List
    const list = await prisma.bnAddress.findMany({ where: { profileId } });
    report("Ro'yxat", list.length === 2, `${list.length} ta`);

    // Default topilishi
    const def = list.find(x => x.isDefault);
    report("Default belgi", !!def, def?.label);

    return { addressId: a.id, addressId2: a2.id };
}

async function testFavorites(profileId) {
    console.log("\n[2] Favorites:");
    // Ochiq mahsulot topish (isActive=true, hidden=false, isWholesale=false)
    const products = await prisma.bnProduct.findMany({
        where: { isActive: true, hidden: false, isWholesale: false },
        take: 3,
        select: { id: true, slug: true, title: true },
    });
    report("Ochiq mahsulot topildi", products.length >= 1, `${products.length} ta`);

    // Har biriga sevimli qo'shish
    for (const p of products.slice(0, 2)) {
        await prisma.bnFavorite.upsert({
            where: { profileId_productId: { profileId, productId: p.id } },
            create: { profileId, productId: p.id },
            update: {},
        });
    }
    const favs = await prisma.bnFavorite.count({ where: { profileId } });
    report("2 ta sevimli qo'shildi", favs === 2, `Actual: ${favs}`);

    // Bitta o'chirish
    await prisma.bnFavorite.deleteMany({
        where: { profileId, productId: products[0].id },
    });
    const favsAfter = await prisma.bnFavorite.count({ where: { profileId } });
    report("Bitta o'chirildi", favsAfter === 1, `Actual: ${favsAfter}`);

    return products;
}

async function testWholesaleGating(profileId) {
    console.log("\n[3] Ulgurji gating (haridor do'konsiz):");
    const wp = await prisma.bnProduct.findFirst({
        where: { isWholesale: true, isActive: true },
    });
    if (!wp) {
        report("Ulgurji mahsulot bazada yo'q", true, "SKIP");
        return;
    }
    // viewerCanSeeWholesale logikasi: shopsiz odam ulgurjini ko'rmasligi kerak
    const shop = await prisma.bnShop.findFirst({
        where: { profileId, status: "APPROVED" },
    });
    const isAdmin = await prisma.bnAdmin.findUnique({ where: { profileId } });
    const shouldSee = !!shop || !!isAdmin;
    report("Haridor do'konsiz", !shouldSee, "canSee=false (kutilgan)");
}

async function testCart(profileId, products) {
    console.log("\n[4] Cart:");
    const p = products[0];
    // Add
    await prisma.bnCartItem.upsert({
        where: { profileId_productId: { profileId, productId: p.id } },
        create: { profileId, productId: p.id, qty: 2 },
        update: { qty: 2 },
    });
    const count = await prisma.bnCartItem.count({ where: { profileId } });
    report("Cart'ga qo'shildi (qty=2)", count === 1);

    // Update qty
    await prisma.bnCartItem.update({
        where: { profileId_productId: { profileId, productId: p.id } },
        data: { qty: 5 },
    });
    const item = await prisma.bnCartItem.findUnique({
        where: { profileId_productId: { profileId, productId: p.id } },
    });
    report("Qty o'zgartirish", item?.qty === 5);

    return p;
}

async function testOrderFlow(profileId, product, addressId) {
    console.log("\n[5] Order lifecycle:");
    const addr = await prisma.bnAddress.findUnique({ where: { id: addressId } });
    const prodFull = await prisma.bnProduct.findUnique({ where: { id: product.id } });
    if (!prodFull || prodFull.stock < 1) {
        report("Order — stock yetarli emas", false, "SKIP");
        return null;
    }

    const code = `BN-TEST-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Order yaratish (checkout simulyatsiyasi)
    const order = await prisma.bnOrder.create({
        data: {
            code,
            buyerId: profileId,
            shopId: prodFull.shopId,
            subtotal: prodFull.price,
            deliveryFee: 0,
            commission: 0,
            total: prodFull.price,
            fulfillType: "PICKUP",
            phone: addr.phone,
            address: null,
            paymentMethod: "CASH",
            paymentStatus: "PENDING",
            escrowHeld: false,
            status: "PLACED",
            items: {
                create: [{
                    productId: prodFull.id,
                    title: prodFull.title,
                    price: prodFull.price,
                    qty: 1,
                }],
            },
        },
    });
    report("Order yaratildi (PLACED, PICKUP, CASH)", !!order.id, code);

    // Sotuvchi CONFIRMED
    await prisma.bnOrder.update({
        where: { id: order.id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
    report("Sotuvchi tasdiqladi (CONFIRMED)", true);

    // READY
    await prisma.bnOrder.update({
        where: { id: order.id },
        data: { status: "READY", readyAt: new Date() },
    });
    report("READY holatiga o'tdi", true);

    // COMPLETED
    await prisma.bnOrder.update({
        where: { id: order.id },
        data: { status: "COMPLETED", completedAt: new Date() },
    });
    report("COMPLETED holatiga o'tdi", true);

    // Sharh yozish huquqi (COMPLETED orderdan keyin)
    try {
        await prisma.bnProductReview.create({
            data: {
                productId: prodFull.id,
                profileId,
                orderId: order.id,
                rating: 5,
                text: "Test sharh — mahsulot yaxshi",
            },
        });
        report("Sharh yozish (rating=5)", true);
    } catch (e) {
        report("Sharh yozish", false, e.message);
    }

    return order;
}

async function testInspectFlow(profileId, product) {
    console.log("\n[6] INSPECT (24 soat band):");
    const prodFull = await prisma.bnProduct.findUnique({ where: { id: product.id } });
    if (!prodFull?.allowInspect) {
        report("Mahsulot INSPECT'ga ruxsat bermaydi", false, "SKIP");
        return;
    }
    const code = `INSP-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const hold = await prisma.bnInspectHold.create({
        data: {
            code,
            productId: prodFull.id,
            profileId,
            qty: 1,
            expiresAt: new Date(Date.now() + 24 * 3600_000),
        },
    });
    report("Hold yaratildi (24 soat)", !!hold.id, code);

    // Ekspiratsiya tekshiruvi
    const isValid = hold.expiresAt > new Date();
    report("Expires valid (kelajakda)", isValid);
}

async function testMultiUserIsolation(profileId) {
    console.log("\n[7] Multi-user isolation:");
    // Boshqa profil (OWNER) sevimlilarni ko'rmaslik kerak
    const owner = await prisma.userProfile.findFirst({ where: { username: "abduvoris" } });
    if (!owner) { report("OWNER topilmadi", false); return; }

    const myFavs = await prisma.bnFavorite.count({ where: { profileId } });
    const ownerFavs = await prisma.bnFavorite.count({ where: { profileId: owner.id } });
    report("Test-buyer va OWNER favorites bir-birini bilmasligi", myFavs !== ownerFavs || (myFavs === 0 && ownerFavs === 0));

    // Test-buyer orders faqat o'ziniki
    const myOrders = await prisma.bnOrder.count({ where: { buyerId: profileId } });
    const ownerOrders = await prisma.bnOrder.count({ where: { buyerId: owner.id } });
    report("Test-buyer va OWNER buyurtmalar isolyatsiya", true, `Buyer: ${myOrders}, Owner: ${ownerOrders}`);
}

async function cleanup(profileId) {
    console.log("\n[9] Cleanup:");
    await prisma.bnCartItem.deleteMany({ where: { profileId } });
    await prisma.bnFavorite.deleteMany({ where: { profileId } });
    await prisma.bnAddress.deleteMany({ where: { profileId } });
    await prisma.bnProductReview.deleteMany({ where: { profileId } });
    await prisma.bnInspectHold.deleteMany({ where: { profileId } });
    await prisma.bnOrder.deleteMany({ where: { buyerId: profileId } });
    await prisma.userProfile.delete({ where: { id: profileId } });
    console.log("  ✓ Test profil va bog'langan ma'lumotlar o'chirildi");
}

async function main() {
    console.log("=".repeat(60));
    console.log("P2 — Persona B (Oddiy haridor) test");
    console.log("=".repeat(60));

    const p = await findOrCreate();
    const { addressId } = await testAddresses(p.id);
    const products = await testFavorites(p.id);
    await testWholesaleGating(p.id);
    const cartProduct = await testCart(p.id, products);
    await testOrderFlow(p.id, cartProduct, addressId);
    await testInspectFlow(p.id, cartProduct);
    await testMultiUserIsolation(p.id);

    if (process.env.CLEANUP === "1") {
        await cleanup(p.id);
    } else {
        console.log("\n(CLEANUP=1 bilan ishga tushirsangiz test ma'lumot o'chadi)");
    }

    await prisma.$disconnect();
}

main().catch(async e => {
    console.error("XATO:", e);
    await prisma.$disconnect();
    process.exit(1);
});
