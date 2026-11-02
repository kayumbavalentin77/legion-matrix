import area from "@turf/area";
export type MapPoint = { lat: number; lng: number };
export type MapBounds = [[number, number], [number, number]];
export type MapOverlay = { path: string; name: string; bounds: MapBounds; georeferenced: boolean; opacity: number; rotation: number };
export type MapSheet = { title: string; boundary: MapPoint[]; overlay: MapOverlay | null; layer: string; grid: boolean; paper: "a4" | "a3" | "a2"; orientation: "portrait" | "landscape" };
export function boundaryAreaKm2(points: MapPoint[]) {
  if (points.length < 3) return 0;
  const ring = points.map(p => [p.lng, p.lat]);
  const first = ring[0];
  if (!first) return 0;
  return area({ type: "Polygon", coordinates: [[...ring, first]] }) / 1e6;
}
export function validBounds(bounds: MapBounds) {
  const [[south, west], [north, east]] = bounds;
  return [south, west, north, east].every(Number.isFinite) && south >= -90 && north <= 90 && west >= -180 && east <= 180 && south < north && west < east;
}
export async function readMapImage(file: File): Promise<{ blob: Blob; bounds: MapBounds | null }> {
  if (file.size > 20 * 1024 * 1024) throw new Error("Map images must be 20 MB or smaller.");
  if (/\.tiff?$/i.test(file.name)) {
    const { fromArrayBuffer } = await import("geotiff");
    const tiff = await fromArrayBuffer(await file.arrayBuffer());
    const image = await tiff.getImage();
    if (image.getSamplesPerPixel() < 3) throw new Error("This single-band TIFF requires GIS preprocessing. Upload a rendered RGB GeoTIFF or PNG.");
    const width = Math.min(image.getWidth(), 2048);
    const height = Math.max(1, Math.round(image.getHeight() * width / image.getWidth()));
    const rgb = await image.readRGB({ width, height, interleave: true });
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d"); if (!context) throw new Error("Image preview is unavailable.");
    const data = context.createImageData(width, height);
    for (let i = 0; i < width * height; i++) { data.data[i * 4] = Number(rgb[i * 3] ?? 0); data.data[i * 4 + 1] = Number(rgb[i * 3 + 1] ?? 0); data.data[i * 4 + 2] = Number(rgb[i * 3 + 2] ?? 0); data.data[i * 4 + 3] = 255; }
    context.putImageData(data, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Cannot render TIFF.")), "image/png"));
    const keys = image.getGeoKeys(); let bounds: MapBounds | null = null;
    try {
      const [west, south, east, north] = image.getBoundingBox();
      if ([west,south,east,north].every(value => typeof value === "number")) {
        const box = [west,south,east,north] as [number,number,number,number];
        if (keys?.['GeographicTypeGeoKey'] === 4326) bounds = [[box[1],box[0]],[box[3],box[2]]];
        if (keys?.['ProjectedCSTypeGeoKey'] === 3857) {
          const lat = (y: number) => (2 * Math.atan(Math.exp(y / 6378137)) - Math.PI / 2) * 180 / Math.PI;
          bounds = [[lat(box[1]),box[0]/6378137*180/Math.PI],[lat(box[3]),box[2]/6378137*180/Math.PI]];
        }
      }
    } catch { /* No usable geographic metadata. */ }
    return {blob, bounds: bounds && validBounds(bounds) ? bounds : null};
  }
  if (!/^image\/(png|jpeg)$/.test(file.type)) throw new Error("Upload JPG, PNG or supported RGB GeoTIFF.");
  const bitmap = await createImageBitmap(file); bitmap.close();
  return { blob: file, bounds: null };
}