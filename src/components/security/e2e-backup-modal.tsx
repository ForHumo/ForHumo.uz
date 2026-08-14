"use client";

// E2E kalit backup — passphrase bilan shifrlangan portable string + QR.
// Ikki rejim: "export" (mavjud kalitni backup qilish) va "import" (backup'dan tiklash).

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { X, Loader2, Copy, Check, Download, Upload, AlertCircle, ShieldCheck, KeyRound } from "lucide-react";
import { exportBackup, importBackup, computeFingerprint } from "@/lib/e2e-crypto";
import { getMyIdentity, saveMyIdentity } from "@/lib/e2e-storage";

interface Props {
    mode: "export" | "import";
    onClose: () => void;
    onImported?: () => void;
}

export function E2eBackupModal({ mode, onClose, onImported }: Props) {
    const [passphrase, setPassphrase] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [backupText, setBackupText] = useState("");
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [importInput, setImportInput] = useState("");
    const [importedFp, setImportedFp] = useState<string | null>(null);
    const passRef = useRef<HTMLInputElement>(null);

    useEffect(() => { passRef.current?.focus(); }, []);

    async function doExport() {
        if (busy) return;
        setError(null);
        if (passphrase.length < 8) { setError("Passphrase kamida 8 belgi"); return; }
        if (passphrase !== confirmPass) { setError("Passphrase mos kelmaydi"); return; }
        setBusy(true);
        try {
            const id = await getMyIdentity();
            if (!id) { setError("Lokal kalit topilmadi"); setBusy(false); return; }
            const text = await exportBackup(
                { privateJwk: id.privateJwk, publicKey: id.publicKey, fingerprint: id.fingerprint },
                passphrase,
            );
            setBackupText(text);
            // QR — hajm kichik bo'lgan holda (backup ~500 bayt)
            try {
                const url = await QRCode.toDataURL(text, { width: 300, margin: 1, errorCorrectionLevel: "M" });
                setQrDataUrl(url);
            } catch {
                setQrDataUrl(null);   // Juda katta bo'lsa QR yaratilmaydi
            }
        } catch (e) {
            setError((e as Error).message || "Eksport bajarilmadi");
        } finally { setBusy(false); }
    }

    async function doImport() {
        if (busy) return;
        setError(null);
        if (!passphrase) { setError("Passphrase kerak"); return; }
        if (!importInput.trim()) { setError("Backup matnini kiriting"); return; }
        setBusy(true);
        try {
            const inner = await importBackup(importInput.trim(), passphrase);
            // Publik kalit va fingerprint tekshiruvi
            const fpCheck = await computeFingerprint(inner.publicKey);
            if (fpCheck !== inner.fingerprint) {
                setError("Backup ichidagi barmoq izi mos kelmaydi (buzilgan)"); setBusy(false); return;
            }
            // Serverga yangi kalitni yuklamaymiz — foydalanuvchi bilib turishi kerak.
            // Faqat IndexedDB ga saqlab qo'yamiz. Agar server aktiv kaliti bilan mos kelsa —
            // ishlaydi; mos kelmasa foydalanuvchi paneldan "Yangi kalit" qilib qayta yuklaydi.
            await saveMyIdentity({
                keyId:       "",   // server keyId noma'lum — sync qilish uchun panel qayta yuklaydi
                privateJwk:  inner.privateJwk,
                publicKey:   inner.publicKey,
                fingerprint: inner.fingerprint,
            });
            setImportedFp(inner.fingerprint);
        } catch (e) {
            setError((e as Error).message || "Import bajarilmadi");
        } finally { setBusy(false); }
    }

    function copy() {
        if (!backupText) return;
        navigator.clipboard.writeText(backupText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }

    function download() {
        if (!backupText) return;
        const blob = new Blob([backupText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `forhumo-e2e-backup-${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                        <KeyRound className="w-4 h-4" />
                    </div>
                    <div className="font-black text-base flex-1">
                        {mode === "export" ? "Kalitni backup qilish" : "Kalitni tiklash"}
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {mode === "export" && !backupText && (
                        <>
                            <div className="text-xs opacity-70 leading-relaxed">
                                Kalitingiz passphrase bilan shifrlangan qatorga aylantiriladi. Boshqa qurilmada shu passphrase bilan tiklaysiz.
                                Passphrase'ni yodlab qo'ying — yo'qotsangiz backup ishlamaydi.
                            </div>
                            <div>
                                <label className="text-xs font-bold opacity-80">Passphrase (min 8 belgi)</label>
                                <input ref={passRef} type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)}
                                    className="w-full h-11 px-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none mt-1" />
                            </div>
                            <div>
                                <label className="text-xs font-bold opacity-80">Tasdiqlash</label>
                                <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                                    className="w-full h-11 px-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none mt-1" />
                            </div>
                            {error && <div className="p-2 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</div>}
                            <button onClick={doExport} disabled={busy}
                                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                Backup yaratish
                            </button>
                        </>
                    )}

                    {mode === "export" && backupText && (
                        <>
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-bold flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" /> Backup tayyor
                            </div>
                            {qrDataUrl && (
                                <div className="p-4 rounded-xl bg-white flex items-center justify-center">
                                    <img src={qrDataUrl} alt="QR" className="w-64 h-64" />
                                </div>
                            )}
                            <div>
                                <div className="text-xs opacity-70 mb-1">Yoki matnni ko'chiring:</div>
                                <textarea value={backupText} readOnly rows={4}
                                    className="w-full p-3 rounded-lg bg-black/40 text-white text-xs font-mono resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={copy} className="h-10 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold flex items-center justify-center gap-2">
                                    {copied ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Ko'chirildi</> : <><Copy className="w-3.5 h-3.5" /> Nusxa</>}
                                </button>
                                <button onClick={download} className="h-10 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold flex items-center justify-center gap-2">
                                    <Download className="w-3.5 h-3.5" /> Yuklab olish
                                </button>
                            </div>
                        </>
                    )}

                    {mode === "import" && !importedFp && (
                        <>
                            <div className="text-xs opacity-70 leading-relaxed">
                                Boshqa qurilmadan olingan backup matnini va passphrase'ni kiriting.
                                Kalit shu brauzerga tiklanadi.
                            </div>
                            <div>
                                <label className="text-xs font-bold opacity-80">Backup matni</label>
                                <textarea value={importInput} onChange={e => setImportInput(e.target.value)} rows={4}
                                    placeholder="eyJ2IjoxLCJz..."
                                    className="w-full p-3 rounded-lg bg-black/5 dark:bg-white/5 text-xs font-mono outline-none mt-1 resize-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold opacity-80">Passphrase</label>
                                <input ref={passRef} type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)}
                                    className="w-full h-11 px-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none mt-1" />
                            </div>
                            {error && <div className="p-2 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</div>}
                            <button onClick={doImport} disabled={busy}
                                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Tiklash
                            </button>
                        </>
                    )}

                    {mode === "import" && importedFp && (
                        <>
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-bold flex items-start gap-2">
                                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div>Kalit tiklandi. Barmoq izi:</div>
                                    <code className="font-mono block mt-1">{importedFp}</code>
                                </div>
                            </div>
                            <div className="text-xs opacity-70">
                                Agar serverdagi aktiv kalit boshqa (yangiroq) bo'lsa, panelda &quot;Server barmoq izi&quot;ni ko'rib turasiz. Zarur bo'lsa yangi kalit yarating.
                            </div>
                            <button onClick={() => { onImported?.(); onClose(); }}
                                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">
                                Tayyor
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
