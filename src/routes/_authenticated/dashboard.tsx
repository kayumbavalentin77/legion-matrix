import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Car, ShieldCheck, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Command Dashboard | Military Management System" },
      { name: "description", content: "Operational readiness overview across personnel, equipment, vehicles and reporting." },
      { property: "og:title", content: "Command Dashboard | Military Management System" },
      { property: "og:description", content: "Operational readiness overview across personnel, equipment, vehicles and reporting." },
    ],
  }),
  component: Dashboard,
});

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function useCount(table: string) {
  return useQuery({
    queryKey: ["count", table],
    queryFn: async () => {
      const { count } = await supabase.from(table as never).select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });
}

function Dashboard() {
  const soldiers = useCount("soldiers");
  const equipment = useCount("equipment");
  const vehicles = useCount("vehicles");
  const reports = useCount("security_reports");

  const { data: vehicleStatus = [] } = useQuery({
    queryKey: ["chart", "vehicle-status"],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("status");
      const grouped = new Map<string, number>();
      (data ?? []).forEach((row) => {
        const key = (row.status as string) ?? "Unknown";
        grouped.set(key, (grouped.get(key) ?? 0) + 1);
      });
      return [...grouped].map(([name, value]) => ({ name, value }));
    },
  });

  const { data: readiness = [] } = useQuery({
    queryKey: ["chart", "equipment-status"],
    queryFn: async () => {
      const { data } = await supabase.from("equipment").select("status");
      const grouped = new Map<string, number>();
      (data ?? []).forEach((row) => {
        const key = (row.status as string) ?? "Unknown";
        grouped.set(key, (grouped.get(key) ?? 0) + 1);
      });
      return [...grouped].map(([name, total]) => ({ name, total }));
    },
  });

  const stats = [
    { label: "Personnel on strength", value: soldiers.data ?? 0, icon: Users },
    { label: "Equipment items", value: equipment.data ?? 0, icon: Boxes },
    { label: "Vehicles in fleet", value: vehicles.data ?? 0, icon: Car },
    { label: "Security reports", value: reports.data ?? 0, icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Dashboard"
        description="Readiness overview across personnel, logistics and reporting."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
                <p className="truncate text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equipment status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={readiness}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <Tooltip />
                <Bar dataKey="total" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fleet availability</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={vehicleStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {vehicleStatus.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
