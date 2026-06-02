/**
 * Pre-deploy test: wipe DB, seed test users and data, then run build.
 * Run: npx tsx scripts/predeploy-test.ts
 *
 * Test accounts after run:
 * - master@test.com / test123 (master, has person linked)
 * - alice@test.com / test123 (has person linked, friends with master)
 * - bob@test.com / test123 (has person linked, sent friend request to master)
 */

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { execSync } from "child_process";
import path from "path";

const prisma = new PrismaClient();
const passwordHash = bcrypt.hashSync("test123", 10);

function syncDatabase() {
  console.log("Resetting and syncing database to current schema (db push)...");
  execSync("npx prisma db push --force-reset --accept-data-loss", {
    cwd: path.resolve(process.cwd()),
    stdio: "inherit",
  });
  console.log("Database synced.");
}

async function wipeDatabase() {
  console.log("Wiping database...");
  const deleteOps: Array<() => Promise<unknown>> = [
    () => prisma.notification.deleteMany({}),
    () => prisma.eventParticipant.deleteMany({}),
    () => prisma.event.deleteMany({}),
    () => prisma.groupApplication.deleteMany({}),
    () => prisma.groupMember.deleteMany({}),
    () => prisma.postImage.deleteMany({}),
    () => prisma.postComment.deleteMany({}),
    () => prisma.postRelatedPerson.deleteMany({}),
    () => prisma.post.deleteMany({}),
    () => prisma.group.deleteMany({}),
    () => prisma.friendship.deleteMany({}),
    () => prisma.friendRequest.deleteMany({}),
    () => prisma.message.deleteMany({}),
    () => prisma.conversationParticipant.deleteMany({}),
    () => prisma.conversation.deleteMany({}),
    () => prisma.relationship.deleteMany({}),
    () => prisma.personTag.deleteMany({}),
    () => prisma.personPhone.deleteMany({}),
    () => prisma.personEmail.deleteMany({}),
    () => prisma.person.deleteMany({}),
    () => prisma.tag.deleteMany({}),
    () => prisma.settings.deleteMany({}),
    () => prisma.user.deleteMany({}),
  ];
  for (const op of deleteOps) {
    try {
      await op();
    } catch (e: unknown) {
      const err = e as { code?: string; meta?: { modelName?: string } };
      if (err?.code === "P2021") {
        console.warn(`  (skipping ${err?.meta?.modelName ?? "table"} - not present)`);
      } else {
        throw e;
      }
    }
  }
  console.log("Database wiped.");
}

