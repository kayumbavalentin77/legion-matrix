import L from "leaflet";
import { useEffect } from "react";
import { Polyline, useMap } from "react-leaflet";
import type { RoadRoute } from "@/lib/lcpp";

export default function LogisticsRouteLayer({ routes, selectedId, fitSignal, onSelect }: { routes: RoadRoute[]; selectedId: string; fitSignal: number; onSelect: (id: string) => void }) {
  const map = useMap();
  useEffect(() => {
    const path = routes.find(route => route.id === selectedId)?.path;
    if (path?.length) map.fitBounds(L.latLngBounds(path.map(point => [point.lat, point.lng])), { padding: [35, 35], maxZoom: 15 });
  }, [map, routes, selectedId, fitSignal]);
  const styles = getComputedStyle(document.documentElement);
  return <>{[...routes].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId)).map(route => <Polyline key={route.id} positions={route.path.map(point => [point.lat, point.lng])} pathOptions={{ color: styles.getPropertyValue(route.id === selectedId ? "--primary" : "--muted-foreground").trim(), weight: route.id === selectedId ? 5 : 3, opacity: route.id === selectedId ? 1 : 0.55 }} eventHandlers={{ click: () => onSelect(route.id) }} />)}</>;
}