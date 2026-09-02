require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const compression = require("compression");
const sharp = require("sharp");
const { isDriveConfigured, listDriveMedia } = require("./google-drive");

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

// Enable HTTP Gzip/Deflate Compression for ultra-fast response loading
// (Moved below the static uploads to prevent breaking video streaming via HTTP range requests)

// Configure Socket.IO with CORS support and per-message deflate compression for fast realtime events
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"]
  },
  perMessageDeflate: true
});

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const JWT_SECRET = process.env.JWT_SECRET || "DSSL_super_secret_jwt_key_2026_DSSL";
const SEEDED_MANDAL_NAMES = new Set([
  "Vashishta Mandal",
  "Vishwamitra Mandal",
  "Atrey Mandal",
  "Gautam Mandal",
  "Bharadwaj Mandal",
  "Jamdagni Mandal",
  "Kashyap Mandal"
]);

// Ensure upload directory exists
const uploadDir = path.join(ROOT, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded videos and images statically with full Range / Seeking support
// MUST be before compression middleware to prevent breaking video streaming
app.use("/uploads", express.static(uploadDir, {
  acceptRanges: true,
  maxAge: "7d"
}));

// Apply compression AFTER static uploads
app.use(compression());

// Multer Storage Configuration (Supports up to 50 GB videos & 150 MB photos)
const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50 GB limit
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE }
});

// ── Shared Upload Helper ─────────────────────────────────────────────────────────
// Saves media metadata. Images and videos are saved to disk in /uploads/
async function saveUploadedFile(file, title) {
  const ext = path.extname(file.originalname).toLowerCase();
  const isVideoExt = [".mp4", ".mov", ".webm", ".avi", ".mkv", ".m4v", ".3gp", ".flv", ".wmv"].includes(ext);
  const isVideo = isVideoExt || (file.mimetype && file.mimetype.startsWith("video/"));

  let mimeType = file.mimetype;
  if (!mimeType || mimeType === "application/octet-stream") {
    mimeType = isVideo ? "video/mp4" : "image/jpeg";
  }

  // For images: read optimized bytes into buffer for permanent DB storage
  let fileData = null;
  if (!isVideo) {
    // Process image directly from disk path using sharp to prevent RAM memory spikes
    try {
      const optimizedBuffer = await sharp(file.path)
        .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
        .toBuffer();
      // Overwrite the uploaded file with optimized image
      fs.writeFileSync(file.path, optimizedBuffer);
      // Keep a copy of the bytes to store permanently in Supabase
      fileData = optimizedBuffer;
    } catch (err) {
      console.warn("Image sharp optimization fallback:", err.message);
      // Fall back to raw file bytes if sharp fails
      try { fileData = fs.readFileSync(file.path); } catch (_) { }
    }
  }

  // Create database record — images store binary bytes in DB for permanent persistence
  // Videos are too large for DB storage and remain disk-only
  const media = await prisma.media.create({
    data: {
      type: isVideo ? "VIDEO" : "IMAGE",
      url: "pending",
      title: title || file.originalname,
      mimeType,
      data: fileData   // image bytes stored permanently in Supabase ✅
    }
  });

  let persistentUrl = "/uploads/" + file.filename;
  if (isDriveConfigured()) {
    try {
      const driveFile = await uploadMediaToDrive(file.path, file.originalname, mimeType);
      persistentUrl = driveFile.mediaUrl;
    } catch (error) {
      console.error("Google Drive upload failed; keeping local media copy:", error.message);
    }
  }

  const updated = await prisma.media.update({
    where: { id: media.id },
    data: { url: persistentUrl },
    select: { id: true, type: true, url: true, title: true, createdAt: true }
  });

  return updated;
}

// Middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Enable CORS Headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

// Role authorization factory
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Permission denied for this role" });
    }
    next();
  };
}

// ── Auth APIs ──────────────────────────────────────────────────────────────────

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ── Mandals (Teams) APIs ─────────────────────────────────────────────────────────

app.get("/api/mandals", async (req, res) => {
  try {
    const mandals = await prisma.mandal.findMany({
      orderBy: { id: "asc" }
    });

    const fallbackMandals = [
      { id: 1, name: "Vashishta Mandal", abbreviation: "VSM", color: "#1d4ed8", logoUrl: "DSSL_LOGO.png" },
      { id: 2, name: "Vishwamitra Mandal", abbreviation: "VWM", color: "#dc2626", logoUrl: "DSSL_LOGO.png" },
      { id: 3, name: "Atrey Mandal", abbreviation: "ATM", color: "#16a34a", logoUrl: "DSSL_LOGO.png" },
      { id: 4, name: "Gautam Mandal", abbreviation: "GTM", color: "#7c3aed", logoUrl: "DSSL_LOGO.png" },
      { id: 5, name: "Bharadwaj Mandal", abbreviation: "BHM", color: "#f59e0b", logoUrl: "DSSL_LOGO.png" },
      { id: 6, name: "Jamdagni Mandal", abbreviation: "JDM", color: "#0f766e", logoUrl: "DSSL_LOGO.png" },
      { id: 7, name: "Kashyap Mandal", abbreviation: "KSM", color: "#be185d", logoUrl: "DSSL_LOGO.png" }
    ];

    const sourceMandals = mandals.length > 0 ? mandals : fallbackMandals;
    const mapped = sourceMandals.map(d => ({
      ...d,
      logoUrl: d.logoUrl ? (d.logoUrl.startsWith('/') ? d.logoUrl : `/${d.logoUrl}`) : d.logoUrl,
      logo: d.logo ? (d.logo.startsWith('/') ? d.logo : `/${d.logo}`) : d.logo
    }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: "Error fetching mandals" });
  }
});

app.post("/api/mandals", authenticateToken, requireRole(["SUPER_ADMIN", "ORGANISER_TEAM"]), async (req, res) => {
  const { name, color, abbreviation, logoUrl } = req.body;
  try {
    const mandal = await prisma.mandal.create({
      data: { name, color, abbreviation, logoUrl: logoUrl || "DSSL_LOGO.png" }
    });
    res.status(201).json({
      ...mandal,
      logo: mandal.logoUrl.startsWith('/') ? mandal.logoUrl : `/${mandal.logoUrl}`
    });
  } catch (error) {
    res.status(500).json({ error: "Error creating mandal" });
  }
});

