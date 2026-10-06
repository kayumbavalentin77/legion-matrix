import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, FilterX, Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { exportCsv } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/audit-log")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .in("role", ["super_admin", "administrator"]);
    if (!data || data.length === 0) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Audit Log Explorer | Military Management System" },
      { name: "description", content: "Filter and export every recorded action for forensic review." },
      { property: "og:title", content: "Audit Log Explorer | Military Management System" },
      { property: "og:description", content: "Filter and export every recorded action for forensic review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditLogPage,
});

const PAGE_SIZE = 20;

function AuditLogPage() {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const [module, setModule] = useState("all");
  const [userName, setUserName] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const { data = [], isLoading } = useQuery({
    queryKey: ["audit-logs", from, to],
    queryFn: async () => {
      let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(2000);
      if (from) q = q.gte("created_at", new Date(from + "T00:00:00").toISOString());
      if (to) q = q.lte("created_at", new Date(to + "T23:59:59").toISOString());
      const { data } = await q;
      return data ?? [];
    },
  });

  const uniq = (k: "action" | "module" | "user_name") =>
    Array.from(new Set(data.map((r) => r[k]).filter(Boolean) as string[])).sort();
  const actions = useMemo(() => uniq("action"), [data]);
  const modules = useMemo(() => uniq("module"), [data]);
  const users = useMemo(() => uniq("user_name"), [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((row) => {
      if (action !== "all" && row.action !== action) return false;
      if (module !== "all" && row.module !== module) return false;
      if (userName !== "all" && row.user_name !== userName) return false;
      if (!q) return true;
      return [row.user_name, row.module, row.description, row.record_ref, row.action].some((v) =>
        String(v ?? "").toLowerCase().includes(q),
      );
    });
  }, [data, query, action, module, userName]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };
  const dirty = query || action !== "all" || module !== "all" || userName !== "all" || from || to;

  const sel = (label: string, value: string, set: (v: string) => void, opts: string[]) => (
    <div className="min-w-[150px] flex-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={(v) => reset(() => set(v))}>
        <SelectTrigger className="mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {opts.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log Explorer"
        description="Every action recorded by the system. Entries cannot be edited or removed."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCsv("audit-log", filtered, [
                { key: "created_at", label: "Timestamp" },
                { key: "user_name", label: "User" },
                { key: "action", label: "Action" },
                { key: "module", label: "Module" },
                { key: "record_ref", label: "Record" },
                { key: "description", label: "Description" },
              ])
            }
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-[220px] flex-[2]">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <Search className="absolute bottom-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => reset(() => setQuery(e.target.value))}
                placeholder="User, module, record or description"
                className="mt-1 pl-8"
              />
            </div>
            {sel("Module", module, setModule, modules)}
            {sel("Action", action, setAction, actions)}
            {sel("User", userName, setUserName, users)}
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={from} onChange={(e) => reset(() => setFrom(e.target.value))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={to} onChange={(e) => reset(() => setTo(e.target.value))} className="mt-1" />
            </div>
            <Button
              variant="ghost"
              disabled={!dirty}
              onClick={() =>
                reset(() => {
                  setQuery("");
                  setAction("all");
                  setModule("all");
                  setUserName("all");
                  setFrom("");
                  setTo("");
                })
              }
            >
              <FilterX className="mr-2 h-4 w-4" /> Clear
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {new Date(row.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">{row.user_name ?? "—"}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>{row.module ?? "—"}</TableCell>
                    <TableCell className="max-w-[360px] truncate text-muted-foreground">{row.description ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      {isLoading ? "Loading…" : "No matching activity."}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              Page {current} of {totalPages} · {filtered.length} entries
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={current >= totalPages} onClick={() => setPage(current + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
