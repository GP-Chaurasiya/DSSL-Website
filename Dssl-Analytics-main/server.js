require("dotenv").config();
const express = require("express");
const http = require("http");
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = __dirname;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS Headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Helper: resolve mandalId from mandalName
async function resolveMandalId(mandalName) {
  if (!mandalName) return null;
  const mandal = await prisma.mandal.findFirst({ where: { name: { contains: mandalName, mode: "insensitive" } } });
  return mandal ? mandal.id : null;
}

// POST /api/players/register — public endpoint (called by registration form)
app.post("/api/players/register", async (req, res) => {
  const {
    name, scholarNo, course, semester, phone, email, gender,
    mandalName, sport, teamRegistrationId, teamRole, players
  } = req.body;

  if (Array.isArray(players) && players.length > 0) {
    const results = [];
    const errors = [];
    for (const p of players) {
      try {
        const dalId = await resolveMandalId(p.mandalName || p.mandal);
        const existing = await prisma.player.findUnique({ where: { scholarNo: p.scholarNo } });
        if (existing) {
          errors.push({ scholarNo: p.scholarNo, error: "Scholar ID already registered" });
          continue;
        }
        const player = await prisma.player.create({
          data: {
            name: (p.name || p.fullName || "").trim(),
            scholarNo: (p.scholarNo || "").trim(),
            course: p.course || "",
            semester: String(p.semester || ""),
            phone: (p.phone || "").trim(),
            email: (p.email || "").trim(),
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
        errors.push({ scholarNo: p.scholarNo, error: err.message });
      }
    }
    return res.status(201).json({ registered: results.length, errors, players: results });
  }

  if (!name || !scholarNo) {
    return res.status(400).json({ error: "Name and Scholar ID are required" });
  }

  try {
    const existing = await prisma.player.findUnique({ where: { scholarNo: scholarNo.trim() } });
    if (existing) {
      return res.status(409).json({ error: "A player with this Scholar ID is already registered", existingId: existing.id });
    }

    const dalId = await resolveMandalId(mandalName);
    const player = await prisma.player.create({
      data: {
        name: name.trim(),
        scholarNo: scholarNo.trim(),
        course: course || "",
        semester: String(semester || ""),
        phone: (phone || "").trim(),
        email: (email || "").trim(),
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
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Scholar ID already registered" });
    }
    res.status(500).json({ error: "Error registering player" });
  }
});

// GET /api/players — list players with filters
app.get("/api/players", async (req, res) => {
  const { mandal, course, semester, gender, sport, search, page = 1, limit = 50 } = req.query;

  const where = {};
  if (mandal) where.mandalName = { contains: mandal, mode: "insensitive" };
  if (course) where.course = { contains: course, mode: "insensitive" };
  if (semester) where.semester = semester;
  if (gender) where.gender = { contains: gender, mode: "insensitive" };
  if (sport) where.sport = { contains: sport, mode: "insensitive" };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { scholarNo: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
      { course: { contains: search, mode: "insensitive" } }
    ];
  }

  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        orderBy: { registrationDate: "desc" },
        skip,
        take: parseInt(limit),
        include: { mandal: { select: { name: true, color: true } } }
      }),
      prisma.player.count({ where })
    ]);
    res.json({ players, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    console.error("Player list error:", error);
    res.status(500).json({ error: "Error fetching players" });
  }
});

// GET /api/players/:id — single player profile
app.get("/api/players/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid player ID" });

  try {
    const player = await prisma.player.findUnique({
      where: { id },
      include: { mandal: true }
    });
    if (!player) return res.status(404).json({ error: "Player not found" });
    res.json(player);
  } catch (error) {
    res.status(500).json({ error: "Error fetching player" });
  }
});

// ── Analytics APIs ────────────────────────────────────────────────────────────

// GET /api/analytics/overview — KPI summary cards
app.get("/api/analytics/overview", async (req, res) => {
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
        live: matchSummary["live"] || 0,
        scheduled: matchSummary["scheduled"] || 0,
        completed: matchSummary["completed"] || 0
      }
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    res.status(500).json({ error: "Error computing analytics overview" });
  }
});

