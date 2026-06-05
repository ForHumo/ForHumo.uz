// ALKH Pay — global header/footer ustini yopadi, o'z navbari bor
export default function PayLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden bg-background">
            {children}
        </div>
    );
}
