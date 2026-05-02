import { UserRole } from "@prisma/client";
import createError from "http-errors";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { logAction } from "../../utils/audit.js";
import {
  enrichDriveApplication,
  getApplicationResponseBucket,
  summarizeDriveApplications
} from "../../utils/driveAnalytics.js";
import { buildCriteriaPayload, previewEligibility, runEligibilityForDrive } from "../eligibility/eligibility.service.js";
import { isMailConfigured, sendEmail } from "../../utils/mail.js";
import { isKbtcoeEmail, normalizeEmail } from "../../utils/studentAccount.js";

const driveInclude = {
  company: true,
  eligibility_criteria: true,
  applications: true
};

const autoNotifyStatuses = new Set(["UPCOMING", "ONGOING"]);

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character] ?? character;
  });

const formatDriveDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "the published deadline";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
};

const buildDriveDashboardUrl = (driveId) => {
  const appOrigin = String(env.appOrigin ?? "").trim().replace(/\/+$/, "");
  return appOrigin ? `${appOrigin}/drives/${driveId}` : null;
};

const buildEligibleNotificationMessage = ({ drive, student }) => {
  const studentName = String(student?.name ?? "").trim() || "Student";
  const driveUrl = buildDriveDashboardUrl(drive.id);
  const deadline = formatDriveDateTime(drive.registration_deadline);
  const numericPackage = Number(drive.package_lpa);
  const packageLabel = Number.isFinite(numericPackage)
    ? numericPackage.toFixed(2)
    : String(drive.package_lpa ?? "");
  const subject = `New eligible opportunity: ${drive.title}`;
  const textLines = [
    `Dear ${studentName},`,
    "",
    "A new placement opportunity matching your eligibility has been added to the KBTCOE placement dashboard.",
    "",
    `Company: ${drive.company.name}`,
    `Opportunity: ${drive.title}`,
    `Job Profile: ${drive.job_profile}`,
    `Location: ${drive.job_location}`,
    `Package: ${packageLabel} LPA`,
    `Apply Before: ${deadline}`,
    "",
    "Please log in to your dashboard, review the opportunity, and apply for the drive before the deadline."
  ];

  if (driveUrl) {
    textLines.push("", `Dashboard: ${driveUrl}`);
  }

  textLines.push("", "Regards,", "Training & Placement Cell", "KBTCOE");

  const htmlParts = [
    `<p>Dear ${escapeHtml(studentName)},</p>`,
    "<p>A new placement opportunity matching your eligibility has been added to the KBTCOE placement dashboard.</p>",
    "<p>",
    `<strong>Company:</strong> ${escapeHtml(drive.company.name)}<br />`,
    `<strong>Opportunity:</strong> ${escapeHtml(drive.title)}<br />`,
    `<strong>Job Profile:</strong> ${escapeHtml(drive.job_profile)}<br />`,
    `<strong>Location:</strong> ${escapeHtml(drive.job_location)}<br />`,
    `<strong>Package:</strong> ${escapeHtml(packageLabel)} LPA<br />`,
    `<strong>Apply Before:</strong> ${escapeHtml(deadline)}`,
    "</p>",
    "<p>Please log in to your dashboard, review the opportunity, and apply for the drive before the deadline.</p>"
  ];

  if (driveUrl) {
    htmlParts.push(
      `<p><a href="${escapeHtml(driveUrl)}">Open placement dashboard</a></p>`
    );
  }

  htmlParts.push("<p>Regards,<br />Training &amp; Placement Cell<br />KBTCOE</p>");

  return {
    subject,
    text: textLines.join("\n"),
    html: htmlParts.join("")
  };
};

const getNotificationQueueSummary = async (driveId) => {
  const [eligible_count, pending_count] = await prisma.$transaction([
    prisma.driveApplication.count({
      where: {
        drive_id: driveId,
        is_eligible: true
      }
    }),
    prisma.driveApplication.count({
      where: {
        drive_id: driveId,
        is_eligible: true,
        eligible_notified_at: null
      }
    })
  ]);

  return {
    eligible_count,
    pending_count,
    already_notified: Math.max(eligible_count - pending_count, 0)
  };
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
  const [existing, drive] = await prisma.$transaction([
    prisma.eligibilityCriteria.findUnique({
      where: { drive_id: driveId }
    }),
    prisma.placementDrive.findUnique({
      where: { id: driveId },
      select: {
        id: true,
        status: true
      }
    })
  ]);

  if (!drive) {
    throw createError(404, "Drive not found");
  }

  const criteria = await prisma.eligibilityCriteria.upsert({
    where: { drive_id: driveId },
    create: {
      drive_id: driveId,
      ...criteriaPayload
    },
    update: criteriaPayload
  });

  await logAction(actorId, "EligibilityCriteria", criteria.id, existing ? "UPDATE" : "CREATE", existing, criteria);

  await runEligibilityForDrive(driveId);

  const notification_summary = await getNotificationQueueSummary(driveId);
  const auto_notify_enabled = autoNotifyStatuses.has(drive.status);
  const mail_configured = isMailConfigured();
  const scheduled = auto_notify_enabled && mail_configured && notification_summary.pending_count > 0;

  if (scheduled) {
    setImmediate(() => {
      notifyEligibleStudents(driveId, { onlyPending: true }).catch((error) => {
        console.error("Eligible drive notification failed", error);
      });
    });
  }

  return {
    criteria,
    eligible_count: notification_summary.eligible_count,
    notification_summary: {
      ...notification_summary,
      scheduled,
      auto_notify_enabled,
      mail_configured
    }
  };
};

export const previewCriteriaMatches = async (_driveId, payload) => previewEligibility(payload);

export const notifyEligibleStudents = async (driveId, options = {}) => {
  const onlyPending = Boolean(options.onlyPending);
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    include: {
      company: true,
      applications: {
        where: {
          is_eligible: true,
          ...(onlyPending ? { eligible_notified_at: null } : {})
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

  const eligible_count = onlyPending
    ? await prisma.driveApplication.count({
        where: {
          drive_id: driveId,
          is_eligible: true
        }
      })
    : drive.applications.length;
  const attempted = drive.applications.length;
  const already_notified = onlyPending ? Math.max(eligible_count - attempted, 0) : 0;

  if (!attempted) {
    return {
      sent: 0,
      skipped: 0,
      failed: 0,
      attempted,
      eligible_count,
      already_notified,
      portal_visible: eligible_count
    };
  }

  if (!isMailConfigured()) {
    return {
      sent: 0,
      skipped: attempted,
      failed: 0,
      attempted,
      eligible_count,
      already_notified,
      portal_visible: eligible_count
    };
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const application of drive.applications) {
    const email = normalizeEmail(application.student.college_email);
    if (!isKbtcoeEmail(email)) {
      skipped += 1;
      continue;
    }

    try {
      const message = buildEligibleNotificationMessage({
        drive,
        student: application.student
      });
      const result = await sendEmail({
        to: email,
        ...message
      });

      if (result?.skipped) {
        skipped += 1;
      } else {
        sent += 1;
        await prisma.driveApplication.update({
          where: {
            id: application.id
          },
          data: {
            eligible_notified_at: new Date()
          }
        });
      }
    } catch (error) {
      failed += 1;
      console.error("Unable to send drive eligibility email", {
        driveId,
        studentId: application.student_id,
        error: error?.message ?? error
      });
    }
  }

  return {
    sent,
    skipped,
    failed,
    attempted,
    eligible_count,
    already_notified,
    portal_visible: eligible_count
  };
};
