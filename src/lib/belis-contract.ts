// Belis sarpo ijara shartnomasi — mijoz booking'da qabul qiladi.
// Bo'limlar structured shaklda saqlanadi — UI'da render qilinadi va PDF'ga eksport qilinishi mumkin.
//
// Huquqiy tekshiruvdan o'tishi kerak (v1.0 launch'gacha). Hozircha ishlaydigan qora nusxa.

export const BELIS_CONTRACT_VERSION = "2026-09-03";

export interface ContractSection {
    n: number;
    title: string;
    items: string[];
}

export const BELIS_CONTRACT_SECTIONS: ContractSection[] = [
    {
        n: 1,
        title: "Umumiy qoidalar",
        items: [
            "Ushbu shartnoma \"Belis\" (bundan buyon — Ijaraga beruvchi) va mijoz (bundan buyon — Ijarachi) o'rtasida sarpo qutilarini ijaraga berish shartlarini tartibga soladi.",
            "Sarpo qutilari komplekt yoki alohida holda ijaraga beriladi.",
            "Ijaraga olingan mahsulotlarga egalik huquqi Ijaraga beruvchida qoladi. Ijarachi faqat vaqtinchalik foydalanish huquqiga ega.",
        ],
    },
    {
        n: 2,
        title: "Ijara muddati",
        items: [
            "Mahsulot marosim kunidan 1 (bir) kun oldin Ijarachiga topshiriladi.",
            "Marosim tugagach eng ko'pi 3 (uch) kun ichida Ijaraga beruvchiga butun holida qaytariladi.",
            "Ijara muddati marosim sanasi tanlanganda avtomatik hisoblanadi (pickup + marosim + qaytish = 4-5 kun).",
            "Muddat cho'zilishi kerak bo'lsa, Ijaraga beruvchi bilan oldindan kelishilishi shart.",
        ],
    },
    {
        n: 3,
        title: "To'lov shartlari",
        items: [
            "Ijara puli va zaklat (garov summa) mahsulot olib ketilayotgan paytda naqd yoki karta orqali to'lanadi.",
            "Ijara puli: kelishilgan kunlik summa × ijara kunlari soni.",
            "Zaklat: mahsulot to'liq narxining 100% miqdorida.",
            "Mahsulot butun va o'z vaqtida qaytarilganda zaklat to'liq qaytariladi.",
            "Yandex kuryer haqini Ijarachi mustaqil to'laydi (ijara summasiga qo'shilmaydi).",
        ],
    },
    {
        n: 4,
        title: "Ijarachi majburiyatlari",
        items: [
            "Mahsulotni butunligicha, dastlabki holida qaytarish.",
            "Ehtiyotkorlik bilan foydalanish, tabiiy eskirish tashqarisidagi zararni yetkazmaslik.",
            "Kechikkan taqdirda darhol Ijaraga beruvchini xabardor qilish.",
            "Pasport nusxasi (rasm) va aloqa ma'lumotlarini rost taqdim etish. Asl pasport ushlab qolinmaydi (qonuniy taqiqlangan).",
        ],
    },
    {
        n: 5,
        title: "Zarar va jarimalar",
        items: [
            "Mahsulot buzilgan/singan/kir bo'lsa: har element uchun tuzatish/almashtirish qiymati zaklatdan ushlab qolinadi.",
            "Mahsulot qaytmagan taqdirda: to'liq bozor narxi undiriladi (zaklat + qo'shimcha to'lov).",
            "Kechikish jarimai: har kun uchun ijara pulining 30% miqdorida qo'shimcha hisoblanadi.",
            "Jarima hisobi qaytish paytida Ijaraga beruvchi tomonidan aniqlanadi va Ijarachiga taqdim etiladi.",
        ],
    },
    {
        n: 6,
        title: "Bekor qilish shartlari",
        items: [
            "Marosim sanasidan 3 kun oldin bekor qilish — to'liq bekor qilish mumkin (agar to'lov qilingan bo'lsa qaytariladi).",
            "Marosim sanasidan 1 kun oldin va undan keyin bekor qilish — ijara pulining 30% ushlab qolinadi.",
            "Pickup kunida bekor qilish — ijara puli qaytarilmaydi.",
        ],
    },
    {
        n: 7,
        title: "Ijaraga beruvchi majburiyatlari",
        items: [
            "Mahsulotni toza, butun va o'z vaqtida taqdim etish.",
            "Zaklatni qonuniy asosda va o'z vaqtida qaytarish.",
            "Yashirin qo'shimcha to'lovlarni qo'llamaslik.",
            "Ijarachining shaxsiy ma'lumotlarini himoya qilish (pasport rasmi 3-shaxslarga berilmaydi).",
        ],
    },
    {
        n: 8,
        title: "Nizolarni hal qilish",
        items: [
            "Barcha kelishmovchiliklar avval muzokara yo'li bilan hal qilinadi.",
            "Kelishmagan taqdirda O'zbekiston Respublikasi qonunchiligi asosida sudda hal qilinadi.",
            "Shartnoma tuzilishi paytida foydalanuvchi Belis'ning saytida (belis.uz) mavjud bo'lgan qoidalar bilan tanishib chiqqan hisoblanadi.",
        ],
    },
];

export const BELIS_CONTRACT_SUMMARY = [
    "Sarpo qutilarini butun holida saqlab qaytarishga rozimen.",
    "Buzilsa/kam qaytsa ijara pulidan qimmatga tushishini tushunaman.",
    "Pasport nusxasi olinadi (asl pasport qaytariladi).",
    "Yandex kuryer to'lovini o'zim to'layman.",
];

/** Shartnoma matnini bir markazlashgan matn sifatida olish (PDF/print uchun). */
export function belisContractPlainText(): string {
    let out = `BELIS — SARPO IJARA SHARTNOMASI\nVersiya: ${BELIS_CONTRACT_VERSION}\n\n`;
    for (const s of BELIS_CONTRACT_SECTIONS) {
        out += `${s.n}. ${s.title.toUpperCase()}\n`;
        for (const it of s.items) out += `   • ${it}\n`;
        out += `\n`;
    }
    return out;
}
