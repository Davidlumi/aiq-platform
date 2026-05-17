/**
 * Debug script: generate board pack PDF locally and save to /tmp/board_pack_debug.pdf
 * Run with: cd /home/ubuntu/aiq-platform && npx tsx server/debugBoardPack.ts
 */
import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";
import { execSync } from "child_process";
import { generateBoardPackPDF } from "./pdfBoardPack";

async function main() {
  // Use margin: 0 (the fix) to prevent PDFKit auto-pagination at footer
  const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
  const out = createWriteStream("/tmp/board_pack_debug2.pdf");
  doc.pipe(out);

  await generateBoardPackPDF(doc, "user-sarah-thornton", "tenant-acme-ltd");

  doc.end();
  await new Promise<void>((resolve, reject) => {
    out.on("finish", resolve);
    out.on("error", reject);
  });

  const result = execSync("pdfinfo /tmp/board_pack_debug2.pdf 2>&1 | grep Pages").toString().trim();
  console.log(`Board pack PDF generated: ${result}`);
  
  // Check all pages
  execSync("pdfseparate /tmp/board_pack_debug2.pdf /tmp/bp2_%d.pdf 2>/dev/null");
  const pages = parseInt(result.match(/\d+/)?.[0] ?? "0");
  for (let i = 1; i <= pages; i++) {
    try {
      const text = execSync(`pdftotext /tmp/bp2_${i}.pdf - 2>&1`).toString().trim().slice(0, 80);
      console.log(`  Page ${i}: "${text}"`);
    } catch {}
  }
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
