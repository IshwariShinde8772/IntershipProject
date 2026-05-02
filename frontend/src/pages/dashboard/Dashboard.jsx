import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { toast } from "sonner";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import { formatDate } from "../../utils/format";
import { roles } from "../../utils/constants";

const placementStatusColors = {
  PLACED: "#10b981",
  NOT_PLACED: "#94a3b8",
  OPTED_OUT: "#f97316",
  HIGHER_STUDIES: "#2563eb"
};

function StatCard({ label, value, helper }) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardContent className="space-y-1">
        <div className="text-sm text-slate-500">{label}</div>
        <div className="break-words text-2xl font-semibold text-slate-900 sm:text-3xl">{value}</div>
        {helper ? <div className="text-sm text-slate-400">{helper}</div> : null}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72 sm:h-80">{children}</CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [drives, setDrives] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        if (user.role === roles.STUDENT) {
          const [driveResponse, profileResponse] = await Promise.all([
            api.get("/drives"),
            api.get(`/students/${user.studentId}`)
          ]);
          setDrives(driveResponse.data);
          const pendingResponses = profileResponse.data.applications.filter(
            (item) => item.response_bucket === "AWAITING_RESPONSE"
          ).length;
          setDashboard({
            drivesApplied: profileResponse.data.applications.filter((item) => item.opted_in).length,
            drivesAttended: profileResponse.data.applications.filter((item) => item.attended).length,
            offersReceived: profileResponse.data.applications.filter((item) => item.selected).length,
            profileCompletion: profileResponse.data.profile_completion ?? 0,
            pendingResponses,
            missingFields: profileResponse.data.missing_profile_fields ?? [],
            isProfileComplete: profileResponse.data.is_profile_complete ?? false
          });
          return;
        }

        const [dashboardResponse, drivesResponse] = await Promise.all([
          api.get("/reports/dashboard", {
            params: user.role === roles.FACULTY && user.department ? { department: user.department } : {}
          }),
          api.get("/drives", {
            params: {
              status: "UPCOMING"
            }
          })
        ]);
        setDashboard(dashboardResponse.data);
        setDrives(drivesResponse.data.slice(0, 5));
      } catch (error) {
        toast.error(error.response?.data?.message ?? "Unable to load dashboard");
      }
    };

    load();
  }, [user]);

  const eligibleDrives =
    user.role === roles.STUDENT
      ? drives.filter((drive) => drive.student_application?.is_eligible)
      : [];

  if (!dashboard) {
    return <div className="text-slate-500">Loading dashboard...</div>;
  }

  if (user.role === roles.STUDENT) {
    return (
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Track your profile completion, eligibility, and upcoming opportunities.
          </p>
        </div>

        {!dashboard.isProfileComplete ? (
          <Card className="overflow-hidden border-amber-200 bg-amber-50">
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-semibold text-amber-950">Incomplete profile</div>
                <div className="mt-1 text-sm text-amber-900">
                  Complete your profile to become drive-ready and finish the required verification details.
                </div>
              </div>
              <Link to="/profile/edit">
                <Button className="w-full sm:w-auto">Complete Profile</Button>
              </Link>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Drives Applied" value={dashboard.drivesApplied} />
          <StatCard label="Drives Attended" value={dashboard.drivesAttended} />
          <StatCard label="Offers Received" value={dashboard.offersReceived} />
          <StatCard label="Profile Completion" value={`${dashboard.profileCompletion}%`} />
          <StatCard label="Pending Replies" value={dashboard.pendingResponses} />
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Your Eligibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {eligibleDrives.length === 0 ? (
              <p className="text-sm text-slate-500">No eligible drives available right now.</p>
            ) : (
              eligibleDrives.map((drive) => {
                const application = drive.student_application ?? drive.applications?.[0];
                return (
                  <div
                    key={drive.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-medium text-slate-900">{drive.title}</div>
                      <div className="text-sm text-slate-500">
                        {drive.company.name} - Register by {formatDate(drive.registration_deadline)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {application?.opted_in ? (
                        <Badge variant="green">Applied</Badge>
                      ) : (
                        <Badge variant="blue">Eligible</Badge>
                      )}
                      {!application?.opted_in ? (
                        <Button onClick={() => api.post(`/drives/${drive.id}/apply`).then(() => window.location.reload())}>
                          Opt In
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Profile Blockers</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.missingFields.length > 0 ? (
              <div className="text-sm text-slate-600">{dashboard.missingFields.join(", ")}</div>
            ) : (
              <div className="text-sm text-slate-600">
                Your required placement profile fields are complete.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            {user.role === roles.FACULTY
              ? `Department snapshot for ${user.department}`
              : "Placement overview for the T&P Cell"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <span className="font-medium text-slate-900">Excel analytics moved:</span> use the new
          {" "}
          <span className="font-semibold text-slate-900">Excel Extract</span>
          {" "}
          side panel option to upload a sheet and build a dedicated dashboard there.
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Total Students" value={dashboard.total_students} />
        <StatCard label="Active Drives" value={dashboard.active_drives} />
        <StatCard label="Students Placed" value={dashboard.total_placed} />
        <StatCard label="Placement Rate" value={`${dashboard.placement_rate}%`} />
        <StatCard label="Profile Ready" value={dashboard.profile_ready} />
        <StatCard label="Pending Replies" value={dashboard.pending_responses} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <ChartCard title="Department-wise Placement">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboard.dept_wise_placed}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="placed" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Placement Status Mix">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={dashboard.placement_status} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105}>
                {dashboard.placement_status.map((entry) => (
                  <Cell key={entry.name} fill={placementStatusColors[entry.name] ?? "#cbd5e1"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <ChartCard title="Overall Placement Funnel">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip />
              <Funnel data={dashboard.funnel} dataKey="value" />
            </FunnelChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Upcoming Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {drives.map((drive) => (
              <div key={drive.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="font-medium text-slate-900">{drive.title}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {drive.company.name} - {formatDate(drive.drive_date)}
                </div>
                <div className="mt-2 text-sm text-slate-600">{drive.package_lpa} LPA</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ChartCard title="Top Companies by Offers">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dashboard.top_companies} layout="vertical" margin={{ left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="offers" fill="#0f172a" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
