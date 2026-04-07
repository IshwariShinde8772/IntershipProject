import multer from "multer";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { sendWorkbook } from "../../utils/excel.js";
import {
  bulkImportStudents,
  createStudent,
  exportStudentsWorkbook,
  getStudentById,
  getStudentDriveHistory,
  listStudents,
  softDeleteStudent,
  updateStudent
} from "./students.service.js";

export const upload = multer({ storage: multer.memoryStorage() });

export const listStudentsHandler = asyncHandler(async (req, res) => {
  const data = await listStudents(req.query, req.user);
  res.json(data);
});

export const getStudentHandler = asyncHandler(async (req, res) => {
  const data = await getStudentById(req.params.id, req.user);
  res.json(data);
});

export const createStudentHandler = asyncHandler(async (req, res) => {
  const data = await createStudent(req.body, req.user);
  res.status(201).json(data);
});

export const updateStudentHandler = asyncHandler(async (req, res) => {
  const data = await updateStudent(req.params.id, req.body, req.user);
  res.json(data);
});

export const deleteStudentHandler = asyncHandler(async (req, res) => {
  await softDeleteStudent(req.params.id, req.user.id);
  res.json({ message: "Student deactivated successfully" });
});

export const studentDriveHistoryHandler = asyncHandler(async (req, res) => {
  const data = await getStudentDriveHistory(req.params.id, req.user);
  res.json(data);
});

export const exportStudentsHandler = asyncHandler(async (req, res) => {
  const workbook = await exportStudentsWorkbook(req.query, req.user);
  await sendWorkbook(res, workbook, "students.xlsx");
});

export const bulkImportStudentsHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Excel file is required" });
  }

  const data = await bulkImportStudents(req.file.buffer, req.user.id);
  res.json(data);
});
