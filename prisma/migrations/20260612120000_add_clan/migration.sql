-- Clan (family line) + User.clanId relation (Postgres)

CREATE TABLE IF NOT EXISTS "Clan" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "nameNormalized" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Clan_nameNormalized_key" ON "Clan"("nameNormalized");
CREATE INDEX IF NOT EXISTS "Clan_nameNormalized_idx" ON "Clan"("nameNormalized");

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clanId" TEXT;

CREATE INDEX IF NOT EXISTS "User_clanId_idx" ON "User"("clanId");

DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
