import { ChatExportDropzone } from "@/components/upload/ChatExportDropzone";
import { ProcessingPanel } from "@/components/upload/ProcessingPanel";
import { Card } from "@/components/ui/Card";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";

const SAMPLE_EXPORTS = [
  {
    file: "/demo-data/vendor-tuan-minh-chat-export.zip",
    vendor: "Tuan Minh Trading (Vietnam)",
    sku: "Cassia Cinnamon",
    summary: "26 messages over 6 months — first contact at Sial Brazil, multiple quotes, doc requests, a quality issue resolution, and a Q3 program proposal.",
  },
  {
    file: "/demo-data/vendor-entegre-gida-chat-export.zip",
    vendor: "Entegre Gida (Turkey)",
    sku: "Dried Apricots #1",
    summary: "21 messages — premium-positioning vendor pushing Standard 5 grade, 15% lower yield forecast, allocation negotiations.",
  },
];

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

      {/* Sample exports — for the demo */}
      <div>
        <div className="label-caps mb-2">DON&apos;T HAVE A CHAT EXPORT HANDY?</div>
        <p className="text-xs text-forest-500 mb-3">
          Try the demo with one of these sample exports — both are realistic 6-month conversations
          between Polico and a real vendor in your seeded pool. Download the <code>.zip</code> and drop it above.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {SAMPLE_EXPORTS.map((s) => (
            <Card key={s.file} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-sm">{s.vendor}</div>
                  <div className="text-xs text-forest-500">{s.sku}</div>
                </div>
                <a
                  href={s.file}
                  download
                  className="inline-flex items-center gap-1 rounded-full bg-lime-400 hover:bg-lime-500 px-2.5 py-1 text-[11px] font-semibold text-forest-700"
                >
                  <DownloadSimple size={11} weight="bold" /> Download
                </a>
              </div>
              <p className="text-xs text-forest-700">{s.summary}</p>
            </Card>
          ))}
        </div>
      </div>

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
