-- Add email to User (login by email)
ALTER TABLE "User" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
