import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/vehicle-status")({
  head: () => ({
    meta: [
      { title: "Vehicle Status | Military Management System" },
      { name: "description", content: "Fleet availability summary by operational status and unit." },
      { property: "og:title", content: "Vehicle Status | Military Management System" },
      { property: "og:description", content: "Fleet availability summary by operational status and unit." },
    ],
  }),
  component: VehicleStatusPage,
});

function VehicleStatusPage() {
  const { data = [] } = useQuery({
    queryKey: ["vehicle-status", "summary"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id,vehicle_code,registration_number,type,model,status,driver,units(name)")
        .order("vehicle_code");
      return data ?? [];
    },
  });

  const counts = new Map<string, number>();
  data.forEach((v) => {
    const key = v.status ?? "Unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Status"
        description="Current operational status of every registered vehicle."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...counts].map(([status, count]) => (
          <Card key={status}>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold tabular-nums">{count}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{status}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fleet detail</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Registration</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.vehicle_code}</TableCell>
                  <TableCell>{v.registration_number}</TableCell>
                  <TableCell>{v.type ?? "—"}</TableCell>
                  <TableCell>{(v.units as { name?: string } | null)?.name ?? "—"}</TableCell>
                  <TableCell>{v.driver ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge value={v.status} />
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No vehicles registered yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
