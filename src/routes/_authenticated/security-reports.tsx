import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";
import { sel, useSoldierOptions, useUnitOptions, useVehicleOptions, RANKS } from "@/lib/options";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/security-reports")({
  head: () => ({
    meta: [
      { title: "Security Reports | Military Management System" },
      { name: "description", content: "Security information reporting and assessment records." },
      { property: "og:title", content: "Security Reports | Military Management System" },
      { property: "og:description", content: "Security information reporting and assessment records." },
    ],
  }),
  component: SecurityReportsPage,
});

function SecurityReportsPage() {
  const units = useUnitOptions();
  const soldiers = useSoldierOptions();
  const vehicles = useVehicleOptions();
  void units; void soldiers; void vehicles; void sel; void RANKS; void formatDate;

  return (
    <ResourcePage
      title="Security Reports"
      description="Security information reporting and assessment records."
      module="Security Report"
      table="security_reports"
      select="*"
      orderBy="report_date"
      columns={[
        { key: "report_code", label: "Report ID" },
        { key: "report_date", label: "Date", kind: "date" as const },
        { key: "source", label: "Source" },
        { key: "location", label: "Location" },
        { key: "category", label: "Category" },
        { key: "reliability", label: "Reliability" },
        { key: "risk_level", label: "Risk Level", kind: "status" as const },
        { key: "status", label: "Status", kind: "status" as const },
      ]}
      fields={[
        { name: "report_code", label: "Report ID", required: true },
        { name: "report_date", label: "Date", type: "date" as const, required: true },
        { name: "source", label: "Source" },
        { name: "location", label: "Location" },
        { name: "category", label: "Category" },
        { name: "reliability", label: "Reliability", type: "select" as const, options: sel(["Reliable", "Probable", "Possible", "Unverified"]) },
        { name: "risk_level", label: "Risk Level", type: "select" as const, options: sel(["Low", "Medium", "High", "Critical"]) },
        { name: "status", label: "Status", type: "select" as const, options: sel(["Open", "Under Review", "Closed"]) },
        { name: "description", label: "Description", type: "textarea" as const },
      ]}
      searchKeys={["report_code", "source", "location", "category", "description"]}
      filters={[
        { key: "risk_level", label: "Risk Level", options: ["Low", "Medium", "High", "Critical"] },
        { key: "status", label: "Status", options: ["Open", "Under Review", "Closed"] },
      ]}
      
    />
  );
}
