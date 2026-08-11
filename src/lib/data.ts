import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Generic table access for the shared CRUD layer (table names are dynamic).
const db = supabase as unknown as {
  from: (table: string) => any;
};

export type Row = Record<string, any>;

export async function logAudit(action: string, module: string, recordRef?: string, description?: string) {
  const { data } = await supabase.auth.getUser();
  await supabase.from("audit_logs").insert({
    user_id: data.user?.id ?? null,
    user_name: data.user?.email ?? "Unknown",
    action,
    module,
    record_ref: recordRef ?? null,
    description: description ?? null,
    ip_address: "client",
  });
}

export function useRows(table: string, select = "*", orderBy = "created_at", ascending = false) {
  return useQuery({
    queryKey: ["table", table, select, orderBy],
    queryFn: async () => {
      const { data, error } = await db
        .from(table)
        .select(select)
        .order(orderBy, { ascending });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });
}

export function useSaveRow(table: string, module: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Row) => {
      const { id, ...rest } = values as { id?: string } & Row;
      if (id) {
        const { error } = await db.from(table).update(rest).eq("id", id);
        if (error) throw error;
        await logAudit("Updated", module, String(id), `Record updated in ${module}`);
      } else {
        const { data, error } = await db.from(table).insert(rest).select("id").single();
        if (error) throw error;
        await logAudit("Created", module, (data as Row | null)?.["id"], `New record created in ${module}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["table", table] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Record saved successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Could not save record"),
  });
}

export function useDeleteRow(table: string, module: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted", module, id, `Record deleted from ${module}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["table", table] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Record deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete record"),
  });
}

export function exportCsv(filename: string, rows: Row[], columns: { key: string; label: string }[]) {
  if (!rows.length) return;
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const body = rows
    .map((r) =>
      columns
        .map((c) => {
          const v = r[c.key];
          return `"${String(v ?? "").replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}
