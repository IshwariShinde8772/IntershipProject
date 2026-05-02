import {
  AcademicEntryMode,
  ImportStatus,
  PlacementStatus,
  StudentCategory,
  StudentDepartment,
  UserRole
} from "@prisma/client";
import bcrypt from "bcryptjs";
import createError from "http-errors";
import XLSX from "xlsx";
import { prisma } from "../../config/prisma.js";
import { runEligibilityForStudent } from "../eligibility/eligibility.service.js";
import { analyzeEligibility } from "../eligibility/engine.js";
import { logAction } from "../../utils/audit.js";
import { getApplicationResponseBucket } from "../../utils/driveAnalytics.js";
import { buildWorkbook } from "../../utils/excel.js";
import { pick, toDateOrNull, toNumberOrNull } from "../../utils/normalize.js";
import { assertKbtcoeEmail, getDefaultStudentPassword, normalizeEmail } from "../../utils/studentAccount.js";
import { getStudentProfileStatus, withStudentProfileStatus } from "../../utils/studentProfile.js";

const createStudentFields = [
  "prn",
  "college_id",
  "name",
  "gender",
  "dob",
  "category",
  "department",
  "entry_mode",
  "admission_year",
  "native_place",
  "district",
  "permanent_address",
  "personal_email",
  "college_email",
  "personal_contact",
  "alternate_contact",
  "aadhar_no",
  "pan_no",
  "father_occupation",
  "mother_occupation",
  "sibling_info",
  "ssc_percentage",
  "ssc_year",
  "hsc_percentage",
  "hsc_board",
  "hsc_year",
  "cet_jee_score",
  "ssc_marksheet_url",
  "hsc_marksheet_url",
  "diploma_percentage",
  "diploma_branch",
  "diploma_board",
  "diploma_year",
  "diploma_marksheet_url",
  "fe_sem1_sgpa",
  "fe_sem2_sgpa",
  "se_sem3_sgpa",
  "se_sem4_sgpa",
  "te_sem5_sgpa",
  "te_sem6_sgpa",
  "be_sem7_sgpa",
  "be_sem8_sgpa",
  "aggregate_cgpa",
  "dead_atkt_count",
  "live_atkt_count",
  "year_drop",
  "achievements",
  "technical_certifications",
  "internships",
  "be_project_title",
  "trainings_required",
  "career_choice",
  "industry_contact_name",
  "industry_contact_org",
  "industry_contact_position",
  "industry_contact_phone",
  "engineering_marksheets_url",
  "aadhar_card_url",
  "resume_url",
  "profile_photo_url",
  "placement_status",
  "consent_declaration"
];

const studentSelfEditableFields = createStudentFields.filter(
  (field) => !["college_email", "placement_status"].includes(field)
);

