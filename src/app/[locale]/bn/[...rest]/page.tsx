// BN ichidagi noma'lum yo'llar (bozornarxida.uz/xato-manzil) — Next'ning standart
// "This page could not be found" o'rniga BN 404'ga (not-found.tsx, layout bilan).
// Catch-all eng past ustuvorlikda — mavjud marshrutlarga ta'sir qilmaydi.

import { notFound } from "next/navigation";

export default function Page() {
    notFound();
}
