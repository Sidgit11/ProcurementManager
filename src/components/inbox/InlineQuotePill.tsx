import { Receipt } from "@phosphor-icons/react/dist/ssr";

export function InlineQuotePill({ label }: { label: string; quoteId?: string }) {
  return (
    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-lime-400 px-2.5 py-1 text-[11px] font-semibold text-forest-700">
      <Receipt size={12} /> {label}
    </span>
  );
}
