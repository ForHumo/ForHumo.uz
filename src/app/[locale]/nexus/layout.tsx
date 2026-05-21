// Nexus — global header/footer yashiriladi, o'z to'liq ekran qobig'i bor
export default function NexusLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 overflow-hidden">
            {children}
        </div>
    );
}
