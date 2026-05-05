import { ChatExportDropzone } from "@/components/upload/ChatExportDropzone";
import { ProcessingPanel } from "@/components/upload/ProcessingPanel";

export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const { job } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="label-caps">Onboarding</div>
        <h1 className="font-display text-3xl">Capture your last 6 months of vendor chats</h1>
        <p className="mt-2 text-sm text-forest-500">
          Drop a WhatsApp chat export .zip. We&apos;ll structure every quote and surface the price intelligence within minutes.
        </p>
      </div>
      <ChatExportDropzone />
      {job && <ProcessingPanel jobId={job} />}
    </div>
  );
}
