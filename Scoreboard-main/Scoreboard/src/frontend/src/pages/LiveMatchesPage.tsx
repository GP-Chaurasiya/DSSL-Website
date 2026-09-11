import { DalAvatar } from "@/components/DalAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useCompleteMatch,
  useDecrementScoreA,
  useDecrementScoreB,
  useGetLiveMatches,
  useIncrementScoreA,
  useIncrementScoreB,
  usePauseMatch,
  useResetMatch,
  useSetMatchLive,
  useStartMatch,
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { DALS, SPORTS, useTimerStore } from "@/store";
import { useNavigate } from "@tanstack/react-router";
import { Minus, Pause, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function LiveMatchesPage() {
  const navigate = useNavigate();
  const { data: liveMatches = [], isLoading } = useGetLiveMatches();
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null);

  const incrementA = useIncrementScoreA();
  const decrementA = useDecrementScoreA();
  const incrementB = useIncrementScoreB();
  const decrementB = useDecrementScoreB();
  const completeMatch = useCompleteMatch();
  const pauseMatch = usePauseMatch();
  const startMatch = useStartMatch();
  const resetMatch = useResetMatch();
  const _setMatchLive = useSetMatchLive();

  const { elapsedSeconds, isRunning, start, pause, reset } = useTimerStore();

  const activeMatch =
    liveMatches.find((m) => m.id === liveMatchId) ?? liveMatches[0];

  useEffect(() => {
    if (activeMatch && !isRunning) start();
    return () => {
      if (!activeMatch) reset();
    };
  }, [activeMatch, isRunning, start, reset]);

  const getDal = (id: number) => DALS.find((d) => d.id === id)!;
  const getSport = (id: number) => SPORTS.find((s) => s.id === id)!;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003E8A]" />
      </div>
    );
  }

  if (liveMatches.length === 0) {
    return (
      <div
        data-ocid="live_matches.empty_state"
        className="flex flex-col items-center justify-center h-64 gap-4"
      >
        <span className="text-5xl">🎽</span>
        <p className="text-lg font-display font-semibold text-foreground">
          No live matches right now
        </p>
        <p className="text-sm text-muted-foreground">
          Create and start a match from the Dashboard
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl" data-ocid="live_matches.page">
      {/* Match selector tabs */}
      {liveMatches.length > 1 && (
        <div className="flex gap-2 flex-wrap" data-ocid="live_matches.selector">
          {liveMatches.map((m, idx) => (
            <div key={m.id} className="flex items-center gap-0.5 group">
              <button
                type="button"
                onClick={() => {
                  setLiveMatchId(m.id);
                  navigate({
                    to: "/sports/$sportId",
                    params: { sportId: String(m.sportId) },
                  });
                }}
                data-ocid={`live_matches.tab.${idx + 1}`}
                className={cn(
                  "px-4 py-2 rounded-l-xl text-sm font-medium transition-colors",
                  activeMatch?.id === m.id
                    ? "bg-[#003E8A] text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/60",
                )}
              >
                {getSport(m.sportId).icon} {getDal(m.dalAId).name} vs{" "}
                {getDal(m.dalBId).name}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetMatch.mutate(m.id);
                  reset();
                  const remaining = liveMatches.filter((lm) => lm.id !== m.id);
                  if (remaining.length > 0) {
                    setLiveMatchId(remaining[0].id);
                  } else {
                    setLiveMatchId(null);
                  }
                }}
                data-ocid={`live_matches.tab.delete_button.${idx + 1}`}
                aria-label="Remove match"
                className={cn(
                  "px-2 py-2 rounded-r-xl text-sm transition-colors hover:bg-red-100 hover:text-red-500",
                  activeMatch?.id === m.id
                    ? "bg-[#003E8A]/80 text-white/80 hover:bg-red-500 hover:text-white"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeMatch && (
        <Card
          className="shadow-sm border-border cursor-pointer group/card hover:border-[#003E8A]/30 transition-colors"
          data-ocid="live_matches.scoreboard.card"
          onClick={(e) => {
            // Don't navigate if clicking a button/interactive element
            if ((e.target as HTMLElement).closest("button")) return;
            navigate({
              to: "/sports/$sportId",
              params: { sportId: String(activeMatch.sportId) },
            });
          }}
        >
          <CardHeader className="pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-lg">
                {getSport(activeMatch.sportId).icon}{" "}
                {getSport(activeMatch.sportId).name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 text-red-600 border-red-200 animate-pulse">
                  ● LIVE
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {activeMatch.venue}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-8 pb-8">
            {/* Timer */}
            <div className="text-center mb-10">
              <div
                data-ocid="live_matches.timer"
                className="text-5xl font-display font-bold text-foreground tracking-tight mb-1"
              >
                {formatTime(elapsedSeconds)}
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {isRunning ? "Running" : "Paused"}
              </p>
            </div>

            {/* Scoreboard */}
            <div className="grid grid-cols-3 gap-6 items-center mb-10">
              {/* Dal A */}
              <div className="text-center" data-ocid="live_matches.dal_a.panel">
                <div className="flex justify-center mb-3">
                  <DalAvatar dal={getDal(activeMatch.dalAId)} size={64} />
                </div>
                <p className="font-display font-semibold text-foreground text-sm mb-4">
                  {getDal(activeMatch.dalAId).name}
                </p>
                <div className="text-6xl font-display font-bold text-foreground mb-5">
                  {activeMatch.scoreA}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => decrementA.mutate(activeMatch.id)}
                    data-ocid="live_matches.dal_a.minus_button"
                    variant="outline"
                    className="w-10 h-10 rounded-xl hover:bg-muted"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => incrementA.mutate(activeMatch.id)}
                    data-ocid="live_matches.dal_a.plus_button"
                    className="w-10 h-10 rounded-xl bg-[#003E8A] hover:bg-[#003D9A] text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* VS */}
              <div className="text-center">
                <div className="text-3xl font-display font-bold text-muted-foreground">
                  vs
                </div>
              </div>

              {/* Dal B */}
              <div className="text-center" data-ocid="live_matches.dal_b.panel">
                <div className="flex justify-center mb-3">
                  <DalAvatar dal={getDal(activeMatch.dalBId)} size={64} />
                </div>
                <p className="font-display font-semibold text-foreground text-sm mb-4">
                  {getDal(activeMatch.dalBId).name}
                </p>
                <div className="text-6xl font-display font-bold text-foreground mb-5">
                  {activeMatch.scoreB}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => decrementB.mutate(activeMatch.id)}
                    data-ocid="live_matches.dal_b.minus_button"
                    variant="outline"
                    className="w-10 h-10 rounded-xl hover:bg-muted"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => incrementB.mutate(activeMatch.id)}
                    data-ocid="live_matches.dal_b.plus_button"
                    className="w-10 h-10 rounded-xl bg-[#003E8A] hover:bg-[#003D9A] text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Match controls */}
            <div
              className="flex items-center justify-center gap-3 flex-wrap"
              data-ocid="live_matches.controls"
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  resetMatch.mutate(activeMatch.id);
                }}
                data-ocid="live_matches.reset.button"
                className="px-5 rounded-xl h-10"
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Reset
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (isRunning) {
                    pause();
                    pauseMatch.mutate(activeMatch.id);
                  } else {
                    start();
                    startMatch.mutate(activeMatch.id);
                  }
                }}
                data-ocid="live_matches.play_pause.button"
                className="px-6 rounded-xl h-10 bg-[#003E8A] hover:bg-[#003D9A] text-white font-semibold"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  completeMatch.mutate(activeMatch.id);
                  pause();
                }}
                data-ocid="live_matches.end_match.button"
                className="px-5 rounded-xl h-10 text-destructive hover:bg-destructive/10"
              >
                End Match
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigate({
                    to: "/sports/$sportId",
                    params: { sportId: String(activeMatch.sportId) },
                  });
                }}
                data-ocid="live_matches.view_scoreboard.button"
                className="px-5 rounded-xl h-10 text-[#003E8A] border-[#003E8A]/30 hover:bg-[#E6F0FF]"
              >
                View Scoreboard
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetMatch.mutate(activeMatch.id);
                  reset();
                  const remaining = liveMatches.filter(
                    (m) => m.id !== activeMatch.id,
                  );
                  if (remaining.length > 0) {
                    setLiveMatchId(remaining[0].id);
                  } else {
                    setLiveMatchId(null);
                  }
                }}
                data-ocid="live_matches.remove_match.delete_button"
                className="px-5 rounded-xl h-10 text-red-500 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
