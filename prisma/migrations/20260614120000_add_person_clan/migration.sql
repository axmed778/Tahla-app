-- Person.clanId: clan (family line) a person belongs to, independent of having a user account.
-- Lets clan-scoped searches (e.g. automatic father detection) find people who were added
-- without their own account, such as deceased ancestors.

ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "clanId" TEXT;

CREATE INDEX IF NOT EXISTS "Person_clanId_idx" ON "Person"("clanId");

DO $$ BEGIN
  ALTER TABLE "Person" ADD CONSTRAINT "Person_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Backfill: people linked to a user inherit that user's clan.
UPDATE "Person" AS p
SET "clanId" = u."clanId"
FROM "User" AS u
WHERE p."userId" = u."id"
  AND p."clanId" IS NULL
  AND u."clanId" IS NOT NULL;
