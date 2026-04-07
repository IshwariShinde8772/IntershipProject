import { analyzeEligibility } from "../modules/eligibility/engine.js";
import { withStudentProfileStatus } from "./studentProfile.js";

export const getApplicationResponseBucket = (application, drive) => {
  if (!application.is_eligible) {
    return application.missing_profile_fields?.length > 0
      ? "PROFILE_INCOMPLETE"
      : "NOT_ELIGIBLE";
  }

  if (application.opted_in) {
    return "RESPONDED";
  }

  if (new Date(drive.registration_deadline) < new Date()) {
    return "MISSED";
  }

  return "AWAITING_RESPONSE";
};

export const enrichDriveApplication = (application, drive, criteria) => {
  const student = withStudentProfileStatus(application.student);
  const analysis = criteria
    ? analyzeEligibility(student, criteria)
    : {
        eligible: application.is_eligible,
        reasons: ["Eligibility criteria have not been configured yet."],
        missing_profile_fields: student.missing_profile_fields ?? [],
        profile_completion: student.profile_completion ?? 0,
        is_profile_complete: student.is_profile_complete ?? false
      };

  return {
    ...application,
    student,
    eligibility_analysis: analysis,
    missing_profile_fields: analysis.missing_profile_fields,
    response_bucket: getApplicationResponseBucket(
      {
        ...application,
        missing_profile_fields: analysis.missing_profile_fields
      },
      drive
    )
  };
};

export const summarizeDriveApplications = (applications, drive) => {
  const summary = {
    total_students: applications.length,
    eligible: 0,
    opted_in: 0,
    attended: 0,
    shortlisted: 0,
    selected: 0,
    awaiting_response: 0,
    missed_response: 0,
    profile_incomplete: 0,
    not_eligible_rules: 0
  };

  applications.forEach((application) => {
    if (application.is_eligible) {
      summary.eligible += 1;
    }

    if (application.opted_in) {
      summary.opted_in += 1;
    }

    if (application.attended) {
      summary.attended += 1;
    }

    if (application.shortlisted) {
      summary.shortlisted += 1;
    }

    if (application.selected) {
      summary.selected += 1;
    }

    const responseBucket = application.response_bucket ?? getApplicationResponseBucket(application, drive);
    if (responseBucket === "AWAITING_RESPONSE") {
      summary.awaiting_response += 1;
    }

    if (responseBucket === "MISSED") {
      summary.missed_response += 1;
    }

    if (responseBucket === "PROFILE_INCOMPLETE") {
      summary.profile_incomplete += 1;
    }

    if (responseBucket === "NOT_ELIGIBLE") {
      summary.not_eligible_rules += 1;
    }
  });

  return summary;
};