// ── Matches APIs ──────────────────────────────────────────────────────────────

// Helper to convert Match data fields for Client
const serializeTeam = (team, fallbackLabel = "Team") => {
  if (!team) {
    return {
      id: null,
      name: fallbackLabel,
      abbreviation: fallbackLabel,
      logoUrl: "",
      logo: ""
    };
  }

  return {
    id: team.id ?? null,
    name: team.name || fallbackLabel,
    abbreviation: team.abbreviation || team.name?.slice(0, 2).toUpperCase() || fallbackLabel,
    logoUrl: team.logoUrl || team.logo || "DSSL_LOGO.png",
    logo: team.logoUrl || team.logo || "DSSL_LOGO.png"
  };
};

const serializeMatch = (m) => {
  if (!m) return null;
  return {
    ...m,
    id: m.id.toString(), // Convert number ID to string matching scoreboard expectations
    duration: m.durationMinutes, // Map durationMinutes to duration for React scoreboard client
    startTime: m.startTime ? m.startTime.getTime() : null,
    endTime: m.endTime ? m.endTime.getTime() : null,
    timerStartedAt: m.timerStartedAt ? m.timerStartedAt.getTime() : null,
    dalA: serializeTeam(m.dalA, "Team A"),
    dalB: serializeTeam(m.dalB, "Team B"),
    matchRound: m.matchRound || "",
    description: m.description || "",
    matchupText: m.matchRound || m.description || "Scheduled Match"
  };
};

const serializePlannedMatch = (m) => {
  if (!m) return null;
  return {
    ...m,
    id: m.id.toString(),
    duration: m.durationMinutes,
    startTime: m.startTime ? m.startTime.getTime() : null,
    endTime: m.endTime ? m.endTime.getTime() : null,
    matchRound: m.matchRound || "",
    description: m.description || "",
    gender: m.gender || "Boys",
    matchupText: m.matchRound || m.description || "Scheduled Match",
    dalA: serializeTeam(m.dalA, "Team A"),
    dalB: serializeTeam(m.dalB, "Team B")
  };
};

app.get("/api/matches", async (req, res) => {
  try {
    const dbMatches = await prisma.match.findMany({
      orderBy: { createdAt: "desc" },
      include: { dalA: true, dalB: true }
    });
    res.json(dbMatches.map(serializeMatch));
  } catch (error) {
    res.status(500).json({ error: "Error fetching matches" });
  }
});

app.get("/api/planned-matches", async (req, res) => {
  try {
    const plannedMatches = await prisma.plannedMatch.findMany({
      orderBy: [
        { startTime: "asc" },
        { createdAt: "desc" }
      ],
      include: { dalA: true, dalB: true }
    });
    res.json(plannedMatches.map(serializePlannedMatch));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching planned matches" });
  }
});

app.post("/api/planned-matches", authenticateToken, requireRole(["SUPER_ADMIN", "ORGANISER_TEAM"]), async (req, res) => {
  const { sportId, sportName, venue, dalAId, dalBId, durationMinutes, startTime, endTime, description, matchRound, gender } = req.body;
  if (!sportId || !venue) {
    return res.status(400).json({ error: "Missing required planned match parameters" });
  }

  try {
    const fallbackMandals = await prisma.mandal.findMany({ orderBy: { id: "asc" }, take: 2 });
    const resolvedDalAId = dalAId ? parseInt(dalAId) : fallbackMandals[0]?.id ?? 1;
    const resolvedDalBId = dalBId ? parseInt(dalBId) : fallbackMandals[1]?.id ?? resolvedDalAId;

    const plannedMatch = await prisma.plannedMatch.create({
      data: {
        sportId: parseInt(sportId),
        sportName: sportName || "Sport",
        venue,
        dalAId: resolvedDalAId,
        dalBId: resolvedDalBId,
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : 60,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        matchRound: matchRound || "",
        description: description || "",
        gender: gender || "Boys"
      },
      include: { dalA: true, dalB: true }
    });

    const serialized = serializePlannedMatch(plannedMatch);
    io.emit("plannedMatchUpdate", serialized);
    res.status(201).json(serialized);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating planned match" });
  }
});

app.delete("/api/planned-matches/:id", authenticateToken, requireRole(["SUPER_ADMIN"]), async (req, res) => {
  const plannedMatchId = parseInt(req.params.id);
  if (isNaN(plannedMatchId)) return res.status(400).json({ error: "Invalid planned match ID" });

  try {
    await prisma.plannedMatch.delete({ where: { id: plannedMatchId } });
    io.emit("plannedMatchDelete", plannedMatchId.toString());
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error deleting planned match" });
  }
});

app.get("/api/matches/live", async (req, res) => {
  try {
    const liveMatches = await prisma.match.findMany({
      where: { status: "live" },
      include: { dalA: true, dalB: true }
    });
    res.json(liveMatches.map(serializeMatch));
  } catch (error) {
    res.status(500).json({ error: "Error fetching live matches" });
  }
});

app.get("/api/matches/upcoming", async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const dbMatches = await prisma.match.findMany({
      where: { status: "scheduled" },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { dalA: true, dalB: true }
    });
    res.json(dbMatches.map(serializeMatch));
  } catch (error) {
    res.status(500).json({ error: "Error fetching upcoming matches" });
  }
});

app.get("/api/matches/recent", async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  try {
    const dbMatches = await prisma.match.findMany({
      where: { status: "completed" },
      take: limit,
      orderBy: { endTime: "desc" },
      include: { dalA: true, dalB: true }
    });
    res.json(dbMatches.map(serializeMatch));
  } catch (error) {
    res.status(500).json({ error: "Error fetching recent matches" });
  }
});

