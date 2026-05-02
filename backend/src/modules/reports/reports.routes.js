import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import {
  dashboardReportHandler,
  departmentWiseReportHandler,
  driveReportHandler,
  excelDashboardUploadHandler,
  excelUpload,
  exportDriveHandler,
  exportPlacedHandler
} from "./reports.controller.js";

export const reportsRouter = Router();

reportsRouter.use(authMiddleware);
reportsRouter.get(
  "/dashboard",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.FACULTY),
  dashboardReportHandler
);
reportsRouter.get(
  "/department-wise",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.FACULTY),
  departmentWiseReportHandler
);
reportsRouter.get(
  "/drive/:id",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.FACULTY),
  driveReportHandler
);
reportsRouter.post(
  "/excel-dashboard",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.FACULTY),
  excelUpload.single("file"),
  excelDashboardUploadHandler
);
reportsRouter.get(
  "/export/placed",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.FACULTY),
  exportPlacedHandler
);
reportsRouter.get(
  "/export/drive/:id",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.FACULTY),
  exportDriveHandler
);
