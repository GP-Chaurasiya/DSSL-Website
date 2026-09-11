import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SPORTS } from "@/store";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LayoutDashboard,
  Medal,
  Settings,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";

const SCROLL_STEP = 120;

/** Arrow button used above/below the scroll area */
function ScrollArrow({
  direction,
  onClick,
  collapsed,
}: {
  direction: "up" | "down";
  onClick: () => void;
  collapsed: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "up" ? "Scroll nav up" : "Scroll nav down"}
      className={cn(
        "flex items-center justify-center flex-shrink-0 transition-colors duration-150",
        "text-[#003E8A] dark:text-[#ffbc01]",
        "hover:bg-[#ffbc01]/15 dark:hover:bg-[#ffbc01]/20",
        "border border-[#ffbc01]/40 dark:border-[#ffbc01]/40",
        "rounded-full",
        collapsed ? "w-7 h-7 mx-auto" : "w-6 h-6 mx-3",
      )}
    >
      {direction === "up" ? (
        <ChevronUp className="w-3.5 h-3.5" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

interface SidebarProps {
  /** Mobile: slide-in overlay is open */
  mobileOpen: boolean;
  onMobileClose: () => void;
  /** Desktop: sidebar is collapsed to icon-only strip */
  desktopCollapsed: boolean;
  onDesktopToggle: () => void;
}

const NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Live Matches", path: "/live-matches", icon: Zap, badge: "LIVE" },
  { label: "Match Schedule", path: "/schedule", icon: Calendar },
  { label: "Leaderboard", path: "/leaderboard", icon: Trophy },
  { label: "Medal Tally", path: "/medal-tally", icon: Medal },
  { label: "Reports", path: "/reports", icon: BarChart2 },
  { label: "Settings", path: "/settings", icon: Settings },
];

export function Sidebar({
  mobileOpen,
  onMobileClose,
  desktopCollapsed,
  onDesktopToggle,
}: SidebarProps) {
  const [sportsExpanded, setSportsExpanded] = useState(true);
  const { location } = useRouterState();
  const pathname = location.pathname;

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <>
      {/*
       * MOBILE sidebar: fixed overlay that slides in from the left.
       * Hidden on desktop (lg:hidden).
       */}
      <aside
        data-ocid="sidebar.mobile"
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-[#F8FAFC] dark:bg-card border-r border-border transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo row */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/assets/DSSL-logo.png"
              alt="DSSL Logo"
              className="h-9 w-auto object-contain flex-shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-[13px] text-foreground leading-tight truncate">
                DSSL
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight truncate">
                Sports Manager
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <ScrollableNav collapsed={false}>
          <SidebarNav
            collapsed={false}
            pathname={pathname}
            isActive={isActive}
            sportsExpanded={sportsExpanded}
            onSportsToggle={() => setSportsExpanded((v) => !v)}
            onNavClick={onMobileClose}
          />
        </ScrollableNav>

        <div className="px-4 py-3 border-t border-border flex-shrink-0">
          <p className="text-[11px] text-muted-foreground text-center">
            © {new Date().getFullYear()} DSSL
          </p>
        </div>
      </aside>

      {/*
       * DESKTOP sidebar: static flex element that takes up real layout space.
       * Hidden on mobile (hidden lg:flex).
       * Expands/collapses via desktopCollapsed state.
       */}
      <aside
        data-ocid="sidebar.desktop"
        className={cn(
          "hidden lg:flex flex-col flex-shrink-0 bg-[#F8FAFC] dark:bg-card border-r border-border transition-all duration-300 ease-in-out overflow-hidden",
          desktopCollapsed ? "w-16" : "w-64",
        )}
      >
        {/* Logo row + collapse toggle */}
        <div className="flex items-center h-16 border-b border-border bg-card flex-shrink-0 px-3">
          {!desktopCollapsed && (
            <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-1">
              <img
                src="/assets/DSSL-logo.png"
                alt="DSSL Logo"
                className="h-9 w-auto object-contain flex-shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="font-display font-bold text-[13px] text-foreground leading-tight truncate">
                  DSSL
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight truncate">
                  Sports Manager
                </span>
              </div>
            </div>
          )}
          {desktopCollapsed && (
            <div className="flex justify-center w-full">
              <img
                src="/assets/DSSL-logo.png"
                alt="DSSL Logo"
                className="h-8 w-8 object-contain flex-shrink-0"
              />
            </div>
          )}
          {/* Collapse / expand toggle */}
          <button
            type="button"
            onClick={onDesktopToggle}
            data-ocid="sidebar.collapse_toggle.button"
            aria-label={
              desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            className={cn(
              "flex-shrink-0 p-1.5 rounded-lg transition-colors",
              "text-[#003E8A] dark:text-[#ffbc01] hover:bg-[#003E8A]/10 dark:hover:bg-[#ffbc01]/10",
              desktopCollapsed && "w-full justify-center flex",
              !desktopCollapsed && "ml-auto",
            )}
          >
            <ChevronLeft
              className={cn(
                "w-4 h-4 transition-transform duration-300",
                desktopCollapsed && "rotate-180",
              )}
            />
          </button>
        </div>

        <ScrollableNav collapsed={desktopCollapsed}>
          <SidebarNav
            collapsed={desktopCollapsed}
            pathname={pathname}
            isActive={isActive}
            sportsExpanded={sportsExpanded}
            onSportsToggle={() => setSportsExpanded((v) => !v)}
            onNavClick={() => {}}
          />
        </ScrollableNav>

        <div
          className={cn(
            "py-3 border-t border-border flex-shrink-0",
            desktopCollapsed ? "px-2" : "px-4",
          )}
        >
          {!desktopCollapsed && (
            <p className="text-[11px] text-muted-foreground text-center">
              © {new Date().getFullYear()} DSSL
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

// ─── Scrollable nav wrapper with up/down arrow buttons ──────────────────────

function ScrollableNav({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (amount: number) => {
    // Radix ScrollArea renders a [data-radix-scroll-area-viewport] div
    const viewport = scrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement | null;
    if (viewport) {
      viewport.scrollBy({ top: amount, behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 py-2 gap-1">
      {/* Scroll UP button */}
      <ScrollArrow
        direction="up"
        collapsed={collapsed}
        onClick={() => scrollBy(-SCROLL_STEP)}
      />

      {/* Scrollable nav area */}
      <div ref={scrollRef} className="flex-1 min-h-0">
        <ScrollArea className="h-full py-1">{children}</ScrollArea>
      </div>

      {/* Scroll DOWN button */}
      <ScrollArrow
        direction="down"
        collapsed={collapsed}
        onClick={() => scrollBy(SCROLL_STEP)}
      />
    </div>
  );
}

// ─── Shared nav content ───────────────────────────────────────────────────────

interface SidebarNavProps {
  collapsed: boolean;
  pathname: string;
  isActive: (path: string) => boolean;
  sportsExpanded: boolean;
  onSportsToggle: () => void;
  onNavClick: () => void;
}

function SidebarNav({
  collapsed,
  pathname,
  isActive,
  sportsExpanded,
  onSportsToggle,
  onNavClick,
}: SidebarNavProps) {
  return (
    <>
      {/* Main nav */}
      <nav
        className={cn("space-y-0.5", collapsed ? "px-2" : "px-3")}
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path as string}
              onClick={onNavClick}
              data-ocid={`nav.${item.label.toLowerCase().replace(/\s+/g, "-")}.link`}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
                collapsed ? "px-0 justify-center" : "px-3",
                active
                  ? "bg-[#003E8A] text-white shadow-sm"
                  : "text-muted-foreground hover:bg-[#E6F0FF] dark:hover:bg-primary/10 hover:text-foreground",
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <Badge
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-4 font-semibold",
                        active
                          ? "bg-white/20 text-white border-white/30"
                          : "bg-red-500/10 text-red-600 border-red-200",
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );
        })}
        <a
          href="/admin/index.html"
          title={collapsed ? "Admin Portal" : undefined}
          className={cn(
            "flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 mt-4",
            collapsed ? "px-0 justify-center" : "px-3",
            "text-[#003E8A] bg-[#003E8A]/10 border border-[#003E8A]/20 hover:bg-[#003E8A] hover:text-white"
          )}
        >
          <ChevronLeft className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="flex-1 truncate">Admin Portal</span>}
        </a>
      </nav>

      <Separator className={cn("my-3", collapsed ? "mx-2" : "mx-3")} />

      {/* Sports section */}
      <div className={cn(collapsed ? "px-2" : "px-3")}>
        {!collapsed && (
          <button
            type="button"
            onClick={onSportsToggle}
            data-ocid="sports.section.toggle"
            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            {sportsExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            All Sports
          </button>
        )}

        {(sportsExpanded || collapsed) && (
          <nav className="space-y-0.5 mt-1" aria-label="Sports navigation">
            {SPORTS.map((sport) => {
              const sportPath = `/sports/${sport.id}`;
              const active = pathname === sportPath;
              return (
                <Link
                  key={sport.id}
                  to="/sports/$sportId"
                  params={{ sportId: String(sport.id) } as { sportId: string }}
                  onClick={onNavClick}
                  data-ocid={`sports.${sport.slug}.link`}
                  title={collapsed ? sport.name : undefined}
                  className={cn(
                    "flex items-center gap-2.5 py-1.5 rounded-lg text-sm transition-colors duration-150",
                    collapsed ? "px-0 justify-center" : "px-3",
                    active
                      ? "bg-[#003E8A] text-white"
                      : "text-muted-foreground hover:bg-[#E6F0FF] dark:hover:bg-primary/10 hover:text-foreground",
                  )}
                >
                  <span className="text-base leading-none flex-shrink-0">
                    {sport.icon}
                  </span>
                  {!collapsed && (
                    <span className="truncate text-[13px]">{sport.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </>
  );
}
