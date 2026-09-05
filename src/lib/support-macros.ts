// Support macro javoblar — tez-tez uchraydigan savollarga tayyor javob.
// Admin bir tugma bosib javob yuboradi.

export interface SupportMacro {
    id: string;
    module: string;              // "bn" | "belis" | "market" | "pay" | "general"
    label: string;               // Admin ko'radigan
    body: string;                // Foydalanuvchiga yuboriladigan matn (uz)
    tags?: string[];             // qidiruv uchun
}

export const SUPPORT_MACROS: SupportMacro[] = [
    // Pay
    {
        id: "pay-deposit-test",
        module: "pay",
        label: "Pay - deposit test rejim",
        body: "Salom! Hozircha For Humo Pay test rejimida ishlayapti — real to'lov MChJ tasdiqidan keyin (Payme/Click bilan) faollashtiriladi. Test balans darhol tushadi va boshqa foydalanuvchilarga o'tkazish uchun ishlatiladi. Real pul quyish uchun bir necha kun sabr qiling.",
        tags: ["deposit", "to'lov", "test"],
    },
    {
        id: "pay-withdraw",
        module: "pay",
        label: "Pay - withdraw MChJ kutish",
        body: "Withdraw (chiqarish) hozircha o'chirilgan. MChJ ochilgach kalit qo'yamiz va withdraw darhol ishlaydi. Ma'lumot uchun rahmat!",
        tags: ["withdraw", "chiqarish"],
    },
    // BN
    {
        id: "bn-order-not-arrived",
        module: "bn",
        label: "BN - buyurtma kelmadi",
        body: "Salom! Buyurtma kelmagan bo'lsa, birinchi sotuvchi bilan chat orqali bog'laning (buyurtma sahifasida). 24 soat ichida javob bo'lmasa, biz sotuvchiga eskalatsiya qilamiz va zarur bo'lsa pul qaytaradi (escrow 5 kun ushlanadi).",
        tags: ["order", "buyurtma", "yetkazish"],
    },
    {
        id: "bn-refund",
        module: "bn",
        label: "BN - pul qaytarish",
        body: "Buyurtma bekor qilingan yoki mahsulot yaroqsiz bo'lsa, pul avtomatik hamyoningizga qaytariladi (escrow ushlab turadi, 24 soat ichida). Agar 48 soatdan keyin qaytmagan bo'lsa, ticket ochib xabar bering — biz qo'lda yechim topamiz.",
        tags: ["refund", "qaytarish", "escrow"],
    },
    {
        id: "bn-seller-waitlist",
        module: "bn",
        label: "BN - sotuvchi waitlist",
        body: "Sotuvchi bo'lish uchun /sotuvchi/waitlist ga yozing — hozir MChJ ochilishini kutmoqdamiz. Ochilgach birinchi navbatda sizga qo'ng'iroq qilamiz.",
        tags: ["sotuvchi", "seller", "waitlist"],
    },
    // Belis
    {
        id: "belis-passport",
        module: "belis",
        label: "Belis - passport talabi",
        body: "Belis ijara xizmatida passport rasmi majburiy — bu qutilarni himoyalash uchun. Rasm shifrlangan holda saqlanadi va faqat sizning ijara faylida ishlatiladi. Ijara tugagach 30 kundan keyin avtomatik o'chiriladi.",
        tags: ["passport", "hujjat"],
    },
    {
        id: "belis-cancel",
        module: "belis",
        label: "Belis - bekor qilish",
        body: "Rezervni marosim sanasidan 48 soat oldin bekor qilsangiz — depozit to'liq qaytariladi. 48-24 soat orasida — 50% qaytariladi. 24 soatdan kam qolganda — depozit qaytmaydi (biz sizga tayyorgarlik qilgan bo'lamiz).",
        tags: ["cancel", "bekor"],
    },
    // Market
    {
        id: "market-zij-uzs",
        module: "market",
        label: "Market - Zij→UZS migratsiya",
        body: "Humo Market hozircha eski valyuta ('Zij') ko'rsatyapti — biz uni real so'mga (UZS) migratsiya qilmoqdamiz. Buyurtma qilinganda avtomatik so'm hisoblanadi. Bu haftada tozalanadi.",
        tags: ["zij", "market", "valyuta"],
    },
    // General
    {
        id: "gen-password",
        module: "general",
        label: "Google login parol",
        body: "For Humo faqat Google orqali kirishni qo'llaydi — bizda alohida parol yo'q. Kirish uchun Google akkauntingizni ishlating (Gmail parolingiz). Boshqa provayder qo'shilmaydi (huquqiy sabab).",
        tags: ["parol", "login", "google"],
    },
    {
        id: "gen-delete-account",
        module: "general",
        label: "Akkauntni o'chirish",
        body: "Akkauntingizni /id/edit sahifasidan o'chirishingiz mumkin. GDPR bo'yicha ma'lumot 30 kun ichida to'liq o'chiriladi (buyurtma tarixidan tashqari — huquqiy talab). Ma'lumotingizni oldindan /id/eksport dan yuklab oling.",
        tags: ["delete", "o'chirish", "akkaunt", "gdpr"],
    },
    {
        id: "gen-data-export",
        module: "general",
        label: "Ma'lumot eksport (GDPR)",
        body: "Barcha ma'lumotingizni /id/eksport dan JSON tarzida yuklab olishingiz mumkin — profil, buyurtmalar, sharhlar, DM'lar, hamyon tarixi. Fayl faqat siz uchun — hech kim boshqa ko'rmaydi.",
        tags: ["eksport", "export", "gdpr"],
    },
    {
        id: "gen-humoai",
        module: "general",
        label: "Humo AI qanday ishlaydi",
        body: "Humo AI Gemini asosida ishlaydi. /humo sahifasida suzuvchi AI tugmasi bor — u sizning barcha modul haqida savolga javob beradi (balansingiz, buyurtma holati, sarflagan pul). Ma'lumot faqat sizniki uchun.",
        tags: ["ai", "humoai"],
    },
];

export function findMacrosByModule(module: string): SupportMacro[] {
    return SUPPORT_MACROS.filter(m => m.module === module || m.module === "general");
}

export function searchMacros(query: string): SupportMacro[] {
    const q = query.toLowerCase();
    return SUPPORT_MACROS.filter(m =>
        m.label.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q) ||
        (m.tags?.some(t => t.includes(q)) ?? false)
    );
}

export function getMacroById(id: string): SupportMacro | null {
    return SUPPORT_MACROS.find(m => m.id === id) || null;
}
