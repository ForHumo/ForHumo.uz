// BN — tilga mos formatlash hook'i (client komponentlar uchun).
// Narx, foiz farqi, do'kon darajasi, narx darajasi — hammasi joriy locale'da.
// Server komponentda: `getBnFormat(locale)` (src/lib/bn-format-server.ts).

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { buildBnFormat, type BnFormat } from "@/lib/bn-format";

export function useBnFormat(): BnFormat {
    const t = useTranslations("bn");
    return useMemo(() => buildBnFormat(t), [t]);
}
