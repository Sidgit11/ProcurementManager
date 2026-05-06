"use client";
import { useEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { MagnifyingGlass } from "@phosphor-icons/react";

interface SearchResults {
  vendors: { id: string; name: string; country: string | null; scoreTier: string | null }[];
  products: { id: string; sku: string; name: string; category: string }[];
  rfqs: { id: string; productNameRaw: string | null; status: string }[];
}

const empty: SearchResults = { vendors: [], products: [], rfqs: [] };

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>(empty);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⌘+/ or Ctrl+/ to open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setOpen((s) => !s);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      if (!q.trim()) { setResults(empty); return; }
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (r.ok) setResults(await r.json());
      } finally { setLoading(false); }
    }, 150);
  }, [q, open]);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-forest-500 text-sm hover:text-forest-700"
      >
        <MagnifyingGlass size={16} />
        <span>Search vendors, SKUs, requests…</span>
        <kbd className="ml-2 rounded border border-forest-100/60 bg-white/60 px-1.5 py-0.5 text-[10px] tabular-nums">⌘ /</kbd>
      </button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-forest-700/30 z-40" />
          <Dialog.Content
            className="fixed left-1/2 top-24 z-50 -translate-x-1/2 w-full max-w-xl rounded-xl border border-forest-100/40 bg-white shadow-xl"
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">Global search</Dialog.Title>
            <Command shouldFilter={false}>
              <div className="flex items-center gap-2 border-b border-forest-100/40 px-4 py-3">
                <MagnifyingGlass size={16} className="text-forest-500" />
                <Command.Input
                  value={q}
                  onValueChange={setQ}
                  placeholder="Search vendors, SKUs, requests…"
                  autoFocus
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                {loading && <span className="text-[10px] text-forest-500">searching…</span>}
              </div>
              <Command.List className="max-h-[400px] overflow-auto p-2">
                {!q.trim() && (
                  <div className="p-6 text-center text-sm text-forest-500">
                    Type to search across vendors, SKUs, and requests.
                    <div className="mt-2 text-xs">Press <kbd className="rounded border border-forest-100/60 px-1.5 py-0.5 text-[10px] tabular-nums">Esc</kbd> to close.</div>
                  </div>
                )}
                {q.trim() && !loading && results.vendors.length === 0 && results.products.length === 0 && results.rfqs.length === 0 && (
                  <Command.Empty className="p-6 text-center text-sm text-forest-500">No matches for &quot;{q}&quot;.</Command.Empty>
                )}
                {results.vendors.length > 0 && (
                  <Command.Group heading="VENDORS" className="text-[10px] text-forest-500 uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                    {results.vendors.map((v) => (
                      <Command.Item
                        key={v.id}
                        value={`vendor-${v.id}`}
                        onSelect={() => go(`/vendors/${v.id}`)}
                        className="flex items-center justify-between rounded px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-lime-300/30 hover:bg-forest-100/50"
                      >
                        <span className="text-forest-700">{v.name}</span>
                        <span className="text-[10px] text-forest-500">{v.country ?? ""}{v.scoreTier ? ` · ${v.scoreTier}` : ""}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
                {results.products.length > 0 && (
                  <Command.Group heading="SKUs" className="text-[10px] text-forest-500 uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                    {results.products.map((p) => (
                      <Command.Item
                        key={p.id}
                        value={`product-${p.id}`}
                        onSelect={() => go(`/compare/${p.sku}`)}
                        className="flex items-center justify-between rounded px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-lime-300/30 hover:bg-forest-100/50"
                      >
                        <span className="text-forest-700">{p.name}</span>
                        <span className="text-[10px] text-forest-500">{p.sku} · {p.category}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
                {results.rfqs.length > 0 && (
                  <Command.Group heading="REQUESTS" className="text-[10px] text-forest-500 uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                    {results.rfqs.map((r) => (
                      <Command.Item
                        key={r.id}
                        value={`rfq-${r.id}`}
                        onSelect={() => go(`/rfq/${r.id}`)}
                        className="flex items-center justify-between rounded px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-lime-300/30 hover:bg-forest-100/50"
                      >
                        <span className="text-forest-700">{r.productNameRaw ?? "Untitled"}</span>
                        <span className="text-[10px] text-forest-500">{r.status}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
              <div className="border-t border-forest-100/40 px-4 py-2 text-[10px] text-forest-500 flex justify-between">
                <span>Results scoped to your org · {q ? `${results.vendors.length + results.products.length + results.rfqs.length} matches` : ""}</span>
                <span>↑↓ navigate · ↵ open · ⌘/ toggle</span>
              </div>
            </Command>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
