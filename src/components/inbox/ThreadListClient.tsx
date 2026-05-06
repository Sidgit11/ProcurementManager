"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { MagnifyingGlass, FunnelSimple, CaretUpDown } from "@phosphor-icons/react";

interface Row {
  vendorId: string;
  name: string;
  country: string | null;
  scoreTier: string | null;
  lastAtIso: string | null;
}

type SortKey = "recent" | "name" | "score";
const SCORE_RANK: Record<string, number> = { RELIABLE: 0, AGGRESSIVE: 1, SLOW: 2, OUTLIER: 3 };
const TIERS = ["RELIABLE", "AGGRESSIVE", "SLOW", "OUTLIER"];

function relTime(iso: string | null): string {
  if (!iso) return "no activity";
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return "no activity";
  const ms = Date.now() - dt.getTime();
  const m = ms / 60_000;
  if (m < 60) return "just now";
  const h = m / 60;
  if (h < 24) return `${Math.round(h)}h ago`;
  const days = h / 24;
  if (days < 7) return `${Math.round(days)}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export function ThreadListClient({ rows, selectedVendorId }: { rows: Row[]; selectedVendorId?: string }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [tierFilter, setTierFilter] = useState<string | "ALL">("ALL");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tierFilter !== "ALL" && r.scoreTier !== tierFilter) return false;
      if (search.trim()) {
        const hay = `${r.name} ${r.country ?? ""}`.toLowerCase();
        if (!hay.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, search, tierFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sort === "recent") {
      copy.sort((a, b) => {
        const ax = a.lastAtIso ? new Date(a.lastAtIso).getTime() : 0;
        const bx = b.lastAtIso ? new Date(b.lastAtIso).getTime() : 0;
        return bx - ax;
      });
    } else if (sort === "name") {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "score") {
      copy.sort((a, b) => (SCORE_RANK[a.scoreTier ?? "ZZZ"] ?? 99) - (SCORE_RANK[b.scoreTier ?? "ZZZ"] ?? 99) || a.name.localeCompare(b.name));
    }
    return copy;
  }, [filtered, sort]);

  const sortLabel = sort === "recent" ? "Recent" : sort === "name" ? "Name" : "Score";

  return (
    <div className="flex flex-col overflow-hidden border-r border-forest-100/40">
      <div className="border-b border-forest-100/40 p-2 space-y-1.5 bg-white/30">
        <div className="flex items-center gap-1.5 rounded-lg border border-forest-100/60 bg-white/80 px-2 py-1.5">
          <MagnifyingGlass size={12} className="text-forest-500 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors…"
            className="bg-transparent text-xs outline-none flex-1 min-w-0"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => { setSortOpen((s) => !s); setFilterOpen(false); }}
              className="w-full inline-flex items-center justify-between gap-1 rounded-md border border-forest-100/60 bg-white/60 px-2 py-1 text-[11px] text-forest-700 hover:bg-white"
            >
              <span><CaretUpDown size={10} className="inline mr-1" />{sortLabel}</span>
            </button>
            {sortOpen && (
              <div className="absolute z-20 mt-1 left-0 right-0 rounded-md border border-forest-100/60 bg-white p-1 shadow-lg">
                {([["recent","Recent activity"],["name","Name (A-Z)"],["score","Score tier"]] as const).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => { setSort(k); setSortOpen(false); }}
                    className={"block w-full text-left px-2 py-1 text-[11px] rounded hover:bg-forest-100/50 " + (sort === k ? "bg-lime-300/30 font-semibold" : "")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => { setFilterOpen((s) => !s); setSortOpen(false); }}
              className={
                "w-full inline-flex items-center justify-between gap-1 rounded-md border border-forest-100/60 px-2 py-1 text-[11px] hover:bg-white " +
                (tierFilter !== "ALL" ? "bg-lime-300/30 text-forest-700 border-lime-400/50" : "bg-white/60 text-forest-700")
              }
            >
              <span><FunnelSimple size={10} className="inline mr-1" />{tierFilter === "ALL" ? "All tiers" : tierFilter}</span>
            </button>
            {filterOpen && (
              <div className="absolute z-20 mt-1 left-0 right-0 rounded-md border border-forest-100/60 bg-white p-1 shadow-lg">
                <button
                  onClick={() => { setTierFilter("ALL"); setFilterOpen(false); }}
                  className={"block w-full text-left px-2 py-1 text-[11px] rounded hover:bg-forest-100/50 " + (tierFilter === "ALL" ? "bg-lime-300/30 font-semibold" : "")}
                >
                  All tiers
                </button>
                {TIERS.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTierFilter(t); setFilterOpen(false); }}
                    className={"block w-full text-left px-2 py-1 text-[11px] rounded hover:bg-forest-100/50 " + (tierFilter === t ? "bg-lime-300/30 font-semibold" : "")}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="text-[10px] text-forest-500 px-1">
          {sorted.length} of {rows.length}
          {(tierFilter !== "ALL" || search.trim()) && (
            <button onClick={() => { setSearch(""); setTierFilter("ALL"); }} className="ml-2 underline hover:text-forest-700">Clear</button>
          )}
        </div>
      </div>
      <ul className="divide-y divide-forest-100/40 overflow-auto flex-1">
        {sorted.length === 0 && (
          <li className="px-4 py-6 text-center text-xs text-forest-500">No vendors match.</li>
        )}
        {sorted.map((r) => (
          <li key={r.vendorId}>
            <Link
              href={`/inbox/${r.vendorId}`}
              className={
                selectedVendorId === r.vendorId
                  ? "block px-4 py-3 text-sm bg-forest-100/60"
                  : "block px-4 py-3 text-sm hover:bg-forest-100/30"
              }
            >
              <div className="flex items-center justify-between gap-1">
                <div className="font-medium truncate">{r.name}</div>
                {r.scoreTier && (
                  <span className={
                    "rounded-full px-1.5 py-0.5 text-[8px] font-semibold tracking-wider shrink-0 " +
                    (r.scoreTier === "RELIABLE" ? "bg-lime-300 text-forest-700"
                      : r.scoreTier === "AGGRESSIVE" ? "bg-amber-100 text-amber-900"
                      : r.scoreTier === "OUTLIER" ? "bg-red-100 text-red-900"
                      : "bg-forest-100 text-forest-700")
                  }>{r.scoreTier}</span>
                )}
              </div>
              <div className="text-forest-500 text-xs mt-0.5">{r.country ?? ""} · last quote {relTime(r.lastAtIso)}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
