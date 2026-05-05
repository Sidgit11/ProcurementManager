"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CloudArrowUp } from "@phosphor-icons/react";
import { toast } from "sonner";

export function ChatExportDropzone() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onUpload(file: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    if (!r.ok) {
      toast.error("Upload failed");
      setBusy(false);
      return;
    }
    const { jobId } = await r.json();
    router.push(`/onboarding?job=${jobId}`);
    setBusy(false);
  }

  return (
    <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-forest-100/60 bg-white/40 hover:bg-white/60">
      <CloudArrowUp size={32} className="text-forest-500" />
      <span className="mt-2 text-sm text-forest-700">
        {busy ? "STRUCTURING QUOTE…" : "Drop a WhatsApp Chat Export .zip"}
      </span>
      <input
        type="file"
        accept=".zip,application/zip"
        hidden
        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
      />
    </label>
  );
}
