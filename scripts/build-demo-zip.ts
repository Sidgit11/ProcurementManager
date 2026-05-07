import "dotenv/config";
import JSZip from "jszip";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Generate two realistic WhatsApp chat exports for the Polico demo:
 *   1. Tuan Minh Trading (Vietnam) — cassia cinnamon, ~6 months of conversation
 *   2. Entegre Gida (Turkey)       — premium dried apricots
 *
 * Each ZIP mimics WhatsApp's "Export chat" output: `_chat.txt` with iOS bracket
 * timestamp lines, plus a few media attachment placeholders (PDF price lists, JPG samples).
 */

interface ScriptedMsg {
  /** offset in days from `start` */
  day: number;
  /** hour (24h) */
  hour: number;
  /** minute */
  minute: number;
  /** "you" for buyer-side messages, anything else for the vendor */
  sender: "you" | string;
  body?: string;
  /** filename to mark as attached (gets added to the ZIP separately) */
  attachment?: { filename: string; bytes: Buffer };
}

const PDF_HEADER = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]); // %PDF-1.4
const JPG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0]);

function buildChatText(messages: ScriptedMsg[], baseDate: Date): string {
  const lines: string[] = [];
  for (const m of messages) {
    const day = new Date(baseDate.getTime() + m.day * 24 * 3600 * 1000);
    const dd = day.getDate();
    const mm = day.getMonth() + 1;
    const yy = String(day.getFullYear()).slice(2);
    const stamp = `[${dd}/${mm}/${yy}, ${m.hour}:${String(m.minute).padStart(2, "0")}:00]`;
    const senderLabel = m.sender === "you" ? "You" : m.sender;
    if (m.attachment) {
      lines.push(`${stamp} ${senderLabel}: <attached: ${m.attachment.filename}>`);
    } else {
      lines.push(`${stamp} ${senderLabel}: ${m.body}`);
    }
  }
  return lines.join("\n");
}

async function buildZip(filename: string, messages: ScriptedMsg[], baseDate: Date) {
  const zip = new JSZip();
  zip.file("_chat.txt", buildChatText(messages, baseDate));
  for (const m of messages) {
    if (m.attachment) {
      zip.file(m.attachment.filename, m.attachment.bytes);
    }
  }
  const dir = join(process.cwd(), "public/demo-data");
  mkdirSync(dir, { recursive: true });
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  writeFileSync(join(dir, filename), buf);
  console.log(`Wrote ${filename} (${buf.length.toLocaleString()} bytes, ${messages.length} messages)`);
}

// ── Tuan Minh Trading (Vietnam) — cassia cinnamon over 6 months ────────────────
const TUAN_MINH = "Tuan Minh Trading And Production Co., Ltd.";

