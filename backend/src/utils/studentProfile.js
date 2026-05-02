import { normalizeCloudinaryRawDocumentUrl } from "./upload.js";

export const getResolvedEntryMode = (student) => {
  if (student?.entry_mode === "HSC" || student?.entry_mode === "DIPLOMA") {
    return student.entry_mode;
  }

  if (
    hasMeaningfulValue(student?.diploma_percentage) ||
    hasMeaningfulValue(student?.diploma_branch) ||
    hasMeaningfulValue(student?.diploma_board) ||
    hasMeaningfulValue(student?.diploma_year) ||
    hasMeaningfulValue(student?.diploma_marksheet_url)
  ) {
    return "DIPLOMA";
  }

  if (
    hasMeaningfulValue(student?.hsc_percentage) ||
    hasMeaningfulValue(student?.hsc_board) ||
    hasMeaningfulValue(student?.hsc_year) ||
    hasMeaningfulValue(student?.hsc_marksheet_url) ||
    hasMeaningfulValue(student?.cet_jee_score)
  ) {
    return "HSC";
  }

  return null;
};

const isDiplomaEntry = (student) => getResolvedEntryMode(student) === "DIPLOMA";
const isHscEntry = (student) => getResolvedEntryMode(student) === "HSC";

const trackedProfileFields = [
  { key: "name", label: "Name", requiredForDrive: true },
  { key: "prn", label: "PRN", requiredForDrive: true },
  { key: "college_id", label: "College ID", requiredForDrive: true },
  { key: "gender", label: "Gender", requiredForDrive: true },
  { key: "dob", label: "Date of Birth", requiredForDrive: true },
  { key: "category", label: "Category", requiredForDrive: true },
  { key: "department", label: "Department", requiredForDrive: true },
  { key: "entry_mode", label: "Admission Type", requiredForDrive: true },
  { key: "aadhar_no", label: "Aadhaar Number", requiredForDrive: true },
  { key: "native_place", label: "Native Place", requiredForDrive: true },
  { key: "district", label: "District", requiredForDrive: true },
  { key: "permanent_address", label: "Permanent Address", requiredForDrive: true },
  { key: "personal_email", label: "Personal Email", requiredForDrive: true },
  { key: "college_email", label: "College Email", requiredForDrive: true },
  { key: "personal_contact", label: "Personal Contact", requiredForDrive: true },
  { key: "alternate_contact", label: "Alternate Contact", requiredForDrive: true },
  { key: "father_occupation", label: "Father Occupation", requiredForDrive: true },
  { key: "mother_occupation", label: "Mother Occupation", requiredForDrive: true },
  { key: "ssc_percentage", label: "10th Percentage", requiredForDrive: true },
  { key: "ssc_year", label: "10th Passing Year", requiredForDrive: true },
  { key: "ssc_marksheet_url", label: "10th Marksheet File", requiredForDrive: true },
  {
    key: "hsc_percentage",
    label: "12th Percentage",
    requiredForDrive: true,
    requiredWhen: isHscEntry
  },
  {
    key: "hsc_board",
    label: "12th Board",
    requiredForDrive: true,
    requiredWhen: isHscEntry
  },
  {
    key: "hsc_year",
    label: "12th Passing Year",
    requiredForDrive: true,
    requiredWhen: isHscEntry
  },
  {
    key: "hsc_marksheet_url",
    label: "12th Marksheet File",
    requiredForDrive: true,
    requiredWhen: isHscEntry
  },
  {
    key: "cet_jee_score",
    label: "CET/JEE Score",
    requiredForDrive: true,
    requiredWhen: isHscEntry
  },
  {
    key: "diploma_percentage",
    label: "Diploma Percentage",
    requiredForDrive: true,
    requiredWhen: isDiplomaEntry
  },
  {
    key: "diploma_branch",
    label: "Diploma Branch",
    requiredForDrive: true,
    requiredWhen: isDiplomaEntry
  },
  {
    key: "diploma_board",
    label: "Diploma Board",
    requiredForDrive: true,
    requiredWhen: isDiplomaEntry
  },
  {
    key: "diploma_year",
    label: "Diploma Passing Year",
    requiredForDrive: true,
    requiredWhen: isDiplomaEntry
  },
  {
    key: "diploma_marksheet_url",
    label: "Diploma Marksheet File",
    requiredForDrive: true,
    requiredWhen: isDiplomaEntry
  },
  { key: "admission_year", label: "Admission Year", requiredForDrive: true },
  {
    key: "fe_sem1_sgpa",
    label: "FE Semester I SGPA",
    requiredForDrive: true,
    requiredWhen: (student) => !isDiplomaEntry(student)
  },
  {
    key: "fe_sem2_sgpa",
    label: "FE Semester II SGPA",
    requiredForDrive: true,
    requiredWhen: (student) => !isDiplomaEntry(student)
  },
  { key: "se_sem3_sgpa", label: "SE Semester III SGPA", requiredForDrive: true },
  { key: "se_sem4_sgpa", label: "SE Semester IV SGPA", requiredForDrive: true },
  { key: "te_sem5_sgpa", label: "TE Semester V SGPA", requiredForDrive: true },
  { key: "te_sem6_sgpa", label: "TE Semester VI SGPA", requiredForDrive: true },
  { key: "aggregate_cgpa", label: "Aggregate CGPA", requiredForDrive: true },
  { key: "dead_atkt_count", label: "Dead ATKT Count", requiredForDrive: true },
  { key: "live_atkt_count", label: "Live ATKT Count", requiredForDrive: true },
  { key: "year_drop", label: "Year Drop", requiredForDrive: true },
  {
    key: "engineering_marksheets_url",
    label: "Engineering Marksheet File",
    requiredForDrive: true
  },
  { key: "career_choice", label: "Career Choice", requiredForDrive: true },
  { key: "be_project_title", label: "BE Project Title", requiredForDrive: true },
  { key: "aadhar_card_url", label: "Aadhaar Card File", requiredForDrive: true },
  { key: "resume_url", label: "Resume File", requiredForDrive: true },
  { key: "consent_declaration", label: "Consent Declaration", requiredForDrive: true }
];

