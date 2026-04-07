import { asyncHandler } from "../../middleware/asyncHandler.js";
import {
  createCompany,
  deleteCompany,
  getCompanyById,
  listCompanies,
  updateCompany
} from "./companies.service.js";

export const listCompaniesHandler = asyncHandler(async (_req, res) => {
  res.json(await listCompanies());
});

export const getCompanyHandler = asyncHandler(async (req, res) => {
  res.json(await getCompanyById(req.params.id));
});

export const createCompanyHandler = asyncHandler(async (req, res) => {
  res.status(201).json(await createCompany(req.body, req.user.id));
});

export const updateCompanyHandler = asyncHandler(async (req, res) => {
  res.json(await updateCompany(req.params.id, req.body, req.user.id));
});

export const deleteCompanyHandler = asyncHandler(async (req, res) => {
  await deleteCompany(req.params.id, req.user.id);
  res.json({ message: "Company deleted successfully" });
});
