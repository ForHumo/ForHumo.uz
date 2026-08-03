// Bozor Narxida (BN) — For Humo hamkori (Jalol) tomonidan boshqariladigan
// avtomobil ehtiyot qismlari sotib olinadigan marketplace.
// Domen: bozornarxida.uz → middleware /uz/bn/* ga rewrite qiladi.

import type { ReactNode } from "react";

export default function BnLayout({ children }: { children: ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto"
            style={{ background: "#0a0a0a", color: "#fafafa" }}>
            {children}
        </div>
    );
}
