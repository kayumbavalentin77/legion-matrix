import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useMemo, useRef, useState } from "react";
import {
  Crosshair,
  Layers,
  Loader2,
  MapPin,
  Maximize2,
  Pencil,
  Plus,
  Ruler,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { CoordinateFormDialog } from "@/components/coordinate-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/data";
import { useAuthState } from "@/lib/auth";
import { haversineKm, toDms, useBaseLocation } from "@/lib/geo";
import {
  categoryStyle,
  COORDINATE_CATEGORIES,
  geocodePlace,
  useCoordinates,
  type Coordinate,
  type GeocodeResult,
} from "@/lib/coordinates";

const MissionMap = lazy(() => import("@/components/mission-map"));

export const Route = createFileRoute("/_authenticated/map")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mission Map | Military Management System" },
      { name: "description", content: "Interactive mission map showing all saved GPS coordinates with search, filters and distance measurement." },
      { property: "og:title", content: "Mission Map | Military Management System" },
      { property: "og:description", content: "Interactive mission map showing all saved GPS coordinates with search, filters and distance measurement." },
    ],
  }),
  component: MapPage,
});

type Focus = { lat: number; lng: number; zoom?: number; signal: number };

function MapPage() {
  const base = useBaseLocation();
  const qc = useQueryClient();
  const { canWrite } = useAuthState();
  const { data: coordinates = [], isLoading } = useCoordinates();

  const [search, setSearch] = useState("");
  const [geoResults, setGeoResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [selected, setSelected] = useState<Coordinate | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [satellite, setSatellite] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Coordinate | null>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [deleting, setDeleting] = useState<Coordinate | null>(null);

  const [measuring, setMeasuring] = useState(false);
  const [measurePath, setMeasurePath] = useState<{ lat: number; lng: number }[]>([]);
  const [distFrom, setDistFrom] = useState<string>("");
  const [distTo, setDistTo] = useState<string>("");

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coordinates.filter((c) => {
      if (categoryFilter !== "All" && c.category !== categoryFilter) return false;
      if (!q) return true;
      return [c.name, c.category, c.description ?? "", c.place_name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [coordinates, search, categoryFilter]);

  const measureTotal = useMemo(() => {
    let total = 0;
    for (let i = 1; i < measurePath.length; i++) total += haversineKm(measurePath[i - 1]!, measurePath[i]!);
    return total;
  }, [measurePath]);

  const pairDistance = useMemo(() => {
    const a = coordinates.find((c) => c.id === distFrom);
    const b = coordinates.find((c) => c.id === distTo);
    if (!a || !b || a.id === b.id) return null;
    return { a, b, km: haversineKm({ lat: a.latitude, lng: a.longitude }, { lat: b.latitude, lng: b.longitude }) };
  }, [coordinates, distFrom, distTo]);

  const pairPath = useMemo(
    () =>
      pairDistance
        ? [
            { lat: pairDistance.a.latitude, lng: pairDistance.a.longitude },
            { lat: pairDistance.b.latitude, lng: pairDistance.b.longitude },
          ]
        : [],
    [pairDistance],
  );

  function runSearch(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = value.trim();
    if (q.length < 2) {
      setGeoResults([]);
      return;
    }
    // Saved-coordinate match: zoom straight to the first hit.
    const hit = coordinates.find((c) => c.name.toLowerCase().includes(q.toLowerCase()));
    if (hit) {
      setSelected(hit);
      setFocus({ lat: hit.latitude, lng: hit.longitude, signal: Date.now() });
    }
    // Geocoding for place names not yet saved.
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        setGeoResults(await geocodePlace(q));
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gps_coordinates").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted", "GPS Coordinates", id, "Removed a saved coordinate");
    },
    onSuccess: () => {
      toast.success("Coordinate removed");
      setDeleting(null);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["gps_coordinates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categoriesPresent = useMemo(
    () => COORDINATE_CATEGORIES.filter((c) => coordinates.some((x) => x.category === c)),
    [coordinates],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mission Map"
        description={`All saved GPS coordinates on one interactive map. Distances measured from ${base.name}.`}
        actions={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={picking ? "default" : "outline"}
                onClick={() => {
                  setPicking((p) => !p);
                  setMeasuring(false);
                  if (!picking) toast.info("Click anywhere on the map to place the new coordinate.");
                }}
              >
                <Crosshair className="mr-2 h-4 w-4" /> {picking ? "Cancel map pick" : "Add from map"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setPicked(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add coordinate
              </Button>
            </div>
          ) : null
        }
      />

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => runSearch(e.target.value)}
                placeholder="Search saved coordinates or a place name…"
                className="pl-8"
              />
              {searching ? (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              ) : null}
              {geoResults.length > 0 && search.trim().length >= 2 ? (
                <div className="absolute z-[1000] mt-1 w-full rounded-md border bg-popover shadow-md">
                  {geoResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        setFocus({ lat: r.lat, lng: r.lng, signal: Date.now() });
                        setGeoResults([]);
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="md:w-56">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All categories</SelectItem>
                {COORDINATE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("All");
                  setGeoResults([]);
                }}
              >
                <X className="mr-1 h-4 w-4" /> Clear filters
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSatellite((s) => !s)}>
                <Layers className="mr-1 h-4 w-4" /> {satellite ? "Street view" : "Satellite"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!filtered.length) {
                    toast.info("No coordinates available.");
                    return;
                  }
                  setFitSignal(Date.now());
                }}
              >
                <Maximize2 className="mr-1 h-4 w-4" /> Fit all markers
              </Button>
              <Button
                size="sm"
                variant={measuring ? "default" : "outline"}
                onClick={() => {
                  setMeasuring((m) => !m);
                  setPicking(false);
                  if (!measuring) {
                    setMeasurePath([]);
                    toast.info("Click points on the map to measure distance.");
                  }
                }}
              >
                <Ruler className="mr-1 h-4 w-4" /> {measuring ? "Stop measuring" : "Measure distance"}
              </Button>
              {measurePath.length ? (
                <Button size="sm" variant="ghost" onClick={() => setMeasurePath([])}>
                  Clear measurement
                </Button>
              ) : null}
            </div>
          </div>

          {measuring || measurePath.length > 1 ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              {measurePath.length > 1 ? (
                <>
                  {measurePath.slice(1).map((p, i) => (
                    <span key={i} className="mr-3 inline-block tabular-nums">
                      Point {i + 1} → {i + 2}: {haversineKm(measurePath[i]!, p).toLocaleString()} km
                    </span>
                  ))}
                  <span className="font-medium tabular-nums">Total: {measureTotal.toLocaleString()} km</span>
                </>
              ) : (
                <span className="text-muted-foreground">Click at least two points on the map.</span>
              )}
            </div>
          ) : null}

          <Suspense
            fallback={
              <div className="grid h-[560px] place-items-center text-sm text-muted-foreground">Loading map…</div>
            }
          >
            <MissionMap
              points={filtered}
              measurePath={pairPath.length ? pairPath : measurePath}
              picking={picking}
              measuring={measuring}
              focus={focus}
              fitSignal={fitSignal}
              satellite={satellite}
              selectedId={selected?.id ?? null}
              onPick={(p) => {
                setPicking(false);
                setPicked(p);
                setEditing(null);
                setFormOpen(true);
              }}
              onMeasure={(p) => setMeasurePath((path) => [...path, p])}
              onSelect={(c) => setSelected(c)}
            />
          </Suspense>

          {!isLoading && filtered.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">No coordinates available.</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Map legend</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {(categoriesPresent.length ? categoriesPresent : ["Other"]).map((c) => {
              const s = categoryStyle(c);
              return (
                <span key={c} className="inline-flex items-center gap-1.5 text-sm">
                  <span
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                    style={{ background: s.color }}
                  >
                    {s.symbol}
                  </span>
                  {c}
                </span>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distance between saved coordinates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={distFrom} onValueChange={setDistFrom}>
                <SelectTrigger>
                  <SelectValue placeholder="From…" />
                </SelectTrigger>
                <SelectContent>
                  {coordinates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={distTo} onValueChange={setDistTo}>
                <SelectTrigger>
                  <SelectValue placeholder="To…" />
                </SelectTrigger>
                <SelectContent>
                  {coordinates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {pairDistance ? (
              <p className="text-sm tabular-nums">
                {pairDistance.a.name} → {pairDistance.b.name}:{" "}
                <span className="font-medium">{pairDistance.km.toLocaleString()} km</span>
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDistFrom(distTo);
                  setDistTo(distFrom);
                }}
                disabled={!distFrom || !distTo}
              >
                Swap
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDistFrom("");
                  setDistTo("");
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {selected ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {selected.name}
                <Badge variant="outline">{selected.category}</Badge>
              </CardTitle>
              {selected.place_name ? (
                <p className="mt-1 text-sm text-muted-foreground">{selected.place_name}</p>
              ) : null}
            </div>
            <Button size="icon" variant="ghost" onClick={() => setSelected(null)} aria-label="Close details">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Latitude</p>
                <p className="tabular-nums">{selected.latitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Longitude</p>
                <p className="tabular-nums">{selected.longitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">DMS</p>
                <p className="tabular-nums">
                  {selected.dms_latitude ?? toDms(selected.latitude, "lat")} ·{" "}
                  {selected.dms_longitude ?? toDms(selected.longitude, "lng")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Distance from {base.name}</p>
                <p className="tabular-nums">
                  {(selected.distance_km ??
                    haversineKm(base, { lat: selected.latitude, lng: selected.longitude })
                  ).toLocaleString()}{" "}
                  km
                </p>
              </div>
            </div>
            {selected.description ? <p className="text-muted-foreground">{selected.description}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setFocus({ lat: selected.latitude, lng: selected.longitude, zoom: 14, signal: Date.now() })
                }
              >
                Zoom here
              </Button>
              {canWrite ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(selected);
                      setPicked(null);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="mr-1 h-4 w-4" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleting(selected)}>
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <CoordinateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        initialLatLng={picked}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coordinate?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes &quot;{deleting?.name}&quot; from GPS Coordinates and the Mission Map.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && remove.mutate(deleting.id)}
              disabled={remove.isPending}
            >
              {remove.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
