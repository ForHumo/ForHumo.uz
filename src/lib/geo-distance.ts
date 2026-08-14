// Haversine formulasi — ikki nuqta orasi masofa (km).
// Ekvatorda 1° taxminan 111 km. Bounding box qidiruvi uchun kv-shakl.

const EARTH_KM = 6371.0088;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_KM * Math.asin(Math.sqrt(a));
}

// Bounding box — SQL yordamida taxminiy oldindan filtratsiya (Haversine dan tez).
// radiusKm doirasidagi min/max lat va lng oralig'i.
export function boundingBox(lat: number, lng: number, radiusKm: number): {
    minLat: number; maxLat: number; minLng: number; maxLng: number;
} {
    const dLat = radiusKm / 111;                                   // 1° lat ≈ 111 km
    const dLng = radiusKm / (111 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));
    return {
        minLat: lat - dLat, maxLat: lat + dLat,
        minLng: lng - dLng, maxLng: lng + dLng,
    };
}

// Insonga tushunarli masofa (foydalanuvchiga ko'rsatiladigan taxminiy)
export function formatDistanceApprox(km: number): string {
    if (km < 0.1) return "juda yaqin";
    if (km < 1) return `~${Math.round(km * 1000)} m`;
    if (km < 10) return `~${km.toFixed(1)} km`;
    return `~${Math.round(km)} km`;
}
