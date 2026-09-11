import { DalAvatar } from "@/components/DalAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  useCompleteMatch,
  useCreateMatch,
  useDecrementScoreA,
  useDecrementScoreB,
  useGetMatchesBySport,
  useIncrementScoreA,
  useIncrementScoreB,
  usePauseMatch,
  useResetMatch,
  useStartMatch,
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { DALS, SPORTS, useTimerStore } from "@/store";
import type { CreateMatchInput } from "@/types";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  MapPin,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useState } from "react";

const VENUES = ["R&D ground", "Vidyapeeth", "Shriram ground", "Sanghamitra ground", "Gym Hall"];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function SportScoreboardPage() {
  const { sportId } = useParams({ strict: false }) as { sportId: string };
  const sport = SPORTS.find((s) => s.id === Number(sportId));

  const navigate = useNavigate();
  const { data: sportMatches = [], isLoading } = useGetMatchesBySport(
    Number(sportId),
  );

  const createMatchMutation = useCreateMatch();
  const incrementA = useIncrementScoreA();
  const decrementA = useDecrementScoreA();
  const incrementB = useIncrementScoreB();
  const decrementB = useDecrementScoreB();
  const completeMatch = useCompleteMatch();
  const pauseMatch = usePauseMatch();
  const startMatch = useStartMatch();
  const resetMatch = useResetMatch();

  const { elapsedSeconds, isRunning, start, pause, reset } = useTimerStore();

  const liveMatch = sportMatches.find((m) => m.status === "live");
  const [activeMatchId, setActiveMatchId] = useState<string | null>(
    liveMatch?.id ?? null,
  );
  const activeMatch =
    sportMatches.find((m) => m.id === activeMatchId) ?? liveMatch;

  const [newMatch, setNewMatch] = useState<Partial<CreateMatchInput>>({
    sportId: Number(sportId) as CreateMatchInput["sportId"],
    venue: "",
    duration: 60,
  });
  const [showSetup, setShowSetup] = useState(!liveMatch);

  if (!sport) {
    return (
      <div
        className="text-center py-20"
        data-ocid="sport.not_found.error_state"
      >
        <p className="text-lg font-display font-semibold text-foreground">
          Sport not found
        </p>
      </div>
    );
  }

  function handleStartMatch() {
    if (!newMatch.dalAId || !newMatch.dalBId || !newMatch.venue) return;
    createMatchMutation.mutate(
      {
        ...newMatch,
        isLive: true,
      } as CreateMatchInput & { isLive: boolean },
      {
        onSuccess: (matchId) => {
          setActiveMatchId(matchId);
          setShowSetup(false);
          reset();
          start();
        },
      },
    );
  }

  const getDal = (id: number) => DALS.find((d) => d.id === id)!;
  const completed = sportMatches.filter((m) => m.status === "completed");

  return (
    <div className="space-y-6 max-w-4xl" data-ocid={`sport.${sport.slug}.page`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{sport.icon}</span>
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">
            {sport.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            Scoreboard & Match Control
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main scoreboard */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003E8A]" />
            </div>
          ) : activeMatch ? (
            <Card
              className="shadow-sm border-border"
              data-ocid="sport.scoreboard.card"
            >
              <CardHeader className="pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-[15px]">
                    Live Scoreboard
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {activeMatch.status === "live" && (
                      <Badge className="bg-red-100 text-red-600 border-red-200 animate-pulse">
                        ● LIVE
                      </Badge>
                    )}
                    {activeMatch.status === "completed" && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        Completed
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {activeMatch.venue}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-8 pb-8">
                {/* Timer */}
                <div className="text-center mb-8">
                  <div
                    data-ocid="sport.scoreboard.timer"
                    className="text-5xl font-display font-bold text-foreground tracking-tight"
                  >
                    {formatTime(elapsedSeconds)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
                    {isRunning
                      ? "Running"
                      : activeMatch.status === "completed"
                        ? "Finished"
                        : "Paused"}
                  </p>
                </div>

                {/* Score */}
                <div className="grid grid-cols-3 items-center gap-6 mb-8">
                  <div className="text-center" data-ocid="sport.dal_a.panel">
                    <div className="flex justify-center mb-2">
                      <DalAvatar dal={getDal(activeMatch.dalAId)} size={56} />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-4">
                      {getDal(activeMatch.dalAId).name}
                    </p>
                    <div className="text-5xl font-display font-bold text-foreground mb-4">
                      {activeMatch.scoreA}
                    </div>
                    {activeMatch.status === "live" && (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => decrementA.mutate(activeMatch.id)}
                          data-ocid="sport.dal_a.minus_button"
                          className="w-9 h-9 rounded-xl"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          onClick={() => incrementA.mutate(activeMatch.id)}
                          data-ocid="sport.dal_a.plus_button"
                          className="w-9 h-9 rounded-xl bg-[#003E8A] hover:bg-[#003D9A] text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <span className="text-2xl font-display font-bold text-muted-foreground">
                      vs
                    </span>
                  </div>

                  <div className="text-center" data-ocid="sport.dal_b.panel">
                    <div className="flex justify-center mb-2">
                      <DalAvatar dal={getDal(activeMatch.dalBId)} size={56} />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-4">
                      {getDal(activeMatch.dalBId).name}
                    </p>
                    <div className="text-5xl font-display font-bold text-foreground mb-4">
                      {activeMatch.scoreB}
                    </div>
                    {activeMatch.status === "live" && (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => decrementB.mutate(activeMatch.id)}
                          data-ocid="sport.dal_b.minus_button"
                          className="w-9 h-9 rounded-xl"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          onClick={() => incrementB.mutate(activeMatch.id)}
                          data-ocid="sport.dal_b.plus_button"
                          className="w-9 h-9 rounded-xl bg-[#003E8A] hover:bg-[#003D9A] text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {activeMatch.status === "live" && (
                  <>
                    <Separator className="mb-5" />
                    <div
                      className="flex items-center justify-center gap-2 flex-wrap"
                      data-ocid="sport.controls"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          reset();
                          resetMatch.mutate(activeMatch.id);
                        }}
                        data-ocid="sport.reset.button"
                        className="px-4 rounded-xl h-9 text-sm"
                      >
                        <RotateCcw className="w-4 h-4 mr-1.5" />
                        Reset
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
                        data-ocid="sport.play_pause.button"
                        className="px-5 rounded-xl h-9 bg-[#003E8A] hover:bg-[#003D9A] text-white font-semibold text-sm"
                      >
                        {isRunning ? (
                          <>
                            <Pause className="w-4 h-4 mr-1.5" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1.5" />
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
                        data-ocid="sport.end_match.button"
                        className="px-4 rounded-xl h-9 text-sm text-destructive hover:bg-destructive/10"
                      >
                        End Match
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          resetMatch.mutate(activeMatch.id);
                          pause();
                          reset();
                          setActiveMatchId(null);
                          setShowSetup(true);
                          navigate({ to: "/live-matches" });
                        }}
                        data-ocid="sport.remove_match.delete_button"
                        className="px-4 rounded-xl h-9 text-sm text-red-500 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Remove Match
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card
              className="shadow-xs border-dashed border-border"
              data-ocid="sport.scoreboard.empty_state"
            >
              <CardContent className="flex flex-col items-center justify-center py-16">
                <span className="text-5xl mb-4">{sport.icon}</span>
                <p className="font-display font-semibold text-foreground mb-1">
                  No active match
                </p>
                <p className="text-sm text-muted-foreground">
                  Create a new match using the panel
                </p>
              </CardContent>
            </Card>
          )}

          {/* Past matches */}
          {completed.length > 0 && (
            <Card className="shadow-xs border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-[14px] font-display font-semibold">
                  Past Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {completed.map((m, i) => (
                  <div
                    key={m.id}
                    data-ocid={`sport.past_result.item.${i + 1}`}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {getDal(m.dalAId).name} vs {getDal(m.dalBId).name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-sm">
                        {m.scoreA}–{m.scoreB}
                      </span>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                        Done
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Setup panel */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowSetup((v) => !v)}
            data-ocid="sport.setup_toggle.button"
            className={cn(
              "w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors",
              showSetup
                ? "bg-muted text-foreground"
                : "bg-[#003E8A] text-white hover:bg-[#003D9A]",
            )}
          >
            {showSetup ? "Hide Setup" : "+ New Match"}
          </button>

          {showSetup && (
            <Card
              className="shadow-xs border-border"
              data-ocid="sport.setup.card"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-[14px] font-display">
                  Match Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Dal A
                  </Label>
                  <Select
                    value={newMatch.dalAId ? String(newMatch.dalAId) : ""}
                    onValueChange={(v) =>
                      setNewMatch((f) => ({ ...f, dalAId: Number(v) }))
                    }
                  >
                    <SelectTrigger
                      data-ocid="sport.dal_a.select"
                      className="h-9"
                    >
                      <SelectValue placeholder="Select Dal A" />
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
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Dal B
                  </Label>
                  <Select
                    value={newMatch.dalBId ? String(newMatch.dalBId) : ""}
                    onValueChange={(v) =>
                      setNewMatch((f) => ({ ...f, dalBId: Number(v) }))
                    }
                  >
                    <SelectTrigger
                      data-ocid="sport.dal_b.select"
                      className="h-9"
                    >
                      <SelectValue placeholder="Select Dal B" />
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
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Venue
                  </Label>
                  <Select
                    value={newMatch.venue ?? ""}
                    onValueChange={(v) =>
                      setNewMatch((f) => ({ ...f, venue: v }))
                    }
                  >
                    <SelectTrigger
                      data-ocid="sport.venue.select"
                      className="h-9"
                    >
                      <SelectValue placeholder="Select venue" />
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
                <Button
                  type="button"
                  onClick={handleStartMatch}
                  data-ocid="sport.start_match.submit_button"
                  disabled={
                    !newMatch.dalAId ||
                    !newMatch.dalBId ||
                    !newMatch.venue ||
                    createMatchMutation.isPending
                  }
                  className="w-full bg-[#003E8A] hover:bg-[#003D9A] text-white font-semibold rounded-xl h-9"
                >
                  {createMatchMutation.isPending
                    ? "Starting..."
                    : "Start Match"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
