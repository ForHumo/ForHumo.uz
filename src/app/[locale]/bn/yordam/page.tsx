import type { Metadata } from "next";
import { BnYordamPage } from "@/components/bn/bn-yordam";

export const metadata: Metadata = {
    title: "Yordam va tez-tez so'raladigan savollar",
    description: "Bozor Narxida yordam markazi — buyurtma, to'lov, yetkazish, sotuvchi bo'lish bo'yicha savollar.",
};

export default function Page() {
    return <BnYordamPage />;
}
