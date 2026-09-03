module.exports = function registerAnalyticsRoutes({ app, prisma, authenticateToken, requireRole }) {
  // Allow all logged-in admin dashboard users to view analytics
  const adminReadAccess = [authenticateToken];
  const adminWriteAccess = [authenticateToken, requireRole(["SUPER_ADMIN", "ORGANISER_TEAM", "CREATOR_TEAM", "MEDIA_TEAM"])];

  async function resolveMandalId(mandalName) {
    if (!mandalName) return null;
    const cleanName = String(mandalName).replace(" Mandal", "").trim();
    const mandal = await prisma.mandal.findFirst({
      where: { name: { contains: cleanName || String(mandalName), mode: "insensitive" } }
    });
    return mandal ? mandal.id : null;
  }

  function buildPlayerWhere(query) {
    const { mandal, course, semester, gender, sport, search } = query;
    const where = {};
    if (mandal) where.mandalName = { contains: String(mandal), mode: "insensitive" };
    if (course) where.course = { contains: String(course), mode: "insensitive" };
    if (semester) where.semester = String(semester);
    if (gender) where.gender = { contains: String(gender), mode: "insensitive" };
    if (sport) where.sport = { contains: String(sport), mode: "insensitive" };
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { scholarNo: { contains: String(search), mode: "insensitive" } },
        { phone: { contains: String(search) } },
        { email: { contains: String(search), mode: "insensitive" } },
        { course: { contains: String(search), mode: "insensitive" } }
      ];
    }
    return where;
  }

  function csvEscape(value) {
    return `"${String(value || "").replace(/"/g, '""')}"`;
  }

  function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  app.post("/api/players/register", ...adminWriteAccess, async (req, res) => {
    const { name, scholarNo, course, semester, phone, email, gender, mandalName, sport, teamRegistrationId, teamRole, players } = req.body;

    try {
      if (Array.isArray(players) && players.length > 0) {
        const results = [];
        const errors = [];
        for (const p of players) {
          try {
            const playerScholarNo = String(p.scholarNo || "").trim();
            if (!playerScholarNo || !(p.name || p.fullName)) {
              errors.push({ scholarNo: playerScholarNo, error: "Name and Scholar ID are required" });
              continue;
            }
            const dalId = await resolveMandalId(p.mandalName || p.mandal);
            const player = await prisma.player.create({
              data: {
                name: String(p.name || p.fullName || "").trim(),
                scholarNo: playerScholarNo,
                course: p.course || "",
                semester: String(p.semester || ""),
                phone: String(p.phone || "").trim(),
                email: String(p.email || "").trim(),
                gender: p.gender || "",
                mandalName: p.mandalName || p.mandal || "",
                dalId,
                sport: p.sport || "",
                teamRegistrationId: p.teamRegistrationId || teamRegistrationId || "",
                teamRole: p.teamRole || p.role || "",
                registrationDate: new Date()
              }
            });
            results.push(player);
          } catch (err) {
            errors.push({ scholarNo: p.scholarNo, error: err.code === "P2002" ? "Scholar ID already registered" : err.message });
          }
        }
        return res.status(201).json({ registered: results.length, errors, players: results });
      }

      if (!name || !scholarNo) return res.status(400).json({ error: "Name and Scholar ID are required" });
      const dalId = await resolveMandalId(mandalName);
      const player = await prisma.player.create({
        data: {
          name: String(name).trim(),
          scholarNo: String(scholarNo).trim(),
          course: course || "",
          semester: String(semester || ""),
          phone: String(phone || "").trim(),
          email: String(email || "").trim(),
          gender: gender || "",
          mandalName: mandalName || "",
          dalId,
          sport: sport || "",
          teamRegistrationId: teamRegistrationId || "",
          teamRole: teamRole || "",
          registrationDate: new Date()
        }
      });
      res.status(201).json({ success: true, player });
    } catch (error) {
      console.error("Player registration error:", error);
      if (error.code === "P2002") return res.status(409).json({ error: "Scholar ID already registered" });
      res.status(500).json({ error: "Error registering player" });
    }
  });


  // ============================================================
  // ============================================================
  // SHARED LIVE GOOGLE SHEET DATA FETCHER
  // All analytics endpoints use this single cached helper
  // Cache TTL: 15 seconds to avoid rate limits
  // ============================================================

  const SHEET_ID = "1wko8nor4TPBssNGKIK5283AJ-zZ-Yj394v4ZcUFXjRU";

  // Canonical list of all 22 DSSL Tournament Sports
  const ALL_TOURNAMENT_SPORTS = [
    "Basketball",
    "Football",
    "Cricket",
    "Volleyball",
    "Badminton (Doubles)",
    "Badminton (Singles)",
    "Table Tennis",
    "Athletics (100m)",
    "Athletics (200m)",
    "Athletics (400m)",
    "Athletics (Relay)",
    "Kho-Kho",
    "Chess",
    "High Jump",
    "Tug of War",
    "Long Jump",
    "Javelin Throw",
    "Discus Throw",
    "Shot Put",
    "7 Stones",
    "Kabaddi",
    "Track Marking"
  ];

  // Exact sheet tab names in the Google Sheet / Excel workbook
  const ALL_SHEET_TABS = [
    "Input",
    "Badminton (double)",
    "Badminton (Singles)",
    "Chess",
    "Table Tennis",
    "Basketball",
    "Volleyball",
    "Football",
    "Cricket",
    "Kho Kho",
    "Tug Of War",
    "Relay Race",
    "7 Stones",
    "100 m",
    "200 m",
    "400 m",
    "Long Jump",
    "High Jump",
    "Shot Put",
    "Javelin Throw",
    "Discus Throw",
    "Kabaddi",
    "Track Marking",
    "Track marking"
  ];

  function normalizeSportName(raw, fallbackSheetName) {
    const s = String(raw || fallbackSheetName || "").trim().toLowerCase();
    
    if (s.includes("track marking") || s.includes("track mark") || s.includes("track_marking")) return "Track Marking";
    if (s.includes("badminton") && (s.includes("single") || s.includes("singles"))) return "Badminton (Singles)";
    if (s.includes("badminton") && (s.includes("doubl") || s.includes("double") || s.includes("doubles"))) return "Badminton (Doubles)";
    if (s === "badminton") return "Badminton (Singles)";

    if (s.includes("100") && (s.includes("m") || s.includes("athletics") || s.includes("race"))) return "Athletics (100m)";
    if (s.includes("200") && (s.includes("m") || s.includes("athletics") || s.includes("race"))) return "Athletics (200m)";
    if (s.includes("400") && (s.includes("m") || s.includes("athletics") || s.includes("race"))) return "Athletics (400m)";
    if (s.includes("relay") || s.includes("relay race")) return "Athletics (Relay)";

    if (s.includes("kho")) return "Kho-Kho";
    if (s.includes("tug")) return "Tug of War";
    if (s.includes("7 stone") || s.includes("seven stone") || s.includes("7stones")) return "7 Stones";
    if (s.includes("table tennis") || s.includes("tt")) return "Table Tennis";
    if (s.includes("basket")) return "Basketball";
    if (s.includes("volley")) return "Volleyball";
    if (s.includes("foot")) return "Football";
    if (s.includes("cricket")) return "Cricket";
    if (s.includes("kabaddi")) return "Kabaddi";
    if (s.includes("chess")) return "Chess";
    if (s.includes("high jump")) return "High Jump";
    if (s.includes("long jump")) return "Long Jump";
    if (s.includes("javelin")) return "Javelin Throw";
    if (s.includes("discus")) return "Discus Throw";
    if (s.includes("shot put")) return "Shot Put";

    for (const c of ALL_TOURNAMENT_SPORTS) {
      if (c.toLowerCase() === s) return c;
    }

    return raw || fallbackSheetName || "Other";
  }

  const MANDAL_ALIASES = {
    "Vashishta Mandal": ["vashishta", "vasistha", "vashishtha"],
    "Vishwamitra Mandal": ["vishwamitra", "viswamitra"],
    "Atrey Mandal": ["atrey", "atreyi", "atri"],
    "Gautam Mandal": ["gautam", "gautama"],
    "Bharadwaj Mandal": ["bharadwaj", "bhardwaj", "bharadwaja"],
    "Jamdagni Mandal": ["jamdagni", "jamdagani", "jamadagni"],
    "Kashyap Mandal": ["kashyap", "kasyap", "kashyapa"]
  };

  let _sheetCache = null;
  let _sheetCacheExpiry = 0;

  async function fetchSheetTab(sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${sheetName}: HTTP ${response.status}`);
    const text = await response.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error(`${sheetName}: Invalid response`);
    return JSON.parse(text.substring(jsonStart, jsonEnd + 1));
  }

  function findColIndex(table, names) {
    // Try column labels first (cols[].label)
    const columns = table?.cols || [];
    const labels = columns.map(col => String(col?.label || "").trim().toLowerCase());
    let idx = labels.findIndex(label => names.some(name => label.includes(name)));
    if (idx !== -1) return { index: idx, headerInRow: false };
    // Fallback: check first data row as header
    if (table?.rows?.[0]?.c) {
      const row0 = table.rows[0].c;
      idx = row0.findIndex(cell => {
        const v = cell?.v != null ? String(cell.v).trim().toLowerCase() : "";
        return names.some(name => v.includes(name));
      });
      if (idx !== -1) return { index: idx, headerInRow: true };
    }
    return { index: -1, headerInRow: false };
  }

  function normalizeMandal(raw) {
    const lower = (raw || "").toLowerCase().trim();
    for (const [canonical, aliases] of Object.entries(MANDAL_ALIASES)) {
      if (aliases.some(a => lower.includes(a))) return canonical;
    }
    return raw || "Unknown";
  }

  function normalizeGender(raw) {
    const g = (raw || "").toLowerCase().trim();
    if (g === "male" || g === "m") return "Male";
    if (g === "female" || g === "f") return "Female";
    if (g) return "Other";
    return "Unknown";
  }

  function parseGoogleDate(val) {
    if (!val) return null;

    // 1. Google GViz Date() string: "Date(2026,7,28)" — month is 0-indexed
    if (typeof val === "string") {
      const match = val.match(/Date\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+),\s*(\d+),\s*(\d+))?\)/);
      if (match) {
        const [, y, m, d, h, min, s] = match;
        return new Date(parseInt(y), parseInt(m), parseInt(d),
          parseInt(h || 0), parseInt(min || 0), parseInt(s || 0));
      }

      // 2. ISO date: "2026-08-28" or "2026-08-28T..."
      if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
        // Parse parts directly to avoid UTC offset issues
        const parts = val.substring(0, 10).split("-");
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return isNaN(d.getTime()) ? null : d;
      }

      // 3. dd/mm/yyyy or d/m/yyyy (Indian / European format)
      const dmyMatch = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dmyMatch) {
        const [, dd, mm, yyyy] = dmyMatch;
        const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
        return isNaN(d.getTime()) ? null : d;
      }

      // 4. dd-mm-yyyy or d-m-yyyy
      const dmyDash = val.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
      if (dmyDash) {
        const [, dd, mm, yyyy] = dmyDash;
        const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
        return isNaN(d.getTime()) ? null : d;
      }

      // 5. "28 Aug 2026" or "28 August 2026" style
      const monthNames = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
      const textMatch = val.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
      if (textMatch) {
        const [, dd, mon, yyyy] = textMatch;
        const mIdx = monthNames.indexOf(mon.toLowerCase().substring(0, 3));
        if (mIdx !== -1) {
          const d = new Date(parseInt(yyyy), mIdx, parseInt(dd));
          return isNaN(d.getTime()) ? null : d;
        }
      }

      // 6. Numeric Google serial date (days since Dec 30 1899)
      const serial = parseFloat(val);
      if (!isNaN(serial) && serial > 40000 && serial < 60000) {
        const epoch = new Date(1899, 11, 30);
        epoch.setDate(epoch.getDate() + Math.floor(serial));
        return epoch;
      }
    }

    // 7. Number (Google serial date)
    if (typeof val === "number" && val > 40000 && val < 60000) {
      const epoch = new Date(1899, 11, 30);
      epoch.setDate(epoch.getDate() + Math.floor(val));
      return epoch;
    }

    // 8. Last resort: native Date parse
    const pd = new Date(val);
    return isNaN(pd.getTime()) ? null : pd;
  }

  async function getLiveSheetData() {
    const now = Date.now();
    if (_sheetCache && now < _sheetCacheExpiry) return _sheetCache;

    const uniqueMap = new Map(); // key = scholarNo or name+mandal
    const allRegistrations = [];
    const activeSports = new Set();
    let idCounter = 0;

    // 1. Process "Input" tab FIRST (master registrations)
    try {
      const inputData = await fetchSheetTab("Input");
      if (inputData?.table?.rows) {
        const table = inputData.table;
        const mandalCol = findColIndex(table, ["mandal"]);
        const scholarCol = findColIndex(table, ["scholar", "roll"]);
        const nameCol = findColIndex(table, ["name", "student"]);
        const courseCol = findColIndex(table, ["course", "dept", "branch"]);
        const semCol = findColIndex(table, ["semester", "sem"]);
        const genderCol = findColIndex(table, ["gender", "sex"]);
        const phoneCol = findColIndex(table, ["phone", "mobile", "contact"]);
        const emailCol = findColIndex(table, ["email", "mail"]);
        const regIdCol = findColIndex(table, ["registration", "reg id"]);
        const sportCol = findColIndex(table, ["sport", "category", "game"]);
        const dateCol = findColIndex(table, ["date", "timestamp", "time"]);

        const headerInRow = [mandalCol, scholarCol, nameCol, courseCol, semCol, genderCol, phoneCol, emailCol, regIdCol, sportCol, dateCol].some(c => c.headerInRow);
        const startRow = headerInRow ? 1 : 0;

        const mIdx = mandalCol.index !== -1 ? mandalCol.index : 7;
        const scIdx = scholarCol.index !== -1 ? scholarCol.index : 3;
        const nIdx = nameCol.index !== -1 ? nameCol.index : 2;
        const cIdx = courseCol.index !== -1 ? courseCol.index : 4;
        const sIdx = semCol.index !== -1 ? semCol.index : 5;
        const spIdx = sportCol.index !== -1 ? sportCol.index : 6;
        const gIdx = genderCol.index !== -1 ? genderCol.index : 10;
        const pIdx = phoneCol.index !== -1 ? phoneCol.index : 9;
        const eIdx = emailCol.index !== -1 ? emailCol.index : 8;
        const rIdx = regIdCol.index !== -1 ? regIdCol.index : 1;
        const dIdx = dateCol.index !== -1 ? dateCol.index : 11;

        for (let i = startRow; i < table.rows.length; i++) {
          const row = table.rows[i];
          if (!row || !Array.isArray(row.c)) continue;
          const getV = (idx) => (row.c[idx]?.v != null ? String(row.c[idx].v).trim() : "");
          // Also get the formatted value (.f) which Google Sheets uses to show the date string
          const getF = (idx) => (row.c[idx]?.f != null ? String(row.c[idx].f).trim() : "");
          const getRaw = (idx) => row.c[idx]?.v;

          const mandalRaw = getV(mIdx);
          if (!mandalRaw || mandalRaw.toLowerCase() === "mandal") continue;
          const name = getV(nIdx);
          const scholarNo = getV(scIdx);
          if (!name && !scholarNo) continue;

          const rawSport = getV(spIdx);
          const normSport = normalizeSportName(rawSport, "Badminton (Singles)");
          // Try raw .v first, then formatted .f string as fallback for date parsing
          const rawDateVal = getRaw(dIdx);
          const rawDate = rawDateVal != null ? rawDateVal : getF(dIdx) || getV(dIdx);
          const parsedDate = parseGoogleDate(rawDate) || parseGoogleDate(getF(dIdx));

          const rec = {
            id: ++idCounter,
            name,
            scholarNo: scholarNo || name.toLowerCase().replace(/\s+/g, "_"),
            course: getV(cIdx) || "Other",
            semester: getV(sIdx) || "",
            mandalName: normalizeMandal(mandalRaw),
            gender: normalizeGender(getV(gIdx)),
            phone: getV(pIdx),
            email: getV(eIdx),
            sport: normSport,
            teamRegistrationId: getV(rIdx),
            teamRole: "Player",
            registrationDate: getF(dIdx) || getV(dIdx) || String(rawDate || ""),
            registrationDateParsed: parsedDate
          };

          allRegistrations.push(rec);
          activeSports.add(normSport);

          const uniqueKey = scholarNo || (name.toLowerCase() + "_" + rec.mandalName);
          if (!uniqueMap.has(uniqueKey)) {
            uniqueMap.set(uniqueKey, { ...rec, sports: [normSport] });
          } else {
            const existing = uniqueMap.get(uniqueKey);
            if (!existing.sports.includes(normSport)) existing.sports.push(normSport);
            if (!existing.registrationDateParsed && parsedDate) {
              existing.registrationDateParsed = parsedDate;
              existing.registrationDate = rawDate;
            }
          }
        }
      }
    } catch (err) {
      console.warn("Error fetching Input sheet:", err.message);
    }

    // 2. Also check individual sport tabs for any direct registrations not in Input
    await Promise.allSettled(
      ALL_SHEET_TABS.map(async (sheetName) => {
        if (sheetName === "Input") return;
        try {
          const data = await fetchSheetTab(sheetName);
          const table = data?.table;
          if (!table || !Array.isArray(table.rows) || table.rows.length <= 1) return;

          const mandalCol = findColIndex(table, ["mandal"]);
          const scholarCol = findColIndex(table, ["scholar", "roll"]);
          const nameCol = findColIndex(table, ["name", "student"]);
          const courseCol = findColIndex(table, ["course", "dept", "branch"]);
          const semCol = findColIndex(table, ["semester", "sem"]);
          const genderCol = findColIndex(table, ["gender", "sex"]);
          const phoneCol = findColIndex(table, ["phone", "mobile", "contact"]);
          const emailCol = findColIndex(table, ["email", "mail"]);
          const regIdCol = findColIndex(table, ["registration", "reg id"]);
          const roleCol = findColIndex(table, ["role", "captain"]);
          const dateCol = findColIndex(table, ["date", "timestamp", "time"]);

          const headerInRow = [mandalCol, scholarCol, nameCol, courseCol, semCol, genderCol, phoneCol, emailCol, regIdCol, dateCol, roleCol].some(c => c.headerInRow);
          const startRow = headerInRow ? 1 : 0;

          const mIdx = mandalCol.index !== -1 ? mandalCol.index : 7;
          const scIdx = scholarCol.index !== -1 ? scholarCol.index : 4;
          const nIdx = nameCol.index !== -1 ? nameCol.index : 3;
          const cIdx = courseCol.index !== -1 ? courseCol.index : 5;
          const sIdx = semCol.index !== -1 ? semCol.index : 6;
          const gIdx = genderCol.index !== -1 ? genderCol.index : 10;
          const pIdx = phoneCol.index !== -1 ? phoneCol.index : 9;
          const eIdx = emailCol.index !== -1 ? emailCol.index : 8;
          const rIdx = regIdCol.index !== -1 ? regIdCol.index : 0;
          const rlIdx = roleCol.index !== -1 ? roleCol.index : 2;
          const dIdx = dateCol.index !== -1 ? dateCol.index : 11;

          const normSport = normalizeSportName("", sheetName);

          for (let i = startRow; i < table.rows.length; i++) {
            const row = table.rows[i];
            if (!row || !Array.isArray(row.c)) continue;
            const getV = (idx) => (row.c[idx]?.v != null ? String(row.c[idx].v).trim() : "");

            const mandalRaw = getV(mIdx);
            if (!mandalRaw || mandalRaw.toLowerCase() === "mandal") continue;
            const name = getV(nIdx);
            const scholarNo = getV(scIdx);
            if (!name && !scholarNo) continue;

            const uniqueKey = scholarNo || (name.toLowerCase() + "_" + normalizeMandal(mandalRaw));

            if (uniqueMap.has(uniqueKey)) {
              const existing = uniqueMap.get(uniqueKey);
              if (!existing.sports.includes(normSport)) {
                existing.sports.push(normSport);
                allRegistrations.push({
                  ...existing,
                  id: ++idCounter,
                  sport: normSport
                });
                activeSports.add(normSport);
              }
            } else {
              const rawDate = getV(dIdx);
              const parsedDate = parseGoogleDate(rawDate);
              const rec = {
                id: ++idCounter,
                name,
                scholarNo: scholarNo || name.toLowerCase().replace(/\s+/g, "_"),
                course: getV(cIdx) || "Other",
                semester: getV(sIdx) || "",
                mandalName: normalizeMandal(mandalRaw),
                gender: normalizeGender(getV(gIdx)),
                phone: getV(pIdx),
                email: getV(eIdx),
                sport: normSport,
                teamRegistrationId: getV(rIdx),
                teamRole: getV(rlIdx) || "Player",
                registrationDate: rawDate,
                registrationDateParsed: parsedDate
              };
              allRegistrations.push(rec);
              activeSports.add(normSport);
              uniqueMap.set(uniqueKey, { ...rec, sports: [normSport] });
            }
          }
        } catch (err) {
          // ignore missing sheet
        }
      })
    );

    const uniquePlayers = Array.from(uniqueMap.values());

    _sheetCache = { uniquePlayers, allRegistrations, activeSports: Array.from(activeSports) };
    _sheetCacheExpiry = Date.now() + 15000; // 15 second cache
    console.log(`[LiveSheet] Fetched: ${allRegistrations.length} registrations, ${uniquePlayers.length} unique players, ${activeSports.size} active sports`);
    return _sheetCache;
  }

  // ============================================================
  // PLAYER LIST — from LIVE Google Sheets
  // ============================================================

  app.get("/api/players", ...adminReadAccess, async (req, res) => {
    try {
      const { uniquePlayers } = await getLiveSheetData();
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
      const { mandal, course, semester, gender, sport, search } = req.query;

      let filtered = uniquePlayers;
      if (mandal) filtered = filtered.filter(p => p.mandalName.toLowerCase().includes(mandal.toLowerCase()));
      if (course) filtered = filtered.filter(p => p.course.toLowerCase().includes(course.toLowerCase()));
      if (semester) filtered = filtered.filter(p => p.semester === String(semester));
      if (gender) filtered = filtered.filter(p => p.gender.toLowerCase().includes(gender.toLowerCase()));
      if (sport) filtered = filtered.filter(p => p.sport.toLowerCase().includes(sport.toLowerCase()) || (p.sports && p.sports.some(s => s.toLowerCase().includes(sport.toLowerCase()))));
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(s) ||
          p.scholarNo.toLowerCase().includes(s) ||
          p.phone.includes(s) ||
          p.email.toLowerCase().includes(s) ||
          p.course.toLowerCase().includes(s)
        );
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit);
      const paged = filtered.slice((page - 1) * limit, page * limit);

      res.json({ players: paged, total, page, limit, totalPages });
    } catch (error) {
      console.error("Player list error:", error);
      res.status(500).json({ error: "Error fetching players" });
    }
  });

  app.get("/api/players/:id", ...adminReadAccess, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid player ID" });
    try {
      const { uniquePlayers } = await getLiveSheetData();
      const player = uniquePlayers.find(p => p.id === id) || uniquePlayers.find(p => p.scholarNo === String(req.params.id));
      if (!player) return res.status(404).json({ error: "Player not found" });
      res.json(player);
    } catch (error) {
      res.status(500).json({ error: "Error fetching player" });
    }
  });

  // ============================================================
  // ANALYTICS OVERVIEW — from LIVE Google Sheets
  // ============================================================

  app.get("/api/analytics/overview", ...adminReadAccess, async (req, res) => {
    try {
      const { allRegistrations, uniquePlayers, activeSports } = await getLiveSheetData();
      const today = new Date();

      let maleCount = 0, femaleCount = 0, otherGenderCount = 0, todayRegistrations = 0;
      // Count gender from unique players so totals match
      uniquePlayers.forEach(r => {
        if (r.gender === "Male") maleCount++;
        else if (r.gender === "Female") femaleCount++;
        else if (r.gender === "Other") otherGenderCount++;
        if (r.registrationDateParsed) {
          const d = r.registrationDateParsed;
          if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
            todayRegistrations++;
          }
        }
      });

      const totalMandals = await prisma.mandal.count();
      const matchStats = await prisma.match.groupBy({ by: ["status"], _count: true });
      const matchSummary = {};
      matchStats.forEach(m => { matchSummary[m.status] = m._count; });
      const totalMatches = Object.values(matchSummary).reduce((a, b) => a + b, 0);

      console.log("================================");
      console.log("LIVE GOOGLE SHEET ANALYTICS");
      console.log("Unique players:", uniquePlayers.length);
      console.log("Total sport registrations:", allRegistrations.length);
      console.log("Male:", maleCount, "Female:", femaleCount, "Other:", otherGenderCount);
      console.log("Active sports:", activeSports.length);
      console.log("================================");

      res.json({
        totalPlayers: uniquePlayers.length,
        totalSportRegistrations: allRegistrations.length,
        maleCount, femaleCount, otherGenderCount, todayRegistrations,
        totalMandals,
        totalSports: activeSports.length,
        matches: {
          total: totalMatches,
          live: matchSummary.live || 0,
          scheduled: matchSummary.scheduled || 0,
          completed: matchSummary.completed || 0
        }
      });
    } catch (error) {
      console.error("Analytics overview error:", error);
      res.status(500).json({ error: "Error computing live Google Sheet analytics" });
    }
  });

  // ============================================================
  // MANDAL DISTRIBUTION — from LIVE Google Sheets
  // ============================================================

  app.get("/api/analytics/mandal-distribution", ...adminReadAccess, async (req, res) => {
    try {
      const { uniquePlayers } = await getLiveSheetData();
      const counts = {};
      uniquePlayers.forEach(p => { counts[p.mandalName] = (counts[p.mandalName] || 0) + 1; });
      const total = uniquePlayers.length;
      const result = Object.entries(counts)
        .map(([mandal, count]) => ({ mandal, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }))
        .sort((a, b) => b.count - a.count);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Error computing mandal distribution" });
    }
  });

  // ============================================================
  // GENDER DISTRIBUTION — from LIVE Google Sheets
  // ============================================================

  app.get("/api/analytics/gender-distribution", ...adminReadAccess, async (req, res) => {
    try {
      const { uniquePlayers } = await getLiveSheetData();
      const counts = {};
      uniquePlayers.forEach(p => { counts[p.gender] = (counts[p.gender] || 0) + 1; });
      const total = uniquePlayers.length;
      const distribution = Object.entries(counts)
        .map(([gender, count]) => ({ gender, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }));
      res.json({ total, distribution });
    } catch (error) {
      res.status(500).json({ error: "Error computing gender distribution" });
    }
  });

  // ============================================================
  // COURSE DISTRIBUTION — from LIVE Google Sheets
  // ============================================================

  app.get("/api/analytics/course-distribution", ...adminReadAccess, async (req, res) => {
    try {
      const { uniquePlayers } = await getLiveSheetData();
      const counts = {};
      uniquePlayers.forEach(p => { counts[p.course || "Unknown"] = (counts[p.course || "Unknown"] || 0) + 1; });
      const total = uniquePlayers.length;
      const result = Object.entries(counts)
        .map(([course, count]) => ({ course, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }))
        .sort((a, b) => b.count - a.count);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Error computing course distribution" });
    }
  });

  // ============================================================
  // SEMESTER DISTRIBUTION — from LIVE Google Sheets
  // ============================================================

  app.get("/api/analytics/semester-distribution", ...adminReadAccess, async (req, res) => {
    try {
      const { uniquePlayers } = await getLiveSheetData();
      const counts = {};
      uniquePlayers.forEach(p => { counts[p.semester || "Unknown"] = (counts[p.semester || "Unknown"] || 0) + 1; });
      const total = uniquePlayers.length;
      const result = Object.entries(counts)
        .map(([semester, count]) => ({ semester, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }))
        .sort((a, b) => {
          const numA = parseInt(a.semester) || 999;
          const numB = parseInt(b.semester) || 999;
          return numA - numB;
        });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Error computing semester distribution" });
    }
  });

  // ============================================================
  // SPORT DISTRIBUTION — from LIVE Google Sheets
  // Includes all 21 tournament sports with live counts
  // ============================================================

  app.get("/api/analytics/sport-distribution", ...adminReadAccess, async (req, res) => {
    try {
      const { allRegistrations } = await getLiveSheetData();
      const counts = {};
      // Initialize all 21 canonical tournament sports to 0
      ALL_TOURNAMENT_SPORTS.forEach(s => { counts[s] = 0; });
      // Count actual live registrations
      allRegistrations.forEach(r => {
        counts[r.sport] = (counts[r.sport] || 0) + 1;
      });
      const total = allRegistrations.length;
      const result = Object.entries(counts)
        .map(([sport, count]) => ({
          sport,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count || a.sport.localeCompare(b.sport));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Error computing sport distribution" });
    }
  });

  // ============================================================
  // REGISTRATION TREND — from LIVE Google Sheets
  // ============================================================

  function toDateKey(date) {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  app.get("/api/analytics/registration-trend", ...adminReadAccess, async (req, res) => {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    try {
      const { uniquePlayers, allRegistrations } = await getLiveSheetData();
      const since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);

      // Count players with valid parsed dates
      let withDates = uniquePlayers.filter(r => r.registrationDateParsed);
      console.log(`[Trend] uniquePlayers: ${uniquePlayers.length}, with parsed dates: ${withDates.length}, days: ${days}`);

      const dateMap = {};

      if (withDates.length > 0) {
        // Normal path: group by registration date
        uniquePlayers.forEach(r => {
          if (r.registrationDateParsed) {
            const key = toDateKey(r.registrationDateParsed);
            dateMap[key] = (dateMap[key] || 0) + 1;
          }
        });
      } else {
        // Fallback: no date data — distribute players evenly across recent days
        // so the chart shows something meaningful rather than all zeros
        console.warn("[Trend] No registration dates found in sheet data — using fallback distribution");
        const total = uniquePlayers.length;
        if (total > 0) {
          // Put all players on today's date as a fallback indicator
          const today = toDateKey(new Date());
          dateMap[today] = total;
        }
      }

      const trend = [];
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        const key = toDateKey(d);
        trend.push({ date: key, count: dateMap[key] || 0 });
      }

      console.log(`[Trend] Non-zero days: ${trend.filter(t => t.count > 0).length}`);
      res.json(trend);
    } catch (error) {
      console.error("[Trend] Error:", error);
      res.status(500).json({ error: "Error computing registration trend" });
    }
  });

  // ============================================================
  // CROSS MANDAL×GENDER — from LIVE Google Sheets
  // ============================================================

  app.get("/api/analytics/cross/mandal-gender", ...adminReadAccess, async (req, res) => {
    try {
      const { uniquePlayers } = await getLiveSheetData();
      const genderSet = new Set();
      const mandalSet = new Set();
      const crossMap = {};

      uniquePlayers.forEach(p => {
        const mandal = p.mandalName || "Unknown";
        const gender = p.gender || "Unknown";
        genderSet.add(gender);
        mandalSet.add(mandal);
        const key = `${mandal}|||${gender}`;
        crossMap[key] = (crossMap[key] || 0) + 1;
      });

      const genders = Array.from(genderSet);
      const result = Array.from(mandalSet).map(mandal => {
        const row = { mandal };
        genders.forEach(g => {
          row[g] = crossMap[`${mandal}|||${g}`] || 0;
        });
        row.total = genders.reduce((sum, g) => sum + (row[g] || 0), 0);
        return row;
      });
      res.json({ genders, data: result });
    } catch (error) {
      res.status(500).json({ error: "Error computing mandal-gender cross analysis" });
    }
  });

  // ============================================================
  // EXPORT CSV — from LIVE Google Sheets
  // ============================================================

  app.get("/api/analytics/export", ...adminReadAccess, async (req, res) => {
    try {
      const { allRegistrations } = await getLiveSheetData();
      const { mandal, course, semester, gender, sport, search } = req.query;

      let filtered = allRegistrations;
      if (mandal) filtered = filtered.filter(p => p.mandalName.toLowerCase().includes(mandal.toLowerCase()));
      if (course) filtered = filtered.filter(p => p.course.toLowerCase().includes(course.toLowerCase()));
      if (semester) filtered = filtered.filter(p => p.semester === String(semester));
      if (gender) filtered = filtered.filter(p => p.gender.toLowerCase().includes(gender.toLowerCase()));
      if (sport) filtered = filtered.filter(p => p.sport.toLowerCase().includes(sport.toLowerCase()));
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(s) || p.scholarNo.toLowerCase().includes(s) ||
          p.phone.includes(s) || p.email.toLowerCase().includes(s)
        );
      }

      const headers = ["ID", "Name", "Scholar ID", "Course", "Semester", "Mandal", "Gender", "Phone", "Email", "Sport", "Team ID", "Role", "Registration Date"];
      const rows = filtered.map(p => [
        p.id, p.name, p.scholarNo, p.course, p.semester, p.mandalName, p.gender, p.phone, p.email, p.sport, p.teamRegistrationId, p.teamRole,
        p.registrationDate || ""
      ].map(csvEscape).join(","));
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="DSSL_Players_${new Date().toISOString().split("T")[0]}.csv"`);
      res.send("\uFEFF" + [headers.join(","), ...rows].join("\r\n"));
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Error exporting player data" });
    }
  });

  // ============================================================
  // TEAM STATS — player counts from LIVE Sheets, matches from DB
  // ============================================================

  app.get("/api/analytics/team-stats", ...adminReadAccess, async (req, res) => {
    try {
      const { uniquePlayers } = await getLiveSheetData();
      const [mandals, matches] = await Promise.all([
        prisma.mandal.findMany(),
        prisma.match.findMany({ where: { status: "completed" } })
      ]);

      // Count players per mandal from live sheet data
      const liveMandalCounts = {};
      uniquePlayers.forEach(p => {
        const key = (p.mandalName || "").trim().toLowerCase();
        if (key) liveMandalCounts[key] = (liveMandalCounts[key] || 0) + 1;
      });

      const teamMap = new Map();
      for (const mandal of mandals) {
        const mandalKey = (mandal.name || "").trim().toLowerCase();
        // Also match with " mandal" suffix
        const withSuffix = mandalKey.endsWith(" mandal") ? mandalKey : mandalKey + " mandal";
        const withoutSuffix = mandalKey.replace(/ mandal$/, "");
        const playerCount = liveMandalCounts[mandalKey] || liveMandalCounts[withSuffix] || liveMandalCounts[withoutSuffix] || 0;

        teamMap.set(mandal.id, {
          id: mandal.id,
          name: mandal.name,
          color: mandal.color,
          abbreviation: mandal.abbreviation,
          wins: 0, losses: 0, draws: 0, matchesPlayed: 0, points: 0,
          playerCount
        });
      }

      for (const match of matches) {
        const a = teamMap.get(match.dalAId);
        const b = teamMap.get(match.dalBId);
        if (!a || !b) continue;
        a.matchesPlayed++;
        b.matchesPlayed++;
        if (match.scoreA > match.scoreB) {
          a.wins++; a.points += 3; b.losses++;
        } else if (match.scoreB > match.scoreA) {
          b.wins++; b.points += 3; a.losses++;
        } else {
          a.draws++; b.draws++; a.points++; b.points++;
        }
      }
      res.json(Array.from(teamMap.values()).sort((a, b) => b.points - a.points));
    } catch (error) {
      console.error("team-stats error:", error);
      res.status(500).json({ error: "Error computing team stats" });
    }
  });

  function formatGoogleSheetCSVUrl(inputUrl) {
    if (!inputUrl) return "https://docs.google.com/spreadsheets/d/1wko8nor4TPBssNGKIK5283AJ-zZ-Yj394v4ZcUFXjRU/export?format=csv&gid=0";
    let url = String(inputUrl).trim();
    if (url.includes("/export?format=csv")) return url;

    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      const spreadsheetId = match[1];
      const gidMatch = url.match(/[?&]gid=([0-9]+)/) || url.match(/#gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : "0";
      return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    }
    return url;
  }

  function buildHeaderIndexMap(headers) {
    const map = {};
    headers.forEach((h, idx) => {
      const cleanHeader = String(h).toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanHeader.includes("scholar") || cleanHeader.includes("enrollment") || cleanHeader.includes("roll")) {
        map.scholarNo = idx;
      } else if (cleanHeader.includes("name") && !cleanHeader.includes("mandal") && !cleanHeader.includes("team")) {
        map.name = idx;
      } else if (cleanHeader.includes("mandal") || cleanHeader.includes("dal") || cleanHeader.includes("house")) {
        map.mandalName = idx;
      } else if (cleanHeader.includes("course") || cleanHeader.includes("program") || cleanHeader.includes("branch")) {
        map.course = idx;
      } else if (cleanHeader.includes("sem")) {
        map.semester = idx;
      } else if (cleanHeader.includes("gender") || cleanHeader.includes("sex")) {
        map.gender = idx;
      } else if (cleanHeader.includes("phone") || cleanHeader.includes("mobile") || cleanHeader.includes("contact")) {
        map.phone = idx;
      } else if (cleanHeader.includes("email")) {
        map.email = idx;
      } else if (cleanHeader.includes("sport") || cleanHeader.includes("game")) {
        map.sport = idx;
      } else if (cleanHeader.includes("reg") || cleanHeader.includes("teamid")) {
        map.teamRegistrationId = idx;
      } else if (cleanHeader.includes("role") || cleanHeader.includes("captain")) {
        map.teamRole = idx;
      }
    });
    return map;
  }

  app.post("/api/admin/import-sheets", ...adminWriteAccess, async (req, res) => {

    const spreadsheetId =
      "1wko8nor4TPBssNGKIK5283AJ-zZ-Yj394v4ZcUFXjRU";

    // These are the actual sport tab names in your Google Sheet.
    // The tab name itself becomes the player's sport.
    const sportSheets = [
      "Chess",
      "Table Tennis",
      "Badminton",
      "Basketball",
      "Volleyball",
      "Football",
      "Cricket",
      "Kho Kho",
      "Tug Of War",
      "Relay Race",

      // Add these if they exist as separate tabs
      "Athletics (100 m)",
      "Athletics (200 m)",
      "Athletics (400 m)",
      "Long Jump",
      "High Jump",
      "Javelin Throw",
      "Discus Throw",
      "Shot Put",
      "7 Stones"
    ];

    try {

      let importedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      const errors = [];
      const sheetResults = [];

      // ---------------------------------------------------------
      // Helper: convert Google Sheet column data into player data
      // ---------------------------------------------------------

      async function importSportSheet(sportSheetName) {

        // Google Visualization endpoint allows us to request
        // a specific sheet by its tab name.
        const encodedSheet =
          encodeURIComponent(sportSheetName);

        const sheetUrl =
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`;

        console.log(
          `Importing sport sheet: ${sportSheetName}`
        );

        const response = await fetch(sheetUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
          }
        });

        if (!response.ok) {
          throw new Error(
            `Google Sheet returned status ${response.status}`
          );
        }

        const csvData = await response.text();

        const lines =
          csvData
            .split(/\r?\n/)
            .filter(line => line.trim());

        if (lines.length <= 1) {
          return {
            sport: sportSheetName,
            imported: 0,
            updated: 0,
            skipped: 0,
            message: "No data rows"
          };
        }

        const headers =
          parseCSVLine(lines[0]);

        const colMap =
          buildHeaderIndexMap(headers);

        let imported = 0;
        let updated = 0;
        let skipped = 0;

        for (const line of lines.slice(1)) {

          const row =
            parseCSVLine(line);

          const getVal =
            (colKey, fallbackIdx) => {

              const idx =
                colMap[colKey] !== undefined
                  ? colMap[colKey]
                  : fallbackIdx;

              return (
                idx !== undefined &&
                row[idx] !== undefined
              )
                ? String(row[idx]).trim()
                : "";
            };

          // -----------------------------------------------------
          // Your Google Sheet structure
          // -----------------------------------------------------

          const regId =
            getVal("teamRegistrationId", 0);

          const role =
            getVal("teamRole", 1);

          const name =
            getVal("name", 2);

          const scholarNo =
            getVal("scholarNo", 3);

          const course =
            getVal("course", 4);

          const semester =
            getVal("semester", 5);

          const mandalName =
            getVal("mandalName", 6);

          const email =
            getVal("email", 7);

          const phone =
            getVal("phone", 8);

          const gender =
            getVal("gender", 9);

          // IMPORTANT:
          // We DO NOT read sport from the row.
          // We use the Google Sheet TAB NAME.
          const sport =
            sportSheetName;

          // -----------------------------------------------------
          // Validate required fields
          // -----------------------------------------------------

          if (!scholarNo || !name) {
            skipped++;
            continue;
          }

          try {

            const dalId =
              await resolveMandalId(mandalName);

            const existing =
              await prisma.player.findUnique({
                where: { scholarNo }
              });

            await prisma.player.upsert({

              where: {
                scholarNo
              },

              update: {

                name,

                course,

                semester:
                  String(semester),

                mandalName,

                dalId,

                email,

                phone,

                gender,

                // THIS IS THE IMPORTANT FIX
                sport,

                teamRegistrationId:
                  regId,

                teamRole:
                  role

              },

              create: {

                name,

                scholarNo,

                course,

                semester:
                  String(semester),

                mandalName,

                dalId,

                email,

                phone,

                gender,

                // THIS IS THE IMPORTANT FIX
                sport,

                teamRegistrationId:
                  regId,

                teamRole:
                  role

              }

            });

            if (existing) {
              updated++;
            } else {
              imported++;
            }

          } catch (playerError) {

            console.error(
              `Error importing ${scholarNo} from ${sportSheetName}:`,
              playerError
            );

            errors.push({
              sport: sportSheetName,
              scholarNo,
              error:
                playerError.message
            });
          }
        }

        return {
          sport: sportSheetName,
          imported,
          updated,
          skipped
        };
      }

      // ---------------------------------------------------------
      // IMPORT ALL SPORT TABS
      // ---------------------------------------------------------

      for (const sportSheet of sportSheets) {

        try {

          const result =
            await importSportSheet(
              sportSheet
            );

          sheetResults.push(result);

          importedCount +=
            result.imported;

          updatedCount +=
            result.updated;

          skippedCount +=
            result.skipped;

        } catch (sheetError) {

          console.error(
            `Could not import ${sportSheet}:`,
            sheetError
          );

          errors.push({
            sport: sportSheet,
            error:
              sheetError.message
          });
        }
      }

      // ---------------------------------------------------------
      // RESPONSE
      // ---------------------------------------------------------

      const totalProcessed =
        importedCount +
        updatedCount;

      console.log(
        `Google Sheets sync complete: ${totalProcessed} records`
      );

      res.json({

        success: true,

        count:
          totalProcessed,

        importedCount,

        updatedCount,

        skippedCount,

        sheets:
          sheetResults,

        errors,

        message:
          `Successfully synced ${totalProcessed} player records from ${sportSheets.length} sport sheets.`

      });

    } catch (error) {

      console.error(
        "Google Sheet import error:",
        error
      );

      res.status(500).json({

        error:
          "Failed to import Google Sheets data: " +
          error.message

      });
    }
  });

};
