import { Settings } from "lucide-react";

export function SettingsPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center text-muted-foreground">
        <Settings className="mx-auto mb-4 h-12 w-12" />
        <h2 className="text-xl font-semibold text-foreground">Settings</h2>
        <p className="mt-1 text-sm">Account and subscription management coming soon.</p>
      </div>
    </div>
  );
}
