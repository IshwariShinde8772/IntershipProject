const trackedProfileFields = [
  { key: "name", label: "Name", requiredForDrive: true },
  { key: "prn", label: "PRN", requiredForDrive: true },
  { key: "college_id", label: "College ID", requiredForDrive: true },
  { key: "gender", label: "Gender", requiredForDrive: true },
  { key: "dob", label: "Date of Birth", requiredForDrive: true },
  { key: "category", label: "Category", requiredForDrive: true },
  { key: "department", label: "Department", requiredForDrive: true },
  { key: "personal_email", label: "Personal Email", requiredForDrive: true },
  { key: "college_email", label: "College Email", requiredForDrive: true },
  { key: "personal_contact", label: "Personal Contact", requiredForDrive: true },
  { key: "permanent_address", label: "Permanent Address", requiredForDrive: true },
  { key: "ssc_percentage", label: "SSC Percentage", requiredForDrive: true },
  { key: "ssc_year", label: "SSC Passing Year", requiredForDrive: true },
  { key: "hsc_percentage", label: "HSC Percentage", requiredForDrive: true },
  { key: "hsc_board", label: "HSC Board", requiredForDrive: true },
  { key: "hsc_year", label: "HSC Passing Year", requiredForDrive: true },
  { key: "aggregate_cgpa", label: "Aggregate CGPA", requiredForDrive: true },
  { key: "career_choice", label: "Career Choice", requiredForDrive: true },
  { key: "resume_url", label: "Resume", requiredForDrive: true },
  { key: "consent_declaration", label: "Consent Declaration", requiredForDrive: true }
];

const hasMeaningfulValue = (value) => {
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

export const getStudentProfileStatus = (student) => {
  const completedCount = trackedProfileFields.filter(({ key }) =>
    hasMeaningfulValue(student?.[key])
  ).length;
  const missingRequired = trackedProfileFields.filter(
    ({ key, requiredForDrive }) => requiredForDrive && !hasMeaningfulValue(student?.[key])
  );

  return {
    completion_percentage: Math.round(
      (completedCount / trackedProfileFields.length) * 100
    ),
    completed_fields: completedCount,
    total_fields: trackedProfileFields.length,
    is_complete: missingRequired.length === 0,
    missing_required_keys: missingRequired.map((field) => field.key),
    missing_required_fields: missingRequired.map((field) => field.label)
  };
};

export const withStudentProfileStatus = (student) => {
  if (!student) {
    return student;
  }

  const profileStatus = getStudentProfileStatus(student);
  return {
    ...student,
    profile_completion: profileStatus.completion_percentage,
    is_profile_complete: profileStatus.is_complete,
    missing_profile_fields: profileStatus.missing_required_fields,
    profile_status: profileStatus
  };
};

export const getTrackedProfileFields = () => trackedProfileFields;
