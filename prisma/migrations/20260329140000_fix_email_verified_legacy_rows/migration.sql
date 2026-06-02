-- Legacy rows from `db push` (or similar) may have emailVerified = false with no verification token.
-- Real pending signups always have verifyTokenHash set until they verify.
UPDATE "User" SET "emailVerified" = true WHERE "emailVerified" = false AND "verifyTokenHash" IS NULL;
