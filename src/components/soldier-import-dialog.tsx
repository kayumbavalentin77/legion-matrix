import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/data";

const COLUMNS = [
  "service_number",
  "full_name",
  "rank",
  "gender",
  "date_of_birth",
  "nationality",
  "phone",
  "email",
  "position",
  "date_joined",
  "status",
  "address",
] as const;

type RowIssue = { line: number; message: string };

/** Minimal RFC4180-ish CSV parser (handles quoted values and embedded commas). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i += 1;
        } else quoted = false;
      } else value += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(value);
      value = "";
    } else if (c === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (c !== "\r") value += c;
  }
  if (value !== "" || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export function SoldierImportDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<RowIssue[]>([]);
  const [valid, setValid] = useState<Record<string, string | null>[]>([]);
  const [fileName, setFileName] = useState("");
  const [done, setDone] = useState<number | null>(null);

  const reset = () => {
    setIssues([]);
    setValid([]);
    setFileName("");
    setDone(null);
  };

  const downloadTemplate = () => {
    const blob = new Blob([`${COLUMNS.join(",")}\n`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "soldier-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const readFile = async (file: File) => {
    reset();
    setFileName(file.name);
    const rows = parseCsv(await file.text());
    if (rows.length < 2) {
      setIssues([{ line: 0, message: "The file has no data rows." }]);
      return;
    }
    const header = rows[0]!.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const problems: RowIssue[] = [];

    if (!header.includes("service_number") || !header.includes("full_name") || !header.includes("rank")) {
      problems.push({
        line: 1,
        message: "The header must include service_number, full_name and rank.",
      });
      setIssues(problems);
      return;
    }

    const { data: existing } = await supabase.from("soldiers").select("service_number");
    const taken = new Set((existing ?? []).map((s) => String(s.service_number).toLowerCase()));
    const seen = new Set<string>();
    const accepted: Record<string, string | null>[] = [];

    rows.slice(1).forEach((cells, index) => {
      const line = index + 2;
      const record: Record<string, string | null> = {};
      header.forEach((key, i) => {
        if ((COLUMNS as readonly string[]).includes(key)) {
          const v = (cells[i] ?? "").trim();
          record[key] = v === "" ? null : v;
        }
      });

      const rowProblems: string[] = [];
      if (!record["service_number"]) rowProblems.push("service number is missing");
      if (!record["full_name"]) rowProblems.push("full name is missing");
      if (!record["rank"]) rowProblems.push("rank is missing");

      const sn = String(record["service_number"] ?? "").toLowerCase();
      if (sn && taken.has(sn)) rowProblems.push("service number already exists in the registry");
      if (sn && seen.has(sn)) rowProblems.push("service number is duplicated in this file");

      for (const key of ["date_of_birth", "date_joined"]) {
        const v = record[key];
        if (v && !isDate(v)) rowProblems.push(`${key.replace(/_/g, " ")} must use the format YYYY-MM-DD`);
      }
      const email = record["email"];
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) rowProblems.push("email address is not valid");

      if (rowProblems.length) {
        problems.push({ line, message: rowProblems.join("; ") });
        return;
      }
      seen.add(sn);
      if (!record["status"]) record["status"] = "Active";
      accepted.push(record);
    });

    setIssues(problems);
    setValid(accepted);
  };

  const importRows = async () => {
    if (!valid.length) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("soldiers").insert(valid as never);
      if (error) throw error;
      await logAudit("Imported", "Soldier", undefined, `Bulk import of ${valid.length} soldiers from ${fileName}`);
      setDone(valid.length);
      setValid([]);
      qc.invalidateQueries({ queryKey: ["table", "soldiers"] });
      toast.success(`${valid.length} soldiers registered`);
    } catch (e) {
      toast.error((e as Error).message || "The import could not be completed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-1.5 h-4 w-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk register soldiers</DialogTitle>
          <DialogDescription>
            Upload a CSV file to register many soldiers at once. Every row is checked before anything is
            saved, and rows with problems are listed for correction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="mr-1.5 h-4 w-4" /> Download template
          </Button>

          <div>
            <Label htmlFor="csv">CSV file</Label>
            <Input
              id="csv"
              type="file"
              accept=".csv,text/csv"
              className="mt-1.5"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void readFile(file);
              }}
            />
          </div>

          {done !== null ? (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> {done} soldiers were registered successfully.
            </div>
          ) : null}

          {fileName && done === null ? (
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">{fileName}</p>
              <p className="text-muted-foreground">
                {valid.length} row{valid.length === 1 ? "" : "s"} ready · {issues.length} with problems
              </p>
            </div>
          ) : null}

          {issues.length ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" /> Rows that need attention
              </p>
              <ScrollArea className="mt-2 max-h-48">
                <ul className="space-y-1 pr-3 text-sm text-destructive">
                  {issues.map((issue) => (
                    <li key={`${issue.line}-${issue.message}`}>
                      Line {issue.line}: {issue.message}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={importRows} disabled={!valid.length || busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Import {valid.length || ""} row{valid.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
