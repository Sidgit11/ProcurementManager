import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";

const ADAPTERS = [
  { name: "Gmail",          envKey: "GMAIL_MODE",          defaultValue: "mock", productionValue: "real" },
  { name: "WhatsApp Cloud", envKey: "WHATSAPP_CLOUD_MODE", defaultValue: "mock", productionValue: "real" },
  { name: "Whisper",        envKey: "WHISPER_MODE",        defaultValue: "stub", productionValue: "real" },
];

export default function Integrations() {
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Integrations</h1>
      <p className="text-sm text-forest-500">Adapter modes are controlled by environment variables. Mock mode returns realistic sample data; real mode requires the corresponding API credentials.</p>
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
