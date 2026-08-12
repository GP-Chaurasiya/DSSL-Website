const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1wko8nor4TPBssNGKIK5283AJ-zZ-Yj394v4ZcUFXjRU/export?format=csv&gid=0";

function parseCSVLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim().replace(/^"|"$/g, ''));
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim().replace(/^"|"$/g, ''));
  return result;
}

function fetchCSV(url = DEFAULT_SHEET_URL) {
  try {
    const output = execSync(`curl.exe -s -L "${url}"`, { encoding: "utf8" });
    return output;
  } catch (err) {
    console.error("curl failed:", err.message);
    throw err;
  }
}

async function importSheetData(url = DEFAULT_SHEET_URL) {
  console.log("Fetching CSV from Google Sheet...");
  const csvData = fetchCSV(url);
  const lines = csvData.split(/\r?\n/).filter(l => l.trim().length > 0);

  if (lines.length <= 1) {
    console.log("No data rows found in Google Sheet.");
    return { count: 0 };
  }

  const headers = parseCSVLine(lines[0]);
  console.log("CSV Headers:", headers);

  let importedCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 3) continue;

    const regId = row[0] || "";
    const role = row[1] || "";
    const name = row[2] || "";
    const scholarNo = row[3] || "";
    const course = row[4] || "";
    const semester = row[5] || "";
    const mandalName = row[6] || "";
    const email = row[7] || "";
    const phone = row[8] || "";
    const gender = row[9] || "";

    if (!scholarNo || !name) continue;

    const cleanMandalName = mandalName.replace(" Mandal", "").trim();
    const mandal = await prisma.mandal.findFirst({
      where: { name: { contains: cleanMandalName, mode: "insensitive" } }
    });

    const player = await prisma.player.upsert({
      where: { scholarNo: scholarNo.trim() },
      update: {
        name: name.trim(),
        course: course.trim(),
        semester: String(semester).trim(),
        mandalName: mandalName.trim(),
        dalId: mandal ? mandal.id : null,
        email: email.trim(),
        phone: phone.trim(),
        gender: gender.trim(),
        teamRegistrationId: regId.trim(),
        teamRole: role.trim()
      },
      create: {
        name: name.trim(),
        scholarNo: scholarNo.trim(),
        course: course.trim(),
        semester: String(semester).trim(),
        mandalName: mandalName.trim(),
        dalId: mandal ? mandal.id : null,
        email: email.trim(),
        phone: phone.trim(),
        gender: gender.trim(),
        teamRegistrationId: regId.trim(),
        teamRole: role.trim()
      }
    });

    console.log(`[Imported] ${player.name} (${player.scholarNo}) - ${player.mandalName}`);
    importedCount++;
  }

  console.log(`Successfully processed ${importedCount} player records from Google Sheet.`);
  return { count: importedCount };
}

if (require.main === module) {
  importSheetData()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

module.exports = { importSheetData };
