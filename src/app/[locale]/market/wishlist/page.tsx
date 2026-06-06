import { setRequestLocale } from "next-intl/server";
import { WishlistPage } from "@/components/market/wishlist-page";

export async function generateMetadata() { return { title: "Sevimlilar | Humo Market" }; }

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <WishlistPage />;
}
