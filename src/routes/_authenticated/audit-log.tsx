import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { exportCsv } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/audit-log")({
  head: () => ({
    meta: [
      { title: "Audit Log | Military Management System" },
      { name: "description", content: "Immutable record of every create, update, delete and sign-in action." },
      { property: "og:title", content: "Audit Log | Military Management System" },
      { property: "og:description", content: "Immutable record of every create, update, delete and sign-in action." },
    ],
  }),
  component: AuditLogPage,
});

const PAGE_SIZE = 15;

function AuditLogPage() {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const [page, setPage] = useState(1);

  const { data = [] } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((row) => {
      if (action !== "all" && row.action !== action) return false;
      if (!q) return true;
      return [row.user_name, row.module, row.description, row.record_ref]
        .some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [data, query, action]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search user, module or description"
                className="pl-8"
              />
            </div>
            <Select
              value={action}
              onValueChange={(v) => {
                setAction(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {["Login", "Created", "Updated", "Deleted", "Uploaded", "Exported"].map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    <TableCell className="max-w-[320px] truncate text-muted-foreground">
                      {row.description ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      No activity recorded yet.
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
              <Button
                variant="outline"
                size="sm"
                disabled={current >= totalPages}
                onClick={() => setPage(current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
