// BN ichidagi noma'lum yo'llar (bozornarxida.uz/xato-manzil) — Next'ning standart
// "This page could not be found" o'rniga BN 404'ga (not-found.tsx, layout bilan).
// Catch-all eng past ustuvorlikda — mavjud marshrutlarga ta'sir qilmaydi.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bnNotFoundMeta } from "@/lib/bn-seo-server";

export async function generateMetadata(
    { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
    return bnNotFoundMeta((await params).locale);
}

export default function Page() {
    notFound();
}