export const hasMeaningfulValue = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return true;
};

const getTrackedFieldValue = (student, key) =>
  key === "entry_mode" ? getResolvedEntryMode(student) : student?.[key];

const pdfDocumentFields = [
  "resume_url",
  "aadhar_card_url",
  "ssc_marksheet_url",
  "hsc_marksheet_url",
  "diploma_marksheet_url",
  "engineering_marksheets_url"
];

const withNormalizedDocumentUrls = (student) => {
  if (!student) {
    return student;
  }

  const normalizedStudent = { ...student };

  pdfDocumentFields.forEach((field) => {
    normalizedStudent[field] = normalizeCloudinaryRawDocumentUrl(normalizedStudent[field]);
  });

  return normalizedStudent;
};

export const getStudentProfileStatus = (student) => {
  const normalizedStudent = withNormalizedDocumentUrls(student);
  const activeFields = trackedProfileFields.filter(
    ({ requiredWhen }) => !requiredWhen || requiredWhen(normalizedStudent)
  );
  const completedCount = activeFields.filter(({ key }) =>
    hasMeaningfulValue(getTrackedFieldValue(normalizedStudent, key))
  ).length;
  const missingRequired = trackedProfileFields.filter(
    ({ key, requiredForDrive, requiredWhen }) =>
      requiredForDrive &&
      (!requiredWhen || requiredWhen(normalizedStudent)) &&
      !hasMeaningfulValue(getTrackedFieldValue(normalizedStudent, key))
  );

  return {
    completion_percentage: activeFields.length
      ? Math.round((completedCount / activeFields.length) * 100)
      : 0,
    completed_fields: completedCount,
    total_fields: activeFields.length,
    is_complete: missingRequired.length === 0,
    missing_required_keys: missingRequired.map((field) => field.key),
    missing_required_fields: missingRequired.map((field) => field.label)
  };
};

export const withStudentProfileStatus = (student) => {
  if (!student) {
    return student;
  }

  const normalizedStudent = withNormalizedDocumentUrls(student);
  const profileStatus = getStudentProfileStatus(normalizedStudent);
  return {
    ...normalizedStudent,
    profile_completion: profileStatus.completion_percentage,
    is_profile_complete: profileStatus.is_complete,
    missing_profile_fields: profileStatus.missing_required_fields,
    profile_status: profileStatus
  };
};

export const getTrackedProfileFields = () => trackedProfileFields;
