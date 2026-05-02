-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Student"
ALTER COLUMN "dead_atkt_count" DROP NOT NULL,
ALTER COLUMN "dead_atkt_count" DROP DEFAULT,
ALTER COLUMN "live_atkt_count" DROP NOT NULL,
ALTER COLUMN "live_atkt_count" DROP DEFAULT,
ALTER COLUMN "year_drop" DROP NOT NULL,
ALTER COLUMN "year_drop" DROP DEFAULT;

-- CreateTable
CREATE TABLE "StudentImportBatch" (
    "id" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentImportRow" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "prn" TEXT,
    "college_email" TEXT,
    "status" "ImportStatus" NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentImportBatch_uploaded_by_id_idx" ON "StudentImportBatch"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "StudentImportRow_batch_id_idx" ON "StudentImportRow"("batch_id");

-- AddForeignKey
ALTER TABLE "StudentImportBatch" ADD CONSTRAINT "StudentImportBatch_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentImportRow" ADD CONSTRAINT "StudentImportRow_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "StudentImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
