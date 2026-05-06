import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

const ADAPTERS = [
  { name: "Gmail",          envKey: "GMAIL_MODE",          defaultValue: "mock", productionValue: "real" },
  { name: "WhatsApp Cloud", envKey: "WHATSAPP_CLOUD_MODE", defaultValue: "mock", productionValue: "real" },
  { name: "Whisper",        envKey: "WHISPER_MODE",        defaultValue: "stub", productionValue: "real" },
];

export default function Integrations() {
  return (
    <div className="space-y-4">
      <div className="mb-3">
        <Breadcrumbs trail={[{ label: "Settings", href: "/settings" }, { label: "Integrations" }]} />
      </div>
      <div>
        <h1 className="font-display text-3xl">Integrations</h1>
        <p className="mt-1 text-sm text-forest-500">
          Tradyon talks to Gmail, WhatsApp, and Whisper through swappable adapters. Mock mode uses sample data;
          real mode requires API keys.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {ADAPTERS.map((a) => {
          const current = process.env[a.envKey] ?? a.defaultValue;
          const isReal = current === a.productionValue;
          return (
            <Card key={a.envKey}>
              <div className="font-medium">{a.name}</div>
              <div className="mt-1"><Pill label={isReal ? "REAL" : current.toUpperCase()} /></div>
              <div className="text-xs text-forest-500 mt-2">env: {a.envKey}={current}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
