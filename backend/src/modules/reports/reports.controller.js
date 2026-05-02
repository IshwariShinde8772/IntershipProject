import multer from "multer";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { sendWorkbook } from "../../utils/excel.js";
import {
  exportDriveWorkbook,
  exportPlacedWorkbook,
  getExcelDashboardReport,
  getDashboardReport,
  getDepartmentWiseReport,
  getDriveReport
} from "./reports.service.js";

const allowedExcelMimeTypes = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/csv",
  "text/plain"
]);

export const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    const hasValidExtension = /\.(xlsx|xls|csv)$/i.test(file.originalname ?? "");
    const hasValidMimeType = allowedExcelMimeTypes.has(file.mimetype);

    if (!hasValidExtension && !hasValidMimeType) {
      callback(new Error("Only Excel files (.xlsx, .xls, .csv) are allowed"));
      return;
    }

    callback(null, true);
  }
});

export const dashboardReportHandler = asyncHandler(async (req, res) => {
  res.json(await getDashboardReport(req.query));
});

export const departmentWiseReportHandler = asyncHandler(async (_req, res) => {
  res.json(await getDepartmentWiseReport());
});

export const driveReportHandler = asyncHandler(async (req, res) => {
  res.json(await getDriveReport(req.params.id));
});

export const exportPlacedHandler = asyncHandler(async (_req, res) => {
  const workbook = await exportPlacedWorkbook();
  await sendWorkbook(res, workbook, "placed-students.xlsx");
});

export const exportDriveHandler = asyncHandler(async (req, res) => {
  const workbook = await exportDriveWorkbook(req.params.id);
  await sendWorkbook(res, workbook, `drive-${req.params.id}.xlsx`);
});

export const excelDashboardUploadHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Excel file is required" });
  }

  const data = await getExcelDashboardReport(req.file.buffer, req.file.originalname);
  res.json(data);
});
