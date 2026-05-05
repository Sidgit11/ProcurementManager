import JSZip from "jszip";

export interface ParsedAttachment {
  filename: string;
  kind: "image" | "voice" | "pdf" | "other";
  bytes?: Buffer;
}
export interface ParsedMessage {
  sender: string;
  sentAt: Date;
  body: string;
  attachments: ParsedAttachment[];
}
export type DateFormat = "DMY" | "MDY" | "ambiguous";
export interface ParsedExport {
  detectedVendorName: string;
  detectedDateFormat: DateFormat;
  messages: ParsedMessage[];
}

// Fix C2: use [^<]+ (greedy, no angle-brackets) for sender so that:
//   - sender names with colons (e.g. "Brand Inc.: Singapore") are captured up to the last ": "
//     before any "<" character (which opens attachment tags), and
//   - attachment bodies like "<attached: foo.jpg>" are never consumed into the sender group.
const IOS_RE = /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?\]\s+([^<]+):\s+(.*)$/;
const AND_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?\s+-\s+([^<]+):\s+(.*)$/;
const ATTACH_RE = /<attached:\s*([^>]+?)>|‎?(\S+\.(?:jpg|jpeg|png|opus|m4a|mp3|pdf|webp))\s*\(file attached\)/i;

// Fix C4: locale heuristic — scan first two numeric tokens of every date prefix
export function detectDateFormat(lines: string[]): DateFormat {
  let dmyEvidence = false;
  let mdyEvidence = false;
  const re = /^\[?(\d{1,2})\/(\d{1,2})\//;
  for (const line of lines) {
    const m = re.exec(line);
    if (!m) continue;
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (a > 12) dmyEvidence = true;
    if (b > 12) mdyEvidence = true;
    if (dmyEvidence && mdyEvidence) break;
  }
  if (dmyEvidence && !mdyEvidence) return "DMY";
  if (mdyEvidence && !dmyEvidence) return "MDY";
  if (dmyEvidence && mdyEvidence) return "ambiguous"; // contradictory file — caller should warn
  return "ambiguous";
}

// Fix C4: parseLine accepts optional format parameter (default "DMY")
export function parseLine(line: string, format: DateFormat = "DMY"): { sender: string; sentAt: Date; body: string } | null {
  const m = IOS_RE.exec(line) ?? AND_RE.exec(line);
  if (!m) return null;
  const [, n1, n2, yyRaw, hhRaw, mn, ss, ampm, sender, body] = m;
  let yy = parseInt(yyRaw, 10);
  if (yy < 100) yy += 2000;
  let hh = parseInt(hhRaw, 10);
  if (ampm) {
    if (ampm === "PM" && hh < 12) hh += 12;
    if (ampm === "AM" && hh === 12) hh = 0;
  }
  // n1/n2 ordering depends on locale: DMY uses (day, month), MDY uses (month, day)
  const day = format === "MDY" ? parseInt(n2, 10) : parseInt(n1, 10);
  const month = format === "MDY" ? parseInt(n1, 10) : parseInt(n2, 10);
  return {
    sender: sender.trim(),
    sentAt: new Date(yy, month - 1, day, hh, parseInt(mn, 10), ss ? parseInt(ss, 10) : 0),
    body: body.trim(),
  };
}

function classifyAttachment(name: string): ParsedAttachment["kind"] {
  const n = name.toLowerCase();
  if (/\.(jpg|jpeg|png|webp|heic)$/.test(n)) return "image";
  if (/\.(opus|m4a|mp3|aac|wav)$/.test(n)) return "voice";
  if (/\.pdf$/.test(n)) return "pdf";
  return "other";
}

export async function parseWhatsAppExport(zipBytes: Buffer): Promise<ParsedExport> {
  const zip = await JSZip.loadAsync(zipBytes);

  // Fix I3: zip-bomb entry-count cap
  const entryCount = Object.keys(zip.files).length;
  if (entryCount > 50_000) throw new Error(`Zip has too many entries (${entryCount} > 50000); rejecting as potential zip bomb.`);

  // Find _chat.txt (iOS) or "WhatsApp Chat with X.txt" (Android)
  const chatFile = Object.keys(zip.files).find((n) =>
    /(?:^|\/)_chat\.txt$/i.test(n) ||
    (/WhatsApp Chat/i.test(n) && n.toLowerCase().endsWith(".txt"))
  );
  if (!chatFile) throw new Error("No _chat.txt found in WhatsApp export");

  const rawText = await zip.files[chatFile].async("text");
  // Fix C1: strip Unicode bidi marks that real iOS exports embed (LRM, RLM, LRE/RLE/PDF, LRI/RLI/FSI/PDI)
  const text = rawText.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");

  const lines = text.split(/\r?\n/);

  // Fix C4: detect locale before parsing
  const detected = detectDateFormat(lines);
  const fmt: DateFormat = detected === "ambiguous" ? "DMY" : detected;

  const messages: ParsedMessage[] = [];
  let current: ParsedMessage | null = null;

  for (const line of lines) {
    const parsed = parseLine(line, fmt);
    if (parsed) {
      if (current) messages.push(current);
      current = { ...parsed, attachments: [] };
    } else if (current) {
      current.body += "\n" + line;
    }
  }
  if (current) messages.push(current);

  // Extract attachment refs and load bytes
  for (const m of messages) {
    const matches = [...m.body.matchAll(new RegExp(ATTACH_RE.source, "gi"))];
    for (const am of matches) {
      const filename = (am[1] ?? am[2])?.trim();
      if (!filename) continue;
      const inZip = Object.keys(zip.files).find((n) => n.endsWith(filename));
      const att: ParsedAttachment = { filename, kind: classifyAttachment(filename) };
      if (inZip) {
        const buf = await zip.files[inZip].async("nodebuffer");
        att.bytes = buf;
      }
      m.attachments.push(att);
    }
    m.body = m.body.replace(new RegExp(ATTACH_RE.source, "gi"), "").trim();
  }

  // Detect vendor name = most common sender that is not "You"
  const counts = new Map<string, number>();
  for (const m of messages) {
    if (/^you$/i.test(m.sender)) continue;
    counts.set(m.sender, (counts.get(m.sender) ?? 0) + 1);
  }
  const detectedVendorName =
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? messages[0]?.sender ?? "Unknown vendor";

  return { detectedVendorName, detectedDateFormat: detected, messages };
}
