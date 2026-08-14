import { setRequestLocale } from "next-intl/server";
import { NxNearbyPage } from "@/components/nexus/nx-nearby-page";

export const metadata = { title: "Yaqin atrofdagi | Nexus" };

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return (
        <div className="h-full w-full overflow-y-auto" style={{ background: "#050818", color: "white" }}>
            <NxNearbyPage />
        </div>
    );
}