// GET /api/analytics/mandal-distribution
app.get("/api/analytics/mandal-distribution", async (req, res) => {
  try {
    const data = await prisma.player.groupBy({
      by: ["mandalName"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } }
    });
    const total = data.reduce((s, d) => s + d._count.id, 0);
    res.json(data.map(d => ({
      mandal: d.mandalName || "Unknown",
      count: d._count.id,
      percentage: total > 0 ? Math.round((d._count.id / total) * 100) : 0
    })));
  } catch (error) {
    res.status(500).json({ error: "Error computing mandal distribution" });
  }
});

// GET /api/analytics/gender-distribution
app.get("/api/analytics/gender-distribution", async (req, res) => {
  try {
    const data = await prisma.player.groupBy({
      by: ["gender"],
      _count: { id: true }
    });
    const total = data.reduce((s, d) => s + d._count.id, 0);
    res.json({ total, distribution: data.map(d => ({
      gender: d.gender || "Unknown",
      count: d._count.id,
      percentage: total > 0 ? Math.round((d._count.id / total) * 100) : 0
    }))});
  } catch (error) {
    res.status(500).json({ error: "Error computing gender distribution" });
  }
});

// GET /api/analytics/course-distribution
app.get("/api/analytics/course-distribution", async (req, res) => {
  try {
    const data = await prisma.player.groupBy({
      by: ["course"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } }
    });
    const total = data.reduce((s, d) => s + d._count.id, 0);
    res.json(data.map(d => ({
      course: d.course || "Unknown",
      count: d._count.id,
      percentage: total > 0 ? Math.round((d._count.id / total) * 100) : 0
    })));
  } catch (error) {
    res.status(500).json({ error: "Error computing course distribution" });
  }
});

// GET /api/analytics/semester-distribution
app.get("/api/analytics/semester-distribution", async (req, res) => {
  try {
    const data = await prisma.player.groupBy({
      by: ["semester"],
      _count: { id: true },
      orderBy: { semester: "asc" }
    });
    const total = data.reduce((s, d) => s + d._count.id, 0);
    res.json(data.map(d => ({
      semester: d.semester || "Unknown",
      count: d._count.id,
      percentage: total > 0 ? Math.round((d._count.id / total) * 100) : 0
    })));
  } catch (error) {
    res.status(500).json({ error: "Error computing semester distribution" });
  }
});

