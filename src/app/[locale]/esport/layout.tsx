import { EsportNavbar } from "@/components/esport/esport-navbar";

export default function EsportLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden bg-background">
            <EsportNavbar />
            <main>{children}</main>
        </div>
    );
}
