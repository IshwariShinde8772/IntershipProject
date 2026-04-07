import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import {
  createDriveHandler,
  deleteDriveHandler,
  eligibleStudentsHandler,
  getDriveHandler,
  listDrivesHandler,
  notifyEligibleStudentsHandler,
  previewCriteriaHandler,
  updateDriveHandler,
  upsertCriteriaHandler
} from "./drives.controller.js";

export const drivesRouter = Router();

drivesRouter.use(authMiddleware);
drivesRouter.get("/", listDrivesHandler);
drivesRouter.post("/", roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR), createDriveHandler);
drivesRouter.get("/:id", getDriveHandler);
drivesRouter.put("/:id", roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR), updateDriveHandler);
drivesRouter.delete("/:id", roleGuard(UserRole.SUPER_ADMIN), deleteDriveHandler);
drivesRouter.get(
  "/:id/eligible-students",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.FACULTY),
  eligibleStudentsHandler
);
drivesRouter.post(
  "/:id/criteria",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR),
  upsertCriteriaHandler
);
drivesRouter.get(
  "/:id/criteria/preview",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR),
  previewCriteriaHandler
);
drivesRouter.post(
  "/:id/criteria/preview",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR),
  previewCriteriaHandler
);
drivesRouter.post(
  "/:id/notify",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR),
  notifyEligibleStudentsHandler
);
