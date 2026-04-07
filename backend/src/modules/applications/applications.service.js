import { UserRole } from "@prisma/client";
import createError from "http-errors";
import { prisma } from "../../config/prisma.js";
import { logAction } from "../../utils/audit.js";

const getApplication = async (driveId, studentId) =>
  prisma.driveApplication.findUnique({
    where: {
      drive_id_student_id: {
        drive_id: driveId,
        student_id: studentId
      }
    },
    include: {
      drive: true,
      student: true
    }
  });

export const applyToDrive = async (driveId, actor) => {
  if (actor.role !== UserRole.STUDENT || !actor.studentId) {
    throw createError(403, "Only students can apply to drives");
  }

  const application = await getApplication(driveId, actor.studentId);

  if (!application?.is_eligible) {
    throw createError(400, "You are not eligible for this drive");
  }

  if (application.drive.registration_deadline < new Date()) {
    throw createError(400, "Registration deadline has passed");
  }

  const updated = await prisma.driveApplication.update({
    where: {
      drive_id_student_id: {
        drive_id: driveId,
        student_id: actor.studentId
      }
    },
    data: {
      opted_in: true
    }
  });

  await logAction(actor.id, "DriveApplication", updated.id, "UPDATE", application, updated);
  return updated;
};

export const withdrawFromDrive = async (driveId, actor) => {
  if (actor.role !== UserRole.STUDENT || !actor.studentId) {
    throw createError(403, "Only students can withdraw from drives");
  }

  const application = await getApplication(driveId, actor.studentId);

  if (!application) {
    throw createError(404, "Application not found");
  }

  if (application.drive.registration_deadline < new Date()) {
    throw createError(400, "Registration deadline has passed");
  }

  const updated = await prisma.driveApplication.update({
    where: {
      drive_id_student_id: {
        drive_id: driveId,
        student_id: actor.studentId
      }
    },
    data: {
      opted_in: false
    }
  });

  await logAction(actor.id, "DriveApplication", updated.id, "UPDATE", application, updated);
  return updated;
};

export const listApplicationsByDrive = async (driveId) =>
  prisma.driveApplication.findMany({
    where: { drive_id: driveId },
    include: {
      student: true
    },
    orderBy: {
      student: {
        name: "asc"
      }
    }
  });

export const updateAttendance = async (driveId, studentId, attended, actorId) => {
  const existing = await getApplication(driveId, studentId);
  if (!existing) {
    throw createError(404, "Application not found");
  }

  const updated = await prisma.driveApplication.update({
    where: {
      drive_id_student_id: {
        drive_id: driveId,
        student_id: studentId
      }
    },
    data: {
      attended: Boolean(attended)
    }
  });

  await logAction(actorId, "DriveApplication", updated.id, "UPDATE", existing, updated);
  return updated;
};

export const updateResult = async (driveId, studentId, payload, actorId) => {
  const existing = await getApplication(driveId, studentId);
  if (!existing) {
    throw createError(404, "Application not found");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const application = await tx.driveApplication.update({
      where: {
        drive_id_student_id: {
          drive_id: driveId,
          student_id: studentId
        }
      },
      data: {
        shortlisted: Boolean(payload.shortlisted),
        selected: Boolean(payload.selected),
        offer_letter_url: payload.offer_letter_url ?? null,
        remarks: payload.remarks ?? null
      }
    });

    if (payload.selected) {
      await tx.student.update({
        where: {
          id: studentId
        },
        data: {
          placement_status: "PLACED"
        }
      });
    }

    return application;
  });

  await logAction(actorId, "DriveApplication", updated.id, "UPDATE", existing, updated);
  return updated;
};

export const bulkAttendanceUpdate = async (driveId, items, actorId) => {
  const updates = [];
  for (const item of items) {
    updates.push(await updateAttendance(driveId, item.student_id, item.attended, actorId));
  }
  return updates;
};

export const bulkResultUpdate = async (driveId, items, actorId) => {
  const updates = [];
  for (const item of items) {
    updates.push(await updateResult(driveId, item.student_id, item, actorId));
  }
  return updates;
};
