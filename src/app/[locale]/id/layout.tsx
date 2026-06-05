import { HumoIdNavbar } from "@/components/id/humo-id-navbar";

export default function IdLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden bg-background">
            <HumoIdNavbar />
            <main>{children}</main>
        </div>
    );
}
