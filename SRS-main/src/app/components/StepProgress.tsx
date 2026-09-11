import React from "react";
import { motion } from "motion/react";
import { Check, User, Users, Shield, Eye, CheckCircle } from "lucide-react";

interface StepProgressProps {
  currentStep: number;
  hasTeamMembers: boolean;
  hasSubstitutes: boolean;
  completionPct: number;
}

const STEPS = [
  { num: 1, label: "Sport & Captain", icon: User },
  { num: 2, label: "Team Members", icon: Users },
  { num: 3, label: "Substitutes", icon: Shield },
  { num: 4, label: "Preview", icon: Eye },
  { num: 5, label: "Submitted!", icon: CheckCircle },
];

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  hasTeamMembers,
  hasSubstitutes,
  completionPct,
}) => {
  // For individual sports, skip steps 2 and 3
  const visibleSteps = hasTeamMembers
    ? hasSubstitutes
      ? STEPS
      : STEPS.filter((s) => s.num !== 3)
    : STEPS.filter((s) => s.num !== 2 && s.num !== 3);

  const mapped = visibleSteps.map((s, i) => ({ ...s, position: i + 1 }));
  const mappedCurrent = mapped.find((s) => s.num === currentStep)?.position ?? 1;
  const fillPct = ((mappedCurrent - 1) / Math.max(mapped.length - 1, 1)) * 100;

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 mb-6 shadow-xl">
      {/* Completion label */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">
          Registration Progress
        </span>
        <span className="text-amber-300 text-sm font-black">
          {completionPct}% Complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-white/20 rounded-full mb-5 overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${completionPct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Step dots */}
      <div className="relative flex justify-between items-center px-2">
        {/* connector line */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-white/15 z-0" />
        <motion.div
          className="absolute top-5 left-8 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 z-0"
          initial={{ width: 0 }}
          animate={{ width: `calc(${fillPct}% - ${fillPct * 0.05}px)` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />

        {mapped.map((step) => {
          const isCompleted = currentStep > step.num;
          const isActive = currentStep === step.num;
          const Icon = step.icon;
          return (
            <div key={step.num} className="relative z-10 flex flex-col items-center gap-2">
              <motion.div
                layout
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-2 ${
                  isCompleted
                    ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30"
                    : isActive
                    ? "bg-gradient-to-br from-amber-400 to-amber-500 border-amber-300 text-slate-900 ring-4 ring-amber-400/30 shadow-lg shadow-amber-500/40 scale-110"
                    : "bg-slate-800/80 border-white/10 text-slate-400"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 stroke-[3]" />
                ) : (
                  <Icon className="w-4.5 h-4.5" />
                )}
              </motion.div>
              <span
                className={`text-[10px] font-semibold tracking-wide text-center max-w-[64px] leading-tight transition-colors ${
                  isActive
                    ? "text-amber-300 font-bold"
                    : isCompleted
                    ? "text-emerald-300"
                    : "text-slate-300/60"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
