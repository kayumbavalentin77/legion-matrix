import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  dataUrl: z.string().startsWith("data:image/").max(11_000_000),
});

const PROMPT = `You are an environmental GIS analyst. Describe only what is visible in this non-tactical map or aerial image.
Write a concise report with these headings:
1. Land cover (estimated share of vegetation/forest, cropland, grassland, water, built-up, bare ground)
2. Water features
3. Environmental conditions (vegetation health, erosion, flooding, deforestation, dryness)
4. Notable observations
5. Confidence and limitations
State that all percentages are visual estimates. Do not provide military, tactical, movement or targeting advice; if asked, decline that part.`;

/** Summarizes visible land cover and environmental conditions from an uploaded map image. */
export const summarizeLandCover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_section", { _section: "s3" });
    if (!allowed) return { ok: false as const, error: "Only GIS administrators can run this analysis." };
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, error: "AI analysis is not configured." };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        input: [{ role: "user", content: [
          { type: "input_text", text: PROMPT },
          { type: "input_image", image_url: data.dataUrl },
        ] }],
      }),
    });
    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      console.error("land cover AI error", res.status, body.slice(0, 500));
      const msg = res.status === 402 ? "AI credits are exhausted. Add credits to continue."
        : res.status === 429 ? "Too many requests. Please wait and try again."
        : res.status === 403 ? "The AI service declined this request."
        : "Analysis failed. Please try again later.";
      return { ok: false as const, error: msg };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "", refused = false;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const ev = JSON.parse(raw);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          if (ev.type === "response.refusal.delta") refused = true;
          if (ev.type === "error" || ev.type === "response.failed") refused = refused || false;
        } catch { /* partial frame */ }
      }
    }
    if (refused || !text.trim()) return { ok: false as const, error: "The AI could not analyze this image." };
    return { ok: true as const, summary: text.trim() };
  });
