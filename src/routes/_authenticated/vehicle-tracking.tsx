import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";
import { sel, useSoldierOptions, useUnitOptions, useVehicleOptions, RANKS } from "@/lib/options";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/vehicle-tracking")({
  head: () => ({
    meta: [
      { title: "Vehicle Tracking | Military Management System" },
      { name: "description", content: "Administrative last-recorded location and status entries (no covert tracking)." },
      { property: "og:title", content: "Vehicle Tracking | Military Management System" },
      { property: "og:description", content: "Administrative last-recorded location and status entries (no covert tracking)." },
    ],
  }),
  component: VehicleTrackingPage,
});

function VehicleTrackingPage() {
  const units = useUnitOptions();
  const soldiers = useSoldierOptions();
  const vehicles = useVehicleOptions();
  void units; void soldiers; void vehicles; void sel; void RANKS; void formatDate;

  return (
    <ResourcePage
      title="Vehicle Tracking"
      description="Administrative last-recorded location and status entries (no covert tracking)."
      module="Location Record"
      table="vehicle_locations"
      select="*, vehicles(registration_number)"
      orderBy="recorded_at"
      columns={[
        { key: "vehicle", label: "Vehicle", render: (r) => (r["vehicles"] as { registration_number?: string } | null)?.registration_number ?? "—" },
        { key: "location_name", label: "Last Recorded Location" },
        { key: "latitude", label: "Latitude" },
        { key: "longitude", label: "Longitude" },
        { key: "recorded_at", label: "Recorded", kind: "date" as const },
        { key: "status", label: "Status", kind: "status" as const },
      ]}
      fields={[
        { name: "vehicle_id", label: "Vehicle", type: "select" as const, options: vehicles, required: true },
        { name: "location_name", label: "Location Name", required: true },
        { name: "latitude", label: "Latitude", type: "number" as const },
        { name: "longitude", label: "Longitude", type: "number" as const },
        { name: "status", label: "Status", type: "select" as const, options: sel(["Operational", "Maintenance", "Out of Service", "Reserved"]) },
      ]}
      searchKeys={["location_name", "status"]}
      filters={[]}
      
    />
  );
}
