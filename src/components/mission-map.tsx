import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { categoryStyle, type Coordinate } from "@/lib/coordinates";

export type MeasurePoint = { lat: number; lng: number };

function markerIcon(category: string) {
  const { color, symbol } = categoryStyle(category);
  return L.divIcon({
    className: "",
    html: `<div style="pointer-events:none;background:${color};color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);border-radius:9999px;min-width:30px;height:30px;padding:0 6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;letter-spacing:.02em;">${symbol}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

function MapEvents({
  picking,
  measuring,
  onPick,
  onMeasure,
}: {
  picking: boolean;
  measuring: boolean;
  onPick: (p: MeasurePoint) => void;
  onMeasure: (p: MeasurePoint) => void;
}) {
  useMapEvents({
    click(e) {
      const p = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (picking) onPick(p);
      else if (measuring) onMeasure(p);
    },
  });
  return null;
}

function MapController({
  focus,
  fitSignal,
  points,
}: {
  focus: { lat: number; lng: number; zoom?: number; signal: number } | null;
  fitSignal: number;
  points: Coordinate[];
}) {
  const map = useMap();
  const lastFocus = useRef(0);
  const lastFit = useRef(0);

  useEffect(() => {
    if (focus && focus.signal !== lastFocus.current) {
      lastFocus.current = focus.signal;
      map.flyTo([focus.lat, focus.lng], focus.zoom ?? 13, { duration: 0.8 });
    }
  }, [focus, map]);

  useEffect(() => {
    if (fitSignal !== lastFit.current) {
      lastFit.current = fitSignal;
      if (points.length) {
        map.fitBounds(L.latLngBounds(points.map((p) => [p.latitude, p.longitude])).pad(0.2));
      }
    }
  }, [fitSignal, points, map]);

  return null;
}

export default function MissionMap({
  points,
  measurePath,
  picking,
  measuring,
  focus,
  fitSignal,
  satellite,
  selectedId,
  onPick,
  onMeasure,
  onSelect,
}: {
  points: Coordinate[];
  measurePath: MeasurePoint[];
  picking: boolean;
  measuring: boolean;
  focus: { lat: number; lng: number; zoom?: number; signal: number } | null;
  fitSignal: number;
  satellite: boolean;
  selectedId: string | null;
  onPick: (p: MeasurePoint) => void;
  onMeasure: (p: MeasurePoint) => void;
  onSelect: (c: Coordinate) => void;
}) {
  const center: [number, number] = points.length
    ? [points[0]!.latitude, points[0]!.longitude]
    : [-1.9441, 30.0619];

  const icons = useMemo(() => {
    const m = new Map<string, L.DivIcon>();
    for (const p of points) if (!m.has(p.category)) m.set(p.category, markerIcon(p.category));
    return m;
  }, [points]);

  return (
    <div className="h-[560px] w-full overflow-hidden rounded-lg">
      <MapContainer
        center={center}
        zoom={points.length ? 8 : 6}
        className="h-full w-full"
        style={{ cursor: picking || measuring ? "crosshair" : undefined }}
      >
        {satellite ? (
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        <MapEvents picking={picking} measuring={measuring} onPick={onPick} onMeasure={onMeasure} />
        <MapController focus={focus} fitSignal={fitSignal} points={points} />

        {points.map((p) => (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={icons.get(p.category) ?? markerIcon(p.category)}
            eventHandlers={{ click: () => onSelect(p) }}
          >
            <Popup>
              <strong>{p.name}</strong>
              <br />
              {p.category}
              <br />
              {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
            </Popup>
          </Marker>
        ))}

        {selectedId
          ? points
              .filter((p) => p.id === selectedId)
              .map((p) => (
                <Marker key={`sel-${p.id}`} position={[p.latitude, p.longitude]} icon={markerIcon(p.category)} />
              ))
          : null}

        {measurePath.length > 1 ? (
          <Polyline
            positions={measurePath.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: "#b91c1c", weight: 3, dashArray: "6 6" }}
          />
        ) : null}
        {measurePath.map((p, i) => (
          <Marker
            key={`m-${i}`}
            position={[p.lat, p.lng]}
            icon={L.divIcon({
              className: "",
              html: `<div style="background:#b91c1c;color:#fff;border:2px solid #fff;border-radius:9999px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">${i + 1}</div>`,
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            })}
          />
        ))}
      </MapContainer>
    </div>
  );
}
