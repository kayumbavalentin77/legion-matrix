import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";
import { sel, useSoldierOptions, useUnitOptions, useVehicleOptions, RANKS } from "@/lib/options";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/soldiers")({
  head: () => ({
    meta: [
      { title: "Soldier Registry | Military Management System" },
      { name: "description", content: "Complete personnel registry with service, contact and posting details." },
      { property: "og:title", content: "Soldier Registry | Military Management System" },
      { property: "og:description", content: "Complete personnel registry with service, contact and posting details." },
    ],
  }),
  component: SoldiersPage,
});

function SoldiersPage() {
  const units = useUnitOptions();
  const soldiers = useSoldierOptions();
  const vehicles = useVehicleOptions();
  void units; void soldiers; void vehicles; void sel; void RANKS; void formatDate;

  return (
    <ResourcePage
      title="Soldier Registry"
      description="Complete personnel registry with service, contact and posting details."
      module="Soldier"
      table="soldiers"
      select="*, units(name)"
      orderBy="service_number"
      columns={[
        { key: "service_number", label: "Service Number" },
        { key: "full_name", label: "Full Name" },
        { key: "rank", label: "Rank" },
        { key: "unit", label: "Unit", render: (r) => (r["units"] as { name?: string } | null)?.name ?? "—" },
        { key: "gender", label: "Gender" },
        { key: "date_of_birth", label: "Date of Birth", kind: "date" as const },
        { key: "phone", label: "Phone" },
        { key: "status", label: "Status", kind: "status" as const },
        { key: "date_joined", label: "Date Joined", kind: "date" as const },
      ]}
      fields={[
        { name: "service_number", label: "Service Number", required: true },
        { name: "full_name", label: "Full Name", required: true },
        { name: "rank", label: "Rank", type: "select" as const, options: sel(RANKS), required: true },
        { name: "unit_id", label: "Unit", type: "select" as const, options: units },
        { name: "gender", label: "Gender", type: "select" as const, options: sel(["Male", "Female"]) },
        { name: "date_of_birth", label: "Date of Birth", type: "date" as const },
        { name: "nationality", label: "Nationality" },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email", type: "email" as const },
        { name: "position", label: "Position" },
        { name: "date_joined", label: "Date Joined", type: "date" as const },
        { name: "status", label: "Service Status", type: "select" as const, options: sel(["Active", "On Leave", "Inactive", "Discharged"]) },
        { name: "address", label: "Address", type: "textarea" as const },
      ]}
      searchKeys={["service_number", "full_name", "rank", "position", "phone"]}
      filters={[
        { key: "rank", label: "Rank", options: RANKS },
        { key: "status", label: "Status", options: ["Active", "On Leave", "Inactive", "Discharged"] },
      ]}
      
    />
  );
}
