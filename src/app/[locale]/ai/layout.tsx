import { HumoAiNavbar } from "@/components/ai/humo-ai-navbar";

export default function AiLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden bg-background">
            <HumoAiNavbar />
            <main>{children}</main>
        </div>
    );
}
