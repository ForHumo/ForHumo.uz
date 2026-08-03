import type { Metadata } from "next";
import { AdminReservedUsernames } from "@/components/admin/admin-reserved-usernames";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
    return { title: "Zaxira usernamelar — Admin", robots: { index: false, follow: false } };
}

export default function Page() {
    return <AdminReservedUsernames />;
}
