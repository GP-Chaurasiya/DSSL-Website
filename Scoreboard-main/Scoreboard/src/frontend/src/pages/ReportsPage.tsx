import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetAllMatches } from "@/hooks/useQueries";
import { DALS, SPORTS } from "@/store";
import { BarChart2 } from "lucide-react";

export function ReportsPage() {
  const { data: matches = [], isLoading } = useGetAllMatches();
  const completed = matches.filter((m) => m.status === "completed");

  // Sport-wise stats
  const sportStats = SPORTS.map((sport) => {
    const sm = completed.filter((m) => m.sportId === sport.id);
    return { sport, count: sm.length, matches: sm };
  }).filter((s) => s.count > 0);

  return (
    <div className="space-y-5 max-w-4xl" data-ocid="reports.page">
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger data-ocid="reports.history.tab" value="history">
            Match History
          </TabsTrigger>
          <TabsTrigger data-ocid="reports.sports.tab" value="sports">
            Sport-wise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          <Card className="shadow-xs border-border">
            <CardHeader>
              <CardTitle className="text-[15px] font-display">
                Full Match History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003E8A]" />
                </div>
              ) : completed.length === 0 ? (
                <div
                  data-ocid="reports.history.empty_state"
                  className="text-center py-12"
                >
                  <BarChart2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No completed matches yet
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" data-ocid="reports.history.table">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {["#", "Sport", "Match", "Score", "Venue"].map((h) => (
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
                      {completed.map((m, i) => {
                        const sport = SPORTS.find((s) => s.id === m.sportId)!;
                        const dalA = DALS.find((d) => d.id === m.dalAId)!;
                        const dalB = DALS.find((d) => d.id === m.dalBId)!;
                        const winner =
                          m.scoreA > m.scoreB
                            ? dalA
                            : m.scoreB > m.scoreA
                              ? dalB
                              : null;
                        return (
                          <tr
                            key={m.id}
                            data-ocid={`reports.history.row.${i + 1}`}
                            className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-5 py-3.5 text-sm text-muted-foreground">
                              #{i + 1}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="mr-1.5">{sport.icon}</span>
                              <span className="text-sm text-muted-foreground">
                                {sport.name}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="text-sm font-medium text-foreground">
                                {dalA.name} vs {dalB.name}
                              </p>
                              {winner && (
                                <p className="text-[11px] text-emerald-600">
                                  Winner: {winner.name}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-3.5 font-display font-bold text-sm">
                              {m.scoreA} – {m.scoreB}
                            </td>
                            <td className="px-5 py-3.5 text-sm text-muted-foreground">
                              {m.venue}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sports" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003E8A]" />
            </div>
          ) : sportStats.length === 0 ? (
            <div
              data-ocid="reports.sports.empty_state"
              className="text-center py-12"
            >
              <BarChart2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No data yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sportStats.map((ss, i) => (
                <Card
                  key={ss.sport.id}
                  data-ocid={`reports.sport.card.${i + 1}`}
                  className="shadow-xs border-border"
                >
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{ss.sport.icon}</span>
                      <div>
                        <p className="font-display font-semibold text-sm text-foreground">
                          {ss.sport.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ss.count} matches played
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {ss.matches.map((m) => {
                        const dA = DALS.find((d) => d.id === m.dalAId)!;
                        const dB = DALS.find((d) => d.id === m.dalBId)!;
                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-muted-foreground">
                              {dA.name} vs {dB.name}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {m.scoreA}–{m.scoreB}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
