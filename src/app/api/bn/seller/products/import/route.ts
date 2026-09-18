// AI-powered import — sotuvchi ixtiyoriy Excel/CSV faylini yuklaydi, AI uni
// tushunib toza mahsulotlarga aylantiradi (bizning shablonga majburlamaydi).
//
// POST /api/bn/seller/products/import  (multipart/form-data: file)
//   → { ok, currency, rowCount, products: PreviewProduct[], notes }
//
// Oqim: fayl → exceljs (grid) → Gemini (normalizatsiya + tarjima + kategoriya +
// mashina moslik) → mos mashinalarni BnCarModel'ga bog'lash → preview.
// Tarjima 3 tilga MAHSULOT YARATILGANDA avtomatik (translateAndIndexProduct) —
// bu yerda faqat o'zbekcha toza sarlavha yetarli.

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireBnAuth } from "@/lib/bn-auth";
import { prisma } from "@/lib/prisma";
import { aiJSON, aiAvailable } from "@/lib/ai";
import { nexusRateLimited } from "@/lib/nexus-rate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ROWS = 160;          // AI'ga yuboriladigan maksimal qator
const MAX_FILE = 5_000_000;    // 5MB

interface AiProduct {
    title?: string;
    partNumber?: string;
    oemNumbers?: string[];
    price?: number | string;
    stock?: number | string;
    categorySlug?: string;
    carModels?: string[];
    note?: string;
}
interface AiResult {
    currency?: string;
    products?: AiProduct[];
}

export interface PreviewProduct {
    title: string;
    partNumber: string | null;
    oemNumbers: string[];
    priceOriginal: number;         // aniqlangan valyutada (yuan/dollar/so'm)
    stock: number;
    categorySlug: string;
    categoryName: string;
    note: string;
    fits: { modelId: string; label: string }[];
    matchedModels: string[];       // aniqlangan lekin bog'lanmagan nomlar
    universalFit: boolean;
}

