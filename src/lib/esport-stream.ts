// eSport jonli efir provayderi — Cloudflare Stream Live.
// PaymentProvider/testProvider naqshi: kalit bo'lsa real Cloudflare, bo'lmasa stub.
// eSport efiri YOZUVSIZ (recording.mode="off") — eng arzon, faqat jonli.

export interface LiveInput {
    liveInputId: string;   // Cloudflare live input uid
    rtmpUrl: string;       // OBS ingest (rtmps://...)
    streamKey: string;     // OBS maxfiy kalit
    playbackId: string;    // playback uid (live input uchun = uid)
}

export interface StreamProvider {
    createLiveInput(name: string): Promise<LiveInput>;
    liveInputStatus(liveInputId: string): Promise<{ live: boolean }>;
    deleteLiveInput(liveInputId: string): Promise<void>;
}

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const TOKEN = process.env.CLOUDFLARE_STREAM_TOKEN || "";
const CODE = process.env.CLOUDFLARE_STREAM_CODE || "";
const API = "https://api.cloudflare.com/client/v4";

// Kalitlar bormi (real rejim)?
export function isStreamLive(): boolean {
    return !!(ACCOUNT && TOKEN);
}

// Cloudflare iframe playback URL (server quradi — client env bilmaydi). Kod/id yo'q bo'lsa null.
export function playbackIframeUrl(playbackId: string | null | undefined): string | null {
    if (!playbackId || !CODE) return null;
    return `https://customer-${CODE}.cloudflarestream.com/${playbackId}/iframe`;
}

async function cf(path: string, init?: RequestInit) {
    const res = await fetch(`${API}/accounts/${ACCOUNT}/stream${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
        throw new Error(json?.errors?.[0]?.message || `Cloudflare API ${res.status}`);
    }
    return json.result;
}

const cloudflareProvider: StreamProvider = {
    async createLiveInput(name) {
        const r = await cf("/live_inputs", {
            method: "POST",
            body: JSON.stringify({ meta: { name }, recording: { mode: "off" } }),
        });
        return {
            liveInputId: r.uid,
            rtmpUrl: r.rtmps?.url || "rtmps://live.cloudflare.com:443/live/",
            streamKey: r.rtmps?.streamKey || "",
            playbackId: r.uid, // live input uchun playback = uid
        };
    },
    async liveInputStatus(liveInputId) {
        const r = await cf(`/live_inputs/${liveInputId}`);
        return { live: r?.status?.current?.state === "connected" };
    },
    async deleteLiveInput(liveInputId) {
        await cf(`/live_inputs/${liveInputId}`, { method: "DELETE" });
    },
};

// Stub — kalitsiz dev/test rejim. UI buzilmaydi.
const stubProvider: StreamProvider = {
    async createLiveInput() {
        const rnd = Math.random().toString(36).slice(2, 10);
        return { liveInputId: `test-${rnd}`, rtmpUrl: "rtmps://live.cloudflare.test/live/", streamKey: `test-key-${rnd}`, playbackId: `test-${rnd}` };
    },
    async liveInputStatus() { return { live: false }; },
    async deleteLiveInput() { /* no-op */ },
};

export function getStreamProvider(): StreamProvider {
    return isStreamLive() ? cloudflareProvider : stubProvider;
}
