import { DalAvatar } from "@/components/DalAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  useCreateMatch,
  useGetMatchStats,
  useGetRecentMatches,
  useGetUpcomingMatches,
} from "@/hooks/useQueries";
import { DALS, SPORTS } from "@/store";
import type { CreateMatchInput } from "@/types";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  MapPin,
  PlusCircle,
  Trash2,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";

// ── Upcoming Match Card ──────────────────────────────────────────────────────
function formatMatchTime(ts: number): string {
  const diff = ts - Date.now();
  if (diff <= 0) return "Soon";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `In ${d}d`;
  }
  if (h > 0) return `In ${h}h ${m}m`;
  return `In ${m}m`;
}

interface UpcomingMatchCardProps {
  match: {
    id: string;
    sportId: number;
    dalAId: number;
    dalBId: number;
    venue: string;
    startTime?: number;
    status: string;
  };
  index: number;
  getDalName: (id: number) => string;
  getSportName: (id: number) => string;
  getSportIcon: (id: number) => string;
  onNavigate: (sportId: number) => void;
}

function UpcomingMatchCard({
  match: m,
  index: i,
  getDalName,
  getSportName,
  getSportIcon,
  onNavigate,
}: UpcomingMatchCardProps) {
  const dalA = DALS.find((d) => d.id === m.dalAId);
  const dalB = DALS.find((d) => d.id === m.dalBId);

  return (
    <div
      data-ocid={`dashboard.upcoming.item.${i + 1}`}
      className="group relative rounded-xl border border-border bg-card hover:bg-[#E6F0FF] hover:border-[#003E8A]/20 transition-all duration-150"
    >
      {/* Clickable area — navigate to sport */}
      <div
        className="p-3.5 cursor-pointer"
        onClick={() => onNavigate(m.sportId)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onNavigate(m.sportId);
        }}
        role="presentation"
      >
        {/* Top row: sport badge + time */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] leading-none">
              {getSportIcon(m.sportId)}
            </span>
            <span className="text-[11px] font-semibold text-[#003E8A] bg-[#003E8A]/8 px-2 py-0.5 rounded-full">
              {getSportName(m.sportId)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {m.startTime && (
              <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                {formatMatchTime(m.startTime)}
              </span>
            )}
            <Badge
              variant="outline"
              className="text-[10px] border-border bg-muted/40 text-muted-foreground h-5 px-2"
            >
              Upcoming
            </Badge>
          </div>
        </div>

        {/* Dal matchup */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dal A */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {dalA && <DalAvatar dal={dalA} size={28} />}
            <span className="text-[13px] font-semibold text-foreground truncate">
              {getDalName(m.dalAId)}
            </span>
          </div>

          {/* VS divider */}
          <div className="shrink-0 flex flex-col items-center">
            <span className="text-[10px] font-black text-muted-foreground/60 tracking-widest leading-none">
              VS
            </span>
          </div>

          {/* Dal B */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
            <span className="text-[13px] font-semibold text-foreground truncate text-right">
              {getDalName(m.dalBId)}
            </span>
            {dalB && <DalAvatar dal={dalB} size={28} />}
          </div>
        </div>

        {/* Venue */}
        <div className="flex items-center gap-1 mt-2.5">
          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-[11px] text-muted-foreground truncate">
            {m.venue}
          </span>
        </div>
      </div>
    </div>
  );
}

const VENUES = ["R&D ground", "Vidyapeeth", "Shriram ground", "Sanghamitra ground", "Gym Hall"];

export function DashboardPage() {
  const { data: stats } = useGetMatchStats();
  const { data: upcomingMatches = [] } = useGetUpcomingMatches(10n);
  const { data: recentMatches = [] } = useGetRecentMatches(5n);
  const createMatchMutation = useCreateMatch();

  const liveCount = stats?.live ?? 0;
  const todayCount = stats?.todayCount ?? 0;

  const [form, setForm] = useState<Partial<CreateMatchInput>>({
    sportId: undefined,
    dalAId: undefined,
    dalBId: undefined,
    venue: "",
    duration: 60,
  });
  const [isLive, setIsLive] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (!form.sportId || !form.dalAId || !form.dalBId || !form.venue) return;
    createMatchMutation.mutate(
      { ...form, isLive } as CreateMatchInput & { isLive: boolean },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
          setForm({
            sportId: undefined,
            dalAId: undefined,
            dalBId: undefined,
            venue: "",
            duration: 60,
          });
          setIsLive(false);
        },
      },
    );
  }

  const navigate = useNavigate();

  const getDalName = (id: number) =>
    DALS.find((d) => d.id === id)?.name ?? `Dal ${id}`;
  const getSportName = (id: number) =>
    SPORTS.find((s) => s.id === id)?.name ?? `Sport ${id}`;
  const getSportIcon = (id: number) =>
    SPORTS.find((s) => s.id === id)?.icon ?? "🏅";

  function handleNavigateToSport(sportId: number) {
    navigate({ to: "/sports/$sportId", params: { sportId: String(sportId) } });
  }

  const QUICK_STATS = [
    {
      label: "Live Matches",
      value: liveCount,
      icon: Zap,
      color: "text-red-500",
      bg: "bg-red-50",
      border: "border-red-100",
    },
    {
      label: "Total Sports",
      value: 17,
      icon: Trophy,
      color: "text-[#003E8A]",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "Total Dals",
      value: 7,
      icon: Users,
      color: "text-[#ffbc01]",
      bg: "bg-yellow-50",
      border: "border-yellow-100",
    },
    {
      label: "Today's Matches",
      value: todayCount,
      icon: Calendar,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl" data-ocid="dashboard.page">
      {/* Quick Stats */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        data-ocid="dashboard.stats.section"
      >
        {QUICK_STATS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              data-ocid={`dashboard.stat.item.${i + 1}`}
              className={`border ${stat.border} shadow-xs`}
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-muted-foreground mb-1">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-display font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}
                  >
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Quick Match Setup */}
        <Card
          className="lg:col-span-3 shadow-xs border-border"
          data-ocid="dashboard.match_setup.card"
        >
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-[15px] font-display font-semibold">
              <PlusCircle className="w-4.5 h-4.5 text-[#003E8A]" />
              Quick Match Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Sport
                </Label>
                <Select
                  value={form.sportId ? String(form.sportId) : ""}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      sportId: Number(v) as CreateMatchInput["sportId"],
                    }))
                  }
                >
                  <SelectTrigger
                    data-ocid="dashboard.sport.select"
                    className="h-9"
                  >
                    <SelectValue placeholder="Select sport..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {SPORTS.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.icon} {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Dal A
                </Label>
                <Select
                  value={form.dalAId ? String(form.dalAId) : ""}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, dalAId: Number(v) }))
                  }
                >
                  <SelectTrigger
                    data-ocid="dashboard.dal_a.select"
                    className="h-9"
                  >
                    <SelectValue placeholder="Dal A..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DALS.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        <span className="flex items-center gap-2">
                          <DalAvatar dal={d} size={18} />
                          {d.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Dal B
                </Label>
                <Select
                  value={form.dalBId ? String(form.dalBId) : ""}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, dalBId: Number(v) }))
                  }
                >
                  <SelectTrigger
                    data-ocid="dashboard.dal_b.select"
                    className="h-9"
                  >
                    <SelectValue placeholder="Dal B..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DALS.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        <span className="flex items-center gap-2">
                          <DalAvatar dal={d} size={18} />
                          {d.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Venue
                </Label>
                <Select
                  value={form.venue ?? ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, venue: v }))}
                >
                  <SelectTrigger
                    data-ocid="dashboard.venue.select"
                    className="h-9"
                  >
                    <SelectValue placeholder="Select venue..." />
                  </SelectTrigger>
                  <SelectContent>
                    {VENUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Duration (min)
                </Label>
                <Input
                  type="number"
                  min={10}
                  max={180}
                  value={form.duration ?? 60}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, duration: Number(e.target.value) }))
                  }
                  data-ocid="dashboard.duration.input"
                  className="h-9"
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={isLive}
                  onCheckedChange={setIsLive}
                  data-ocid="dashboard.live_toggle.switch"
                  id="live-toggle"
                />
                <Label
                  htmlFor="live-toggle"
                  className="text-sm font-medium cursor-pointer"
                >
                  Start as Live
                </Label>
                {isLive && (
                  <Badge className="bg-red-100 text-red-600 border-red-200 text-[10px]">
                    LIVE
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                onClick={handleSave}
                data-ocid="dashboard.save_match.submit_button"
                disabled={
                  !form.sportId ||
                  !form.dalAId ||
                  !form.dalBId ||
                  !form.venue ||
                  createMatchMutation.isPending
                }
                className="bg-[#003E8A] hover:bg-[#003D9A] text-white font-semibold px-5 h-9"
              >
                {createMatchMutation.isPending
                  ? "Saving..."
                  : saved
                    ? "✓ Saved!"
                    : "Save Match"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Matches Feed */}
        <Card
          className="col-span-full lg:col-span-2 shadow-xs border-border"
          data-ocid="dashboard.upcoming.card"
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-[15px] font-display font-semibold">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#003E8A]" />
                Upcoming Matches
                {upcomingMatches.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#003E8A]/10 text-[#003E8A] text-[11px] font-semibold">
                    {upcomingMatches.length}
                  </span>
                )}
              </span>
              <Link
                to={"/schedule" as string}
                className="text-[12px] font-normal text-[#003E8A] hover:underline transition-opacity hover:opacity-80"
                data-ocid="dashboard.upcoming.view_all.link"
              >
                View all
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            {upcomingMatches.length === 0 ? (
              <div
                data-ocid="dashboard.upcoming.empty_state"
                className="flex flex-col items-center justify-center py-12 gap-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    No upcoming matches
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Schedule a match using the form above
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="space-y-2.5 overflow-y-auto pr-0.5"
                style={{ maxHeight: "400px" }}
                data-ocid="dashboard.upcoming.feed"
              >
                {upcomingMatches.map((m, i) => (
                  <UpcomingMatchCard
                    key={m.id}
                    match={m}
                    index={i}
                    getDalName={getDalName}
                    getSportName={getSportName}
                    getSportIcon={getSportIcon}
                    onNavigate={handleNavigateToSport}
                  />
                ))}
              </div>
            )}
            {upcomingMatches.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/60">
                <Link
                  to={"/schedule" as string}
                  className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#003E8A] hover:text-[#003D9A] transition-colors py-1"
                  data-ocid="dashboard.upcoming.schedule_link"
                >
                  View Full Schedule →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Matches */}
      <Card
        className="shadow-xs border-border"
        data-ocid="dashboard.recent_matches.card"
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-[15px] font-display font-semibold">
            <span>Recent Matches</span>
            <Link
              to={"/reports" as string}
              className="text-[12px] font-normal text-[#003E8A] hover:underline"
            >
              View all
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentMatches.length === 0 ? (
            <div
              data-ocid="dashboard.recent_matches.empty_state"
              className="text-center py-10"
            >
              <p className="text-sm text-muted-foreground">
                No completed matches yet
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full"
                data-ocid="dashboard.recent_matches.table"
              >
                <thead>
                  <tr className="border-b border-border">
                    {["Sport", "Match", "Score", "Venue", "Status"].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentMatches.map((m, i) => (
                    <tr
                      key={m.id}
                      data-ocid={`dashboard.recent_matches.row.${i + 1}`}
                      className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span className="text-base mr-1.5">
                          {getSportIcon(m.sportId)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {getSportName(m.sportId)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-foreground">
                        {getDalName(m.dalAId)} vs {getDalName(m.dalBId)}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-display font-bold text-sm text-foreground">
                          {m.scoreA} – {m.scoreB}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {m.venue}
                      </td>
                      <td className="px-5 py-3">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">
                          Completed
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
