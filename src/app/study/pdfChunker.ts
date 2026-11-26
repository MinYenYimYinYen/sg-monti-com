import type { PageRange } from "@/app/study/studyChunkPlan";

// Browser side of splitting an uploaded PDF. It cuts page ranges into smaller PDFs with pdf-lib,
// which is imported on demand so the library only loads when someone actually imports a file.
// `planChunks` decides the ranges; this file measures and cuts them. Page numbers are 1-based.

export type OpenedPdf = {
  pageCount: number;
  /** Size in bytes of the PDF that `cutRange` would produce. Cached, so the planner can probe freely. */
  measureBytes: (range: PageRange) => Promise<number>;
  cutRange: (range: PageRange) => Promise<Uint8Array>;
};

function rangeKey({ firstPage, lastPage }: PageRange): string {
  return `${firstPage}-${lastPage}`;
}

/** The pages of a range as the zero-based indexes pdf-lib wants. */
function toPageIndexes({ firstPage, lastPage }: PageRange): number[] {
  return Array.from({ length: lastPage - firstPage + 1 }, (_, offset) => firstPage - 1 + offset);
}

/**
 * Opens the file once. Throws an Error with a plain-language message when it cannot be read, such
 * as a password-protected or damaged PDF, so the screen can show it as is.
 */
export async function openPdf(fileBytes: ArrayBuffer): Promise<OpenedPdf> {
  const { PDFDocument } = await import("pdf-lib");

  let source: Awaited<ReturnType<typeof PDFDocument.load>>;
  try {
    source = await PDFDocument.load(fileBytes);
  } catch {
    throw new Error("This PDF could not be read. It may be password protected or damaged.");
  }
  const pageCount = source.getPageCount();
  if (pageCount === 0) throw new Error("This PDF has no pages.");

  async function cutRange(range: PageRange): Promise<Uint8Array> {
    if (range.firstPage < 1 || range.lastPage > pageCount || range.firstPage > range.lastPage) {
      throw new Error(`Pages ${range.firstPage} to ${range.lastPage} are outside this ${pageCount} page PDF.`);
    }
    const piece = await PDFDocument.create();
    const copiedPages = await piece.copyPages(source, toPageIndexes(range));
    for (const page of copiedPages) piece.addPage(page);
    return piece.save();
  }

  const bytesByRange = new Map<string, number>();

  async function measureBytes(range: PageRange): Promise<number> {
    const key = rangeKey(range);
    const known = bytesByRange.get(key);
    if (known !== undefined) return known;
    const { length } = await cutRange(range);
    bytesByRange.set(key, length);
    return length;
  }

  return { pageCount, measureBytes, cutRange };
}

/** Base64 for a request body. Built in slices because one call over a large array overflows the stack. */
export function bytesToBase64(bytes: Uint8Array): string {
  const sliceSize = 0x8000;
  let binary = "";
  for (let start = 0; start < bytes.length; start += sliceSize) {
    binary += String.fromCharCode(...bytes.subarray(start, start + sliceSize));
  }
  return btoa(binary);
}
