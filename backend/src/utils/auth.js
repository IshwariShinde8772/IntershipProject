import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const hashPassword = (value) => bcrypt.hash(value, 10);
export const comparePassword = (value, hash) => bcrypt.compare(value, hash);

export const signAccessToken = (user) =>
  jwt.sign(
    {
      role: user.role,
      email: user.email
    },
    env.jwtAccessSecret,
    {
      subject: user.id,
      expiresIn: env.accessTokenTtl
    }
  );

export const signRefreshToken = (user) =>
  jwt.sign(
    {
      role: user.role
    },
    env.jwtRefreshSecret,
    {
      subject: user.id,
      expiresIn: env.refreshTokenTtl
    }
  );

export const signResetToken = (user) =>
  jwt.sign(
    {
      email: user.email
    },
    env.jwtResetSecret,
    {
      subject: user.id,
      expiresIn: "30m"
    }
  );
