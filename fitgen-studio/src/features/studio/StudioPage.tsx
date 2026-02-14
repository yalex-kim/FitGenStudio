import { useState } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { LeftPanel } from "./components/LeftPanel";
import { CenterPanel } from "./components/CenterPanel";
import { RightPanel } from "./components/RightPanel";
import { Button } from "@/components/ui/button";
import {
  PanelLeftClose,
  PanelRightClose,
  PanelLeftOpen,
  PanelRightOpen,
} from "lucide-react";

export function StudioPage() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <div className="flex h-full flex-col">
      {/* Panel toggle toolbar - visible on mobile and tablet, hidden on desktop */}
      <div className="flex items-center gap-1 border-b border-border px-2 py-1 lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLeftCollapsed(!leftCollapsed)}
        >
          {leftCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
          <span className="ml-1 text-xs">Assets</span>
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRightCollapsed(!rightCollapsed)}
        >
          <span className="mr-1 text-xs">Controls</span>
          {rightCollapsed ? (
            <PanelRightOpen className="h-4 w-4" />
          ) : (
            <PanelRightClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Desktop: full 3-panel resizable layout */}
      <div className="hidden flex-1 overflow-hidden lg:block">
        <ResizablePanelGroup>
          <ResizablePanel
            id="left-panel"
            defaultSize="20%"
            minSize="15%"
            maxSize="35%"
            collapsible
            collapsedSize="0%"
          >
            <LeftPanel />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="center-panel" defaultSize="55%" minSize="30%">
            <CenterPanel />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            id="right-panel"
            defaultSize="25%"
            minSize="20%"
            maxSize="40%"
            collapsible
            collapsedSize="0%"
          >
            <RightPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Tablet: side-by-side with collapsible side panels */}
      <div className="hidden flex-1 overflow-hidden md:flex lg:hidden">
        {!leftCollapsed && (
          <div className="w-64 shrink-0 overflow-hidden border-r border-border">
            <LeftPanel />
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <CenterPanel />
        </div>
        {!rightCollapsed && (
          <div className="w-72 shrink-0 overflow-hidden border-l border-border">
            <RightPanel />
          </div>
        )}
      </div>

      {/* Mobile: stacked vertical panels */}
      <div className="flex flex-1 flex-col overflow-hidden md:hidden">
        {!leftCollapsed && (
          <div className="h-1/3 overflow-hidden border-b border-border">
            <LeftPanel />
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <CenterPanel />
        </div>
        {!rightCollapsed && (
          <div className="h-1/3 overflow-hidden border-t border-border">
            <RightPanel />
          </div>
        )}
      </div>
    </div>
  );
}
