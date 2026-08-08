import type { Metadata } from "next";
import { BnLegalPage } from "@/components/bn/bn-legal";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
    title: "Ommaviy oferta",
    description: "Bozor Narxida platformasida xarid va sotuv shartlarining ommaviy oferta shakli.",
};

export default function Page() {
    return (
        <BnLegalPage
            title="Ommaviy oferta"
            subtitle="Xarid va sotuv shartlari"
            updatedAt="2026-08-07"
            iconEl={<FileText className="w-5 h-5" />}
        >
            <h2>1. Oferta predmeti</h2>
            <p>
                Ushbu hujjat Bozor Narxida (BN) platformasi orqali sotuvchi va xaridor o'rtasida masofaviy tarzda
                mahsulot sotib olish-sotish qoidalarini belgilaydi. BN o'zi mahsulot sotmaydi — u sotuvchi va xaridor
                o'rtasidagi vositachi va to'lov himoyachisi (eskrow).
            </p>

            <h2>2. Tomonlar</h2>
            <ul>
                <li><strong>Sotuvchi</strong> — BN da tasdiqlangan Toshkent yoki boshqa viloyat bozori/do'koni.</li>
                <li><strong>Xaridor</strong> — jismoniy shaxs, BN da hisob ochgan foydalanuvchi.</li>
                <li><strong>Platforma</strong> — For Humo tomonidan yuritiladigan BN xizmati.</li>
            </ul>

            <h2>3. Aksept (rozilik)</h2>
            <p>
                Xaridor "Buyurtmani rasmiylashtirish" tugmasini bosib to'lovni amalga oshirganda oferta aksept
                qilingan hisoblanadi va sotuvchi bilan xarid shartnomasi tuzilgan hisoblanadi.
            </p>

            <h2>4. Narx va to'lov</h2>
            <ul>
                <li>Mahsulot narxi elonda ko'rsatilgan (UZS/USD).</li>
                <li>To'lov Payme/Click/bank kartasi orqali eskrow rejimida ushlanadi.</li>
                <li>Buyurtma yakunlangach (COMPLETED) mablag' sotuvchiga o'tadi (komissiya ushlab).</li>
            </ul>

            <h2>5. Yetkazish va olib ketish</h2>
            <ul>
                <li>Sotuvchi elonda yetkazish yoki olib ketish variantlarini belgilaydi.</li>
                <li>Yetkazish narxi mahsulot narxidan alohida hisoblanadi.</li>
                <li>Yetkazish muddati — Toshkent bo'yicha 1-3 ish kuni, viloyatlarga 3-7 ish kuni (sotuvchidan qarab).</li>
            </ul>

            <h2>6. Ko'rib qabul qilish (INSPECT)</h2>
            <p>
                Sotuvchi bunday variantni yoqgan bo'lsa, xaridor mahsulotni topshirishda tekshirishga haqli.
                Nuqson yoki farq bo'lsa xaridor rad etadi va mablag' 100% qaytariladi.
            </p>

            <h2>7. Bekor qilish va qaytarish</h2>
            <ul>
                <li>Yuborishdan oldin — xaridor bekor qila oladi, mablag' darhol qaytariladi.</li>
                <li>Yuborilgandan keyin — INSPECT rejimida qabul qilmaslik yoki nuqson uchun qaytarish.</li>
                <li>Xarid qilingandan keyin oddiy fikr o'zgargani sababli qaytarish — sotuvchi tomonidan hal etiladi.</li>
            </ul>

            <h2>8. Mojarolar</h2>
            <p>
                Mojaro bo'lsa dastlab sotuvchi bilan aloqa qilish, hal bo'lmasa BN adminiga shikoyat yuborish. Admin
                3 ish kunida ko'rib chiqadi va yakuniy qarorni chiqaradi.
            </p>

            <h2>9. Fors-major</h2>
            <p>
                Tabiiy ofat, urush, epidemiya, davlat organi qarori kabi tomonlarga bog'liq bo'lmagan holatlar
                yuzaga kelganda majburiyatlar bajarilishi to'xtatilishi mumkin.
            </p>

            <h2>10. Rekvizitlar</h2>
            <p>
                <strong>Xizmat egasi:</strong> For Humo jamoasi<br />
                <strong>Rasmiy sayt:</strong> <a href="https://forhumo.uz">forhumo.uz</a><br />
                <strong>Aloqa:</strong> <a href="https://t.me/forhumo">t.me/forhumo</a>
            </p>
        </BnLegalPage>
    );
}
