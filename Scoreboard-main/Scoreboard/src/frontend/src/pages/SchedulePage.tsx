import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetAllMatches } from "@/hooks/useQueries";
import { DALS, SPORTS } from "@/store";
import { Calendar } from "lucide-react";
import { useState } from "react";

function MatchCard({
  match,
  index,
}: {
  match: {
    id: string;
    sportId: number;
    dalAId: number;
    dalBId: number;
    venue: string;
    scoreA: number;
    scoreB: number;
    status: string;
  };
  index: number;
}) {
  const dalA = DALS.find((d) => d.id === match.dalAId)!;
  const dalB = DALS.find((d) => d.id === match.dalBId)!;
  const sport = SPORTS.find((s) => s.id === match.sportId)!;

  const statusStyles: Record<string, string> = {
    live: "bg-red-100 text-red-600 border-red-200",
    upcoming: "bg-blue-50 text-[#003E8A] border-blue-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paused: "bg-yellow-50 text-yellow-700 border-yellow-200",
  };

  return (
    <div
      data-ocid={`schedule.match.item.${index}`}
      className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-xs transition-shadow"
    >
      <span className="text-2xl">{sport.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-foreground text-sm">
          {dalA.name} vs {dalB.name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {sport.name} · {match.venue}
        </p>
      </div>
      {match.status === "completed" && (
        <div className="text-center">
          <p className="font-display font-bold text-foreground">
            {match.scoreA} – {match.scoreB}
          </p>
          <p className="text-[10px] text-muted-foreground">Final</p>
        </div>
      )}
      <Badge className={`text-[11px] ${statusStyles[match.status] ?? ""}`}>
        {match.status === "live"
          ? "● LIVE"
          : match.status.charAt(0).toUpperCase() + match.status.slice(1)}
      </Badge>
    </div>
  );
}

export function SchedulePage() {
  const { data: matches = [], isLoading } = useGetAllMatches();
  const [tab, setTab] = useState("all");

  const filtered =
    tab === "all" ? matches : matches.filter((m) => m.status === tab);

  return (
    <div className="space-y-5 max-w-3xl" data-ocid="schedule.page">
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 font-display text-[15px]">
            <Calendar className="w-4 h-4 text-[#003E8A]" />
            Match Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-5">
              <TabsTrigger data-ocid="schedule.all.tab" value="all">
                All ({matches.length})
              </TabsTrigger>
              <TabsTrigger data-ocid="schedule.live.tab" value="live">
                Live
              </TabsTrigger>
              <TabsTrigger data-ocid="schedule.upcoming.tab" value="upcoming">
                Upcoming
              </TabsTrigger>
              <TabsTrigger data-ocid="schedule.completed.tab" value="completed">
                Completed
              </TabsTrigger>
            </TabsList>
            <TabsContent value={tab}>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003E8A]" />
                </div>
              ) : filtered.length === 0 ? (
                <div
                  data-ocid="schedule.empty_state"
                  className="text-center py-12"
                >
                  <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No matches in this category
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((m, i) => (
                    <MatchCard key={m.id} match={m} index={i + 1} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
