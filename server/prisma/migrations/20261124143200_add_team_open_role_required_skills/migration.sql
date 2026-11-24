CREATE TABLE "TeamOpenRoleRequiredSkill" (
    "teamOpenRoleId" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TeamOpenRoleRequiredSkill_pkey" PRIMARY KEY ("teamOpenRoleId", "normalizedName")
);

ALTER TABLE "TeamOpenRoleRequiredSkill"
    ADD CONSTRAINT "TeamOpenRoleRequiredSkill_teamOpenRoleId_fkey"
    FOREIGN KEY ("teamOpenRoleId") REFERENCES "TeamOpenRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
