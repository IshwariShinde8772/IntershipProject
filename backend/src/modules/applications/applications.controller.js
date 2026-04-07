import { asyncHandler } from "../../middleware/asyncHandler.js";
import {
  applyToDrive,
  bulkAttendanceUpdate,
  bulkResultUpdate,
  listApplicationsByDrive,
  updateAttendance,
  updateResult,
  withdrawFromDrive
} from "./applications.service.js";

export const applyToDriveHandler = asyncHandler(async (req, res) => {
  res.json(await applyToDrive(req.params.id, req.user));
});

export const withdrawFromDriveHandler = asyncHandler(async (req, res) => {
  res.json(await withdrawFromDrive(req.params.id, req.user));
});

export const listApplicationsHandler = asyncHandler(async (req, res) => {
  res.json(await listApplicationsByDrive(req.params.id));
});

export const updateAttendanceHandler = asyncHandler(async (req, res) => {
  res.json(
    await updateAttendance(
      req.params.driveId,
      req.params.studentId,
      req.body.attended,
      req.user.id
    )
  );
});

export const updateResultHandler = asyncHandler(async (req, res) => {
  res.json(await updateResult(req.params.driveId, req.params.studentId, req.body, req.user.id));
});

export const bulkAttendanceHandler = asyncHandler(async (req, res) => {
  res.json(await bulkAttendanceUpdate(req.params.id, req.body, req.user.id));
});

export const bulkResultHandler = asyncHandler(async (req, res) => {
  res.json(await bulkResultUpdate(req.params.id, req.body, req.user.id));
});