const tuanMinhMessages: ScriptedMsg[] = [
  // Week 1 — initial outreach
  { day: 0,   hour: 9,  minute: 12, sender: TUAN_MINH, body: "Good morning Mr Lucas, this is Hanh from Tuan Minh Trading in Lao Cai. We met your father at Sial Brazil last March. We export cassia cinnamon — Quang Nam origin — and would love to be considered for your next program." },
  { day: 0,   hour: 9,  minute: 13, sender: TUAN_MINH, body: "Today's offer: Cassia Cinnamon Sticks 8% oil, $2.40/kg CIF Navegantes, MOQ 1MT, validity 7 days. Packing in 25kg PP woven bags. Payment 30/70." },
  { day: 0,   hour: 14, minute: 22, sender: "you",     body: "Hi Hanh, thanks for reaching out. Yes my father remembers you well. Can you share a CoA and phytosanitary template? Also do you have BPC and BC1 grades?" },
  { day: 0,   hour: 14, minute: 41, sender: TUAN_MINH, body: "Of course. Sending CoA from last shipment + BC1 sample list. We can do BC1 and BC2 from same harvest." },
  { day: 0,   hour: 14, minute: 42, sender: TUAN_MINH, attachment: { filename: "CoA-cassia-Q2-2025.pdf",         bytes: PDF_HEADER } },
  { day: 0,   hour: 14, minute: 43, sender: TUAN_MINH, attachment: { filename: "Phyto-template-Vietnam.pdf",     bytes: PDF_HEADER } },

  // Week 3 — first repeat quote, slight market shift
  { day: 14,  hour: 10, minute: 5,  sender: TUAN_MINH, body: "Bom dia Mr Lucas. Quick update on cassia — Vietnam harvest finishing, prices firming. Today: $2.46/kg CIF Navegantes, same MOQ and packing. Validity 5 days." },
  { day: 14,  hour: 11, minute: 30, sender: "you",     body: "Got it. We're comparing — give me a day." },

  // Week 5 — voice note + photos
  { day: 28,  hour: 8,  minute: 50, sender: TUAN_MINH, body: "[Voice note] (transcript: \"Mr Lucas, this is Hanh. I am at the warehouse with our shipment manager. We can offer 5MT today at $2.38, with priority loading next week. Payment 50/50, can you do?\")" },
  { day: 28,  hour: 8,  minute: 51, sender: TUAN_MINH, attachment: { filename: "warehouse-stock-photo.jpg",     bytes: JPG_HEADER } },
  { day: 28,  hour: 9,  minute: 22, sender: "you",     body: "Photo received, looks fresh. $2.38 is competitive but I have an offer at $2.31 from Bandung. Can you match?" },
  { day: 28,  hour: 10, minute: 10, sender: TUAN_MINH, body: "On 5MT we cannot match $2.31 — but $2.34 is possible. Quality is BC1, oil content 8.5%, you will not find this from Bandung." },
  { day: 28,  hour: 14, minute: 5,  sender: "you",     body: "OK $2.34 acceptable. Send PO format and we'll issue tomorrow." },
  { day: 28,  hour: 14, minute: 30, sender: TUAN_MINH, body: "Excellent! Pro forma incoming. ETA Navegantes ~45 days from B/L." },
  { day: 28,  hour: 14, minute: 31, sender: TUAN_MINH, attachment: { filename: "ProForma-TM2025-1142.pdf",       bytes: PDF_HEADER } },

  // Week 8 — between-cycles check-in
  { day: 56,  hour: 11, minute: 15, sender: TUAN_MINH, body: "Mr Lucas, B/L for our shipment uploaded to your email. Vessel ETA Itajaí 12 March. Container TLLU-441902-3." },
  { day: 56,  hour: 16, minute: 10, sender: "you",     body: "Received, thanks. Container looks fine, customs cleared yesterday." },

  // Week 10 — quality issue resolution
  { day: 70,  hour: 10, minute: 0,  sender: "you",     body: "Hanh, our QC found 2 bags with insect activity in container 3819. About 50kg. Need replacement." },
  { day: 70,  hour: 10, minute: 25, sender: TUAN_MINH, body: "I am sorry to hear this Mr Lucas. We will issue 60kg credit note on next order. Quality team will investigate." },
  { day: 70,  hour: 10, minute: 27, sender: "you",     body: "Appreciated. Apply on next PO." },

  // Week 13 — second cycle quote
  { day: 91,  hour: 9,  minute: 30, sender: TUAN_MINH, body: "Good morning Mr Lucas. New crop in. Cassia BC1 at $2.28/kg CIF Navegantes, MOQ 5MT, validity 7 days. Quality is excellent — please remember the 60kg credit." },
  { day: 91,  hour: 13, minute: 5,  sender: "you",     body: "Noted credit. Lock 5MT at $2.28. Send PO." },
  { day: 91,  hour: 13, minute: 22, sender: TUAN_MINH, attachment: { filename: "PO-confirmation-TM-2025-1198.pdf", bytes: PDF_HEADER } },

  // Week 17 — expansion into cumin
  { day: 119, hour: 11, minute: 12, sender: TUAN_MINH, body: "Mr Lucas, our group also handles Indian cumin via partner in Unjha. If you have demand, we can offer Cumin Seeds whole at $4.05/kg FOB Mundra, MOQ 2MT." },
  { day: 119, hour: 14, minute: 30, sender: "you",     body: "Thanks but I prefer to keep cumin separate from cassia supply chain. Our Unjha vendor is set." },
  { day: 119, hour: 14, minute: 35, sender: TUAN_MINH, body: "Understood, no problem at all." },

  // Week 19 — small follow-up
  { day: 133, hour: 8,  minute: 10, sender: TUAN_MINH, body: "Container CMUS-882013 dispatched yesterday. ETA Itajaí 21 April." },
  { day: 133, hour: 8,  minute: 11, sender: TUAN_MINH, attachment: { filename: "BL-CMUS-882013.pdf",              bytes: PDF_HEADER } },

  // Week 22 — third cycle quote, market firming
  { day: 154, hour: 10, minute: 30, sender: TUAN_MINH, body: "Mr Lucas, Cassia BC1 today: $2.42/kg CIF Navegantes, validity 5 days. Demand from EU is heavy. If you can confirm 5MT today I can hold $2.42 for 7 days." },
  { day: 154, hour: 16, minute: 22, sender: "you",     body: "$2.42 is firm side. Anything between 2.36-2.38 doable on 5MT?" },
  { day: 154, hour: 17, minute: 3,  sender: TUAN_MINH, body: "Best I can do is $2.39, locked for 5 days. After that I cannot guarantee." },
  { day: 154, hour: 17, minute: 30, sender: "you",     body: "Done. PO incoming." },

  // Week 25 — close to today
  { day: 172, hour: 9,  minute: 5,  sender: TUAN_MINH, body: "Mr Lucas, just a heads up — our forecast for next 30 days is firming further on cassia. If you want to lock Q3 program at $2.39 we can hold." },
  { day: 172, hour: 11, minute: 22, sender: "you",     body: "Send proposal in writing — quantity, price, payment, delivery windows." },
  { day: 172, hour: 11, minute: 50, sender: TUAN_MINH, attachment: { filename: "Q3-program-proposal-Polico.pdf",  bytes: PDF_HEADER } },
];

