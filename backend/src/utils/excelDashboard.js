import XLSX from "xlsx";

const blankValueTokens = new Set(["", "-", "na", "n/a", "null", "undefined"]);

const candidatePatterns = {
  student_name: [
    "student name",
    "name of the student",
    "student full name",
    "full name",
    "candidate name",
    "name"
  ],
  department: ["department", "dept", "branch", "stream", "specialization"],
  placement_status: [
    "placement status",
    "placement result",
    "placed status",
    "current status",
    "status"
  ],
  company: [
    "company name",
    "selected company",
    "placed company",
    "company",
    "employer"
  ],
  prn: ["prn", "registration number", "reg no", "roll number", "roll no"],
  academic_year: [
    "admission year",
    "academic year",
    "batch",
    "graduation year",
    "passout year",
    "pass out year",
    "year of passing"
  ],
  aggregate_cgpa: ["aggregate cgpa", "overall cgpa", "current cgpa", "cgpa"],
  package_lpa: ["package lpa", "salary package", "offered package", "package", "ctc", "lpa"]
};

const cgpaBandDefinitions = [
  { name: "Below 6", min: Number.NEGATIVE_INFINITY, max: 6 },
  { name: "6 - 6.99", min: 6, max: 7 },
  { name: "7 - 7.99", min: 7, max: 8 },
  { name: "8 - 8.99", min: 8, max: 9 },
  { name: "9 and above", min: 9, max: Number.POSITIVE_INFINITY }
];

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const isBlankValue = (value) => blankValueTokens.has(normalizeText(value));

const createHeaderKey = (index) => `column_${index + 1}`;

const findHeaderRowIndex = (matrix) =>
  matrix.findIndex((row) =>
    row.some((cell) => {
      const normalized = normalizeText(cell);
      return normalized.length > 0 && !blankValueTokens.has(normalized);
    })
  );

const buildHeaders = (headerRow) => {
  const seen = new Map();

  return headerRow.map((value, index) => {
    const baseLabel = String(value ?? "").trim() || `Column ${index + 1}`;
    const seenCount = (seen.get(baseLabel) ?? 0) + 1;
    seen.set(baseLabel, seenCount);

    return {
      key: createHeaderKey(index),
      label: seenCount === 1 ? baseLabel : `${baseLabel} (${seenCount})`,
      index,
      normalized_label: normalizeText(baseLabel)
    };
  });
};

const inferHeader = (headers, patterns) => {
  for (const pattern of patterns) {
    const exactMatch = headers.find((header) => header.normalized_label === pattern);
    if (exactMatch) {
      return exactMatch;
    }
  }

  for (const pattern of patterns) {
    const partialMatch = headers.find((header) => header.normalized_label.includes(pattern));
    if (partialMatch) {
      return partialMatch;
    }
  }

  return null;
};

const extractNumericValue = (value) => {
  const match = String(value ?? "")
    .replace(/,/g, "")
    .match(/-?\d+(\.\d+)?/);

  return match ? Number(match[0]) : null;
};

const extractYearValue = (value) => {
  const matches = String(value ?? "").match(/\b(?:19|20)\d{2}\b/g);
  if (!matches?.length) {
    return null;
  }

  return Number(matches[matches.length - 1]);
};

const normalizeAcademicYear = (value) => {
  const cleaned = String(value ?? "").trim();
  if (!cleaned) {
    return null;
  }

  const yearValue = extractYearValue(cleaned);
  return {
    label: yearValue ? String(yearValue) : cleaned,
    numeric: yearValue
  };
};

const normalizeCgpa = (value) => {
  const cleaned = String(value ?? "").trim();
  if (!cleaned) {
    return null;
  }

  const numeric = extractNumericValue(cleaned);
  if (numeric === null || numeric > 10) {
    return null;
  }

  return Number(numeric.toFixed(2));
};

