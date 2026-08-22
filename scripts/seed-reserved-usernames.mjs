// Zaxira usernamelarni DB'ga yuklash. Idempotent — takroran ishga tushirsa
// mavjudlarini yangilaydi, yo'qlarini qo'shadi.
//
// Ishga tushirish:
//   DATABASE_URL="<.env.local dan>" node scripts/seed-reserved-usernames.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// 1. SYSTEM — hech kimga berilmaydi (URL yo'llari, xavfsizlik so'zlari)
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM = [
    "admin", "administrator", "root", "superuser", "sudo",
    "api", "auth", "oauth", "login", "signup", "signin", "logout", "register",
    "forgot", "reset", "verify", "verification", "confirm",
    "support", "help", "contact", "abuse", "dmca", "legal", "terms", "tos",
    "privacy", "policy", "about", "faq", "docs", "documentation",
    "www", "mail", "email", "blog", "news", "press", "media",
    "dev", "developer", "developers", "staff", "team", "moderator", "mod",
    "security", "official", "verified", "system", "null", "undefined",
    "error", "test", "testing", "demo", "example",
    "forhumo", "for_humo", "humo", "humoid", "humo_id",
    "nexus", "market", "esport", "esports", "pay", "alkh", "alkhpay", "ai",
    "settings", "profile", "id", "edit", "delete", "create", "new",
    "notifications", "messages", "chat", "chats", "search", "explore",
    "home", "feed", "trending", "top", "latest",
    "bn", "bozornarxida", "sweet", "sevinch_sweets", "belis", "belisuz",
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. VIP (TOP 50) — kelajakda 10K+ faol foydalanuvchidan keyin sotiladi
//    Hozircha "band" ko'rsatiladi, sotuv info yashirin
// ─────────────────────────────────────────────────────────────────────────────
const VIP_50 = [
    // Premium 3-char
    "vip", "abc", "xyz", "ceo", "pro", "top", "ace",
    // Numbers
    "007", "111", "777", "888", "999", "123", "100",
    // Popular short names (jahon)
    "ali", "sara", "max", "leo", "adam", "noah", "muhammed", "jackson",
    // Power words
    "king", "queen", "boss", "gold", "star", "elite", "luxe", "legend", "hero", "epic",
    // Money
    "money", "cash", "coin", "dollar", "deal",
    // Feelings
    "love", "wow", "magic", "angel",
    // Titles
    "prince", "princess", "style", "brand",
    // Culture / tech
    "music", "art", "dev", "tech", "bot",
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. PERSONAL — foydalanuvchi ro'yxati (62 ta: 32 qarindosh + 3 do'st + 1 partner)
// ─────────────────────────────────────────────────────────────────────────────
const PERSONAL = [
    "ziyo", "ziyovutdin", "zulfiya", "qahramon", "qaxramon", "mamura",
    "jamshid", "dilshod", "iroda", "javlon", "kamoliddin", "kamol",
    "dildora", "ozoda", "jasur", "feruza", "abdulla",
    "abdumannop", "shahriyor", "shaxriyor", "shahzoda", "shaxzoda",
    "aziz", "jalol", "shahnoza", "ramon", "abu", "abduazim",
    "maftuna", "nodira", "diyora", "abdulvohid", "nodir", "laziza",
    "muslima", "ifora", "abdulloh", "imrona", "rayyona", "abdulboriy",
    "qahramonov", "qaxramonov", "qahramonova", "qaxramonova",
    "jorayev", "jurayev", "jorayeva", "jurayeva",
    "ziyovutdinova", "ziyovutdinov",
    "azizov", "azizova",
    "amdulmajidov", "amdulmajidova",
    "vensaker", "vensakerabu",
    "ikromov", "lutfullayev", "zaynitdinov",
    "muhamedov", "muhamedova",
];

// Founder'ga tegishli — o'zi ololadi (assignedToId keyin script'da to'ldiriladi)
const FOUNDER_OWN = ["abduvoris", "aaa", "sevara"];

// ─────────────────────────────────────────────────────────────────────────────
// 4. CELEBRITY — mashhur odam kelsa beriladi
// ─────────────────────────────────────────────────────────────────────────────
const CELEBRITY = [
    // Football
    "cristiano", "ronaldo", "cristianoronaldo", "cr7",
    "messi", "leomessi", "lionelmessi", "neymar", "neymarjr",
    "mbappe", "kylianmbappe", "haaland", "erlinghaaland",
    "benzema", "modric", "vinicius", "salah", "lewandowski",
    "bruno", "brunofernandes", "kane", "harrykane",
    // Basketball
    "lebron", "kobebryant", "kobe", "jordan", "michaeljordan",
    "curry", "stephcurry", "durant", "kevindurant",
    // Boxing / MMA
    "khabib", "mcgregor", "conormcgregor", "fury", "tysonfury",
    // Music
    "kanye", "kanyewest", "drake", "kendricklamar", "kendrick",
    "taylorswift", "beyonce", "rihanna", "madonna",
    "michaeljackson", "mj", "elvis", "elvispresley",
    "eminem", "50cent", "jayz", "snoopdogg",
    "adele", "shakira", "brunomars", "edsheeran",
    // Tech CEOs
    "elonmusk", "elon", "bezos", "jeffbezos", "billgates", "gates",
    "markzuckerberg", "zuckerberg", "zuck",
    "timcook", "tim_cook", "satyanadella", "sundarpichai",
    "samaltman", "sam_altman", "jensenhuang",
    // Politics
    "trump", "donaldtrump", "biden", "joebiden", "obama", "barackobama",
    "putin", "vladimirputin", "zelensky", "volodymyrzelensky",
    "macron", "merkel", "modi", "narendramodi", "erdogan",
    // Entertainment
    "oprah", "tomcruise", "bradpitt", "leonardodicaprio", "leo_dicaprio",
    "angelinajolie", "brad", "willsmith", "denzel",
    "kimkardashian", "kyliejenner", "kendalljenner", "khloekardashian",
    "arianagrande", "selenagomez", "justinbieber",
    // Investors
    "warrenbuffett", "buffett", "raydalio", "cathiewood",
];

// ─────────────────────────────────────────────────────────────────────────────
// 5. BRAND (TRADEMARK) — UZ + MDH + Global
// ─────────────────────────────────────────────────────────────────────────────
const BRAND = [
    // ── O'zbekiston brendlari ──────────────────────────────────────
    "uzum", "uzummarket", "uzumbank", "uzumbusiness",
    "click", "klik", "clickpay", "payme", "paynet",
    "korzinka", "korzinkauz", "makro", "makrouz", "havas",
    "artel", "artelelectronics",
    "ucell", "beeline", "beelineuz", "uzmobile", "mobiuz", "ums", "perfectum",
    "uztelecom", "uzonline",
    "uzcard", "humocard", "milliy",
    "kapitalbank", "hamkorbank", "xalqbank", "agrobank", "asakabank",
    "ipoteka_bank", "ipotekabank", "trastbank", "ipakyulibank", "orient",
    "national_bank", "nbu", "sqb", "davrbank", "aloqabank",
    "chevrolet_uz", "chevroletuz", "uzavtomotors", "uzautosanoat",
    "uzbekistanairways", "uzairways", "silkway",
    "olcha", "zoodmall", "asaxiy", "zoomrad", "onlineuz",
    "myuztelecom", "eskiz", "playmobile",
    "prezident", "president_uz", "gov_uz",
    // ── Rossiya / MDH ──────────────────────────────────────────────
    "yandex", "yandexgo", "yandextaxi", "yandexeats", "yandexmarket",
    "sber", "sberbank", "tinkoff", "tinkoff_bank", "vtb", "alfabank",
    "ozon", "wildberries", "aliexpress", "avito", "drom",
    "vk", "vkontakte", "mailru", "rambler", "kinopoisk",
    "megafon", "mts", "tele2",
    "kaspi", "kaspibank", "halyk", "halykbank",
    "telegram", "telegramx", "durov",
    // ── Global tech ────────────────────────────────────────────────
    "apple", "iphone", "ipad", "macbook", "ios", "macos", "appstore", "apple_store",
    "google", "gmail", "youtube", "chrome", "android", "playstore", "googleplay",
    "microsoft", "windows", "office", "office365", "xbox", "bing", "outlook", "azure",
    "amazon", "aws", "kindle", "alexa", "prime", "amazonprime",
    "meta", "facebook", "instagram", "whatsapp", "threads", "messenger", "oculus", "quest",
    "netflix", "disney", "disneyplus", "hulu", "hbo", "hbomax",
    "spotify", "applemusic", "youtubemusic", "tidal", "soundcloud",
    "tesla", "spacex", "starlink", "twitter", "x", "boringcompany", "neuralink",
    "samsung", "galaxy", "sony", "playstation", "ps5", "nintendo", "switch",
    "lg", "huawei", "xiaomi", "mi", "oppo", "oneplus", "realme", "redmi", "poco", "honor",
    "nvidia", "intel", "amd", "asus", "acer", "dell", "hp", "lenovo", "razer",
    "openai", "chatgpt", "anthropic", "claude", "gemini", "perplexity", "midjourney",
    "github", "gitlab", "bitbucket", "stackoverflow", "wikipedia",
    "figma", "notion", "slack", "discord", "zoom", "teams",
    // ── Global fashion / sport ─────────────────────────────────────
    "adidas", "nike", "puma", "reebok", "underarmour", "newbalance", "asics", "converse",
    "gucci", "louisvuitton", "chanel", "prada", "hermes", "dior", "versace", "balenciaga",
    "burberry", "fendi", "givenchy", "armani", "ralphlauren",
    "zara", "hm", "uniqlo", "gap", "mango", "bershka", "pullandbear",
    "ikea", "walmart", "costco", "target", "carrefour",
    // ── FMCG ───────────────────────────────────────────────────────
    "cocacola", "pepsi", "sprite", "fanta", "mountaindew", "redbull", "monster",
    "mcdonalds", "kfc", "burgerking", "starbucks", "subway", "pizzahut", "dominos", "wendys",
    "nestle", "unilever", "danone",
    // ── Cars ───────────────────────────────────────────────────────
    "toyota", "honda", "bmw", "mercedes", "audi", "volkswagen", "porsche",
    "ferrari", "lamborghini", "maserati", "bugatti", "rollsroyce", "bentley",
    "chevrolet", "ford", "ram", "jeep", "dodge", "cadillac", "gmc", "buick",
    "hyundai", "kia", "mazda", "nissan", "mitsubishi", "subaru", "suzuki",
    "volvo", "peugeot", "renault", "fiat", "citroen",
    // ── Air / Logistics ────────────────────────────────────────────
    "boeing", "airbus", "emirates", "qatarairways", "turkishairlines", "lufthansa", "flydubai",
    "fedex", "ups", "dhl", "aramex", "usps",
    // ── Finance ────────────────────────────────────────────────────
    "visa", "mastercard", "americanexpress", "amex", "paypal", "stripe", "square", "revolut",
    "wise", "transferwise", "coinbase", "binance", "kraken", "kucoin",
    "bitcoin", "btc", "ethereum", "eth", "usdt", "tether",
    // ── Telecom ────────────────────────────────────────────────────
    "vodafone", "verizon", "att", "tmobile", "sprint",
];

// ─────────────────────────────────────────────────────────────────────────────
// 6. COUNTRY — davlat nomlari (ISO + o'zbekcha)
// ─────────────────────────────────────────────────────────────────────────────
const COUNTRIES = [
    // ── MDH + qo'shni ──────────────────────────────────────────────
    "uzbekistan", "ozbekiston", "uzbek", "uzbeklar",
    "russia", "rossiya", "russian_federation",
    "kazakhstan", "qozogiston", "kazakh",
    "kyrgyzstan", "qirgiziston", "kyrgyz",
    "tajikistan", "tojikiston", "tajik",
    "turkmenistan", "turkmaniston", "turkmen",
    "afghanistan", "afgoniston", "afghan",
    "iran", "eron", "persia",
    "china", "xitoy", "chinese",
    "turkey", "turkiya", "turk",
    "azerbaijan", "ozarbayjon", "azerbaijani",
    "georgia", "gruziya", "georgian",
    "armenia", "armaniston", "armenian",
    "belarus", "belorussiya", "belarusian",
    "ukraine", "ukraina", "ukrainian",
    "moldova", "moldovan",
    // ── G'arb / dunyo ──────────────────────────────────────────────
    "usa", "america", "amerika", "unitedstates", "us",
    "canada", "kanada", "mexico", "meksika",
    "uk", "britain", "britaniya", "unitedkingdom", "england", "scotland",
    "france", "fransiya", "germany", "germaniya", "italy", "italiya",
    "spain", "ispaniya", "portugal", "portugaliya",
    "poland", "polsha", "netherlands", "gollandiya", "belgium", "belgiya",
    "switzerland", "shveytsariya", "austria", "avstriya",
    "sweden", "shvetsiya", "norway", "norvegiya", "denmark", "daniya",
    "finland", "finlyandiya", "iceland", "islandiya",
    "greece", "gretsiya", "romania", "ruminya", "bulgaria", "bolgariya",
    "czech", "chexiya", "slovakia", "hungary", "vengriya",
    "croatia", "xorvatiya", "serbia", "serbiya", "bosnia", "albania", "macedonia",
    "japan", "yaponiya", "korea", "koreya", "southkorea", "northkorea",
    "india", "hindiston", "pakistan", "pokiston", "bangladesh",
    "srilanka", "nepal", "bhutan", "mongolia", "mongoliya",
    "indonesia", "indoneziya", "malaysia", "malayziya", "singapore", "singapur",
    "thailand", "tailand", "philippines", "filippin", "vietnam", "vetnam",
    "cambodia", "kambodja", "laos", "myanmar", "burma",
    "egypt", "misr", "saudi", "saudiarabia", "uae", "emirates",
    "qatar", "kuwait", "kuvayt", "iraq", "iroq", "syria", "suriya",
    "israel", "isroil", "palestine", "falastin", "jordan", "iordaniya",
    "lebanon", "livan", "libya", "tunisia", "morocco", "marokash", "algeria",
    "nigeria", "kenya", "ethiopia", "southafrica", "ghana",
    "australia", "avstraliya", "newzealand",
    "brazil", "braziliya", "argentina", "chile", "peru",
    "colombia", "venezuela", "cuba", "kuba", "jamaica",
    // ── O'zbekiston shaharlari ─────────────────────────────────────
    "toshkent", "tashkent", "samarqand", "samarkand", "buxoro", "bukhara",
    "xiva", "khiva", "namangan", "andijon", "andijan", "fargona", "ferghana",
    "qoqon", "kokand", "urganch", "urgench", "qarshi", "karshi", "termiz", "termez",
    "jizzax", "jizzakh", "guliston", "gulistan", "nurafshon", "navoiy", "navoi",
    "nukus", "chirchiq", "chirchik", "angren", "olmaliq", "almalyk", "bekabod",
    "shaxrisabz", "shahrisabz", "muborak", "denov", "quva",
    // ── Katta shaharlar (jahon) ────────────────────────────────────
    "moscow", "moskva", "istanbul", "dubai", "riyadh",
    "london", "paris", "berlin", "rome", "madrid", "amsterdam",
    "newyork", "losangeles", "chicago", "miami", "sanfrancisco",
    "tokyo", "seoul", "beijing", "shanghai", "hongkong",
    "delhi", "mumbai", "bangkok", "jakarta", "singapore",
];

// ─────────────────────────────────────────────────────────────────────────────
// 7. GOVERNMENT — O'zbekiston davlat organlari
// ─────────────────────────────────────────────────────────────────────────────
const GOVERNMENT = [
    "prezident", "president_uz", "oliymajlis", "senat", "vazirlarmahkamasi",
    "mvd", "ichkiishlar", "sgb", "dxx", "milliyxavfsizlik",
    "moliya", "banki", "cbu", "markaziybank", "centralbank",
    "prokuratura", "sud", "adliyavazirligi",
    "vazirlik", "hokimiyat", "hokim",
    "uzstat", "uzinfocom", "uztelecom_gov", "uzsanoat",
    "mintrans", "minsvyaz", "mintruda", "minzdrav",
    "olimpiya", "sport_gov", "yoshlar", "yoshlarish",
    "askariy", "askarlik", "mudofaa",
];

// ─────────────────────────────────────────────────────────────────────────────
// Yordamchi — createMany bilan batch insert (mavjudlarini skip qiladi)
// ─────────────────────────────────────────────────────────────────────────────
async function upsertBatch(usernames, category, opts = {}) {
    const data = [];
    const seen = new Set();
    for (const raw of usernames) {
        const username = String(raw).toLowerCase().replace(/[^a-z0-9_]/g, "");
        if (!username || username.length < 2 || username.length > 30) continue;
        if (seen.has(username)) continue;
        seen.add(username);
        data.push({
            username, category,
            note: opts.note ?? null,
            priceUzs: opts.priceUzs ?? null,
            assignedToId: opts.assignedToId ?? null,
        });
    }
    const res = await prisma.reservedUsername.createMany({ data, skipDuplicates: true });
    console.log(`  ${category}: ${res.count} yangi qo'shildi (${data.length - res.count} allaqachon bor edi)`);
}

async function main() {
    console.log("\n=== Zaxira usernamelar seed ===\n");

    await upsertBatch(SYSTEM, "SYSTEM", { note: "Tizim yo'li — hech kimga berilmaydi" });
    await upsertBatch(VIP_50, "VIP", { note: "TOP 50 VIP — kelajakda sotiladi" });
    await upsertBatch(PERSONAL, "PERSONAL", { note: "Yaqin odamlar uchun — assignedToId keyin belgilanadi" });
    await upsertBatch(FOUNDER_OWN, "PERSONAL", { note: "Founder aylantirilishi mumkin (o'zi/onasi)" });
    await upsertBatch(CELEBRITY, "CELEBRITY", { note: "Rasmiy mashhur odam kelsa beriladi" });
    await upsertBatch(BRAND, "BRAND", { note: "Rasmiy brend vakiliga beriladi" });
    await upsertBatch(COUNTRIES, "COUNTRY", { note: "Davlat/shahar nomi — rasmiy vakilga" });
    await upsertBatch(GOVERNMENT, "GOVERNMENT", { note: "Davlat organi" });

    const total = await prisma.reservedUsername.count();
    console.log(`\nJami zaxira usernamelar: ${total}\n`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
