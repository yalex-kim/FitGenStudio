import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Paintbrush,
  FolderOpen,
  Image,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Home" },
  { to: "/studio", icon: Paintbrush, label: "Studio" },
  { to: "/assets", icon: FolderOpen, label: "Assets" },
  { to: "/gallery", icon: Image, label: "Gallery" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t border-border bg-background md:hidden">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            )
          }
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
