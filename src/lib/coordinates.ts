import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Row } from "@/lib/data";

export type Coordinate = {
  id: string;
  name: string;
  category: string;
  classification: string;
  latitude: number;
  longitude: number;
  dms_latitude: string | null;
  dms_longitude: string | null;
  place_name: string | null;
  description: string | null;
  distance_km: number | null;
  created_at: string;
  updated_at: string;
};

/** Single shared data source for the GPS Coordinates page and the Mission Map. */
export function useCoordinates() {
  return useQuery({
    queryKey: ["gps_coordinates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gps_coordinates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Coordinate[];
    },
  });
}

export const COORDINATE_CATEGORIES = [
  "Headquarters",
  "Checkpoint",
  "Observation Post",
  "Camp",
  "Hospital",
  "Warehouse",
  "Vehicle Location",
  "Communication Point",
  "Unit",
  "Facility",
  "Waypoint",
  "Other",
] as const;

/** Category -> marker color. Symbol letters are rendered inside the marker. */
export const CATEGORY_STYLE: Record<string, { color: string; symbol: string }> = {
  Headquarters: { color: "#b91c1c", symbol: "HQ" },
  Checkpoint: { color: "#c2410c", symbol: "CP" },
  "Observation Post": { color: "#1d4ed8", symbol: "OP" },
  Camp: { color: "#15803d", symbol: "CMP" },
  Hospital: { color: "#be185d", symbol: "+" },
  Warehouse: { color: "#a16207", symbol: "WH" },
  "Vehicle Location": { color: "#0e7490", symbol: "VH" },
  "Communication Point": { color: "#6d28d9", symbol: "COM" },
  Unit: { color: "#334155", symbol: "UN" },
  Facility: { color: "#4d7c0f", symbol: "FAC" },
  Waypoint: { color: "#475569", symbol: "WP" },
  Other: { color: "#525252", symbol: "●" },
};

export function categoryStyle(category: string) {
  return CATEGORY_STYLE[category] ?? CATEGORY_STYLE["Other"]!;
}

// ---------------------------------------------------------------------------
// Geocoding service — isolated so the provider can be swapped later without
// touching the map. Currently backed by OpenStreetMap Nominatim.
// ---------------------------------------------------------------------------

export type GeocodeResult = {
  label: string;
  lat: number;
  lng: number;
};

export async function geocodePlace(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return data.map((d) => ({
    label: d.display_name,
    lat: Number(d.lat),
    lng: Number(d.lon),
  }));
}

export type { Row };
