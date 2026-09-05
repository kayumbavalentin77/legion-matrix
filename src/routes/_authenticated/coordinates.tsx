import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/data";
import { useAuthState } from "@/lib/auth";
import { haversineKm, parseCoordinate, toDms, useBaseLocation } from "@/lib/geo";

export const Route = createFileRoute("/_authenticated/coordinates")({
  head: () => ({
    meta: [
      { title: "GPS Coordinates | Military Management System" },
      { name: "description", content: "Record and convert DMS or decimal coordinates and measure distance from base." },
      { property: "og:title", content: "GPS Coordinates | Military Management System" },
      { property: "og:description", content: "Record and convert DMS or decimal coordinates and measure distance from base." },
    ],
  }),
  component: CoordinatesPage,
});

const CATEGORIES = ["Unit", "Checkpoint", "Facility", "Waypoint", "Observation Post", "Other"];
const CLASSIFICATIONS = ["Unclassified", "Restricted", "Confidential", "Secret"];

const EMPTY = {
  name: "",
  category: "Waypoint",
  classification: "Restricted",
  latitude: "",
  longitude: "",
  place_name: "",
  description: "",
};

function CoordinatesPage() {
  const base = useBaseLocation();
  const qc = useQueryClient();
  const { canWrite } = useAuthState();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const lat = parseCoordinate(form.latitude, "lat");
  const lng = parseCoordinate(form.longitude, "lng");
  const preview =
    lat !== null && lng !== null
      ? {
          dmsLat: toDms(lat, "lat"),
          dmsLng: toDms(lng, "lng"),
          distance: haversineKm(base, { lat, lng }),
        }
      : null;

  const { data: rows = [] } = useQuery({
    queryKey: ["gps_coordinates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gps_coordinates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Give the location a name.");
      if (lat === null || lng === null) throw new Error("Enter valid coordinates, e.g. 01°56'38.8\"S.");
      const { data, error } = await supabase
        .from("gps_coordinates")
        .insert({
          name: form.name.trim(),
          category: form.category,
          classification: form.classification,
          latitude: lat,
          longitude: lng,
          dms_latitude: toDms(lat, "lat"),
          dms_longitude: toDms(lng, "lng"),
          place_name: form.place_name.trim() || null,
          description: form.description.trim() || null,
          distance_km: haversineKm(base, { lat, lng }),
        })
        .select("id")
        .single();
      if (error) throw error;
      await logAudit("Created", "GPS Coordinates", data?.id, `Saved coordinate ${form.name}`);
    },
    onSuccess: () => {
      toast.success("Coordinate saved");
      setForm({ ...EMPTY });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["gps_coordinates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gps_coordinates").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted", "GPS Coordinates", id, "Removed a saved coordinate");
    },
    onSuccess: () => {
      toast.success("Coordinate removed");
      qc.invalidateQueries({ queryKey: ["gps_coordinates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="GPS Coordinates"
        description={`Degrees-minutes-seconds or decimal input. Distances measured from ${base.name}.`}
        actions={
          canWrite ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add coordinate
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved coordinates</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Latitude (DMS)</TableHead>
                <TableHead>Longitude (DMS)</TableHead>
                <TableHead>Decimal</TableHead>
                <TableHead className="text-right">Distance</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {row.name}
                    </div>
                    {row.place_name ? (
                      <p className="text-xs text-muted-foreground">{row.place_name}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell className="tabular-nums">{row.dms_latitude ?? toDms(row.latitude, "lat")}</TableCell>
                  <TableCell className="tabular-nums">{row.dms_longitude ?? toDms(row.longitude, "lng")}</TableCell>
                  <TableCell className="tabular-nums text-xs text-muted-foreground">
                    {Number(row.latitude).toFixed(5)}, {Number(row.longitude).toFixed(5)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(row.distance_km ?? haversineKm(base, { lat: row.latitude, lng: row.longitude })).toLocaleString()} km
                  </TableCell>
                  <TableCell className="text-right">
                    {canWrite ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove.mutate(row.id)}
                        aria-label="Delete coordinate"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No coordinates saved yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add coordinate</DialogTitle>
            <DialogDescription>
              Enter DMS (01°56&apos;38.8&quot;S) or decimal degrees (-1.944). Both formats are stored.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Location name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                value={form.latitude}
                placeholder={`01°56'38.8"S`}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                value={form.longitude}
                placeholder={`030°03'42.8"E`}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger id="category" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="classification">Classification</Label>
              <Select
                value={form.classification}
                onValueChange={(v) => setForm({ ...form, classification: v })}
              >
                <SelectTrigger id="classification" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASSIFICATIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="place">Place / district</Label>
              <Input
                id="place"
                value={form.place_name}
                onChange={(e) => setForm({ ...form, place_name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Notes</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>

          {preview ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <p className="font-medium tabular-nums">
                {preview.dmsLat} · {preview.dmsLng}
              </p>
              <p className="text-muted-foreground">
                {preview.distance.toLocaleString()} km from {base.name}
              </p>
            </div>
          ) : form.latitude || form.longitude ? (
            <p className="text-sm text-destructive">Coordinates not recognised yet.</p>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save coordinate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
