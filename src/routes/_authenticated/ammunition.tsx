import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";
import { sel, useSoldierOptions, useUnitOptions, useVehicleOptions, RANKS } from "@/lib/options";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/ammunition")({
  head: () => ({
    meta: [
      { title: "Ammunition Inventory | Military Management System" },
      { name: "description", content: "Accountability and stock control only. All movements are written to the audit log." },
      { property: "og:title", content: "Ammunition Inventory | Military Management System" },
      { property: "og:description", content: "Accountability and stock control only. All movements are written to the audit log." },
    ],
  }),
  component: AmmoPage,
});

function AmmoPage() {
  const units = useUnitOptions();
  const soldiers = useSoldierOptions();
  const vehicles = useVehicleOptions();
  void units; void soldiers; void vehicles; void sel; void RANKS; void formatDate;

  return (
    <ResourcePage
      title="Ammunition Inventory"
      description="Accountability and stock control only. All movements are written to the audit log."
      module="Ammunition"
      table="ammunition_inventory"
      select="*, units(name)"
      orderBy="item_code"
      columns={[
        { key: "item_code", label: "Item ID" },
        { key: "type", label: "Type" },
        { key: "batch_number", label: "Batch Number" },
        { key: "quantity", label: "Quantity" },
        { key: "unit", label: "Unit", render: (r) => (r["units"] as { name?: string } | null)?.name ?? "—" },
        { key: "storage_location", label: "Storage Location" },
        { key: "condition", label: "Condition" },
        { key: "inspection_date", label: "Inspection Date", kind: "date" as const },
        { key: "status", label: "Status", kind: "status" as const },
      ]}
      fields={[
        { name: "item_code", label: "Item ID", required: true },
        { name: "type", label: "Type", required: true },
        { name: "batch_number", label: "Batch Number" },
        { name: "quantity", label: "Quantity", type: "number" as const },
        { name: "unit_id", label: "Unit", type: "select" as const, options: units },
        { name: "storage_location", label: "Storage Location" },
        { name: "condition", label: "Condition", type: "select" as const, options: sel(["Serviceable", "Inspection Due", "Unserviceable"]) },
        { name: "inspection_date", label: "Inspection Date", type: "date" as const },
        { name: "status", label: "Status", type: "select" as const, options: sel(["Available", "Issued", "Under Inspection", "Retired"]) },
      ]}
      searchKeys={["item_code", "type", "batch_number", "storage_location"]}
      filters={[{ key: "status", label: "Status", options: ["Available", "Issued", "Under Inspection", "Retired"] }]}
      
    />
  );
}
