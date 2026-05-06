import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { org } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export async function PATCH(req: NextRequest) {
  const o = await currentOrg();
  const body = await req.json();
  const [row] = await db.select().from(org).where(eq(org.id, o.id));
  const existingSettings = (row.settings ?? {}) as Record<string, unknown>;
  const newSettings: Record<string, unknown> = {
    ...existingSettings,
    outlierThresholdPct: body.outlierThresholdPct ?? existingSettings.outlierThresholdPct,
    leadTimeToleranceDays: body.leadTimeToleranceDays ?? existingSettings.leadTimeToleranceDays,
  };
  await db.update(org)
    .set({
      homeCurrency: body.homeCurrency ?? row.homeCurrency,
      homePort: body.homePort ?? row.homePort,
      settings: newSettings as { outlierThresholdPct?: number },
    })
    .where(eq(org.id, o.id));
  return NextResponse.json({ ok: true });
}
