import { db } from "../db/client";
import {
  agentPolicy, vendorNote, qualityEvent, document, alert,
  chatSession, chatMessage, vendor, user,
} from "../db/schema";
import { and, eq } from "drizzle-orm";
import { DEFAULT_POLICIES } from "../agents/policy";

export async function seedExtras(orgId: string) {
  // Agent policies — insert defaults
  for (const p of Object.values(DEFAULT_POLICIES)) {
    const [existing] = await db.select().from(agentPolicy)
      .where(and(eq(agentPolicy.orgId, orgId), eq(agentPolicy.agentName, p.agentName)));
    if (!existing) {
      await db.insert(agentPolicy).values({
        orgId,
        agentName: p.agentName,
        enabled: p.enabled,
        autoExecute: p.autoExecute,
        guardrails: p.guardrails as Record<string, number | string | boolean>,
      });
    }
  }

  // Pick a few vendors for notes/quality/documents
  const vendors = await db.select().from(vendor).where(eq(vendor.orgId, orgId)).limit(10);
  const [u] = await db.select().from(user).where(eq(user.orgId, orgId)).limit(1);
  const userId = u?.id;

  // Sample vendor notes (3-5 across top vendors)
  const sampleNotes = [
    "Father met them at Sial 2025. Reliable on cumin volumes.",
    "Tend to drop price 3-4% when nudged on day 4 of negotiation.",
    "Slow on documents but rock-solid on delivery dates.",
    "Premium positioning — usually 8-12% above market on apricots, but quality holds.",
    "Originally referred by São Paulo Imports. Family-owned for 3 generations.",
  ];
  for (let i = 0; i < Math.min(5, vendors.length); i++) {
    await db.insert(vendorNote).values({
      orgId, vendorId: vendors[i].id, authorUserId: userId, body: sampleNotes[i],
    });
  }

  // Quality events for one vendor (the SLOW-tier candidate)
  if (vendors.length > 0) {
    const target = vendors[Math.min(7, vendors.length - 1)];
    const issues = [
      { severity: "medium", kind: "delivery_delay",   description: "Vessel ETA delayed 4 days. Notified at the last minute." },
      { severity: "low",    kind: "document_failure", description: "B/L copy delivered 2 days late." },
      { severity: "high",   kind: "quality_issue",    description: "Moisture content above contract spec on Q3 shipment." },
      { severity: "low",    kind: "delivery_delay",   description: "Container loading delayed by holiday." },
      { severity: "medium", kind: "document_failure", description: "Phytosanitary cert missing on first attempt." },
    ];
    for (const i of issues) {
      await db.insert(qualityEvent).values({
        orgId, vendorId: target.id, severity: i.severity, kind: i.kind, description: i.description,
      });
    }
  }

  // Sample documents (4-6) with prebuilt vision metadata
  const sampleDocs = [
    { kind: "CoA",            issuer: "SGS Cairo",          valid_until: "2026-09-15", attrs: { moisture: "8.5%", purity: "98.7%" } },
    { kind: "certification",  issuer: "USDA Organic",        valid_until: "2027-03-01", attrs: { scope: "dried vegetables" } },
    { kind: "technical_sheet",issuer: "Flavour Foods Exp.",  valid_until: null,         attrs: { product: "cumin seeds whole" } },
    { kind: "price_list",     issuer: "Entegre Gida Sanayi", valid_until: "2026-06-01", attrs: { items: 4 } },
  ];
  for (let i = 0; i < Math.min(sampleDocs.length, vendors.length); i++) {
    const d = sampleDocs[i];
    await db.insert(document).values({
      orgId,
      vendorId: vendors[i].id,
      kind: d.kind,
      filename: `${d.kind.toLowerCase().replace(/\s+/g, "-")}-${vendors[i].name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      visionExtractedMetadata: { kind: d.kind, issuer: d.issuer, valid_until: d.valid_until, key_attributes: d.attrs } as Record<string, unknown>,
    });
  }

  // Sample alerts (3 popular SKUs)
  const sampleAlerts = [
    { sku: "CUMIN-SEEDS",      thresholdPerKgUsd: 3.80 },
    { sku: "TURMERIC-WHOLE",   thresholdPerKgUsd: 1.85 },
    { sku: "APRICOTS-DRIED",   thresholdPerKgUsd: 4.00 },
  ];
  for (const a of sampleAlerts) {
    await db.insert(alert).values({
      orgId, kind: "price_below",
      params: { sku: a.sku, thresholdLandedMicros: Math.round(a.thresholdPerKgUsd * 1_000_000) } as Record<string, unknown>,
      enabled: true,
    });
  }

  // Sample chat session (1, with 2-3 turns)
  if (userId) {
    const [session] = await db.insert(chatSession).values({
      orgId, userId, title: "Cumin seeds market check",
    }).returning();
    await db.insert(chatMessage).values([
      { sessionId: session.id, role: "user",      content: "Which vendors quoted me below market for cumin seeds this month?" },
      { sessionId: session.id, role: "assistant", content: "Two vendors are below the trailing 30-day median for cumin seeds: Flavour Foods Exp. at $3.88/kg and Kirti Foods Pvt., Ltd. at $3.94/kg. Want to send an RFQ to both?" },
    ]);
  }

  console.log("Seeded extras: 5 agent policies, sample notes/quality/documents/alerts/chat session.");
}
