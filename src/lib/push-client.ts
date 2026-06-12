// Brauzer push obunasi (client). VAPID public key NEXT_PUBLIC_VAPID_PUBLIC_KEY dan.

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
}

export function pushSupported(): boolean {
    return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!VAPID_PUBLIC;
}

export type PushState = "unsupported" | "default" | "denied" | "subscribed" | "unsubscribed";

export async function getPushState(): Promise<PushState> {
    if (!pushSupported()) return "unsupported";
    if (Notification.permission === "denied") return "denied";
    try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (sub) return "subscribed";
        return Notification.permission === "granted" ? "unsubscribed" : "default";
    } catch {
        return "unsubscribed";
    }
}

export async function subscribePush(): Promise<PushState> {
    if (!pushSupported()) return "unsupported";
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return perm === "denied" ? "denied" : "default";

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as BufferSource,
        });
    }
    const json = sub.toJSON();
    await fetch("/api/nexus/push/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });
    return "subscribed";
}

export async function unsubscribePush(): Promise<PushState> {
    if (!pushSupported()) return "unsupported";
    try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (sub) {
            await fetch("/api/nexus/push/subscribe", {
                method: "DELETE", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ endpoint: sub.endpoint }),
            }).catch(() => { });
            await sub.unsubscribe();
        }
    } catch { /* noop */ }
    return "unsubscribed";
}
