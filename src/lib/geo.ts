import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Axis = "lat" | "lng";

/**
 * Parses military DMS coordinates such as 08°41'41.8"N or plain decimal degrees.
 * Returns null when the value cannot be interpreted.
 */
export function parseCoordinate(input: string, axis: Axis): number | null {
  if (!input) return null;
  const raw = input.trim().toUpperCase().replace(/\s+/g, " ");

  const decimal = raw.match(/^(-?\d+(?:\.\d+)?)\s*°?\s*([NSEW])?$/);
  if (decimal) {
    let value = Number(decimal[1]);
    const hemi = decimal[2];
    if (hemi === "S" || hemi === "W") value = -Math.abs(value);
    return withinRange(value, axis) ? value : null;
  }

  const dms = raw.match(
    /^([NSEW])?\s*(\d+(?:\.\d+)?)\s*[°D:\s]\s*(?:(\d+(?:\.\d+)?)\s*['’M:\s]\s*)?(?:(\d+(?:\.\d+)?)\s*["”S]?\s*)?([NSEW])?$/,
  );
  if (!dms) return null;

  const degrees = Number(dms[2]);
  const minutes = dms[3] ? Number(dms[3]) : 0;
  const seconds = dms[4] ? Number(dms[4]) : 0;
  if (minutes >= 60 || seconds >= 60) return null;

  const hemisphere = dms[5] ?? dms[1];
  let value = degrees + minutes / 60 + seconds / 3600;
  if (hemisphere === "S" || hemisphere === "W") value = -value;
  return withinRange(value, axis) ? Number(value.toFixed(6)) : null;
}

function withinRange(value: number, axis: Axis) {
  if (Number.isNaN(value)) return false;
  return axis === "lat" ? Math.abs(value) <= 90 : Math.abs(value) <= 180;
}

/** Formats decimal degrees as DMS, e.g. 08°41'41.8"N */
export function toDms(value: number | null | undefined, axis: Axis): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const num = Number(value);
  const hemisphere = axis === "lat" ? (num >= 0 ? "N" : "S") : num >= 0 ? "E" : "W";
  const abs = Math.abs(num);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  const pad = (n: number, size = 2) => String(n).padStart(size, "0");
  return `${pad(degrees, axis === "lat" ? 2 : 3)}°${pad(minutes)}'${seconds.toFixed(1).padStart(4, "0")}"${hemisphere}`;
}

export function formatDecimal(lat: number, lng: number) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/** Great-circle distance in kilometres (Haversine). */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Number((2 * R * Math.asin(Math.sqrt(h))).toFixed(2));
}

export type BaseLocation = { name: string; lat: number; lng: number };

export const DEFAULT_BASE: BaseLocation = { name: "Kigali HQ", lat: -1.9441, lng: 30.0619 };

export function useBaseLocation(): BaseLocation {
  const { data } = useQuery({
    queryKey: ["settings", "base-location"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("key,value")
        .in("key", ["base_location_name", "base_latitude", "base_longitude"]);
      const map = new Map((data ?? []).map((r) => [r.key, r.value]));
      return {
        name: map.get("base_location_name") || DEFAULT_BASE.name,
        lat: Number(map.get("base_latitude") ?? DEFAULT_BASE.lat),
        lng: Number(map.get("base_longitude") ?? DEFAULT_BASE.lng),
      } as BaseLocation;
    },
  });
  return data ?? DEFAULT_BASE;
}