const studentImportTemplateColumns = [
  {
    field: "prn",
    header: "PRN",
    required: true,
    example: "72001869L",
    notes: "Unique PRN for the student",
    aliases: ["PRN (Eg-72001869L)"]
  },
  {
    field: "college_id",
    header: "College ID",
    required: true,
    example: "KBTUG19338",
    notes: "Unique college ID",
    aliases: ["KBTUG College ID (Eg-KBTUG19338)"]
  },
  {
    field: "name",
    header: "Student Name",
    required: true,
    example: "Asha Sunil Patil",
    notes: "Full name as used in records",
    aliases: ["Name of the Student Format (First Middle Last name)"]
  },
  {
    field: "gender",
    header: "Gender",
    required: true,
    example: "Female",
    notes: "Use Male or Female",
    aliases: ["Gender"]
  },
  {
    field: "dob",
    header: "Date of Birth",
    required: true,
    example: "2003-01-15",
    notes: "Use YYYY-MM-DD format",
    aliases: ["Date Of Birth"]
  },
  {
    field: "category",
    header: "Category",
    required: true,
    example: "Open",
    notes: "Use Open, OBC, SC, ST, NT, or VJ",
    aliases: ["Category (Eg Open/OBC/SC/ST ..etc)"]
  },
  {
    field: "department",
    header: "Department",
    required: true,
    example: "COMP",
    notes: "Use IT, COMP, MECH, CIVIL, ENTC, or ETRX",
    aliases: ["Department"]
  },
  {
    field: "entry_mode",
    header: "Admission Type",
    required: true,
    example: "HSC",
    notes: "Use HSC or DIPLOMA",
    aliases: ["Admission Type (HSC/Diploma)"]
  },
  {
    field: "admission_year",
    header: "Admission Year",
    required: true,
    example: "2021",
    notes: "Year of first engineering admission or direct second year admission",
    aliases: ["First Year Engineering/Direc second Year Admission"]
  },
  {
    field: "native_place",
    header: "Native Place",
    required: true,
    example: "Nashik",
    notes: "Student native place",
    aliases: ["Native Place"]
  },
  {
    field: "district",
    header: "District",
    required: true,
    example: "Nashik",
    notes: "Student district",
    aliases: ["District"]
  },
  {
    field: "permanent_address",
    header: "Permanent Address",
    required: true,
    example: "Flat 12, ABC Colony, Nashik",
    notes: "Full permanent address",
    aliases: ["Permanent Address"]
  },
  {
    field: "personal_email",
    header: "Personal Email",
    required: true,
    example: "student.personal@example.com",
    notes: "Personal email address",
    aliases: ["Personal Email ID"]
  },
  {
    field: "college_email",
    header: "College Email",
    required: true,
    example: "kbtug23588@kbtcoe.org",
    notes: "Must be a KBTCOE email",
    aliases: ["College Email ID"]
  },
  {
    field: "personal_contact",
    header: "Personal Contact",
    required: true,
    example: "9876543210",
    notes: "Primary phone number",
    aliases: ["Personal Contact Number"]
  },
  {
    field: "alternate_contact",
    header: "Alternate Contact",
    required: true,
    example: "9123456780",
    notes: "Alternate phone number",
    aliases: ["Alternate Contact Number"]
  },
  {
    field: "aadhar_no",
    header: "Aadhaar Number",
    required: true,
    example: "123412341234",
    notes: "Aadhaar number only",
    aliases: ["Aadhar card no"]
  },
  {
    field: "pan_no",
    header: "PAN Number",
    required: false,
    example: "ABCDE1234F",
    notes: "PAN card number if available",
    aliases: ["Pan card no"]
  },
  {
    field: "father_occupation",
    header: "Father Occupation",
    required: true,
    example: "Farmer",
    notes: "Father occupation details",
    aliases: ["Father Occupation"]
  },
  {
    field: "mother_occupation",
    header: "Mother Occupation",
    required: true,
    example: "Teacher",
    notes: "Mother occupation details",
    aliases: ["Mother Occupation"]
  },
  {
    field: "sibling_info",
    header: "Sibling Info",
    required: false,
    example: "One sister studying MBA",
    notes: "Sibling education or occupation",
    aliases: ["Sibling Education / Occupation"]
  },
  {
    field: "ssc_percentage",
    header: "10th Percentage",
    required: true,
    example: "88.40",
    notes: "SSC percentage",
    aliases: ["SSC Percentage"]
  },
  {
    field: "ssc_year",
    header: "10th Passing Year",
    required: true,
    example: "2019",
    notes: "SSC passing year",
    aliases: ["SSC Passing Year"]
  },
  {
    field: "hsc_percentage",
    header: "12th Percentage",
    required: false,
    example: "82.15",
    notes: "Required when Admission Type is HSC",
    aliases: ["HSC Percentage"]
  },
  {
    field: "hsc_board",
    header: "12th Board",
    required: false,
    example: "HSC",
    notes: "Required when Admission Type is HSC",
    aliases: ["12th Board"]
  },
  {
    field: "hsc_year",
    header: "12th Passing Year",
    required: false,
    example: "2021",
    notes: "Required when Admission Type is HSC",
    aliases: ["HSC Passing Year"]
  },
  {
    field: "cet_jee_score",
    header: "CET/JEE Score",
    required: false,
    example: "92.14 percentile",
    notes: "Required when Admission Type is HSC",
    aliases: ["CET/JEE Marks If Applicable"]
  },
  {
    field: "ssc_marksheet_url",
    header: "10th Marksheet URL",
    required: false,
    example: "https://example.com/10th.pdf",
    notes: "Optional hosted document URL"
  },
  {
    field: "hsc_marksheet_url",
    header: "12th Marksheet URL",
    required: false,
    example: "https://example.com/12th.pdf",
    notes: "Optional hosted document URL for HSC students"
  },
  {
    field: "diploma_percentage",
    header: "Diploma Percentage",
    required: false,
    example: "86.70",
    notes: "Required when Admission Type is DIPLOMA",
    aliases: ["Diploma Percentage"]
  },
  {
    field: "diploma_branch",
    header: "Diploma Branch",
    required: false,
    example: "Computer Engineering",
    notes: "Required when Admission Type is DIPLOMA",
    aliases: ["Diploma Branch"]
  },
  {
    field: "diploma_board",
    header: "Diploma Board",
    required: false,
    example: "MSBTE",
    notes: "Required when Admission Type is DIPLOMA",
    aliases: ["Diploma Board"]
  },
  {
    field: "diploma_year",
    header: "Diploma Passing Year",
    required: false,
    example: "2020",
    notes: "Required when Admission Type is DIPLOMA",
    aliases: ["Diploma Passing Year"]
  },
  {
    field: "diploma_marksheet_url",
    header: "Diploma Marksheet URL",
    required: false,
    example: "https://example.com/diploma.pdf",
    notes: "Optional hosted document URL for diploma students"
  },
  {
    field: "fe_sem1_sgpa",
    header: "FE Semester I SGPA",
    required: false,
    example: "8.10",
    notes: "Usually blank for direct second year diploma students",
    aliases: ["FE Semester- I SGPA"]
  },
  {
    field: "fe_sem2_sgpa",
    header: "FE Semester II SGPA",
    required: false,
    example: "8.25",
    notes: "Usually blank for direct second year diploma students",
    aliases: ["FE Semester- II SGPA"]
  },
  {
    field: "se_sem3_sgpa",
    header: "SE Semester III SGPA",
    required: true,
    example: "8.42",
    notes: "SE semester III SGPA",
    aliases: ["SE Semester- III SGPA"]
  },
  {
    field: "se_sem4_sgpa",
    header: "SE Semester IV SGPA",
    required: true,
    example: "8.53",
    notes: "SE semester IV SGPA",
    aliases: ["SE Semester- IV SGPA"]
  },
  {
    field: "te_sem5_sgpa",
    header: "TE Semester V SGPA",
    required: true,
    example: "8.60",
    notes: "TE semester V SGPA",
    aliases: ["TE Semester- V SGPA"]
  },
  {
    field: "te_sem6_sgpa",
    header: "TE Semester VI SGPA",
    required: true,
    example: "8.71",
    notes: "TE semester VI SGPA",
    aliases: ["TE Semester- VI SGPA"]
  },
  {
    field: "be_sem7_sgpa",
    header: "BE Semester VII SGPA",
    required: false,
    example: "8.80",
    notes: "Fill if available"
  },
  {
    field: "be_sem8_sgpa",
    header: "BE Semester VIII SGPA",
    required: false,
    example: "8.90",
    notes: "Fill if available"
  },
  {
    field: "aggregate_cgpa",
    header: "Aggregate CGPA",
    required: true,
    example: "8.56",
    notes: "Overall CGPA till latest declared result",
    aliases: ["Aggregate CGPA of All Semester upto latest result"]
  },
  {
    field: "dead_atkt_count",
    header: "Dead ATKT Count",
    required: true,
    example: "0",
    notes: "Use numeric value",
    aliases: ["Number Of Dead ATKT'S"]
  },
  {
    field: "live_atkt_count",
    header: "Live ATKT Count",
    required: true,
    example: "0",
    notes: "Use numeric value",
    aliases: ["Number Of Live ATKT'S"]
  },
  {
    field: "year_drop",
    header: "Year Drop",
    required: true,
    example: "0",
    notes: "Use numeric value",
    aliases: ["Year Drop"]
  },
  {
    field: "achievements",
    header: "Achievements",
    required: false,
    example: "Winner of coding competition",
    notes: "Any major achievements",
    aliases: ["Special Achievement"]
  },
  {
    field: "technical_certifications",
    header: "Technical Certifications",
    required: false,
    example: "AWS Cloud Practitioner, NPTEL Java",
    notes: "Comma-separated if multiple",
    aliases: ["Technical Certification completed"]
  },
  {
    field: "internships",
    header: "Internships",
    required: false,
    example: "Web development internship at ABC Tech",
    notes: "Internship details",
    aliases: ["Internship"]
  },
  {
    field: "be_project_title",
    header: "BE Project Title",
    required: true,
    example: "Smart Placement Tracker",
    notes: "Current project title",
    aliases: ["BE Project Tittle"]
  },
  {
    field: "trainings_required",
    header: "Trainings Required",
    required: false,
    example: "Aptitude,Technical",
    notes: "Comma-separated values",
    aliases: ["Trainings Required"]
  },
  {
    field: "career_choice",
    header: "Career Choice",
    required: true,
    example: "Job",
    notes: "Use Job, Higher Studies, Startup, or Not Decided",
    aliases: ["Career choice"]
  },
  {
    field: "industry_contact_name",
    header: "Industry Contact Name",
    required: false,
    example: "Mr. Rahul Joshi",
    notes: "Optional referral contact"
  },
  {
    field: "industry_contact_org",
    header: "Industry Contact Organization",
    required: false,
    example: "Infosys",
    notes: "Optional referral organization"
  },
  {
    field: "industry_contact_position",
    header: "Industry Contact Position",
    required: false,
    example: "Senior Engineer",
    notes: "Optional referral designation"
  },
  {
    field: "industry_contact_phone",
    header: "Industry Contact Phone",
    required: false,
    example: "9876501234",
    notes: "Optional referral phone"
  },
  {
    field: "engineering_marksheets_url",
    header: "Engineering Marksheet PDF URL",
    required: false,
    example: "https://example.com/engineering-all-marksheets.pdf",
    notes: "Optional hosted document URL"
  },
  {
    field: "aadhar_card_url",
    header: "Aadhaar Card PDF URL",
    required: false,
    example: "https://example.com/aadhaar.pdf",
    notes: "Optional hosted document URL"
  },
  {
    field: "resume_url",
    header: "Resume URL",
    required: false,
    example: "https://example.com/resume.pdf",
    notes: "Optional hosted resume URL",
    aliases: ["Upload your Resume"]
  },
  {
    field: "profile_photo_url",
    header: "Profile Photo URL",
    required: false,
    example: "https://example.com/photo.jpg",
    notes: "Optional hosted profile photo URL"
  },
  {
    field: "placement_status",
    header: "Placement Status",
    required: false,
    example: "NOT_PLACED",
    notes: "Use NOT_PLACED, PLACED, OPTED_OUT, or HIGHER_STUDIES"
  },
  {
    field: "consent_declaration",
    header: "Consent Declaration",
    required: false,
    example: "TRUE",
    notes: "Use TRUE or FALSE"
  }
];

