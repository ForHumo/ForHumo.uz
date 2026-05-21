// Nexus has its own full-screen shell — suppress the global header/footer.
export default function NexusLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 overflow-hidden bg-[#060B1A] text-white">
            {children}
        </div>
    );
}
