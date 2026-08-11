import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

export type MapPoint = { id: string; name: string; category: string; lat: number; lng: number };

export default function LocationMap({ points }: { points: MapPoint[] }) {
  const center: [number, number] = points.length ? [points[0]!.lat, points[0]!.lng] : [9.082, 8.6753];

  return (
    <div className="h-[560px] w-full overflow-hidden rounded-lg">
      <MapContainer center={center} zoom={points.length ? 7 : 5} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point) => (
          <Marker key={point.id} position={[point.lat, point.lng]}>
            <Popup>
              <strong>{point.name}</strong>
              <br />
              {point.category}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
