-- Add per-field privacy controls (Postgres)

-- Enum for per-field visibility
DO $$ BEGIN
  CREATE TYPE "VisibilityLevel" AS ENUM ('EVERYONE', 'FRIENDS', 'FAMILY', 'ONLY_ME');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add visibility to contact fields (default EVERYONE for existing rows)
ALTER TABLE "PersonPhone" ADD COLUMN IF NOT EXISTS "visibility" "VisibilityLevel" NOT NULL DEFAULT 'EVERYONE';
ALTER TABLE "PersonEmail" ADD COLUMN IF NOT EXISTS "visibility" "VisibilityLevel" NOT NULL DEFAULT 'EVERYONE';

-- One privacy settings row per person
CREATE TABLE IF NOT EXISTS "PersonPrivacySettings" (
  "personId" TEXT NOT NULL PRIMARY KEY,
  "birthDateVisibility" "VisibilityLevel" NOT NULL DEFAULT 'EVERYONE',
  "locationVisibility" "VisibilityLevel" NOT NULL DEFAULT 'EVERYONE',
  "workVisibility" "VisibilityLevel" NOT NULL DEFAULT 'EVERYONE',
  "maritalStatusVisibility" "VisibilityLevel" NOT NULL DEFAULT 'EVERYONE',
  "notesVisibility" "VisibilityLevel" NOT NULL DEFAULT 'EVERYONE',
  CONSTRAINT "PersonPrivacySettings_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backfill defaults for existing people
INSERT INTO "PersonPrivacySettings" (
  "personId",
  "birthDateVisibility",
  "locationVisibility",
  "workVisibility",
  "maritalStatusVisibility",
  "notesVisibility"
)
SELECT
  "id",
  'EVERYONE'::"VisibilityLevel",
  'EVERYONE'::"VisibilityLevel",
  'EVERYONE'::"VisibilityLevel",
  'EVERYONE'::"VisibilityLevel",
  'EVERYONE'::"VisibilityLevel"
FROM "Person"
WHERE NOT EXISTS (
  SELECT 1 FROM "PersonPrivacySettings" s WHERE s."personId" = "Person"."id"
);

