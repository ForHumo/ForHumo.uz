// BN — tilga mos formatlash (server komponentlar / generateMetadata uchun).
// Client tomonda xuddi shu natija: `useBnFormat()` (src/components/bn/bn-format-hook.ts).

import { getTranslations } from "next-intl/server";
import { buildBnFormat, type BnFormat } from "./bn-format";

export async function getBnFormat(locale: string): Promise<BnFormat> {
    const t = await getTranslations({ locale, namespace: "bn" });
    return buildBnFormat(t);
}
