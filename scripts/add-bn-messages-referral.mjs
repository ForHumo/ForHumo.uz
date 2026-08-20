// BN referral UI i18n
import fs from "node:fs";

const BATCH = {
    uz: {
        referral: {
            title: "Do'stni taklif qiling",
            subtitle: "Do'stingiz birinchi buyurtma bersa — ikkalangizga bonus.",
            youGet: "Siz olasiz",
            friendGets: "Do'stingiz oladi",
            perFriend: "har chaqirilgan do'st uchun",
            firstOrder: "birinchi buyurtmasi uchun",
            yourLink: "Sizning linkingiz",
            copy: "Nusxa olish",
            copied: "Nusxalandi ✓",
            shareTelegram: "Telegramda ulash",
            shareWhatsApp: "WhatsApp'da ulash",
            shareText: "Bozor Narxida — Toshkent bozorlari va do'konlarini onlayn ko'ring, bozor narxidan arzon toping. Mening havolam bilan kirib birinchi buyurtmangizga bonus oling: {url}",
            stats: "Statistika",
            statPending: "Kutilmoqda",
            statRewarded: "Bonusli",
            statTotalEarned: "Jami daromad",
            noCode: "Referral link olish uchun avval Nexus'da username tanlang",
            howItWorks: "Qanday ishlaydi",
            step1: "1. Linkingizni Telegram, WhatsApp yoki SMS orqali ulashing",
            step2: "2. Do'stingiz shu link orqali kirib ro'yxatdan o'tsin",
            step3: "3. U birinchi buyurtmani yakunlagach — ikkangizga hamyoningizga bonus tushadi",
        },
    },
    ru: {
        referral: {
            title: "Пригласите друга",
            subtitle: "Друг сделает первый заказ — бонус вам обоим.",
            youGet: "Вы получите",
            friendGets: "Друг получит",
            perFriend: "за каждого приглашённого друга",
            firstOrder: "за первый заказ",
            yourLink: "Ваша ссылка",
            copy: "Копировать",
            copied: "Скопировано ✓",
            shareTelegram: "Поделиться в Telegram",
            shareWhatsApp: "Поделиться в WhatsApp",
            shareText: "Bozor Narxida — рынки и магазины Ташкента онлайн, дешевле рыночной цены. По моей ссылке получите бонус за первый заказ: {url}",
            stats: "Статистика",
            statPending: "Ожидает",
            statRewarded: "С бонусом",
            statTotalEarned: "Всего заработано",
            noCode: "Чтобы получить реферальную ссылку, сначала выберите username в Nexus",
            howItWorks: "Как это работает",
            step1: "1. Поделитесь ссылкой в Telegram, WhatsApp или SMS",
            step2: "2. Друг перейдёт по ней и зарегистрируется",
            step3: "3. Он завершит первый заказ — бонус придёт в кошельки обоих",
        },
    },
    en: {
        referral: {
            title: "Invite a friend",
            subtitle: "Your friend places their first order — both of you get a bonus.",
            youGet: "You get",
            friendGets: "Your friend gets",
            perFriend: "for every invited friend",
            firstOrder: "for their first order",
            yourLink: "Your link",
            copy: "Copy",
            copied: "Copied ✓",
            shareTelegram: "Share on Telegram",
            shareWhatsApp: "Share on WhatsApp",
            shareText: "Bozor Narxida — Tashkent's markets and shops online, below market price. Use my link and get a bonus on your first order: {url}",
            stats: "Statistics",
            statPending: "Pending",
            statRewarded: "Rewarded",
            statTotalEarned: "Total earned",
            noCode: "To get a referral link, pick a username in Nexus first",
            howItWorks: "How it works",
            step1: "1. Share your link on Telegram, WhatsApp or SMS",
            step2: "2. Your friend opens it and signs up",
            step3: "3. They complete their first order — the bonus lands in both wallets",
        },
    },
};

for (const [lang, groups] of Object.entries(BATCH)) {
    const path = `messages/${lang}.json`;
    const data = JSON.parse(fs.readFileSync(path, "utf8"));
    data.bn = { ...(data.bn ?? {}), ...groups };
    fs.writeFileSync(path, JSON.stringify(data, null, 4) + "\n", "utf8");
    console.log(`✓ ${path} — bn.referral qo'shildi`);
}
