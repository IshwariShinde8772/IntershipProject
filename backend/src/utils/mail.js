import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transport;

const hasValue = (value) => {
  const normalized = String(value ?? "").trim();
  return Boolean(normalized) && !normalized.startsWith("replace_with_");
};

const getAuthConfig = () => {
  const user = hasValue(env.smtpUser) ? env.smtpUser : null;
  const pass = hasValue(env.smtpPass)
    ? env.smtpPass
    : hasValue(env.sendgridApiKey)
      ? env.sendgridApiKey
      : null;

  if (!user || !pass) {
    return undefined;
  }

  return { user, pass };
};

const hasMailConfig = () => hasValue(env.smtpHost) && hasValue(env.sendgridFromEmail) && Boolean(getAuthConfig());

const getTransport = () => {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: getAuthConfig()
    });
  }

  return transport;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!hasMailConfig()) {
    return {
      skipped: true,
      reason: "SMTP is not configured"
    };
  }

  return getTransport().sendMail({
    from: env.sendgridFromEmail,
    to,
    subject,
    html,
    text
  });
};
