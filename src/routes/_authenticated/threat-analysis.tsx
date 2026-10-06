import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";
import { toDms } from "@/lib/geo";

export const Route = createFileRoute("/_authenticated/threat-analysis")({
  head: () => ({
    meta: [
      { title: "Threat Analysis | Military Management System" },
      { name: "description", content: "Assess, rate and track security threats with likelihood, impact and mitigation." },
      { property: "og:title", content: "Threat Analysis | Military Management System" },
      { property: "og:description", content: "Assess, rate and track security threats with likelihood, impact and mitigation." },
    ],
  }),
  component: ThreatAnalysis,
});

function ThreatAnalysis() {
  return (
    <ResourcePage
      title="Threat Analysis"
      description="Analytical assessments of reported threats. Administrative use only."
      module="Threat Analysis"
      table="threats"
      searchKeys={["threat_code", "title", "category", "location_name"]}
      filters={[
        { key: "risk_level", label: "Risk level", options: ["Low", "Medium", "High", "Critical"] },
        { key: "status", label: "Status", options: ["Open", "Monitoring", "Mitigated", "Closed"] },
      ]}
      columns={[
        { key: "threat_code", label: "Code" },
        { key: "title", label: "Threat" },
        { key: "category", label: "Category" },
        { key: "location_name", label: "Location" },
        {
          key: "latitude",
          label: "Coordinates",
          render: (row) =>
            row["latitude"] == null
              ? "—"
              : `${toDms(Number(row["latitude"]), "lat")} ${toDms(Number(row["longitude"]), "lng")}`,
        },
        { key: "risk_level", label: "Risk", kind: "status" },
        { key: "status", label: "Status", kind: "status" },
        { key: "assessed_on", label: "Assessed", kind: "date" },
      ]}
      fields={[
        { name: "threat_code", label: "Threat code", required: true },
        { name: "title", label: "Title", required: true },
        {
          name: "category",
          label: "Category",
          type: "select",
          options: ["Border Security", "Public Order", "Cyber", "Infrastructure", "Natural Hazard", "Other"].map((v) => ({ value: v, label: v })),
        },
        { name: "location_name", label: "Location" },
        { name: "latitude", label: "Latitude (decimal)", type: "number" },
        { name: "longitude", label: "Longitude (decimal)", type: "number" },
        {
          name: "likelihood",
          label: "Likelihood",
          type: "select",
          options: ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"].map((v) => ({ value: v, label: v })),
        },
        {
          name: "impact",
          label: "Impact",
          type: "select",
          options: ["Minor", "Moderate", "Major", "Severe"].map((v) => ({ value: v, label: v })),
        },
        {
          name: "risk_level",
          label: "Risk level",
          type: "select",
          required: true,
          options: ["Low", "Medium", "High", "Critical"].map((v) => ({ value: v, label: v })),
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          options: ["Open", "Monitoring", "Mitigated", "Closed"].map((v) => ({ value: v, label: v })),
        },
        { name: "assessed_on", label: "Assessed on", type: "date" },
        { name: "assessment", label: "Assessment", type: "textarea", full: true },
        { name: "mitigation", label: "Mitigation measures", type: "textarea", full: true },
      ]}
      emptyHint="No threat assessments recorded yet."
    />
  );
}
