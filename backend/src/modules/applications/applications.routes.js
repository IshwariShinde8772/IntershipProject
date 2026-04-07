import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import {
  applyToDriveHandler,
  bulkAttendanceHandler,
  bulkResultHandler,
  listApplicationsHandler,
  updateAttendanceHandler,
  updateResultHandler,
  withdrawFromDriveHandler
} from "./applications.controller.js";

export const applicationsRouter = Router();

applicationsRouter.use(authMiddleware);
applicationsRouter.post("/drives/:id/apply", roleGuard(UserRole.STUDENT), applyToDriveHandler);
applicationsRouter.delete("/drives/:id/apply", roleGuard(UserRole.STUDENT), withdrawFromDriveHandler);
applicationsRouter.get(
  "/drives/:id/applications",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.FACULTY),
  listApplicationsHandler
);
applicationsRouter.put(
  "/drives/:driveId/applications/:studentId/attendance",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.FACULTY),
  updateAttendanceHandler
);
applicationsRouter.put(
  "/drives/:driveId/applications/:studentId/result",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR),
  updateResultHandler
);
applicationsRouter.post(
  "/drives/:id/attendance/bulk",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.FACULTY),
  bulkAttendanceHandler
);
applicationsRouter.post(
  "/drives/:id/results/bulk",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR),
  bulkResultHandler
);
