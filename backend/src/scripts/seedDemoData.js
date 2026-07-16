import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultPassword = "Password@123";
const hashedPassword = await bcrypt.hash(defaultPassword, 12);

const users = [
  ["Aarav Sharma", "aarav@example.com", ["tech", "asks_a_lot_of_questions"], "Frontend engineer exploring product roles and asking detailed system questions."],
  ["Priya Nair", "priya@example.com", ["non_tech", "communication"], "Needs help packaging operations experience into a strong resume and narrative."],
  ["Rohan Gupta", "rohan@example.com", ["tech", "good_communication"], "Backend developer preparing for mock interviews in distributed systems."],
  ["Sneha Iyer", "sneha@example.com", ["non_tech", "asks_a_lot_of_questions"], "Career switcher looking for job market guidance and confidence in networking."],
  ["Aditya Rao", "aditya@example.com", ["tech"], "Wants resume revamp support for big tech applications."],
  ["Neha Kapoor", "neha@example.com", ["tech", "good_communication"], "Needs mentor suggestions for product sense and behavioral interview practice."],
  ["Vikram Singh", "vikram@example.com", ["tech"], "Needs same-domain mentor for data engineering mock interviews."],
  ["Ananya Das", "ananya@example.com", ["non_tech", "good_communication"], "Looking for guidance on storytelling, positioning, and interview communication."],
  ["Karan Mehta", "karan@example.com", ["tech", "asks_a_lot_of_questions"], "Preparing for full-stack interview loops and wants sharp feedback."],
  ["Isha Verma", "isha@example.com", ["non_tech"], "Exploring cross-border opportunities and wants job market clarity."],
];

const mentors = [
  ["Meera Joshi", "meera@example.com", ["tech", "big_tech", "india", "resume"], "Ex-Amazon engineering manager focused on resume revamps and career storytelling."],
  ["Daniel Murphy", "daniel@example.com", ["non_tech", "communication", "ireland", "public_company"], "Strong communication coach with experience guiding candidates through hiring slowdowns."],
  ["Arjun Menon", "arjun@example.com", ["tech", "senior_developer", "mock_interview", "india"], "Senior backend developer who runs realistic mock interviews for API and system design roles."],
  ["Siobhan Kelly", "siobhan@example.com", ["tech", "communication", "ireland", "big_tech"], "Product-minded engineer from big tech, great at feedback delivery and candidate confidence."],
  ["Rahul Batra", "rahul@example.com", ["tech", "public_company", "mock_interview", "resume"], "Full-stack mentor who helps candidates tighten resumes and prepare for coding screens."],
];

const mentorTemplate = [
  { dayOfWeek: 0, hour: 10 },
  { dayOfWeek: 0, hour: 11 },
  { dayOfWeek: 1, hour: 15 },
  { dayOfWeek: 2, hour: 18 },
  { dayOfWeek: 3, hour: 10 },
  { dayOfWeek: 4, hour: 16 },
];

const userTemplate = [
  { dayOfWeek: 0, hour: 10 },
  { dayOfWeek: 1, hour: 15 },
  { dayOfWeek: 2, hour: 18 },
  { dayOfWeek: 4, hour: 16 },
];

async function upsertPerson([name, email, tags, description], role) {
  return prisma.user.upsert({
    where: { email },
    create: {
      name,
      email,
      password: hashedPassword,
      role,
      timezone: "Asia/Kolkata",
      description,
      tags,
    },
    update: {
      name,
      password: hashedPassword,
      role,
      timezone: "Asia/Kolkata",
      description,
      tags,
    },
  });
}

async function upsertTemplate(owner, role, slots) {
  if (role === "MENTOR") {
    return prisma.availabilityTemplate.upsert({
      where: { mentorId: owner.id },
      create: { mentorId: owner.id, userId: null, role, slots },
      update: { slots },
    });
  }

  return prisma.availabilityTemplate.upsert({
    where: { userId: owner.id },
    create: { userId: owner.id, mentorId: null, role, slots },
    update: { slots },
  });
}

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@mentorque.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || defaultPassword;
  const adminName = process.env.ADMIN_NAME || "Mentorque Admin";

  const adminHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      name: adminName,
      email: adminEmail,
      password: adminHash,
      role: "ADMIN",
      timezone: "Asia/Kolkata",
      description: "System administrator for mentor scheduling.",
      tags: ["admin"],
    },
    update: {
      name: adminName,
      password: adminHash,
      role: "ADMIN",
      description: "System administrator for mentor scheduling.",
      tags: ["admin"],
    },
  });

  const createdUsers = await Promise.all(users.map((user) => upsertPerson(user, "USER")));
  const createdMentors = await Promise.all(mentors.map((mentor) => upsertPerson(mentor, "MENTOR")));

  await Promise.all(createdUsers.map((user) => upsertTemplate(user, "USER", userTemplate)));
  await Promise.all(createdMentors.map((mentor) => upsertTemplate(mentor, "MENTOR", mentorTemplate)));

  console.log("Seeded 1 admin, 10 users, 5 mentors.");
  console.log(`Default user/mentor password: ${defaultPassword}`);
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
