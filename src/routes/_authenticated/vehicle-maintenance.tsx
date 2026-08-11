import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";
import { sel, useSoldierOptions, useUnitOptions, useVehicleOptions, RANKS } from "@/lib/options";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/vehicle-maintenance")({
  head: () => ({
    meta: [
      { title: "Vehicle Maintenance | Military Management System" },
      { name: "description", content: "Scheduled and corrective maintenance records with cost tracking." },
      { property: "og:title", content: "Vehicle Maintenance | Military Management System" },
      { property: "og:description", content: "Scheduled and corrective maintenance records with cost tracking." },
    ],
  }),
  component: VehicleMaintenancePage,
});

function VehicleMaintenancePage() {
  const units = useUnitOptions();
  const soldiers = useSoldierOptions();
  const vehicles = useVehicleOptions();
  void units; void soldiers; void vehicles; void sel; void RANKS; void formatDate;

  return (
    <ResourcePage
      title="Vehicle Maintenance"
      description="Scheduled and corrective maintenance records with cost tracking."
      module="Maintenance Record"
      table="vehicle_maintenance"
      select="*, vehicles(registration_number)"
      orderBy="maintenance_date"
      columns={[
        { key: "vehicle", label: "Vehicle", render: (r) => (r["vehicles"] as { registration_number?: string } | null)?.registration_number ?? "—" },
        { key: "maintenance_type", label: "Type" },
        { key: "maintenance_date", label: "Date", kind: "date" as const },
        { key: "technician", label: "Technician" },
        { key: "cost", label: "Cost" },
        { key: "next_maintenance_date", label: "Next Due", kind: "date" as const },
        { key: "status", label: "Status", kind: "status" as const },
      ]}
      fields={[
        { name: "vehicle_id", label: "Vehicle", type: "select" as const, options: vehicles, required: true },
        { name: "maintenance_type", label: "Maintenance Type", type: "select" as const, options: sel(["Scheduled Service", "Repair", "Inspection", "Overhaul"]) },
        { name: "maintenance_date", label: "Date", type: "date" as const },
        { name: "technician", label: "Technician" },
        { name: "cost", label: "Cost", type: "number" as const },
        { name: "next_maintenance_date", label: "Next Maintenance Date", type: "date" as const },
        { name: "status", label: "Status", type: "select" as const, options: sel(["Pending", "In Progress", "Completed"]) },
        { name: "description", label: "Description", type: "textarea" as const },
      ]}
      searchKeys={["maintenance_type", "technician", "description"]}
      filters={[{ key: "status", label: "Status", options: ["Pending", "In Progress", "Completed"] }]}
      
    />
  );
}
