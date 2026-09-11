import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import * as XLSX from "xlsx";
import dsvvLogo from "../imports/DSVV_Logo_English.png";
import dsslLogoImage from "../imports/WhatsApp_Image_2026-04-23_at_3.27.56_PM-removebg-preview.png";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import { PlayerCard } from "./components/PlayerCard";
import { SPORTS_CONFIG } from "./sportsConfig";
import { PlayerSlot, getMandalForCourse } from "./types";
import {
  Trophy, CheckCircle, Download, Users, ArrowLeft, ArrowRight, ArrowUp,
  Printer, RotateCcw, Eye, Crown, Shield, User, Lock, AlertTriangle, Clock,
} from "lucide-react";

// ─── Build player slots for a selected sport ─────────────────────────
function buildSlots(sportId: string): PlayerSlot[] {
  const sport = SPORTS_CONFIG[sportId];
  if (!sport) return [];
  const slots: PlayerSlot[] = [];

  // Main players
  for (let i = 0; i < sport.mainPlayers; i++) {
    slots.push({
      index: i,
      role: sport.mainPlayers === 1 ? "Captain" : i === 0 ? "Captain" : "Member",
      isCaptain: i === 0 && sport.type !== "individual",
      isSubstitute: false,
      isOptional: false,
      fullName: "", scholarNo: "", course: "", semester: "",
      phone: "", email: "", mandal: "", gender: "",
      errors: {}, isComplete: false, isCollapsed: i !== 0,
    });
  }

  // Substitute slots (only for team sports)
  if (sport.type === "team") {
    for (let j = 0; j < sport.substitutes; j++) {
      slots.push({
        index: sport.mainPlayers + j,
        role: "Member",
        isCaptain: false,
        isSubstitute: true,
        isOptional: j > 0, // Sub 1 is mandatory, others optional
        fullName: "", scholarNo: "", course: "", semester: "",
        phone: "", email: "", mandal: "", gender: "",
        errors: {}, isComplete: false, isCollapsed: true,
      });
    }
  }

  return slots;
}

