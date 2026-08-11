import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";
import { sel, useSoldierOptions, useUnitOptions, useVehicleOptions, RANKS } from "@/lib/options";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/vehicles")({
  head: () => ({
    meta: [
      { title: "Vehicle Registration | Military Management System" },
      { name: "description", content: "Fleet register with unit assignment and current serviceability." },
      { property: "og:title", content: "Vehicle Registration | Military Management System" },
      { property: "og:description", content: "Fleet register with unit assignment and current serviceability." },
    ],
  }),
  component: VehiclesPage,
});

function VehiclesPage() {
  const units = useUnitOptions();
  const soldiers = useSoldierOptions();
  const vehicles = useVehicleOptions();
  void units; void soldiers; void vehicles; void sel; void RANKS; void formatDate;

  return (
    <ResourcePage
      title="Vehicle Registration"
      description="Fleet register with unit assignment and current serviceability."
      module="Vehicle"
      table="vehicles"
      select="*, units(name)"
      orderBy="vehicle_code"
      columns={[
        { key: "vehicle_code", label: "Vehicle ID" },
        { key: "registration_number", label: "Registration" },
        { key: "type", label: "Type" },
        { key: "model", label: "Model" },
        { key: "manufacturer", label: "Manufacturer" },
        { key: "year", label: "Year" },
        { key: "unit", label: "Unit", render: (r) => (r["units"] as { name?: string } | null)?.name ?? "—" },
        { key: "driver", label: "Driver" },
        { key: "status", label: "Status", kind: "status" as const },
      ]}
      fields={[
        { name: "vehicle_code", label: "Vehicle ID", required: true },
        { name: "registration_number", label: "Registration Number", required: true },
        { name: "type", label: "Type" },
        { name: "model", label: "Model" },
        { name: "manufacturer", label: "Manufacturer" },
        { name: "year", label: "Year", type: "number" as const },
        { name: "unit_id", label: "Unit", type: "select" as const, options: units },
        { name: "driver", label: "Driver" },
        { name: "status", label: "Status", type: "select" as const, options: sel(["Operational", "Maintenance", "Out of Service", "Reserved"]) },
      ]}
      searchKeys={["vehicle_code", "registration_number", "model", "driver", "type"]}
      filters={[{ key: "status", label: "Status", options: ["Operational", "Maintenance", "Out of Service", "Reserved"] }]}
      
    />
  );
}
