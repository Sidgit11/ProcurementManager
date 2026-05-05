import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseWhatsAppExport, parseLine, detectDateFormat } from "./whatsapp-export";

const fixture = readFileSync(join(__dirname, "__fixtures__/sample-export.zip"));

describe("parseWhatsAppExport", () => {
  it("returns sender name and date format from chat", async () => {
    const r = await parseWhatsAppExport(fixture);
    expect(r.detectedVendorName).toBe("Patel Spices");
    expect(r.detectedDateFormat).toMatch(/DMY|MDY|ambiguous/);
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

describe("detectDateFormat", () => {
  it("detects DMY when day > 12 appears", () => {
    expect(detectDateFormat(["[15/03/25, 10:00:00] X: y"])).toBe("DMY");
  });
  it("detects MDY when month-position has > 12", () => {
    expect(detectDateFormat(["[03/15/25, 10:00:00] X: y"])).toBe("MDY");
  });
  it("returns ambiguous when no evidence", () => {
    expect(detectDateFormat(["[01/02/25, 10:00:00] X: y"])).toBe("ambiguous");
  });
});

describe("parseLine with locale", () => {
  it("DMY treats first number as day", () => {
    const r = parseLine("[15/03/25, 10:00:00] X: y", "DMY");
    expect(r?.sentAt.getMonth()).toBe(2);  // March (0-indexed)
    expect(r?.sentAt.getDate()).toBe(15);
  });
  it("MDY treats first number as month", () => {
    const r = parseLine("[03/15/25, 10:00:00] X: y", "MDY");
    expect(r?.sentAt.getMonth()).toBe(2);
    expect(r?.sentAt.getDate()).toBe(15);
  });
});

describe("sender names with colons", () => {
  it("captures sender containing colon (using lazy match)", () => {
    const r = parseLine("[12/01/25, 10:42:15] Brand Inc.: Singapore: hello world", "DMY");
    expect(r?.sender).toBe("Brand Inc.: Singapore");
    expect(r?.body).toBe("hello world");
  });
});

describe("Unicode bidi marks", () => {
  it("strips LRM (U+200E) from body", async () => {
    const JSZip = (await import("jszip")).default;
    const z = new JSZip();
    z.file("_chat.txt", "[12/01/25, 10:42:15] Patel: \u200Ehello \u200Ethere");
    const buf = await z.generateAsync({ type: "nodebuffer" });
    const r = await parseWhatsAppExport(buf);
    expect(r.messages[0].body).toBe("hello there");
    expect(r.messages[0].body).not.toContain("\u200E");
  });
});