// GET /api/analytics/sport-distribution
app.get("/api/analytics/sport-distribution", async (req, res) => {
  try {
    const data = await prisma.player.groupBy({
      by: ["sport"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      where: { sport: { not: "" } }
    });
    const total = data.reduce((s, d) => s + d._count.id, 0);
    res.json(data.map(d => ({
      sport: d.sport,
      count: d._count.id,
      percentage: total > 0 ? Math.round((d._count.id / total) * 100) : 0
    })));
  } catch (error) {
    res.status(500).json({ error: "Error computing sport distribution" });
  }
});

// GET /api/analytics/registration-trend?days=30
app.get("/api/analytics/registration-trend", async (req, res) => {
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

// GET /api/analytics/cross/mandal-gender — cross-tabulation
app.get("/api/analytics/cross/mandal-gender", async (req, res) => {
  try {
    const data = await prisma.player.groupBy({
      by: ["mandalName", "gender"],
      _count: { id: true }
    });

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

// GET /api/analytics/cross/course-gender
app.get("/api/analytics/cross/course-gender", async (req, res) => {
  try {
    const data = await prisma.player.groupBy({
      by: ["course", "gender"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } }
    });

    const courses = [...new Set(data.map(d => d.course || "Unknown"))].slice(0, 15);
    const genders = [...new Set(data.map(d => d.gender || "Unknown"))];

    const result = courses.map(course => {
      const row = { course };
      genders.forEach(g => {
        const found = data.find(d => (d.course || "Unknown") === course && (d.gender || "Unknown") === g);
        row[g] = found ? found._count.id : 0;
      });
      row.total = genders.reduce((sum, g) => sum + (row[g] || 0), 0);
      return row;
    });

    res.json({ genders, data: result.sort((a, b) => b.total - a.total) });
  } catch (error) {
    res.status(500).json({ error: "Error computing course-gender cross analysis" });
  }
});

// GET /api/analytics/export?format=csv&mandal=...&course=...
app.get("/api/analytics/export", async (req, res) => {
  const { mandal, course, semester, gender, sport, search, format = "csv" } = req.query;

  const where = {};
  if (mandal) where.mandalName = { contains: mandal, mode: "insensitive" };
  if (course) where.course = { contains: course, mode: "insensitive" };
  if (semester) where.semester = semester;
  if (gender) where.gender = { contains: gender, mode: "insensitive" };
  if (sport) where.sport = { contains: sport, mode: "insensitive" };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { scholarNo: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } }
    ];
  }

  try {
    const players = await prisma.player.findMany({
      where,
      orderBy: { registrationDate: "desc" },
      take: 5000
    });

    if (format === "csv") {
      const headers = ["ID", "Name", "Scholar ID", "Course", "Semester", "Mandal", "Gender", "Phone", "Email", "Sport", "Team ID", "Role", "Registration Date"];
      const rows = players.map(p => [
        p.id, p.name, p.scholarNo, p.course, p.semester, p.mandalName,
        p.gender, p.phone, p.email, p.sport, p.teamRegistrationId, p.teamRole,
        p.registrationDate ? p.registrationDate.toISOString().split("T")[0] : ""
      ].map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(","));

      const csv = [headers.join(","), ...rows].join("\r\n");
      const bom = "\uFEFF";
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="DSSL_Players_${new Date().toISOString().split("T")[0]}.csv"`);
      res.send(bom + csv);
    } else {
      res.json(players);
    }
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ error: "Error exporting player data" });
  }
});

// GET /api/analytics/team-stats — teams analytics from matches
app.get("/api/analytics/team-stats", async (req, res) => {
  try {
    const [mandals, matches, playersByMandal] = await Promise.all([
      prisma.mandal.findMany(),
      prisma.match.findMany({ where: { status: "completed" } }),
      prisma.player.groupBy({ by: ["mandalName"], _count: { id: true } })
    ]);

    const pMap = {};
    playersByMandal.forEach(p => { pMap[p.mandalName] = p._count.id; });

    const dalMap = new Map();
    for (const mandal of mandals) {
      dalMap.set(mandal.id, {
        id: mandal.id,
        name: mandal.name,
        color: mandal.color,
        abbreviation: mandal.abbreviation,
        wins: 0, losses: 0, draws: 0, matchesPlayed: 0, points: 0,
        playerCount: pMap[mandal.name] || 0
      });
    }

    for (const m of matches) {
      const a = dalMap.get(m.dalAId);
      const b = dalMap.get(m.dalBId);
      if (!a || !b) continue;
      a.matchesPlayed++; b.matchesPlayed++;
      if (m.scoreA > m.scoreB) { a.wins++; a.points += 3; b.losses++; }
      else if (m.scoreB > m.scoreA) { b.wins++; b.points += 3; a.losses++; }
      else { a.draws++; a.points++; b.draws++; b.points++; }
    }

    res.json(Array.from(dalMap.values()).sort((a, b) => b.points - a.points));
  } catch (error) {
    res.status(500).json({ error: "Error computing team stats" });
  }
});

// POST /api/admin/import-sheets — Sync player data directly from Google Sheets
app.post("/api/admin/import-sheets", async (req, res) => {
  const { sheetUrl } = req.body;
  try {
    const { importSheetData } = require("./importSheet");
    const result = await importSheetData(sheetUrl);
    res.json({ success: true, count: result.count, message: `Successfully imported ${result.count} player records from Google Sheet.` });
  } catch (error) {
    console.error("Google Sheet import error:", error);
    res.status(500).json({ error: "Failed to import data from Google Sheet: " + error.message });
  }
});

// Serve static assets from project root
app.use(express.static(ROOT));

app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

// Global error safety handlers
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

// Start Server
server.listen(PORT, HOST, () => {
  console.log(`DSSL Analytics Server running at http://${HOST}:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use by another process.`);
  } else {
    console.error("Server error:", err);
  }
});
