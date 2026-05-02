import dotenv from "dotenv";

dotenv.config();

const parseOrigins = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return ["http://localhost:5173"];
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  appOrigin: process.env.APP_ORIGIN ?? "http://localhost:5173",
  appOrigins: parseOrigins(process.env.APP_ORIGIN),
  databaseUrl: process.env.DATABASE_URL,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "change-me",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "change-me-too",
  jwtResetSecret: process.env.JWT_RESET_SECRET ?? "change-reset",
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? "7d",
  refreshCookieName: process.env.REFRESH_COOKIE_NAME ?? "refreshToken",
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL ?? "tpo@kbtcoe.org",
  mailFromEmail: process.env.MAIL_FROM_EMAIL,
  mailFromName: process.env.MAIL_FROM_NAME ?? "KBTCOE Placement Portal",
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: String(process.env.SMTP_SECURE ?? "").trim().toLowerCase() === "true",
  smtpRequireTls: String(process.env.SMTP_REQUIRE_TLS ?? "").trim().toLowerCase() === "true",
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET
};
