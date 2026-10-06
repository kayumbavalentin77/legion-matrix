import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/data";
import { haversineKm, parseCoordinate, toDms, useBaseLocation } from "@/lib/geo";
import { COORDINATE_CATEGORIES, type Coordinate } from "@/lib/coordinates";

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

export function CoordinateFormDialog({
  open,
  onOpenChange,
  editing,
  initialLatLng,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Coordinate | null;
  initialLatLng?: { lat: number; lng: number } | null;
}) {
  const base = useBaseLocation();
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        category: editing.category,
        classification: editing.classification,
        latitude: editing.dms_latitude ?? String(editing.latitude),
        longitude: editing.dms_longitude ?? String(editing.longitude),
        place_name: editing.place_name ?? "",
        description: editing.description ?? "",
      });
    } else {
      setForm({
        ...EMPTY,
        latitude: initialLatLng ? String(Number(initialLatLng.lat.toFixed(6))) : "",
        longitude: initialLatLng ? String(Number(initialLatLng.lng.toFixed(6))) : "",
      });
    }
  }, [open, editing, initialLatLng]);

  const lat = parseCoordinate(form.latitude, "lat");
  const lng = parseCoordinate(form.longitude, "lng");
  const preview =
    lat !== null && lng !== null
      ? { dmsLat: toDms(lat, "lat"), dmsLng: toDms(lng, "lng"), distance: haversineKm(base, { lat, lng }) }
      : null;

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Give the location a name.");
      if (lat === null || lng === null) throw new Error('Enter valid coordinates, e.g. 01°56\'38.8"S.');
      const payload = {
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
      };
      if (editing) {
        const { error } = await supabase.from("gps_coordinates").update(payload).eq("id", editing.id);
        if (error) throw error;
        await logAudit("Updated", "GPS Coordinates", editing.id, `Updated coordinate ${payload.name}`);
      } else {
        const { data, error } = await supabase.from("gps_coordinates").insert(payload).select("id").single();
        if (error) throw error;
        await logAudit("Created", "GPS Coordinates", data?.id, `Saved coordinate ${payload.name}`);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Coordinate updated" : "Coordinate saved");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["gps_coordinates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit coordinate" : "Add coordinate"}</DialogTitle>
          <DialogDescription>
            Enter DMS (01°56&apos;38.8&quot;S) or decimal degrees (-1.944). Both formats are stored.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="coord-name">Location name</Label>
            <Input
              id="coord-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="coord-lat">Latitude</Label>
            <Input
              id="coord-lat"
              value={form.latitude}
              placeholder={`01°56'38.8"S`}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="coord-lng">Longitude</Label>
            <Input
              id="coord-lng"
              value={form.longitude}
              placeholder={`030°03'42.8"E`}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="coord-category">Category / symbol</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger id="coord-category" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COORDINATE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="coord-classification">Classification</Label>
            <Select
              value={form.classification}
              onValueChange={(v) => setForm({ ...form, classification: v })}
            >
              <SelectTrigger id="coord-classification" className="mt-1.5">
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
            <Label htmlFor="coord-place">Place / district</Label>
            <Input
              id="coord-place"
              value={form.place_name}
              onChange={(e) => setForm({ ...form, place_name: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="coord-description">Notes</Label>
            <Textarea
              id="coord-description"
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {editing ? "Save changes" : "Save coordinate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
