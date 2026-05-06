import Link from "next/link";
import { Card } from "@/components/ui/Card";

const ITEMS = [
  { href: "/settings/defaults",     label: "Defaults",            description: "Home port, home currency, alert thresholds, lead time tolerance" },
  { href: "/settings/users",        label: "Users & roles",        description: "Manage org members" },
  { href: "/settings/agents",       label: "Agent policies",       description: "Enable/disable agents and tweak guardrails" },
  { href: "/settings/integrations", label: "Channel connections",  description: "Connect Gmail, WhatsApp Cloud, and voice transcription." },
];

export default function Settings() {
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Settings</h1>
      <div className="grid gap-3 md:grid-cols-3">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href}>
            <Card className="hover:bg-white">
              <div className="font-medium">{i.label}</div>
              <div className="text-sm text-forest-500 mt-1">{i.description}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
