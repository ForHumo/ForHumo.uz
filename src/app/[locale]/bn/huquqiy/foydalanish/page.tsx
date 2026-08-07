import type { Metadata } from "next";
import { BnLegalPage } from "@/components/bn/bn-legal";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
    title: "Foydalanish shartlari",
    description: "Bozor Narxida platformasidan foydalanish qoidalari va shartlari.",
};

export default function Page() {
    return (
        <BnLegalPage
            title="Foydalanish shartlari"
            subtitle="Bozor Narxida (BN) platformasidan foydalanish qoidalari"
            updatedAt="2026-08-07"
            icon={FileText}
        >
            <h2>1. Umumiy qoidalar</h2>
            <p>
                Ushbu shartlar Bozor Narxida (keyingi o'rinlarda — <strong>BN</strong> yoki <strong>Platforma</strong>)
                onlayn marketplace xizmatidan foydalanish qoidalarini belgilaydi. Platforma
                <strong> For Humo</strong> loyihasining bir qismi hisoblanadi. Foydalanuvchi hisob yaratish yoki
                platformadan foydalanish orqali ushbu shartlarga rozilik bildiradi.
            </p>

            <h2>2. Foydalanuvchilar toifalari</h2>
            <ul>
                <li><strong>Xaridor</strong> — mahsulot ko'radi, savatga qo'shadi, buyurtma beradi.</li>
                <li><strong>Sotuvchi</strong> — Toshkent bozorlari va do'konlaridagi mahsulot egasi bo'lib, admin tomonidan tasdiqlangandan keyin BNda o'z do'konini yuritadi.</li>
                <li><strong>Admin</strong> — For Humo jamoasi vakili, arizalarni ko'radi va mojarolarni hal qiladi.</li>
            </ul>

            <h2>3. Hisob va identifikatsiya</h2>
            <p>
                BNda ro'yxatdan o'tish Google orqali amalga oshiriladi (Humo ID). Har foydalanuvchi <strong>UZ</strong>+7
                raqamli noyob Humo ID oladi. Sotuvchi bo'lish uchun qo'shimcha ariza to'ldirilib, admin tomonidan
                tasdiqlanishi shart.
            </p>

            <h2>4. Xarid va to'lov</h2>
            <ol>
                <li>Xaridor mahsulotni tanlaydi va buyurtma beradi.</li>
                <li>To'lov summasi eskrow (kafolat) rejimida ushlanadi.</li>
                <li>Yetkazish yoki olib ketishdan so'ng xaridor "Ko'rib qabul qilish" oynasidan foydalanishi mumkin (INSPECT).</li>
                <li>Buyurtma <strong>COMPLETED</strong> holatiga o'tgach mablag' sotuvchiga o'tadi (komissiya ushlab).</li>
            </ol>

            <h2>5. INSPECT — ko'rib qabul qilish</h2>
            <p>
                Yetkazishda xaridor mahsulotni <strong>24 soat</strong> davomida tekshirish huquqiga ega. Mahsulot
                elonda ko'rsatilganidan farq qilsa yoki nuqsonli bo'lsa, xaridor rad etadi va mablag' to'liq
                qaytariladi. Bu funksiya faqat sotuvchi tomonidan yoqilgan mahsulotlarda ishlaydi.
            </p>

            <h2>6. Man qilinadigan mahsulotlar</h2>
            <ul>
                <li>Qonun bilan taqiqlangan yoki litsenziya talab qiladigan tovarlar (dori, qurol, alkogol, sigareta).</li>
                <li>Kontrafakt yoki qalbaki brend mahsulotlari.</li>
                <li>Buzuq yoki xavfli mahsulotlar.</li>
                <li>Adabsiz yoki kamsituvchi kontent.</li>
            </ul>
            <p>Admin va AI moderatsiya bunday mahsulotlarni yashiradi. Qayta buzilishlarda hisob bloklanadi.</p>

            <h2>7. Sotuvchi mas'uliyati</h2>
            <ul>
                <li>Mahsulot rasmi va tavsifi haqiqatga to'g'ri bo'lishi shart.</li>
                <li>Buyurtma qabul qilingandan keyin belgilangan muddatda yetkazish yoki topshirish.</li>
                <li>Xaridorning shikoyatiga adekvat javob berish.</li>
                <li>Do'konning ish soati va manzili yangilanib turishi.</li>
            </ul>

            <h2>8. Platform mas'uliyati chegarasi</h2>
            <p>
                BN — do'kon va xaridor o'rtasidagi vositachi. Mahsulot sifati uchun sotuvchi javob beradi. Platforma
                to'lovni himoya qiladi (eskrow), mojarolarni ko'radi va zarur bo'lsa mablag'ni qaytaradi.
            </p>

            <h2>9. Shikoyat va mojaro</h2>
            <p>
                Har qanday shikoyat sifatida yoki mahsulotdagi masalada foydalanuvchi mahsulot sahifasidagi
                "Shikoyat qilish" tugmasi orqali admin panelga xabar yuborishi mumkin. Mojaro 3 ish kunida ko'rib
                chiqiladi.
            </p>

            <h2>10. Shartlarni o'zgartirish</h2>
            <p>
                BN ushbu shartlarni bir tomonlama o'zgartirish huquqini o'zida saqlab qoladi. Muhim o'zgarishlar
                haqida foydalanuvchilar oldindan xabardor qilinadi.
            </p>

            <hr />
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                Savollar bo'lsa: <a href="https://t.me/forhumo">t.me/forhumo</a> yoki BNda yordam sahifasi.
            </p>
        </BnLegalPage>
    );
}
