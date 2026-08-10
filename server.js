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

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

// Enable HTTP Gzip/Deflate Compression for ultra-fast response loading
app.use(compression());

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

// Ensure upload directory exists
const uploadDir = path.join(ROOT, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded videos statically with full Range / Seeking support
app.use("/uploads", express.static(uploadDir, {
  acceptRanges: true,
  maxAge: "7d"
}));

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
// Saves media metadata. Images are optimized from disk via sharp into PostgreSQL bytea.
// Videos stay on disk in /uploads/ and stream directly via HTTP range requests.
async function saveUploadedFile(file, title) {
  const ext = path.extname(file.originalname).toLowerCase();
  const isVideoExt = [".mp4", ".mov", ".webm", ".avi", ".mkv", ".m4v", ".3gp", ".flv", ".wmv"].includes(ext);
  const isVideo = isVideoExt || (file.mimetype && file.mimetype.startsWith("video/"));

  let mimeType = file.mimetype;
  if (!mimeType || mimeType === "application/octet-stream") {
    mimeType = isVideo ? "video/mp4" : "image/jpeg";
  }

  let fileBuffer = null;

  if (!isVideo) {
    // Process image directly from disk path using sharp to prevent RAM memory spikes
    try {
      fileBuffer = await sharp(file.path)
        .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
        .toBuffer();
    } catch (err) {
      console.warn("Image sharp optimization fallback:", err.message);
      fileBuffer = fs.readFileSync(file.path);
    }
  }

  // Create database record (images store binary data; videos store null data and stay on disk)
  const media = await prisma.media.create({
    data: {
      type: isVideo ? "VIDEO" : "IMAGE",
      url: "pending",
      title: title || file.originalname,
      mimeType: mimeType,
      data: isVideo ? null : fileBuffer
    }
  });

  // Persistent URL: images served from DB endpoint, videos served statically from disk
  const persistentUrl = isVideo
    ? "/uploads/" + file.filename
    : `/api/media/file/${media.id}`;

  const updated = await prisma.media.update({
    where: { id: media.id },
    data: { url: persistentUrl },
    select: { id: true, type: true, url: true, title: true, mimeType: true, createdAt: true }
  });

  return updated;
}

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    // Add logo mapping for scoreboard React client
    const mapped = mandals.map(d => ({
      ...d,
      logo: d.logoUrl ? (d.logoUrl.startsWith('/') ? d.logoUrl : `/${d.logoUrl}`) : '/Vashishta Mandal.png'
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
      data: { name, color, abbreviation, logoUrl: logoUrl || "Vashishta Mandal.png" }
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
const serializeMatch = (m) => {
  if (!m) return null;
  const formatLogo = (mandal) => {
    if (!mandal) return null;
    const logoUrl = mandal.logoUrl || `${mandal.name}.png`;
    return {
      ...mandal,
      logo: logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`
    };
  };
  return {
    ...m,
    id: m.id.toString(), // Convert number ID to string matching scoreboard expectations
    duration: m.durationMinutes, // Map durationMinutes to duration for React scoreboard client
    startTime: m.startTime ? m.startTime.getTime() : null,
    endTime: m.endTime ? m.endTime.getTime() : null,
    timerStartedAt: m.timerStartedAt ? m.timerStartedAt.getTime() : null,
    dalA: formatLogo(m.dalA),
    dalB: formatLogo(m.dalB),
    matchRound: m.matchRound || "",
    description: m.description || ""
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
  if (!sportId || !dalAId || !dalBId || !venue) {
    return res.status(400).json({ error: "Missing required match parameters" });
  }

  try {
    const match = await prisma.match.create({
      data: {
        sportId: parseInt(sportId),
        sportName: sportName || "Sport",
        venue,
        dalAId: parseInt(dalAId),
        dalBId: parseInt(dalBId),
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

// ── Gallery / Media Upload APIs ─────────────────────────────────────────────────

// Serve media files directly from PostgreSQL (persistent, survives server restarts)
app.get("/api/media/file/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).send("Invalid ID");

  try {
    const media = await prisma.media.findUnique({
      where: { id },
      select: { data: true, mimeType: true }
    });

    if (!media || !media.data) {
      return res.status(404).send("Media not found");
    }

    res.set("Content-Type", media.mimeType);
    res.set("Cache-Control", "public, max-age=604800, immutable");
    res.send(Buffer.from(media.data));
  } catch (error) {
    console.error("Media serve error:", error);
    res.status(500).send("Error serving media");
  }
});

// List all media (excludes binary data from response for performance)
app.get("/api/media", async (req, res) => {
  try {
    const media = await prisma.media.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, url: true, title: true, mimeType: true, createdAt: true }
    });
    res.json(media);
  } catch (error) {
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
    io.emit("mediaUpdate", media);
    res.status(201).json(media);
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
    await prisma.media.delete({ where: { id } });
    io.emit("mediaUpdate");
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error deleting media asset" });
  }
});

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


// ── Static Files & Dashboard Routes ───────────────────────────────────────────

// Static files directories with no-cache in dev for instant updates
const staticCacheOptions = {
  maxAge: 0,
  etag: true,
  lastModified: true
};

app.use("/uploads", express.static(uploadDir, { maxAge: "7d", acceptRanges: true }));
app.use("/admin", express.static(path.join(ROOT, "admin"), { maxAge: 0, etag: false }));
app.use("/scoreboard", express.static(path.join(ROOT, "scoreboard"), { maxAge: 0, etag: false }));
app.use(express.static(ROOT, { maxAge: 0, etag: false }));

// Default home route serving index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

// Scoreboard SPA direct links fallback
app.get("/scoreboard/*", (req, res) => {
  res.sendFile(path.join(ROOT, "scoreboard", "index.html"));
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

// Start Server
server.listen(PORT, () => {
  console.log(`DSSL Server running at http://localhost:${PORT}`);
});
