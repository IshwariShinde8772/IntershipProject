-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COORDINATOR', 'FACULTY', 'STUDENT');

-- CreateEnum
CREATE TYPE "StudentCategory" AS ENUM ('Open', 'OBC', 'SC', 'ST', 'NT', 'VJ');

-- CreateEnum
CREATE TYPE "StudentDepartment" AS ENUM ('IT', 'COMP', 'MECH', 'CIVIL', 'ENTC', 'ETRX');

-- CreateEnum
CREATE TYPE "PlacementStatus" AS ENUM ('NOT_PLACED', 'PLACED', 'OPTED_OUT', 'HIGHER_STUDIES');

-- CreateEnum
CREATE TYPE "DriveType" AS ENUM ('ON_CAMPUS', 'OFF_CAMPUS', 'POOL');

-- CreateEnum
CREATE TYPE "DriveStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "refresh_token_hash" TEXT,
    "reset_token_hash" TEXT,
    "reset_token_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "prn" TEXT NOT NULL,
    "college_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "category" "StudentCategory" NOT NULL,
    "department" "StudentDepartment" NOT NULL,
    "admission_year" INTEGER NOT NULL,
    "native_place" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "permanent_address" TEXT NOT NULL,
    "personal_email" TEXT NOT NULL,
    "college_email" TEXT NOT NULL,
    "personal_contact" TEXT NOT NULL,
    "alternate_contact" TEXT,
    "aadhar_no" TEXT,
    "pan_no" TEXT,
    "father_occupation" TEXT,
    "mother_occupation" TEXT,
    "sibling_info" TEXT,
    "ssc_percentage" DECIMAL(5,2) NOT NULL,
    "ssc_year" INTEGER NOT NULL,
    "hsc_percentage" DECIMAL(5,2) NOT NULL,
    "hsc_board" TEXT NOT NULL,
    "hsc_year" INTEGER NOT NULL,
    "cet_jee_score" TEXT,
    "diploma_percentage" DECIMAL(5,2),
    "diploma_branch" TEXT,
    "diploma_board" TEXT,
    "diploma_year" INTEGER,
    "fe_sem1_sgpa" DECIMAL(4,2),
    "fe_sem2_sgpa" DECIMAL(4,2),
    "se_sem3_sgpa" DECIMAL(4,2) NOT NULL,
    "se_sem4_sgpa" DECIMAL(4,2) NOT NULL,
    "te_sem5_sgpa" DECIMAL(4,2) NOT NULL,
    "te_sem6_sgpa" DECIMAL(4,2) NOT NULL,
    "be_sem7_sgpa" DECIMAL(4,2),
    "be_sem8_sgpa" DECIMAL(4,2),
    "aggregate_cgpa" DECIMAL(4,2) NOT NULL,
    "dead_atkt_count" INTEGER NOT NULL DEFAULT 0,
    "live_atkt_count" INTEGER NOT NULL DEFAULT 0,
    "year_drop" INTEGER NOT NULL DEFAULT 0,
    "achievements" TEXT,
    "technical_certifications" TEXT,
    "internships" TEXT,
    "be_project_title" TEXT,
    "trainings_required" TEXT,
    "career_choice" TEXT,
    "industry_contact_name" TEXT,
    "industry_contact_org" TEXT,
    "industry_contact_position" TEXT,
    "industry_contact_phone" TEXT,
    "resume_url" TEXT,
    "profile_photo_url" TEXT,
    "placement_status" "PlacementStatus" NOT NULL DEFAULT 'NOT_PLACED',
    "consent_declaration" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "hr_name" TEXT,
    "hr_email" TEXT,
    "hr_phone" TEXT,
    "website" TEXT,
    "description" TEXT,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementDrive" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "drive_date" TIMESTAMP(3) NOT NULL,
    "registration_deadline" TIMESTAMP(3) NOT NULL,
    "job_profile" TEXT NOT NULL,
    "job_location" TEXT NOT NULL,
    "package_lpa" DECIMAL(6,2) NOT NULL,
    "bond_years" INTEGER NOT NULL DEFAULT 0,
    "drive_type" "DriveType" NOT NULL,
    "status" "DriveStatus" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementDrive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityCriteria" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "min_cgpa" DECIMAL(4,2) NOT NULL,
    "min_ssc_percentage" DECIMAL(5,2) NOT NULL,
    "min_hsc_percentage" DECIMAL(5,2) NOT NULL,
    "min_diploma_percentage" DECIMAL(5,2),
    "max_dead_atkt" INTEGER NOT NULL,
    "max_live_atkt" INTEGER NOT NULL,
    "allow_year_drop" BOOLEAN NOT NULL,
    "allowed_departments" TEXT[],
    "allowed_genders" TEXT[],
    "allowed_categories" TEXT[],
    "career_choice_filter" TEXT[],
    "custom_conditions" TEXT,

    CONSTRAINT "EligibilityCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriveApplication" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "is_eligible" BOOLEAN NOT NULL,
    "opted_in" BOOLEAN NOT NULL DEFAULT false,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "shortlisted" BOOLEAN NOT NULL DEFAULT false,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "offer_letter_url" TEXT,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriveApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_user_id_key" ON "Student"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Student_prn_key" ON "Student"("prn");

-- CreateIndex
CREATE UNIQUE INDEX "Student_college_id_key" ON "Student"("college_id");

-- CreateIndex
CREATE UNIQUE INDEX "EligibilityCriteria_drive_id_key" ON "EligibilityCriteria"("drive_id");

-- CreateIndex
CREATE UNIQUE INDEX "DriveApplication_drive_id_student_id_key" ON "DriveApplication"("drive_id", "student_id");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementDrive" ADD CONSTRAINT "PlacementDrive_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityCriteria" ADD CONSTRAINT "EligibilityCriteria_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "PlacementDrive"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveApplication" ADD CONSTRAINT "DriveApplication_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "PlacementDrive"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveApplication" ADD CONSTRAINT "DriveApplication_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
