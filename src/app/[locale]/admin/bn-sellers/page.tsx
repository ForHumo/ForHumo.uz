import { setRequestLocale } from "next-intl/server";
import { AdminBnSellers } from "@/components/admin/admin-bn-sellers";

export async function generateMetadata() { return { title: "BN sellers — Admin" }; }

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <AdminBnSellers />;
}