app.get("/api/matches/stats", async (req, res) => {
  try {
    const total = await prisma.match.count();
    const live = await prisma.match.count({ where: { status: "live" } });
    const completed = await prisma.match.count({ where: { status: "completed" } });
    const scheduled = await prisma.match.count({ where: { status: "scheduled" } });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayCount = await prisma.match.count({
      where: {
        createdAt: {
          gte: startOfToday,
          lte: endOfToday
        }
      }
    });

    res.json({
      total,
      live,
      completed,
      scheduled,
      todayCount
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching match stats" });
  }
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    const mandals = await prisma.mandal.findMany();
    const completedMatches = await prisma.match.findMany({
      where: { status: "completed" }
    });

    const dalMap = new Map();
    for (const mandal of mandals) {
      dalMap.set(mandal.id, {
        dalId: mandal.id,
        dalName: mandal.name,
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        matchesPlayed: 0,
        winPercentage: 0
      });
    }

    for (const m of completedMatches) {
      const a = dalMap.get(m.dalAId);
      const b = dalMap.get(m.dalBId);
      if (!a || !b) continue;

      a.matchesPlayed++;
      b.matchesPlayed++;

      if (m.scoreA > m.scoreB) {
        a.wins++;
        a.points += 3;
        b.losses++;
      } else if (m.scoreB > m.scoreA) {
        b.wins++;
        b.points += 3;
        a.losses++;
      } else {
        a.draws++;
        a.points += 1;
        b.draws++;
        b.points += 1;
      }
    }

    const leaderboard = Array.from(dalMap.values()).map(d => ({
      ...d,
      winPercentage: d.matchesPlayed ? Math.round((d.wins / d.matchesPlayed) * 100) : 0
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ error: "Error computing leaderboard" });
  }
});

app.get("/api/medals", async (req, res) => {
  try {
    const mandals = await prisma.mandal.findMany();
    const completedMatches = await prisma.match.findMany({
      where: { status: "completed" }
    });

    const dalMap = new Map();
    for (const mandal of mandals) {
      dalMap.set(mandal.id, {
        dalId: mandal.id,
        dalName: mandal.name,
        gold: 0,
        silver: 0,
        bronze: 0,
        total: 0
      });
    }

    for (const m of completedMatches) {
      const a = dalMap.get(m.dalAId);
      const b = dalMap.get(m.dalBId);
      if (!a || !b) continue;

      if (m.scoreA > m.scoreB) {
        a.gold++;
        b.silver++;
      } else if (m.scoreB > m.scoreA) {
        b.gold++;
        a.silver++;
      } else {
        a.bronze++;
        b.bronze++;
      }
    }

    const medalTally = Array.from(dalMap.values()).map(d => ({
      ...d,
      total: d.gold + d.silver + d.bronze
    }));

    res.json(medalTally);
  } catch (error) {
    console.error("Medals error:", error);
    res.status(500).json({ error: "Error computing medals" });
  }
});


app.get("/api/matches/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid match ID" });

  try {
    const match = await prisma.match.findUnique({
      where: { id },
      include: { dalA: true, dalB: true }
    });
    if (!match) return res.status(404).json({ error: "Match not found" });
    res.json(serializeMatch(match));
  } catch (error) {
    res.status(500).json({ error: "Error fetching match" });
  }
});

// Create Match
app.post("/api/matches", authenticateToken, requireRole(["SUPER_ADMIN", "ORGANISER_TEAM"]), async (req, res) => {
  const { sportId, sportName, venue, dalAId, dalBId, durationMinutes, isLive, startTime, endTime, description, matchRound } = req.body;
  if (!sportId || !venue) {
    return res.status(400).json({ error: "Missing required match parameters" });
  }

  try {
    const fallbackMandals = await prisma.mandal.findMany({ orderBy: { id: "asc" }, take: 2 });
    const resolvedDalAId = dalAId ? parseInt(dalAId) : fallbackMandals[0]?.id ?? 1;
    const resolvedDalBId = dalBId ? parseInt(dalBId) : fallbackMandals[1]?.id ?? resolvedDalAId;

    const match = await prisma.match.create({
      data: {
        sportId: parseInt(sportId),
        sportName: sportName || "Sport",
        venue,
        dalAId: resolvedDalAId,
        dalBId: resolvedDalBId,
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : 60,
        status: isLive ? "live" : "scheduled",
        startTime: isLive ? new Date() : (startTime ? new Date(startTime) : null),
        endTime: endTime ? new Date(endTime) : null,
        timerRunning: isLive,
        timerStartedAt: isLive ? new Date() : null,
        result: "",
        matchRound: matchRound || "",
        description: description || ""
      },
      include: { dalA: true, dalB: true }
    });

    const serialized = serializeMatch(match);
    io.emit("matchUpdate", serialized);
    res.status(201).json(serialized);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating match" });
  }
});

// Update match parameters (Creator/Organiser/Super Admin)
app.patch("/api/matches/:id", authenticateToken, requireRole(["SUPER_ADMIN", "ORGANISER_TEAM"]), async (req, res) => {
  const matchId = parseInt(req.params.id);
  if (isNaN(matchId)) return res.status(400).json({ error: "Invalid match ID" });

  try {
    const updated = await prisma.match.update({
      where: { id: matchId },
      data: req.body,
      include: { dalA: true, dalB: true }
    });

    const serialized = serializeMatch(updated);
    io.emit("matchUpdate", serialized);
    res.json(serialized);
  } catch (error) {
    res.status(500).json({ error: "Error updating match details" });
  }
});

// Delete Match
app.delete("/api/matches/:id", authenticateToken, requireRole(["SUPER_ADMIN"]), async (req, res) => {
  const matchId = parseInt(req.params.id);
  if (isNaN(matchId)) return res.status(400).json({ error: "Invalid match ID" });

  try {
    await prisma.match.delete({ where: { id: matchId } });
    io.emit("matchDelete", matchId.toString());
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error deleting match" });
  }
});

// Score Update API Endpoint (for Scorer/Organiser/Admin) - Optimized for ⚡ ultra-fast execution
app.post("/api/matches/:id/score", authenticateToken, requireRole(["SUPER_ADMIN", "ORGANISER_TEAM"]), async (req, res) => {
  const matchId = parseInt(req.params.id);
  const { side, delta } = req.body; // side: "A" or "B", delta: +1, -1 etc

  if (isNaN(matchId)) return res.status(400).json({ error: "Invalid match ID" });
  if (side !== "A" && side !== "B") return res.status(400).json({ error: "Invalid side parameter (must be A or B)" });
  const valDelta = parseInt(delta) || 0;

  try {
    // Perform fast single atomic DB update without redundant read
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: "Match not found" });

    const newScoreA = side === "A" ? Math.max(0, match.scoreA + valDelta) : match.scoreA;
    const newScoreB = side === "B" ? Math.max(0, match.scoreB + valDelta) : match.scoreB;

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: {
        scoreA: newScoreA,
        scoreB: newScoreB,
      },
      include: { dalA: true, dalB: true }
    });

    const serialized = serializeMatch(updated);
    io.emit("matchUpdate", serialized);
    res.json(serialized);
  } catch (error) {
    res.status(500).json({ error: "Error updating score" });
  }
});