async function seed() {
  console.log("Seeding test data...");

  await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });

  // User 1: Master (first user = master)
  const master = await prisma.user.create({
    data: {
      email: "master@test.com",
      firstName: "Master",
      lastName: "User",
      passwordHash,
      isMaster: true,
    },
  });

  // User 2: Alice
  const aliceUser = await prisma.user.create({
    data: {
      email: "alice@test.com",
      firstName: "Alice",
      lastName: "Smith",
      passwordHash,
      isMaster: false,
    },
  });

  // User 3: Bob
  const bobUser = await prisma.user.create({
    data: {
      email: "bob@test.com",
      firstName: "Bob",
      lastName: "Jones",
      passwordHash,
      isMaster: false,
    },
  });

  // Persons linked to users (so they can use directory, tree, friends)
  const masterPerson = await prisma.person.create({
    data: {
      firstName: "Master",
      lastName: "User",
      gender: "MALE",
      maritalStatus: "SINGLE",
      country: "Azerbaijan",
      city: "Baku",
      userId: master.id,
    },
  });

  const alicePerson = await prisma.person.create({
    data: {
      firstName: "Alice",
      lastName: "Smith",
      gender: "FEMALE",
      maritalStatus: "MARRIED",
      country: "United States",
      city: "New York",
      userId: aliceUser.id,
    },
  });

  const bobPerson = await prisma.person.create({
    data: {
      firstName: "Bob",
      lastName: "Jones",
      gender: "MALE",
      maritalStatus: "SINGLE",
      country: "Germany",
      city: "Berlin",
      userId: bobUser.id,
    },
  });

  // Link users to their persons (already set via userId above)
  await prisma.user.update({
    where: { id: master.id },
    data: {}, // person link is via Person.userId
  });

  // Tag and relationships
  const tag = await prisma.tag.create({ data: { name: "Family" } });
  await prisma.personTag.create({
    data: { personId: masterPerson.id, tagId: tag.id },
  });

  // ---- Pro Max Family Tree: ~40 people, pyramid 8→4→2→1 (main user = masterPerson at bottom) ----
  const mainUser = masterPerson; // MAIN USER: tree is viewed FROM this person (bottom of pyramid)
  const parent1 = await prisma.person.create({
    data: { firstName: "John", lastName: "Master", gender: "MALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" },
  });
  const parent2 = await prisma.person.create({
    data: { firstName: "Mary", lastName: "Master", gender: "FEMALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" },
  });
  const gp1 = await prisma.person.create({
    data: { firstName: "James", lastName: "Master", gender: "MALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" },
  });
  const gp2 = await prisma.person.create({
    data: { firstName: "Helen", lastName: "Master", gender: "FEMALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" },
  });
  const gp3 = await prisma.person.create({
    data: { firstName: "Robert", lastName: "Smith", gender: "MALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Sumgait" },
  });
  const gp4 = await prisma.person.create({
    data: { firstName: "Elizabeth", lastName: "Smith", gender: "FEMALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Sumgait" },
  });
  const ggp = await Promise.all([
    prisma.person.create({ data: { firstName: "William", lastName: "Master", gender: "MALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Margaret", lastName: "Master", gender: "FEMALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Thomas", lastName: "Brown", gender: "MALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Anne", lastName: "Brown", gender: "FEMALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Richard", lastName: "Smith", gender: "MALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Ganja" } }),
    prisma.person.create({ data: { firstName: "Catherine", lastName: "Smith", gender: "FEMALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Ganja" } }),
    prisma.person.create({ data: { firstName: "Joseph", lastName: "Wilson", gender: "MALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Sumgait" } }),
    prisma.person.create({ data: { firstName: "Patricia", lastName: "Wilson", gender: "FEMALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Sumgait" } }),
  ]);
  const spouses = await Promise.all([
    prisma.person.create({ data: { firstName: "Elena", lastName: "Master", gender: "FEMALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "David", lastName: "Brown", gender: "MALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Susan", lastName: "Smith", gender: "FEMALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Ganja" } }),
    prisma.person.create({ data: { firstName: "Michael", lastName: "Wilson", gender: "MALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Sumgait" } }),
  ]);
  const siblings = await Promise.all([
    prisma.person.create({ data: { firstName: "Sarah", lastName: "Master", gender: "FEMALE", maritalStatus: "SINGLE", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "David", lastName: "Master", gender: "MALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Linda", lastName: "Master", gender: "FEMALE", maritalStatus: "SINGLE", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Paul", lastName: "Master", gender: "MALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Emma", lastName: "Smith", gender: "FEMALE", maritalStatus: "SINGLE", country: "Azerbaijan", city: "Sumgait" } }),
    prisma.person.create({ data: { firstName: "George", lastName: "Smith", gender: "MALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Sumgait" } }),
    prisma.person.create({ data: { firstName: "Rose", lastName: "Master", gender: "FEMALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Peter", lastName: "Master", gender: "MALE", maritalStatus: "SINGLE", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Julia", lastName: "Smith", gender: "FEMALE", maritalStatus: "SINGLE", country: "Azerbaijan", city: "Sumgait" } }),
    prisma.person.create({ data: { firstName: "Frank", lastName: "Master", gender: "MALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Nina", lastName: "Master", gender: "FEMALE", maritalStatus: "SINGLE", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Oliver", lastName: "Master", gender: "MALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Sophie", lastName: "Smith", gender: "FEMALE", maritalStatus: "SINGLE", country: "Azerbaijan", city: "Sumgait" } }),
  ]);
  const extra = await Promise.all([
    prisma.person.create({ data: { firstName: "Victor", lastName: "Master", gender: "MALE", maritalStatus: "SINGLE", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Clara", lastName: "Master", gender: "FEMALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Leo", lastName: "Smith", gender: "MALE", maritalStatus: "SINGLE", country: "Azerbaijan", city: "Sumgait" } }),
    prisma.person.create({ data: { firstName: "Maya", lastName: "Smith", gender: "FEMALE", maritalStatus: "SINGLE", country: "Azerbaijan", city: "Sumgait" } }),
    prisma.person.create({ data: { firstName: "Henry", lastName: "Master", gender: "MALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Grace", lastName: "Master", gender: "FEMALE", maritalStatus: "SINGLE", country: "Azerbaijan", city: "Baku" } }),
    prisma.person.create({ data: { firstName: "Daniel", lastName: "Smith", gender: "MALE", maritalStatus: "MARRIED", country: "Azerbaijan", city: "Ganja" } }),
    prisma.person.create({ data: { firstName: "Ivy", lastName: "Wilson", gender: "FEMALE", maritalStatus: "SINGLE", country: "Azerbaijan", city: "Sumgait" } }),
  ]);
  const rels: Array<{ fromPersonId: string; toPersonId: string; type: string }> = [];
  function addParentChild(parentId: string, childId: string) {
    rels.push({ fromPersonId: parentId, toPersonId: childId, type: "PARENT" });
    rels.push({ fromPersonId: childId, toPersonId: parentId, type: "CHILD" });
  }
  addParentChild(parent1.id, mainUser.id);
  addParentChild(parent2.id, mainUser.id);
  addParentChild(gp1.id, parent1.id);
  addParentChild(gp2.id, parent1.id);
  addParentChild(gp3.id, parent2.id);
  addParentChild(gp4.id, parent2.id);
  addParentChild(ggp[0].id, gp1.id);
  addParentChild(ggp[1].id, gp1.id);
  addParentChild(ggp[2].id, gp2.id);
  addParentChild(ggp[3].id, gp2.id);
  addParentChild(ggp[4].id, gp3.id);
  addParentChild(ggp[5].id, gp3.id);
  addParentChild(ggp[6].id, gp4.id);
  addParentChild(ggp[7].id, gp4.id);
  rels.push({ fromPersonId: parent1.id, toPersonId: parent2.id, type: "SPOUSE" }, { fromPersonId: parent2.id, toPersonId: parent1.id, type: "SPOUSE" });
  rels.push({ fromPersonId: gp1.id, toPersonId: gp2.id, type: "SPOUSE" }, { fromPersonId: gp2.id, toPersonId: gp1.id, type: "SPOUSE" });
  rels.push({ fromPersonId: gp3.id, toPersonId: gp4.id, type: "SPOUSE" }, { fromPersonId: gp4.id, toPersonId: gp3.id, type: "SPOUSE" });
  for (let i = 0; i < 4; i++) {
    rels.push({ fromPersonId: ggp[i * 2].id, toPersonId: ggp[i * 2 + 1].id, type: "SPOUSE" });
    rels.push({ fromPersonId: ggp[i * 2 + 1].id, toPersonId: ggp[i * 2].id, type: "SPOUSE" });
  }
  for (const s of siblings) {
    rels.push({ fromPersonId: mainUser.id, toPersonId: s.id, type: "SIBLING" }, { fromPersonId: s.id, toPersonId: mainUser.id, type: "SIBLING" });
  }
  for (const e of extra) {
    rels.push({ fromPersonId: parent1.id, toPersonId: e.id, type: "SIBLING" }, { fromPersonId: e.id, toPersonId: parent1.id, type: "SIBLING" });
  }
  for (const r of rels) {
    await prisma.relationship.upsert({
      where: { fromPersonId_toPersonId_type: { fromPersonId: r.fromPersonId, toPersonId: r.toPersonId, type: r.type } },
      create: r,
      update: {},
    });
  }

  await prisma.relationship.upsert({
    where: { fromPersonId_toPersonId_type: { fromPersonId: masterPerson.id, toPersonId: alicePerson.id, type: "OTHER" } },
    create: { fromPersonId: masterPerson.id, toPersonId: alicePerson.id, type: "OTHER", label: "friend" },
    update: {},
  });
  await prisma.relationship.upsert({
    where: { fromPersonId_toPersonId_type: { fromPersonId: alicePerson.id, toPersonId: masterPerson.id, type: "OTHER" } },
    create: { fromPersonId: alicePerson.id, toPersonId: masterPerson.id, type: "OTHER", label: "friend" },
    update: {},
  });

  // Friends: Master <-> Alice
  const [id1, id2] = master.id < aliceUser.id ? [master.id, aliceUser.id] : [aliceUser.id, master.id];
  await prisma.friendship.create({
    data: { userAId: id1, userBId: id2 },
  });

  // Friend request: Bob -> Master (pending) -> creates notification for master
  await prisma.friendRequest.create({
    data: { fromUserId: bobUser.id, toUserId: master.id, status: "PENDING" },
  });
  await prisma.notification.create({
    data: {
      userId: master.id,
      type: "FRIEND_REQUEST",
      actorId: bobUser.id,
      meta: JSON.stringify({ friendRequestId: "pending" }),
    },
  });

  // Event: Master created, Alice invited
  const event = await prisma.event.create({
    data: {
      name: "Family Reunion",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      place: "Baku",
      createdById: master.id,
    },
  });
  await prisma.eventParticipant.createMany({
    data: [
      { eventId: event.id, userId: master.id },
      { eventId: event.id, userId: aliceUser.id },
    ],
  });
  await prisma.notification.create({
    data: {
      userId: aliceUser.id,
      type: "EVENT_INVITE",
      actorId: master.id,
      meta: JSON.stringify({ eventId: event.id, eventName: event.name }),
    },
  });

  // Group: Master created, Alice is member
  const group = await prisma.group.create({
    data: { name: "Test Family", description: "Pre-deploy test group", isPrivate: false, createdById: master.id },
  });
  await prisma.groupMember.createMany({
    data: [
      { groupId: group.id, userId: master.id, role: "ADMIN" },
      { groupId: group.id, userId: aliceUser.id, role: "MEMBER" },
    ],
  });

  // Post: Master wrote a post
  const post = await prisma.post.create({
    data: { type: "OTHER", content: "Pre-deploy test post.", authorId: master.id },
  });
  await prisma.postComment.create({
    data: { postId: post.id, authorId: aliceUser.id, content: "Test comment" },
  });
  await prisma.notification.create({
    data: {
      userId: master.id,
      type: "FEED_COMMENT",
      actorId: aliceUser.id,
      meta: JSON.stringify({ postId: post.id }),
    },
  });

  // Conversation + message: Alice sent message to Master
  const conv = await prisma.conversation.create({ data: {} });
  await prisma.conversationParticipant.createMany({
    data: [
      { conversationId: conv.id, userId: master.id },
      { conversationId: conv.id, userId: aliceUser.id },
    ],
  });
  await prisma.message.create({
    data: { conversationId: conv.id, senderId: aliceUser.id, content: "Hello Master!" },
  });
  await prisma.notification.create({
    data: {
      userId: master.id,
      type: "NEW_MESSAGE",
      actorId: aliceUser.id,
      meta: JSON.stringify({ conversationId: conv.id }),
    },
  });

  // "Added as relative" notification: Bob added Master's person as relative (simulate)
  await prisma.relationship.create({
    data: { fromPersonId: bobPerson.id, toPersonId: masterPerson.id, type: "OTHER", label: "cousin" },
  });
  await prisma.relationship.create({
    data: { fromPersonId: masterPerson.id, toPersonId: bobPerson.id, type: "OTHER", label: "cousin" },
  });
  await prisma.notification.create({
    data: {
      userId: master.id,
      type: "ADDED_AS_RELATIVE",
      actorId: bobUser.id,
      meta: JSON.stringify({ personId: masterPerson.id }),
    },
  });

  console.log("Seed done.");
  console.log("");
  console.log("Test accounts (password for all: test123):");
  console.log("  master@test.com  (master)");
  console.log("  alice@test.com   (friend of master)");
  console.log("  bob@test.com     (sent friend request to master)");
  console.log("");
  console.log("TREE PRO MAX: 40 people in family tree. MAIN USER (root of tree, bottom of pyramid):");
  console.log("  Master User (master@test.com's profile) — open Family tree to see 8→4→2→1 ancestor view.");
  console.log("");
}

function runBuild() {
  console.log("Running build...");
  const root = path.resolve(process.cwd());
  execSync("npm run build", {
    cwd: root,
    stdio: "inherit",
  });
  console.log("Build succeeded.");
}

async function main() {
  syncDatabase();
  await wipeDatabase();
  await seed();
  runBuild();
}

main()
  .then(() => {
    console.log("\nPre-deploy test passed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Pre-deploy test failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());