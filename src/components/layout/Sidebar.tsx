"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Tray,
  Buildings,
  Scales,
  PaperPlaneTilt,
  Sparkle,
  ChartBar,
  Robot,
  Bell,
  Gear,
} from "@phosphor-icons/react";

const NAV_SECTIONS = [
  {
    section: "TODAY",
    items: [
      { href: "/digest",        label: "Today",           Icon: House },
      { href: "/inbox",         label: "Inbox",           Icon: Tray },
    ],
  },
  {
    section: "KNOW",
    items: [
      { href: "/vendors",       label: "Vendors",         Icon: Buildings },
      { href: "/compare",       label: "Quote compare",   Icon: Scales },
      { href: "/insights",      label: "Insights",        Icon: ChartBar },
    ],
  },
  {
    section: "ACT",
    items: [
      { href: "/rfq",           label: "Requests",        Icon: PaperPlaneTilt },
      { href: "/opportunities", label: "Buy opportunities", Icon: Sparkle },
      { href: "/agents",        label: "Automations",     Icon: Robot },
    ],
  },
];

const OPS_ITEMS = [
  { href: "/alerts",   label: "Alerts",   Icon: Bell },
  { href: "/settings", label: "Settings", Icon: Gear },
];

export function Sidebar() {
  const path = usePathname();

  function navLink(href: string, label: string, Icon: React.ComponentType<{ size?: number }>) {
    const active = path?.startsWith(href);
    return (
      <li key={href}>
        <Link
          href={href}
          className={
            active
              ? "flex items-center gap-3 rounded-lg px-3 py-2 text-sm bg-forest-700 text-white"
              : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-forest-100/50"
          }
        >
          <Icon size={18} />
          {label}
        </Link>
      </li>
    );
  }

  return (
    <nav className="flex flex-col w-56 shrink-0 h-full border-r border-forest-100/40 px-3 py-4 text-forest-700">
      <div className="mb-6 px-2">
        <div className="text-xl font-display font-semibold">Tradyon</div>
        <div className="label-caps">Procurement</div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {NAV_SECTIONS.map(({ section, items }) => (
          <div key={section}>
            <div className="label-caps px-3 mb-1 text-forest-400">{section}</div>
            <ul className="space-y-1">
              {items.map(({ href, label, Icon }) => navLink(href, label, Icon))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-forest-100/40 pt-3 space-y-1">
        <ul className="space-y-1">
          {OPS_ITEMS.map(({ href, label, Icon }) => navLink(href, label, Icon))}
        </ul>
      </div>

      <div className="mt-3 px-1">
        <Link
          href="/ask"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-forest-500 hover:bg-forest-100/50 border border-forest-100/60"
        >
          <Sparkle size={14} />
          Ask Genie
        </Link>
      </div>
    </nav>
  );
}
