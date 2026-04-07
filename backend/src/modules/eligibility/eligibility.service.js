import { prisma } from "../../config/prisma.js";
import { analyzeEligibility, computeEligibility } from "./engine.js";

export const buildCriteriaPayload = (payload) => ({
  min_cgpa: Number(payload.min_cgpa ?? 0),
  min_ssc_percentage: Number(payload.min_ssc_percentage ?? 0),
  min_hsc_percentage: Number(payload.min_hsc_percentage ?? 0),
  min_diploma_percentage:
    payload.min_diploma_percentage === null || payload.min_diploma_percentage === undefined || payload.min_diploma_percentage === ""
      ? null
      : Number(payload.min_diploma_percentage),
  max_dead_atkt: Number(payload.max_dead_atkt ?? 0),
  max_live_atkt: Number(payload.max_live_atkt ?? 0),
  allow_year_drop: Boolean(payload.allow_year_drop),
  allowed_departments: Array.isArray(payload.allowed_departments)
    ? payload.allowed_departments
    : [],
  allowed_genders: Array.isArray(payload.allowed_genders) ? payload.allowed_genders : [],
  allowed_categories: Array.isArray(payload.allowed_categories) ? payload.allowed_categories : [],
  career_choice_filter: Array.isArray(payload.career_choice_filter)
    ? payload.career_choice_filter
    : [],
  custom_conditions: payload.custom_conditions ?? null
});

export const previewEligibility = async (criteriaPayload) => {
  const criteria = buildCriteriaPayload(criteriaPayload);
  const students = await prisma.student.findMany({
    where: {
      user: {
        is_active: true
      }
    }
  });

  const matching = students.filter((student) => computeEligibility(student, criteria));
  return {
    count: matching.length,
    students: matching
  };
};

const syncStudentDriveEligibility = async ({ drive, student, existingApplication }) => {
  const analysis = analyzeEligibility(student, drive.eligibility_criteria);
  const shouldResetOptIn =
    !analysis.eligible &&
    existingApplication?.opted_in &&
    !existingApplication.attended &&
    !existingApplication.shortlisted &&
    !existingApplication.selected;

  await prisma.driveApplication.upsert({
    where: {
      drive_id_student_id: {
        drive_id: drive.id,
        student_id: student.id
      }
    },
    create: {
      drive_id: drive.id,
      student_id: student.id,
      is_eligible: analysis.eligible
    },
    update: {
      is_eligible: analysis.eligible,
      ...(shouldResetOptIn ? { opted_in: false } : {})
    }
  });
};

export const runEligibilityForDrive = async (driveId) => {
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    include: {
      eligibility_criteria: true
    }
  });

  if (!drive?.eligibility_criteria) {
    return;
  }

  const existingApplications = await prisma.driveApplication.findMany({
    where: {
      drive_id: driveId
    }
  });
  const existingByStudentId = new Map(
    existingApplications.map((application) => [application.student_id, application])
  );

  const students = await prisma.student.findMany({
    where: {
      user: {
        is_active: true
      }
    }
  });

  for (const student of students) {
    await syncStudentDriveEligibility({
      drive,
      student,
      existingApplication: existingByStudentId.get(student.id)
    });
  }
};

export const runEligibilityForStudent = async (studentId) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: {
        select: {
          is_active: true
        }
      }
    }
  });

  if (!student?.user?.is_active) {
    return;
  }

  const [drives, applications] = await prisma.$transaction([
    prisma.placementDrive.findMany({
      where: {
        status: {
          in: ["UPCOMING", "ONGOING"]
        },
        eligibility_criteria: {
          isNot: null
        }
      },
      include: {
        eligibility_criteria: true
      }
    }),
    prisma.driveApplication.findMany({
      where: {
        student_id: studentId
      }
    })
  ]);

  const existingByDriveId = new Map(
    applications.map((application) => [application.drive_id, application])
  );

  for (const drive of drives) {
    await syncStudentDriveEligibility({
      drive,
      student,
      existingApplication: existingByDriveId.get(drive.id)
    });
  }
};
