// Rasm ustiga watermark qo'shish — canvas orqali.
// Kirish: File (rasm), matn. Chiqish: yangi File (PNG/JPEG, watermark bilan).

export async function addWatermarkToImage(file: File, text: string): Promise<File> {
    if (!file.type.startsWith("image/")) return file; // faqat rasm
    // GIF'ga rasm chizib anima yo'qoladi — o'z holicha qoldirish
    if (file.type === "image/gif") return file;

    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0);

    // Watermark parametrlari — rasm hajmiga proporsional
    const fontSize = Math.max(14, Math.round(Math.min(canvas.width, canvas.height) * 0.032));
    const pad = Math.round(fontSize * 0.9);
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";

    // Text metric bilan yarim shaffof fon chizamiz (o'qish uchun)
    const metrics = ctx.measureText(text);
    const bgW = metrics.width + fontSize;
    const bgH = fontSize * 1.6;
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(
        canvas.width - bgW - pad + fontSize * 0.4,
        canvas.height - bgH - pad + fontSize * 0.3,
        bgW,
        bgH,
    );

    // Turkuaz matn
    ctx.fillStyle = "rgba(0, 206, 200, 0.95)";
    ctx.fillText(text, canvas.width - pad, canvas.height - pad);

    // Yangi Blob → File
    const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob failed")),
            file.type === "image/png" ? "image/png" : "image/jpeg",
            file.type === "image/png" ? undefined : 0.92);
    });
    // Nomni saqlaymiz, tur JPEG bo'lsa .jpg qo'shamiz
    const baseName = file.name.replace(/\.(png|jpe?g|webp|bmp)$/i, "");
    const ext = file.type === "image/png" ? "png" : "jpg";
    return new File([blob], `${baseName}.wm.${ext}`, { type: blob.type });
}
