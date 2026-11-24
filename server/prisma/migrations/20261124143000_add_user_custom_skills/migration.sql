CREATE TABLE "UserCustomSkill" (
    "userId" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "proficiency" "Proficiency" NOT NULL,
    CONSTRAINT "UserCustomSkill_pkey" PRIMARY KEY ("userId", "normalizedName"),
    CONSTRAINT "UserCustomSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
