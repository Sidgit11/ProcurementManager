import JSZip from "jszip";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const zip = new JSZip();
  const chat = [
    "[12/01/25, 10:42:15] Patel Spices: Black pepper 5mm available, $5.20/kg CIF Santos, MOQ 1MT",
    "[12/01/25, 10:42:18] Patel Spices: <attached: 00012-photo.jpg>",
    "[12/01/25, 10:43:01] You: Validity?",
    "[12/01/25, 10:43:30] Patel Spices: 7 days. Payment 30% advance, balance against B/L copy.",
  ].join("\n");
  zip.file("_chat.txt", chat);
  zip.file("00012-photo.jpg", Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0]));

  const dir = join(process.cwd(), "src/lib/parsing/__fixtures__");
  mkdirSync(dir, { recursive: true });
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  writeFileSync(join(dir, "sample-export.zip"), buf);
  console.log("Wrote fixture:", join(dir, "sample-export.zip"));
}

main();
