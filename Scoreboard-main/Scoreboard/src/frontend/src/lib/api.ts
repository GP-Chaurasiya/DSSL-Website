import type {
  CreateMatchInput,
  LeaderboardEntry,
  Match,
  MatchStatus,
  MedalTallyEntry,
} from "@/types";

const BASE_URL = typeof window !== "undefined" && (window.location.port === "5173" || window.location.port === "5174" || window.location.port === "3001")
  ? "http://localhost:3000/api"
  : "/api";

const getHeaders = (extraHeaders: Record<string, string> = {}): Record<string, string> => {
  const headers: Record<string, string> = { ...extraHeaders };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("DSSL_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
};

/* ───────── MATCHES ───────── */

export async function getAllMatches(): Promise<Match[]> {
  return fetch(`${BASE_URL}/matches`, { headers: getHeaders() }).then(r => r.json());
}

export async function getLiveMatches(): Promise<Match[]> {
  return fetch(`${BASE_URL}/matches/live`, { headers: getHeaders() }).then(r => r.json());
}

export async function getMatchById(id: string): Promise<Match> {
  return fetch(`${BASE_URL}/matches/${id}`, { headers: getHeaders() }).then(r => r.json());
}

export async function getUpcomingMatches(limit = 10): Promise<Match[]> {
  return fetch(`${BASE_URL}/matches/upcoming?limit=${limit}`, { headers: getHeaders() }).then(r => r.json());
}

export async function getRecentMatches(limit = 5): Promise<Match[]> {
  return fetch(`${BASE_URL}/matches/recent?limit=${limit}`, { headers: getHeaders() }).then(r => r.json());
}

export async function getMatchesBySport(sportId: number): Promise<Match[]> {
  return fetch(`${BASE_URL}/matches?sportId=${sportId}`, { headers: getHeaders() }).then(r => r.json());
}

/* ───────── STATS ───────── */

export async function getMatchStats() {
  return fetch(`${BASE_URL}/matches/stats`, { headers: getHeaders() }).then(r => r.json());
}

/* ───────── WRITE ───────── */

export async function createMatch(input: CreateMatchInput): Promise<Match> {
  return fetch(`${BASE_URL}/matches`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  }).then(r => r.json());
}

export async function updateMatchScore(
  matchId: string,
  payload: { side: "A" | "B"; delta: number }
) {
  return fetch(`${BASE_URL}/matches/${matchId}/score`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  }).then(r => r.json());
}

export async function setMatchStatus(matchId: string, status: MatchStatus) {
  return fetch(`${BASE_URL}/matches/${matchId}/status`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status }),
  }).then(r => r.json());
}

export async function removeMatch(matchId: string) {
  return fetch(`${BASE_URL}/matches/${matchId}`, {
    method: "DELETE",
    headers: getHeaders(),
  }).then(r => r.json());
}

/* ───────── LEADERBOARD ───────── */

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return fetch(`${BASE_URL}/leaderboard`).then(r => r.json());
}

/* ───────── MEDALS ───────── */

export async function getMedalTally(): Promise<MedalTallyEntry[]> {
  return fetch(`${BASE_URL}/medals`).then(r => r.json());
}

/* ───────── IMPORT / EXPORT ───────── */

export async function exportMatches() {
  return getAllMatches();
}

export async function importMatches(matches: CreateMatchInput[]) {
  const created: Match[] = [];

  for (const m of matches) {
    const res = await createMatch(m);
    created.push(res);
  }

  return created;
}