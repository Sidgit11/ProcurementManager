"use client";
import * as React from "react";
import Link from "next/link";
import { CaretUp, CaretDown, CaretUpDown, FunnelSimple, MagnifyingGlass } from "@phosphor-icons/react";

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => string | number | Date | null | undefined;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  align?: "left" | "right";
  width?: string; // tailwind width class, e.g. "w-32"
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchKeys,
  searchPlaceholder = "Search…",
  emptyState,
}: {
  rows: T[];
  columns: Column<T>[];
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  emptyState?: React.ReactNode;
}) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [filterMenu, setFilterMenu] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  // Distinct values per filterable column for dropdowns
  const distinct = React.useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const c of columns) {
      if (!c.filterable) continue;
      const s = new Set<string>();
      for (const r of rows) {
        const v = c.accessor(r);
        if (v != null && v !== "") s.add(String(v));
      }
      out[c.key] = ["ALL", ...[...s].sort()];
    }
    return out;
  }, [rows, columns]);

  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      // Search
      if (search.trim() && searchKeys) {
        const hay = searchKeys.map((k) => String(r[k] ?? "")).join(" ").toLowerCase();
        if (!hay.includes(search.trim().toLowerCase())) return false;
      }
      // Filters
      for (const c of columns) {
        if (!c.filterable) continue;
        const f = filters[c.key];
        if (!f || f === "ALL") continue;
        if (String(c.accessor(r) ?? "") !== f) return false;
      }
      return true;
    });
  }, [rows, search, searchKeys, filters, columns]);

  const sorted = React.useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = col.accessor(a);
      const bv = col.accessor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      let cmp = 0;
      if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
      else if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  function toggleSort(key: string) {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); return; }
    setSortDir((d) => d === "asc" ? "desc" : "asc");
  }

  function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
    if (!active) return <CaretUpDown size={11} className="opacity-50 inline-block" />;
    return dir === "asc" ? <CaretUp size={11} className="inline-block" /> : <CaretDown size={11} className="inline-block" />;
  }

  const hasActiveFilter = Object.values(filters).some((v) => v && v !== "ALL");
  const hasActiveSearch = search.trim().length > 0;

  // Close filter menu when clicking outside
  React.useEffect(() => {
    if (!filterMenu) return;
    function handleClick() { setFilterMenu(null); }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [filterMenu]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        {searchKeys && searchKeys.length > 0 && (
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="flex items-center gap-2 flex-1 rounded-lg border border-forest-100/60 bg-white/60 px-3 py-1.5">
              <MagnifyingGlass size={14} className="text-forest-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="bg-transparent text-sm outline-none flex-1"
              />
            </div>
          </div>
        )}
        <div className="text-xs text-forest-500">
          {sorted.length} of {rows.length}
          {(hasActiveFilter || hasActiveSearch) && (
            <button
              onClick={() => { setFilters({}); setSearch(""); }}
              className="ml-3 underline hover:text-forest-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-forest-100/40 bg-white/60">
        <table className="min-w-full text-sm">
          <thead className="bg-forest-100/40 text-left text-xs uppercase tracking-wider">
            <tr>
              {columns.map((c) => {
                const filterable = !!c.filterable;
                const filterValue = filters[c.key] ?? "ALL";
                const filterOpen = filterMenu === c.key;
                const align = c.align === "right" ? "text-right" : "text-left";
                return (
                  <th key={c.key} className={`p-3 select-none whitespace-nowrap relative ${align} ${c.width ?? ""}`}>
                    <button
                      type="button"
                      onClick={() => c.sortable !== false && toggleSort(c.key)}
                      className="inline-flex items-center gap-1 hover:text-forest-700 disabled:cursor-default"
                      disabled={c.sortable === false}
                    >
                      {c.header} {c.sortable !== false && <SortIcon active={sortKey === c.key} dir={sortDir} />}
                    </button>
                    {filterable && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFilterMenu(filterOpen ? null : c.key); }}
                        className={"ml-1 inline-flex items-center align-middle " + (filterValue !== "ALL" ? "text-forest-700" : "opacity-50")}
                        aria-label={`Filter ${c.header}`}
                      >
                        <FunnelSimple size={11} />
                      </button>
                    )}
                    {filterable && filterOpen && (
                      <div
                        className="absolute z-10 mt-2 left-0 rounded-lg border border-forest-100/60 bg-white p-2 shadow-lg min-w-[8rem] max-h-64 overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(distinct[c.key] ?? []).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => { setFilters((p) => ({ ...p, [c.key]: opt })); setFilterMenu(null); }}
                            className={"block w-full text-left px-2 py-1 text-xs rounded hover:bg-forest-100/50 " + (filterValue === opt ? "bg-lime-300/30 font-semibold" : "")}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="p-6 text-center text-sm text-forest-500">
                  {emptyState ?? "No rows match your filters."}
                </td>
              </tr>
            )}
            {sorted.map((row) => (
              <tr key={row.id} className="border-t border-forest-100/30 hover:bg-forest-100/20">
                {columns.map((c, i) => {
                  const align = c.align === "right" ? "text-right" : "text-left";
                  const content = c.render ? c.render(row) : (() => {
                    const v = c.accessor(row);
                    if (v == null) return "—";
                    if (v instanceof Date) return v.toLocaleDateString();
                    return String(v);
                  })();
                  return (
                    <td key={c.key} className={`p-3 ${align} ${i === 0 ? "font-medium" : ""}`}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Re-export Link for convenience in render fns (avoids extra import in callers)
export { Link };
