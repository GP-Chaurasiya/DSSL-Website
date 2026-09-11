import { DalAvatar } from "@/components/DalAvatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetLeaderboard } from "@/hooks/useQueries";
import { DALS } from "@/store";
import { Trophy } from "lucide-react";

const MEDAL_ICONS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function LeaderboardPage() {
  const { data: entries = [], isLoading } = useGetLeaderboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003E8A]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl" data-ocid="leaderboard.page">
      <Card className="shadow-xs border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-[15px]">
            <Trophy className="w-4 h-4 text-[#ffbc01]" />
            Dal Rankings — Points Table
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" data-ocid="leaderboard.table">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["#", "Dal", "P", "W", "D", "L", "Pts", "Win%"].map((h) => (
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
                {entries.map((e, i) => {
                  const dal = DALS.find((d) => d.id === e.dalId)!;
                  return (
                    <tr
                      key={e.dalId}
                      data-ocid={`leaderboard.row.${i + 1}`}
                      className={`border-b border-border/60 hover:bg-muted/30 transition-colors ${
                        i === 0 ? "bg-yellow-50/60" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5 font-display font-bold text-sm">
                        {MEDAL_ICONS[e.rank] ?? `#${e.rank}`}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <DalAvatar dal={dal} size={40} />
                          <span className="font-medium text-sm text-foreground">
                            {e.dalName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground text-right">
                        {e.matchesPlayed}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-emerald-600 text-right">
                        {e.wins}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground text-right">
                        {e.draws}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-red-500 text-right">
                        {e.losses}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge className="bg-[#003E8A]/10 text-[#003E8A] border-[#003E8A]/20 font-bold">
                          {e.points}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground text-right">
                        {e.winPercentage}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
