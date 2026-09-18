// BN avto katalog — marka/model (moslik tizimi manbai).
// Xaridor "mening mashinam"ni tanlaydi, unga to'g'ri keladigan qismlar chiqadi.
// Sotuvchi qism joylaganda qaysi modellarga mos kelishini belgilaydi.

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface CarModelDTO {
    id: string;
    slug: string;
    name: string;
    yearFrom: number | null;
    yearTo: number | null;
    bodyType: string | null;
}

export interface CarMakeDTO {
    id: string;
    slug: string;
    name: string;
    popular: boolean;
    models: CarModelDTO[];
}

// Butun katalog (marka + model). Kam o'zgaradi → uzoq cache (1 soat), tag bilan.
export const getCarCatalog = unstable_cache(
    async (): Promise<CarMakeDTO[]> => {
        const makes = await prisma.bnCarMake.findMany({
            where: { isActive: true },
            orderBy: [{ popular: "desc" }, { order: "asc" }],
            select: {
                id: true, slug: true, name: true, popular: true,
                models: {
                    where: { isActive: true },
                    orderBy: { order: "asc" },
                    select: { id: true, slug: true, name: true, yearFrom: true, yearTo: true, bodyType: true },
                },
            },
        });
        return makes;
    },
    ["bn-car-catalog"],
    { revalidate: 3600, tags: ["bn-cars"] },
);

// Bitta model — id yoki slug bo'yicha (garaj filtri / mahsulot moslik ko'rsatish).
export async function getCarModel(idOrSlug: string): Promise<(CarModelDTO & { makeName: string; makeSlug: string }) | null> {
    const m = await prisma.bnCarModel.findFirst({
        where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], isActive: true },
        select: {
            id: true, slug: true, name: true, yearFrom: true, yearTo: true, bodyType: true,
            make: { select: { name: true, slug: true } },
        },
    });
    if (!m) return null;
    return {
        id: m.id, slug: m.slug, name: m.name, yearFrom: m.yearFrom, yearTo: m.yearTo, bodyType: m.bodyType,
        makeName: m.make.name, makeSlug: m.make.slug,
    };
}

// Model uchun yil ro'yxati (garaj UI — "yilni tanlang"). yearTo null → hozirgi yil.
export function modelYears(yearFrom: number | null, yearTo: number | null): number[] {
    const now = new Date().getFullYear();
    const from = yearFrom ?? now - 20;
    const to = yearTo ?? now;
    const out: number[] = [];
    for (let y = to; y >= from; y--) out.push(y);
    return out;
}
