-- CreateEnum
CREATE TYPE "AcademicEntryMode" AS ENUM ('HSC', 'DIPLOMA');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "aadhar_card_url" TEXT,
ADD COLUMN     "diploma_marksheet_url" TEXT,
ADD COLUMN     "engineering_marksheets_url" TEXT,
ADD COLUMN     "entry_mode" "AcademicEntryMode",
ADD COLUMN     "hsc_marksheet_url" TEXT,
ADD COLUMN     "ssc_marksheet_url" TEXT;