const normalizePackageLpa = (value) => {
  const cleaned = String(value ?? "").trim();
  if (!cleaned) {
    return null;
  }

  const numeric = extractNumericValue(cleaned);
  return numeric === null ? null : Number(numeric.toFixed(2));
};

const buildCgpaBand = (cgpa) => {
  if (cgpa === null || cgpa === undefined) {
    return "Unknown";
  }

  const band = cgpaBandDefinitions.find((entry) => cgpa >= entry.min && cgpa < entry.max);
  return band?.name ?? "Unknown";
};

const normalizePlacementStatus = (value) => {
  const normalized = normalizeText(value);

  if (blankValueTokens.has(normalized)) {
    return "UNKNOWN";
  }

  if (
    normalized.includes("higher studies") ||
    normalized.includes("higher study") ||
    normalized.includes("mtech") ||
    normalized.includes("m.tech") ||
    normalized.includes("mba") ||
    normalized.includes("ms")
  ) {
    return "HIGHER_STUDIES";
  }

  if (
    normalized.includes("opted out") ||
    normalized.includes("not interested") ||
    normalized.includes("self employed")
  ) {
    return "OPTED_OUT";
  }

  if (
    normalized === "yes" ||
    normalized.includes("placed") ||
    normalized.includes("selected") ||
    normalized.includes("offered") ||
    normalized.includes("offer received") ||
    normalized.includes("joined")
  ) {
    return normalized.includes("not placed") || normalized.includes("not selected")
      ? "NOT_PLACED"
      : "PLACED";
  }

  if (
    normalized === "no" ||
    normalized.includes("not placed") ||
    normalized.includes("unplaced") ||
    normalized.includes("not selected") ||
    normalized.includes("seeking")
  ) {
    return "NOT_PLACED";
  }

  return "UNKNOWN";
};

const buildRowSearchText = (values) =>
  Object.values(values)
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const summarizeBreakdown = (entries, sortKey = "value") =>
  Object.values(entries).sort((left, right) => {
    if (sortKey === "value") {
      return right.value - left.value;
    }

    return right.total - left.total;
  });

const sortYearBreakdown = (entries) =>
  Object.values(entries).sort((left, right) => {
    if (left.year_numeric !== null && right.year_numeric !== null) {
      return left.year_numeric - right.year_numeric;
    }

    if (left.year_numeric !== null) {
      return -1;
    }

    if (right.year_numeric !== null) {
      return 1;
    }

    return left.name.localeCompare(right.name);
  });

