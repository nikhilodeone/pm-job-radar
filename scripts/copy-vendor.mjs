// Copies the PDF/DOCX parsers out of node_modules into public/vendor so the
// browser can load them from the same origin (no CDN, no bundler tricks).
// Runs on postinstall and before dev/build. Safe to run repeatedly.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "vendor");
const files = [
  ["node_modules/pdfjs-dist/build/pdf.min.js", "pdf.min.js"],
  ["node_modules/pdfjs-dist/build/pdf.worker.min.js", "pdf.worker.min.js"],
  ["node_modules/mammoth/mammoth.browser.min.js", "mammoth.browser.min.js"],
];

mkdirSync(out, { recursive: true });
let missing = 0;
for (const [from, to] of files) {
  const src = join(root, from);
  if (existsSync(src)) copyFileSync(src, join(out, to));
  else {
    missing++;
    console.warn(`[copy-vendor] not found (skipped): ${from}`);
  }
}
if (missing) {
  console.warn(
    "[copy-vendor] Resume upload for PDF/DOCX needs these files. Run `npm install` (dev dependencies included) and retry. Pasting resume text still works."
  );
}
