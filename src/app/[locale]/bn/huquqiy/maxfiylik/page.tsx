import type { Metadata } from "next";
import { BnLegalPage } from "@/components/bn/bn-legal";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
    title: "Maxfiylik siyosati",
    description: "Bozor Narxida foydalanuvchi ma'lumotlarini qanday to'playdi, saqlaydi va ishlatadi.",
};

export default function Page() {
    return (
        <BnLegalPage
            title="Maxfiylik siyosati"
            subtitle="Sizning ma'lumotlaringiz — bizning javobgarligimiz"
            updatedAt="2026-08-07"
            iconEl={<Shield className="w-5 h-5" />}
        >
            <h2>1. Qanday ma'lumot to'playmiz</h2>
            <h3>1.1. Siz beradigan ma'lumot</h3>
            <ul>
                <li>Google hisob (ism, email, avatar).</li>
                <li>Humo ID va foydalanuvchi nomi (@username).</li>
                <li>Telefon raqami — sotuvchi va yetkazish uchun.</li>
                <li>Yetkazish manzili (ixtiyoriy tarzda saqlanadi).</li>
            </ul>
            <h3>1.2. Avtomatik yig'iladigan</h3>
            <ul>
                <li>Qurilma turi, brauzer versiyasi, IP-manzil (xavfsizlik uchun).</li>
                <li>Ko'rilgan sahifalar, qidiruv so'zlari (statistika va tavsiyalar uchun).</li>
                <li>Xaridlar tarixi va sevimlilar (shaxsiy tavsiyalar uchun).</li>
            </ul>

            <h2>2. Ma'lumotni qanday ishlatamiz</h2>
            <ul>
                <li>Xarid oqimini boshqarish (savat, buyurtma, to'lov, yetkazish).</li>
                <li>Sizga mos mahsulot tavsiya qilish.</li>
                <li>Sotuvchi bilan aloqa (buyurtmaga tegishli).</li>
                <li>Firibgarlik va kontrafaktdan himoya.</li>
                <li>Xizmat sifatini oshirish.</li>
            </ul>

            <h2>3. Ma'lumotni kimga beramiz</h2>
            <p>Sizning ma'lumotingiz sotilmaydi. Faqat quyidagi hollarda uchinchi tomonlarga uzatiladi:</p>
            <ul>
                <li><strong>Sotuvchi</strong> — buyurtma tafsiloti (ism, telefon, manzil) buyurtma o'z sotuvchisiga.</li>
                <li><strong>To'lov shlyuzi</strong> (Payme/Click/Stripe) — to'lov summasi va tranzaksiya ID.</li>
                <li><strong>Yetkazib berish xizmati</strong> — manzil va telefon.</li>
                <li><strong>Qonun bo'yicha</strong> — davlat organi rasmiy so'rovi bilan.</li>
            </ul>

            <h2>4. Cookie va analitika</h2>
            <p>
                Sayt to'g'ri ishlashi uchun texnik cookie ishlatiladi (sessiya, savat, til). Vercel Analytics
                anonim tarzda sayt statistikasini yig'adi (sizning shaxsingizni aniqlamaydi).
            </p>

            <h2>5. Xavfsizlik</h2>
            <ul>
                <li>Barcha aloqalar HTTPS orqali shifrlanadi.</li>
                <li>Parollar saqlanmaydi — faqat Google OAuth ishlatiladi.</li>
                <li>Sezgir ma'lumotlar (masalan, manzil) AES-256 bilan shifrlanadi.</li>
                <li>Kirish tarixi saqlanadi va shubhali harakatlarda hisob himoyalanadi.</li>
            </ul>

            <h2>6. Ma'lumotni o'chirish</h2>
            <p>
                Hisob va barcha shaxsiy ma'lumotni o'chirish uchun <strong>/id</strong> sahifasidagi
                "Hisobni o'chirish" tugmasidan foydalaning. Buyurtma tarixi (soliq va yuridik sabab bilan) 5 yil
                davomida saqlanishi mumkin, lekin shaxsiy identifikatorlar anonimlashtiriladi.
            </p>

            <h2>7. Bolalar</h2>
            <p>Platforma 13 yoshdan katta shaxslar uchun mo'ljallangan. Bolalar ma'lumotini bilib to'plamaymiz.</p>

            <h2>8. Aloqa</h2>
            <p>
                Ma'lumotingiz haqida savol bo'lsa yoki huquqingizni amalga oshirmoqchi bo'lsangiz:
                <a href="https://t.me/forhumo"> t.me/forhumo</a>.
            </p>
        </BnLegalPage>
    );
}
