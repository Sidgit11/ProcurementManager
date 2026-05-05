import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { currentUser, currentOrg } from "@/lib/auth/current";

export async function Topbar() {
  let label = "—";
  try {
    const u = await currentUser();
    const o = await currentOrg();
    label = `${u.name.split(" ")[0]} · ${o.name.split(" ")[0]}`;
  } catch {
    /* ignore on unauthenticated */
  }
  return (
    <header className="flex items-center justify-between border-b border-forest-100/40 px-6 py-3">
      <div className="flex items-center gap-2 text-forest-500">
        <MagnifyingGlass size={18} />
        <span className="text-sm">Search vendors, SKUs, quotes…</span>
      </div>
      <div className="text-sm text-forest-500">{label}</div>
    </header>
  );
}