// Timer Status Control API Endpoint (start, pause, reset, complete)
app.post("/api/matches/:id/status", authenticateToken, requireRole(["SUPER_ADMIN", "ORGANISER_TEAM"]), async (req, res) => {
  const matchId = parseInt(req.params.id);
  const { status } = req.body; // status: "live", "paused", "completed", "scheduled", "reset_timer"

  if (isNaN(matchId)) return res.status(400).json({ error: "Invalid match ID" });

  try {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: "Match not found" });

    const now = new Date();
    let updateData = {};

    if (status === "live") {
      updateData = {
        status: "live",
        startTime: match.startTime || now,
        timerStartedAt: now,
        timerRunning: true
      };
    } else if (status === "paused") {
      let elapsed = match.elapsedSeconds;
      if (match.timerRunning && match.timerStartedAt) {
        elapsed += Math.max(0, Math.floor((now.getTime() - match.timerStartedAt.getTime()) / 1000));
      }
      updateData = {
        status: "paused",
        elapsedSeconds: elapsed,
        timerStartedAt: null,
        timerRunning: false
      };
    } else if (status === "completed") {
      let elapsed = match.elapsedSeconds;
      if (match.timerRunning && match.timerStartedAt) {
        elapsed += Math.max(0, Math.floor((now.getTime() - match.timerStartedAt.getTime()) / 1000));
      }
      updateData = {
        status: "completed",
        endTime: now,
        elapsedSeconds: elapsed,
        timerStartedAt: null,
        timerRunning: false
      };
    } else if (status === "reset_timer") {
      updateData = {
        elapsedSeconds: 0,
        timerStartedAt: match.timerRunning ? now : null
      };
    } else {
      updateData = { status };
    }

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: updateData,
      include: { dalA: true, dalB: true }
    });

    const serialized = serializeMatch(updated);
    io.emit("matchUpdate", serialized);
    res.json(serialized);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error updating match status" });
  }
});

// Detailed cricket/live scoring fields update endpoint
app.post("/api/matches/:id/cricket", authenticateToken, requireRole(["SUPER_ADMIN", "ORGANISER_TEAM"]), async (req, res) => {
  const matchId = parseInt(req.params.id);
  const { overs, wickets, currentBatsman, currentBowler, runRate, result, tournamentName, matchBanner } = req.body;

  if (isNaN(matchId)) return res.status(400).json({ error: "Invalid match ID" });

  try {
    const updated = await prisma.match.update({
      where: { id: matchId },
      data: {
        overs: overs !== undefined ? parseFloat(overs) : undefined,
        wickets: wickets !== undefined ? parseInt(wickets) : undefined,
        currentBatsman: currentBatsman !== undefined ? currentBatsman : undefined,
        currentBowler: currentBowler !== undefined ? currentBowler : undefined,
        runRate: runRate !== undefined ? parseFloat(runRate) : undefined,
        result: result !== undefined ? result : undefined,
        tournamentName: tournamentName !== undefined ? tournamentName : undefined,
        matchBanner: matchBanner !== undefined ? matchBanner : undefined,
      },
      include: { dalA: true, dalB: true }
    });

    const serialized = serializeMatch(updated);
    io.emit("matchUpdate", serialized);
    res.json(serialized);
  } catch (error) {
    res.status(500).json({ error: "Error updating detailed match score fields" });
  }
});

// ── News / Blog Posts APIs ─────────────────────────────────────────────────────

app.get("/api/news", async (req, res) => {
  try {
    const news = await prisma.newsPost.findMany({
      orderBy: { createdAt: "desc" },
      include: { author: { select: { username: true } } }
    });
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: "Error fetching news posts" });
  }
});

app.post("/api/news", authenticateToken, requireRole(["SUPER_ADMIN", "MEDIA_TEAM"]), async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content required" });
  }

  try {
    const post = await prisma.newsPost.create({
      data: {
        title,
        content,
        authorId: req.user.userId
      },
      include: { author: { select: { username: true } } }
    });

    io.emit("newsUpdate", post);
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: "Error creating news post" });
  }
});

app.delete("/api/news/:id", authenticateToken, requireRole(["SUPER_ADMIN", "MEDIA_TEAM"]), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid post ID" });

  try {
    await prisma.newsPost.delete({ where: { id } });
    io.emit("newsDelete", id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error deleting news post" });
  }
});

// ── General Purpose File Upload API ─────────────────────────────────────────────
// Any authenticated user can upload files - saves to uploads/ folder + PostgreSQL (binary)

app.post("/api/upload", authenticateToken, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file provided" });
  }

  try {
    const media = await saveUploadedFile(req.file, req.body.title);
    res.status(201).json(media);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Error saving uploaded file" });
  }
});

