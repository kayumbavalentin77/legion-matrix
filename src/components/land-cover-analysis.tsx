import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Leaf, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizeLandCover } from "@/lib/land-cover.functions";

const TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export function LandCoverAnalysis() {
  const run = useServerFn(summarizeLandCover);
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  async function analyze(file?: File) {
    if (!file) return;
    if (!TYPES.includes(file.type as never)) { toast.error("Upload a JPG, PNG or WebP image."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be 8 MB or smaller."); return; }
    const dataUrl = await new Promise<string>((ok, bad) => {
      const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = bad; r.readAsDataURL(file);
    });
    setPreview(dataUrl); setSummary(""); setBusy(true);
    try {
      const res = await run({ data: { mimeType: file.type as (typeof TYPES)[number], dataUrl } });
      if (res.ok) setSummary(res.summary); else toast.error(res.error);
    } catch { toast.error("Analysis failed. Please try again."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Leaf className="h-4 w-4 text-primary" />AI land cover &amp; environment summary</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <input ref={input} type="file" accept={TYPES.join(",")} className="hidden" aria-label="Land cover image" onChange={e => analyze(e.target.files?.[0])} />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{busy ? "Analyzing…" : "Upload image to analyze"}
          </Button>
          <p className="text-xs text-muted-foreground">Non-tactical map or aerial imagery only · JPG/PNG/WebP up to 8 MB. Results are AI visual estimates.</p>
        </div>
        {preview && (
          <div className="grid gap-4 md:grid-cols-[240px_1fr]">
            <img src={preview} alt="Image submitted for analysis" className="h-48 w-full rounded-md border object-contain" />
            <div className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">
              {busy ? "Analyzing visible land cover…" : summary || "No summary yet."}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
