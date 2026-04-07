import createError from "http-errors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import {
  comparePassword,
  hashPassword,
  signAccessToken,
  signRefreshToken,
  signResetToken
} from "../../utils/auth.js";
import { sendEmail } from "../../utils/mail.js";
import { logAction } from "../../utils/audit.js";

const userSelect = {
  id: true,
  email: true,
  role: true,
  is_active: true,
  student: {
    select: {
      id: true,
      name: true,
      department: true
    }
  }
};

export const getSafeUser = (user) => ({
  id: user.id,
  name: user.student?.name ?? user.email,
  email: user.email,
  role: user.role,
  studentId: user.student?.id ?? null,
  department: user.student?.department ?? null
});

export const buildRefreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: env.nodeEnv === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000
});

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
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

  if (!user || !(await comparePassword(password, user.password_hash))) {
    throw createError(401, "Invalid email or password");
  }

  if (!user.is_active) {
    throw createError(403, "User account is inactive");
  }

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

  const password_hash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password_hash }
  });

  await logAction(userId, "User", userId, "UPDATE", null, {
    action: "change-password"
  });
};

export const forgotPassword = async (email) => {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: userSelect
  });

  if (!user) {
    return { message: "If the account exists, a reset link has been sent" };
  }

  const resetToken = signResetToken(user);
  const reset_token_hash = await bcrypt.hash(resetToken, 10);
  const reset_token_expires_at = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      reset_token_hash,
      reset_token_expires_at
    }
  });

  const resetUrl = `${env.appOrigin}/reset-password?token=${encodeURIComponent(resetToken)}`;
  await sendEmail({
    to: user.email,
    subject: "KBTCOE Placement Portal Password Reset",
    html: `<p>Hello,</p><p>Use this link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    text: `Reset your password using this link: ${resetUrl}`
  });

  return { message: "If the account exists, a reset link has been sent" };
};

export const resetPassword = async (token, newPassword) => {
  let payload;
  try {
    payload = jwt.verify(token, env.jwtResetSecret);
  } catch {
    throw createError(400, "Reset token is invalid or expired");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub }
  });

  if (
    !user ||
    !user.reset_token_hash ||
    !user.reset_token_expires_at ||
    user.reset_token_expires_at < new Date()
  ) {
    throw createError(400, "Reset token is invalid or expired");
  }

  const validToken = await bcrypt.compare(token, user.reset_token_hash);
  if (!validToken) {
    throw createError(400, "Reset token is invalid or expired");
  }

  const password_hash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password_hash,
      reset_token_hash: null,
      reset_token_expires_at: null
    }
  });

  await logAction(user.id, "User", user.id, "UPDATE", null, {
    action: "reset-password"
  });
};
