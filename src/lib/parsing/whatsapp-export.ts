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
export interface ParsedExport {
  detectedVendorName: string;
  messages: ParsedMessage[];
}

const IOS_RE = /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?\]\s+([^:]+):\s+(.*)$/;
const AND_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?\s+-\s+([^:]+):\s+(.*)$/;
const ATTACH_RE = /<attached:\s*([^>]+?)>|‎?(\S+\.(?:jpg|jpeg|png|opus|m4a|mp3|pdf|webp))\s*\(file attached\)/i;

export function parseLine(line: string): { sender: string; sentAt: Date; body: string } | null {
  const m = IOS_RE.exec(line) ?? AND_RE.exec(line);
  if (!m) return null;
  const [, dd, mm, yyRaw, hhRaw, mn, ss, ampm, sender, body] = m;
  let yy = parseInt(yyRaw, 10);
  if (yy < 100) yy += 2000;
  let hh = parseInt(hhRaw, 10);
  if (ampm) {
    if (ampm === "PM" && hh < 12) hh += 12;
    if (ampm === "AM" && hh === 12) hh = 0;
  }
  return {
    sender: sender.trim(),
    sentAt: new Date(yy, parseInt(mm, 10) - 1, parseInt(dd, 10), hh, parseInt(mn, 10), ss ? parseInt(ss, 10) : 0),
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

  // Find _chat.txt (iOS) or "WhatsApp Chat with X.txt" (Android)
  const chatFile = Object.keys(zip.files).find((n) =>
    /(?:^|\/)_chat\.txt$/i.test(n) ||
    (/WhatsApp Chat/i.test(n) && n.toLowerCase().endsWith(".txt"))
  );
  if (!chatFile) throw new Error("No _chat.txt found in WhatsApp export");
  const text = await zip.files[chatFile].async("text");

  const lines = text.split(/\r?\n/);
  const messages: ParsedMessage[] = [];
  let current: ParsedMessage | null = null;

  for (const line of lines) {
    const parsed = parseLine(line);
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

  return { detectedVendorName, messages };
}
