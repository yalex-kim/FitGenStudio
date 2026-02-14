import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Paintbrush,
  FolderOpen,
  Image,
  Settings,
  X,
  UserRound,
  Clapperboard,
  Shirt,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useStudioStore, type StudioStep } from "@/stores/studioStore";
import { Button } from "@/components/ui/button";

const studioSubItems: { step: StudioStep; icon: typeof UserRound; label: string }[] = [
  { step: "model", icon: UserRound, label: "Model Generation" },
  { step: "scene", icon: Clapperboard, label: "Scene Direction" },
  { step: "tryon", icon: Shirt, label: "Virtual Try-On" },
  { step: "finetune", icon: SlidersHorizontal, label: "Fine Tune" },
];

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/studio", icon: Paintbrush, label: "Studio" },
  { to: "/assets", icon: FolderOpen, label: "Asset Library" },
  { to: "/gallery", icon: Image, label: "Gallery" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const { isOpen, close } = useSidebarStore();
  const location = useLocation();
  const studioStep = useStudioStore((s) => s.studioStep);
  const setStudioStep = useStudioStore((s) => s.setStudioStep);
  const isStudioActive = location.pathname === "/studio";

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
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <div key={item.to}>
              <NavLink
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

              {/* Studio sub-items */}
              {item.to === "/studio" && isStudioActive && (
                <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-sidebar-border pl-3">
                  {studioSubItems.map((sub) => (
                    <button
                      key={sub.step}
                      onClick={() => {
                        setStudioStep(sub.step);
                        close();
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        studioStep === sub.step
                          ? "bg-sidebar-accent/60 text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <sub.icon className="h-3.5 w-3.5 shrink-0" />
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
