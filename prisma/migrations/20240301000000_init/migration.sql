-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pinHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "gender" TEXT NOT NULL,
    "birthDate" DATETIME,
    "deathDate" DATETIME,
    "country" TEXT,
    "city" TEXT,
    "address" TEXT,
    "occupation" TEXT,
    "workplace" TEXT,
    "maritalStatus" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PersonPhone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "label" TEXT,
    "number" TEXT NOT NULL,
    CONSTRAINT "PersonPhone_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PersonEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "label" TEXT,
    "email" TEXT NOT NULL,
    CONSTRAINT "PersonEmail_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PersonTag" (
    "personId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "PersonTag_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("personId", "tagId")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromPersonId" TEXT NOT NULL,
    "toPersonId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Relationship_fromPersonId_fkey" FOREIGN KEY ("fromPersonId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Relationship_toPersonId_fkey" FOREIGN KEY ("toPersonId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Person_lastName_firstName_idx" ON "Person"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Person_city_idx" ON "Person"("city");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "PersonPhone_number_idx" ON "PersonPhone"("number");

-- CreateIndex
CREATE INDEX "PersonPhone_personId_idx" ON "PersonPhone"("personId");

-- CreateIndex
CREATE INDEX "PersonEmail_email_idx" ON "PersonEmail"("email");

-- CreateIndex
CREATE INDEX "PersonEmail_personId_idx" ON "PersonEmail"("personId");

-- CreateIndex
CREATE INDEX "PersonTag_personId_idx" ON "PersonTag"("personId");

-- CreateIndex
CREATE INDEX "PersonTag_tagId_idx" ON "PersonTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_fromPersonId_toPersonId_type_key" ON "Relationship"("fromPersonId", "toPersonId", "type");

-- CreateIndex
CREATE INDEX "Relationship_fromPersonId_idx" ON "Relationship"("fromPersonId");

-- CreateIndex
CREATE INDEX "Relationship_toPersonId_idx" ON "Relationship"("toPersonId");

-- Insert default Settings row
INSERT INTO "Settings" ("id", "pinHash", "createdAt", "updatedAt") VALUES (1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
