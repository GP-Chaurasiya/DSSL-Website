// DSSL Core Types

export type SportId =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17;

export type MatchStatus = "upcoming" | "live" | "completed" | "paused";

export interface Sport {
  id: SportId;
  name: string;
  slug: string;
  icon: string;
  category: "team" | "individual" | "racquet" | "track" | "field";
}

export interface Dal {
  id: number;
  name: string;
  color: string;
  abbreviation: string;
  logo?: string;
}

export interface Match {
  id: string;
  sportId: SportId;
  dalAId: number;
  dalBId: number;
  scoreA: number;
  scoreB: number;
  status: MatchStatus;
  venue: string;
  duration: number; // in minutes
  startTime?: number; // timestamp
  endTime?: number;
  createdAt: number;
}

export type MatchPublic = Match;

export interface CreateMatchInput {
  sportId: SportId;
  dalAId: number;
  dalBId: number;
  venue: string;
  duration: number;
}

export interface LeaderboardEntry {
  dalId: number;
  dalName: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  matchesPlayed: number;
  winPercentage: number;
  rank: number;
}

export interface MedalTallyEntry {
  dalId: number;
  dalName: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
  rank: number;
}

export interface ScheduledMatch {
  id: string;
  sportId: SportId;
  dalAId: number;
  dalBId: number;
  venue: string;
  scheduledTime: number;
  duration: number;
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}
