import { MarketNavbar } from "@/components/market/market-navbar";
import { MarketDock } from "@/components/market/market-dock";

export default function MarketLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden
            bg-gradient-to-br from-white via-green-50/40 to-emerald-50/60
            dark:from-[#020C05] dark:via-[#030F06] dark:to-[#051209]">

            {/* Jonli fon orb'lari — position:absolute, layout div ichida */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute rounded-full blur-[140px] opacity-25 dark:opacity-15 bg-green-400 dark:bg-emerald-600 animate-pulse"
                    style={{ width: 700, height: 700, top: "-15%", right: "-10%" }} />
                <div className="absolute rounded-full blur-[180px] opacity-15 dark:opacity-10 bg-lime-300 dark:bg-green-500"
                    style={{ width: 500, height: 500, bottom: "5%", left: "-8%" }} />
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(34,197,94,0.6) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(34,197,94,0.6) 1px, transparent 1px)`,
                        backgroundSize: "56px 56px",
                    }} />
            </div>

            <div className="relative z-10">
                <MarketNavbar />
                <main className="pb-24">{children}</main>
            </div>

            <MarketDock />
        </div>
    );
}
