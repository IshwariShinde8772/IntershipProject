import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import {
  buildRefreshCookieOptions,
  confirmChangePassword,
  forgotPassword,
  loginUser,
  logoutUser,
  requestChangePasswordOtp,
  refreshAccessToken,
  resetPassword,
  signupStudent
} from "./auth.service.js";

export const login = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await loginUser(req.body);

  res
    .cookie(env.refreshCookieName, refreshToken, buildRefreshCookieOptions())
    .json({ accessToken, user });
});

export const studentSignup = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await signupStudent(req.body);

  res
    .cookie(env.refreshCookieName, refreshToken, buildRefreshCookieOptions())
    .status(201)
    .json({ accessToken, user });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies[env.refreshCookieName];
  const payload = await refreshAccessToken(token);
  res.json(payload);
});

export const logout = asyncHandler(async (req, res) => {
  await logoutUser(req.user.id);

  res.clearCookie(env.refreshCookieName, buildRefreshCookieOptions()).json({
    message: "Logged out successfully"
  });
});

export const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          department: true
        }
      }
    }
  });

  res.json({
    user: {
      id: user.id,
      name: user.student?.name ?? user.email,
      email: user.email,
      role: user.role,
      studentId: user.student?.id ?? null,
      department: user.student?.department ?? null,
      mustChangePassword: Boolean(user.must_change_password)
    }
  });
});

export const handleChangePasswordOtpRequest = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await requestChangePasswordOtp(req.user.id, currentPassword, newPassword);
  res.json(result);
});

export const handleChangePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, otp } = req.body;
  await confirmChangePassword(req.user.id, currentPassword, newPassword, otp);
  res.json({ message: "Password changed successfully" });
});

export const handleForgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await forgotPassword(email);
  res.json(result);
});

export const handleResetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  await resetPassword(email, otp, newPassword);
  res.json({ message: "Password reset successfully" });
});
