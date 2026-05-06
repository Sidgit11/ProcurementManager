import { currentUser, currentOrg } from "@/lib/auth/current";
import { GlobalSearch } from "@/components/search/GlobalSearch";

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
      <GlobalSearch />
      <div className="text-sm text-forest-500">{label}</div>
    </header>
  );
}
