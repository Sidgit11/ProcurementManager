import "dotenv/config";
import JSZip from "jszip";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const start = new Date(Date.now() - 180 * 24 * 3600 * 1000);
  const skuChoices = [
    "Cassia Cinnamon Sticks $2.40/kg CIF Navegantes, MOQ 1MT, validity 7 days. Payment 30/70.",
    "Dried Apricots #1 grade $4.50/kg CIF Navegantes, MOQ 5MT, validity 5 days. Payment LC at sight.",
    "Cumin Seeds whole $4.10/kg FOB Mundra, MOQ 2MT, validity 10 days.",
    "Dried Mixed Vegetables $3.30/kg CIF Navegantes, MOQ 5MT, validity 14 days.",
    "Dehydrated Onion Flakes $3.85/kg CIF Navegantes, MOQ 3MT, validity 7 days.",
  ];

  const lines: string[] = [];
  for (let d = 0; d < 25; d++) {
    const day = new Date(start.getTime() + d * 7 * 24 * 3600 * 1000);
    const dd = day.getDate();
    const mm = day.getMonth() + 1;
    const yy = String(day.getFullYear()).slice(2);
    const stamp = (h: number, m: number) => `[${dd}/${mm}/${yy}, ${h}:${String(m).padStart(2, "0")}:00]`;

    lines.push(`${stamp(10 + (d % 6), 15 + d)} Tuan Minh Trading And Production Co., Ltd.: ${skuChoices[d % skuChoices.length]}`);
    if (d % 4 === 0) {
      lines.push(`${stamp(10 + (d % 6), 20 + d)} Tuan Minh Trading And Production Co., Ltd.: <attached: pricelist-${d}.pdf>`);
    }
    if (d % 5 === 0) {
      lines.push(`${stamp(10 + (d % 6), 25 + d)} You: Validity?`);
      lines.push(`${stamp(10 + (d % 6), 28 + d)} Tuan Minh Trading And Production Co., Ltd.: 7 days. Payment 30/70.`);
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
