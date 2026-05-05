"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

interface JobState {
  progress: number;
  total: number;
  status: string;
}

export function ProcessingPanel({ jobId }: { jobId: string }) {
  const [state, setState] = useState<JobState>({ progress: 0, total: 0, status: "pending" });

  useEffect(() => {
    let cancelled = false;
    async function loop() {
      while (!cancelled) {
        await fetch("/api/jobs/tick", { cache: "no-store" });
        const r = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        if (r.ok) {
          const j = (await r.json()) as JobState;
          setState(j);
          if (j.status === "completed") return;
        }
        await new Promise((res) => setTimeout(res, 1500));
      }
    }
    loop();
    return () => { cancelled = true; };
  }, [jobId]);

  const pct = state.total > 0 ? (state.progress / state.total) * 100 : 0;

  return (
    <Card>
      <div className="label-caps mb-2">Processing</div>
      <div className="text-sm">{state.progress} / {state.total} messages · {state.status}</div>
      <div className="mt-2 h-2 w-full rounded bg-forest-100">
        <div className="h-2 rounded bg-lime-400 transition-all" style={{ width: pct + "%" }} />
      </div>
    </Card>
  );
}
