import createError from "http-errors";
import { prisma } from "../../config/prisma.js";
import { logAction } from "../../utils/audit.js";

const sanitizeCompanyPayload = (payload = {}) => {
  const data = {
    name: String(payload.name ?? "").trim(),
    industry: payload.industry ? String(payload.industry).trim() : null,
    hr_name: payload.hr_name ? String(payload.hr_name).trim() : null,
    hr_email: payload.hr_email ? String(payload.hr_email).trim().toLowerCase() : null,
    hr_phone: payload.hr_phone ? String(payload.hr_phone).trim() : null,
    website: payload.website ? String(payload.website).trim() : null,
    description: payload.description ? String(payload.description).trim() : null,
    logo_url: payload.logo_url ? String(payload.logo_url).trim() : null
  };

  if (!data.name) {
    throw createError(400, "Company name is required");
  }

  return data;
};

export const listCompanies = async () =>
  prisma.company.findMany({
    include: {
      _count: {
        select: {
          drives: true
        }
      },
      drives: {
        orderBy: {
          drive_date: "desc"
        },
        take: 1
      }
    },
    orderBy: {
      name: "asc"
    }
  });

export const getCompanyById = async (id) => {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      drives: {
        orderBy: {
          drive_date: "desc"
        }
      }
    }
  });

  if (!company) {
    throw createError(404, "Company not found");
  }

  return company;
};

export const createCompany = async (payload, actorId) => {
  const data = sanitizeCompanyPayload(payload);
  const company = await prisma.company.create({
    data
  });

  await logAction(actorId, "Company", company.id, "CREATE", null, company);
  return company;
};

export const updateCompany = async (id, payload, actorId) => {
  const existing = await getCompanyById(id);
  const data = sanitizeCompanyPayload(payload);
  const company = await prisma.company.update({
    where: { id },
    data
  });

  await logAction(actorId, "Company", company.id, "UPDATE", existing, company);
  return company;
};

export const deleteCompany = async (id, actorId) => {
  const existing = await getCompanyById(id);
  await prisma.company.delete({
    where: { id }
  });
  await logAction(actorId, "Company", id, "DELETE", existing, null);
};
