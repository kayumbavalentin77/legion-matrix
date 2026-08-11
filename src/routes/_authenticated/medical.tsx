import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";
import { sel, useSoldierOptions, useUnitOptions, useVehicleOptions, RANKS } from "@/lib/options";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/medical")({
  head: () => ({
    meta: [
      { title: "Medical Records | Military Management System" },
      { name: "description", content: "Restricted module. Visible only to medical officers and administrators." },
      { property: "og:title", content: "Medical Records | Military Management System" },
      { property: "og:description", content: "Restricted module. Visible only to medical officers and administrators." },
    ],
  }),
  component: MedicalPage,
});

function MedicalPage() {
  const units = useUnitOptions();
  const soldiers = useSoldierOptions();
  const vehicles = useVehicleOptions();
  void units; void soldiers; void vehicles; void sel; void RANKS; void formatDate;

  return (
    <ResourcePage
      title="Medical Records"
      description="Restricted module. Visible only to medical officers and administrators."
      module="Medical Record"
      table="medical_records"
      select="*, soldiers(full_name, service_number)"
      orderBy="visit_date"
      columns={[
        { key: "soldier", label: "Soldier", render: (r) => (r["soldiers"] as { full_name?: string } | null)?.full_name ?? "—" },
        { key: "visit_date", label: "Date", kind: "date" as const },
        { key: "visit_type", label: "Visit Type" },
        { key: "status", label: "Status", kind: "status" as const },
        { key: "fitness_restriction", label: "Fitness Restriction" },
        { key: "return_to_duty", label: "Return to Duty", kind: "date" as const },
      ]}
      fields={[
        { name: "soldier_id", label: "Soldier", type: "select" as const, options: soldiers, required: true },
        { name: "visit_date", label: "Visit Date", type: "date" as const, required: true },
        { name: "visit_type", label: "Visit Type", type: "select" as const, options: sel(["Routine Check-up", "Injury", "Illness", "Specialist Referral", "Vaccination"]) },
        { name: "status", label: "Status", type: "select" as const, options: sel(["Open", "Under Review", "Closed"]) },
        { name: "fitness_restriction", label: "Fitness Restriction" },
        { name: "return_to_duty", label: "Return-to-Duty Date", type: "date" as const },
        { name: "notes", label: "Medical Notes", type: "textarea" as const },
      ]}
      searchKeys={["visit_type", "status", "fitness_restriction"]}
      filters={[{ key: "status", label: "Status", options: ["Open", "Under Review", "Closed"] }]}
      
    />
  );
}
