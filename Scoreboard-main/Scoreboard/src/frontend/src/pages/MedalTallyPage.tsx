import { DalAvatar } from "@/components/DalAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetMedalTally } from "@/hooks/useQueries";
import { DALS } from "@/store";
import { Medal } from "lucide-react";

export function MedalTallyPage() {
  const { data: entries = [], isLoading } = useGetMedalTally();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003E8A]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl" data-ocid="medal_tally.page">
      <Card className="shadow-xs border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-[15px]">
            <Medal className="w-4 h-4 text-[#ffbc01]" />
            Medal Tally
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" data-ocid="medal_tally.table">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {[
                    "#",
                    "Dal",
                    "🥇 Gold",
                    "🥈 Silver",
                    "🥉 Bronze",
                    "Total",
                  ].map((h) => (
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
                      data-ocid={`medal_tally.row.${i + 1}`}
                      className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-bold text-sm text-foreground">
                        #{e.rank}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <DalAvatar dal={dal} size={40} />
                          <span className="font-medium text-sm text-foreground">
                            {e.dalName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-display font-bold text-yellow-600 text-lg">
                          {e.gold}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-display font-bold text-slate-400 text-lg">
                          {e.silver}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-display font-bold text-amber-700 text-lg">
                          {e.bronze}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-display font-bold text-foreground text-base">
                          {e.total}
                        </span>
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
