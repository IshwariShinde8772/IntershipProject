import { asyncHandler } from "../../middleware/asyncHandler.js";
import {
  createDrive,
  deleteDrive,
  getDriveById,
  listDrives,
  listEligibleStudents,
  notifyEligibleStudents,
  previewCriteriaMatches,
  updateDrive,
  upsertCriteria
} from "./drives.service.js";

export const listDrivesHandler = asyncHandler(async (req, res) => {
  res.json(await listDrives(req.query, req.user));
});

export const getDriveHandler = asyncHandler(async (req, res) => {
  res.json(await getDriveById(req.params.id, req.user));
});

export const createDriveHandler = asyncHandler(async (req, res) => {
  res.status(201).json(await createDrive(req.body, req.user.id));
});

export const updateDriveHandler = asyncHandler(async (req, res) => {
  res.json(await updateDrive(req.params.id, req.body, req.user.id));
});

export const deleteDriveHandler = asyncHandler(async (req, res) => {
  await deleteDrive(req.params.id, req.user.id);
  res.json({ message: "Drive deleted successfully" });
});

export const eligibleStudentsHandler = asyncHandler(async (req, res) => {
  res.json(await listEligibleStudents(req.params.id));
});

export const upsertCriteriaHandler = asyncHandler(async (req, res) => {
  const data = await upsertCriteria(req.params.id, req.body, req.user.id);
  res.json({
    message: "Eligibility criteria saved. Eligibility engine is running in background.",
    data
  });
});

export const previewCriteriaHandler = asyncHandler(async (req, res) => {
  res.json(await previewCriteriaMatches(req.params.id, Object.keys(req.body || {}).length ? req.body : req.query));
});

export const notifyEligibleStudentsHandler = asyncHandler(async (req, res) => {
  res.json(await notifyEligibleStudents(req.params.id));
});
