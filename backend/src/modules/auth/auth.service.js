import { StudentDepartment, UserRole } from "@prisma/client";
import createError from "http-errors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import {
  comparePassword,
  hashPassword,
  signAccessToken,
  signRefreshToken
} from "../../utils/auth.js";
import { isMailConfigured, sendEmail } from "../../utils/mail.js";
import { logAction } from "../../utils/audit.js";
import { assertKbtcoeEmail, isKbtcoeEmail, normalizeEmail } from "../../utils/studentAccount.js";

const sessionUserInclude = {
  student: {
    select: {
      id: true,
      name: true,
      department: true
    }
  }
};

const userSelect = {
  id: true,
  email: true,
  role: true,
  is_active: true,
  must_change_password: true,
  reset_token_hash: true,
  reset_token_purpose: true,
  reset_token_expires_at: true,
  password_hash: true,
  student: {
    select: {
      id: true,
      name: true,
      department: true
    }
  }
};

const normalizeText = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
};

const validatePassword = (password) => {
  if (String(password ?? "").trim().length < 8) {
    throw createError(400, "Password must be at least 8 characters long");
  }
};

const PASSWORD_OTP_PURPOSE = {
  FORGOT_PASSWORD: "FORGOT_PASSWORD",
  CHANGE_PASSWORD: "CHANGE_PASSWORD"
};

const PASSWORD_OTP_EXPIRY_MINUTES = 10;

const validateOtp = (otp) => {
  const normalized = String(otp ?? "").trim();

  if (!/^\d{6}$/.test(normalized)) {
    throw createError(400, "Enter a valid 6-digit OTP");
  }

  return normalized;
};

const validateDepartment = (department) => {
  const normalized = normalizeText(department);
  if (!normalized) {
    return null;
  }

  const departmentMap = new Map(
    Object.values(StudentDepartment).map((item) => [item.toLowerCase(), item])
  );
  const value = departmentMap.get(normalized.toLowerCase());

  if (!value) {
    throw createError(400, "Invalid department value");
  }

  return value;
};

const assertStudentActivationIdentifiers = (student, prn, collegeId) => {
  const existingPrn = normalizeText(student?.prn)?.toLowerCase();
  const existingCollegeId = normalizeText(student?.college_id)?.toLowerCase();
  const normalizedPrn = normalizeText(prn)?.toLowerCase();
  const normalizedCollegeId = normalizeText(collegeId)?.toLowerCase();

  if ((existingPrn || existingCollegeId) && !normalizedPrn && !normalizedCollegeId) {
    throw createError(400, "Enter the imported PRN or College ID to activate this account");
  }

  if (existingPrn && normalizedPrn && existingPrn !== normalizedPrn) {
    throw createError(400, "The entered PRN does not match the imported student record");
  }

  if (existingCollegeId && normalizedCollegeId && existingCollegeId !== normalizedCollegeId) {
    throw createError(400, "The entered College ID does not match the imported student record");
  }
};

const getSessionUser = (userId) =>
  prisma.user.findUnique({
    where: { id: userId },
    include: sessionUserInclude
  });

const clearPasswordOtp = (userId) =>
  prisma.user.update({
    where: { id: userId },
    data: {
      reset_token_hash: null,
      reset_token_purpose: null,
      reset_token_expires_at: null
    }
  });

const ensureNewPasswordIsDifferent = async (newPassword, passwordHash) => {
  const matchesCurrent = await comparePassword(newPassword, passwordHash);

  if (matchesCurrent) {
    throw createError(400, "New password must be different from the current password");
  }
};

const getPasswordOtpCopy = (purpose, otp) => {
  if (purpose === PASSWORD_OTP_PURPOSE.CHANGE_PASSWORD) {
    return {
      subject: "KBTCOE Password Change OTP",
      html: `<p>Hello,</p><p>Your OTP to change the password is <strong>${otp}</strong>.</p><p>This OTP will expire in ${PASSWORD_OTP_EXPIRY_MINUTES} minutes.</p>`,
      text: `Your OTP to change the password is ${otp}. It will expire in ${PASSWORD_OTP_EXPIRY_MINUTES} minutes.`
    };
  }

  return {
    subject: "KBTCOE Forgot Password OTP",
    html: `<p>Hello,</p><p>Your OTP to reset the password is <strong>${otp}</strong>.</p><p>This OTP will expire in ${PASSWORD_OTP_EXPIRY_MINUTES} minutes.</p>`,
    text: `Your OTP to reset the password is ${otp}. It will expire in ${PASSWORD_OTP_EXPIRY_MINUTES} minutes.`
  };
};

