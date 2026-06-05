// ALKH Pay — global header/footer yashiriladi, o'z navbari bor
export default function PayLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 overflow-y-auto overflow-x-hidden">
            {children}
        </div>
    );
}
