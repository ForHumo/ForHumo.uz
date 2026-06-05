// Nexus — global header/footer ustini yopadi, o'z to'liq ekran qobig'i bor
export default function NexusLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] overflow-hidden">
            {children}
        </div>
    );
}
