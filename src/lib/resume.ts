/**
 * Resume text extraction – runs entirely in the browser.
 * PDF.js and Mammoth are copied into /public/vendor by scripts/copy-vendor.mjs and loaded on demand.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

const loaded = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const hit = loaded.get(src);
  if (hit) return hit;
  const p = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      loaded.delete(src);
      reject(new Error(`Could not load ${src}. Paste your resume text instead.`));
    };
    document.head.appendChild(el);
  });
  loaded.set(src, p);
  return p;
}

async function pdfToText(buf: ArrayBuffer): Promise<string> {
  await loadScript("/vendor/pdf.min.js");
  const lib = (window as any).pdfjsLib;
  if (!lib) throw new Error("PDF reader failed to initialise.");
  lib.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.js";
  const doc = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, 12); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = "";
    let lastY: number | null = null;
    const lines: string[] = [];
    for (const item of content.items as any[]) {
      const y = item.transform?.[5];
      if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2) {
        lines.push(line.trim());
        line = "";
      }
      line += item.str + (item.hasEOL ? "\n" : " ");
      lastY = y ?? lastY;
    }
    lines.push(line.trim());
    pages.push(lines.join("\n"));
  }
  return pages.join("\n\n");
}

async function docxToText(buf: ArrayBuffer): Promise<string> {
  await loadScript("/vendor/mammoth.browser.min.js");
  const mammoth = (window as any).mammoth;
  if (!mammoth) throw new Error("DOCX reader failed to initialise.");
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return String(res.value ?? "");
}

export async function extractResumeText(file: File): Promise<string> {
  if (file.size > 8 * 1024 * 1024) throw new Error("File is larger than 8 MB.");
  const name = file.name.toLowerCase();
  let text = "";
  if (name.endsWith(".pdf") || file.type === "application/pdf") text = await pdfToText(await file.arrayBuffer());
  else if (name.endsWith(".docx")) text = await docxToText(await file.arrayBuffer());
  else if (name.endsWith(".doc")) throw new Error("Legacy .doc files aren't supported – save as .docx or PDF, or paste the text.");
  else text = await file.text();
  text = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim();
  if (text.length < 80)
    throw new Error("Couldn't read any text from this file (scanned image PDFs aren't supported). Paste your resume text instead.");
  return text;
}
