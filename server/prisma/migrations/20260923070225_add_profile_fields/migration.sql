ALTER TABLE "User" ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "bio" TEXT,
ADD COLUMN "availability" TEXT;

ALTER TABLE "User" ALTER COLUMN "faculty" TYPE TEXT USING "faculty"::TEXT;
ALTER TABLE "User" ALTER COLUMN "studyYear" TYPE TEXT USING "studyYear"::TEXT;

DROP TYPE "Faculty";
