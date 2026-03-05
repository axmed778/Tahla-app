import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, pinHash: null },
    update: {},
  });

  // Master account (first user = master). Login: master@example.com / master123
  const masterHash = await bcrypt.hash("master123", 10);
  await prisma.user.upsert({
    where: { email: "master@example.com" },
    create: {
      email: "master@example.com",
      firstName: "Master",
      lastName: "Account",
      passwordHash: masterHash,
      isMaster: true,
    },
    update: {},
  });

  const alice = await prisma.person.upsert({
    where: { id: "seed-alice-id" },
    create: {
      id: "seed-alice-id",
      firstName: "Alice",
      lastName: "Smith",
      gender: "FEMALE",
      maritalStatus: "MARRIED",
      city: "New York",
      country: "USA",
      occupation: "Teacher",
      workplace: "Lincoln School",
    },
    update: {},
  });

  const bob = await prisma.person.upsert({
    where: { id: "seed-bob-id" },
    create: {
      id: "seed-bob-id",
      firstName: "Bob",
      lastName: "Smith",
      gender: "MALE",
      maritalStatus: "MARRIED",
      city: "New York",
      country: "USA",
      occupation: "Engineer",
      workplace: "Tech Corp",
    },
    update: {},
  });

  const child = await prisma.person.upsert({
    where: { id: "seed-child-id" },
    create: {
      id: "seed-child-id",
      firstName: "Charlie",
      lastName: "Smith",
      gender: "MALE",
      maritalStatus: "SINGLE",
      city: "New York",
    },
    update: {},
  });

  await prisma.personPhone.upsert({
    where: { id: "seed-phone-alice" },
    create: { id: "seed-phone-alice", personId: alice.id, number: "+1-555-0100", label: "Mobile" },
    update: {},
  });
  await prisma.personPhone.upsert({
    where: { id: "seed-phone-bob" },
    create: { id: "seed-phone-bob", personId: bob.id, number: "+1-555-0101", label: "Work" },
    update: {},
  });
  await prisma.personEmail.upsert({
    where: { id: "seed-email-alice" },
    create: { id: "seed-email-alice", personId: alice.id, email: "alice@example.com" },
    update: {},
  });

  const tagFamily = await prisma.tag.upsert({
    where: { name: "Family" },
    create: { name: "Family" },
    update: {},
  });
  await prisma.personTag.upsert({
    where: { personId_tagId: { personId: alice.id, tagId: tagFamily.id } },
    create: { personId: alice.id, tagId: tagFamily.id },
    update: {},
  });
  await prisma.personTag.upsert({
    where: { personId_tagId: { personId: bob.id, tagId: tagFamily.id } },
    create: { personId: bob.id, tagId: tagFamily.id },
    update: {},
  });

  // Alice <-> Bob spouse; Alice/Bob parent of Charlie
  await prisma.relationship.upsert({
    where: {
      fromPersonId_toPersonId_type: { fromPersonId: alice.id, toPersonId: bob.id, type: "SPOUSE" },
    },
    create: { fromPersonId: alice.id, toPersonId: bob.id, type: "SPOUSE" },
    update: {},
  });
  await prisma.relationship.upsert({
    where: {
      fromPersonId_toPersonId_type: { fromPersonId: bob.id, toPersonId: alice.id, type: "SPOUSE" },
    },
    create: { fromPersonId: bob.id, toPersonId: alice.id, type: "SPOUSE" },
    update: {},
  });
  await prisma.relationship.upsert({
    where: {
      fromPersonId_toPersonId_type: { fromPersonId: alice.id, toPersonId: child.id, type: "PARENT" },
    },
    create: { fromPersonId: alice.id, toPersonId: child.id, type: "PARENT" },
    update: {},
  });
  await prisma.relationship.upsert({
    where: {
      fromPersonId_toPersonId_type: { fromPersonId: child.id, toPersonId: alice.id, type: "CHILD" },
    },
    create: { fromPersonId: child.id, toPersonId: alice.id, type: "CHILD" },
    update: {},
  });
  await prisma.relationship.upsert({
    where: {
      fromPersonId_toPersonId_type: { fromPersonId: bob.id, toPersonId: child.id, type: "PARENT" },
    },
    create: { fromPersonId: bob.id, toPersonId: child.id, type: "PARENT" },
    update: {},
  });
  await prisma.relationship.upsert({
    where: {
      fromPersonId_toPersonId_type: { fromPersonId: child.id, toPersonId: bob.id, type: "CHILD" },
    },
    create: { fromPersonId: child.id, toPersonId: bob.id, type: "CHILD" },
    update: {},
  });

  console.log("Seed completed.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("Seed error:", e);
    prisma.$disconnect();
    process.exit(1);
  });
