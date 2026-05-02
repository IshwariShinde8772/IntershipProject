import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transport;

const hasValue = (value) => {
  const normalized = String(value ?? "").trim();
  return Boolean(normalized) && !normalized.startsWith("replace_with_");
};

const normalizeValue = (value) => String(value ?? "").trim();

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

const resolveFromEmail = () => {
  if (hasValue(env.mailFromEmail)) {
    return normalizeValue(env.mailFromEmail);
  }

  if (hasValue(env.sendgridFromEmail)) {
    return normalizeValue(env.sendgridFromEmail);
  }

  if (hasValue(env.smtpUser) && normalizeValue(env.smtpUser).includes("@")) {
    return normalizeValue(env.smtpUser);
  }

  return null;
};

const resolveFromAddress = () => {
  const email = resolveFromEmail();
  if (!email) {
    return null;
  }

  const name = normalizeValue(env.mailFromName);
  return name ? `"${name.replace(/"/g, '\\"')}" <${email}>` : email;
};

export const getMailConfigStatus = () => {
  const missing = [];

  if (!hasValue(env.smtpHost)) {
    missing.push("SMTP_HOST");
  }

  if (!hasValue(env.smtpUser)) {
    missing.push("SMTP_USER");
  }

  if (!hasValue(env.smtpPass) && !hasValue(env.sendgridApiKey)) {
    missing.push("SMTP_PASS or SENDGRID_API_KEY");
  }

  if (!resolveFromEmail()) {
    missing.push("MAIL_FROM_EMAIL or SENDGRID_FROM_EMAIL");
  }

  const warnings = [];
  const smtpHost = normalizeValue(env.smtpHost).toLowerCase();
  const fromEmail = resolveFromEmail();

  if (smtpHost.includes("sendgrid.net") && fromEmail && fromEmail.endsWith("@gmail.com")) {
    warnings.push("For SendGrid SMTP, the from email must be a verified sender in your SendGrid account.");
  }

  if (smtpHost.includes("gmail.com") && fromEmail && hasValue(env.smtpUser) && normalizeValue(env.smtpUser) !== fromEmail) {
    warnings.push("For Gmail SMTP, MAIL_FROM_EMAIL should usually match SMTP_USER.");
  }

  return {
    configured: missing.length === 0,
    host: hasValue(env.smtpHost) ? normalizeValue(env.smtpHost) : null,
    port: env.smtpPort,
    secure: env.smtpSecure || env.smtpPort === 465,
    require_tls: env.smtpRequireTls,
    auth_user: hasValue(env.smtpUser) ? normalizeValue(env.smtpUser) : null,
    from_email: fromEmail,
    from_name: normalizeValue(env.mailFromName) || null,
    missing,
    warnings
  };
};

const hasMailConfig = () => getMailConfigStatus().configured;

const getTransport = () => {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure || env.smtpPort === 465,
      requireTLS: env.smtpRequireTls,
      auth: getAuthConfig()
    });
  }

  return transport;
};

export const resetMailTransport = () => {
  transport = undefined;
};

const extractMailErrorMessage = (error) => {
  if (!error) {
    return "Unknown email error";
  }

  const response = normalizeValue(error.response);
  if (response) {
    return response;
  }

  const message = normalizeValue(error.message);
  return message || "Unknown email error";
};

export const verifyMailTransport = async () => {
  const status = getMailConfigStatus();

  if (!status.configured) {
    return {
      ok: false,
      configured: false,
      status,
      message: `Email is not configured. Missing: ${status.missing.join(", ")}`
    };
  }

  try {
    await getTransport().verify();
    return {
      ok: true,
      configured: true,
      status,
      message: "SMTP connection verified successfully"
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      status,
      message: extractMailErrorMessage(error)
    };
  }
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const status = getMailConfigStatus();

  if (!status.configured) {
    return {
      skipped: true,
      reason: `SMTP is not configured. Missing: ${status.missing.join(", ")}`
    };
  }

  try {
    return await getTransport().sendMail({
      from: resolveFromAddress(),
      to,
      subject,
      html,
      text
    });
  } catch (error) {
    error.message = extractMailErrorMessage(error);
    throw error;
  }
};

export const isMailConfigured = () => hasMailConfig();
