import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar: hidden on mobile, collapsible on tablet, always visible on desktop */}
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto pb-14 md:pb-0">
          <Outlet />
        </main>
      </div>
      {/* Bottom nav for mobile only */}
      <BottomNav />
    </div>
  );
}
