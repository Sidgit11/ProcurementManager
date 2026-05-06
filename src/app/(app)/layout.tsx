import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Toaster } from "sonner";
import { GenieFab } from "@/components/genie/GenieFab";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 min-h-0 overflow-auto p-6">{children}</main>
      </div>
      <GenieFab />
      <Toaster richColors position="top-right" />
    </div>
  );
}
