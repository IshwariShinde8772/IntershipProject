import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import {
  createCompanyHandler,
  deleteCompanyHandler,
  getCompanyHandler,
  listCompaniesHandler,
  updateCompanyHandler
} from "./companies.controller.js";

export const companiesRouter = Router();

companiesRouter.use(authMiddleware);
companiesRouter.get("/", listCompaniesHandler);
companiesRouter.get("/:id", getCompanyHandler);
companiesRouter.post("/", roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR), createCompanyHandler);
companiesRouter.put("/:id", roleGuard(UserRole.SUPER_ADMIN, UserRole.COORDINATOR), updateCompanyHandler);
companiesRouter.delete("/:id", roleGuard(UserRole.SUPER_ADMIN), deleteCompanyHandler);
