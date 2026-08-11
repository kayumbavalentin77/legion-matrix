import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";
import { sel, useSoldierOptions, useUnitOptions, useVehicleOptions, RANKS } from "@/lib/options";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/operations")({
  head: () => ({
    meta: [
      { title: "Operation Planning | Military Management System" },
      { name: "description", content: "Administrative planning records for missions and events. No tactical or targeting functions." },
      { property: "og:title", content: "Operation Planning | Military Management System" },
      { property: "og:description", content: "Administrative planning records for missions and events. No tactical or targeting functions." },
    ],
  }),
  component: OperationsPage,
});

function OperationsPage() {
  const units = useUnitOptions();
  const soldiers = useSoldierOptions();
  const vehicles = useVehicleOptions();
  void units; void soldiers; void vehicles; void sel; void RANKS; void formatDate;

  return (
    <ResourcePage
      title="Operation Planning"
      description="Administrative planning records for missions and events. No tactical or targeting functions."
      module="Planning Record"
      table="operations"
      select="*, units(name)"
      orderBy="start_date"
      columns={[
        { key: "reference_number", label: "Reference Number" },
        { key: "title", label: "Title" },
        { key: "unit", label: "Unit", render: (r) => (r["units"] as { name?: string } | null)?.name ?? "—" },
        { key: "responsible_officer", label: "Responsible Officer" },
        { key: "start_date", label: "Start Date", kind: "date" as const },
        { key: "end_date", label: "End Date", kind: "date" as const },
        { key: "status", label: "Status", kind: "status" as const },
      ]}
      fields={[
        { name: "reference_number", label: "Reference Number", required: true },
        { name: "title", label: "Title", required: true },
        { name: "unit_id", label: "Unit", type: "select" as const, options: units },
        { name: "responsible_officer", label: "Responsible Officer" },
        { name: "start_date", label: "Start Date", type: "date" as const },
        { name: "end_date", label: "End Date", type: "date" as const },
        { name: "status", label: "Status", type: "select" as const, options: sel(["Draft", "Pending Approval", "Approved", "Completed", "Archived"]) },
        { name: "description", label: "Description", type: "textarea" as const },
      ]}
      searchKeys={["reference_number", "title", "responsible_officer"]}
      filters={[{ key: "status", label: "Status", options: ["Draft", "Pending Approval", "Approved", "Completed", "Archived"] }]}
      
    />
  );
}
