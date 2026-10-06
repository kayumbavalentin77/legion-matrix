import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { CoordinateFormDialog } from "@/components/coordinate-form-dialog";
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
import { haversineKm, toDms, useBaseLocation } from "@/lib/geo";
import { useCoordinates, type Coordinate } from "@/lib/coordinates";

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

function CoordinatesPage() {
  const base = useBaseLocation();
  const qc = useQueryClient();
  const { canWrite } = useAuthState();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coordinate | null>(null);
  const [deleting, setDeleting] = useState<Coordinate | null>(null);

  const { data: rows = [] } = useCoordinates();

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gps_coordinates").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted", "GPS Coordinates", id, "Removed a saved coordinate");
    },
    onSuccess: () => {
      toast.success("Coordinate removed");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["gps_coordinates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="GPS Coordinates"
        description={`Degrees-minutes-seconds or decimal input. Distances measured from ${base.name}. Saved coordinates appear automatically on the Mission Map.`}
        actions={
          canWrite ? (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
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
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(row);
                            setOpen(true);
                          }}
                          aria-label="Edit coordinate"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(row)}
                          aria-label="Delete coordinate"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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

      <CoordinateFormDialog open={open} onOpenChange={setOpen} editing={editing} />

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
