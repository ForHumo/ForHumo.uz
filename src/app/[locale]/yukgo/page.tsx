import { setRequestLocale } from "next-intl/server";
import { YukGoFeed } from "@/components/yukgo/yukgo-feed";

export async function generateMetadata() {
    return {
        title: "YukGo — yuk va mashina e'lonlari",
        description: "O'zbekiston bo'ylab yuk va bo'sh mashina e'lonlari — bir joyda, tez va ishonchli.",
    };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <YukGoFeed />;
}
