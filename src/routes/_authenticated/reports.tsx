import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics | Military Management System" },
      { name: "description", content: "Generate and export summary reports across all management modules." },
      { property: "og:title", content: "Reports & Analytics | Military Management System" },
      { property: "og:description", content: "Generate and export summary reports across all management modules." },
    ],
  }),
  component: ReportsPage,
});

const SOURCES = [
  { table: "soldiers", label: "Personnel roster" },
  { table: "equipment", label: "Equipment register" },
  { table: "vehicles", label: "Vehicle fleet" },
  { table: "ammunition_inventory", label: "Ammunition inventory" },
  { table: "security_reports", label: "Security reports" },
];

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]!);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r[k])).join(","))].join("\n");
}

function ReportsPage() {
  const counts = useQuery({
    queryKey: ["report-counts"],
    queryFn: async () => {
      const entries = await Promise.all(
        SOURCES.map(async (source) => {
          const { count } = await supabase.from(source.table as never).select("*", { count: "exact", head: true });
          return [source.table, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, number>;
    },
  });

  const download = async (table: string, label: string) => {
    const { data } = await supabase.from(table as never).select("*");
    const csv = toCsv((data ?? []) as Record<string, unknown>[]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Export module data for record keeping, briefings and archiving."
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SOURCES.map((source) => (
          <Card key={source.table}>
            <CardHeader>
              <CardTitle className="text-base">{source.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-2xl font-bold tabular-nums">{counts.data?.[source.table] ?? 0}</p>
              <Button size="sm" variant="outline" onClick={() => download(source.table, source.label)}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
