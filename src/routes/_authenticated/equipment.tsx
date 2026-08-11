import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";
import { sel, useSoldierOptions, useUnitOptions, useVehicleOptions, RANKS } from "@/lib/options";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/equipment")({
  head: () => ({
    meta: [
      { title: "Equipment Registry | Military Management System" },
      { name: "description", content: "Accountability register for all issued and stored equipment." },
      { property: "og:title", content: "Equipment Registry | Military Management System" },
      { property: "og:description", content: "Accountability register for all issued and stored equipment." },
    ],
  }),
  component: EquipmentPage,
});

function EquipmentPage() {
  const units = useUnitOptions();
  const soldiers = useSoldierOptions();
  const vehicles = useVehicleOptions();
  void units; void soldiers; void vehicles; void sel; void RANKS; void formatDate;

  return (
    <ResourcePage
      title="Equipment Registry"
      description="Accountability register for all issued and stored equipment."
      module="Equipment"
      table="equipment"
      select="*, units(name)"
      orderBy="equipment_code"
      columns={[
        { key: "equipment_code", label: "Equipment ID" },
        { key: "name", label: "Name" },
        { key: "category", label: "Category" },
        { key: "serial_number", label: "Serial Number" },
        { key: "quantity", label: "Quantity" },
        { key: "condition", label: "Condition" },
        { key: "unit", label: "Unit", render: (r) => (r["units"] as { name?: string } | null)?.name ?? "—" },
        { key: "date_acquired", label: "Acquired", kind: "date" as const },
        { key: "status", label: "Status", kind: "status" as const },
      ]}
      fields={[
        { name: "equipment_code", label: "Equipment ID", required: true },
        { name: "name", label: "Name", required: true },
        { name: "category", label: "Category", type: "select" as const, options: sel(["Weapons Registry", "Communication Equipment", "Protective Equipment", "Technical Equipment", "General Equipment"]), required: true },
        { name: "serial_number", label: "Serial Number" },
        { name: "quantity", label: "Quantity", type: "number" as const },
        { name: "condition", label: "Condition", type: "select" as const, options: sel(["Good", "Fair", "Poor", "Damaged"]) },
        { name: "unit_id", label: "Location / Unit", type: "select" as const, options: units },
        { name: "assigned_to", label: "Assigned To", type: "select" as const, options: soldiers },
        { name: "date_acquired", label: "Date Acquired", type: "date" as const },
        { name: "status", label: "Status", type: "select" as const, options: sel(["Available", "Issued", "Under Maintenance", "Damaged", "Lost", "Retired"]) },
      ]}
      searchKeys={["equipment_code", "name", "serial_number", "category"]}
      filters={[
        { key: "category", label: "Category", options: ["Weapons Registry", "Communication Equipment", "Protective Equipment", "Technical Equipment", "General Equipment"] },
        { key: "status", label: "Status", options: ["Available", "Issued", "Under Maintenance", "Damaged", "Lost", "Retired"] },
      ]}
      
    />
  );
}
