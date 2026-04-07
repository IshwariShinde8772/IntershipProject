import createError from "http-errors";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

export const authMiddleware = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw createError(401, "Authentication required");
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, env.jwtAccessSecret);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        student: {
          select: {
            id: true,
            department: true,
            name: true
          }
        }
      }
    });

    if (!user || !user.is_active) {
      throw createError(401, "User account is inactive");
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      studentId: user.student?.id ?? null,
      department: user.student?.department ?? null,
      name: user.student?.name ?? null
    };

    next();
  } catch (error) {
    next(createError(401, error.message || "Invalid token"));
  }
};
