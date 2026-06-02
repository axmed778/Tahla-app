-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verifyTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "verifyTokenExpires" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "passwordResetTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetExpires" TIMESTAMP(3);

-- Existing rows: treat as already verified (accounts created before email verification)
UPDATE "User" SET "emailVerified" = true;
