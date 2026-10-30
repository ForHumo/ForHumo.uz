// BN — Google Maps yo'nalish havolasi (yagona yordamchi).
// origin berilmasa Maps ilovasi joriy joylashuvni o'zi to'ldiradi
// (Android → Google Maps, iOS → Apple Maps taklif qiladi).

export function directionsUrl(destLat: number, destLng: number, originLat?: number | null, originLng?: number | null): string {
    const base = "https://www.google.com/maps/dir/?api=1&destination=" + destLat + "," + destLng;
    return originLat != null && originLng != null
        ? base + "&origin=" + originLat + "," + originLng
        : base;
}
