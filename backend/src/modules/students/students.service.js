import { PlacementStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import createError from "http-errors";
import XLSX from "xlsx";
import { prisma } from "../../config/prisma.js";
import { runEligibilityForStudent } from "../eligibility/eligibility.service.js";
import { analyzeEligibility } from "../eligibility/engine.js";
import { logAction } from "../../utils/audit.js";
import { getApplicationResponseBucket } from "../../utils/driveAnalytics.js";
import { buildWorkbook } from "../../utils/excel.js";
import { pick, toDateOrNull, toIntOrDefault, toNumberOrNull } from "../../utils/normalize.js";
import { withStudentProfileStatus } from "../../utils/studentProfile.js";

const createStudentFields = [
  "prn",
  "college_id",
  "name",
  "gender",
  "dob",
  "category",
  "department",
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
  "diploma_percentage",
  "diploma_branch",
  "diploma_board",
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
  "resume_url",
  "profile_photo_url",
  "placement_status",
  "consent_declaration"
];

const studentSelfEditableFields = createStudentFields.filter(
  (field) => !["college_email", "placement_status"].includes(field)
);

const adminAccountEditableFields = [
  "prn",
  "college_id",
  "name",
  "department",
  "college_email"
];

const excelToFieldMap = {
  "PRN (Eg-72001869L)": "prn",
  "KBTUG College ID (Eg-KBTUG19338)": "college_id",
  Department: "department",
  "Name of the Student Format (First Middle Last name)": "name",
  Gender: "gender",
  "Date Of Birth": "dob",
  "Category (Eg Open/OBC/SC/ST ..etc)": "category",
  "Native Place": "native_place",
  District: "district",
  "Permanent Address": "permanent_address",
  "Personal Email ID": "personal_email",
  "College Email ID": "college_email",
  "Personal Contact Number": "personal_contact",
  "Alternate Contact Number": "alternate_contact",
  "SSC Percentage": "ssc_percentage",
  "SSC Passing Year": "ssc_year",
  "HSC Percentage": "hsc_percentage",
  "12th Board": "hsc_board",
  "HSC Passing Year": "hsc_year",
  "CET/JEE Marks If Applicable": "cet_jee_score",
  "Diploma Percentage": "diploma_percentage",
  "Diploma Branch": "diploma_branch",
  "Diploma Board": "diploma_board",
  "Diploma Passing Year": "diploma_year",
  "FE Semester- I SGPA": "fe_sem1_sgpa",
  "FE Semester- II SGPA": "fe_sem2_sgpa",
  "SE Semester- III SGPA": "se_sem3_sgpa",
  "SE Semester- IV SGPA": "se_sem4_sgpa",
  "TE Semester- V SGPA": "te_sem5_sgpa",
  "TE Semester- VI SGPA": "te_sem6_sgpa",
  "Aggregate CGPA of All Semester upto latest result": "aggregate_cgpa",
  "First Year Engineering/Direc second Year Admission": "admission_year",
  "Father Occupation": "father_occupation",
  "Mother Occupation": "mother_occupation",
  "Sibling Education / Occupation": "sibling_info",
  "Number Of Dead ATKT'S": "dead_atkt_count",
  "Number Of Live ATKT'S": "live_atkt_count",
  "Year Drop": "year_drop",
  "Special Achievement": "achievements",
  "Technical Certification completed": "technical_certifications",
  Internship: "internships",
  "BE Project Tittle": "be_project_title",
  "Trainings Required": "trainings_required",
  "Career choice": "career_choice",
  "Aadhar card no": "aadhar_no",
  "Pan card no": "pan_no",
  "Upload your Resume": "resume_url"
};

const studentProfileInclude = {
  user: {
    select: {
      id: true,
      email: true,
      is_active: true,
      role: true
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

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

const getDefaultStudentPassword = ({ college_email, college_id, prn }) => {
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

const sanitizeStudentPayload = (payload, ownProfile = false) => {
  const allowed = ownProfile
    ? studentSelfEditableFields
    : payload?._adminAccountOnly
      ? adminAccountEditableFields
      : createStudentFields;
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

  return data;
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
  const accountOnly = actor.role !== UserRole.STUDENT;
  const studentData = sanitizeStudentPayload({ ...payload, _adminAccountOnly: accountOnly });

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
        is_active: true
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
    : sanitizeStudentPayload({ ...payload, _adminAccountOnly: true }, false);

  if (actor.role !== UserRole.STUDENT) {
    delete data.placement_status;
    delete data.consent_declaration;
  }

  const updated = await prisma.student.update({
    where: { id },
    data,
    include: studentProfileInclude
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

const getIndustryContactValue = (row, keyword) => {
  const entry = Object.entries(row).find(([key]) =>
    key.toLowerCase().includes("industry") && key.toLowerCase().includes(keyword)
  );

  return entry ? entry[1] : null;
};

const mapImportRow = (row) => {
  const mapped = {};

  Object.entries(excelToFieldMap).forEach(([column, field]) => {
    mapped[field] = row[column];
  });

  mapped.dob = parseExcelDate(mapped.dob);
  mapped.ssc_percentage = toNumberOrNull(mapped.ssc_percentage);
  mapped.ssc_year = toIntOrDefault(mapped.ssc_year, new Date().getFullYear());
  mapped.hsc_percentage = toNumberOrNull(mapped.hsc_percentage);
  mapped.hsc_year = toIntOrDefault(mapped.hsc_year, new Date().getFullYear());
  mapped.diploma_percentage = toNumberOrNull(mapped.diploma_percentage);
  mapped.diploma_year = toNumberOrNull(mapped.diploma_year);
  mapped.fe_sem1_sgpa = toNumberOrNull(mapped.fe_sem1_sgpa);
  mapped.fe_sem2_sgpa = toNumberOrNull(mapped.fe_sem2_sgpa);
  mapped.se_sem3_sgpa = toNumberOrNull(mapped.se_sem3_sgpa);
  mapped.se_sem4_sgpa = toNumberOrNull(mapped.se_sem4_sgpa);
  mapped.te_sem5_sgpa = toNumberOrNull(mapped.te_sem5_sgpa);
  mapped.te_sem6_sgpa = toNumberOrNull(mapped.te_sem6_sgpa);
  mapped.aggregate_cgpa = toNumberOrNull(mapped.aggregate_cgpa);
  mapped.admission_year = toIntOrDefault(mapped.admission_year, new Date().getFullYear());
  mapped.dead_atkt_count = toIntOrDefault(mapped.dead_atkt_count, 0);
  mapped.live_atkt_count = toIntOrDefault(mapped.live_atkt_count, 0);
  mapped.year_drop = toIntOrDefault(mapped.year_drop, 0);
  mapped.cet_jee_score = mapped.cet_jee_score ? String(mapped.cet_jee_score) : null;
  mapped.personal_email = mapped.personal_email ? normalizeEmail(mapped.personal_email) : null;
  mapped.college_email = normalizeEmail(mapped.college_email);
  mapped.industry_contact_name = getIndustryContactValue(row, "name");
  mapped.industry_contact_org = getIndustryContactValue(row, "org");
  mapped.industry_contact_position = getIndustryContactValue(row, "position");
  mapped.industry_contact_phone = getIndustryContactValue(row, "phone");
  mapped.placement_status = PlacementStatus.NOT_PLACED;
  mapped.consent_declaration = true;
  mapped.profile_photo_url = null;
  mapped.be_sem7_sgpa = null;
  mapped.be_sem8_sgpa = null;

  return mapped;
};

export const bulkImportStudents = async (fileBuffer, actorId) => {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const errors = [];
  const skippedList = [];
  const importedStudentIds = [];
  let imported = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const mapped = mapImportRow(row);
    const rowNumber = index + 2;

    if (!mapped.prn) {
      errors.push({ row: rowNumber, prn: null, reason: "Missing PRN" });
      continue;
    }

    const exists = await prisma.student.findUnique({
      where: { prn: mapped.prn },
      select: { id: true }
    });

    if (exists) {
      skippedList.push(mapped.prn);
      continue;
    }

    try {
      const password_hash = await bcrypt.hash(getDefaultStudentPassword(mapped), 10);
      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: mapped.college_email,
            password_hash,
            role: UserRole.STUDENT,
            is_active: true
          }
        });

        const student = await tx.student.create({
          data: {
            ...mapped,
            user_id: user.id
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

        return student;
      });

      if (created) {
        imported += 1;
        importedStudentIds.push(created.id);
      }
    } catch (error) {
      errors.push({
        row: rowNumber,
        prn: mapped.prn,
        reason: error.message
      });
    }
  }

  if (importedStudentIds.length > 0) {
    setImmediate(() => {
      Promise.all(
        importedStudentIds.map((studentId) => runEligibilityForStudent(studentId))
      ).catch((error) => {
        console.error("Eligibility sync failed after bulk import", error);
      });
    });
  }

  return {
    imported,
    skipped: skippedList.length,
    skippedList,
    errors
  };
};
