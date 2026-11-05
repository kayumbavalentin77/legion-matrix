import type { MapPoint } from "@/lib/map-preparation";

const R = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: MapPoint, b: MapPoint) {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Closed-ring perimeter in km. */
export function perimeterKm(points: MapPoint[]) {
  if (points.length < 2) return 0;
  return points.reduce((sum, p, i) => sum + haversineKm(p, points[(i + 1) % points.length] as MapPoint), 0);
}

/** Ray-casting point-in-polygon test on lat/lng. */
export function pointInArea(p: MapPoint, ring: MapPoint[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i] as MapPoint, b = ring[j] as MapPoint;
    if (a.lat > p.lat !== b.lat > p.lat && p.lng < ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng) inside = !inside;
  }
  return inside;
}

export function areaToGeoJSON(name: string, ring: MapPoint[]) {
  const coords = ring.map((p) => [p.lng, p.lat]);
  if (coords.length) coords.push(coords[0] as number[]);
  return { type: "FeatureCollection", features: [{ type: "Feature", properties: { name }, geometry: { type: "Polygon", coordinates: [coords] } }] };
}

/** Reads the first Polygon / MultiPolygon outer ring from GeoJSON. */
export function areaFromGeoJSON(text: string): { name: string; ring: MapPoint[] } {
  const data = JSON.parse(text);
  const features = data?.type === "FeatureCollection" ? data.features : data?.type === "Feature" ? [data] : [{ geometry: data, properties: {} }];
  for (const f of features ?? []) {
    const g = f?.geometry;
    const outer = g?.type === "Polygon" ? g.coordinates?.[0] : g?.type === "MultiPolygon" ? g.coordinates?.[0]?.[0] : null;
    if (!Array.isArray(outer)) continue;
    const ring: MapPoint[] = outer.map((c: unknown) => {
      const [lng, lat] = c as [number, number];
      if (typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error("Invalid coordinate in file.");
      return { lat, lng };
    });
    const last = ring[ring.length - 1], first = ring[0];
    if (first && last && ring.length > 1 && first.lat === last.lat && first.lng === last.lng) ring.pop();
    if (ring.length < 3) throw new Error("Area needs at least 3 points.");
    return { name: String(f?.properties?.name ?? "Imported area"), ring };
  }
  throw new Error("No polygon found in file.");
}
