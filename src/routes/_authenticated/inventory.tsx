import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";
import { sel, useSoldierOptions, useUnitOptions, useVehicleOptions, RANKS } from "@/lib/options";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "General Inventory | Military Management System" },
      { name: "description", content: "Stock levels, minimum thresholds and low-stock visibility." },
      { property: "og:title", content: "General Inventory | Military Management System" },
      { property: "og:description", content: "Stock levels, minimum thresholds and low-stock visibility." },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const units = useUnitOptions();
  const soldiers = useSoldierOptions();
  const vehicles = useVehicleOptions();
  void units; void soldiers; void vehicles; void sel; void RANKS; void formatDate;

  return (
    <ResourcePage
      title="General Inventory"
      description="Stock levels, minimum thresholds and low-stock visibility."
      module="Inventory Item"
      table="inventory"
      select="*"
      orderBy="item_code"
      columns={[
        { key: "item_code", label: "Item Code" },
        { key: "name", label: "Item" },
        { key: "category", label: "Category" },
        { key: "quantity", label: "Quantity" },
        { key: "minimum_level", label: "Minimum Level" },
        { key: "unit_of_measure", label: "Unit" },
        { key: "storage_location", label: "Storage Location" },
        { key: "stock", label: "Stock Status", render: (r) => {
            const q = Number(r["quantity"] ?? 0);
            const m = Number(r["minimum_level"] ?? 0);
            const label = q === 0 ? "Out of Stock" : q < m ? "Low" : "OK";
            return <span className={q === 0 ? "font-medium text-destructive" : q < m ? "font-medium text-chart-3" : "text-primary"}>{label}</span>;
          } },
      ]}
      fields={[
        { name: "item_code", label: "Item Code", required: true },
        { name: "name", label: "Item Name", required: true },
        { name: "category", label: "Category" },
        { name: "quantity", label: "Quantity", type: "number" as const },
        { name: "minimum_level", label: "Minimum Level", type: "number" as const },
        { name: "unit_of_measure", label: "Unit of Measure" },
        { name: "storage_location", label: "Storage Location" },
      ]}
      searchKeys={["item_code", "name", "category", "storage_location"]}
      filters={[]}
      
    />
  );
}
