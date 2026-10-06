import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";
import { sel, useSoldierOptions, useUnitOptions, useVehicleOptions, RANKS } from "@/lib/options";
import { formatDate } from "@/lib/data";
import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthState } from "@/lib/auth";
import { StockTxDialog, StockCardDialog, type StockItem } from "@/components/stock-dialogs";

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
  const { canWrite } = useAuthState();
  const [rx, setRx] = useState<StockItem | null>(null);
  const [iss, setIss] = useState<StockItem | null>(null);
  const [card, setCard] = useState<StockItem | null>(null);
  void units; void soldiers; void vehicles; void sel; void RANKS; void formatDate;

  return (
    <>
    <ResourcePage
      onView={(r) => setCard(r as unknown as StockItem)}
      rowActions={(r) => canWrite ? (<>
        <Button variant="ghost" size="icon" aria-label="Add Received" title="Add Received" onClick={() => setRx(r as unknown as StockItem)}><ArrowDownToLine className="h-4 w-4 text-primary" /></Button>
        <Button variant="ghost" size="icon" aria-label="Issue Stock" title="Issue Stock" disabled={Number(r["quantity"] ?? 0) <= 0} onClick={() => setIss(r as unknown as StockItem)}><ArrowUpFromLine className="h-4 w-4" /></Button>
      </>) : null}
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
        { key: "quantity", label: "Current Balance" },
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
        { name: "quantity", label: "Opening Quantity (use Add Received / Issue Stock afterwards)", type: "number" as const },
        { name: "minimum_level", label: "Minimum Level", type: "number" as const },
        { name: "unit_of_measure", label: "Unit of Measure" },
        { name: "storage_location", label: "Storage Location" },
      ]}
      searchKeys={["item_code", "name", "category", "storage_location"]}
      filters={[]}
    />
    <StockTxDialog item={rx} type="Received" onClose={() => setRx(null)} />
    <StockTxDialog item={iss} type="Issued" onClose={() => setIss(null)} />
    <StockCardDialog item={card} onClose={() => setCard(null)} />
    </>
  );
}
