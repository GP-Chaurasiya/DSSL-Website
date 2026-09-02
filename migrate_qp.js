require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const filePath = path.join(__dirname, "qualified_players.json");

async function migrate() {
  if (!fs.existsSync(filePath)) {
    console.log("No qualified_players.json found, skipping migration.");
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw || raw === "[]") {
    console.log("qualified_players.json is empty, nothing to migrate.");
    return;
  }

  const data = JSON.parse(raw);
  let migrated = 0;
  let skipped = 0;

  for (const p of data) {
    // Skip if already exists in DB
    const exists = await prisma.qualifiedPlayer.findFirst({
      where: {
        scholarNo: p.scholarNo || "",
        sportName: p.sportName || ""
      }
    });

    if (exists) {
      console.log(`  SKIP: ${p.name} (${p.sportName}) - already in DB`);
      skipped++;
      continue;
    }

    try {
      // Try with the original id
      await prisma.qualifiedPlayer.create({
        data: {
          id: p.id || undefined,
          sportName: p.sportName || "Unknown",
          name: p.name || "",
          scholarNo: p.scholarNo || "",
          mandal: p.mandal || "General",
          course: p.course || "",
          stage: p.stage || "Semi-Final",
          photoUrl: p.photoUrl || "",
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date()
        }
      });
    } catch (idErr) {
      // If id collision, create without id (DB generates new cuid)
      await prisma.qualifiedPlayer.create({
        data: {
          sportName: p.sportName || "Unknown",
          name: p.name || "",
          scholarNo: p.scholarNo || "",
          mandal: p.mandal || "General",
          course: p.course || "",
          stage: p.stage || "Semi-Final",
          photoUrl: p.photoUrl || ""
        }
      });
    }

    console.log(`  MIGRATED: ${p.name} (${p.sportName})`);
    migrated++;
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${skipped} already existed.`);
  await prisma.$disconnect();
}

migrate().catch(async (e) => {
  console.error("Migration failed:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
