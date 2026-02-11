import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Paintbrush,
  FolderOpen,
  Image,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebarStore";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/studio", icon: Paintbrush, label: "Studio" },
  { to: "/assets", icon: FolderOpen, label: "Asset Library" },
  { to: "/gallery", icon: Image, label: "Gallery" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const { isOpen, close } = useSidebarStore();

  return (
    <>
      {/* Tablet overlay (md-lg) - sidebar acts as a drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 hidden bg-black/50 md:block lg:hidden"
          onClick={close}
        />
      )}

      <aside
        className={cn(
          // Base: hidden on mobile (bottom nav used instead)
          "fixed left-0 top-0 z-50 hidden h-full w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-transform duration-200",
          // Tablet (md): show as off-canvas drawer, toggled by hamburger
          "md:flex",
          isOpen ? "md:translate-x-0" : "md:-translate-x-full",
          // Desktop (lg): always visible, static position
          "lg:static lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <NavLink to="/" className="flex items-center gap-2" onClick={close}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              FG
            </div>
            <span className="text-lg font-semibold">FitGen Studio</span>
          </NavLink>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={close}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={close}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
              end={item.to === "/"}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <p className="text-xs text-sidebar-foreground/50">
            FitGen Studio v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