const createEnumMap = (values) =>
  new Map(values.map((value) => [String(value).trim().toLowerCase(), value]));

const categoryMap = createEnumMap(Object.values(StudentCategory));
const departmentMap = createEnumMap(Object.values(StudentDepartment));
const entryModeMap = createEnumMap(Object.values(AcademicEntryMode));
const normalizedExcelToFieldMap = new Map(
  studentImportTemplateColumns.flatMap(({ header, field, aliases = [] }) => [
    [normalizeHeader(header), field],
    ...aliases.map((alias) => [normalizeHeader(alias), field])
  ])
);

const studentProfileInclude = {
  user: {
    select: {
      id: true,
      email: true,
      is_active: true,
      role: true,
      must_change_password: true
    }
  }
};

const parseExcelDate = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      return null;
    }

    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }

  return toDateOrNull(value);
};

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized || ["na", "n/a", "-"].includes(normalized.toLowerCase())) {
    return null;
  }

  return normalized;
}

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const normalizeEnumValue = (value, map, label) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const enumValue = map.get(normalized.toLowerCase());
  if (!enumValue) {
    throw createError(400, `Invalid ${label} value`);
  }

  return enumValue;
};

const validateStudentPayloadEnums = (data) => {
  if (data.category !== undefined) {
    data.category = normalizeEnumValue(data.category, categoryMap, "category");
  }

  if (data.department !== undefined) {
    data.department = normalizeEnumValue(data.department, departmentMap, "department");
  }

  if (data.entry_mode !== undefined) {
    data.entry_mode = normalizeEnumValue(data.entry_mode, entryModeMap, "admission type");
  }

  if (data.college_email !== undefined && data.college_email) {
    assertKbtcoeEmail(data.college_email);
  }

  return data;
};

