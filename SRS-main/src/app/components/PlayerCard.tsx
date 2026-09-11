import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { PlayerSlot, COURSES, SEMESTERS, MANDALS } from "../types";
import { Crown, User, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Shield } from "lucide-react";

interface PlayerCardProps {
  slot: PlayerSlot;
  onFieldChange: (index: number, field: keyof PlayerSlot, value: string | boolean) => void;
  onToggleCaptain: (index: number) => void;
  onToggleCollapse: (index: number) => void;
  isCaptainSelectionAllowed: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  slot,
  onFieldChange,
  onToggleCaptain,
  onToggleCollapse,
  isCaptainSelectionAllowed,
}) => {
  const isCaptain = slot.isCaptain;
  const isError = Object.keys(slot.errors).length > 0;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        isCaptain
          ? "bg-amber-50/80 border-amber-300"
          : slot.isSubstitute
          ? "bg-slate-50/90 border-slate-200"
          : slot.isComplete
          ? "bg-emerald-50/50 border-emerald-200"
          : isError
          ? "bg-red-50/50 border-red-200"
          : "bg-slate-50/60 border-slate-200"
      }`}
    >
      {/* Card Header / Toggle Bar */}
      <button
        type="button"
        onClick={() => onToggleCollapse(slot.index)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-black/5 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold ${
              isCaptain
                ? "bg-amber-400 text-slate-900"
                : slot.isSubstitute
                ? slot.isOptional
                  ? "bg-slate-200 text-slate-600"
                  : "bg-orange-100 text-orange-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {slot.isSubstitute ? (
              <Shield className="w-3 h-3" />
            ) : isCaptain ? (
              <Crown className="w-3 h-3" />
            ) : (
              <User className="w-3 h-3" />
            )}
            {slot.role}
          </span>

          {slot.fullName && (
            <span className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">
              {slot.fullName}
            </span>
          )}

          {isCaptain && (
            <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
              Captain
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {slot.isComplete && (
            <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
            </span>
          )}
          {slot.isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Card Content */}
      <AnimatePresence initial={false}>
        {!slot.isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-200/60"
          >
            {/* Captain selection toggle */}
            {!slot.isSubstitute && isCaptainSelectionAllowed && (
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-500" /> Make this player Team Captain
                </span>
                <input
                  type="checkbox"
                  checked={isCaptain}
                  onChange={() => onToggleCaptain(slot.index)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>
            )}

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name {!slot.isOptional && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={slot.fullName}
                  onChange={(e) => onFieldChange(slot.index, "fullName", e.target.value)}
                  placeholder="Enter full name"
                  className={`w-full px-3 py-2 bg-white rounded-lg border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                    slot.errors.fullName
                      ? "border-red-400 focus:ring-red-400"
                      : "border-slate-200 focus:ring-blue-500"
                  }`}
                />
                {slot.errors.fullName && (
                  <p className="text-red-500 text-[11px] mt-1">{slot.errors.fullName}</p>
                )}
              </div>

              {/* Scholar ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scholar ID {!slot.isOptional && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={slot.scholarNo}
                  onChange={(e) => onFieldChange(slot.index, "scholarNo", e.target.value)}
                  placeholder="e.g., 2424001"
                  className={`w-full px-3 py-2 bg-white rounded-lg border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                    slot.errors.scholarNo
                      ? "border-red-400 focus:ring-red-400"
                      : "border-slate-200 focus:ring-blue-500"
                  }`}
                />
                {slot.errors.scholarNo && (
                  <p className="text-red-500 text-[11px] mt-1">{slot.errors.scholarNo}</p>
                )}
              </div>

              {/* Course */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course {!slot.isOptional && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={slot.course}
                  onChange={(e) => onFieldChange(slot.index, "course", e.target.value)}
                  className={`w-full px-3 py-2 bg-white rounded-lg border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                    slot.errors.course
                      ? "border-red-400 focus:ring-red-400"
                      : "border-slate-200 focus:ring-blue-500"
                  }`}
                >
                  <option value="">Select course</option>
                  {COURSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {slot.errors.course && (
                  <p className="text-red-500 text-[11px] mt-1">{slot.errors.course}</p>
                )}
              </div>

              {/* Semester */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Semester {!slot.isOptional && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={slot.semester}
                  onChange={(e) => onFieldChange(slot.index, "semester", e.target.value)}
                  className={`w-full px-3 py-2 bg-white rounded-lg border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                    slot.errors.semester
                      ? "border-red-400 focus:ring-red-400"
                      : "border-slate-200 focus:ring-blue-500"
                  }`}
                >
                  <option value="">Select semester</option>
                  {SEMESTERS.map((s) => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
                {slot.errors.semester && (
                  <p className="text-red-500 text-[11px] mt-1">{slot.errors.semester}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number {!slot.isOptional && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="tel"
                  value={slot.phone}
                  onChange={(e) => onFieldChange(slot.index, "phone", e.target.value)}
                  placeholder="e.g., 9876543210"
                  className={`w-full px-3 py-2 bg-white rounded-lg border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                    slot.errors.phone
                      ? "border-red-400 focus:ring-red-400"
                      : "border-slate-200 focus:ring-blue-500"
                  }`}
                />
                {slot.errors.phone && (
                  <p className="text-red-500 text-[11px] mt-1">{slot.errors.phone}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email {!slot.isOptional && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="email"
                  value={slot.email}
                  onChange={(e) => onFieldChange(slot.index, "email", e.target.value)}
                  placeholder="your.email@example.com"
                  className={`w-full px-3 py-2 bg-white rounded-lg border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                    slot.errors.email
                      ? "border-red-400 focus:ring-red-400"
                      : "border-slate-200 focus:ring-blue-500"
                  }`}
                />
                {slot.errors.email && (
                  <p className="text-red-500 text-[11px] mt-1">{slot.errors.email}</p>
                )}
              </div>

              {/* Mandal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandal {!slot.isOptional && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={slot.mandal}
                  onChange={(e) => onFieldChange(slot.index, "mandal", e.target.value)}
                  className={`w-full px-3 py-2 bg-white rounded-lg border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                    slot.errors.mandal
                      ? "border-red-400 focus:ring-red-400"
                      : "border-slate-200 focus:ring-blue-500"
                  }`}
                >
                  <option value="">Select Mandal</option>
                  {MANDALS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {slot.errors.mandal && (
                  <p className="text-red-500 text-[11px] mt-1">{slot.errors.mandal}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender {!slot.isOptional && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={slot.gender}
                  onChange={(e) => onFieldChange(slot.index, "gender", e.target.value)}
                  className={`w-full px-3 py-2 bg-white rounded-lg border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                    slot.errors.gender
                      ? "border-red-400 focus:ring-red-400"
                      : "border-slate-200 focus:ring-blue-500"
                  }`}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {slot.errors.gender && (
                  <p className="text-red-500 text-[11px] mt-1">{slot.errors.gender}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