// ── Google Drive Video Stream Proxy ──────────────────────────────────────────
// Proxies Google Drive videos with range support so HTML5 <video> can play/seek without CORS or cookie block
app.get("/api/drive/stream/:fileId", async (req, res) => {
  const { fileId } = req.params;
  if (!fileId) return res.status(400).send("File ID required");

  // Tell intermediate proxies / Express compression not to re-encode this stream
  res.set("Cache-Control", "no-transform");
  // NOTE: Do NOT set Content-Encoding header here — absence means identity (RFC 7231).
  // Explicitly setting Content-Encoding: identity causes Chrome/Edge to reject the
  // video element with a media decode error even though the bytes are valid.

  try {
    const driveUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download`;
    const fetchHeaders = { "Accept-Encoding": "identity" };
    if (req.headers.range) {
      fetchHeaders["Range"] = req.headers.range;
    }

    const driveRes = await fetch(driveUrl, { headers: fetchHeaders });
    // 200 = full, 206 = partial — both are fine; anything else is an error
    if (driveRes.status !== 200 && driveRes.status !== 206) {
      console.error(`Drive stream: upstream returned ${driveRes.status} for fileId=${fileId}`);
      return res.status(driveRes.status).send("Failed to stream video from Google Drive");
    }

    res.status(driveRes.status);
    const passHeaders = ["content-type", "content-length", "content-range", "accept-ranges"];
    passHeaders.forEach(h => {
      const v = driveRes.headers.get(h);
      if (v) res.set(h, v);
    });

    if (!res.get("Content-Type")) {
      res.set("Content-Type", "video/mp4");
    }

    // Ensure range requests are advertised so the browser can seek
    if (!res.get("Accept-Ranges")) {
      res.set("Accept-Ranges", "bytes");
    }

    const { Readable } = require("stream");
    const nodeStream = Readable.fromWeb(driveRes.body);
    nodeStream.on("error", (err) => {
      console.error("Drive stream pipe error:", err.message);
      if (!res.headersSent) res.status(500).end();
    });
    nodeStream.pipe(res);
  } catch (error) {
    console.error("Drive stream error:", error.message);
    if (!res.headersSent) res.status(500).send("Error streaming video");
  }
});

// ── Gallery / Media Upload APIs ─────────────────────────────────────────────────

// Serve media files directly from PostgreSQL (persistent, survives server restarts)
app.get("/api/media/file/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).send("Invalid ID");

  try {
    const media = await prisma.media.findUnique({
      where: { id },
      select: { id: true, type: true, url: true, title: true, mimeType: true, data: true }
    });

    if (!media) {
      const fallbackLogo = path.join(ROOT, "DSSL_LOGO.png");
      if (fs.existsSync(fallbackLogo)) return res.sendFile(fallbackLogo);
      return res.status(404).send("Media not found");
    }

    // If binary data is present (images stored in DB), serve it with saved mimeType
    if (media.data && media.data.length > 0) {
      const contentType = media.mimeType || (media.type === "VIDEO" ? "video/mp4" : "image/jpeg");
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=604800, immutable");
      return res.send(Buffer.from(media.data));
    }

    // If the media URL points to /uploads/ and the file exists on disk, send file
    if (media.url && typeof media.url === "string") {
      if (media.url.startsWith("/uploads/")) {
        const diskPath = path.join(ROOT, media.url);
        if (fs.existsSync(diskPath)) {
          return res.sendFile(diskPath);
        }
        console.warn(`Media file missing on disk for id=${id}: ${diskPath}`);
      } else if (media.url.startsWith("http://") || media.url.startsWith("https://")) {
        return res.redirect(media.url);
      }
    }

    // Graceful fallback image for images instead of breaking with 404
    if (media.type !== "VIDEO") {
      const fallbackImage = path.join(ROOT, "dssl_banner.jpg");
      if (fs.existsSync(fallbackImage)) return res.sendFile(fallbackImage);
    }

    return res.status(404).send("Video/Media file not available on server");
  } catch (error) {
    console.error("Media serve error:", error);
    res.status(500).send("Error serving media");
  }
});

// Proxy Google Drive video streaming with Range header support
app.get("/api/drive/stream/:fileId", async (req, res) => {
  const { fileId } = req.params;
  const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${process.env.GOOGLE_DRIVE_API_KEY || "AIzaSyA85lx66T1E4QqDkVyj759HF2IM5p1JQWE"}`;

  const https = require("https");
  const rangeHeader = req.headers.range;
  const requestHeaders = { "Accept-Encoding": "identity" };
  if (rangeHeader) requestHeaders["Range"] = rangeHeader;

  https.get(driveUrl, { headers: requestHeaders }, (driveRes) => {
    const status = driveRes.statusCode;
    const headers = {
      "Content-Type": driveRes.headers["content-type"] || "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-transform",
    };
    if (driveRes.headers["content-length"]) headers["Content-Length"] = driveRes.headers["content-length"];
    if (driveRes.headers["content-range"]) headers["Content-Range"] = driveRes.headers["content-range"];
    res.writeHead(status === 206 ? 206 : 200, headers);
    driveRes.pipe(res);
  }).on("error", (err) => {
    console.error("Drive stream error:", err.message);
    if (!res.headersSent) res.status(500).send("Drive stream error");
  });
});

// List all media — merges Google Drive folder media with PostgreSQL/Supabase media
app.get("/api/media", async (req, res) => {
  try {
    let driveMedia = [];
    try {
      if (isDriveConfigured()) {
        driveMedia = await listDriveMedia();
      }
    } catch (driveErr) {
      console.warn("Google Drive fetch error:", driveErr.message);
    }

    const dbMedia = await prisma.media.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, url: true, title: true, createdAt: true, data: true }
    });

    const normalizedDb = dbMedia
      .filter(m => {
        // Skip DB video records whose upload file is missing on disk (avoids broken card)
        if (m.type === "VIDEO" && m.url && m.url.startsWith("/uploads/")) {
          const diskPath = path.join(ROOT, m.url);
          return fs.existsSync(diskPath);
        }
        return true;
      })
      .map(m => ({
        id: m.id,
        type: m.type,
        title: m.title,
        createdAt: m.createdAt,
        // If binary data is in DB, use /api/media/file/:id; otherwise use direct URL (e.g. /uploads/video.mp4 or Drive URL)
        url: (m.data && m.data.length > 0)
          ? `/api/media/file/${m.id}`
          : (m.url && m.url !== "pending" ? m.url : `/api/media/file/${m.id}`)
      }));

    // Return combined media list with Drive files at top
    res.json([...driveMedia, ...normalizedDb]);
  } catch (error) {
    console.error("Media list error:", error);
    res.status(500).json({ error: "Error fetching media list" });
  }
});

// Creator team upload endpoint
app.post("/api/media/upload", authenticateToken, requireRole(["SUPER_ADMIN", "CREATOR_TEAM"]), upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No media file provided" });
  }

  try {
    const media = await saveUploadedFile(req.file, req.body.title);
    // Return permanent /api/media/file/:id URL — served from Supabase binary data
    const response = { ...media, url: "/api/media/file/" + media.id };
    io.emit("mediaUpdate", response);
    res.status(201).json(response);
  } catch (error) {
    console.error("Media upload error:", error);
    res.status(500).json({ error: "Error saving media" });
  }
});

