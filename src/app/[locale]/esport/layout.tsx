import EsportNavbar from "@/components/esport/esport-navbar";

export async function generateMetadata() {
    return { title: "Humo eSport" };  // tab: "Humo eSport | For Humo"
}

// Humo eSport — global header/footer ustini yopadi, o'z navbari (tema + til + bo'limlar) bor.
export default function EsportLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col es-bg">
            <EsportNavbar />
            <div className="flex-1 overflow-y-auto overflow-x-hidden nx-scrollbar">
                {children}
            </div>
        </div>
    );
}