// Grid'ni AI uchun ixcham matnga aylantiradi
function gridToText(rows: string[][]): string {
    const lines: string[] = [];
    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].map(c => (c ?? "").toString().trim());
        if (cells.every(c => !c)) continue;              // bo'sh qator
        lines.push(`R${i + 1}: ${cells.join(" | ")}`);
        if (lines.length >= MAX_ROWS) break;
    }
    return lines.join("\n");
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const shop = await prisma.bnShop.findFirst({
        where: { profileId: auth.profileId },
        select: { id: true, status: true },
    });
    if (!shop) return NextResponse.json({ error: "no_shop" }, { status: 403 });
    if (shop.status !== "APPROVED") return NextResponse.json({ error: "not_approved" }, { status: 403 });

    if (!aiAvailable()) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    // AI rate-limit (pullik Gemini himoyasi)
    if (await nexusRateLimited(auth.profileId, "ai")) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    // Faylni o'qish
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });
    if (file.size > MAX_FILE) return NextResponse.json({ error: "file_too_big", max: MAX_FILE }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const name = (file.name || "").toLowerCase();

    // Grid'ga parse — xlsx yoki csv/tsv
    let rows: string[][] = [];
    try {
        if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {
            const text = buf.toString("utf-8");
            const sep = name.endsWith(".csv") ? "," : "\t";
            rows = text.split(/\r?\n/).map(line => line.split(sep));
        } else {
            const wb = new ExcelJS.Workbook();
            // @types/node Buffer<ArrayBuffer> exceljs'ning Buffer tipiga to'g'ridan mos kelmaydi
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await wb.xlsx.load(buf as any);
            const ws = wb.worksheets[0];
            if (!ws) return NextResponse.json({ error: "empty_sheet" }, { status: 400 });
            ws.eachRow({ includeEmpty: false }, (row) => {
                const cells: string[] = [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (row.values as any[]).forEach((v, idx) => {
                    if (idx === 0) return; // exceljs 1-indexed
                    let s = "";
                    if (v == null) s = "";
                    else if (typeof v === "object" && "result" in v) s = String((v as { result: unknown }).result ?? "");
                    else if (typeof v === "object" && "text" in v) s = String((v as { text: unknown }).text ?? "");
                    else s = String(v);
                    cells[idx - 1] = s;
                });
                rows.push(cells);
            });
        }
    } catch {
        return NextResponse.json({ error: "parse_failed" }, { status: 400 });
    }

    rows = rows.filter(r => r.some(c => (c ?? "").toString().trim()));
    if (rows.length === 0) return NextResponse.json({ error: "no_rows" }, { status: 400 });

    const grid = gridToText(rows);

    // Kategoriya ro'yxati (AI faqat shulardan tanlaydi)
    const cats = await prisma.bnCategory.findMany({
        where: { isActive: true },
        select: { slug: true, name: true, parent: { select: { name: true } } },
        orderBy: { order: "asc" },
    });
    const catList = cats.map(c => `${c.slug} = ${c.parent ? c.parent.name + " / " : ""}${c.name}`).join("\n");
    const catNameBySlug = new Map(cats.map(c => [c.slug, c.name]));

    const system = [
        "Sen 'Bozor Narxida' (O'zbekiston) marketplace uchun mahsulot import yordamchisisan.",
        "Sotuvchi tartibsiz narxnoma faylini yuklaydi — ko'pincha xitoycha/lotincha aralash, avto ehtiyot qism.",
        "Har qatorni TOZA mahsulotga aylantirasan. Sarlavhani O'ZBEK tilida yoz (qism turi + model + old/orqa + chap/o'ng).",
        "Faqat JSON qaytarasan, izohsiz.",
    ].join(" ");

    const prompt = `KATEGORIYALAR (categorySlug faqat shu ro'yxatdan):
${catList}

FAYL QATORLARI (ustunlar | bilan ajratilgan):
${grid}

VAZIFA:
1. Valyutani aniqla: 人民币/RMB/￥/元 → "CNY", $/USD → "USD", so'm/сум/UZS → "UZS", noaniq → "CNY" (xitoy narxnomasi bo'lsa).
2. Har MA'NOLI qatorni mahsulotga aylantir. Sarlavha/bo'sh/axlat qatorlarni tashla.
3. Har mahsulot uchun:
   - title: o'zbekcha, tushunarli (masalan "Old amortizator, Nexia 3 (chap)"). Xitoycha 减震器=amortizator, 前=old, 后=orqa, 气=gaz, 油=moy.
   - partNumber: qism raqami (raqamli kod, masalan 96179847). Yo'q bo'lsa null.
   - price: mahsulot NARXI (faqat son, aniqlangan valyutada). Agar qatorda bir nechta son bo'lsa: narx odatda o'zgaruvchan qiymat (masalan 43, 50, 51), soni/MOQ esa yumaloq (10, 20, 50). To'g'ri ustunni narx deb ol.
   - stock: dona soni yoki minimal partiya (bo'lsa), yo'q bo'lsa 1.
   - categorySlug: yuqoridagi ro'yxatdan eng mosi (amortizator → avto-xoduvoy).
   - carModels: tanigan mashina modellari (masalan ["Nexia 3"], ["Damas"], ["Cobalt"]). Yo'q bo'lsa [].
   - note: qisqa (masalan "gaz, old, chap").
4. Maksimal 160 mahsulot.

JSON format:
{"currency":"CNY","products":[{"title":"...","partNumber":"...","oemNumbers":[],"price":50,"stock":20,"categorySlug":"avto-xoduvoy","carModels":["Nexia 3"],"note":"gaz, old"}]}`;

    let ai: AiResult | null = null;
    try {
        ai = await aiJSON<AiResult>(prompt, { system, temperature: 0.2 });
    } catch {
        return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }
    if (!ai || !Array.isArray(ai.products) || ai.products.length === 0) {
        return NextResponse.json({ error: "ai_no_result" }, { status: 422 });
    }

    // Mashina modellarini BnCarModel'ga bog'lash (nom bo'yicha)
    const carModels = await prisma.bnCarModel.findMany({
        where: { isActive: true },
        select: { id: true, name: true, make: { select: { name: true } } },
    });
    const modelIndex = carModels.map(m => ({
        id: m.id,
        label: `${m.make.name} ${m.name}`,
        norm: `${m.make.name} ${m.name}`.toLowerCase(),
        nameNorm: m.name.toLowerCase(),
    }));
    function resolveModel(nameRaw: string): { modelId: string; label: string } | null {
        const n = nameRaw.trim().toLowerCase();
        if (!n) return null;
        // aniq nom mosligi (uzunroq nomlar oldin — "nexia 3" "nexia"dan ustun)
        const exact = modelIndex
            .filter(m => m.nameNorm === n || m.norm === n)
            .sort((a, b) => b.nameNorm.length - a.nameNorm.length)[0];
        if (exact) return { modelId: exact.id, label: exact.label };
        // qism mosligi — eng uzun mos nom
        const partial = modelIndex
            .filter(m => n.includes(m.nameNorm) || m.nameNorm.includes(n))
            .sort((a, b) => b.nameNorm.length - a.nameNorm.length)[0];
        return partial ? { modelId: partial.id, label: partial.label } : null;
    }

    const currency = (ai.currency || "CNY").toUpperCase();
    const products: PreviewProduct[] = [];
    for (const p of ai.products.slice(0, MAX_ROWS)) {
        const title = String(p.title ?? "").trim();
        if (title.length < 2) continue;
        const priceOriginal = Math.max(0, Number(String(p.price ?? "").replace(/[^\d.]/g, "")) || 0);
        const stock = Math.max(1, Math.floor(Number(p.stock) || 1));
        const catSlug = catNameBySlug.has(String(p.categorySlug)) ? String(p.categorySlug) : "";
        const fits: { modelId: string; label: string }[] = [];
        const matchedModels: string[] = [];
        for (const cm of (Array.isArray(p.carModels) ? p.carModels : []).slice(0, 10)) {
            const r = resolveModel(String(cm));
            if (r && !fits.some(f => f.modelId === r.modelId)) fits.push(r);
            else if (!r) matchedModels.push(String(cm));
        }
        products.push({
            title: title.slice(0, 200),
            partNumber: p.partNumber ? String(p.partNumber).trim().slice(0, 64) : null,
            oemNumbers: Array.isArray(p.oemNumbers) ? p.oemNumbers.map(String).slice(0, 20) : [],
            priceOriginal,
            stock,
            categorySlug: catSlug,
            categoryName: catSlug ? (catNameBySlug.get(catSlug) ?? "") : "",
            note: String(p.note ?? "").slice(0, 120),
            fits,
            matchedModels,
            universalFit: false,
        });
    }

    if (products.length === 0) return NextResponse.json({ error: "ai_no_result" }, { status: 422 });

    return NextResponse.json({
        ok: true,
        currency,
        rowCount: rows.length,
        truncated: rows.length > MAX_ROWS,
        products,
    });
}
