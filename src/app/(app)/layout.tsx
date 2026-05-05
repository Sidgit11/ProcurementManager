import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Toaster } from "sonner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Topbar />
        <div className="flex-1 p-6">{children}</div>
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
