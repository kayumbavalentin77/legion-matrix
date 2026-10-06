import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Download, FileLock2, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuthState } from "@/lib/auth";
import { formatDate, logAudit } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/intelligence-files")({
  head: () => ({
    meta: [
      { title: "Intelligence Files | Military Management System" },
      { name: "description", content: "Securely store, classify and retrieve intelligence documents." },
      { property: "og:title", content: "Intelligence Files | Military Management System" },
      { property: "og:description", content: "Securely store, classify and retrieve intelligence documents." },
    ],
  }),
  component: IntelligenceFilesPage,
});

const BUCKET = "intelligence-files";
const CATEGORIES = ["Report", "Imagery", "Signals", "Human Source", "Analysis", "Other"];
const CLASSIFICATIONS = ["Restricted", "Confidential", "Secret", "Top Secret"];

const EMPTY = {
  category: "Report",
  classification: "Confidential",
  description: "",
  location_name: "",
  date_of_information: "",
};

function formatSize(bytes?: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function IntelligenceFilesPage() {
  const qc = useQueryClient();
  const { can } = useAuthState();
  const allowed = can(["s2"]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: rows = [] } = useQuery({
    queryKey: ["intelligence_files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intelligence_files")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: allowed,
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a file to upload.");
      if (file.size > 25 * 1024 * 1024) throw new Error("Files must be 25 MB or smaller.");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("intelligence_files")
        .insert({
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          file_type: file.type || null,
          category: form.category,
          classification: form.classification,
          description: form.description.trim() || null,
          location_name: form.location_name.trim() || null,
          date_of_information: form.date_of_information || null,
          status: "Active",
        })
        .select("id")
        .single();
      if (error) throw error;
      await logAudit("Uploaded", "Intelligence Files", data?.id, `Uploaded ${file.name}`);
    },
    onSuccess: () => {
      toast.success("File uploaded securely");
      setOpen(false);
      setFile(null);
      setForm({ ...EMPTY });
      qc.invalidateQueries({ queryKey: ["intelligence_files"] });
    },
    onError: (e: Error) => toast.error(e.message || "Upload failed"),
  });

  const remove = useMutation({
    mutationFn: async (row: { id: string; file_path: string | null; file_name: string }) => {
      if (row.file_path) await supabase.storage.from(BUCKET).remove([row.file_path]);
      const { error } = await supabase.from("intelligence_files").delete().eq("id", row.id);
      if (error) throw error;
      await logAudit("Deleted", "Intelligence Files", row.id, `Deleted ${row.file_name}`);
    },
    onSuccess: () => {
      toast.success("File removed");
      qc.invalidateQueries({ queryKey: ["intelligence_files"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not remove the file"),
  });

  const download = async (row: { id: string; file_path: string | null; file_name: string }) => {
    if (!row.file_path) return;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.file_path, 60);
    if (error || !data) {
      toast.error("Could not open the file");
      return;
    }
    await logAudit("Exported", "Intelligence Files", row.id, `Downloaded ${row.file_name}`);
    window.open(data.signedUrl, "_blank", "noopener");
  };

  if (!allowed) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <h1 className="text-lg font-semibold">Restricted area</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Intelligence files are limited to S2 and the Super Admin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intelligence Files"
        description="Classified document store. Files are private and every download is logged."
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload file
          </Button>
        }
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Information date</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileLock2 className="h-4 w-4 text-muted-foreground" />
                      <span className="max-w-[220px] truncate">{row.file_name}</span>
                    </div>
                    {row.description ? (
                      <p className="mt-0.5 max-w-[260px] truncate text-xs text-muted-foreground">
                        {row.description}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>
                    <StatusBadge value={row.classification} />
                  </TableCell>
                  <TableCell>{row.location_name ?? "—"}</TableCell>
                  <TableCell>{formatDate(row.date_of_information)}</TableCell>
                  <TableCell className="tabular-nums">{formatSize(row.file_size)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => download(row)} aria-label="Download">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove.mutate(row)}
                      aria-label="Delete file"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No intelligence files stored yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload intelligence file</DialogTitle>
            <DialogDescription>
              Maximum 25 MB. Access is restricted to S2 personnel and the Super Admin.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="file">Document</Label>
              <Input
                id="file"
                ref={inputRef}
                type="file"
                className="mt-1.5"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger id="category" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="classification">Classification</Label>
              <Select
                value={form.classification}
                onValueChange={(v) => setForm({ ...form, classification: v })}
              >
                <SelectTrigger id="classification" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASSIFICATIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location_name}
                onChange={(e) => setForm({ ...form, location_name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="doi">Date of information</Label>
              <Input
                id="doi"
                type="date"
                value={form.date_of_information}
                onChange={(e) => setForm({ ...form, date_of_information: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Summary</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => upload.mutate()} disabled={upload.isPending}>
              {upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Upload securely
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
