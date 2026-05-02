import createError from "http-errors";

export const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

export const isKbtcoeEmail = (email) => normalizeEmail(email).endsWith("@kbtcoe.org");

export const assertKbtcoeEmail = (email) => {
  if (!isKbtcoeEmail(email)) {
    throw createError(400, "Only @kbtcoe.org email addresses are allowed for student accounts");
  }
};

export const getDefaultStudentPassword = ({ college_email, college_id, prn }) => {
  const email = normalizeEmail(college_email);
  if (email.includes("@")) {
    return email.split("@")[0];
  }

  if (college_id) {
    return String(college_id).trim().toLowerCase();
  }

  if (prn) {
    return String(prn).trim().toLowerCase();
  }

  throw createError(400, "Unable to derive a default password for the student account");
};