const sanitizeStudentPayload = (payload, ownProfile = false) => {
  const allowed = ownProfile ? studentSelfEditableFields : createStudentFields;
  const data = pick(payload, allowed);

  Object.keys(data).forEach((key) => {
    if (typeof data[key] === "string" && data[key].trim() === "") {
      data[key] = null;
    }
  });

  const numericFields = [
    "admission_year",
    "ssc_percentage",
    "ssc_year",
    "hsc_percentage",
    "hsc_year",
    "diploma_percentage",
    "diploma_year",
    "fe_sem1_sgpa",
    "fe_sem2_sgpa",
    "se_sem3_sgpa",
    "se_sem4_sgpa",
    "te_sem5_sgpa",
    "te_sem6_sgpa",
    "be_sem7_sgpa",
    "be_sem8_sgpa",
    "aggregate_cgpa",
    "dead_atkt_count",
    "live_atkt_count",
    "year_drop"
  ];

  numericFields.forEach((field) => {
    if (data[field] !== undefined) {
      data[field] = toNumberOrNull(data[field]);
    }
  });

  if (data.dob !== undefined) {
    data.dob = toDateOrNull(data.dob);
  }

  if (data.consent_declaration !== undefined) {
    data.consent_declaration = Boolean(data.consent_declaration);
  }

  if (data.college_email !== undefined) {
    data.college_email = normalizeEmail(data.college_email);
  }

  if (data.personal_email !== undefined && data.personal_email) {
    data.personal_email = normalizeEmail(data.personal_email);
  }

  return validateStudentPayloadEnums(data);
};

