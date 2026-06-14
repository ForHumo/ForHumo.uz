import EsportNavbar from "@/components/esport/esport-navbar";

// Humo eSport — global header/footer ustini yopadi, o'z navbari (tema + til + bo'limlar) bor.
export default function EsportLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden es-bg nx-scrollbar">
            <EsportNavbar />
            {children}
        </div>
    );
}
