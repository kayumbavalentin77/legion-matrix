import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";
import { sel, useSoldierOptions, useUnitOptions, useVehicleOptions, RANKS } from "@/lib/options";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/fitness")({
  head: () => ({
    meta: [
      { title: "Physical Fitness | Military Management System" },
      { name: "description", content: "Fitness test results, scoring and category assessment." },
      { property: "og:title", content: "Physical Fitness | Military Management System" },
      { property: "og:description", content: "Fitness test results, scoring and category assessment." },
    ],
  }),
  component: FitnessPage,
});

function FitnessPage() {
  const units = useUnitOptions();
  const soldiers = useSoldierOptions();
  const vehicles = useVehicleOptions();
  void units; void soldiers; void vehicles; void sel; void RANKS; void formatDate;

  return (
    <ResourcePage
      title="Physical Fitness"
      description="Fitness test results, scoring and category assessment."
      module="Fitness Record"
      table="fitness_records"
      select="*, soldiers(full_name, service_number)"
      orderBy="test_date"
      columns={[
        { key: "soldier", label: "Soldier", render: (r) => (r["soldiers"] as { full_name?: string } | null)?.full_name ?? "—" },
        { key: "test_date", label: "Test Date", kind: "date" as const },
        { key: "running_time", label: "Running" },
        { key: "push_ups", label: "Push-ups" },
        { key: "sit_ups", label: "Sit-ups" },
        { key: "score", label: "Score" },
        { key: "category", label: "Category", kind: "status" as const },
      ]}
      fields={[
        { name: "soldier_id", label: "Soldier", type: "select" as const, options: soldiers, required: true },
        { name: "test_date", label: "Test Date", type: "date" as const, required: true },
        { name: "running_time", label: "Running Result" },
        { name: "push_ups", label: "Push-ups", type: "number" as const },
        { name: "sit_ups", label: "Sit-ups", type: "number" as const },
        { name: "score", label: "Overall Score", type: "number" as const },
        { name: "category", label: "Fitness Category", type: "select" as const, options: sel(["Excellent", "Good", "Average", "Needs Improvement"]) },
      ]}
      searchKeys={["running_time", "category"]}
      filters={[{ key: "category", label: "Category", options: ["Excellent", "Good", "Average", "Needs Improvement"] }]}
      
    />
  );
}
