import type { Metadata } from "next";

// For Pay — favicon + ikonalar public/pay-icons/*.
export const metadata: Metadata = {
    title: "For Pay",  // tab: "For Pay | For Humo"
    applicationName: "For Pay",
    icons: {
        icon: [
            { url: "/pay-icons/favicon.ico", sizes: "any" },
            { url: "/pay-icons/icon-32.png", type: "image/png", sizes: "32x32" },
            { url: "/pay-icons/icon-16.png", type: "image/png", sizes: "16x16" },
            { url: "/pay-icons/icon-192.png", type: "image/png", sizes: "192x192" },
            { url: "/pay-icons/icon-512.png", type: "image/png", sizes: "512x512" },
        ],
        apple: "/pay-icons/apple-icon.png",
    },
};

// For Pay — global header/footer ustini yopadi, o'z navbari bor
export default function PayLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden bg-background">
            {children}
        </div>
    );
}
