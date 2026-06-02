-- Relationship requests (request/approval flow) (Postgres)

DO $$ BEGIN
  CREATE TYPE "RelationshipType" AS ENUM ('PARENT', 'CHILD', 'SIBLING', 'SPOUSE', 'PARTNER', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "RelationshipRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "type" "RelationshipType" NOT NULL,
  "label" TEXT,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RelationshipRequest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RelationshipRequest_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RelationshipRequest_fromUserId_idx" ON "RelationshipRequest"("fromUserId");
CREATE INDEX IF NOT EXISTS "RelationshipRequest_toUserId_idx" ON "RelationshipRequest"("toUserId");
CREATE INDEX IF NOT EXISTS "RelationshipRequest_toUserId_status_idx" ON "RelationshipRequest"("toUserId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "RelationshipRequest_fromUserId_toUserId_status_key" ON "RelationshipRequest"("fromUserId", "toUserId", "status");

