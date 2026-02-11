import { Menu, LogOut, CreditCard, User, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useUsageStore } from "@/stores/usageStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export function TopBar() {
  const { user, logout } = useAuthStore();
  const { toggle } = useSidebarStore();
  const { getRemaining, getLimit, resetIfNewMonth } = useUsageStore();
  const navigate = useNavigate();

  useEffect(() => {
    resetIfNewMonth();
  }, [resetIfNewMonth]);

  const tier = user?.tier ?? "free";
  const remaining = getRemaining(tier);
  const limit = getLimit(tier);
  const isUnlimited = tier === "business";
  const isLow = !isUnlimited && remaining <= Math.ceil(limit * 0.1);
  const isExhausted = !isUnlimited && remaining === 0;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      {/* Left: hamburger - hidden on mobile (bottom nav), visible on tablet, hidden on desktop (sidebar always visible) */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden md:flex lg:hidden"
        onClick={toggle}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Spacer for mobile and desktop */}
      <div className="md:hidden lg:block" />

      {/* Right: credits + avatar */}
      <div className="flex items-center gap-3">
        {user && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden items-center gap-2 sm:flex">
                  {isExhausted ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : isLow ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span
                    className={`text-sm ${
                      isExhausted
                        ? "font-medium text-destructive"
                        : isLow
                          ? "font-medium text-yellow-500"
                          : "text-muted-foreground"
                    }`}
                  >
                    {isUnlimited ? "Unlimited" : `${remaining} / ${limit}`}
                  </span>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {user.tier}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isUnlimited
                    ? "Unlimited generations (Business plan)"
                    : `${remaining} of ${limit} generations remaining this month`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <User className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
