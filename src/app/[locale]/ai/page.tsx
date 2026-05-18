import { setRequestLocale } from 'next-intl/server';
import { AIShell } from "@/components/ai/ai-shell";
import { AIContent } from "@/components/ai/ai-content";

export default async function AIPage({
    params
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);

    return (
        <AIShell>
            <AIContent />
        </AIShell>
    );
}