// Creator team delete media endpoint
app.delete("/api/media/:id", authenticateToken, requireRole(["SUPER_ADMIN", "CREATOR_TEAM"]), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid media ID" });

  try {
    // Fetch the URL before deletion so we can clean up the disk file too
    const existing = await prisma.media.findUnique({ where: { id }, select: { url: true } });
    await prisma.media.delete({ where: { id } });
    // Also remove disk file if it exists (prevents orphan files in uploads/)
    if (existing?.url?.startsWith("/uploads/")) {
      const diskPath = path.join(ROOT, existing.url);
      try {
        if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
      } catch (unlinkErr) {
        console.warn(`Could not delete disk file for media id=${id}:`, unlinkErr.message);
      }
    }
    io.emit("mediaUpdate");
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error deleting media asset" });
  }
});

require("./analytics-routes")({ app, prisma, authenticateToken, requireRole });

// ── Registration Settings APIs ────────────────────────────────────────────────
const settingsFilePath = path.join(ROOT, "registration_settings.json");

function getRegistrationSettings() {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading registration_settings.json:", err);
  }
  return {
    masterEnabled: true,
    sportsConfig: {}
  };
}

function saveRegistrationSettings(settings) {
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error saving registration_settings.json:", err);
    return false;
  }
}

app.get("/api/settings/registration", (req, res) => {
  const settings = getRegistrationSettings();
  res.json(settings);
});

app.post("/api/settings/registration", authenticateToken, requireRole(["SUPER_ADMIN", "ORGANISER_TEAM"]), (req, res) => {
  const { masterEnabled, sportsConfig } = req.body;

  const currentSettings = getRegistrationSettings();
  const updatedSettings = {
    masterEnabled: typeof masterEnabled === "boolean" ? masterEnabled : currentSettings.masterEnabled,
    sportsConfig: sportsConfig && typeof sportsConfig === "object" ? sportsConfig : currentSettings.sportsConfig,
    updatedAt: new Date().toISOString(),
    updatedBy: req.user ? req.user.username : "Admin"
  };

  const success = saveRegistrationSettings(updatedSettings);
  if (!success) {
    return res.status(500).json({ error: "Failed to save registration settings" });
  }

  io.emit("registrationSettingsUpdate", updatedSettings);
  res.json(updatedSettings);
});

// ── Semi-Final Players & Qualifiers APIs ───────────────────────────────────────
const semiFinalsFilePath = path.join(ROOT, "semifinal_players.json");

function getSemiFinalsData() {
  try {
    if (fs.existsSync(semiFinalsFilePath)) {
      const data = fs.readFileSync(semiFinalsFilePath, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading semifinal_players.json:", err);
  }
  return {};
}

function saveSemiFinalsData(data) {
  try {
    fs.writeFileSync(semiFinalsFilePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error saving semifinal_players.json:", err);
    return false;
  }
}

// Get all semi-final data or for a specific sport
app.get("/api/semifinals", (req, res) => {
  const allData = getSemiFinalsData();
  const sport = req.query.sport;
  if (sport) {
    return res.json(allData[sport] || null);
  }
  res.json(allData);
});

app.get("/api/semifinals/:sportName", (req, res) => {
  const allData = getSemiFinalsData();
  const sportName = req.params.sportName;
  res.json(allData[sportName] || null);
});

// Save / update semi-finalists for a sport (Admin/Organiser only)
app.post("/api/semifinals", authenticateToken, requireRole(["SUPER_ADMIN", "ORGANISER_TEAM"]), (req, res) => {
  const { sportName, gender, semiFinal1, semiFinal2, customQualifiers } = req.body;
  if (!sportName) {
    return res.status(400).json({ error: "Sport name is required" });
  }

  const allData = getSemiFinalsData();
  const sportEntry = {
    sportName,
    gender: gender || "Boys",
    updatedAt: new Date().toISOString(),
    updatedBy: req.user ? req.user.username : "Admin",
    semiFinal1: semiFinal1 || {
      playerA: { name: "", mandal: "", score: "", notes: "", isWinner: false },
      playerB: { name: "", mandal: "", score: "", notes: "", isWinner: false },
      matchDate: "",
      matchTime: "",
      venue: "",
      status: "Scheduled"
    },
    semiFinal2: semiFinal2 || {
      playerA: { name: "", mandal: "", score: "", notes: "", isWinner: false },
      playerB: { name: "", mandal: "", score: "", notes: "", isWinner: false },
      matchDate: "",
      matchTime: "",
      venue: "",
      status: "Scheduled"
    },
    customQualifiers: Array.isArray(customQualifiers) ? customQualifiers : []
  };

  allData[sportName] = sportEntry;
  const success = saveSemiFinalsData(allData);
  if (!success) {
    return res.status(500).json({ error: "Failed to save semi-finalists data" });
  }

  io.emit("semifinalsUpdate", { sportName, data: sportEntry });
  res.json({ success: true, sportName, data: sportEntry });
});

// Delete / reset semi-finalists for a sport
app.delete("/api/semifinals/:sportName", authenticateToken, requireRole(["SUPER_ADMIN", "ORGANISER_TEAM"]), (req, res) => {
  const sportName = req.params.sportName;
  const allData = getSemiFinalsData();
  if (allData[sportName]) {
    delete allData[sportName];
    saveSemiFinalsData(allData);
    io.emit("semifinalsUpdate", { sportName, data: null });
  }
  res.json({ success: true, sportName });
});

// ── Qualified Players Manager APIs (Prisma/PostgreSQL + JSON cache) ─────────
const qualifiedPlayersFilePath = path.join(ROOT, "qualified_players.json");

function getLocalQualifiedPlayers() {
  try {
    if (fs.existsSync(qualifiedPlayersFilePath)) {
      const content = fs.readFileSync(qualifiedPlayersFilePath, "utf8").trim();
      return content ? JSON.parse(content) : [];
    }
  } catch (e) {
    console.error("Local JSON read error:", e.message);
  }
  return [];
}

function syncLocalQualifiedPlayers(data) {
  try {
    if (Array.isArray(data)) {
      fs.writeFileSync(qualifiedPlayersFilePath, JSON.stringify(data, null, 2), "utf8");
    }
  } catch (e) {
    console.error("Local JSON sync error:", e.message);
  }
}

// Auto-sync PostgreSQL Qualified Players with local cache on server start
async function syncQualifiedPlayersOnStartup() {
  try {
    if (prisma && prisma.qualifiedPlayer) {
      const dbPlayers = await prisma.qualifiedPlayer.findMany({ orderBy: { createdAt: "desc" } });
      const localPlayers = getLocalQualifiedPlayers();

      // If local cache has entries not in DB, migrate them into DB
      for (const localP of localPlayers) {
        if (!localP.scholarNo) continue;
        const existsInDb = dbPlayers.some(dp => 
          dp.scholarNo.toLowerCase() === (localP.scholarNo || "").toLowerCase() &&
          dp.sportName.toLowerCase() === (localP.sportName || "").toLowerCase()
        );
        if (!existsInDb) {
          try {
            await prisma.qualifiedPlayer.create({
              data: {
                id: localP.id || undefined,
                sportName: localP.sportName || "Basketball",
                name: localP.name || "Athlete",
                scholarNo: localP.scholarNo,
                mandal: localP.mandal || "General",
                course: localP.course || "",
                stage: localP.stage || "Semi-Final",
                photoUrl: localP.photoUrl || ""
              }
            });
            console.log(`[Auto-Sync] Migrated local qualifier to DB: ${localP.name} (${localP.sportName})`);
          } catch (createErr) {
            console.warn(`[Auto-Sync] Could not migrate qualifier ${localP.name}:`, createErr.message);
          }
        }
      }

      // Re-fetch all and update local cache with complete DB records
      const allSynced = await prisma.qualifiedPlayer.findMany({ orderBy: { createdAt: "desc" } });
      syncLocalQualifiedPlayers(allSynced);
      console.log(`[Auto-Sync] Qualified Players synced with DB. Total: ${allSynced.length}`);
    }
  } catch (e) {
    console.warn("[Auto-Sync] Database sync warning for qualified players:", e.message);
  }
}

// Public: Get all qualified players (supports sport, search, stage, and mandal filters)
app.get("/api/qualified-players", async (req, res) => {
  const { sport, search, stage, mandal } = req.query;
  const hasFilters = (sport && sport !== "ALL") || (stage && stage !== "ALL") || (mandal && mandal !== "ALL") || (search && search.trim().length > 0);

  try {
    const where = {};
    if (sport && sport !== "ALL") {
      where.sportName = { equals: sport, mode: "insensitive" };
    }
    if (stage && stage !== "ALL") {
      where.stage = { equals: stage, mode: "insensitive" };
    }
    if (mandal && mandal !== "ALL") {
      where.mandal = { contains: mandal, mode: "insensitive" };
    }
    if (search) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { scholarNo: { contains: q, mode: "insensitive" } },
        { course: { contains: q, mode: "insensitive" } },
        { mandal: { contains: q, mode: "insensitive" } }
      ];
    }

    const list = await prisma.qualifiedPlayer.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    // ONLY update local full cache when no filters were applied! Never overwrite full cache with a filtered subset!
    if (!hasFilters) {
      syncLocalQualifiedPlayers(list);
    }
    return res.json(list);
  } catch (err) {
    console.warn("PostgreSQL read warning, using local cached qualifiers fallback:", err.message);
    
    // Resilient fallback to local cache on database hiccup
    let fallbackList = getLocalQualifiedPlayers();
    if (sport && sport !== "ALL") {
      fallbackList = fallbackList.filter(p => (p.sportName || "").toLowerCase() === sport.toLowerCase());
    }
    if (stage && stage !== "ALL") {
      fallbackList = fallbackList.filter(p => (p.stage || "").toLowerCase() === stage.toLowerCase());
    }
    if (mandal && mandal !== "ALL") {
      fallbackList = fallbackList.filter(p => (p.mandal || "").toLowerCase().includes(mandal.toLowerCase()));
    }
    if (search) {
      const q = search.toLowerCase().trim();
      fallbackList = fallbackList.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.scholarNo || "").toLowerCase().includes(q) ||
        (p.course || "").toLowerCase().includes(q) ||
        (p.mandal || "").toLowerCase().includes(q)
      );
    }
    return res.json(fallbackList);
  }
});

