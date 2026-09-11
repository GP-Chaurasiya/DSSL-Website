import * as api from "@/lib/api";
import type {
  CreateMatchInput,
  LeaderboardEntry,
  Match,
  MedalTallyEntry,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ── Helpers ───────────────────────────────────────────────────────────────

function toMatch(m: any): Match {
  return {
    id: String(m.id),
    sportId: Number(m.sportId) as Match["sportId"],
    dalAId: Number(m.dalAId),
    dalBId: Number(m.dalBId),
    scoreA: Number(m.scoreA),
    scoreB: Number(m.scoreB),
    status:
      m.status === "live"
        ? "live"
        : m.status === "completed"
        ? "completed"
        : "upcoming",
    venue: m.venue,
    duration: Number(m.duration),
    startTime: m.startTime ? Number(m.startTime) : undefined,
    createdAt: m.createdAt ? Number(m.createdAt) : Date.now(),
  };
}

function toLeaderboardEntry(e: any): LeaderboardEntry {
  return {
    dalId: Number(e.dalId),
    dalName: e.dalName,
    points: Number(e.points),
    wins: Number(e.wins),
    losses: Number(e.losses),
    draws: Number(e.draws),
    matchesPlayed: Number(e.matchesPlayed),
    winPercentage: Number(e.winPercentage),
    rank: 0,
  };
}

function toMedalTallyEntry(e: any): MedalTallyEntry {
  return {
    dalId: Number(e.dalId),
    dalName: e.dalName,
    gold: Number(e.gold),
    silver: Number(e.silver),
    bronze: Number(e.bronze),
    total: Number(e.total),
    rank: 0,
  };
}

// ── READ QUERIES ─────────────────────────────────────────────────────────

export function useGetAllMatches() {
  return useQuery({
    queryKey: ["matches", "all"],
    queryFn: async () => {
      const result = await api.getAllMatches();
      return result.map(toMatch);
    },
  });
}

export function useGetLiveMatches() {
  return useQuery({
    queryKey: ["matches", "live"],
    queryFn: async () => {
      const result = await api.getLiveMatches();
      return result.map(toMatch);
    },
  });
}

export function useGetUpcomingMatches(limit = 10) {
  return useQuery({
    queryKey: ["matches", "upcoming", limit],
    queryFn: async () => {
      const result = await api.getUpcomingMatches(limit);
      return result.map(toMatch);
    },
  });
}

export function useGetRecentMatches(limit = 5) {
  return useQuery({
    queryKey: ["matches", "recent", limit],
    queryFn: async () => {
      const result = await api.getRecentMatches(limit);
      return result.map(toMatch);
    },
  });
}

export function useGetMatchesBySport(sportId: number) {
  return useQuery({
    queryKey: ["matches", "sport", sportId],
    queryFn: async () => {
      const result = await api.getMatchesBySport(sportId);
      return result.map(toMatch);
    },
    enabled: !!sportId,
  });
}

export function useGetMatchStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: api.getMatchStats,
  });
}

export function useGetLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const result = await api.getLeaderboard();
      return result
        .map(toLeaderboardEntry)
        .sort((a, b) => b.points - a.points)
        .map((e, i) => ({ ...e, rank: i + 1 }));
    },
  });
}

export function useGetMedalTally() {
  return useQuery({
    queryKey: ["medalTally"],
    queryFn: async () => {
      const result = await api.getMedalTally();
      return result
        .map(toMedalTallyEntry)
        .sort(
          (a, b) =>
            b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze
        )
        .map((e, i) => ({ ...e, rank: i + 1 }));
    },
  });
}

// ── WRITE MUTATIONS ──────────────────────────────────────────────────────

export function useCreateMatch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMatchInput) => api.createMatch(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      qc.invalidateQueries({ queryKey: ["medalTally"] });
    },
  });
}

export function useUpdateScore() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      matchId,
      side,
      delta,
    }: {
      matchId: string;
      side: "A" | "B";
      delta: number;
    }) => api.updateMatchScore(matchId, { side, delta }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useSetMatchStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      matchId,
      status,
    }: {
      matchId: string;
      status: any;
    }) => api.setMatchStatus(matchId, status),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useRemoveMatch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) => api.removeMatch(matchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

// ── IMPORT / EXPORT ──────────────────────────────────────────────────────

export function useExportMatches() {
  return useMutation({
    mutationFn: api.exportMatches,
  });
}

export function useImportMatches() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: api.importMatches,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useIncrementScoreA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => api.updateMatchScore(matchId, { side: "A", delta: 1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDecrementScoreA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => api.updateMatchScore(matchId, { side: "A", delta: -1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useIncrementScoreB() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => api.updateMatchScore(matchId, { side: "B", delta: 1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDecrementScoreB() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => api.updateMatchScore(matchId, { side: "B", delta: -1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useStartMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => api.setMatchStatus(matchId, "live"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useSetMatchLive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, isLive }: { matchId: string; isLive: boolean }) =>
      api.setMatchStatus(matchId, isLive ? "live" : "paused"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function usePauseMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => api.setMatchStatus(matchId, "paused"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useCompleteMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => api.setMatchStatus(matchId, "completed"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      qc.invalidateQueries({ queryKey: ["medalTally"] });
    },
  });
}

export function useResetMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => api.setMatchStatus(matchId, "reset_timer"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}