export const parseExcelDashboard = (fileBuffer, originalName = "uploaded.xlsx") => {
  const workbook = XLSX.read(fileBuffer, {
    type: "buffer",
    raw: false,
    cellDates: false
  });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false
  });

  const headerRowIndex = findHeaderRowIndex(matrix);
  if (headerRowIndex === -1) {
    return {
      file_name: originalName,
      sheet_name: sheetName,
      headers: [],
      rows: [],
      insights: {
        total_rows: 0,
        total_columns: 0,
        placed_students: 0,
        unplaced_students: 0,
        unknown_status: 0,
        average_cgpa: 0,
        highest_cgpa: 0,
        average_package_lpa: 0,
        highest_package_lpa: 0,
        available_years: [],
        inferred_columns: {},
        placement_breakdown: [],
        department_breakdown: [],
        year_breakdown: [],
        cgpa_breakdown: [],
        company_breakdown: [],
        column_completeness: []
      }
    };
  }

  const headers = buildHeaders(matrix[headerRowIndex]);
  const inferredHeaders = {
    student_name: inferHeader(headers, candidatePatterns.student_name),
    department: inferHeader(headers, candidatePatterns.department),
    placement_status: inferHeader(headers, candidatePatterns.placement_status),
    company: inferHeader(headers, candidatePatterns.company),
    prn: inferHeader(headers, candidatePatterns.prn),
    academic_year: inferHeader(headers, candidatePatterns.academic_year),
    aggregate_cgpa: inferHeader(headers, candidatePatterns.aggregate_cgpa),
    package_lpa: inferHeader(headers, candidatePatterns.package_lpa)
  };

  const placementBuckets = {
    PLACED: { name: "PLACED", value: 0 },
    NOT_PLACED: { name: "NOT_PLACED", value: 0 },
    HIGHER_STUDIES: { name: "HIGHER_STUDIES", value: 0 },
    OPTED_OUT: { name: "OPTED_OUT", value: 0 },
    UNKNOWN: { name: "UNKNOWN", value: 0 }
  };
  const departmentBuckets = {};
  const yearBuckets = {};
  const cgpaBuckets = cgpaBandDefinitions.reduce((accumulator, band) => {
    accumulator[band.name] = {
      name: band.name,
      total: 0,
      placed: 0
    };
    return accumulator;
  }, {});
  const companyBuckets = {};
  const availableYears = new Map();
  const columnCompleteness = headers.reduce((accumulator, header) => {
    accumulator[header.key] = {
      key: header.key,
      label: header.label,
      filled_count: 0,
      fill_rate: 0
    };
    return accumulator;
  }, {});

  let cgpaSum = 0;
  let cgpaCount = 0;
  let highestCgpa = 0;
  let packageSum = 0;
  let packageCount = 0;
  let highestPackage = 0;

  const rows = matrix
    .slice(headerRowIndex + 1)
    .map((row, index) => {
      const values = headers.reduce((accumulator, header) => {
        const value = String(row[header.index] ?? "").trim();
        accumulator[header.key] = value;

        if (!isBlankValue(value)) {
          columnCompleteness[header.key].filled_count += 1;
        }

        return accumulator;
      }, {});

      if (Object.values(values).every((value) => isBlankValue(value))) {
        return null;
      }

      const studentName = inferredHeaders.student_name ? values[inferredHeaders.student_name.key] : "";
      const department = inferredHeaders.department ? values[inferredHeaders.department.key] : "";
      const company = inferredHeaders.company ? values[inferredHeaders.company.key] : "";
      const academicYear = inferredHeaders.academic_year
        ? normalizeAcademicYear(values[inferredHeaders.academic_year.key])
        : null;
      const cgpa = inferredHeaders.aggregate_cgpa
        ? normalizeCgpa(values[inferredHeaders.aggregate_cgpa.key])
        : null;
      const packageLpa = inferredHeaders.package_lpa
        ? normalizePackageLpa(values[inferredHeaders.package_lpa.key])
        : null;

      let placementBucket = inferredHeaders.placement_status
        ? normalizePlacementStatus(values[inferredHeaders.placement_status.key])
        : "UNKNOWN";

      if (placementBucket === "UNKNOWN" && inferredHeaders.company) {
        placementBucket = isBlankValue(company) ? "NOT_PLACED" : "PLACED";
      }

      placementBuckets[placementBucket].value += 1;

      const normalizedDepartment = department || "Unknown";
      if (!departmentBuckets[normalizedDepartment]) {
        departmentBuckets[normalizedDepartment] = {
          name: normalizedDepartment,
          total: 0,
          placed: 0,
          not_placed: 0,
          other_status: 0
        };
      }

      departmentBuckets[normalizedDepartment].total += 1;
      if (placementBucket === "PLACED") {
        departmentBuckets[normalizedDepartment].placed += 1;
      } else if (placementBucket === "NOT_PLACED") {
        departmentBuckets[normalizedDepartment].not_placed += 1;
      } else {
        departmentBuckets[normalizedDepartment].other_status += 1;
      }

      if (academicYear?.label) {
        availableYears.set(academicYear.label, academicYear.numeric ?? null);

        if (!yearBuckets[academicYear.label]) {
          yearBuckets[academicYear.label] = {
            name: academicYear.label,
            year_numeric: academicYear.numeric ?? null,
            total: 0,
            placed: 0,
            not_placed: 0,
            other_status: 0
          };
        }

        yearBuckets[academicYear.label].total += 1;
        if (placementBucket === "PLACED") {
          yearBuckets[academicYear.label].placed += 1;
        } else if (placementBucket === "NOT_PLACED") {
          yearBuckets[academicYear.label].not_placed += 1;
        } else {
          yearBuckets[academicYear.label].other_status += 1;
        }
      }

      if (cgpa !== null) {
        const cgpaBand = buildCgpaBand(cgpa);
        cgpaBuckets[cgpaBand].total += 1;
        if (placementBucket === "PLACED") {
          cgpaBuckets[cgpaBand].placed += 1;
        }

        cgpaSum += cgpa;
        cgpaCount += 1;
        highestCgpa = Math.max(highestCgpa, cgpa);
      }

      if (!isBlankValue(company) && placementBucket === "PLACED") {
        companyBuckets[company] = {
          name: company,
          total: (companyBuckets[company]?.total ?? 0) + 1
        };
      }

      if (packageLpa !== null) {
        packageSum += packageLpa;
        packageCount += 1;
        highestPackage = Math.max(highestPackage, packageLpa);
      }

      return {
        id: `row-${headerRowIndex + index + 2}`,
        row_number: headerRowIndex + index + 2,
        student_name: studentName,
        department: department || null,
        placement_bucket: placementBucket,
        academic_year: academicYear?.label ?? null,
        academic_year_numeric: academicYear?.numeric ?? null,
        cgpa,
        cgpa_band: buildCgpaBand(cgpa),
        company: company || null,
        package_lpa: packageLpa,
        search_text: buildRowSearchText(values),
        values
      };
    })
    .filter(Boolean);

  const totalRows = rows.length;
  const inferredColumnSummary = Object.fromEntries(
    Object.entries(inferredHeaders).map(([key, header]) => [
      key,
      header
        ? {
            key: header.key,
            label: header.label
          }
        : null
    ])
  );

  const completeness = headers.map((header) => ({
    ...columnCompleteness[header.key],
    fill_rate: totalRows
      ? Number(((columnCompleteness[header.key].filled_count / totalRows) * 100).toFixed(1))
      : 0
  }));

  return {
    file_name: originalName,
    sheet_name: sheetName,
    headers: headers.map(({ key, label, index }) => ({ key, label, index })),
    rows,
    insights: {
      total_rows: totalRows,
      total_columns: headers.length,
      placed_students: placementBuckets.PLACED.value,
      unplaced_students: placementBuckets.NOT_PLACED.value,
      unknown_status: placementBuckets.UNKNOWN.value,
      average_cgpa: cgpaCount ? Number((cgpaSum / cgpaCount).toFixed(2)) : 0,
      highest_cgpa: Number(highestCgpa.toFixed(2)),
      average_package_lpa: packageCount ? Number((packageSum / packageCount).toFixed(2)) : 0,
      highest_package_lpa: Number(highestPackage.toFixed(2)),
      available_years: Array.from(availableYears.entries())
        .sort((left, right) => {
          if (left[1] !== null && right[1] !== null) {
            return left[1] - right[1];
          }

          if (left[1] !== null) {
            return -1;
          }

          if (right[1] !== null) {
            return 1;
          }

          return left[0].localeCompare(right[0]);
        })
        .map(([label]) => label),
      inferred_columns: inferredColumnSummary,
      placement_breakdown: summarizeBreakdown(placementBuckets),
      department_breakdown: summarizeBreakdown(departmentBuckets, "total"),
      year_breakdown: sortYearBreakdown(yearBuckets),
      cgpa_breakdown: Object.values(cgpaBuckets),
      company_breakdown: Object.values(companyBuckets)
        .sort((left, right) => right.total - left.total)
        .slice(0, 10),
      column_completeness: completeness
    }
  };
};
