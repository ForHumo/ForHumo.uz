// Universal clipboard copy — HTTPS (async API) yoki HTTP/insecure kontekst (execCommand fallback).
// HTTPS bo'lmagan uy tarmoqlarida yoki kollegial LAN'da ham copy tugmasi ishlashi uchun.

export async function copyToClipboard(text: string): Promise<boolean> {
    if (typeof window === "undefined") return false;
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // fallback'ga tushamiz
    }
    try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        ta.style.opacity = "0";
        ta.setAttribute("readonly", "");
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}
