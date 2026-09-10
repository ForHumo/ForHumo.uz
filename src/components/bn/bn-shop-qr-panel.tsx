"use client";

// Sotuvchi dashboard'da QR kartochka: do'kon uchun QR yuklab olish (chop uchun).
// Do'kon ichida printer'da chiqarib qo'yiladi. Skan qilgan mijoz "Xarid qildim" modaliga o'tadi.

import { useState } from "react";
import { QrCode, Download, Printer, ExternalLink } from "lucide-react";

export function BnShopQrPanel({ shopSlug, shopName }: { shopSlug: string; shopName: string }) {
    const [size, setSize] = useState<"a5" | "a4">("a5");

    const svgUrl = `/api/bn/shops/${shopSlug}/qr`;
    const pngUrl = `/api/bn/shops/${shopSlug}/qr?format=png`;
    const printUrl = `/api/bn/shops/${shopSlug}/qr/print?size=${size}`;
    const targetUrl = `https://bozornarxida.uz/d/${shopSlug}?scan=1`;

    const openPrint = () => {
        window.open(printUrl, "_blank", "width=880,height=1100");
    };

    return (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3 bg-white dark:bg-neutral-900">
            <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-sm">Do'kon uchun QR-kod</h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Bu QR'ni chop etib do'koningizga qo'ying. Xaridor skan qilsa
                Bozor Narxida'ga o'tib "Xarid qildim" ni belgilaydi. Muddati yaqin bo'lsa unga
                boshqa do'kondagi eng arzon variantni Web Push bilan yuboramiz.
            </p>

            <div className="flex justify-center py-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                <img
                    src={svgUrl}
                    alt="QR"
                    className="w-40 h-40"
                />
            </div>

            <div className="flex items-center gap-2 text-xs">
                <label className="text-neutral-600 dark:text-neutral-400">Hajmi:</label>
                <select
                    value={size}
                    onChange={e => setSize(e.target.value as "a4" | "a5")}
                    className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"
                >
                    <option value="a5">A5 (o'rta)</option>
                    <option value="a4">A4 (katta)</option>
                </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={openPrint}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600"
                >
                    <Printer className="w-4 h-4" />
                    Chop etish
                </button>
                <a
                    href={pngUrl}
                    download={`qr-${shopSlug}.png`}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                    <Download className="w-4 h-4" />
                    PNG yuklash
                </a>
            </div>

            <a
                href={targetUrl}
                target="_blank"
                rel="noopener"
                className="text-[11px] text-neutral-500 hover:text-amber-600 flex items-center justify-center gap-1"
            >
                {targetUrl}
                <ExternalLink className="w-3 h-3" />
            </a>
        </div>
    );
}

