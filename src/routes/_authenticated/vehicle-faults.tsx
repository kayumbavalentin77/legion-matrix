import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";
import { sel, useSoldierOptions, useUnitOptions, useVehicleOptions, RANKS } from "@/lib/options";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/vehicle-faults")({
  head: () => ({
    meta: [
      { title: "Fault Reports | Military Management System" },
      { name: "description", content: "Reported vehicle defects with priority and resolution status." },
      { property: "og:title", content: "Fault Reports | Military Management System" },
      { property: "og:description", content: "Reported vehicle defects with priority and resolution status." },
    ],
  }),
  component: VehicleFaultsPage,
});

function VehicleFaultsPage() {
  const units = useUnitOptions();
  const soldiers = useSoldierOptions();
  const vehicles = useVehicleOptions();
  void units; void soldiers; void vehicles; void sel; void RANKS; void formatDate;

  return (
    <ResourcePage
      title="Fault Reports"
      description="Reported vehicle defects with priority and resolution status."
      module="Fault Report"
      table="vehicle_faults"
      select="*, vehicles(registration_number)"
      orderBy="report_date"
      columns={[
        { key: "vehicle", label: "Vehicle", render: (r) => (r["vehicles"] as { registration_number?: string } | null)?.registration_number ?? "—" },
        { key: "fault_type", label: "Fault Type" },
        { key: "description", label: "Description" },
        { key: "reported_by", label: "Reported By" },
        { key: "report_date", label: "Date", kind: "date" as const },
        { key: "priority", label: "Priority", kind: "status" as const },
        { key: "status", label: "Status", kind: "status" as const },
      ]}
      fields={[
        { name: "vehicle_id", label: "Vehicle", type: "select" as const, options: vehicles, required: true },
        { name: "fault_type", label: "Fault Type", type: "select" as const, options: sel(["Mechanical", "Electrical", "Bodywork", "Tyres", "Other"]) },
        { name: "reported_by", label: "Reported By" },
        { name: "report_date", label: "Date", type: "date" as const },
        { name: "priority", label: "Priority", type: "select" as const, options: sel(["Low", "Medium", "High", "Critical"]) },
        { name: "status", label: "Status", type: "select" as const, options: sel(["Open", "In Progress", "Closed"]) },
        { name: "description", label: "Description", type: "textarea" as const },
      ]}
      searchKeys={["fault_type", "description", "reported_by"]}
      filters={[
        { key: "priority", label: "Priority", options: ["Low", "Medium", "High", "Critical"] },
        { key: "status", label: "Status", options: ["Open", "In Progress", "Closed"] },
      ]}
      
    />
  );
}