// ─── Validate slot ───────────────────────────────────────────────────
function validateSlot(
  slot: PlayerSlot,
  allSlots: PlayerSlot[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (slot.isOptional && !slot.fullName && !slot.scholarNo) return {};

  if (!slot.fullName?.trim()) errors.fullName = "Full name is required";
  if (!slot.scholarNo?.trim()) errors.scholarNo = "Scholar ID is required";
  if (!slot.course) errors.course = "Course is required";
  if (!slot.semester) errors.semester = "Semester is required";
  if (!slot.phone?.trim()) errors.phone = "Phone number is required";
  if (!slot.email?.trim()) errors.email = "Email is required";
  if (!slot.mandal) errors.mandal = "Mandal is required";
  if (!slot.gender) errors.gender = "Gender is required";

  if (slot.phone && !/^[6-9]\d{9}$/.test(slot.phone.trim())) {
    errors.phone = "Enter valid 10-digit phone number";
  }

  if (slot.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(slot.email.trim())) {
    errors.email = "Invalid email format";
  }

  // Duplicate checks across team
  const others = allSlots.filter((s) => s.index !== slot.index);
  if (slot.scholarNo && others.some((s) => s.scholarNo === slot.scholarNo)) {
    errors.scholarNo = "Duplicate Scholar ID in team";
  }
  if (slot.phone && others.some((s) => s.phone === slot.phone)) {
    errors.phone = "Duplicate phone number in team";
  }

  return errors;
}

function checkComplete(slot: PlayerSlot, allSlots: PlayerSlot[]): boolean {
  if (slot.isOptional && !slot.fullName && !slot.scholarNo) return true;
  const errs = validateSlot(slot, allSlots);
  return Object.keys(errs).length === 0 && Boolean(
    slot.fullName && slot.scholarNo && slot.course && slot.semester &&
    slot.phone && slot.email && slot.mandal && slot.gender
  );
}

function generateTeamId(sportId: string): string {
  const sport = SPORTS_CONFIG[sportId];
  const code = sport?.name.replace(/[^A-Z]/gi, "").slice(0, 3).toUpperCase() || "SPT";
  const num = String(Math.floor(Math.random() * 90000) + 10000);
  return `DSSL-2026-${code}-${num}`;
}

export default function App() {
  const [selectedSport, setSelectedSport] = useState("");
  const [slots, setSlots] = useState<PlayerSlot[]>([]);
  const [viewMode, setViewMode] = useState<"form" | "preview" | "success">("form");
  const [submittedTeamId, setSubmittedTeamId] = useState("");
  const [submittedTime, setSubmittedTime] = useState("");

  const sport = selectedSport ? SPORTS_CONFIG[selectedSport] : null;
  const isTeamOrDoubles = sport?.type === "team" || sport?.type === "doubles";

  // ── Handle Sport Select in Dropdown ────────────────────────────────
  const handleSportChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sportId = e.target.value;
    setSelectedSport(sportId);
    setSlots(buildSlots(sportId));
  };

  // ── Field Change Handler ───────────────────────────────────────────
  const handleFieldChange = useCallback(
    (index: number, field: keyof PlayerSlot, value: string | boolean) => {
      setSlots((prev) => {
        const updated = prev.map((s) => {
          if (s.index !== index) return s;
          const updatedSlot = { ...s, [field]: value };
          // Auto fetch / assign Mandal when Course is selected
          if (field === "course" && typeof value === "string" && value) {
            const autoMandal = getMandalForCourse(value);
            if (autoMandal) {
              updatedSlot.mandal = autoMandal;
            }
          }
          return updatedSlot;
        });
        const slot = updated[index];
        const errors = validateSlot(slot, updated);
        const isComplete = checkComplete(slot, updated);
        updated[index] = { ...slot, errors, isComplete };
        return updated;
      });
    },
    []
  );

  // ── Captain Toggle ──────────────────────────────────────────────────
  const handleToggleCaptain = useCallback((index: number) => {
    setSlots((prev) =>
      prev.map((s) => ({
        ...s,
        isCaptain: s.index === index ? !s.isCaptain : false,
      }))
    );
  }, []);

  // ── Collapse Toggle ─────────────────────────────────────────────────
  const handleToggleCollapse = useCallback((index: number) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.index === index ? { ...s, isCollapsed: !s.isCollapsed } : s
      )
    );
  }, []);


  const [regSettings, setRegSettings] = useState<{
    masterEnabled: boolean;
    sportsConfig: Record<string, { enabled?: boolean; startDate?: string; endDate?: string }>;
  }>({
    masterEnabled: true,
    sportsConfig: {},
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings/registration");
        if (res.ok) {
          const data = await res.json();
          setRegSettings(data);
        }
      } catch (err) {
        console.warn("Could not fetch registration settings:", err);
      }
    };
    fetchSettings();
    const interval = setInterval(fetchSettings, 5000);
    return () => clearInterval(interval);
  }, []);

  const getSportRegStatus = useCallback((sportId: string) => {
    const cfg = regSettings.sportsConfig?.[sportId];
    if (cfg?.enabled === false) {
      return { status: "disabled", message: "Registration for this sport is disabled." };
    }
    const now = new Date();
    if (cfg?.startDate && new Date(cfg.startDate) > now) {
      const formatted = new Date(cfg.startDate).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      return { status: "upcoming", message: `Registration for this sport opens on ${formatted}.` };
    }
    if (cfg?.endDate && new Date(cfg.endDate) < now) {
      const formatted = new Date(cfg.endDate).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      return { status: "closed", message: `Registration for this sport closed on ${formatted}.` };
    }
    return { status: "open", message: "" };
  }, [regSettings]);

  const currentSportRegStatus = useMemo(() => {
    return selectedSport ? getSportRegStatus(selectedSport) : { status: "open", message: "" };
  }, [selectedSport, getSportRegStatus]);

  // ── Validation check ────────────────────────────────────────────────
  const isFormValid = useMemo(() => {
    if (currentSportRegStatus.status !== "open") return false;
    if (!sport || slots.length === 0) return false;

    const mainSlots = slots.filter((s) => !s.isSubstitute);
    const requiredSubSlots = slots.filter((s) => s.isSubstitute && !s.isOptional);

    const mainValid = mainSlots.every((s) => checkComplete(s, slots));
    const subsValid = requiredSubSlots.every((s) => checkComplete(s, slots));

    return mainValid && subsValid;
  }, [sport, slots, currentSportRegStatus]);

  // ── Go to Preview ───────────────────────────────────────────────────
  const handleGoToPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !sport) return;
    setViewMode("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Final Submit ────────────────────────────────────────────────────
  const handleFinalSubmit = () => {
    if (!sport) return;
    const teamId = generateTeamId(selectedSport);
    const timestamp = new Date().toLocaleString();

    setSubmittedTeamId(teamId);
    setSubmittedTime(timestamp);
    setViewMode("success");
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });

    // Background Google Sheets Sync
    // NOTE: Google Apps Script requires GET requests with URL-encoded params when using
    // mode:"no-cors" from a browser. JSON POST bodies are silently ignored by GAS.
    const payload = encodeURIComponent(
      JSON.stringify({
        teamId,
        sport: sport.name,
        timestamp,
        players: slots.map((s) => ({
          role: s.role,
          fullName: s.fullName,
          scholarNo: s.scholarNo,
          course: s.course,
          semester: s.semester,
          phone: s.phone,
          email: s.email,
          mandal: s.mandal,
          gender: s.gender,
          isCaptain: s.isCaptain,
        })),
      })
    );
    const scriptUrl =
      "https://script.google.com/macros/s/AKfycbzj-ZDfRGwV2tCjMygyPwBgmOzqXPbm9xSfLT4Kj2oyy1wNf0lradkbKnDPHIXN5jZlVw/exec";
    fetch(`${scriptUrl}?data=${payload}`, {
      method: "GET",
      mode: "no-cors",
    }).catch((err) => console.error("Background sync error:", err));
  };

  // ── Export Excel ────────────────────────────────────────────────────
  const handleDownloadExcel = () => {
    if (!sport || slots.length === 0) return;
    const rows = slots
      .filter((s) => s.fullName)
      .map((s) => ({
        "Registration / Team ID": submittedTeamId,
        "Sport": sport.name,
        "Role": s.role,
        "Full Name": s.fullName,
        "Scholar No": s.scholarNo,
        "Course": s.course,
        "Semester": s.semester,
        "Phone": s.phone,
        "Email": s.email,
        "Mandal": s.mandal,
        "Gender": s.gender,
        "Captain": s.isCaptain ? "Yes" : "No",
        "Registered Time": submittedTime,
      }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registration");
    XLSX.writeFile(workbook, `DSSL_Registration_${submittedTeamId}.xlsx`);
  };

  // ── Reset ───────────────────────────────────────────────────────────
  const handleRegisterAnother = () => {
    setSelectedSport("");
    setSlots([]);
    setSubmittedTeamId("");
    setViewMode("form");
  };

  const captain = slots.find((s) => s.isCaptain) || slots[0];
  const mainPlayers = slots.filter((s) => !s.isSubstitute);
  const subPlayers = slots.filter((s) => s.isSubstitute && s.fullName);

  return (
    <div className="min-h-svh bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative overflow-hidden">
      {/* Navbar Header */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-2 md:py-2.5">
          <div className="flex items-center justify-between">
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center">
              <ImageWithFallback src={dsvvLogo} alt="DSVV Logo" className="h-10 md:h-12 object-contain" />
            </motion.div>
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center">
              <ImageWithFallback src={dsslLogoImage} alt="DSSL Logo" className="h-14 md:h-16 object-contain" />
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Decorative background grid pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 border-4 border-white rounded-full"></div>
        <div className="absolute top-40 right-20 w-24 h-24 border-4 border-white rounded-full"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 border-4 border-white rounded-full"></div>
        <div className="absolute bottom-40 right-1/3 w-20 h-20 border-4 border-white rounded-full"></div>
        <div className="absolute top-0 left-1/4 w-1 h-full bg-white/20"></div>
        <div className="absolute top-0 left-2/4 w-1 h-full bg-white/20"></div>
        <div className="absolute top-0 left-3/4 w-1 h-full bg-white/20"></div>
        <div className="absolute top-1/2 left-0 w-full h-1 bg-white/20"></div>
      </div>

      {/* Page Content Container */}
      <div className="max-w-4xl mx-auto py-4 md:py-6 px-4 md:px-6 relative z-10">
        {/* Title */}
        <div className="text-center mb-6">
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white mb-1.5 drop-shadow-lg text-xl md:text-3xl font-bold text-balance"
          >
            DEV SANSKRITI SPORTS LEAGUE
          </motion.h1>
          <motion.p
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-blue-100 text-sm md:text-base drop-shadow text-balance"
          >
            Team Registration Portal · Season 2026
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {regSettings.masterEnabled === false ? (
            <motion.div
              key="closed-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/95 backdrop-blur-md rounded-2xl p-6 md:p-10 shadow-2xl border-t-4 border-red-500 text-center space-y-5"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Registration Currently Closed</h2>
                <p className="text-slate-600 text-sm mt-1 max-w-md mx-auto">
                  Team registration for Dev Sanskriti Sports League (DSSL 2026) is currently closed by the Organising Committee.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-sm mx-auto text-xs text-slate-600">
                <p className="font-bold text-slate-800 mb-1">Have questions or queries?</p>
                <p>Please contact the DSSL Organising Team for schedule announcements and support.</p>
              </div>
            </motion.div>
          ) : viewMode === "form" && (
            <motion.form
              key="form-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              onSubmit={handleGoToPreview}
              className="bg-white rounded-2xl p-5 md:p-8 shadow-2xl border-t-4 border-blue-600 relative overflow-hidden"
            >
              {/* Form Title */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="bg-blue-600 text-white rounded-full p-2.5">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Registration Form</h2>
                  <p className="text-xs text-slate-500">Fill in details to proceed to preview</p>
                </div>
              </div>

              {/* Sport Dropdown Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Select Sport <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSport}
                  onChange={handleSportChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                >
                  <option value="">-- Choose Sport --</option>
                  {Object.values(SPORTS_CONFIG).map((s) => {
                    const statusObj = getSportRegStatus(s.id);
                    let statusTag = "";
                    if (statusObj.status === "disabled") statusTag = " (Disabled)";
                    else if (statusObj.status === "upcoming") statusTag = " (Upcoming)";
                    else if (statusObj.status === "closed") statusTag = " (Registration Closed)";

                    return (
                      <option key={s.id} value={s.id}>
                        {s.emoji} {s.name} ({s.mainPlayers} Player{s.mainPlayers > 1 ? "s" : ""}){statusTag}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Sport Registration Status Banner */}
              {selectedSport && currentSportRegStatus.status !== "open" && (
                <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 border ${
                  currentSportRegStatus.status === "upcoming"
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}>
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">
                      {currentSportRegStatus.status === "upcoming" ? "Registration Not Started Yet" : "Registration Closed"}
                    </p>
                    <p className="text-xs mt-0.5">{currentSportRegStatus.message}</p>
                  </div>
                </div>
              )}

              {/* Dynamic Player Cards */}
              {selectedSport && (
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      Player Details ({slots.length} Slots)
                    </h3>
                    <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                      {sport?.mainPlayers} Main {sport?.substitutes ? `+ ${sport.substitutes} Subs` : ""}
                    </span>
                  </div>

                  {slots.map((slot) => (
                    <PlayerCard
                      key={slot.index}
                      slot={slot}
                      onFieldChange={handleFieldChange}
                      onToggleCaptain={handleToggleCaptain}
                      onToggleCollapse={handleToggleCollapse}
                      isCaptainSelectionAllowed={Boolean(isTeamOrDoubles)}
                    />
                  ))}
                </div>
              )}

              {/* Continue to Preview Button */}
              <motion.button
                whileHover={{ scale: selectedSport ? 1.01 : 1 }}
                whileTap={{ scale: selectedSport ? 0.99 : 1 }}
                type="submit"
                disabled={!isFormValid}
                className={`w-full py-4 rounded-xl font-bold text-base transition-all shadow-lg flex items-center justify-center gap-2 ${
                  isFormValid
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25 cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                }`}
              >
                <Eye className="w-5 h-5" />
                Preview Registration
              </motion.button>
            </motion.form>
          )}

          {/* ── MODE 2: PREVIEW PAGE ── */}
          {viewMode === "preview" && sport && (
            <motion.div
              key="preview-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white rounded-2xl p-5 md:p-8 shadow-2xl border-t-4 border-indigo-600 space-y-6"
            >
              {/* Preview Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 text-white rounded-full p-2.5">
                    <Eye className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Registration Preview</h2>
                    <p className="text-xs text-slate-500">Please review all player details carefully before final submission</p>
                  </div>
                </div>
                <span className="bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full">
                  {sport.emoji} {sport.name}
                </span>
              </div>

              {/* Captain Summary Highlight */}
              {captain && captain.fullName && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <Crown className="w-5 h-5 text-slate-900" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Team Captain / Primary Participant</p>
                    <p className="text-base font-extrabold text-slate-900">{captain.fullName}</p>
                    <p className="text-xs text-slate-600">{captain.course} · Sem {captain.semester} · {captain.mandal} · Ph: {captain.phone}</p>
                  </div>
                </div>
              )}

              {/* Roster Details List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  Main Roster ({mainPlayers.length} Players)
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  {mainPlayers.map((p) => (
                    <div key={p.index} className="p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          p.isCaptain ? "bg-amber-400 text-slate-900" : "bg-blue-100 text-blue-800"
                        }`}>
                          {p.role}{p.isCaptain ? " 👑" : ""}
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm">{p.fullName}</span>
                        <span className="text-slate-500">({p.scholarNo})</span>
                      </div>
                      <div className="text-slate-600 font-medium">
                        {p.course} (Sem {p.semester}) · {p.mandal} · {p.phone}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Substitutes Preview List */}
              {subPlayers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-orange-500" />
                    Substitutes ({subPlayers.length} Registered)
                  </h3>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-orange-50/30">
                    {subPlayers.map((p) => (
                      <div key={p.index} className="p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded font-bold bg-orange-100 text-orange-800">
                            {p.role}
                          </span>
                          <span className="font-extrabold text-slate-900 text-sm">{p.fullName}</span>
                          <span className="text-slate-500">({p.scholarNo})</span>
                        </div>
                        <div className="text-slate-600 font-medium">
                          {p.course} (Sem {p.semester}) · {p.mandal} · {p.phone}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode("form")}
                  className="flex-1 py-3.5 px-5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Edit Details
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  className="flex-1 py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-5 h-5" /> Confirm & Submit Registration
                </button>
              </div>
            </motion.div>
          )}

          {/* ── MODE 3: SUCCESS / CONFIRMATION ── */}
          {viewMode === "success" && sport && (
            <motion.div
              key="success-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 md:p-10 shadow-2xl border-t-4 border-emerald-500 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle className="w-12 h-12" />
              </div>

              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">
                  Registration Submitted Successfully! 🎉
                </h2>
                <p className="text-slate-600 text-sm">
                  Your registration for <span className="font-bold text-blue-600">{sport.emoji} {sport.name}</span> has been confirmed.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-sm mx-auto">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Registration ID</p>
                <p className="text-2xl font-mono font-black text-blue-700">{submittedTeamId}</p>
                <p className="text-[11px] text-slate-400 mt-1">Date: {submittedTime}</p>
              </div>

              <div className="pt-2 max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={handleRegisterAnother}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-blue-500/25"
                >
                  <RotateCcw className="w-5 h-5" /> Register Another Participant
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Scroll to Top Arrow Button in Bottom Right Corner */}
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-6 right-6 z-50 p-3.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 rounded-full shadow-2xl shadow-amber-500/40 border-2 border-amber-200 hover:from-amber-500 hover:to-yellow-500 transition-all cursor-pointer flex items-center justify-center font-bold"
        title="Scroll to Top"
      >
        <ArrowUp className="w-6 h-6 stroke-[2.5]" />
      </motion.button>
    </div>
  );
}
