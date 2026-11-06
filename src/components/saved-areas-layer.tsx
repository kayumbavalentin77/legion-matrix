import type L from "leaflet";
import { Polygon, Tooltip } from "react-leaflet";
import { usePresets } from "@/lib/presets";
import type { MapPoint } from "@/lib/map-preparation";

/** Draws the user's saved map areas (stored in the database) on the LCPP map. Click an area to open it. */
export default function SavedAreasLayer({ onOpen }: { onOpen: (ring: MapPoint[], name: string) => void }) {
  const { presets } = usePresets("lcpp-areas");
  const color = typeof window === "undefined" ? undefined : getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  return (
    <>
      {presets.map((p) => {
        let ring: MapPoint[] = [];
        try { ring = JSON.parse(p.config.filters["ring"] ?? "[]") as MapPoint[]; } catch { return null; }
        if (!Array.isArray(ring) || ring.length < 3) return null;
        return (
          <Polygon
            key={p.id}
            positions={ring.map((pt) => [pt.lat, pt.lng] as [number, number])}
            pathOptions={{ color, weight: 2, dashArray: "4 4", fillOpacity: 0.08, pmIgnore: true } as L.PathOptions}
            eventHandlers={{ click: () => onOpen(ring, p.name) }}
          >
            <Tooltip sticky>{p.name}</Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
