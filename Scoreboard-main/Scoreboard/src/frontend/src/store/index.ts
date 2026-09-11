import type { MatchStatus as FrontendMatchStatus } from "@/types";
import { create } from "zustand";

// ── Sports catalogue ──────────────────────────────────────────────────────────
export const SPORTS = [
  {
    id: 1,
    name: "Basketball",
    slug: "basketball",
    icon: "🏀",
    category: "team",
  },
  { id: 2, name: "Football", slug: "football", icon: "⚽", category: "team" },
  { id: 3, name: "Cricket", slug: "cricket", icon: "🏏", category: "team" },
  {
    id: 4,
    name: "Volleyball",
    slug: "volleyball",
    icon: "🏐",
    category: "team",
  },
  {
    id: 5,
    name: "Badminton (Doubles)",
    slug: "badminton-doubles",
    icon: "🏸",
    category: "racquet",
  },
  {
    id: 6,
    name: "Table Tennis",
    slug: "table-tennis",
    icon: "🏓",
    category: "racquet",
  },
  {
    id: 7,
    name: "Athletics (100m)",
    slug: "athletics-100m",
    icon: "🏃",
    category: "track",
  },
  {
    id: 8,
    name: "Athletics (400m)",
    slug: "athletics-400m",
    icon: "🏃",
    category: "track",
  },
  {
    id: 9,
    name: "Athletics (Relay)",
    slug: "athletics-relay",
    icon: "🔁",
    category: "track",
  },
  { id: 10, name: "Kho-Kho", slug: "kho-kho", icon: "🤸", category: "team" },
  { id: 11, name: "Chess", slug: "chess", icon: "♟️", category: "individual" },
  {
    id: 12,
    name: "Carrom",
    slug: "carrom",
    icon: "🎯",
    category: "individual",
  },
  {
    id: 13,
    name: "Tug of War",
    slug: "tug-of-war",
    icon: "💪",
    category: "team",
  },
  {
    id: 14,
    name: "Long Jump",
    slug: "long-jump",
    icon: "🦘",
    category: "field",
  },
  {
    id: 15,
    name: "Javelin Throw",
    slug: "javelin-throw",
    icon: "🎿",
    category: "field",
  },
  {
    id: 16,
    name: "Discus Throw",
    slug: "discus-throw",
    icon: "🥏",
    category: "field",
  },
  { id: 17, name: "Shot Put", slug: "shot-put", icon: "⚫", category: "field" },
  { id: 19, name: "7 Stones", slug: "7-stones", icon: "🪨", category: "team" },
  { id: 20, name: "Kabaddi", slug: "kabaddi", icon: "🤼", category: "team" },
  { id: 22, name: "Track Marking", slug: "track-marking", icon: "🚩", category: "track" },
] as const;

// ── Dals catalogue ────────────────────────────────────────────────────────────
export const DALS = [
  {
    id: 1,
    name: "Adarsh Dal",
    color: "#E53E3E",
    abbreviation: "AD",
    logo: "/assets/adarsh_dal.jpg",
  },
  {
    id: 2,
    name: "Sankalp Dal",
    color: "#3182CE",
    abbreviation: "SK",
    logo: "/assets/sankalp_dal.jpg",
  },
  {
    id: 3,
    name: "Chanakya Dal",
    color: "#38A169",
    abbreviation: "CH",
    logo: "/assets/chanakya_dal.jpg",
  },
  {
    id: 4,
    name: "Vijay Dal",
    color: "#D69E2E",
    abbreviation: "VJ",
    logo: "/assets/vijay_dal.jpg",
  },
  {
    id: 5,
    name: "Utkarsh Dal",
    color: "#805AD5",
    abbreviation: "UK",
    logo: "/assets/utkarsh_dal.jpg",
  },
  {
    id: 6,
    name: "Rakshak Dal",
    color: "#DD6B20",
    abbreviation: "RK",
    logo: "/assets/rakshak_dal.jpg",
  },
  {
    id: 7,
    name: "Shaurya Dal",
    color: "#2C7A7B",
    abbreviation: "SH",
    logo: "/assets/shaurya_dal.jpg",
  },
] as const;

// ── UI-only Store (match data removed — now lives on backend) ─────────────────
interface UIStore {
  liveMatchId: string | null;
  selectedMatchId: string | null;
  sidebarCollapsed: boolean;
  setLiveMatch: (id: string | null) => void;
  setSelectedMatch: (id: string | null) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  liveMatchId: null,
  selectedMatchId: null,
  sidebarCollapsed: false,
  setLiveMatch: (id) => set({ liveMatchId: id }),
  setSelectedMatch: (id) => set({ selectedMatchId: id }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));

// ── Timer Store ─────────────────────────────────────────────────────────────────
interface TimerStore {
  elapsedSeconds: number;
  isRunning: boolean;
  intervalRef: ReturnType<typeof setInterval> | null;
  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  elapsedSeconds: 0,
  isRunning: false,
  intervalRef: null,
  tick: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
  start: () => {
    if (get().isRunning) return;
    const ref = setInterval(() => get().tick(), 1000);
    set({ isRunning: true, intervalRef: ref });
  },
  pause: () => {
    const { intervalRef } = get();
    if (intervalRef) clearInterval(intervalRef);
    set({ isRunning: false, intervalRef: null });
  },
  reset: () => {
    const { intervalRef } = get();
    if (intervalRef) clearInterval(intervalRef);
    set({ elapsedSeconds: 0, isRunning: false, intervalRef: null });
  },
}));
