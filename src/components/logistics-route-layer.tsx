import L from "leaflet";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import type { RoadRoute } from "@/lib/lcpp";

// Imperative Leaflet layers: never add to a map whose panes were removed.
const mapAlive = (map: L.Map) => Boolean((map as unknown as { _panes?: Record<string, HTMLElement> })._panes?.overlayPane);

export default function LogisticsRouteLayer({ routes, selectedId, fitSignal, onSelect }: { routes: RoadRoute[]; selectedId: string; fitSignal: number; onSelect: (id: string) => void }) {
  const map = useMap();
  const select = useRef(onSelect); select.current = onSelect;
  useEffect(() => {
    if (!mapAlive(map)) return;
    const styles = getComputedStyle(document.documentElement);
    const group = L.layerGroup().addTo(map);
    [...routes].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId)).forEach(route => {
      const active = route.id === selectedId;
      L.polyline(route.path.map(p => [p.lat, p.lng] as [number, number]), { color: styles.getPropertyValue(active ? "--primary" : "--muted-foreground").trim(), weight: active ? 5 : 3, opacity: active ? 1 : 0.55, pmIgnore: true } as L.PolylineOptions)
        .on("click", () => select.current(route.id)).addTo(group);
    });
    return () => { group.remove(); };
  }, [map, routes, selectedId]);
  useEffect(() => {
    if (!mapAlive(map)) return;
    const path = routes.find(route => route.id === selectedId)?.path;
    if (path?.length) map.fitBounds(L.latLngBounds(path.map(point => [point.lat, point.lng])), { padding: [35, 35], maxZoom: 15 });
  }, [map, routes, selectedId, fitSignal]);
  return null;
}
