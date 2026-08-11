import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";
import { sel, useSoldierOptions, useUnitOptions, useVehicleOptions, RANKS } from "@/lib/options";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/coordinates")({
  head: () => ({
    meta: [
      { title: "GPS Coordinates | Military Management System" },
      { name: "description", content: "Approved administrative locations with latitude and longitude." },
      { property: "og:title", content: "GPS Coordinates | Military Management System" },
      { property: "og:description", content: "Approved administrative locations with latitude and longitude." },
    ],
  }),
  component: CoordinatesPage,
});

function CoordinatesPage() {
  const units = useUnitOptions();
  const soldiers = useSoldierOptions();
  const vehicles = useVehicleOptions();
  void units; void soldiers; void vehicles; void sel; void RANKS; void formatDate;

  return (
    <ResourcePage
      title="GPS Coordinates"
      description="Approved administrative locations with latitude and longitude."
      module="Location"
      table="locations"
      select="*"
      orderBy="name"
      columns={[
        { key: "name", label: "Name" },
        { key: "category", label: "Category" },
        { key: "latitude", label: "Latitude" },
        { key: "longitude", label: "Longitude" },
        { key: "classification", label: "Classification", kind: "status" as const },
        { key: "description", label: "Description" },
      ]}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "category", label: "Category", type: "select" as const, options: sel(["Unit", "Facility", "Checkpoint", "Depot"]) },
        { name: "latitude", label: "Latitude", type: "number" as const, required: true },
        { name: "longitude", label: "Longitude", type: "number" as const, required: true },
        { name: "classification", label: "Classification", type: "select" as const, options: sel(["Public", "Internal", "Confidential", "Restricted"]) },
        { name: "description", label: "Description", type: "textarea" as const },
      ]}
      searchKeys={["name", "category", "description"]}
      filters={[{ key: "category", label: "Category", options: ["Unit", "Facility", "Checkpoint", "Depot"] }]}
      
    />
  );
}