const validateCompleteStudentProfile = (student) => {
  const profileStatus = getStudentProfileStatus(student);
  if (!profileStatus.is_complete) {
    throw createError(
      400,
      `Complete required profile fields: ${profileStatus.missing_required_fields.join(", ")}`
    );
  }
};

export const getStudentFilters = (query, reqUser) => {
  const where = {};

  if (query.department) where.department = query.department;
  if (query.placement_status) where.placement_status = query.placement_status;
  if (query.category) where.category = query.category;
  if (query.gender) where.gender = query.gender;

  if (query.cgpa_min || query.cgpa_max) {
    where.aggregate_cgpa = {};
    if (query.cgpa_min) where.aggregate_cgpa.gte = Number(query.cgpa_min);
    if (query.cgpa_max) where.aggregate_cgpa.lte = Number(query.cgpa_max);
  }

  if (query.dead_atkt !== undefined) {
    where.dead_atkt_count = query.dead_atkt === "2+" ? { gte: 2 } : Number(query.dead_atkt);
  }

  if (query.live_atkt !== undefined) {
    where.live_atkt_count = query.live_atkt === "2+" ? { gte: 2 } : Number(query.live_atkt);
  }

  if (query.year_drop === "nodrop") {
    where.year_drop = 0;
  }

  if (query.year_drop === "hasdrop") {
    where.year_drop = { gt: 0 };
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { prn: { contains: query.search, mode: "insensitive" } },
      { college_id: { contains: query.search, mode: "insensitive" } }
    ];
  }

  if (reqUser.role === UserRole.FACULTY && reqUser.department) {
    where.department = reqUser.department;
  }

  return where;
};

export const listStudents = async (query, reqUser) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  const skip = (page - 1) * limit;
  const where = getStudentFilters(query, reqUser);

  const [data, total] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updated_at: "desc" },
      include: {
        user: {
          select: {
            is_active: true
          }
        }
      }
    }),
    prisma.student.count({ where })
  ]);

  return {
    data: data.map((student) => withStudentProfileStatus(student)),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

export const getStudentById = async (id, reqUser) => {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      ...studentProfileInclude,
      applications: {
        include: {
          drive: {
            include: {
              company: true,
              eligibility_criteria: true
            }
          }
        },
        orderBy: {
          created_at: "desc"
        }
      }
    }
  });

  if (!student) {
    throw createError(404, "Student not found");
  }

  if (
    reqUser.role === UserRole.STUDENT &&
    reqUser.studentId !== student.id
  ) {
    throw createError(403, "You can only view your own profile");
  }

  if (
    reqUser.role === UserRole.FACULTY &&
    reqUser.department &&
    student.department !== reqUser.department
  ) {
    throw createError(403, "You can only view students from your department");
  }

  const enrichedStudent = withStudentProfileStatus(student);
  return {
    ...enrichedStudent,
    applications: student.applications.map((application) => {
      const analysis = application.drive.eligibility_criteria
        ? analyzeEligibility(student, application.drive.eligibility_criteria)
        : null;
      return {
        ...application,
        eligibility_analysis: analysis,
        response_bucket: getApplicationResponseBucket(
          {
            ...application,
            missing_profile_fields: analysis?.missing_profile_fields ?? []
          },
          application.drive
        )
      };
    })
  };
};

export const createStudent = async (payload, actor) => {
  const studentData = sanitizeStudentPayload(payload);

  if (!studentData.college_email) {
    throw createError(400, "College email is required");
  }

  const password_hash = await bcrypt.hash(getDefaultStudentPassword(studentData), 10);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: studentData.college_email,
        password_hash,
        role: UserRole.STUDENT,
        is_active: true,
        must_change_password: true
      }
    });

    const student = await tx.student.create({
      data: {
        ...studentData,
        user_id: user.id,
        placement_status: studentData.placement_status ?? PlacementStatus.NOT_PLACED,
        consent_declaration: studentData.consent_declaration ?? false
      },
      include: studentProfileInclude
    });

    await tx.auditLog.create({
      data: {
        user_id: actor.id,
        entity_type: "Student",
        entity_id: student.id,
        action: "CREATE",
        new_value: student
      }
    });

    return student;
  });

  setImmediate(() => {
    runEligibilityForStudent(created.id).catch((error) => {
      console.error("Student eligibility sync failed after create", error);
    });
  });

  return withStudentProfileStatus(created);
};

