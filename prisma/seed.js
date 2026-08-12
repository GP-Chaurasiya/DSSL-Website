const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const MANDALS = [
  { id: 1, name: "Vashishta Mandal", color: "#E53E3E", abbreviation: "VS", logoUrl: "Vashishta Mandal.png" },
  { id: 2, name: "Vishwamitra Mandal", color: "#3182CE", abbreviation: "VM", logoUrl: "Vishwamitra Mandal.png" },
  { id: 3, name: "Atrey Mandal", color: "#38A169", abbreviation: "AT", logoUrl: "Atrey Mandal.png" },
  { id: 4, name: "Gautam Mandal", color: "#D69E2E", abbreviation: "GM", logoUrl: "Gautam Mandal.png" },
  { id: 5, name: "Bharadwaj Mandal", color: "#805AD5", abbreviation: "BM", logoUrl: "Bharadwaj Mandal.png" },
  { id: 6, name: "Jamdagni Mandal", color: "#DD6B20", abbreviation: "JM", logoUrl: "Jamdagni Mandal.png" },
  { id: 7, name: "Kashyap Mandal", color: "#2C7A7B", abbreviation: "KM", logoUrl: "Kashyap Mandal.png" },
];

async function main() {
  console.log("Seeding started...");

  // Seed Mandals
  for (const mandal of MANDALS) {
    await prisma.mandal.upsert({
      where: { id: mandal.id },
      update: {
        name: mandal.name,
        color: mandal.color,
        abbreviation: mandal.abbreviation,
        logoUrl: mandal.logoUrl,
      },
      create: {
        id: mandal.id,
        name: mandal.name,
        color: mandal.color,
        abbreviation: mandal.abbreviation,
        logoUrl: mandal.logoUrl,
      },
    });
  }
  console.log("Mandals seeded.");

  // Seed Admin Users
  const roles = [
    { username: "admin", role: "SUPER_ADMIN", password: "admin123" },
    { username: "organiser", role: "ORGANISER_TEAM", password: "organiser123" },
    { username: "creator", role: "CREATOR_TEAM", password: "creator123" },
    { username: "media", role: "MEDIA_TEAM", password: "media123" },
  ];

  for (const user of roles) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        role: user.role,
        passwordHash: passwordHash,
      },
      create: {
        username: user.username,
        role: user.role,
        passwordHash: passwordHash,
      },
    });
  }
  console.log("Admin users seeded.");
  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
