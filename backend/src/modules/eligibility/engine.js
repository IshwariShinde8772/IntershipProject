import { getResolvedEntryMode, getStudentProfileStatus, hasMeaningfulValue } from "../../utils/studentProfile.js";

const formatNumber = (value) => Number(value ?? 0).toFixed(2);

export const analyzeEligibility = (student, criteria) => {
  const profileStatus = getStudentProfileStatus(student);
  const entryMode = getResolvedEntryMode(student);
  const reasons = [];

  if (!profileStatus.is_complete) {
    reasons.push(
      `Complete required profile fields: ${profileStatus.missing_required_fields.join(", ")}`
    );
  }

  const hasBaseAcademicInfo =
    hasMeaningfulValue(student.aggregate_cgpa) &&
    hasMeaningfulValue(student.ssc_percentage) &&
    hasMeaningfulValue(student.department) &&
    hasMeaningfulValue(student.gender) &&
    hasMeaningfulValue(student.category) &&
    hasMeaningfulValue(entryMode);

  const hasRouteSpecificAcademicInfo =
    entryMode === "DIPLOMA"
      ? hasMeaningfulValue(student.diploma_percentage) &&
        hasMeaningfulValue(student.diploma_year) &&
        hasMeaningfulValue(student.diploma_board)
      : entryMode === "HSC"
        ? hasMeaningfulValue(student.hsc_percentage) &&
          hasMeaningfulValue(student.hsc_year) &&
          hasMeaningfulValue(student.hsc_board) &&
          hasMeaningfulValue(student.cet_jee_score)
        : false;

  if (!hasBaseAcademicInfo || !hasRouteSpecificAcademicInfo) {
    reasons.push("Academic profile is not complete enough for eligibility evaluation.");
  }

  if (
    student.aggregate_cgpa !== null &&
    student.aggregate_cgpa !== undefined &&
    Number(student.aggregate_cgpa) < Number(criteria.min_cgpa)
  ) {
    reasons.push(
      `Aggregate CGPA ${formatNumber(student.aggregate_cgpa)} is below the required ${formatNumber(criteria.min_cgpa)}.`
    );
  }

  if (
    student.ssc_percentage !== null &&
    student.ssc_percentage !== undefined &&
    Number(student.ssc_percentage) < Number(criteria.min_ssc_percentage)
  ) {
    reasons.push(
      `SSC percentage ${formatNumber(student.ssc_percentage)} is below the required ${formatNumber(criteria.min_ssc_percentage)}.`
    );
  }

  if (
    entryMode === "HSC" &&
    student.hsc_percentage !== null &&
    student.hsc_percentage !== undefined &&
    Number(student.hsc_percentage) < Number(criteria.min_hsc_percentage)
  ) {
    reasons.push(
      `HSC percentage ${formatNumber(student.hsc_percentage)} is below the required ${formatNumber(criteria.min_hsc_percentage)}.`
    );
  }

  if (
    criteria.min_diploma_percentage !== null &&
    criteria.min_diploma_percentage !== undefined &&
    student.diploma_percentage !== null &&
    student.diploma_percentage !== undefined &&
    Number(student.diploma_percentage) < Number(criteria.min_diploma_percentage)
  ) {
    reasons.push(
      `Diploma percentage ${formatNumber(student.diploma_percentage)} is below the required ${formatNumber(criteria.min_diploma_percentage)}.`
    );
  }

  if (
    student.dead_atkt_count !== null &&
    student.dead_atkt_count !== undefined &&
    student.dead_atkt_count > criteria.max_dead_atkt
  ) {
    reasons.push(
      `Dead ATKT count ${student.dead_atkt_count} exceeds the allowed ${criteria.max_dead_atkt}.`
    );
  }

  if (
    student.live_atkt_count !== null &&
    student.live_atkt_count !== undefined &&
    student.live_atkt_count > criteria.max_live_atkt
  ) {
    reasons.push(
      `Live ATKT count ${student.live_atkt_count} exceeds the allowed ${criteria.max_live_atkt}.`
    );
  }

  if (
    !criteria.allow_year_drop &&
    student.year_drop !== null &&
    student.year_drop !== undefined &&
    student.year_drop > 0
  ) {
    reasons.push("Year drop is not allowed for this drive.");
  }

  if (
    criteria.allowed_departments?.length > 0 &&
    !criteria.allowed_departments.includes(student.department)
  ) {
    reasons.push(`Department ${student.department} is not part of the allowed departments.`);
  }

  if (
    criteria.allowed_genders?.length > 0 &&
    !criteria.allowed_genders.includes(student.gender)
  ) {
    reasons.push(`Gender ${student.gender} is not part of the allowed criteria.`);
  }

  if (
    criteria.allowed_categories?.length > 0 &&
    !criteria.allowed_categories.includes(student.category)
  ) {
    reasons.push(`Category ${student.category} is not part of the allowed criteria.`);
  }

  if (
    criteria.career_choice_filter?.length > 0 &&
    !criteria.career_choice_filter.includes(student.career_choice)
  ) {
    reasons.push(
      `Career choice ${student.career_choice || "Not provided"} does not match this opportunity.`
    );
  }

  if (student.placement_status === "PLACED") {
    reasons.push("Student is already marked as placed.");
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    missing_profile_fields: profileStatus.missing_required_fields,
    profile_completion: profileStatus.completion_percentage,
    is_profile_complete: profileStatus.is_complete
  };
};

export const computeEligibility = (student, criteria) =>
  analyzeEligibility(student, criteria).eligible;
