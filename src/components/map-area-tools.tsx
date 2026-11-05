import { useMemo, useRef, useState } from "react";
import { Download, FolderOpen, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePresets } from "@/lib/presets";
import { boundaryAreaKm2, type MapPoint } from "@/lib/map-preparation";
import { areaFromGeoJSON, areaToGeoJSON, perimeterKm, pointInArea } from "@/lib/map-areas";
import type { Coordinate } from "@/lib/coordinates";

export function MapAreaTools({ boundary, coordinates, onBoundary, onZoom }: { boundary: MapPoint[]; coordinates: Coordinate[]; onBoundary: (p: MapPoint[]) => void; onZoom: (p: MapPoint[]) => void }) {
  const saved = usePresets("lcpp-areas");
  const [name, setName] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const has = boundary.length >= 3;
  const inside = useMemo(() => (has ? coordinates.filter((c) => pointInArea({ lat: c.latitude, lng: c.longitude }, boundary)) : []), [has, coordinates, boundary]);
  const byCategory = useMemo(() => Object.entries(inside.reduce<Record<string, number>>((m, c) => ({ ...m, [c.category]: (m[c.category] ?? 0) + 1 }), {})), [inside]);
  const km2 = boundaryAreaKm2(boundary);

  const exportArea = () => {
    const blob = new Blob([JSON.stringify(areaToGeoJSON(name.trim() || "Map area", boundary), null, 2)], { type: "application/geo+json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${(name.trim() || "map-area").replace(/[^\w-]+/g, "_")}.geojson`; a.click(); URL.revokeObjectURL(a.href);
  };
  const importArea = async (f: File) => {
    try { const { name: n, ring } = areaFromGeoJSON(await f.text()); onBoundary(ring); onZoom(ring); setName(n); toast.success(`Imported "${n}"`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not read this file."); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Map area tools</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">Draw with the Rectangle, Polygon or Freehand selection buttons above the map, edit with "Edit boundary", then save, export or import areas here (GeoJSON).</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Area</p><p className="font-semibold tabular-nums">{km2.toFixed(3)} km²</p><p className="text-xs text-muted-foreground tabular-nums">{(km2 * 100).toFixed(1)} ha</p></div>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Perimeter</p><p className="font-semibold tabular-nums">{perimeterKm(has ? boundary : []).toFixed(2)} km</p><p className="text-xs text-muted-foreground">{boundary.length} vertices</p></div>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Saved locations inside</p><p className="font-semibold tabular-nums">{inside.length}</p><p className="text-xs text-muted-foreground">of {coordinates.length} total</p></div>
        </div>
        {has && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Features inside this area</p>
            {inside.length === 0 ? <p className="text-sm text-muted-foreground">No saved locations fall inside this area.</p> : <>
              <div className="flex flex-wrap gap-2">{byCategory.map(([cat, n]) => <Badge key={cat} variant="secondary">{cat}: {n}</Badge>)}</div>
              <div className="max-h-40 overflow-auto text-sm">{inside.map((c) => <p key={c.id} className="border-b py-1">{c.name} <span className="text-muted-foreground">· {c.category}</span></p>)}</div>
            </>}
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input aria-label="Area name" placeholder="Area name…" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          <Button disabled={!has || !name.trim() || saved.save.isPending} onClick={() => saved.save.mutate({ name, config: { query: "", filters: { ring: JSON.stringify(boundary) } } })}><Save className="mr-2 h-4 w-4" />Save area</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={!has} onClick={exportArea}><Download className="mr-1 h-4 w-4" />Export GeoJSON</Button>
          <Button variant="outline" size="sm" onClick={() => file.current?.click()}><Upload className="mr-1 h-4 w-4" />Import GeoJSON</Button>
          <input ref={file} type="file" accept=".geojson,.json,application/geo+json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importArea(f); e.target.value = ""; }} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Saved areas</p>
          {saved.presets.length === 0 ? <p className="text-sm text-muted-foreground">No saved areas.</p> : saved.presets.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <span className="break-words text-sm">{p.name}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { try { const ring = JSON.parse(p.config.filters["ring"] ?? "") as MapPoint[]; if (!Array.isArray(ring) || ring.length < 3) throw new Error(); onBoundary(ring); onZoom(ring); setName(p.name); } catch { toast.error("This saved area could not be opened."); } }}><FolderOpen className="mr-1 h-4 w-4" />Open</Button>
                <Button size="icon" variant="ghost" aria-label={`Delete area ${p.name}`} onClick={() => { if (confirm(`Delete saved area "${p.name}"?`)) saved.remove.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
