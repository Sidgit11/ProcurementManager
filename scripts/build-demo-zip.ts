import "dotenv/config";
import JSZip from "jszip";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const start = new Date(Date.now() - 180 * 24 * 3600 * 1000);
  const skuChoices = [
    "Black Pepper 5mm $5.20/kg CIF Santos, MOQ 1MT, validity 7 days. Payment 30/70.",
    "Cumin 99% pure $3.85/kg CIF Santos, MOQ 2MT, validity 5 days. Payment 100% advance.",
    "Turmeric 5% curcumin $2.05/kg FOB Mundra, MOQ 5MT, validity 10 days. Payment LC at sight.",
    "Chickpeas 12mm $1100/MT CIF Santos, MOQ 20MT, validity 14 days.",
    "Cardamom large $28.50/kg CIF Santos, MOQ 200kg, validity 7 days.",
  ];

  const lines: string[] = [];
  for (let d = 0; d < 25; d++) {
    const day = new Date(start.getTime() + d * 7 * 24 * 3600 * 1000);
    const dd = day.getDate();
    const mm = day.getMonth() + 1;
    const yy = String(day.getFullYear()).slice(2);
    const stamp = (h: number, m: number) => `[${dd}/${mm}/${yy}, ${h}:${String(m).padStart(2, "0")}:00]`;

    lines.push(`${stamp(10 + (d % 6), 15 + d)} Patel Spices: ${skuChoices[d % skuChoices.length]}`);
    if (d % 4 === 0) {
      lines.push(`${stamp(10 + (d % 6), 20 + d)} Patel Spices: <attached: pricelist-${d}.pdf>`);
    }
    if (d % 5 === 0) {
      lines.push(`${stamp(10 + (d % 6), 25 + d)} You: Validity?`);
      lines.push(`${stamp(10 + (d % 6), 28 + d)} Patel Spices: 7 days. Payment 30/70.`);
    }
  }

  const zip = new JSZip();
  zip.file("_chat.txt", lines.join("\n"));
  for (let d = 0; d < 25; d += 4) {
    zip.file(`pricelist-${d}.pdf`, Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]));
  }

  const dir = join(process.cwd(), "public/demo-data");
  mkdirSync(dir, { recursive: true });
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  writeFileSync(join(dir, "vendor-patel-chat-export.zip"), buf);
  console.log("Wrote demo zip:", join(dir, "vendor-patel-chat-export.zip"));
}

main().catch((e) => { console.error(e); process.exit(1); });
