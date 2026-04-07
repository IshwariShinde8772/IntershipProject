import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Funnel, FunnelChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Select } from "../../components/ui/Select";
import { api } from "../../services/api";
import { departments } from "../../utils/constants";

const colors = {
  PLACED: "#10b981",
  NOT_PLACED: "#94a3b8",
  OPTED_OUT: "#f97316",
  HIGHER_STUDIES: "#2563eb"
};

export function ReportsPage() {
  const [dashboard, setDashboard] = useState(null);
  const [drives, setDrives] = useState([]);
  const [filters, setFilters] = useState({ academic_year: "", department: "" });

  const loadReports = async () => {
    try {
      const [dashboardResponse, drivesResponse] = await Promise.all([
        api.get("/reports/dashboard", { params: filters }),
        api.get("/drives")
      ]);
      setDashboard(dashboardResponse.data);
      setDrives(drivesResponse.data);
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to load reports");
    }
  };

  useEffect(() => {
    loadReports();
  }, [filters.academic_year, filters.department]);

  const downloadExport = async (url, filename) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${window.__accessToken ?? ""}`
        }
      });
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Download failed");
    }
  };

  if (!dashboard) {
    return <div className="text-slate-500">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Placement analytics, funnel health, and Excel exports.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Select value={filters.academic_year} onChange={(event) => setFilters((current) => ({ ...current, academic_year: event.target.value }))}>
            <option value="">All Academic Years</option>
            {[2020, 2021, 2022, 2023, 2024].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
          <Select value={filters.department} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}>
            <option value="">All Departments</option>
            {departments.map((department) => (
              <option key={department}>{department}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Total Students" value={dashboard.total_students} />
        <StatCard label="Total Placed" value={dashboard.total_placed} />
        <StatCard label="Active Drives" value={dashboard.active_drives} />
        <StatCard label="Placement Rate" value={`${dashboard.placement_rate}%`} />
        <StatCard label="Average Package" value={`${dashboard.average_package_lpa} LPA`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Placement Status">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={dashboard.placement_status} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100}>
                {dashboard.placement_status.map((entry) => (
                  <Cell key={entry.name} fill={colors[entry.name]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Department-wise Placement">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboard.dept_wise_placed}>
              <XAxis dataKey="dept" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#cbd5e1" />
              <Bar dataKey="placed" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Company-wise Offers">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboard.top_companies} layout="vertical">
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="offers" fill="#0f172a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Package Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboard.package_distribution}>
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Overall Placement Funnel">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip />
              <Funnel data={dashboard.funnel} dataKey="value" />
            </FunnelChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Section</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row">
          <Button onClick={() => downloadExport("/reports/export/placed", "placed-students.xlsx")}>
            Download Placed Students Excel
          </Button>
          <Select onChange={(event) => event.target.value && downloadExport(`/reports/export/drive/${event.target.value}`, `drive-${event.target.value}.xlsx`)}>
            <option value="">Download Drive-wise Report</option>
            {drives.map((drive) => (
              <option key={drive.id} value={drive.id}>
                {drive.title}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-80">{children}</CardContent>
    </Card>
  );
}

function StatCard({ label, value }) {
  return (
    <Card>
      <CardContent>
        <div className="text-sm text-slate-500">{label}</div>
        <div className="mt-1 text-3xl font-semibold text-slate-900">{value}</div>
      </CardContent>
    </Card>
  );
}
