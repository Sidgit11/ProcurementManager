import { ChatExportDropzone } from "@/components/upload/ChatExportDropzone";
import { ProcessingPanel } from "@/components/upload/ProcessingPanel";

export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const { job } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Page header */}
      <div>
        <div className="label-caps">GET STARTED</div>
        <h1 className="font-display text-3xl mt-1">Capture your last 6 months of vendor chats</h1>
        <p className="mt-2 text-sm text-forest-500">
          Drop a WhatsApp chat export <code className="rounded bg-forest-100/60 px-1">.zip</code> (or several).
          Within minutes, every quote becomes a structured row in your inbox — comparable, searchable, sortable.
        </p>
      </div>

      {/* Dropzone */}
      <ChatExportDropzone />
      {job && <ProcessingPanel jobId={job} />}

      {/* How it works */}
      <div>
        <div className="label-caps mb-3">HOW IT WORKS</div>
        <ol className="space-y-4">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-700 text-white text-xs font-medium">
              1
            </span>
            <div>
              <p className="text-sm">
                <strong>You drop a <code>.zip</code></strong> — exported from WhatsApp&apos;s &ldquo;Export chat&rdquo; option,
                with or without media.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-700 text-white text-xs font-medium">
              2
            </span>
            <div>
              <p className="text-sm">
                <strong>We read every message</strong> — text, voice notes, photos, PDFs. Voice notes get
                transcribed; quotes get extracted; vendors get profiled.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-700 text-white text-xs font-medium">
              3
            </span>
            <div>
              <p className="text-sm">
                <strong>You see the data</strong> — a structured inbox, comparable quote tables, vendor profiles,
                alerts, opportunities. From day one.
              </p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
