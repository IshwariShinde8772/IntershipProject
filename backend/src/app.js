import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { studentsRouter } from "./modules/students/students.routes.js";
import { companiesRouter } from "./modules/companies/companies.routes.js";
import { drivesRouter } from "./modules/drives/drives.routes.js";
import { applicationsRouter } from "./modules/applications/applications.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { uploadsRouter } from "./modules/uploads/uploads.routes.js";

export const app = express();

app.use(
  cors({
    origin: env.appOrigin,
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/drives", drivesRouter);
app.use("/api", applicationsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/uploads", uploadsRouter);

app.use(errorHandler);
