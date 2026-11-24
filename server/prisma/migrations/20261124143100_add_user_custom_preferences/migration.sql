CREATE TABLE "UserCustomInterest" (
    "userId" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "UserCustomInterest_pkey" PRIMARY KEY ("userId", "normalizedName"),
    CONSTRAINT "UserCustomInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "UserCustomPreferredRole" (
    "userId" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "UserCustomPreferredRole_pkey" PRIMARY KEY ("userId", "normalizedName"),
    CONSTRAINT "UserCustomPreferredRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