const sendPasswordOtp = async ({ user, purpose }) => {
  if (!isMailConfigured()) {
    throw createError(503, "Email service is not configured");
  }

  if (!user?.is_active) {
    throw createError(403, "User account is inactive");
  }

  const otp = String(randomInt(100000, 1000000));
  const reset_token_hash = await bcrypt.hash(otp, 10);
  const reset_token_expires_at = new Date(Date.now() + PASSWORD_OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      reset_token_hash,
      reset_token_purpose: purpose,
      reset_token_expires_at
    }
  });

  try {
    const emailCopy = getPasswordOtpCopy(purpose, otp);
    const result = await sendEmail({
      to: user.email,
      ...emailCopy
    });

    if (result?.skipped) {
      throw createError(503, "Email service is not configured");
    }
  } catch (error) {
    await clearPasswordOtp(user.id);
    throw error;
  }
};

const verifyPasswordOtp = async ({ user, otp, purpose }) => {
  const normalizedOtp = validateOtp(otp);

  if (
    !user?.reset_token_hash ||
    !user?.reset_token_expires_at ||
    user.reset_token_expires_at < new Date() ||
    user.reset_token_purpose !== purpose
  ) {
    throw createError(400, "OTP is invalid or expired");
  }

  const validOtp = await bcrypt.compare(normalizedOtp, user.reset_token_hash);

  if (!validOtp) {
    throw createError(400, "OTP is invalid or expired");
  }
};

const createAuthPayload = async (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const refresh_token_hash = await bcrypt.hash(refreshToken, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { refresh_token_hash }
  });

  return {
    accessToken,
    refreshToken,
    user: getSafeUser(user)
  };
};

export const getSafeUser = (user) => ({
  id: user.id,
  name: user.student?.name ?? user.email,
  email: user.email,
  role: user.role,
  studentId: user.student?.id ?? null,
  department: user.student?.department ?? null,
  mustChangePassword: Boolean(user.must_change_password)
});

export const buildRefreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: env.nodeEnv === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000
});

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: sessionUserInclude
  });

  if (!user || !(await comparePassword(password, user.password_hash))) {
    throw createError(401, "Invalid email or password");
  }

  if (!user.is_active) {
    throw createError(403, "User account is inactive");
  }

  if (user.role === UserRole.STUDENT && !isKbtcoeEmail(user.email)) {
    throw createError(403, "Only @kbtcoe.org email addresses are allowed for student sign in");
  }

  return createAuthPayload(user);
};

export const signupStudent = async ({ email, password, name, prn, college_id, department }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeText(name);
  const normalizedPrn = normalizeText(prn);
  const normalizedCollegeId = normalizeText(college_id);
  const normalizedDepartment = validateDepartment(department);

  assertKbtcoeEmail(normalizedEmail);
  validatePassword(password);

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      student: true
    }
  });

  const userId = await prisma.$transaction(async (tx) => {
    const password_hash = await hashPassword(password);

    if (existingUser) {
      if (existingUser.role !== UserRole.STUDENT) {
        throw createError(409, "This email is already used by a non-student account");
      }

      if (existingUser.student) {
        assertStudentActivationIdentifiers(existingUser.student, normalizedPrn, normalizedCollegeId);

        await tx.student.update({
          where: { id: existingUser.student.id },
          data: {
            name: existingUser.student.name ?? normalizedName,
            prn: existingUser.student.prn ?? normalizedPrn,
            college_id: existingUser.student.college_id ?? normalizedCollegeId,
            department: existingUser.student.department ?? normalizedDepartment,
            college_email: normalizedEmail,
            consent_declaration: existingUser.student.consent_declaration ?? false
          }
        });
      } else {
        if (!normalizedPrn && !normalizedCollegeId) {
          throw createError(400, "PRN or College ID is required to create a student account");
        }

        await tx.student.create({
          data: {
            user_id: existingUser.id,
            name: normalizedName,
            prn: normalizedPrn,
            college_id: normalizedCollegeId,
            department: normalizedDepartment,
            college_email: normalizedEmail,
            consent_declaration: false
          }
        });
      }

      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          email: normalizedEmail,
          password_hash,
          role: UserRole.STUDENT,
          is_active: true,
          must_change_password: false
        }
      });

      await tx.auditLog.create({
        data: {
          user_id: existingUser.id,
          entity_type: "Auth",
          entity_id: existingUser.id,
          action: "UPDATE",
          new_value: {
            action: "student-signup-activation",
            email: normalizedEmail
          }
        }
      });

      return existingUser.id;
    }

    if (!normalizedPrn && !normalizedCollegeId) {
      throw createError(400, "PRN or College ID is required to create a student account");
    }

    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        password_hash,
        role: UserRole.STUDENT,
        is_active: true,
        must_change_password: false
      }
    });

    await tx.student.create({
      data: {
        user_id: user.id,
        name: normalizedName,
        prn: normalizedPrn,
        college_id: normalizedCollegeId,
        department: normalizedDepartment,
        college_email: normalizedEmail,
        consent_declaration: false
      }
    });

    await tx.auditLog.create({
      data: {
        user_id: user.id,
        entity_type: "Auth",
        entity_id: user.id,
        action: "CREATE",
        new_value: {
          action: "student-signup",
          email: normalizedEmail
        }
      }
    });

    return user.id;
  });

  const user = await getSessionUser(userId);
  return createAuthPayload(user);
};

