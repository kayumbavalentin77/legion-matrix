import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Crosshair, Layers, Loader2, Maximize2, Navigation, Printer, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCoordinates, geocodePlace, type Coordinate, type GeocodeResult } from "@/lib/coordinates";
import { useAuthState } from "@/lib/auth";
import { usePresets } from "@/lib/presets";
import { fetchRoadRoutes, rankRoutes, ROUTING_SOURCE, type LogisticsAnalysis, type RoutePoint } from "@/lib/lcpp";

import LcppMap from "@/components/lcpp-map";
import { MapPreparationPanel } from "@/components/map-preparation-panel";
import { MapAreaTools } from "@/components/map-area-tools";
import { LandCoverAnalysis } from "@/components/land-cover-analysis";
import type { MapTools } from "@/components/map-preparation-layer";
import type { MapPoint, MapSheet } from "@/lib/map-preparation";

export const Route = createFileRoute("/_authenticated/lcpp")({
  ssr: false,
  head: () => ({ meta: [
    { title: "LCPP · Logistics Route Comparison | Military Management System" },
    { name: "description", content: "Prepare geographic map areas, upload map images and export printable maps; compare estimated road distance and travel time." },
    { property: "og:title", content: "LCPP · Logistics Route Comparison | Military Management System" },
    { property: "og:description", content: "General logistics road-route comparison using OpenStreetMap data and clearly labelled estimates." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: LcppPage,
});


const toPoint = (coordinate: Coordinate): RoutePoint => ({ name: coordinate.name, lat: coordinate.latitude, lng: coordinate.longitude });


function LcppPage() {
  const auth = useAuthState();
  const { data: coordinates = [] } = useCoordinates();
  const saved = usePresets("lcpp");
  const [origin, setOrigin] = useState<RoutePoint | null>(null);
  const [destination, setDestination] = useState<RoutePoint | null>(null);
  const [search, setSearch] = useState("");
  const [geoResults, setGeoResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pickTarget, setPickTarget] = useState<"origin" | "destination">("origin");
  const [picking, setPicking] = useState(false);

  const [sort, setSort] = useState("distance");
  const [sheet, setSheet] = useState<MapSheet>({title: "LCPP Map", boundary: [], overlay: null, layer: "street", grid: false, paper: "a4", orientation: "landscape"});
  const [drawTool,setDrawTool]=useState("none");
  const [editingBoundary,setEditingBoundary]=useState(false);
  const [imageUrl,setImageUrl]=useState("");
  const mapTools=useRef<MapTools|null>(null);
  const onTools=useCallback((tools:MapTools)=>{mapTools.current=tools;},[]);
  const onBoundary=useCallback((boundary:MapPoint[])=>{setSheet(previous=>({...previous,boundary}));},[]);
  const [analysis, setAnalysis] = useState<LogisticsAnalysis | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fitSignal, setFitSignal] = useState(0);
  const [focus, setFocus] = useState<{lat: number; lng: number; signal: number} | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const searchVersion = useRef(0);
  const savedHits = coordinates.filter(c => search.length >= 2 && `${c.name} ${c.place_name ?? ""}`.toLowerCase().includes(search.toLowerCase())).slice(0, 6);

  useEffect(() => {
    const version = ++searchVersion.current;
    setGeoResults([]);
    if (search.trim().length < 2) { setSearching(false); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try { const results = await geocodePlace(search); if (version === searchVersion.current) setGeoResults(results); }
      catch { if (version === searchVersion.current) toast.error("Place search unavailable; choose a saved location or the map."); }
      finally { if (version === searchVersion.current) setSearching(false); }
    }, 600);
    return () => { clearTimeout(timer); searchVersion.current++; };
  }, [search]);
  useEffect(() => () => request.current?.abort(), []);

  const routes = useMemo(() => rankRoutes(analysis?.routes ?? [], sort), [analysis, sort]);
  const points = useMemo(() => [origin, destination].flatMap((point, index) => point ? [{ id: `endpoint-${index}`, name: point.name, category: "Waypoint", classification: "Internal", latitude: point.lat, longitude: point.lng, dms_latitude: null, dms_longitude: null, place_name: null, description: null, distance_km: null, created_at: "", updated_at: "" }] : []), [origin, destination]);

  function choose(point: RoutePoint) {
    request.current?.abort(); setLoading(false);
    if (pickTarget === "origin") { setOrigin(point); setPickTarget("destination"); } else setDestination(point);
    setAnalysis(null); setError(""); setSearch(""); setPicking(false);
    setFocus({ lat: point.lat, lng: point.lng, signal: Date.now() });
  }
  async function compare() {
    if (!origin || !destination) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(""); setAnalysis(null);
    try {
      const result = await fetchRoadRoutes(origin, destination, controller.signal);
      if (controller.signal.aborted) return;
      setAnalysis({ origin, destination, routes: result, retrievedAt: new Date().toISOString() });
      setSelectedId(result[0]?.id ?? ""); setFitSignal(Date.now());
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not compare routes."); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }

  if (!auth.isLoading && !auth.can(["s3"])) return <PageHeader title="LCPP" description="This module is available in the Operations section." />;
  return <div className="space-y-6 print-area">
    <div className="lcpp-page-header"><PageHeader title="Least-Cost Probable Path (LCPP)" description="General logistics route comparison. Map images, area selection and topographic preparation. Road distances and travel times are estimates." actions={<div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={!analysis} onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print report</Button>
      <Button size="sm" disabled={!analysis} onClick={() => { setName(""); setSaveOpen(true); }}><Save className="mr-2 h-4 w-4" />Save analysis</Button>
    </div>} /></div>
    <Card><CardContent className="space-y-3 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center no-print">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Search locations" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search saved coordinates or a place name…" className="pl-8" />
          {searching && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
          {(savedHits.length > 0 || geoResults.length > 0) && search.length >= 2 && <div className="absolute z-[1000] mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover shadow-md">
            {savedHits.map(c => <Button key={c.id} variant="ghost" className="h-auto w-full justify-start whitespace-normal py-2 text-left" onClick={() => choose(toPoint(c))}>{c.name} · Saved coordinate</Button>)}
            {geoResults.map((r, index) => <Button key={index} variant="ghost" className="h-auto w-full justify-start whitespace-normal py-2 text-left" onClick={() => choose({name: r.label, lat: r.lat, lng: r.lng})}>{r.label}</Button>)}
          </div>}
        </div>
        <Select value={sort} onValueChange={setSort}><SelectTrigger aria-label="Compare by" className="md:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="distance">Shortest distance</SelectItem><SelectItem value="time">Fastest estimated time</SelectItem></SelectContent></Select>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { setSearch(""); setSort("distance"); }}><X className="mr-1 h-4 w-4" />Clear filters</Button>
          <Button size="sm" variant="outline" onClick={() => setSheet({...sheet,layer:sheet.layer === "satellite" ? "street" : "satellite"})}><Layers className="mr-1 h-4 w-4" />{sheet.layer === "satellite" ? "Street view" : "Satellite"}</Button>
          <Button size="sm" variant="outline" onClick={() => { if (!points.length) toast.info("No locations selected."); else setFitSignal(Date.now()); }}><Maximize2 className="mr-1 h-4 w-4" />Fit all markers</Button>
          <Button size="sm" variant={picking ? "default" : "outline"} onClick={() => {setPicking(!picking);setDrawTool("none");}}><Crosshair className="mr-1 h-4 w-4" />{picking ? "Cancel map pick" : "Pick from map"}</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 no-print">
        {(["rectangle","polygon","freehand"] as const).map(tool=><Button key={tool} size="sm" variant={drawTool===tool?"default":"outline"} onClick={()=>{setDrawTool(drawTool===tool?"none":tool);setPicking(false);setEditingBoundary(false);}}>{tool[0]?.toUpperCase()}{tool.slice(1)} selection</Button>)}
        <Button size="sm" variant="ghost" onClick={()=>setDrawTool("none")}>Stop drawing</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
        <span className="min-w-0 flex-1 break-words"><strong>From:</strong> {origin?.name ?? "Not selected"} <span className="mx-2">→</span> <strong>To:</strong> {destination?.name ?? "Not selected"}</span>
        <Select value={pickTarget} onValueChange={value => setPickTarget(value === "origin" ? "origin" : "destination")}><SelectTrigger aria-label="Location target" className="w-40 no-print"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="origin">Set origin</SelectItem><SelectItem value="destination">Set destination</SelectItem></SelectContent></Select>
      </div>
      <LcppMap map={{points,measurePath:[],picking,measuring:false,focus,fitSignal,satellite:sheet.layer === "satellite",selectedId:null,onPick:point=>choose({...point,name:`${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}),onMeasure:()=>{},onSelect:c=>setFocus({lat:c.latitude,lng:c.longitude,signal:Date.now()})}} preparation={{boundary:sheet.boundary,tool:drawTool,editing:editingBoundary,overlay:sheet.overlay,imageUrl,grid:sheet.grid,layer:sheet.layer,onBoundary,onTools}} routes={{routes:analysis?.routes??[],selectedId,fitSignal,onSelect:setSelectedId}}/>
    </CardContent></Card>
    <MapPreparationPanel sheet={sheet} onSheet={setSheet} tools={mapTools} editing={editingBoundary} onEditing={setEditingBoundary} imageUrl={imageUrl} onImageUrl={setImageUrl}/>
    <MapAreaTools boundary={sheet.boundary} coordinates={coordinates} onBoundary={onBoundary} onZoom={p=>mapTools.current?.zoomArea(p)}/>
    <LandCoverAnalysis/>
    <div>
      <Card><CardHeader><CardTitle className="text-base">Logistics route</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 no-print">{(["origin", "destination"] as const).map(target => <Select key={target} value={coordinates.find(c => c.latitude === (target === "origin" ? origin : destination)?.lat && c.longitude === (target === "origin" ? origin : destination)?.lng)?.id ?? ""} onValueChange={id => { const c = coordinates.find(c => c.id === id); if (!c) return; request.current?.abort(); setLoading(false); (target === "origin" ? setOrigin : setDestination)(toPoint(c)); setAnalysis(null); }}><SelectTrigger aria-label={target === "origin" ? "From saved coordinate" : "To saved coordinate"}><SelectValue placeholder={target === "origin" ? "From saved coordinate…" : "To saved coordinate…"} /></SelectTrigger><SelectContent>{coordinates.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>)}</div>
        <div className="flex flex-wrap gap-2 no-print">
          <Button size="sm" variant="outline" disabled={!origin || !destination || loading} onClick={() => { setOrigin(destination); setDestination(origin); setAnalysis(null); }}><ArrowLeftRight className="mr-1 h-4 w-4" />Swap</Button>
          <Button size="sm" variant="ghost" onClick={() => { request.current?.abort(); setLoading(false); setOrigin(null); setDestination(null); setAnalysis(null); setError(""); }}>Clear</Button>
          <Button size="sm" disabled={!origin || !destination || loading} onClick={compare}>{loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Navigation className="mr-1 h-4 w-4" />}Compare routes</Button>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">Source: {ROUTING_SOURCE}. Selected endpoints are sent to the public routing service. No live traffic, road-closure, vehicle-clearance or road-safety verification. Not a terrain-based or tactical path prediction.</p>
      </CardContent></Card>

    </div>
    <Card><CardHeader><CardTitle className="text-base">Route comparison {analysis && <Badge variant="outline" className="ml-2">Estimated</Badge>}</CardTitle></CardHeader><CardContent>
      {!analysis ? <p className="text-sm text-muted-foreground">No analysis available.</p> : <>
        <p className="mb-3 text-xs text-muted-foreground">Retrieved {new Date(analysis.retrievedAt).toLocaleString()}. {routes.length === 1 ? "Only one road route was returned; no alternatives are invented." : `${routes.length} public road alternatives returned.`} Only returned road alternatives are compared.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="py-2 pr-4">Route</th><th className="py-2 pr-4">Distance</th><th className="py-2 pr-4">Travel time</th><th className="py-2 no-print">Map</th></tr></thead><tbody>{routes.map((route, index) => <tr key={route.id} className={route.id === selectedId ? "border-b bg-muted/40" : "border-b"}><td className="py-3 pr-4 whitespace-nowrap">Route {route.id.replace("route-", "")} {index === 0 && <Badge variant="outline">{sort === "time" ? "Fastest" : "Shortest"}</Badge>}</td><td className="py-3 pr-4 tabular-nums whitespace-nowrap">{route.distanceKm.toFixed(2)} km</td><td className="py-3 pr-4 tabular-nums whitespace-nowrap">{Math.ceil(route.durationMinutes)} min</td><td className="py-3 no-print"><Button size="sm" variant="outline" onClick={() => setSelectedId(route.id)}>View</Button></td></tr>)}</tbody></table></div>
      </>}
    </CardContent></Card>
    <Card className="no-print"><CardHeader><CardTitle className="text-base">Saved analyses</CardTitle></CardHeader><CardContent className="space-y-3">
      {saved.isLoading ? <p className="text-sm text-muted-foreground">Loading saved analyses…</p> : saved.presets.length === 0 ? <p className="text-sm text-muted-foreground">No saved analyses.</p> : saved.presets.map(preset => <div key={preset.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"><span className="min-w-0 break-words text-sm font-medium">{preset.name}</span><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => { try { const restored = JSON.parse(preset.config.filters['snapshot'] ?? "") as LogisticsAnalysis; if (!restored.routes?.length || !restored.origin || !restored.destination) throw new Error();  request.current?.abort(); setLoading(false); setOrigin(restored.origin); setDestination(restored.destination);  setAnalysis(restored); setSelectedId(restored.routes[0]?.id ?? ""); setError(""); setFitSignal(Date.now()); } catch { toast.error("This saved analysis could not be opened."); } }}>Open</Button><Button size="icon" variant="ghost" aria-label={`Delete ${preset.name}`} onClick={() => setDeleteId(preset.id)}><Trash2 className="h-4 w-4" /></Button></div></div>)}
    </CardContent></Card>
    <Dialog open={saveOpen} onOpenChange={setSaveOpen}><DialogContent><DialogHeader><DialogTitle>Save logistics analysis</DialogTitle></DialogHeader><Label htmlFor="analysis-name">Analysis name</Label><Input id="analysis-name" value={name} onChange={e => setName(e.target.value)} maxLength={100} /><p className="text-xs text-muted-foreground">Saved privately to your account. Reusing a name replaces its previous analysis.</p><DialogFooter><Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button><Button disabled={!name.trim() || saved.save.isPending} onClick={async () => { if (!analysis) return; try { await saved.save.mutateAsync({name, config: {query: "", filters: {snapshot: JSON.stringify(analysis)}}}); setSaveOpen(false); } catch {} }}>Save</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}><DialogContent><DialogHeader><DialogTitle>Delete saved analysis?</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">This removes only this saved analysis, not any coordinates or other records.</p><DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="destructive" disabled={saved.remove.isPending} onClick={async () => { if (!deleteId) return; try { await saved.remove.mutateAsync(deleteId); setDeleteId(null); } catch {} }}>Delete</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}