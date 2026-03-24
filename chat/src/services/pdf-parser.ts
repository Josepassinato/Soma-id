import { createRequire } from "module";
const require = createRequire(import.meta.url);

interface PdfParseResult {
  text: string;
  numpages: number;
  info: Record<string, unknown>;
}

export async function extractPdfText(buffer: Buffer): Promise<{
  text: string;
  pages: number;
}> {
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<PdfParseResult>;

  try {
    const data = await pdfParse(buffer);
    console.log(`[PDF] Extracted ${data.text.length} chars from ${data.numpages} pages`);
    return {
      text: data.text.trim(),
      pages: data.numpages,
    };
  } catch (err) {
    console.error("[PDF] Parse failed:", (err as Error).message);
    throw new Error(`PDF parsing failed: ${(err as Error).message}`);
  }
}
