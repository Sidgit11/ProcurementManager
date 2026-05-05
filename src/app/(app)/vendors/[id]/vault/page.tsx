import { db } from "@/lib/db/client";
import { document } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card } from "@/components/ui/Card";

export default async function Vault({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const docs = await db
    .select()
    .from(document)
    .where(eq(document.vendorId, id))
    .orderBy(desc(document.uploadedAt));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Memory Vault</h1>
      <p className="text-sm text-forest-500">
        Documents, certificates, price lists. Vision-extracted metadata on upload.
      </p>
      {docs.length === 0 && (
        <p className="text-sm text-forest-500">No documents yet. Upload a CoA, certification, or technical sheet.</p>
      )}
      <div className="grid gap-3 md:grid-cols-3">
        {docs.map((d) => {
          const meta = (d.visionExtractedMetadata ?? {}) as { kind?: string; issuer?: string | null; valid_until?: string | null };
          return (
            <Card key={d.id}>
              <div className="label-caps">{(meta.kind ?? d.kind ?? "OTHER").toUpperCase()}</div>
              {d.blobUrl ? (
                <a href={d.blobUrl} target="_blank" rel="noreferrer" className="font-medium underline">
                  {d.filename ?? "View document"}
                </a>
              ) : (
                <span className="font-medium">{d.filename ?? "Document"}</span>
              )}
              <div className="mt-1 text-sm text-forest-500">Issuer: {meta.issuer ?? "—"}</div>
              <div className="text-sm text-forest-500">Valid until: {meta.valid_until ?? "—"}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
