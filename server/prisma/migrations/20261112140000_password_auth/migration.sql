-- Replace Google sign-in with email + password.
-- Accounts created before this migration have no password and cannot sign in.
DROP INDEX "User_googleId_key";
ALTER TABLE "User" DROP COLUMN "googleId", ADD COLUMN "passwordHash" TEXT;
