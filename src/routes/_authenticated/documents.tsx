import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";
import { sel, useSoldierOptions, useUnitOptions, useVehicleOptions, RANKS } from "@/lib/options";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Document Management | Military Management System" },
      { name: "description", content: "Centralised document register with classification-based handling." },
      { property: "og:title", content: "Document Management | Military Management System" },
      { property: "og:description", content: "Centralised document register with classification-based handling." },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const units = useUnitOptions();
  const soldiers = useSoldierOptions();
  const vehicles = useVehicleOptions();
  void units; void soldiers; void vehicles; void sel; void RANKS; void formatDate;

  return (
    <ResourcePage
      title="Document Management"
      description="Centralised document register with classification-based handling."
      module="Document"
      table="documents"
      select="*, units(name)"
      orderBy="document_date"
      columns={[
        { key: "document_code", label: "Document ID" },
        { key: "title", label: "Title" },
        { key: "category", label: "Category" },
        { key: "author", label: "Author" },
        { key: "unit", label: "Unit", render: (r) => (r["units"] as { name?: string } | null)?.name ?? "—" },
        { key: "document_date", label: "Date", kind: "date" as const },
        { key: "classification", label: "Classification", kind: "status" as const },
        { key: "status", label: "Status", kind: "status" as const },
      ]}
      fields={[
        { name: "document_code", label: "Document ID", required: true },
        { name: "title", label: "Title", required: true },
        { name: "category", label: "Category" },
        { name: "author", label: "Author" },
        { name: "unit_id", label: "Unit", type: "select" as const, options: units },
        { name: "document_date", label: "Date", type: "date" as const },
        { name: "classification", label: "Classification", type: "select" as const, options: sel(["Public", "Internal", "Confidential", "Restricted"]) },
        { name: "status", label: "Status", type: "select" as const, options: sel(["Active", "Archived"]) },
        { name: "file_name", label: "File Reference" },
      ]}
      searchKeys={["document_code", "title", "category", "author"]}
      filters={[
        { key: "classification", label: "Classification", options: ["Public", "Internal", "Confidential", "Restricted"] },
        { key: "status", label: "Status", options: ["Active", "Archived"] },
      ]}
      
    />
  );
}