export const updateStudent = async (id, payload, actor) => {
  const existing = await prisma.student.findUnique({
    where: { id },
    include: studentProfileInclude
  });

  if (!existing) {
    throw createError(404, "Student not found");
  }

  const isOwnProfile = actor.role === UserRole.STUDENT && actor.studentId === id;
  if (actor.role === UserRole.STUDENT && !isOwnProfile) {
    throw createError(403, "You can only edit your own profile");
  }

  const data = actor.role === UserRole.STUDENT
    ? sanitizeStudentPayload(payload, true)
    : sanitizeStudentPayload(payload);

  if (actor.role !== UserRole.STUDENT) {
    delete data.placement_status;
    delete data.consent_declaration;
  }

  if (isOwnProfile) {
    validateCompleteStudentProfile({
      ...existing,
      ...data
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (data.college_email && data.college_email !== existing.college_email) {
      await tx.user.update({
        where: { id: existing.user_id },
        data: {
          email: data.college_email
        }
      });
    }

    return tx.student.update({
      where: { id },
      data,
      include: studentProfileInclude
    });
  });

  await logAction(actor.id, "Student", id, "UPDATE", existing, updated);

  setImmediate(() => {
    runEligibilityForStudent(id).catch((error) => {
      console.error("Student eligibility sync failed after update", error);
    });
  });

  return withStudentProfileStatus(updated);
};

export const softDeleteStudent = async (id, actorId) => {
  const student = await prisma.student.findUnique({
    where: { id },
    include: studentProfileInclude
  });

  if (!student) {
    throw createError(404, "Student not found");
  }

  await prisma.user.update({
    where: { id: student.user_id },
    data: {
      is_active: false
    }
  });

  await logAction(actorId, "Student", id, "DELETE", student, {
    user_active: false
  });
};

export const getStudentDriveHistory = async (id, reqUser) => {
  await getStudentById(id, reqUser);

  return prisma.driveApplication.findMany({
    where: { student_id: id },
    include: {
      drive: {
        include: {
          company: true
        }
      }
    },
    orderBy: {
      created_at: "desc"
    }
  });
};

export const exportStudentsWorkbook = async (query, reqUser) => {
  const where = getStudentFilters(query, reqUser);
  const rows = await prisma.student.findMany({
    where,
    orderBy: { name: "asc" }
  });

  return buildWorkbook({
    sheetName: "Students",
    columns: [
      { header: "Name", key: "name", width: 30 },
      { header: "PRN", key: "prn", width: 18 },
      { header: "College ID", key: "college_id", width: 18 },
      { header: "Department", key: "department", width: 12 },
      { header: "CGPA", key: "aggregate_cgpa", width: 10 },
      { header: "Placement Status", key: "placement_status", width: 18 },
      { header: "Dead ATKTs", key: "dead_atkt_count", width: 12 },
      { header: "Live ATKTs", key: "live_atkt_count", width: 12 }
    ],
    rows
  });
};

const normalizeImportCell = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    return normalizeText(value);
  }

  return value;
};

const isBlankImportRow = (row) =>
  !Object.values(row).some((value) => {
    if (typeof value === "number") {
      return !Number.isNaN(value);
    }

    return normalizeImportCell(value) !== null;
  });

const getIndustryContactValue = (row, keyword) => {
  const entry = Object.entries(row).find(([key]) =>
    normalizeHeader(key).includes("industry") && normalizeHeader(key).includes(keyword)
  );

  return normalizeImportCell(entry?.[1]);
};

const mapImportRow = (row) => {
  const normalizedRow = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), normalizeImportCell(value)])
  );
  const mapped = {};

  normalizedExcelToFieldMap.forEach((field, header) => {
    mapped[field] = normalizedRow[header] ?? null;
  });

  mapped.dob = parseExcelDate(mapped.dob);
  mapped.cet_jee_score = mapped.cet_jee_score !== null ? String(mapped.cet_jee_score) : null;
  mapped.personal_email = mapped.personal_email ? normalizeEmail(mapped.personal_email) : null;
  mapped.college_email = mapped.college_email ? normalizeEmail(mapped.college_email) : null;
  mapped.industry_contact_name = getIndustryContactValue(row, "name");
  mapped.industry_contact_org = getIndustryContactValue(row, "org");
  mapped.industry_contact_position = getIndustryContactValue(row, "position");
  mapped.industry_contact_phone = getIndustryContactValue(row, "phone");
  mapped.placement_status = PlacementStatus.NOT_PLACED;
  mapped.consent_declaration = false;
  mapped.profile_photo_url = null;

  return sanitizeStudentPayload(mapped);
};

