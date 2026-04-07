import { prisma } from "../../config/prisma.js";
import { enrichDriveApplication, summarizeDriveApplications } from "../../utils/driveAnalytics.js";
import { buildWorkbook } from "../../utils/excel.js";
import { getStudentProfileStatus } from "../../utils/studentProfile.js";

const buildStudentWhere = (query) => {
  const where = {};
  if (query.department) where.department = query.department;
  if (query.academic_year) where.admission_year = Number(query.academic_year);
  return where;
};

export const getDashboardReport = async (query = {}) => {
  const studentWhere = buildStudentWhere(query);
  const [totalStudents, totalPlaced, totalDrives, activeDrives, students, selectedApps] =
    await prisma.$transaction([
      prisma.student.count({ where: studentWhere }),
      prisma.student.count({
        where: {
          ...studentWhere,
          placement_status: "PLACED"
        }
      }),
      prisma.placementDrive.count(),
      prisma.placementDrive.count({
        where: {
          status: {
            in: ["UPCOMING", "ONGOING"]
          }
        }
      }),
      prisma.student.findMany({
        where: studentWhere
      }),
      prisma.driveApplication.findMany({
        where: {
          selected: true,
          ...(query.department
            ? {
                student: {
                  department: query.department
                }
              }
            : {})
        },
        include: {
          drive: {
            include: {
              company: true
            }
          },
          student: true
        }
      })
    ]);

  const departmentTotals = students.reduce((accumulator, student) => {
    const bucket = accumulator[student.department] ?? { dept: student.department, total: 0, placed: 0 };
    bucket.total += 1;
    if (student.placement_status === "PLACED") {
      bucket.placed += 1;
    }
    accumulator[student.department] = bucket;
    return accumulator;
  }, {});

  const offersByCompany = selectedApps.reduce((accumulator, item) => {
    const name = item.drive.company.name;
    accumulator[name] = (accumulator[name] ?? 0) + 1;
    return accumulator;
  }, {});

  const packages = [0, 0, 0, 0, 0];
  let packageSum = 0;
  const profileReady = students.filter((student) => getStudentProfileStatus(student).is_complete).length;
  selectedApps.forEach((item) => {
    const packageValue = Number(item.drive.package_lpa ?? 0);
    packageSum += packageValue;
    if (packageValue < 3) packages[0] += 1;
    else if (packageValue < 5) packages[1] += 1;
    else if (packageValue < 8) packages[2] += 1;
    else if (packageValue < 12) packages[3] += 1;
    else packages[4] += 1;
  });

  const eligible = await prisma.driveApplication.count({
    where: {
      is_eligible: true,
      ...(query.department
        ? {
            student: {
              department: query.department
            }
          }
        : {})
    }
  });
  const applied = await prisma.driveApplication.count({
    where: {
      opted_in: true,
      ...(query.department
        ? {
            student: {
              department: query.department
            }
          }
        : {})
    }
  });
  const attended = await prisma.driveApplication.count({
    where: {
      attended: true,
      ...(query.department
        ? {
            student: {
              department: query.department
            }
          }
        : {})
    }
  });
  const selected = selectedApps.length;
  const pendingResponses = await prisma.driveApplication.count({
    where: {
      is_eligible: true,
      opted_in: false,
      drive: {
        registration_deadline: {
          gte: new Date()
        }
      },
      ...(query.department
        ? {
            student: {
              department: query.department
            }
          }
        : {})
    }
  });
  const missedResponses = await prisma.driveApplication.count({
    where: {
      is_eligible: true,
      opted_in: false,
      drive: {
        registration_deadline: {
          lt: new Date()
        }
      },
      ...(query.department
        ? {
            student: {
              department: query.department
            }
          }
        : {})
    }
  });

  return {
    total_students: totalStudents,
    total_placed: totalPlaced,
    profile_ready: profileReady,
    profile_incomplete: totalStudents - profileReady,
    total_drives: totalDrives,
    active_drives: activeDrives,
    placement_rate: totalStudents ? Number(((totalPlaced / totalStudents) * 100).toFixed(2)) : 0,
    average_package_lpa: selectedApps.length ? Number((packageSum / selectedApps.length).toFixed(2)) : 0,
    placement_status: [
      { name: "PLACED", value: students.filter((item) => item.placement_status === "PLACED").length },
      { name: "NOT_PLACED", value: students.filter((item) => item.placement_status === "NOT_PLACED").length },
      { name: "OPTED_OUT", value: students.filter((item) => item.placement_status === "OPTED_OUT").length },
      {
        name: "HIGHER_STUDIES",
        value: students.filter((item) => item.placement_status === "HIGHER_STUDIES").length
      }
    ],
    dept_wise_placed: Object.values(departmentTotals),
    top_companies: Object.entries(offersByCompany)
      .map(([name, offers]) => ({ name, offers }))
      .sort((left, right) => right.offers - left.offers)
      .slice(0, 10),
    package_distribution: [
      { range: "0-3 LPA", count: packages[0] },
      { range: "3-5 LPA", count: packages[1] },
      { range: "5-8 LPA", count: packages[2] },
      { range: "8-12 LPA", count: packages[3] },
      { range: "12+ LPA", count: packages[4] }
    ],
    funnel: [
      { stage: "Total Students", value: totalStudents },
      { stage: "Eligible", value: eligible },
      { stage: "Applied", value: applied },
      { stage: "Attended", value: attended },
      { stage: "Selected", value: selected }
    ],
    pending_responses: pendingResponses,
    missed_responses: missedResponses
  };
};

