import type { Metadata } from "next";
import { AdminSupport } from "@/components/admin/admin-support";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Support" };

export default function Page() {
    return <AdminSupport />;
}
