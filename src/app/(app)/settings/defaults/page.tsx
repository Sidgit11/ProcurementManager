import { db } from "@/lib/db/client";
import { org } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { OrgDefaultsForm } from "@/components/settings/OrgDefaultsForm";

export default async function DefaultsPage() {
  const o = await currentOrg();
  const [row] = await db.select().from(org).where(eq(org.id, o.id));
  const settings = (row.settings ?? {}) as { outlierThresholdPct?: number; leadTimeToleranceDays?: number };
  return (
    <div className="space-y-4 max-w-2xl">
      <Breadcrumbs trail={[{ label: "Settings", href: "/settings" }, { label: "Defaults" }]} />
      <div>
        <div className="label-caps">Org defaults</div>
        <h1 className="font-display text-3xl">Your buying defaults</h1>
        <p className="mt-1 text-sm text-forest-500">
          Used everywhere the product needs to assume something on your behalf — landed cost calculations, alert thresholds, agentic recommendations.
        </p>
      </div>
      <OrgDefaultsForm
        initial={{
          homeCurrency: row.homeCurrency,
          homePort: row.homePort ?? "",
          outlierThresholdPct: settings.outlierThresholdPct ?? 10,
          leadTimeToleranceDays: settings.leadTimeToleranceDays ?? 30,
        }}
      />
    </div>
  );
}
