import React from "react";
import { motion } from "motion/react";
import { SportConfig, PlayerSlot } from "../types";
import {
  Trophy, Users, Shield, CheckCircle, Circle, Crown, Sparkles,
} from "lucide-react";

interface RegistrationSummaryProps {
  sport: SportConfig;
  teamName: string;
  slots: PlayerSlot[];
  completionPct: number;
}

export const RegistrationSummary: React.FC<RegistrationSummaryProps> = ({
  sport,
  teamName,
  slots,
  completionPct,
}) => {
  const mainSlots = slots.filter((s) => !s.isSubstitute);
  const subSlots = slots.filter((s) => s.isSubstitute);
  const captainSlot = slots.find((s) => s.isCaptain);
  const completedMain = mainSlots.filter((s) => s.isComplete).length;
  const completedSubs = subSlots.filter((s) => s.isComplete).length;
  const isTeam = sport.type === "team" || sport.type === "doubles";

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 text-white shadow-2xl sticky top-24 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-extrabold text-white">Live Roster</h3>
        </div>
        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
      </div>

      {/* Sport + Team */}
      <div className="space-y-2.5 text-sm">
        <SummaryRow label="Sport" value={`${sport.emoji} ${sport.name}`} highlight />
        <SummaryRow label="Format" value={`${sport.type} · ${sport.category}`} />
        {isTeam && (
          <SummaryRow
            label="Team Name"
            value={teamName.trim() || "—"}
            muted={!teamName.trim()}
          />
        )}
        <SummaryRow
          label="Captain"
          value={captainSlot?.fullName || "Not selected"}
          muted={!captainSlot?.fullName}
          icon={<Crown className="w-3.5 h-3.5 text-amber-400" />}
        />
      </div>

      {/* Progress ring */}
      <div className="flex items-center gap-4 py-3 px-4 bg-white/5 rounded-2xl border border-white/10">
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="23" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
            <motion.circle
              cx="28" cy="28" r="23"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 23}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 23 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 23 * (1 - completionPct / 100) }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-black text-amber-300">{completionPct}%</span>
          </div>
        </div>
        <div>
          <p className="text-white font-bold text-sm">Form Progress</p>
          <p className="text-slate-400 text-xs mt-0.5">
            {completedMain}/{mainSlots.length} Players filled
          </p>
          {sport.type === "team" && (
            <p className="text-slate-400 text-xs">
              {completedSubs}/{subSlots.length} Substitutes
            </p>
          )}
        </div>
      </div>

      {/* Player checklist */}
      {slots.length > 0 && (
        <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
          {mainSlots.map((slot) => (
            <PlayerRow key={slot.index} slot={slot} />
          ))}
          {subSlots.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <Shield className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[11px] font-bold text-orange-300 uppercase tracking-wider">
                  Substitutes
                </span>
              </div>
              {subSlots.map((slot) => (
                <PlayerRow key={slot.index} slot={slot} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

function SummaryRow({
  label,
  value,
  highlight,
  muted,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-white/5">
      <span className="text-slate-300 text-xs font-medium">{label}</span>
      <span
        className={`text-xs font-bold flex items-center gap-1 truncate max-w-[160px] ${
          highlight ? "text-amber-300" : muted ? "text-slate-500 italic" : "text-white"
        }`}
      >
        {icon}
        {value}
      </span>
    </div>
  );
}

function PlayerRow({ slot }: { slot: PlayerSlot }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {slot.isComplete ? (
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
      ) : (
        <Circle className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
      )}
      <span
        className={`text-xs truncate ${
          slot.isComplete ? "text-emerald-300 font-semibold" : "text-slate-400"
        }`}
      >
        {slot.role}
        {slot.isCaptain && " 👑"}
        {slot.fullName ? ` – ${slot.fullName}` : ""}
      </span>
    </div>
  );
}
