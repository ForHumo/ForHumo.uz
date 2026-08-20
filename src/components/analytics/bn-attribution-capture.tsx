"use client";

// Har sahifa yuklanganda URL'dan UTM/ref parametrlarini ushlab olib
// sessionStorage'ga saqlaydi. Root layout'da bir marta mount qilinadi.
//
// MUHIM: `useSearchParams()` ishlatmaymiz — u root layout'da butun ilovani
// dinamik render'ga majbur qiladi. Buning o'rniga faqat pathname kuzatamiz,
// va effect ichida window.location.search'ni to'g'ridan-to'g'ri o'qiymiz
// (captureFromLocation ichida shu ishlanadi).

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureFromLocation } from "@/lib/bn-analytics";

export function BnAttributionCapture() {
    const pathname = usePathname();

    useEffect(() => {
        captureFromLocation();
    }, [pathname]);

    return null;
}
