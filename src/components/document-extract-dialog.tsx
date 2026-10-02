import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ScanText } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/data";
import { extractDocumentMetadata, type ExtractedMetadata } from "@/lib/ocr.functions";

const EMPTY = { document_code: "", title: "", category: "", author: "", document_date: "", file_name: "" };

export function DocumentExtractDialog() {
  const qc = useQueryClient();
  const extract = useServerFn(extractDocumentMetadata);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [meta, setMeta] = useState<ExtractedMetadata | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("File must be under 10 MB.");
    if (!/^image\/|application\/pdf/.test(file.type)) return toast.error("Upload an image or PDF.");
    setBusy(true);
    setMeta(null);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const result = await extract({ data: { fileName: file.name, mimeType: file.type, dataUrl } });
      if (!result.ok) return toast.error(result.error);
      const m = result.data;
      setMeta(m);
      setForm({
        document_code: m.document_code || "",
        title: m.title || file.name,
        category: m.category || "",
        author: m.author || "",
        document_date: /^\d{4}-\d{2}-\d{2}$/.test(m.document_date) ? m.document_date : "",
        file_name: file.name,
      });
      toast.success("Fields detected — review before saving.");
    } catch {
      toast.error("Could not read the document.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!form.document_code.trim() || !form.title.trim()) return toast.error("Document ID and title are required.");
    setSaving(true);
    const { error } = await supabase.from("documents").insert({
      ...form,
      document_date: form.document_date || null,
      classification: "Internal",
      status: "Active",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    await logAudit("Created", "Document", form.document_code, "Indexed via text extraction");
    toast.success("Document indexed");
    qc.invalidateQueries();
    setOpen(false);
    setForm({ ...EMPTY });
    setMeta(null);
  };

  const field = (k: keyof typeof EMPTY, label: string, type = "text") => (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1" />
    </div>
  );

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ScanText className="mr-2 h-4 w-4" /> Extract from file
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Index a document from a file</DialogTitle>
            <DialogDescription>Upload a scan or PDF. Key fields are detected automatically for you to review.</DialogDescription>
          </DialogHeader>
          <Input type="file" accept="image/*,application/pdf" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
          {busy ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading document…
            </p>
          ) : null}
          {meta ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {field("document_code", "Document ID")}
              {field("title", "Title")}
              {field("category", "Category")}
              {field("author", "Author")}
              {field("document_date", "Date", "date")}
              {field("file_name", "File reference")}
              {[
                ["Names", meta.names],
                ["Dates", meta.dates],
                ["IDs", meta.ids],
              ].map(([label, vals]) =>
                (vals as string[]).length ? (
                  <div key={label as string} className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">{label as string} detected</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(vals as string[]).slice(0, 12).map((v) => (
                        <Badge key={v} variant="outline">{v}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!meta || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
