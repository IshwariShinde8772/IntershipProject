import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import {
  handleChangePassword,
  handleChangePasswordOtpRequest,
  handleForgotPassword,
  handleResetPassword,
  login,
  logout,
  me,
  refresh,
  studentSignup
} from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/student-signup", studentSignup);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", authMiddleware, logout);
authRouter.get("/me", authMiddleware, me);
authRouter.post("/change-password/request-otp", authMiddleware, handleChangePasswordOtpRequest);
authRouter.post("/change-password", authMiddleware, handleChangePassword);
authRouter.post("/forgot-password", handleForgotPassword);
authRouter.post("/reset-password", handleResetPassword);