const resolveExistingImportedStudent = async (mapped) => {
  const lookups = [
    mapped.prn ? { prn: mapped.prn } : null,
    mapped.college_id ? { college_id: mapped.college_id } : null,
    mapped.college_email ? { college_email: mapped.college_email } : null
  ].filter(Boolean);

  if (lookups.length === 0) {
    return null;
  }

  const matches = await prisma.student.findMany({
    where: {
      OR: lookups
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          must_change_password: true
        }
      }
    }
  });

  const uniqueMatches = [...new Map(matches.map((item) => [item.id, item])).values()];
  if (uniqueMatches.length > 1) {
    throw createError(
      409,
      "The imported PRN, College ID, or college email points to different students"
    );
  }

  return uniqueMatches[0] ?? null;
};

const createImportTemplateColumns = () =>
  studentImportTemplateColumns.map((column, index) => ({
    header: column.header,
    key: `column_${index + 1}`,
    width: Math.max(column.header.length + 4, 24)
  }));

const createImportTemplateInstructionRows = () => [
  {
    item: "How to use this template",
    required: "",
    example: "",
    notes: "Keep the first row headers unchanged. Fill one student per row in the template sheet."
  },
  {
    item: "Admission Type rule",
    required: "",
    example: "HSC or DIPLOMA",
    notes: "If Admission Type is HSC, fill 12th fields. If Admission Type is DIPLOMA, fill diploma fields."
  },
  {
    item: "Document URLs",
    required: "",
    example: "https://example.com/file.pdf",
    notes: "Document URL columns are optional. Students can still upload documents later from the portal."
  },
  {
    item: "Consent Declaration",
    required: "",
    example: "TRUE or FALSE",
    notes: "Use TRUE when consent is already captured."
  },
  {
    item: "Placement Status values",
    required: "",
    example: "NOT_PLACED, PLACED, OPTED_OUT, HIGHER_STUDIES",
    notes: "Use one of the exact values shown."
  },
  ...studentImportTemplateColumns.map((column) => ({
    item: column.header,
    required: column.required ? "Yes" : "No",
    example: column.example,
    notes: column.notes
  }))
];

export const exportStudentImportTemplateWorkbook = async () => {
  const workbook = buildWorkbook({
    sheetName: "Student Import Template",
    columns: createImportTemplateColumns(),
    rows: []
  });

  const templateSheet = workbook.getWorksheet("Student Import Template");
  templateSheet.autoFilter = {
    from: "A1",
    to: templateSheet.getRow(1).getCell(templateSheet.columnCount).address
  };
  templateSheet.getRow(1).alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true
  };

  const instructionsSheet = workbook.addWorksheet("Instructions");
  instructionsSheet.columns = [
    { header: "Item", key: "item", width: 34 },
    { header: "Required", key: "required", width: 12 },
    { header: "Example", key: "example", width: 28 },
    { header: "Notes", key: "notes", width: 70 }
  ];
  createImportTemplateInstructionRows().forEach((row) => instructionsSheet.addRow(row));
  instructionsSheet.getRow(1).font = { bold: true };
  instructionsSheet.getRow(1).alignment = {
    vertical: "middle",
    horizontal: "center"
  };
  instructionsSheet.views = [{ state: "frozen", ySplit: 1 }];
  instructionsSheet.eachRow((row, rowNumber) => {
    row.alignment = {
      vertical: "top",
      wrapText: true
    };
    if (rowNumber > 1 && rowNumber <= 6) {
      row.font = { bold: true };
    }
  });

  return workbook;
};

export const listStudentImportBatches = async () =>
  prisma.studentImportBatch.findMany({
    orderBy: {
      created_at: "desc"
    },
    take: 10,
    include: {
      uploaded_by: {
        select: {
          email: true
        }
      },
      rows: {
        where: {
          status: {
            in: [ImportStatus.FAILED, ImportStatus.SKIPPED]
          }
        },
        orderBy: {
          row_number: "asc"
        },
        take: 5,
        select: {
          row_number: true,
          prn: true,
          college_email: true,
          status: true,
          message: true
        }
      }
    }
  });

