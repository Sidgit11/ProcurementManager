"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { GoogleLogo, WhatsappLogo, Microphone, CheckCircle, X } from "@phosphor-icons/react";
import { toast } from "sonner";

interface Channel {
  key: string;
  name: string;
  description: string;
  Icon: typeof GoogleLogo;
  envKey: string;
  capabilities: string[];
  connectVerb: string;
}

const CHANNELS: Channel[] = [
  {
    key: "gmail",
    name: "Gmail",
    description: "Read inbound vendor emails — quotes, follow-ups, document attachments — and capture them into your inbox automatically.",
    Icon: GoogleLogo,
    envKey: "GMAIL_MODE",
    capabilities: ["Read messages from vendor domains", "Parse attachments (PDFs, images)", "Track response times"],
    connectVerb: "Connect Gmail",
  },
  {
    key: "whatsapp",
    name: "WhatsApp Cloud",
    description: "Send RFQs and capture replies through a Tradyon-issued WhatsApp business number. Vendors see your name, you see structured quotes.",
    Icon: WhatsappLogo,
    envKey: "WHATSAPP_CLOUD_MODE",
    capabilities: ["Send outbound RFQs", "Receive replies natively", "Forward fallback for personal-number quotes"],
    connectVerb: "Provision WhatsApp number",
  },
  {
    key: "whisper",
    name: "Voice transcription",
    description: "Transcribe WhatsApp voice notes from vendors so quotes embedded in audio get captured like any other message.",
    Icon: Microphone,
    envKey: "WHISPER_MODE",
    capabilities: ["Auto-transcribe voice notes on receive", "Extract quote fields from transcript"],
    connectVerb: "Enable transcription",
  },
];

export default function Integrations() {
  const [connected, setConnected] = useState<Record<string, { account?: string; connectedAt?: string }>>({});

  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem("tp.connections");
        if (raw) setConnected(JSON.parse(raw));
      } catch { /* ignore */ }
    }
    load();
  }, []);

  function persist(next: typeof connected) {
    setConnected(next);
    try { localStorage.setItem("tp.connections", JSON.stringify(next)); } catch { /* ignore */ }
  }

  function connect(channel: Channel) {
    const account = channel.key === "gmail"
      ? "lucas@polico.example"
      : channel.key === "whatsapp"
      ? "+55 11 9 0000-0000 (Tradyon-provisioned)"
      : "Whisper API";
    persist({ ...connected, [channel.key]: { account, connectedAt: new Date().toISOString() } });
    toast.success(`${channel.name} connected (${account})`);
  }

  function disconnect(channel: Channel) {
    if (!confirm(`Disconnect ${channel.name}? Inbound capture from this channel will pause.`)) return;
    const next = { ...connected };
    delete next[channel.key];
    persist(next);
    toast.success(`${channel.name} disconnected`);
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Breadcrumbs trail={[{ label: "Settings", href: "/settings" }, { label: "Channel connections" }]} />
      <div>
        <div className="label-caps">Channel connections</div>
        <h1 className="font-display text-3xl">Where Tradyon listens for quotes</h1>
        <p className="mt-1 text-sm text-forest-500 max-w-2xl">
          Connect each channel once. From then on, every inbound quote — email, WhatsApp text, voice note — flows into your unified inbox automatically.
        </p>
      </div>
      <div className="grid gap-3">
        {CHANNELS.map((ch) => {
          const c = connected[ch.key];
          const Icon = ch.Icon;
          return (
            <Card key={ch.key} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-forest-100/60 p-2">
                    <Icon size={22} className="text-forest-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-display text-lg leading-tight">{ch.name}</div>
                      {c
                        ? <Pill label="CONNECTED" />
                        : <Pill label="NOT CONNECTED" />}
                    </div>
                    <p className="text-sm text-forest-500 mt-0.5">{ch.description}</p>
                  </div>
                </div>
                <div>
                  {c
                    ? <Button variant="ghost" onClick={() => disconnect(ch)}><X size={14}/> Disconnect</Button>
                    : <Button variant="secondary" onClick={() => connect(ch)}>{ch.connectVerb}</Button>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-forest-100/30">
                {ch.capabilities.map((cap) => (
                  <div key={cap} className="flex items-start gap-1.5 text-xs text-forest-500">
                    <CheckCircle size={12} weight="fill" className="text-lime-500 mt-0.5 shrink-0" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
              {c && (
                <div className="text-xs text-forest-500 border-t border-forest-100/30 pt-2">
                  Connected as <span className="font-medium text-forest-700">{c.account}</span> · {c.connectedAt ? new Date(c.connectedAt).toLocaleDateString() : ""}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-forest-500">
        In production, Connect launches the appropriate OAuth flow or number provisioning wizard. In demo mode it just toggles a local connected state so you can see the UX.
      </p>
    </div>
  );
}