export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw createError(401, "Refresh token is missing");
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch {
    throw createError(401, "Invalid refresh token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: sessionUserInclude
  });

  if (!user?.refresh_token_hash || !user.is_active) {
    throw createError(401, "Refresh token is not valid");
  }

  const isMatch = await bcrypt.compare(refreshToken, user.refresh_token_hash);
  if (!isMatch) {
    throw createError(401, "Refresh token is not valid");
  }

  return {
    accessToken: signAccessToken(user),
    user: getSafeUser(user)
  };
};

export const logoutUser = async (userId) => {
  if (!userId) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      refresh_token_hash: null
    }
  });
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  validatePassword(newPassword);

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw createError(404, "User not found");
  }

  const matches = await comparePassword(currentPassword, user.password_hash);
  if (!matches) {
    throw createError(400, "Current password is incorrect");
  }

  await ensureNewPasswordIsDifferent(newPassword, user.password_hash);

  const password_hash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: {
      password_hash,
      must_change_password: false,
      reset_token_hash: null,
      reset_token_purpose: null,
      reset_token_expires_at: null
    }
  });

  await logAction(userId, "User", userId, "UPDATE", null, {
    action: "change-password"
  });
};

export const requestChangePasswordOtp = async (userId, currentPassword, newPassword) => {
  validatePassword(newPassword);

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw createError(404, "User not found");
  }

  const matches = await comparePassword(currentPassword, user.password_hash);
  if (!matches) {
    throw createError(400, "Current password is incorrect");
  }

  await ensureNewPasswordIsDifferent(newPassword, user.password_hash);
  await sendPasswordOtp({
    user,
    purpose: PASSWORD_OTP_PURPOSE.CHANGE_PASSWORD
  });

  return {
    message: "A 6-digit OTP has been sent to your email address"
  };
};

export const confirmChangePassword = async (userId, currentPassword, newPassword, otp) => {
  validatePassword(newPassword);

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw createError(404, "User not found");
  }

  const matches = await comparePassword(currentPassword, user.password_hash);
  if (!matches) {
    throw createError(400, "Current password is incorrect");
  }

  await ensureNewPasswordIsDifferent(newPassword, user.password_hash);
  await verifyPasswordOtp({
    user,
    otp,
    purpose: PASSWORD_OTP_PURPOSE.CHANGE_PASSWORD
  });

  const password_hash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: {
      password_hash,
      must_change_password: false,
      reset_token_hash: null,
      reset_token_purpose: null,
      reset_token_expires_at: null
    }
  });

  await logAction(userId, "User", userId, "UPDATE", null, {
    action: "change-password-otp"
  });
};

export const forgotPassword = async (email) => {
  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: userSelect
  });

  if (!user) {
    return { message: "If the account exists, a 6-digit OTP has been sent to that email address" };
  }

  await sendPasswordOtp({
    user,
    purpose: PASSWORD_OTP_PURPOSE.FORGOT_PASSWORD
  });

  return { message: "If the account exists, a 6-digit OTP has been sent to that email address" };
};

export const resetPassword = async (email, otp, newPassword) => {
  validatePassword(newPassword);

  const normalizedEmail = normalizeEmail(email);
  validateOtp(otp);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (!user) {
    throw createError(400, "OTP is invalid or expired");
  }

  await ensureNewPasswordIsDifferent(newPassword, user.password_hash);
  await verifyPasswordOtp({
    user,
    otp,
    purpose: PASSWORD_OTP_PURPOSE.FORGOT_PASSWORD
  });

  const password_hash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password_hash,
      must_change_password: false,
      refresh_token_hash: null,
      reset_token_hash: null,
      reset_token_purpose: null,
      reset_token_expires_at: null
    }
  });

  await logAction(user.id, "User", user.id, "UPDATE", null, {
    action: "forgot-password-otp-reset"
  });
};
