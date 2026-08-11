module.exports = function registerAnalyticsRoutes({ app, prisma, authenticateToken, requireRole }) {
  const adminAccess = [authenticateToken, requireRole(["SUPER_ADMIN", "ORGANISER_TEAM"])];

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

  app.post("/api/players/register", ...adminAccess, async (req, res) => {
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

  app.get("/api/players", ...adminAccess, async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const where = buildPlayerWhere(req.query);

    try {
      const [players, total] = await Promise.all([
        prisma.player.findMany({
          where,
          orderBy: { registrationDate: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: { mandal: { select: { name: true, color: true } } }
        }),
        prisma.player.count({ where })
      ]);
      res.json({ players, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (error) {
      console.error("Player list error:", error);
      res.status(500).json({ error: "Error fetching players" });
    }
  });

  app.get("/api/players/:id", ...adminAccess, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid player ID" });
    try {
      const player = await prisma.player.findUnique({ where: { id }, include: { mandal: true } });
      if (!player) return res.status(404).json({ error: "Player not found" });
      res.json(player);
    } catch (error) {
      res.status(500).json({ error: "Error fetching player" });
    }
  });

  app.get("/api/analytics/overview", ...adminAccess, async (req, res) => {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const [total, maleCount, femaleCount, otherCount, todayCount, mandals, sports, matchStats] = await Promise.all([
        prisma.player.count(),
        prisma.player.count({ where: { gender: { equals: "Male", mode: "insensitive" } } }),
        prisma.player.count({ where: { gender: { equals: "Female", mode: "insensitive" } } }),
        prisma.player.count({ where: { gender: { notIn: ["Male", "Female"], not: "" } } }),
        prisma.player.count({ where: { registrationDate: { gte: startOfToday, lte: endOfToday } } }),
        prisma.mandal.count(),
        prisma.player.findMany({ select: { sport: true }, distinct: ["sport"], where: { sport: { not: "" } } }),
        prisma.match.groupBy({ by: ["status"], _count: true })
      ]);
      const matchSummary = {};
      matchStats.forEach(m => { matchSummary[m.status] = m._count; });
      res.json({
        totalPlayers: total,
        maleCount,
        femaleCount,
        otherGenderCount: otherCount,
        todayRegistrations: todayCount,
        totalMandals: mandals,
        totalSports: sports.length,
        matches: {
          total: Object.values(matchSummary).reduce((a, b) => a + b, 0),
          live: matchSummary.live || 0,
          scheduled: matchSummary.scheduled || 0,
          completed: matchSummary.completed || 0
        }
      });
    } catch (error) {
      console.error("Analytics overview error:", error);
      res.status(500).json({ error: "Error computing analytics overview" });
    }
  });

  app.get("/api/analytics/mandal-distribution", ...adminAccess, async (req, res) => {
    try {
      const data = await prisma.player.groupBy({ by: ["mandalName"], _count: { id: true }, orderBy: { _count: { id: "desc" } } });
      const total = data.reduce((s, d) => s + d._count.id, 0);
      res.json(data.map(d => ({ mandal: d.mandalName || "Unknown", count: d._count.id, percentage: total > 0 ? Math.round((d._count.id / total) * 100) : 0 })));
    } catch (error) {
      res.status(500).json({ error: "Error computing mandal distribution" });
    }
  });

  app.get("/api/analytics/gender-distribution", ...adminAccess, async (req, res) => {
    try {
      const data = await prisma.player.groupBy({ by: ["gender"], _count: { id: true } });
      const total = data.reduce((s, d) => s + d._count.id, 0);
      res.json({ total, distribution: data.map(d => ({ gender: d.gender || "Unknown", count: d._count.id, percentage: total > 0 ? Math.round((d._count.id / total) * 100) : 0 })) });
    } catch (error) {
      res.status(500).json({ error: "Error computing gender distribution" });
    }
  });

  app.get("/api/analytics/course-distribution", ...adminAccess, async (req, res) => {
    try {
      const data = await prisma.player.groupBy({ by: ["course"], _count: { id: true }, orderBy: { _count: { id: "desc" } } });
      const total = data.reduce((s, d) => s + d._count.id, 0);
      res.json(data.map(d => ({ course: d.course || "Unknown", count: d._count.id, percentage: total > 0 ? Math.round((d._count.id / total) * 100) : 0 })));
    } catch (error) {
      res.status(500).json({ error: "Error computing course distribution" });
    }
  });

  app.get("/api/analytics/semester-distribution", ...adminAccess, async (req, res) => {
    try {
      const data = await prisma.player.groupBy({ by: ["semester"], _count: { id: true }, orderBy: { semester: "asc" } });
      const total = data.reduce((s, d) => s + d._count.id, 0);
      res.json(data.map(d => ({ semester: d.semester || "Unknown", count: d._count.id, percentage: total > 0 ? Math.round((d._count.id / total) * 100) : 0 })));
    } catch (error) {
      res.status(500).json({ error: "Error computing semester distribution" });
    }
  });

  app.get("/api/analytics/sport-distribution", ...adminAccess, async (req, res) => {
    try {
      const data = await prisma.player.groupBy({ by: ["sport"], _count: { id: true }, orderBy: { _count: { id: "desc" } }, where: { sport: { not: "" } } });
      const total = data.reduce((s, d) => s + d._count.id, 0);
      res.json(data.map(d => ({ sport: d.sport, count: d._count.id, percentage: total > 0 ? Math.round((d._count.id / total) * 100) : 0 })));
    } catch (error) {
      res.status(500).json({ error: "Error computing sport distribution" });
    }
  });

  app.get("/api/analytics/registration-trend", ...adminAccess, async (req, res) => {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);
      const players = await prisma.player.findMany({
        where: { registrationDate: { gte: since } },
        select: { registrationDate: true },
        orderBy: { registrationDate: "asc" }
      });
      const dateMap = {};
      players.forEach(p => {
        const d = p.registrationDate.toISOString().split("T")[0];
        dateMap[d] = (dateMap[d] || 0) + 1;
      });
      const trend = [];
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        const key = d.toISOString().split("T")[0];
        trend.push({ date: key, count: dateMap[key] || 0 });
      }
      res.json(trend);
    } catch (error) {
      res.status(500).json({ error: "Error computing registration trend" });
    }
  });

  app.get("/api/analytics/cross/mandal-gender", ...adminAccess, async (req, res) => {
    try {
      const data = await prisma.player.groupBy({ by: ["mandalName", "gender"], _count: { id: true } });
      const mandals = [...new Set(data.map(d => d.mandalName || "Unknown"))];
      const genders = [...new Set(data.map(d => d.gender || "Unknown"))];
      const result = mandals.map(mandal => {
        const row = { mandal };
        genders.forEach(g => {
          const found = data.find(d => (d.mandalName || "Unknown") === mandal && (d.gender || "Unknown") === g);
          row[g] = found ? found._count.id : 0;
        });
        row.total = genders.reduce((sum, g) => sum + (row[g] || 0), 0);
        return row;
      });
      res.json({ genders, data: result });
    } catch (error) {
      res.status(500).json({ error: "Error computing mandal-gender cross analysis" });
    }
  });

  app.get("/api/analytics/export", ...adminAccess, async (req, res) => {
    try {
      const players = await prisma.player.findMany({ where: buildPlayerWhere(req.query), orderBy: { registrationDate: "desc" }, take: 5000 });
      const headers = ["ID", "Name", "Scholar ID", "Course", "Semester", "Mandal", "Gender", "Phone", "Email", "Sport", "Team ID", "Role", "Registration Date"];
      const rows = players.map(p => [
        p.id, p.name, p.scholarNo, p.course, p.semester, p.mandalName, p.gender, p.phone, p.email, p.sport, p.teamRegistrationId, p.teamRole,
        p.registrationDate ? p.registrationDate.toISOString().split("T")[0] : ""
      ].map(csvEscape).join(","));
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="DSSL_Players_${new Date().toISOString().split("T")[0]}.csv"`);
      res.send("\uFEFF" + [headers.join(","), ...rows].join("\r\n"));
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Error exporting player data" });
    }
  });

  app.get("/api/analytics/team-stats", ...adminAccess, async (req, res) => {
    try {
      const [mandals, matches, playersByMandal] = await Promise.all([
        prisma.mandal.findMany(),
        prisma.match.findMany({ where: { status: "completed" } }),
        prisma.player.groupBy({ by: ["mandalName"], _count: { id: true } })
      ]);
      const playerMap = {};
      playersByMandal.forEach(p => { playerMap[p.mandalName] = p._count.id; });
      const teamMap = new Map();
      for (const mandal of mandals) {
        teamMap.set(mandal.id, {
          id: mandal.id,
          name: mandal.name,
          color: mandal.color,
          abbreviation: mandal.abbreviation,
          wins: 0,
          losses: 0,
          draws: 0,
          matchesPlayed: 0,
          points: 0,
          playerCount: playerMap[mandal.name] || 0
        });
      }
      for (const match of matches) {
        const a = teamMap.get(match.dalAId);
        const b = teamMap.get(match.dalBId);
        if (!a || !b) continue;
        a.matchesPlayed++;
        b.matchesPlayed++;
        if (match.scoreA > match.scoreB) {
          a.wins++;
          a.points += 3;
          b.losses++;
        } else if (match.scoreB > match.scoreA) {
          b.wins++;
          b.points += 3;
          a.losses++;
        } else {
          a.draws++;
          b.draws++;
          a.points++;
          b.points++;
        }
      }
      res.json(Array.from(teamMap.values()).sort((a, b) => b.points - a.points));
    } catch (error) {
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

  app.post("/api/admin/import-sheets", ...adminAccess, async (req, res) => {
    const rawUrl = req.body.sheetUrl || "https://docs.google.com/spreadsheets/d/1wko8nor4TPBssNGKIK5283AJ-zZ-Yj394v4ZcUFXjRU/export?format=csv&gid=0";
    const sheetUrl = formatGoogleSheetCSVUrl(rawUrl);

    try {
      const response = await fetch(sheetUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      if (!response.ok) throw new Error(`Google Sheet returned status ${response.status}`);
      const csvData = await response.text();
      const lines = csvData.split(/\r?\n/).filter(line => line.trim());
      if (lines.length <= 1) {
        return res.status(400).json({ error: "No data rows found in Google Sheet." });
      }

      const headers = parseCSVLine(lines[0]);
      const colMap = buildHeaderIndexMap(headers);

      let importedCount = 0;
      let updatedCount = 0;

      for (const line of lines.slice(1)) {
        const row = parseCSVLine(line);
        
        const getVal = (colKey, fallbackIdx) => {
          const idx = colMap[colKey] !== undefined ? colMap[colKey] : fallbackIdx;
          return idx !== undefined && row[idx] !== undefined ? String(row[idx]).trim() : "";
        };

        const regId = getVal("teamRegistrationId", 0);
        const role = getVal("teamRole", 1);
        const name = getVal("name", 2);
        const scholarNo = getVal("scholarNo", 3);
        const course = getVal("course", 4);
        const semester = getVal("semester", 5);
        const mandalName = getVal("mandalName", 6);
        const email = getVal("email", 7);
        const phone = getVal("phone", 8);
        const gender = getVal("gender", 9);
        const sport = getVal("sport", 10);

        if (!scholarNo || !name) continue;

        const dalId = await resolveMandalId(mandalName);
        const existing = await prisma.player.findUnique({ where: { scholarNo } });

        await prisma.player.upsert({
          where: { scholarNo },
          update: {
            name,
            course,
            semester: String(semester),
            mandalName,
            dalId,
            email,
            phone,
            gender,
            sport: sport || undefined,
            teamRegistrationId: regId,
            teamRole: role
          },
          create: {
            name,
            scholarNo,
            course,
            semester: String(semester),
            mandalName,
            dalId,
            email,
            phone,
            gender,
            sport,
            teamRegistrationId: regId,
            teamRole: role
          }
        });

        if (existing) updatedCount++;
        else importedCount++;
      }

      const totalProcessed = importedCount + updatedCount;
      res.json({
        success: true,
        count: totalProcessed,
        importedCount,
        updatedCount,
        message: `Successfully synced ${totalProcessed} player records (${importedCount} new, ${updatedCount} updated) from Google Sheet.`
      });
    } catch (error) {
      console.error("Google Sheet import error:", error);
      res.status(500).json({ error: "Failed to import data from Google Sheet: " + error.message });
    }
  });
};
