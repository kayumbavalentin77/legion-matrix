import { useMemo, useState, type ReactNode } from "react";
import { Bookmark, BookmarkPlus, Download, Pencil, Plus, Printer, Search, Trash2, Inbox, Eye, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { useAuthState } from "@/lib/auth";
import { usePresets } from "@/lib/presets";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportCsv, formatDate, useDeleteRow, useRows, useSaveRow, type Row } from "@/lib/data";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "email";
  options?: { value: string; label: string }[];
  required?: boolean;
  full?: boolean;
};

export type Column = {
  key: string;
  label: string;
  kind?: "status" | "date" | "text";
  render?: (row: Row) => ReactNode;
};

export type Filter = { key: string; label: string; options: string[] };

const PAGE_SIZE = 10;

export function ResourcePage({
  title,
  description,
  module,
  table,
  select = "*",
  orderBy = "created_at",
  columns,
  fields,
  searchKeys,
  filters = [],
  baseFilter,
  toolbar,
  emptyHint,
}: {
  title: string;
  description?: string | undefined;
  module: string;
  table: string;
  select?: string;
  orderBy?: string;
  columns: Column[];
  fields: Field[];
  searchKeys: string[];
  filters?: Filter[];
  baseFilter?: Record<string, string> | undefined;
  toolbar?: ReactNode | undefined;
  emptyHint?: string | undefined;
}) {
  const { data: rows, isLoading, error } = useRows(table, select, orderBy);
  const save = useSaveRow(table, module);
  const remove = useDeleteRow(table, module);
  const { canWrite } = useAuthState();

  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetOpen, setPresetOpen] = useState(false);

  const { presets, save: savePreset, remove: removePreset } = usePresets(module);

  const filtersDirty =
    query.trim() !== "" || Object.values(filterValues).some((v) => v && v !== "all");

  const clearFilters = () => {
    setQuery("");
    setFilterValues({});
    setPage(1);
  };

  const applyPreset = (config: { query?: string; filters?: Record<string, string> }) => {
    setQuery(config.query ?? "");
    setFilterValues(config.filters ?? {});
    setPage(1);
  };

  const filtered = useMemo(() => {
    let list = rows ?? [];
    if (baseFilter) {
      list = list.filter((r) => Object.entries(baseFilter).every(([k, v]) => String(r[k] ?? "") === v));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q)));
    }
    for (const [key, value] of Object.entries(filterValues)) {
      if (value && value !== "all") list = list.filter((r) => String(r[key] ?? "") === value);
    }
    return list;
  }, [rows, query, filterValues, searchKeys, baseFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const cell = (row: Row, col: Column) => {
    if (col.render) return col.render(row);
    const value = row[col.key];
    if (col.kind === "status") return <StatusBadge value={value} />;
    if (col.kind === "date") return formatDate(value);
    return value === null || value === undefined || value === "" ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      String(value)
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {toolbar}
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" /> Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(module.toLowerCase().replace(/\s+/g, "-"), filtered, columns)}
            >
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
            {canWrite ? (
              <Button size="sm" onClick={() => setEditing({ ...(baseFilter ?? {}) })}>
                <Plus className="mr-1.5 h-4 w-4" /> New record
              </Button>
            ) : null}
          </>
        }
      />

      <Card className="print-area">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center no-print">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search records…"
                className="pl-9"
              />
            </div>
            {filters.map((f) => (
              <Select
                key={f.key}
                value={filterValues[f.key] ?? "all"}
                onValueChange={(v) => {
                  setFilterValues((prev) => ({ ...prev, [f.key]: v }));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={f.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {f.label}</SelectItem>
                  {f.options.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Bookmark className="mr-1.5 h-4 w-4" /> Presets
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Saved searches</DropdownMenuLabel>
                {presets.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    No saved presets yet. Set a search or filters, then save them here.
                  </p>
                ) : (
                  presets.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      onSelect={(e) => {
                        e.preventDefault();
                        applyPreset(p.config ?? { query: "", filters: {} });
                      }}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{p.name}</span>
                      <button
                        type="button"
                        aria-label={`Remove preset ${p.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removePreset.mutate(p.id);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setPresetOpen(true)}>
                  <BookmarkPlus className="mr-2 h-4 w-4" /> Save current view
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={clearFilters} disabled={!filtersDirty}>
              <X className="mr-1.5 h-4 w-4" /> Clear filters
            </Button>
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
              {error.message.includes("permission") || error.message.includes("policy")
                ? "You do not have permission to view these records."
                : `Could not load records: ${error.message}`}
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No records found</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {emptyHint ?? "Adjust your search or filters, or create a new record to get started."}
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => (
                      <TableHead key={c.key} className="whitespace-nowrap">
                        {c.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-right no-print">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((row) => (
                    <TableRow key={String(row["id"])}>
                      {columns.map((c) => (
                        <TableCell key={c.key} className="whitespace-nowrap">
                          {cell(row, c)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right no-print">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewing(row)} aria-label="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canWrite ? (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => setEditing(row)} aria-label="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(String(row["id"]))}
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filtered.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length}
              </span>
              <div className="flex gap-2 no-print">
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
          ) : null}
        </CardContent>
      </Card>

      <RecordDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.["id"] ? `Edit ${module}` : `New ${module}`}
        fields={fields}
        initial={editing ?? {}}
        saving={save.isPending}
        onSubmit={(values) => {
          save.mutate(editing?.["id"] ? { ...values, id: editing["id"] } : values, {
            onSuccess: () => setEditing(null),
          });
        }}
      />

      <Dialog open={viewing !== null} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record details</DialogTitle>
            <DialogDescription>{module}</DialogDescription>
          </DialogHeader>
          <dl className="grid gap-3 sm:grid-cols-2">
            {columns.map((c) => (
              <div key={c.key} className="min-w-0">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</dt>
                <dd className="mt-0.5 break-words text-sm">{viewing ? cell(viewing, c) : null}</dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone and will be written to the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) remove.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={presetOpen} onOpenChange={setPresetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save this view</DialogTitle>
            <DialogDescription>
              Store the current search and filters so you can re-run them in one click.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="preset-name">Preset name</Label>
            <Input
              id="preset-name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="mt-1.5"
              placeholder="e.g. Active soldiers in 1st Battalion"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPresetOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!presetName.trim() || savePreset.isPending}
              onClick={() =>
                savePreset.mutate(
                  { name: presetName, config: { query, filters: filterValues } },
                  {
                    onSuccess: () => {
                      setPresetName("");
                      setPresetOpen(false);
                    },
                  },
                )
              }
            >
              Save preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function RecordDialog({
  open,
  onOpenChange,
  title,
  fields,
  initial,
  onSubmit,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: Field[];
  initial: Row;
  onSubmit: (values: Row) => void;
  saving?: boolean | undefined;
}) {
  const [values, setValues] = useState<Row>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [key, setKey] = useState(0);

  // Reset local state whenever a different record is opened.
  const initialId = String(initial["id"] ?? "new");
  const [seenId, setSeenId] = useState(initialId);
  if (open && seenId !== initialId) {
    setSeenId(initialId);
    setValues(initial);
    setErrors({});
    setKey((k) => k + 1);
  }

  const set = (name: string, value: unknown) => setValues((prev) => ({ ...prev, [name]: value }));

  const submit = () => {
    const next: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.name];
      if (f.required && (v === undefined || v === null || String(v).trim() === "")) {
        next[f.name] = `${f.label} is required`;
      }
      if (typeof v === "string" && v.length > 2000) next[f.name] = `${f.label} is too long`;
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    const payload: Row = {};
    for (const f of fields) {
      let v = values[f.name];
      if (v === "" || v === undefined) v = null;
      if (f.type === "number" && v !== null) v = Number(v);
      payload[f.name] = v;
    }
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Complete the fields below and save.</DialogDescription>
        </DialogHeader>
        <div key={key} className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.name} className={f.full || f.type === "textarea" ? "sm:col-span-2" : undefined}>
              <Label htmlFor={f.name}>
                {f.label}
                {f.required ? <span className="text-destructive"> *</span> : null}
              </Label>
              <div className="mt-1.5">
                {f.type === "textarea" ? (
                  <Textarea
                    id={f.name}
                    value={String(values[f.name] ?? "")}
                    maxLength={2000}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                ) : f.type === "select" ? (
                  <Select
                    value={values[f.name] ? String(values[f.name]) : ""}
                    onValueChange={(v) => set(f.name, v)}
                  >
                    <SelectTrigger id={f.name}>
                      <SelectValue placeholder={`Select ${f.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(f.options ?? []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={f.name}
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type ?? "text"}
                    maxLength={f.type === "number" || f.type === "date" ? undefined : 255}
                    value={String(values[f.name] ?? "")}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                )}
              </div>
              {errors[f.name] ? <p className="mt-1 text-xs text-destructive">{errors[f.name]}</p> : null}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
