import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import {
  bulkImportStudentsHandler,
  createStudentHandler,
  deleteStudentHandler,
  exportStudentsHandler,
  getStudentHandler,
  listStudentsHandler,
  studentDriveHistoryHandler,
  updateStudentHandler,
  upload
} from "./students.controller.js";

export const studentsRouter = Router();

studentsRouter.use(authMiddleware);

studentsRouter.get(
  "/export",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.FACULTY),
  exportStudentsHandler
);
studentsRouter.post(
  "/bulk-import",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR),
  upload.single("file"),
  bulkImportStudentsHandler
);
studentsRouter.get(
  "/",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.FACULTY),
  listStudentsHandler
);
studentsRouter.post(
  "/",
  roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR),
  createStudentHandler
);
studentsRouter.get("/:id/drives", studentDriveHistoryHandler);
studentsRouter.get("/:id", getStudentHandler);
studentsRouter.put("/:id", updateStudentHandler);
studentsRouter.delete("/:id", roleGuard(UserRole.SUPER_ADMIN), deleteStudentHandler);
