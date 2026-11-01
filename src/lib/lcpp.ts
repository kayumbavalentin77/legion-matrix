export type RoutePoint = { name: string; lat: number; lng: number };
export type RoadRoute = { id: string; distanceKm: number; durationMinutes: number; path: { lat: number; lng: number }[] };
export type CostInputs = { fuelPer100Km: number; fuelPrice: number; hourlyCost: number; fixedCost: number };
export type LogisticsAnalysis = { origin: RoutePoint; destination: RoutePoint; routes: RoadRoute[]; costs: CostInputs; retrievedAt: string };

export const ROUTING_SOURCE = "OSRM · FOSSGIS public routing service · OpenStreetMap road data";

export function estimatedCost(route: RoadRoute, costs: CostInputs) {
  if (Object.values(costs).some((value) => !Number.isFinite(value) || value < 0)) throw new Error("Cost assumptions must be zero or greater.");
  return route.distanceKm / 100 * costs.fuelPer100Km * costs.fuelPrice + route.durationMinutes / 60 * costs.hourlyCost + costs.fixedCost;
}

export function rankRoutes(routes: RoadRoute[], costs: CostInputs, sort: string) {
  return [...routes].sort((a, b) => sort === "distance" ? a.distanceKm - b.distanceKm : sort === "time" ? a.durationMinutes - b.durationMinutes : estimatedCost(a, costs) - estimatedCost(b, costs));
}

export async function fetchRoadRoutes(origin: RoutePoint, destination: RoutePoint, signal?: AbortSignal): Promise<RoadRoute[]> {
  for (const point of [origin, destination]) {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) throw new Error("Choose valid coordinates.");
  }
  if (origin.lat === destination.lat && origin.lng === destination.lng) throw new Error("Choose two different locations.");
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const response = await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordinates}?alternatives=true&overview=full&geometries=geojson`, { signal });
  if (!response.ok) throw new Error("Public road routing is unavailable. Please try again later.");
  const data = await response.json() as { code: string; routes?: { distance: number; duration: number; geometry: { coordinates: number[][] } }[] };
  if (data.code !== "Ok" || !data.routes?.length) throw new Error("No public road route was found between these locations.");
  return data.routes.map((route, index) => ({
    id: `route-${index + 1}`, distanceKm: route.distance / 1000, durationMinutes: route.duration / 60,
    path: route.geometry.coordinates.flatMap(([lng, lat]) => typeof lat === "number" && typeof lng === "number" ? [{ lat, lng }] : []),
  }));
}