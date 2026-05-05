"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Tray, Buildings, Scales, PaperPlaneTilt, Sparkle, ChartBar, Robot, Bell, Gear } from "@phosphor-icons/react";

const NAV = [
  { href: "/digest",        label: "Digest",          Icon: House },
  { href: "/inbox",         label: "Inbox",           Icon: Tray },
  { href: "/vendors",       label: "Vendors",         Icon: Buildings },
  { href: "/compare",       label: "Compare",         Icon: Scales },
  { href: "/rfq",           label: "RFQs",            Icon: PaperPlaneTilt },
  { href: "/opportunities", label: "Opportunities",   Icon: Sparkle },
  { href: "/insights",      label: "Insights",        Icon: ChartBar },
  { href: "/agents",        label: "Agents",          Icon: Robot },
  { href: "/alerts",        label: "Alerts",          Icon: Bell },
  { href: "/settings",      label: "Settings",        Icon: Gear },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <nav className="w-56 shrink-0 border-r border-forest-100/40 px-3 py-4 text-forest-700">
      <div className="mb-6 px-2">
        <div className="text-xl font-display font-semibold">Tradyon</div>
        <div className="label-caps">Procurement</div>
      </div>
      <ul className="space-y-1">
        {NAV.map(({ href, label, Icon }) => {
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
        })}
      </ul>
    </nav>
  );
}
