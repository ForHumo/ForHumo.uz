import { setRequestLocale } from "next-intl/server";
import { NxContactsPage } from "@/components/nexus/nx-contacts-page";

export const metadata = { title: "Kontaktlar | Nexus" };

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return (
        <div className="h-full w-full overflow-y-auto" style={{ background: "#050818", color: "white" }}>
            <NxContactsPage />
        </div>
    );
}
