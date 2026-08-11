import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({
    meta: [
      { title: "Help & Usage | Military Management System" },
      { name: "description", content: "How to use the personnel, logistics and reporting modules, and scope limits." },
      { property: "og:title", content: "Help & Usage | Military Management System" },
      { property: "og:description", content: "How to use the personnel, logistics and reporting modules, and scope limits." },
    ],
  }),
  component: HelpPage,
});

const SECTIONS = [
  {
    title: "Scope of the system",
    body: "This system supports administration only: personnel records, equipment and vehicle accountability, medical and fitness tracking, document management and reporting. It contains no targeting, weapon-control or offensive capability of any kind.",
  },
  {
    title: "Access levels",
    body: "Access is role based. Viewers can read records; module staff can create and edit within their module; administrators manage all modules and user roles. Medical records are restricted to medical officers and administrators.",
  },
  {
    title: "Working with records",
    body: "Each module offers search, filtering, creation, editing, deletion, CSV export and printing. Every change is written to the audit log with the acting user and timestamp.",
  },
  {
    title: "Data handling",
    body: "Classify documents accurately and avoid entering personal data that is not required for administration. Report suspected access issues to your administrator immediately.",
  },
];

function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Help & Usage" description="Guidance for operating the management system." />
      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">{section.body}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
