import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  Car,
  ClipboardList,
  Crosshair,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuthState } from "@/lib/auth";

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

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function useCount(table: string) {
  return useQuery({
    queryKey: ["dashboard", "count", table],
    queryFn: async () => {
      const { count } = await supabase.from(table as never).select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });
}

function useGrouped(table: string, column: string) {
  return useQuery({
    queryKey: ["dashboard", "group", table, column],
    queryFn: async () => {
      const { data } = await supabase.from(table as never).select(column);
      const grouped = new Map<string, number>();
      ((data ?? []) as Record<string, string>[]).forEach((row) => {
        const key = row[column] ?? "Unknown";
        grouped.set(key, (grouped.get(key) ?? 0) + 1);
      });
      return [...grouped].map(([name, value]) => ({ name, value }));
    },
  });
}

function Dashboard() {
  const { profile, roleLabel } = useAuthState();

  const soldiers = useCount("soldiers");
  const equipment = useCount("equipment");
  const weapons = useCount("ammunition_inventory");
  const vehicles = useCount("vehicles");
  const operations = useCount("operations");
  const reports = useCount("security_reports");
  const threats = useCount("threats");
  const faults = useCount("vehicle_faults");

  const { data: vehicleStatus = [] } = useGrouped("vehicles", "status");
  const { data: equipmentStatus = [] } = useGrouped("equipment", "status");
  const { data: threatRisk = [] } = useGrouped("threats", "risk_level");

  const stats = [
    { label: "Personnel on strength", value: soldiers.data ?? 0, icon: Users, to: "/soldiers" },
    { label: "Equipment items", value: equipment.data ?? 0, icon: Boxes, to: "/equipment" },
    { label: "Ammunition batches", value: weapons.data ?? 0, icon: Crosshair, to: "/ammunition" },
    { label: "Vehicles in fleet", value: vehicles.data ?? 0, icon: Car, to: "/vehicles" },
    { label: "Operations", value: operations.data ?? 0, icon: ClipboardList, to: "/operations" },
    { label: "Security reports", value: reports.data ?? 0, icon: ShieldCheck, to: "/security-reports" },
    { label: "Threat assessments", value: threats.data ?? 0, icon: ShieldAlert, to: "/threat-analysis" },
    { label: "Open fault reports", value: faults.data ?? 0, icon: TriangleAlert, to: "/vehicle-faults" },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${profile?.full_name?.split(" ")[0] ?? "Officer"}`}
        description={`${roleLabel} · readiness overview across personnel, logistics and reporting.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to} className="group block focus:outline-none">
            <Card className="transition-colors group-hover:border-primary/50 group-focus-visible:border-primary">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
                  <p className="truncate text-xs uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equipment status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={equipmentStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <Tooltip />
                <Bar dataKey="value" name="Items" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Threat levels</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={threatRisk} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <Tooltip />
                <Bar dataKey="value" name="Assessments" fill="var(--color-chart-4)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
