import { setRequestLocale } from "next-intl/server";
import { NxBroadcastPage } from "@/components/nexus/nx-broadcast-page";

export const metadata = { title: "Broadcast | Nexus" };

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return (
        <div className="h-full w-full overflow-y-auto" style={{ background: "#050818", color: "white" }}>
            <NxBroadcastPage />
        </div>
    );
}
