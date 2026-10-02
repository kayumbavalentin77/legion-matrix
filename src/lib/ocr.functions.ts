import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  fileName: z.string().max(255),
  mimeType: z.string().max(100),
  dataUrl: z.string().max(14_000_000),
});

export type ExtractedMetadata = {
  title: string;
  category: string;
  author: string;
  document_date: string;
  document_code: string;
  names: string[];
  dates: string[];
  ids: string[];
  summary: string;
};

/** Reads an uploaded image/PDF with a vision model and returns suggested index fields. */
export const extractDocumentMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, error: "Text extraction is not configured." };

    const isPdf = data.mimeType === "application/pdf";
    const filePart = isPdf
      ? { type: "file", file: { filename: data.fileName, file_data: data.dataUrl } }
      : { type: "image_url", image_url: { url: data.dataUrl } };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You index administrative documents. Read the document text and return only the requested fields. Use ISO dates (YYYY-MM-DD). Use empty strings or empty arrays when unknown.",
          },
          { role: "user", content: [{ type: "text", text: "Extract metadata from this document." }, filePart] },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "document_metadata",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  category: { type: "string" },
                  author: { type: "string" },
                  document_date: { type: "string" },
                  document_code: { type: "string", description: "Reference number on the document" },
                  names: { type: "array", items: { type: "string" } },
                  dates: { type: "array", items: { type: "string" } },
                  ids: { type: "array", items: { type: "string" }, description: "Service numbers, IDs, references" },
                  summary: { type: "string" },
                },
                required: ["title", "category", "author", "document_date", "document_code", "names", "dates", "ids", "summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "document_metadata" } },
      }),
    });

    if (res.status === 429) return { ok: false as const, error: "Too many requests. Try again shortly." };
    if (res.status === 402) return { ok: false as const, error: "AI credits are exhausted for this workspace." };
    if (!res.ok) {
      console.error("OCR failed", res.status, await res.text());
      return { ok: false as const, error: "Could not read the document." };
    }
    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    try {
      return { ok: true as const, data: JSON.parse(args) as ExtractedMetadata };
    } catch {
      return { ok: false as const, error: "No readable text was found." };
    }
  });
