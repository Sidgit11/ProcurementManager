import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

async function main() {
  const zipPath = join(process.cwd(), "public/demo-data/vendor-patel-chat-export.zip");
  if (!existsSync(zipPath)) {
    throw new Error(`Demo zip not found at ${zipPath}. Run pnpm build:demo-zip first.`);
  }
  const zipBytes = readFileSync(zipPath);

  console.log("[smoke] Uploading demo zip…");
  const fd = new FormData();
  fd.append(
    "file",
    new Blob([new Uint8Array(zipBytes)], { type: "application/zip" }),
    "vendor-patel-chat-export.zip"
  );
  const u = await fetch(`${BASE}/api/upload`, { method: "POST", body: fd });
  if (!u.ok) throw new Error(`upload failed: ${u.status} ${await u.text()}`);
  const { jobId } = (await u.json()) as { jobId: string };
  console.log(`[smoke] Upload OK, jobId=${jobId}`);

  console.log("[smoke] Polling /api/jobs/tick + /api/jobs/[id] until completion (90s timeout)…");
  const start = Date.now();
  while (Date.now() - start < 90_000) {
    await fetch(`${BASE}/api/jobs/tick`);
    const j = (await (await fetch(`${BASE}/api/jobs/${jobId}`)).json()) as { status: string; progress: number; total: number };
    console.log(`[smoke] job status=${j.status} progress=${j.progress}/${j.total}`);
    if (j.status === "completed") break;
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log("[smoke] ✅ demo smoke passed");
}

main().catch((e) => {
  console.error("[smoke] ❌", e);
  process.exit(1);
});
