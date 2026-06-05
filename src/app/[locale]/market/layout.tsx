import { MarketNavbar } from "@/components/market/market-navbar";

export default function MarketLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden bg-background">
            <MarketNavbar />
            <main>{children}</main>
        </div>
    );
}