// ── Entegre Gida (Turkey) — premium dried apricots ─────────────────────────────
const ENTEGRE = "Entegre Gida Sanayi Jsc";

const entegreMessages: ScriptedMsg[] = [
  { day: 0,   hour: 9,  minute: 30, sender: ENTEGRE, body: "Hi Mr Lucas, this is Cem from Entegre Gida Malatya. We are top exporter of organic dried apricots to Brazil. Our latest offer for #1 grade Standard 5: $4.65/kg CIF Navegantes, MOQ 5MT, validity 7 days. Packing 12.5kg cartons." },
  { day: 0,   hour: 14, minute: 5,  sender: "you",   body: "Hi Cem, thanks. Price is on the higher side. What grade exactly and what is sulfur content?" },
  { day: 0,   hour: 14, minute: 18, sender: ENTEGRE, body: "Standard 5, 22-30 fruits per 100g, sulfured 2000ppm. Premium category, top of harvest. We do not compete on commodity grade." },
  { day: 0,   hour: 14, minute: 19, sender: ENTEGRE, attachment: { filename: "Apricot-Specsheet-2025.pdf", bytes: PDF_HEADER } },
  { day: 7,   hour: 10, minute: 22, sender: ENTEGRE, body: "Mr Lucas, we have a small allocation opportunity at $4.55 if you can confirm 10MT this week." },
  { day: 7,   hour: 11, minute: 30, sender: "you",   body: "10MT is too much for one shot. 5MT at $4.40?" },
  { day: 7,   hour: 12, minute: 5,  sender: ENTEGRE, body: "$4.40 is below our floor for #1 grade. $4.50 for 5MT, validity 5 days." },
  { day: 7,   hour: 14, minute: 22, sender: "you",   body: "Let me think. Will revert tomorrow." },
  { day: 30,  hour: 9,  minute: 12, sender: ENTEGRE, body: "Bom dia Mr Lucas. New crop estimates out — we are seeing 15% lower yield this year. Recommend booking sooner rather than later." },
  { day: 30,  hour: 9,  minute: 13, sender: ENTEGRE, attachment: { filename: "Turkey-Apricot-Crop-Forecast-2025.pdf", bytes: PDF_HEADER } },
  { day: 30,  hour: 14, minute: 30, sender: "you",   body: "Noted. Comparing with 2 other Malatya vendors. Will close by Friday." },
  { day: 60,  hour: 11, minute: 0,  sender: ENTEGRE, body: "Mr Lucas, your 5MT is ready for shipment. ETA Itajaí 23 days from now." },
  { day: 60,  hour: 11, minute: 5,  sender: ENTEGRE, attachment: { filename: "BL-MEDU-9928.pdf",                    bytes: PDF_HEADER } },
  { day: 90,  hour: 10, minute: 30, sender: ENTEGRE, body: "Mr Lucas, hope shipment arrived in good condition. Next allocation: $4.62/kg CIF Navegantes, validity 7 days. We can do 50/50 payment if helpful." },
  { day: 90,  hour: 14, minute: 22, sender: "you",   body: "Yes shipment arrived clean, thank you. Will consider next allocation, give me a few days." },
  { day: 120, hour: 9,  minute: 12, sender: ENTEGRE, body: "Reminder Mr Lucas — that price hold expires today end of day. Confirm if you want it extended." },
  { day: 120, hour: 14, minute: 5,  sender: "you",   body: "Pass for now, we have enough stock." },
  { day: 150, hour: 11, minute: 0,  sender: ENTEGRE, body: "Hi Mr Lucas. Crop is in. Premium #1 Standard 5: $4.78/kg CIF Navegantes, packing 12.5kg cartons, validity 5 days. Quality this year is exceptional." },
  { day: 150, hour: 14, minute: 30, sender: "you",   body: "$4.78 is too aggressive. Market median we see is $4.20." },
  { day: 150, hour: 14, minute: 50, sender: ENTEGRE, body: "Median includes Standard 6/7 grades. We are #1 exclusively. If price-sensitive, Kirlioglu has Standard 6 at lower." },
  { day: 175, hour: 10, minute: 0,  sender: ENTEGRE, body: "Mr Lucas, holding $4.72 for 7 days for 5MT. After that no commitments." },
  { day: 175, hour: 10, minute: 30, sender: "you",   body: "Thanks Cem, will revert." },
];

async function main() {
  const start = new Date(Date.now() - 180 * 24 * 3600 * 1000);
  await buildZip("vendor-tuan-minh-chat-export.zip", tuanMinhMessages, start);
  await buildZip("vendor-entegre-gida-chat-export.zip", entegreMessages, start);

  // Keep the legacy filename as an alias of the Tuan Minh export so demo-smoke.ts still works.
  await buildZip("vendor-patel-chat-export.zip", tuanMinhMessages, start);
}

main().catch((e) => { console.error(e); process.exit(1); });
