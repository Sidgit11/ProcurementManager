import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseWhatsAppExport, parseLine } from "./whatsapp-export";

const fixture = readFileSync(join(__dirname, "__fixtures__/sample-export.zip"));

describe("parseWhatsAppExport", () => {
  it("returns sender name from chat", async () => {
    const r = await parseWhatsAppExport(fixture);
    expect(r.detectedVendorName).toBe("Patel Spices");
  });

  it("parses messages with iOS bracket format", async () => {
    const r = await parseWhatsAppExport(fixture);
    expect(r.messages.length).toBeGreaterThan(0);
    const m = r.messages[0];
    expect(m.body).toContain("Black pepper");
    expect(m.sentAt).toBeInstanceOf(Date);
  });

  it("links inline attachment placeholders to media files", async () => {
    const r = await parseWhatsAppExport(fixture);
    const withAttachment = r.messages.find((m) => m.attachments.length > 0);
    expect(withAttachment).toBeDefined();
    expect(withAttachment!.attachments[0].filename).toMatch(/photo|audio|pdf/i);
  });

  it("extracts media bytes when present in zip", async () => {
    const r = await parseWhatsAppExport(fixture);
    const att = r.messages.flatMap((m) => m.attachments)[0];
    expect(att.bytes).toBeInstanceOf(Buffer);
    expect(att.bytes!.length).toBeGreaterThan(0);
  });

  it("handles Android dash format", () => {
    const parsed = parseLine("01/12/25, 10:42 - Patel Spices: hello world");
    expect(parsed?.sender).toBe("Patel Spices");
    expect(parsed?.body).toBe("hello world");
  });
});
