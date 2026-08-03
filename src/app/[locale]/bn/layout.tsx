// Bozor Narxida (BN) — For Humo loyihalaridan biri.
// Domen: bozornarxida.uz → middleware /uz/bn/* ga rewrite qiladi (URL o'zgarmaydi).
// Reja: docs/BN-PLAN.md

import type { ReactNode } from "react";
import { BnHeader } from "@/components/bn/bn-header";
import { BnFooter } from "@/components/bn/bn-footer";

export default function BnLayout({ children }: { children: ReactNode }) {
    return (
        <div
            className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden"
            style={{ background: "#0A0A0A", color: "#FAFAFA" }}
        >
            <BnHeader />
            <main className="min-h-[calc(100vh-220px)]">{children}</main>
            <BnFooter />
        </div>
    );
}
