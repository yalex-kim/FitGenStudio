import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { Loader2 } from "lucide-react";

// Lazy-loaded route components for code splitting
const StudioPage = lazy(() =>
  import("@/features/studio/StudioPage").then((m) => ({
    default: m.StudioPage,
  }))
);
const GalleryPage = lazy(() =>
  import("@/features/gallery/GalleryPage").then((m) => ({
    default: m.GalleryPage,
  }))
);
const AssetLibraryPage = lazy(() =>
  import("@/features/models/AssetLibraryPage").then((m) => ({
    default: m.AssetLibraryPage,
  }))
);
const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);

function RouteSpinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes with layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route
          path="/studio"
          element={
            <Suspense fallback={<RouteSpinner />}>
              <StudioPage />
            </Suspense>
          }
        />
        <Route
          path="/assets"
          element={
            <Suspense fallback={<RouteSpinner />}>
              <AssetLibraryPage />
            </Suspense>
          }
        />
        <Route
          path="/gallery"
          element={
            <Suspense fallback={<RouteSpinner />}>
              <GalleryPage />
            </Suspense>
          }
        />
        <Route
          path="/settings"
          element={
            <Suspense fallback={<RouteSpinner />}>
              <SettingsPage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
