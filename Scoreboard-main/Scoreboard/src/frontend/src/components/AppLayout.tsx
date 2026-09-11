import { useState } from "react";
import type { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Mobile: controls slide-in overlay (starts closed on mobile)
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop: controls collapsed (icon-only) vs expanded sidebar
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-foreground/20 lg:hidden"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setMobileOpen(false);
          }}
          role="presentation"
        />
      )}

      {/* Sidebar — fixed on mobile (overlay), static flex column on desktop */}
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        desktopCollapsed={desktopCollapsed}
        onDesktopToggle={() => setDesktopCollapsed((v) => !v)}
      />

      {/* Main area — sits next to sidebar on desktop, full-width on mobile */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setMobileOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
