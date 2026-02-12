import { useAuthStore } from "@/stores/authStore";
import { useUsageStore } from "@/stores/usageStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { User, CreditCard, BarChart3, LogOut } from "lucide-react";
import type { Tier } from "@/lib/usageLimits";

export function SettingsPage() {
  const { user, logout } = useAuthStore();
  const usedThisMonth = useUsageStore((s) => s.usedThisMonth);
  const getRemaining = useUsageStore((s) => s.getRemaining);
  const getLimit = useUsageStore((s) => s.getLimit);

  const tier: Tier = (user?.tier as Tier) ?? "free";
  const remaining = getRemaining(tier);
  const limit = getLimit(tier);
  const usagePercent = limit === Infinity ? 0 : Math.round((usedThisMonth / limit) * 100);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and subscription.
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>Your account information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user?.name ?? "User"}</p>
              <p className="text-sm text-muted-foreground">
                {user?.email ?? ""}
              </p>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={user?.name ?? ""}
                readOnly
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email ?? ""}
                readOnly
                className="bg-muted/50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Subscription</CardTitle>
          </div>
          <CardDescription>Your current plan and billing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Current Plan</p>
              <p className="text-sm text-muted-foreground">
                {tier === "free"
                  ? "Basic features with limited credits"
                  : tier === "pro"
                    ? "Full features with 500 monthly credits"
                    : "Unlimited credits for teams"}
              </p>
            </div>
            <Badge
              variant={tier === "free" ? "secondary" : "default"}
              className="capitalize"
            >
              {tier}
            </Badge>
          </div>
          {tier === "free" && (
            <>
              <Separator />
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="font-medium">Upgrade to Pro</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Get 500 monthly credits, priority generation, and more.
                </p>
                <Button className="mt-3" size="sm">
                  Upgrade Plan
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Usage Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Usage</CardTitle>
          </div>
          <CardDescription>Your generation usage this month.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Images generated
            </span>
            <span className="font-medium">
              {usedThisMonth} / {limit === Infinity ? "Unlimited" : limit}
            </span>
          </div>
          {limit !== Infinity && (
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Credits remaining
            </span>
            <span className="font-medium">
              {remaining === Infinity ? "Unlimited" : remaining}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardContent className="pt-6">
          <Button
            variant="outline"
            className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => logout()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
