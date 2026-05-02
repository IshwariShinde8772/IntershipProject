import { useDeferredValue, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { FileSpreadsheet, Filter, RefreshCcw, Search, Sparkles, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Table, TableCell, TableHead } from "../../components/ui/Table";
import { api } from "../../services/api";
import { cn } from "../../utils/cn";

const visibleExcelRowLimit = 80;
const placementOrder = ["PLACED", "NOT_PLACED", "HIGHER_STUDIES", "OPTED_OUT", "UNKNOWN"];
const cgpaBandOrder = ["Below 6", "6 - 6.99", "7 - 7.99", "8 - 8.99", "9 and above", "Unknown"];

const placementColors = {
  PLACED: "#14b8a6",
  NOT_PLACED: "#94a3b8",
  HIGHER_STUDIES: "#2563eb",
  OPTED_OUT: "#f97316",
  UNKNOWN: "#c084fc"
};

const placementBadgeVariant = {
  PLACED: "green",
  NOT_PLACED: "slate",
  HIGHER_STUDIES: "blue",
  OPTED_OUT: "orange",
  UNKNOWN: "yellow"
};

const emptyFilters = {
  search: "",
  department: "",
  placement: "",
  academicYear: "",
  cgpaBand: ""
};

const previewHeaders = [
  { key: "column_1", label: "PRN", index: 0 },
  { key: "column_2", label: "Student Name", index: 1 },
  { key: "column_3", label: "Department", index: 2 },
  { key: "column_4", label: "Admission Year", index: 3 },
  { key: "column_5", label: "Aggregate CGPA", index: 4 },
  { key: "column_6", label: "Placement Status", index: 5 },
  { key: "column_7", label: "Company Name", index: 6 },
  { key: "column_8", label: "Package LPA", index: 7 }
];

const previewRows = [
  {
    prn: "72230101",
    student_name: "Aarav Patil",
    department: "IT",
    academic_year: "2022",
    cgpa: 8.61,
    placement_bucket: "PLACED",
    company: "Infosys",
    package_lpa: 5.2
  },
  {
    prn: "72230102",
    student_name: "Siya Deshmukh",
    department: "COMP",
    academic_year: "2022",
    cgpa: 9.12,
    placement_bucket: "PLACED",
    company: "TCS Digital",
    package_lpa: 7.4
  },
  {
    prn: "72230103",
    student_name: "Rohan Shinde",
    department: "MECH",
    academic_year: "2021",
    cgpa: 7.14,
    placement_bucket: "NOT_PLACED",
    company: "",
    package_lpa: null
  },
  {
    prn: "72230104",
    student_name: "Kavya Jadhav",
    department: "CIVIL",
    academic_year: "2021",
    cgpa: 6.52,
    placement_bucket: "HIGHER_STUDIES",
    company: "",
    package_lpa: null
  },
  {
    prn: "72230105",
    student_name: "Manav Kulkarni",
    department: "ENTC",
    academic_year: "2023",
    cgpa: 8.04,
    placement_bucket: "PLACED",
    company: "Capgemini",
    package_lpa: 4.5
  },
  {
    prn: "72230106",
    student_name: "Ishita More",
    department: "ETRX",
    academic_year: "2023",
    cgpa: 7.82,
    placement_bucket: "NOT_PLACED",
    company: "",
    package_lpa: null
  },
  {
    prn: "72230107",
    student_name: "Vedant Kale",
    department: "IT",
    academic_year: "2022",
    cgpa: 9.33,
    placement_bucket: "PLACED",
    company: "Oracle",
    package_lpa: 11.2
  },
  {
    prn: "72230108",
    student_name: "Anaya Joshi",
    department: "COMP",
    academic_year: "2024",
    cgpa: 6.91,
    placement_bucket: "OPTED_OUT",
    company: "",
    package_lpa: null
  },
  {
    prn: "72230109",
    student_name: "Yash Pawar",
    department: "MECH",
    academic_year: "2024",
    cgpa: 8.2,
    placement_bucket: "PLACED",
    company: "L&T",
    package_lpa: 6.4
  },
  {
    prn: "72230110",
    student_name: "Neha Borse",
    department: "ENTC",
    academic_year: "2022",
    cgpa: 7.45,
    placement_bucket: "PLACED",
    company: "Wipro",
    package_lpa: 4.2
  },
  {
    prn: "72230111",
    student_name: "Pratik Sonawane",
    department: "CIVIL",
    academic_year: "2023",
    cgpa: 6.38,
    placement_bucket: "NOT_PLACED",
    company: "",
    package_lpa: null
  },
  {
    prn: "72230112",
    student_name: "Rutuja Nikam",
    department: "COMP",
    academic_year: "2024",
    cgpa: 8.74,
    placement_bucket: "PLACED",
    company: "Accenture",
    package_lpa: 6.8
  }
];

const buildSearchText = (values) =>
  Object.values(values)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const getCgpaBand = (cgpa) => {
  if (cgpa === null || cgpa === undefined || Number.isNaN(Number(cgpa))) {
    return "Unknown";
  }

  const numericCgpa = Number(cgpa);
  if (numericCgpa < 6) {
    return "Below 6";
  }
  if (numericCgpa < 7) {
    return "6 - 6.99";
  }
  if (numericCgpa < 8) {
    return "7 - 7.99";
  }
  if (numericCgpa < 9) {
    return "8 - 8.99";
  }
  return "9 and above";
};

const createPreviewRow = (row, index) => {
  const values = {
    column_1: row.prn,
    column_2: row.student_name,
    column_3: row.department,
    column_4: row.academic_year,
    column_5: row.cgpa ? String(row.cgpa) : "",
    column_6: row.placement_bucket,
    column_7: row.company,
    column_8: row.package_lpa ? String(row.package_lpa) : ""
  };

  return {
    id: `preview-row-${index + 1}`,
    row_number: index + 2,
    student_name: row.student_name,
    department: row.department,
    placement_bucket: row.placement_bucket,
    academic_year: row.academic_year,
    academic_year_numeric: Number(row.academic_year),
    cgpa: row.cgpa,
    cgpa_band: getCgpaBand(row.cgpa),
    company: row.company || null,
    package_lpa: row.package_lpa,
    search_text: buildSearchText(values),
    values
  };
};

const previewDashboard = {
  file_name: "preview-placement-dashboard.xlsx",
  sheet_name: "Placement Preview",
  headers: previewHeaders,
  rows: previewRows.map(createPreviewRow),
  insights: {
    inferred_columns: {
      student_name: { key: "column_2", label: "Student Name" },
      department: { key: "column_3", label: "Department" },
      placement_status: { key: "column_6", label: "Placement Status" },
      company: { key: "column_7", label: "Company Name" },
      prn: { key: "column_1", label: "PRN" },
      academic_year: { key: "column_4", label: "Admission Year" },
      aggregate_cgpa: { key: "column_5", label: "Aggregate CGPA" },
      package_lpa: { key: "column_8", label: "Package LPA" }
    }
  }
};

const parseYearValue = (value) => {
  const matches = String(value ?? "").match(/\b(?:19|20)\d{2}\b/g);
  return matches?.length ? Number(matches[matches.length - 1]) : null;
};

const sortYearLabels = (left, right) => {
  const leftYear = parseYearValue(left);
  const rightYear = parseYearValue(right);

  if (leftYear !== null && rightYear !== null) {
    return leftYear - rightYear;
  }
  if (leftYear !== null) {
    return -1;
  }
  if (rightYear !== null) {
    return 1;
  }
  return left.localeCompare(right);
};

const buildPowerBiAnalytics = (rows) => {
  const placementCounts = placementOrder.reduce((accumulator, status) => {
    accumulator[status] = 0;
    return accumulator;
  }, {});

  const departmentBuckets = {};
  const yearBuckets = {};
  const cgpaBuckets = cgpaBandOrder.reduce((accumulator, band) => {
    accumulator[band] = { name: band, total: 0, placed: 0 };
    return accumulator;
  }, {});
  const companyBuckets = {};

  let cgpaSum = 0;
  let cgpaCount = 0;
  let packageSum = 0;
  let packageCount = 0;
  let highestPackage = 0;

  rows.forEach((row) => {
    const placement = row.placement_bucket ?? "UNKNOWN";
    const department = row.department ?? "Unknown";
    const year = row.academic_year ?? "Unknown";
    const cgpaBand = row.cgpa_band ?? getCgpaBand(row.cgpa);

    placementCounts[placement] = (placementCounts[placement] ?? 0) + 1;

    if (!departmentBuckets[department]) {
      departmentBuckets[department] = {
        name: department,
        total: 0,
        placed: 0,
        not_placed: 0,
        other_status: 0,
        placement_rate: 0
      };
    }

    departmentBuckets[department].total += 1;
    if (placement === "PLACED") {
      departmentBuckets[department].placed += 1;
    } else if (placement === "NOT_PLACED") {
      departmentBuckets[department].not_placed += 1;
    } else {
      departmentBuckets[department].other_status += 1;
    }

    if (year !== "Unknown") {
      if (!yearBuckets[year]) {
        yearBuckets[year] = {
          name: year,
          total: 0,
          placed: 0,
          not_placed: 0,
          other_status: 0
        };
      }

      yearBuckets[year].total += 1;
      if (placement === "PLACED") {
        yearBuckets[year].placed += 1;
      } else if (placement === "NOT_PLACED") {
        yearBuckets[year].not_placed += 1;
      } else {
        yearBuckets[year].other_status += 1;
      }
    }

    cgpaBuckets[cgpaBand].total += 1;
    if (placement === "PLACED") {
      cgpaBuckets[cgpaBand].placed += 1;
    }

    if (row.cgpa !== null && row.cgpa !== undefined) {
      cgpaSum += Number(row.cgpa);
      cgpaCount += 1;
    }

    if (row.company && placement === "PLACED") {
      companyBuckets[row.company] = {
        name: row.company,
        total: (companyBuckets[row.company]?.total ?? 0) + 1
      };
    }

    if (row.package_lpa !== null && row.package_lpa !== undefined) {
      const packageValue = Number(row.package_lpa);
      packageSum += packageValue;
      packageCount += 1;
      highestPackage = Math.max(highestPackage, packageValue);
    }
  });

  const departmentPlacement = Object.values(departmentBuckets)
    .map((bucket) => ({
      ...bucket,
      placement_rate: bucket.total ? Number(((bucket.placed / bucket.total) * 100).toFixed(1)) : 0
    }))
    .sort((left, right) => right.total - left.total);

  return {
    metrics: {
      totalStudents: rows.length,
      placedStudents: placementCounts.PLACED ?? 0,
      placementRate: rows.length ? Number((((placementCounts.PLACED ?? 0) / rows.length) * 100).toFixed(1)) : 0,
      averageCgpa: cgpaCount ? Number((cgpaSum / cgpaCount).toFixed(2)) : 0,
      averagePackage: packageCount ? Number((packageSum / packageCount).toFixed(2)) : 0,
      highestPackage: Number(highestPackage.toFixed(2)),
      companiesPlaced: Object.keys(companyBuckets).length
    },
    placementMix: placementOrder
      .map((status) => ({ name: status, value: placementCounts[status] ?? 0 }))
      .filter((item) => item.value > 0),
    departmentPlacement,
    yearPlacement: Object.values(yearBuckets).sort((left, right) => sortYearLabels(left.name, right.name)),
    cgpaDistribution: cgpaBandOrder.map((band) => cgpaBuckets[band]),
    topCompanies: Object.values(companyBuckets)
      .sort((left, right) => right.total - left.total)
      .slice(0, 8),
    bestDepartment: departmentPlacement[0] ?? null,
    bestYear: Object.values(yearBuckets)
      .map((bucket) => ({
        ...bucket,
        placement_rate: bucket.total ? Number(((bucket.placed / bucket.total) * 100).toFixed(1)) : 0
      }))
      .sort((left, right) => right.placement_rate - left.placement_rate)[0] ?? null,
    hasYearData: Object.keys(yearBuckets).length > 0,
    hasCgpaData: cgpaCount > 0,
    hasCompanyData: Object.keys(companyBuckets).length > 0
  };
};

function MetricCard({ label, value, helper, accentClass }) {
  return (
    <Card className="min-w-0 overflow-hidden border-slate-200 shadow-sm">
      <CardContent className="relative p-4">
        <div className={cn("absolute inset-x-0 top-0 h-1", accentClass)} />
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <div className="mt-2 break-words text-2xl font-semibold text-slate-950">{value}</div>
        {helper ? <div className="mt-1 text-xs text-slate-400">{helper}</div> : null}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, subtitle, children, className, contentClassName = "h-56 xl:h-60" }) {
  return (
    <Card className={cn("min-w-0 overflow-hidden shadow-sm", className)}>
      <CardHeader className="border-b border-slate-100 p-4">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
      </CardHeader>
      <CardContent className={cn("p-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

function EmptyChartState({ message }) {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      {message}
    </div>
  );
}

export function ExcelExtractPage() {
  const [excelFile, setExcelFile] = useState(null);
  const [excelDashboard, setExcelDashboard] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const deferredSearch = useDeferredValue(filters.search);
  const activeDashboard = excelDashboard ?? previewDashboard;
  const isPreviewMode = !excelDashboard;
  const inferredColumns = activeDashboard.insights?.inferred_columns ?? {};

  const departmentOptions = useMemo(
    () =>
      Array.from(new Set(activeDashboard.rows.map((row) => row.department ?? "Unknown")))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right)),
    [activeDashboard]
  );

  const yearOptions = useMemo(
    () =>
      Array.from(new Set(activeDashboard.rows.map((row) => row.academic_year).filter(Boolean))).sort(sortYearLabels),
    [activeDashboard]
  );

  const placementOptions = useMemo(
    () => placementOrder.filter((status) => activeDashboard.rows.some((row) => row.placement_bucket === status)),
    [activeDashboard]
  );

  const cgpaBandOptions = useMemo(
    () =>
      cgpaBandOrder.filter((band) =>
        activeDashboard.rows.some((row) => (row.cgpa_band ?? getCgpaBand(row.cgpa)) === band)
      ),
    [activeDashboard]
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return activeDashboard.rows.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        (row.student_name ?? "").toLowerCase().includes(normalizedSearch) ||
        (row.company ?? "").toLowerCase().includes(normalizedSearch) ||
        (row.search_text ?? "").includes(normalizedSearch);
      const matchesDepartment = !filters.department || (row.department ?? "Unknown") === filters.department;
      const matchesPlacement = !filters.placement || row.placement_bucket === filters.placement;
      const matchesYear = !filters.academicYear || row.academic_year === filters.academicYear;
      const matchesCgpaBand =
        !filters.cgpaBand || (row.cgpa_band ?? getCgpaBand(row.cgpa)) === filters.cgpaBand;

      return matchesSearch && matchesDepartment && matchesPlacement && matchesYear && matchesCgpaBand;
    });
  }, [activeDashboard, deferredSearch, filters.academicYear, filters.cgpaBand, filters.department, filters.placement]);

  const analytics = useMemo(() => buildPowerBiAnalytics(filteredRows), [filteredRows]);
  const visibleRows = useMemo(() => filteredRows.slice(0, visibleExcelRowLimit), [filteredRows]);
  const selectedRow = useMemo(() => {
    if (!deferredSearch.trim()) {
      return null;
    }

    return filteredRows[0] ?? null;
  }, [deferredSearch, filteredRows]);

  const compactExtraHeaders = useMemo(() => {
    const priorityKeys = new Set(
      Object.values(inferredColumns)
        .filter(Boolean)
        .map((column) => column.key)
    );

    return activeDashboard.headers.filter((header) => !priorityKeys.has(header.key)).slice(0, 2);
  }, [activeDashboard.headers, inferredColumns]);

  const prnHeaderKey = inferredColumns.prn?.key ?? activeDashboard.headers[0]?.key ?? null;

  const uploadExcelDashboard = async () => {
    if (!excelFile) {
      toast.error("Please choose an Excel file first");
      return;
    }

    setUploadingExcel(true);

    try {
      const formData = new FormData();
      formData.append("file", excelFile);

      const response = await api.post("/reports/excel-dashboard", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setExcelDashboard(response.data);
      setFilters(emptyFilters);
      toast.success(`Excel dashboard ready for ${response.data.file_name}`);
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to analyze the Excel file");
    } finally {
      setUploadingExcel(false);
    }
  };

  const clearExcelDashboard = () => {
    setExcelFile(null);
    setExcelDashboard(null);
    setFilters(emptyFilters);
    setFileInputKey((current) => current + 1);
  };

  return (
    <div className="mx-auto max-w-[1720px] space-y-4">
      <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">Excel Extract</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Compact placement dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              Upload an Excel sheet and turn it into a cleaner, denser dashboard view.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isPreviewMode ? "blue" : "green"}>
            {isPreviewMode ? "Preview Source" : "Live Uploaded Source"}
          </Badge>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {activeDashboard.file_name}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="overflow-hidden border-slate-900 bg-slate-950 text-white shadow-xl xl:sticky xl:top-24 xl:h-fit">
          <CardContent className="space-y-4 p-4">
            <div className="border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3 text-teal-200">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Upload Excel</div>
                  <div className="text-xs text-slate-300">Use `.xlsx`, `.xls`, or `.csv`</div>
                </div>
              </div>

              <Input
                key={fileInputKey}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="mt-4 border-white/15 bg-white text-slate-900 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                onChange={(event) => setExcelFile(event.target.files?.[0] ?? null)}
              />

              <div className="mt-3 grid gap-2">
                <Button
                  className="w-full bg-teal-400 text-slate-950 hover:bg-teal-300"
                  onClick={uploadExcelDashboard}
                  disabled={!excelFile || uploadingExcel}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {uploadingExcel ? "Building..." : "Build Dashboard"}
                </Button>
                <Button
                  className="w-full border-white/15 bg-transparent text-white hover:bg-white/10"
                  variant="outline"
                  onClick={clearExcelDashboard}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Reset Preview
                </Button>
              </div>
            </div>

            <div className="border-b border-white/10 pb-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                <Filter className="h-3.5 w-3.5" />
                Filters
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="border-white/15 bg-white/95 pl-9 text-slate-900"
                    value={filters.search}
                    onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                    placeholder="Search student or company"
                  />
                </div>

                <Select
                  className="border-white/15 bg-white/95 text-slate-900"
                  value={filters.department}
                  onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}
                >
                  <option value="">All Departments</option>
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </Select>

                <Select
                  className="border-white/15 bg-white/95 text-slate-900"
                  value={filters.placement}
                  onChange={(event) => setFilters((current) => ({ ...current, placement: event.target.value }))}
                >
                  <option value="">All Placement Status</option>
                  {placementOptions.map((placement) => (
                    <option key={placement} value={placement}>
                      {placement}
                    </option>
                  ))}
                </Select>

                <Select
                  className="border-white/15 bg-white/95 text-slate-900"
                  value={filters.academicYear}
                  onChange={(event) => setFilters((current) => ({ ...current, academicYear: event.target.value }))}
                >
                  <option value="">All Years</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </Select>

                <Select
                  className="border-white/15 bg-white/95 text-slate-900"
                  value={filters.cgpaBand}
                  onChange={(event) => setFilters((current) => ({ ...current, cgpaBand: event.target.value }))}
                >
                  <option value="">All CGPA Bands</option>
                  {cgpaBandOptions.map((band) => (
                    <option key={band} value={band}>
                      {band}
                    </option>
                  ))}
                </Select>

                <Button className="w-full" variant="outline" onClick={() => setFilters(emptyFilters)}>
                  Reset Filters
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">Quick Summary</div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl bg-white/8 p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Sheet</div>
                  <div className="mt-1 break-words text-sm font-semibold text-white">{activeDashboard.sheet_name}</div>
                </div>
                <div className="rounded-2xl bg-white/8 p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Top Dept</div>
                  <div className="mt-1 text-sm font-semibold text-white">{analytics.bestDepartment?.name ?? "No data"}</div>
                  <div className="mt-1 text-xs text-slate-300">
                    {analytics.bestDepartment
                      ? `${analytics.bestDepartment.placed}/${analytics.bestDepartment.total} placed`
                      : "Waiting for filtered rows"}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/8 p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Best Year</div>
                  <div className="mt-1 text-sm font-semibold text-white">{analytics.bestYear?.name ?? "No year data"}</div>
                  <div className="mt-1 text-xs text-slate-300">
                    {analytics.bestYear ? `${analytics.bestYear.placement_rate}% placement rate` : "Upload year data"}
                  </div>
                </div>
              </div>
            </div>

            {selectedRow ? (
              <div className="rounded-2xl border border-teal-400/30 bg-teal-500/10 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-teal-100">Focused Student</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {selectedRow.student_name || "Student Row"}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-200">
                  <div>{selectedRow.department ?? "Unknown"}</div>
                  <div>{selectedRow.academic_year ?? "-"}</div>
                  <div>CGPA {selectedRow.cgpa ?? "-"}</div>
                  <div>{selectedRow.company ?? "No company"}</div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-5">
            <MetricCard
              label="Students"
              value={analytics.metrics.totalStudents}
              helper="Filtered rows"
              accentClass="bg-teal-500"
            />
            <MetricCard
              label="Placed"
              value={analytics.metrics.placedStudents}
              helper={`${analytics.metrics.placementRate}% rate`}
              accentClass="bg-emerald-500"
            />
            <MetricCard
              label="Average CGPA"
              value={analytics.metrics.averageCgpa || "-"}
              helper="Detected CGPA values"
              accentClass="bg-sky-500"
            />
            <MetricCard
              label="Avg Package"
              value={analytics.metrics.averagePackage ? `${analytics.metrics.averagePackage} LPA` : "-"}
              helper="When package exists"
              accentClass="bg-orange-500"
            />
            <MetricCard
              label="Top Package"
              value={analytics.metrics.highestPackage ? `${analytics.metrics.highestPackage} LPA` : "-"}
              helper={`${analytics.metrics.companiesPlaced} companies`}
              accentClass="bg-slate-900"
            />
          </div>

          <div className="grid gap-4 2xl:grid-cols-[0.9fr_1.15fr_0.95fr]">
            <ChartCard title="Placement Mix" subtitle="Status split" contentClassName="h-52 p-3 xl:h-56">
              {analytics.placementMix.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.placementMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                      {analytics.placementMix.map((entry) => (
                        <Cell key={entry.name} fill={placementColors[entry.name] ?? placementColors.UNKNOWN} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="No matching placement rows." />
              )}
            </ChartCard>

            <ChartCard title="Department Placement" subtitle="Total vs placed" contentClassName="h-52 p-3 xl:h-56">
              {analytics.departmentPlacement.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.departmentPlacement}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#cbd5e1" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="placed" fill="#14b8a6" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="Department chart appears when rows exist." />
              )}
            </ChartCard>

            <ChartCard title="Top Companies" subtitle="Placed-company counts" contentClassName="h-52 p-3 xl:h-56">
              {analytics.hasCompanyData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.topCompanies} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#0f172a" radius={[0, 5, 5, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="Company chart appears when company data exists." />
              )}
            </ChartCard>
          </div>

          <div className="grid gap-4 2xl:grid-cols-[1.2fr_0.8fr]">
            <ChartCard
              title="Year-wise Placement Trend"
              subtitle="Placed, not placed, and other statuses"
              contentClassName="h-60 p-3"
            >
              {analytics.hasYearData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.yearPlacement}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="placed" stackId="year" fill="#14b8a6" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="not_placed" stackId="year" fill="#94a3b8" />
                    <Bar dataKey="other_status" stackId="year" fill="#60a5fa" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="Upload a file with year or batch data to see this trend." />
              )}
            </ChartCard>

            <ChartCard title="CGPA Distribution" subtitle="CGPA band vs placed" contentClassName="h-60 p-3">
              {analytics.hasCgpaData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.cgpaDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} height={46} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#cbd5e1" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="placed" fill="#2563eb" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="Upload a file with CGPA values to activate this card." />
              )}
            </ChartCard>
          </div>

          <Card className="overflow-hidden shadow-sm">
            <CardHeader className="border-b border-slate-100 p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-base">Excel Student Table</CardTitle>
                  <div className="mt-1 text-xs text-slate-500">
                    {filteredRows.length > visibleRows.length
                      ? `Showing first ${visibleRows.length} of ${filteredRows.length} rows`
                      : `Showing ${filteredRows.length} rows`}
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {isPreviewMode ? "Preview mode" : activeDashboard.sheet_name}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid gap-4 p-4 lg:hidden">
                {visibleRows.slice(0, 8).map((row) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Row {row.row_number}</div>
                        <div className="mt-1 break-words text-base font-semibold text-slate-900">
                          {row.student_name || "Student Row"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {(row.department ?? "Unknown")} {row.academic_year ? `| ${row.academic_year}` : ""}
                        </div>
                      </div>
                      <Badge variant={placementBadgeVariant[row.placement_bucket] ?? "yellow"}>
                        {row.placement_bucket}
                      </Badge>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">PRN</div>
                        <div className="mt-1 text-sm text-slate-800">
                          {(prnHeaderKey && row.values[prnHeaderKey]) || "-"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">CGPA</div>
                        <div className="mt-1 text-sm text-slate-800">{row.cgpa ?? "-"}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Company</div>
                        <div className="mt-1 text-sm text-slate-800">{row.company ?? "-"}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Package</div>
                        <div className="mt-1 text-sm text-slate-800">{row.package_lpa ?? "-"}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden max-h-[340px] overflow-auto lg:block">
                <Table className="min-w-[1080px]">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
                    <tr>
                      <TableHead>PRN</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>CGPA</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Package</TableHead>
                      {compactExtraHeaders.map((header) => (
                        <TableHead key={header.key}>{header.label}</TableHead>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100 align-top">
                        <TableCell>{(prnHeaderKey && row.values[prnHeaderKey]) || "-"}</TableCell>
                        <TableCell className="font-medium text-slate-900">{row.student_name || "-"}</TableCell>
                        <TableCell>{row.department ?? "-"}</TableCell>
                        <TableCell>{row.academic_year ?? "-"}</TableCell>
                        <TableCell>{row.cgpa ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant={placementBadgeVariant[row.placement_bucket] ?? "yellow"}>
                            {row.placement_bucket}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.company ?? "-"}</TableCell>
                        <TableCell>{row.package_lpa ?? "-"}</TableCell>
                        {compactExtraHeaders.map((header) => (
                          <TableCell key={`${row.id}-${header.key}`} className="max-w-56 whitespace-normal break-words">
                            {row.values[header.key] || "-"}
                          </TableCell>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
