// Humo AI — o'z to'liq-ekran qobig'i (chat sahifasining o'z header'i bor).
// Modul-shell: fixed inset-0 z-[100] global header/footer'ni yopadi. Alohida navbar YO'Q
// (HumoAiNavbar olib tashlandi — chat header + sidebar + rejim menyusi yetarli).
export default function AiLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-background">
            {children}
        </div>
    );
}
