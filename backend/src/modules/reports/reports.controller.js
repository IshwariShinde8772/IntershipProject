import { asyncHandler } from "../../middleware/asyncHandler.js";
import { sendWorkbook } from "../../utils/excel.js";
import {
  exportDriveWorkbook,
  exportPlacedWorkbook,
  getDashboardReport,
  getDepartmentWiseReport,
  getDriveReport
} from "./reports.service.js";

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
