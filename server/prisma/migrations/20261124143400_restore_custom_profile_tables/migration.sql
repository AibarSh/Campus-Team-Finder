-- Restore missing tables whose original migrations may already be recorded as applied.
BEGIN;

CREATE TABLE IF NOT EXISTS "UserCustomSkill" (
    "userId" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "proficiency" "Proficiency" NOT NULL,
    CONSTRAINT "UserCustomSkill_pkey" PRIMARY KEY ("userId", "normalizedName"),
    CONSTRAINT "UserCustomSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "UserCustomInterest" (
    "userId" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "UserCustomInterest_pkey" PRIMARY KEY ("userId", "normalizedName"),
    CONSTRAINT "UserCustomInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "UserCustomPreferredRole" (
    "userId" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "UserCustomPreferredRole_pkey" PRIMARY KEY ("userId", "normalizedName"),
    CONSTRAINT "UserCustomPreferredRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

COMMIT;
