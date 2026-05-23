// Nexus Landing — o'z nav/footer bor, site layouti yashiriladi
export default function NexusLandingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 overflow-y-auto z-50">
            {children}
        </div>
    );
}
