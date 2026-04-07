import { UserRole } from "@prisma/client";
import createError from "http-errors";
import { prisma } from "../../config/prisma.js";
import { logAction } from "../../utils/audit.js";
import {
  enrichDriveApplication,
  getApplicationResponseBucket,
  summarizeDriveApplications
} from "../../utils/driveAnalytics.js";
import { buildCriteriaPayload, previewEligibility, runEligibilityForDrive } from "../eligibility/eligibility.service.js";
import { sendEmail } from "../../utils/mail.js";

const driveInclude = {
  company: true,
  eligibility_criteria: true,
  applications: true
};

const buildDrivePayload = (payload) => {
  const company_id = String(payload.company_id ?? "").trim();
  const title = String(payload.title ?? "").trim();
  const job_profile = String(payload.job_profile ?? "").trim();
  const job_location = String(payload.job_location ?? "").trim();
  const package_lpa = Number(payload.package_lpa);
  const bond_years = Number.parseInt(payload.bond_years ?? 0, 10);

  if (!company_id) {
    throw createError(400, "Company is required");
  }

  if (!title) {
    throw createError(400, "Opportunity title is required");
  }

  if (!job_profile) {
    throw createError(400, "Job profile is required");
  }

  if (!job_location) {
    throw createError(400, "Job location is required");
  }

  if (Number.isNaN(package_lpa)) {
    throw createError(400, "Package LPA must be a valid number");
  }

  if (Number.isNaN(bond_years)) {
    throw createError(400, "Bond years must be a valid whole number");
  }

  return {
    company_id,
    title,
    drive_date: new Date(payload.drive_date),
    registration_deadline: new Date(payload.registration_deadline),
    job_profile,
    job_location,
    package_lpa,
    bond_years,
    drive_type: payload.drive_type,
    status: payload.status,
    description: payload.description ? String(payload.description).trim() : null
  };
};

const buildDriveWhere = (query, user) => {
  const where = {};

  if (query.status) where.status = query.status;
  if (query.company_id) where.company_id = query.company_id;
  if (query.date_from || query.date_to) {
    where.drive_date = {};
    if (query.date_from) where.drive_date.gte = new Date(query.date_from);
    if (query.date_to) where.drive_date.lte = new Date(query.date_to);
  }

  if (query.department) {
    where.OR = [
      {
        eligibility_criteria: {
          allowed_departments: {
            has: query.department
          }
        }
      },
      {
        eligibility_criteria: {
          allowed_departments: {
            isEmpty: true
          }
        }
      }
    ];
  }

  if (user.role === UserRole.STUDENT && user.studentId) {
    where.applications = {
      some: {
        student_id: user.studentId,
        is_eligible: true
      }
    };
  }

  return where;
};

export const listDrives = async (query, user) => {
  const drives = await prisma.placementDrive.findMany({
    where: buildDriveWhere(query, user),
    include: {
      company: true,
      applications: true,
      eligibility_criteria: true
    },
    orderBy: {
      drive_date: "desc"
    }
  });

  return drives.map((drive) => {
    const eligible_count = drive.applications.filter((application) => application.is_eligible).length;
    const opted_in_count = drive.applications.filter((application) => application.opted_in).length;
    const pending_response_count = drive.applications.filter(
      (application) => getApplicationResponseBucket(application, drive) === "AWAITING_RESPONSE"
    ).length;
    const missed_response_count = drive.applications.filter(
      (application) => getApplicationResponseBucket(application, drive) === "MISSED"
    ).length;
    const studentApplication =
      user.role === UserRole.STUDENT
        ? drive.applications.find((application) => application.student_id === user.studentId) ?? null
        : null;

    return {
      ...drive,
      applications: user.role === UserRole.STUDENT && studentApplication ? [studentApplication] : [],
      student_application: studentApplication,
      eligible_count,
      opted_in_count,
      pending_response_count,
      missed_response_count
    };
  });
};