// Admin: Add or update a qualified player
app.post("/api/qualified-players", authenticateToken, requireRole(["SUPER_ADMIN", "ORGANISER_TEAM"]), async (req, res) => {
  try {
    const { id, sportName, name, scholarNo, mandal, course, stage, photoUrl } = req.body;
    if (!name || !scholarNo) {
      return res.status(400).json({ error: "Player name and Scholar No are required" });
    }

    const targetSport = (sportName || "Basketball").trim();
    const normalizedStage = stage === "Final" ? "Final" : "Semi-Final";
    let playerEntry = null;

    // Check if Prisma model is available on this environment
    if (prisma && prisma.qualifiedPlayer) {
      try {
        if (id) {
          const existing = await prisma.qualifiedPlayer.findUnique({ where: { id: String(id) } }).catch(() => null);
          if (existing) {
            playerEntry = await prisma.qualifiedPlayer.update({
              where: { id: String(id) },
              data: {
                sportName: targetSport,
                name: name.trim(),
                scholarNo: scholarNo.trim(),
                mandal: mandal ? mandal.trim() : existing.mandal,
                course: course ? course.trim() : existing.course,
                stage: normalizedStage,
                photoUrl: photoUrl !== undefined ? photoUrl.trim() : existing.photoUrl
              }
            });
            const allPlayers = await prisma.qualifiedPlayer.findMany({ orderBy: { createdAt: "desc" } });
            syncLocalQualifiedPlayers(allPlayers);
            io.emit("qualifiedPlayersUpdate", { players: allPlayers, updatedPlayer: playerEntry, sportName: playerEntry.sportName });
            return res.json({ success: true, player: playerEntry, total: allPlayers.length });
          }
        }

        const duplicate = await prisma.qualifiedPlayer.findFirst({
          where: {
            scholarNo: { equals: scholarNo.trim(), mode: "insensitive" },
            sportName: { equals: targetSport, mode: "insensitive" }
          }
        }).catch(() => null);

        if (duplicate) {
          playerEntry = await prisma.qualifiedPlayer.update({
            where: { id: duplicate.id },
            data: {
              sportName: targetSport,
              name: name.trim(),
              scholarNo: scholarNo.trim(),
              mandal: mandal ? mandal.trim() : duplicate.mandal,
              course: course ? course.trim() : duplicate.course,
              stage: normalizedStage,
              photoUrl: photoUrl !== undefined ? photoUrl.trim() : duplicate.photoUrl
            }
          });
        } else {
          playerEntry = await prisma.qualifiedPlayer.create({
            data: {
              sportName: targetSport,
              name: name.trim(),
              scholarNo: scholarNo.trim(),
              mandal: mandal ? mandal.trim() : "General",
              course: course ? course.trim() : "DSSL Athlete",
              stage: normalizedStage,
              photoUrl: photoUrl ? photoUrl.trim() : ""
            }
          });
        }

        const allPlayers = await prisma.qualifiedPlayer.findMany({ orderBy: { createdAt: "desc" } }).catch(() => [playerEntry]);
        syncLocalQualifiedPlayers(allPlayers);
        io.emit("qualifiedPlayersUpdate", { players: allPlayers, updatedPlayer: playerEntry, sportName: playerEntry.sportName });
        return res.json({ success: true, player: playerEntry, total: allPlayers.length });
      } catch (dbErr) {
        console.warn("DB save error, falling back to local JSON:", dbErr.message);
      }
    }

    // Local JSON resilient fallback
    let list = getLocalQualifiedPlayers();
    if (id) {
      const idx = list.findIndex(p => p.id === id || p.id === String(id));
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          sportName: targetSport,
          name: name.trim(),
          scholarNo: scholarNo.trim(),
          mandal: mandal ? mandal.trim() : list[idx].mandal,
          course: course ? course.trim() : list[idx].course,
          stage: normalizedStage,
          photoUrl: photoUrl !== undefined ? photoUrl.trim() : list[idx].photoUrl,
          updatedAt: new Date().toISOString()
        };
        playerEntry = list[idx];
      }
    }

    if (!playerEntry) {
      const existingIdx = list.findIndex(p =>
        (p.scholarNo || "").toLowerCase() === scholarNo.toLowerCase().trim() &&
        (p.sportName || "").toLowerCase() === targetSport.toLowerCase()
      );

      if (existingIdx !== -1) {
        list[existingIdx] = {
          ...list[existingIdx],
          sportName: targetSport,
          name: name.trim(),
          scholarNo: scholarNo.trim(),
          mandal: mandal ? mandal.trim() : list[existingIdx].mandal,
          course: course ? course.trim() : list[existingIdx].course,
          stage: normalizedStage,
          photoUrl: photoUrl !== undefined ? photoUrl.trim() : list[existingIdx].photoUrl,
          updatedAt: new Date().toISOString()
        };
        playerEntry = list[existingIdx];
      } else {
        playerEntry = {
          id: `qp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          sportName: targetSport,
          name: name.trim(),
          scholarNo: scholarNo.trim(),
          mandal: mandal ? mandal.trim() : "General",
          course: course ? course.trim() : "DSSL Athlete",
          stage: normalizedStage,
          photoUrl: photoUrl ? photoUrl.trim() : "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        list.unshift(playerEntry);
      }
    }

    syncLocalQualifiedPlayers(list);
    io.emit("qualifiedPlayersUpdate", { players: list, updatedPlayer: playerEntry, sportName: playerEntry.sportName });
    return res.json({ success: true, player: playerEntry, total: list.length });
  } catch (err) {
    console.error("Error saving qualified player:", err);
    res.status(500).json({ error: "Failed to save qualified player: " + err.message });
  }
});

// Admin: Delete a qualified player
app.delete("/api/qualified-players/:id", authenticateToken, requireRole(["SUPER_ADMIN", "ORGANISER_TEAM"]), async (req, res) => {
  try {
    const id = req.params.id;
    let target = null;
    let remainingList = null;

    if (prisma && prisma.qualifiedPlayer) {
      try {
        target = await prisma.qualifiedPlayer.findUnique({ where: { id } }).catch(() => null);
        if (!target) {
          target = await prisma.qualifiedPlayer.findFirst({ where: { scholarNo: id } }).catch(() => null);
        }
        if (target) {
          await prisma.qualifiedPlayer.delete({ where: { id: target.id } });
        }
        remainingList = await prisma.qualifiedPlayer.findMany({ orderBy: { createdAt: "desc" } });
        syncLocalQualifiedPlayers(remainingList);
      } catch (e) {
        console.warn("DB delete error, continuing with local cache:", e.message);
      }
    }

    if (!remainingList) {
      let list = getLocalQualifiedPlayers();
      if (!target) {
        target = list.find(p => p.id === id || p.scholarNo === id);
      }
      list = list.filter(p => p.id !== id && p.scholarNo !== id);
      syncLocalQualifiedPlayers(list);
      remainingList = list;
    }

    io.emit("qualifiedPlayersUpdate", { players: remainingList, deletedId: id, sportName: target?.sportName });
    return res.json({ success: true, total: remainingList.length });
  } catch (err) {
    console.error("Error deleting qualified player:", err);
    res.status(500).json({ error: "Failed to delete qualified player" });
  }
});


// ── Static Files & Dashboard Routes ───────────────────────────────────────────

// Static files directories with no-cache in dev for instant updates
const staticCacheOptions = {
  maxAge: 0,
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
};

// The /uploads route is already declared at the top of the file to skip compression
app.use("/admin", express.static(path.join(ROOT, "admin"), staticCacheOptions));
app.use("/scoreboard", express.static(path.join(ROOT, "scoreboard"), staticCacheOptions));
app.use("/analytics", express.static(path.join(ROOT, "analytics"), staticCacheOptions));
app.use(express.static(ROOT, staticCacheOptions));

// Default home route serving index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

// Scoreboard SPA direct links fallback
app.get("/scoreboard/*", (req, res) => {
  res.sendFile(path.join(ROOT, "scoreboard", "index.html"));
});

// Analytics SPA direct links fallback
app.get("/analytics/*", (req, res) => {
  res.sendFile(path.join(ROOT, "analytics", "index.html"));
});

// Catch-all route to serve index.html for main pages if direct links entered
app.get(["/results.html", "/match-details.html", "/about.html"], (req, res, next) => {
  const filePath = path.join(ROOT, req.path);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    next();
  }
});

// Socket.IO Events Handler
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Global error safety handlers
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

// Start Server
server.listen(PORT, () => {
  console.log(`DSSL Server running at http://localhost:${PORT}`);
  syncQualifiedPlayersOnStartup().catch(e => console.warn("Startup QP sync warning:", e.message));
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use by another process.`);
  } else {
    console.error("Server error:", err);
  }
});