export const getDepartmentWiseReport = async () => {
  const data = await prisma.student.groupBy({
    by: ["department", "placement_status"],
    _count: {
      _all: true
    }
  });

  const departments = {};
  data.forEach((row) => {
    if (!departments[row.department]) {
      departments[row.department] = {
        department: row.department,
        total: 0,
        placed: 0,
        opted_out: 0,
        higher_studies: 0
      };
    }

    departments[row.department].total += row._count._all;
    if (row.placement_status === "PLACED") departments[row.department].placed += row._count._all;
    if (row.placement_status === "OPTED_OUT") departments[row.department].opted_out += row._count._all;
    if (row.placement_status === "HIGHER_STUDIES")
      departments[row.department].higher_studies += row._count._all;
  });

  return Object.values(departments);
};

export const getDriveReport = async (driveId) => {
  const drive = await prisma.placementDrive.findUnique({
    where: {
      id: driveId
    },
    include: {
      eligibility_criteria: true,
      applications: {
        include: {
          student: true
        }
      }
    }
  });

  if (!drive) {
    return {
      eligible: 0,
      opted_in: 0,
      attended: 0,
      shortlisted: 0,
      selected: 0,
      absent_but_eligible: 0,
      awaiting_response: 0,
      missed_response: 0,
      profile_incomplete: 0,
      not_eligible_rules: 0
    };
  }

  const enrichedApplications = drive.applications.map((application) =>
    enrichDriveApplication(application, drive, drive.eligibility_criteria)
  );
  const summary = summarizeDriveApplications(enrichedApplications, drive);

  return {
    eligible: summary.eligible,
    opted_in: summary.opted_in,
    attended: summary.attended,
    shortlisted: summary.shortlisted,
    selected: summary.selected,
    absent_but_eligible: summary.eligible - summary.attended,
    awaiting_response: summary.awaiting_response,
    missed_response: summary.missed_response,
    profile_incomplete: summary.profile_incomplete,
    not_eligible_rules: summary.not_eligible_rules
  };
};

export const exportPlacedWorkbook = async () => {
  const rows = await prisma.driveApplication.findMany({
    where: {
      selected: true
    },
    include: {
      student: true,
      drive: {
        include: {
          company: true
        }
      }
    },
    orderBy: {
      updated_at: "desc"
    }
  });

  return buildWorkbook({
    sheetName: "Placed Students",
    columns: [
      { header: "Name", key: "name", width: 30 },
      { header: "PRN", key: "prn", width: 18 },
      { header: "Department", key: "department", width: 12 },
      { header: "Company", key: "company", width: 30 },
      { header: "Drive", key: "drive", width: 28 },
      { header: "Package LPA", key: "package_lpa", width: 12 }
    ],
    rows: rows.map((item) => ({
      name: item.student.name,
      prn: item.student.prn,
      department: item.student.department,
      company: item.drive.company.name,
      drive: item.drive.title,
      package_lpa: Number(item.drive.package_lpa)
    }))
  });
};

export const exportDriveWorkbook = async (driveId) => {
  const drive = await prisma.placementDrive.findUnique({
    where: {
      id: driveId
    },
    include: {
      eligibility_criteria: true,
      applications: {
        include: {
          student: true
        }
      }
    }
  });

  const rows = drive
    ? drive.applications.map((application) =>
        enrichDriveApplication(application, drive, drive.eligibility_criteria)
      )
    : [];

  return buildWorkbook({
    sheetName: "Drive Report",
    columns: [
      { header: "Name", key: "name", width: 30 },
      { header: "PRN", key: "prn", width: 18 },
      { header: "Department", key: "department", width: 12 },
      { header: "Eligible", key: "is_eligible", width: 10 },
      { header: "Opted In", key: "opted_in", width: 10 },
      { header: "Response Bucket", key: "response_bucket", width: 18 },
      { header: "Profile Ready", key: "profile_ready", width: 12 },
      { header: "Attended", key: "attended", width: 10 },
      { header: "Shortlisted", key: "shortlisted", width: 12 },
      { header: "Selected", key: "selected", width: 10 },
      { header: "Missing Fields", key: "missing_fields", width: 32 },
      { header: "Eligibility Notes", key: "eligibility_notes", width: 44 }
    ],
    rows: rows.map((item) => ({
      name: item.student.name,
      prn: item.student.prn,
      department: item.student.department,
      is_eligible: item.is_eligible ? "Yes" : "No",
      opted_in: item.opted_in ? "Yes" : "No",
      response_bucket: item.response_bucket,
      profile_ready: item.student.is_profile_complete ? "Yes" : "No",
      attended: item.attended ? "Yes" : "No",
      shortlisted: item.shortlisted ? "Yes" : "No",
      selected: item.selected ? "Yes" : "No",
      missing_fields: item.missing_profile_fields.join(", "),
      eligibility_notes: item.eligibility_analysis?.reasons?.join(" | ") ?? "Eligible"
    }))
  });
};
