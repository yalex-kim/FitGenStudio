import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Upload,
  Image,
  Users,
  CreditCard,
  ArrowRight,
  Clock,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const MOCK_RECENT_PROJECTS = [
  {
    id: "1",
    name: "Spring Collection",
    thumbnailUrl: null,
    imagesCount: 12,
    updatedAt: "2026-02-10",
  },
  {
    id: "2",
    name: "Street Wear Lookbook",
    thumbnailUrl: null,
    imagesCount: 8,
    updatedAt: "2026-02-09",
  },
  {
    id: "3",
    name: "Summer Essentials",
    thumbnailUrl: null,
    imagesCount: 4,
    updatedAt: "2026-02-08",
  },
  {
    id: "4",
    name: "Casual Basics",
    thumbnailUrl: null,
    imagesCount: 6,
    updatedAt: "2026-02-07",
  },
];

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Welcome Banner skeleton */}
      <div className="rounded-xl bg-muted/50 p-6 md:p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-96" />
        <div className="mt-4 flex gap-3">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      {/* Stats skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-1 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Recent projects skeleton */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="aspect-[4/3] rounded-t-xl" />
              <CardHeader className="p-4 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-3 w-20" />
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <Skeleton className="h-5 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate data fetch - will be replaced with real API call
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Welcome Banner */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8">
        <h1 className="text-2xl font-bold md:text-3xl">
          Welcome back, {user?.name?.split(" ")[0] || "there"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Create stunning AI-powered lookbooks for your fashion brand.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => navigate("/studio")}>
            <Plus className="mr-2 h-4 w-4" />
            New Lookbook
          </Button>
          <Button variant="outline" onClick={() => navigate("/studio")}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Garment
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Images Generated
            </CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Models Saved
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">In your library</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Credits Remaining
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user?.creditsRemaining ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {user?.creditsTotal ?? 0} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plan
            </CardTitle>
            <Badge variant="secondary" className="capitalize">
              {user?.tier ?? "free"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {user?.tier ?? "Free"}
            </div>
            <p className="text-xs text-muted-foreground">
              {user?.tier === "free" ? (
                <button
                  onClick={() => navigate("/settings")}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Upgrade for more
                </button>
              ) : (
                "Active subscription"
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/gallery")}
          >
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MOCK_RECENT_PROJECTS.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate("/studio")}
            >
              <div className="aspect-[4/3] rounded-t-xl bg-muted flex items-center justify-center">
                <Image className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">{project.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  {project.updatedAt}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <Badge variant="secondary" className="text-xs">
                  {project.imagesCount} images
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