export const getDriveById = async (id, user) => {
  const drive = await prisma.placementDrive.findUnique({
    where: { id },
    include: {
      company: true,
      eligibility_criteria: true,
      applications: {
        include: {
          student: true
        }
      }
    }
  });

  if (!drive) {
    throw createError(404, "Drive not found");
  }

  if (
    user.role === UserRole.STUDENT &&
    !drive.applications.some(
      (application) => application.student_id === user.studentId && application.is_eligible
    )
  ) {
    throw createError(403, "You do not have access to this drive");
  }

  const enrichedApplications = drive.applications.map((application) =>
    enrichDriveApplication(application, drive, drive.eligibility_criteria)
  );
  const counts = summarizeDriveApplications(enrichedApplications, drive);
  const myApplication =
    user.role === UserRole.STUDENT
      ? enrichedApplications.find((application) => application.student_id === user.studentId) ?? null
      : null;

  return {
    ...drive,
    applications: user.role === UserRole.STUDENT ? (myApplication ? [myApplication] : []) : enrichedApplications,
    my_application: myApplication,
    counts: {
      ...counts,
      response_rate: counts.eligible
        ? Number(((counts.opted_in / counts.eligible) * 100).toFixed(2))
        : 0
    }
  };
};

export const createDrive = async (payload, actorId) => {
  const data = buildDrivePayload(payload);
  const drive = await prisma.placementDrive.create({
    data,
    include: driveInclude
  });

  await logAction(actorId, "PlacementDrive", drive.id, "CREATE", null, drive);
  return drive;
};

export const updateDrive = async (id, payload, actorId) => {
  const existing = await prisma.placementDrive.findUnique({
    where: { id },
    include: driveInclude
  });

  if (!existing) {
    throw createError(404, "Drive not found");
  }

  const data = buildDrivePayload({
    ...existing,
    ...payload
  });

  const drive = await prisma.placementDrive.update({
    where: { id },
    data,
    include: driveInclude
  });

  await logAction(actorId, "PlacementDrive", id, "UPDATE", existing, drive);
  return drive;
};

export const deleteDrive = async (id, actorId) => {
  const existing = await prisma.placementDrive.findUnique({
    where: { id },
    include: driveInclude
  });

  if (!existing) {
    throw createError(404, "Drive not found");
  }

  await prisma.placementDrive.delete({
    where: { id }
  });

  await logAction(actorId, "PlacementDrive", id, "DELETE", existing, null);
};

export const listEligibleStudents = async (driveId) =>
  {
    const drive = await prisma.placementDrive.findUnique({
      where: { id: driveId },
      include: {
        eligibility_criteria: true,
        applications: {
          where: {
            is_eligible: true
          },
          include: {
            student: true
          },
          orderBy: {
            student: {
              name: "asc"
            }
          }
        }
      }
    });

    if (!drive) {
      throw createError(404, "Drive not found");
    }

    return drive.applications.map((application) =>
      enrichDriveApplication(application, drive, drive.eligibility_criteria)
    );
  };

export const upsertCriteria = async (driveId, payload, actorId) => {
  const criteriaPayload = buildCriteriaPayload(payload);
  const existing = await prisma.eligibilityCriteria.findUnique({
    where: { drive_id: driveId }
  });

  const criteria = await prisma.eligibilityCriteria.upsert({
    where: { drive_id: driveId },
    create: {
      drive_id: driveId,
      ...criteriaPayload
    },
    update: criteriaPayload
  });

  await logAction(actorId, "EligibilityCriteria", criteria.id, existing ? "UPDATE" : "CREATE", existing, criteria);

  setImmediate(() => {
    runEligibilityForDrive(driveId).catch((error) => {
      console.error("Eligibility engine failed", error);
    });
  });

  return criteria;
};

export const previewCriteriaMatches = async (_driveId, payload) => previewEligibility(payload);

export const notifyEligibleStudents = async (driveId) => {
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    include: {
      company: true,
      applications: {
        where: {
          is_eligible: true
        },
        include: {
          student: true
        }
      }
    }
  });

  if (!drive) {
    throw createError(404, "Drive not found");
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const application of drive.applications) {
    const email = application.student.college_email || application.student.personal_email;
    if (!email) {
      skipped += 1;
      continue;
    }

    try {
      const result = await sendEmail({
        to: email,
        subject: `${drive.company.name} opportunity update`,
        text: `You are eligible for ${drive.title}. It has been added to your student portal. Register by ${drive.registration_deadline.toISOString()}.`,
        html: `<p>You are eligible for <strong>${drive.title}</strong> by ${drive.company.name}.</p><p>The opportunity is now visible in the student portal. Register by ${drive.registration_deadline.toLocaleString()}.</p>`
      });

      if (result?.skipped) {
        skipped += 1;
      } else {
        sent += 1;
      }
    } catch (error) {
      failed += 1;
    }
  }

  return {
    sent,
    skipped,
    failed,
    portal_visible: drive.applications.length
  };
};
