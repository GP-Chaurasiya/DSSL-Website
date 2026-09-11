import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SPORTS } from "@/store";
import { useUIStore } from "@/store";
import { useRouterState } from "@tanstack/react-router";
import { Bell, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface HeaderProps {
  onMenuClick: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/live-matches": "Live Matches",
  "/schedule": "Match Schedule",
  "/leaderboard": "Leaderboard",
  "/medal-tally": "Medal Tally",
  "/reports": "Reports",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (pathname in ROUTE_LABELS) return ROUTE_LABELS[pathname];
  const sportMatch = pathname.match(/^\/sports\/(\d+)$/);
  if (sportMatch) {
    const sport = SPORTS.find((s) => s.id === Number(sportMatch[1]));
    return sport ? `${sport.icon} ${sport.name} Scoreboard` : "Scoreboard";
  }
  return "DSSL";
}

export function Header({ onMenuClick }: HeaderProps) {
  const { location } = useRouterState();
  const title = getPageTitle(location.pathname);
  const liveCount = useUIStore((s) => (s.liveMatchId ? 1 : 0));
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header
      data-ocid="header"
      className="flex items-center justify-between h-16 px-4 bg-card border-b border-border shadow-xs flex-shrink-0"
    >
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          data-ocid="header.menu_toggle.button"
          aria-label="Toggle sidebar"
          className="w-9 h-9 hover:bg-muted"
        >
          <Menu className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3">
          {/* DSSL brand mark — visible on mobile */}
          <div className="flex items-center gap-2 lg:hidden">
            <img
              src="/assets/DSSL-logo.png"
              alt="DSSL"
              className="h-8 w-auto object-contain"
            />
          </div>
          <h1 className="text-[17px] font-display font-semibold text-foreground tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: indicators */}
      <div className="flex items-center gap-3">
        {liveCount > 0 && (
          <div
            data-ocid="header.live_indicator"
            className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-semibold text-red-600">
              {liveCount} LIVE
            </span>
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-ocid="header.theme_toggle.button"
          aria-label="Toggle theme"
          className="w-9 h-9 hover:bg-muted"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-ocid="header.notifications.button"
          aria-label="Notifications"
          className="w-9 h-9 hover:bg-muted relative"
        >
          <Bell className="w-5 h-5" />
        </Button>

        <div className="h-7 w-px bg-border" />

        <div
          className="flex items-center gap-2 cursor-pointer hover:bg-muted px-2 py-1 rounded-lg transition-colors"
          data-ocid="header.user_avatar"
        >
          <div className="w-8 h-8 rounded-full bg-[#003E8A] flex items-center justify-center">
            <span className="text-white text-xs font-display font-bold">
              AD
            </span>
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block">
            Admin
          </span>
        </div>
      </div>
    </header>
  );
}