export const bulkImportStudents = async (fileBuffer, actorId, originalName = "students.xlsx") => {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });

  const batch = await prisma.studentImportBatch.create({
    data: {
      uploaded_by_id: actorId,
      original_name: originalName,
      total_rows: rows.length
    }
  });

  const errors = [];
  const importedStudentIds = [];
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;

    if (isBlankImportRow(row)) {
      skippedCount += 1;
      await prisma.studentImportRow.create({
        data: {
          batch_id: batch.id,
          row_number: rowNumber,
          status: ImportStatus.SKIPPED,
          message: "Blank row skipped"
        }
      });
      continue;
    }

    let mapped;

    try {
      mapped = mapImportRow(row);

      if (!mapped.college_email) {
        throw createError(400, "Missing college email");
      }

      assertKbtcoeEmail(mapped.college_email);

      if (!mapped.prn && !mapped.college_id) {
        throw createError(400, "PRN or College ID is required");
      }

      const existingStudent = await resolveExistingImportedStudent(mapped);
      const result = await prisma.$transaction(async (tx) => {
        if (existingStudent) {
          if (mapped.college_email && mapped.college_email !== existingStudent.user.email) {
            await tx.user.update({
              where: { id: existingStudent.user_id },
              data: {
                email: mapped.college_email
              }
            });
          }

          const updatedStudent = await tx.student.update({
            where: { id: existingStudent.id },
            data: {
              ...mapped,
              placement_status: mapped.placement_status ?? existingStudent.placement_status,
              consent_declaration:
                mapped.consent_declaration ?? existingStudent.consent_declaration ?? false
            }
          });

          await tx.auditLog.create({
            data: {
              user_id: actorId,
              entity_type: "Student",
              entity_id: updatedStudent.id,
              action: "UPDATE",
              old_value: {
                source: "bulk-import",
                prn: existingStudent.prn,
                college_email: existingStudent.college_email
              },
              new_value: {
                source: "bulk-import",
                prn: updatedStudent.prn,
                college_email: updatedStudent.college_email
              }
            }
          });

          return {
            status: "updated",
            studentId: updatedStudent.id
          };
        }

        const password_hash = await bcrypt.hash(getDefaultStudentPassword(mapped), 10);
        const user = await tx.user.create({
          data: {
            email: mapped.college_email,
            password_hash,
            role: UserRole.STUDENT,
            is_active: true,
            must_change_password: true
          }
        });

        const student = await tx.student.create({
          data: {
            ...mapped,
            user_id: user.id,
            placement_status: mapped.placement_status ?? PlacementStatus.NOT_PLACED,
            consent_declaration: mapped.consent_declaration ?? false
          }
        });

        await tx.auditLog.create({
          data: {
            user_id: actorId,
            entity_type: "Student",
            entity_id: student.id,
            action: "CREATE",
            new_value: {
              source: "bulk-import",
              prn: student.prn,
              college_email: student.college_email
            }
          }
        });

        return {
          status: "created",
          studentId: student.id
        };
      });

      if (result.status === "created") {
        createdCount += 1;
      } else {
        updatedCount += 1;
      }

      importedStudentIds.push(result.studentId);

      await prisma.studentImportRow.create({
        data: {
          batch_id: batch.id,
          row_number: rowNumber,
          prn: mapped.prn,
          college_email: mapped.college_email,
          status: ImportStatus.SUCCESS,
          message: result.status === "created" ? "Student created" : "Student updated"
        }
      });
    } catch (error) {
      failedCount += 1;

      const reason = error?.message ?? "Unexpected import error";
      errors.push({
        row: rowNumber,
        prn: mapped?.prn ?? null,
        reason
      });

      await prisma.studentImportRow.create({
        data: {
          batch_id: batch.id,
          row_number: rowNumber,
          prn: mapped?.prn ?? null,
          college_email: mapped?.college_email ?? null,
          status: ImportStatus.FAILED,
          message: reason
        }
      });
    }
  }

  await prisma.studentImportBatch.update({
    where: { id: batch.id },
    data: {
      created_count: createdCount,
      updated_count: updatedCount,
      skipped_count: skippedCount,
      failed_count: failedCount
    }
  });

  if (importedStudentIds.length > 0) {
    const uniqueStudentIds = [...new Set(importedStudentIds)];
    setImmediate(() => {
      Promise.all(uniqueStudentIds.map((studentId) => runEligibilityForStudent(studentId))).catch(
        (error) => {
          console.error("Eligibility sync failed after bulk import", error);
        }
      );
    });
  }

  return {
    batchId: batch.id,
    imported: createdCount,
    updated: updatedCount,
    skipped: skippedCount,
    failed: failedCount,
    errors
  };
};
