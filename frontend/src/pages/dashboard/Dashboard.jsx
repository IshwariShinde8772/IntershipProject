import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Funnel, FunnelChart, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import { formatDate } from "../../utils/format";
import { roles } from "../../utils/constants";

function StatCard({ label, value, helper }) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <div className="text-sm text-slate-500">{label}</div>
        <div className="text-3xl font-semibold text-slate-900">{value}</div>
        {helper ? <div className="text-sm text-slate-400">{helper}</div> : null}
      </CardContent>
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
            missingFields: profileResponse.data.missing_profile_fields ?? []
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Track your profile completion, eligibility, and upcoming opportunities.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <StatCard label="Drives Applied" value={dashboard.drivesApplied} />
          <StatCard label="Drives Attended" value={dashboard.drivesAttended} />
          <StatCard label="Offers Received" value={dashboard.offersReceived} />
          <StatCard label="Profile Completion" value={`${dashboard.profileCompletion}%`} />
          <StatCard label="Pending Replies" value={dashboard.pendingResponses} />
        </div>

        <Card>
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
                  <div key={drive.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{drive.title}</div>
                      <div className="text-sm text-slate-500">
                        {drive.company.name} · Register by {formatDate(drive.registration_deadline)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {application?.opted_in ? <Badge variant="green">Applied</Badge> : <Badge variant="blue">Eligible</Badge>}
                      {!application?.opted_in ? (
                        <Button onClick={() => api.post(`/drives/${drive.id}/apply`).then(() => window.location.reload())}>Opt In</Button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Blockers</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.missingFields.length > 0 ? (
              <div className="text-sm text-slate-600">{dashboard.missingFields.join(", ")}</div>
            ) : (
              <div className="text-sm text-slate-600">Your required placement profile fields are complete.</div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          {user.role === roles.FACULTY ? `Department snapshot for ${user.department}` : "Placement overview for the T&P Cell"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        <StatCard label="Total Students" value={dashboard.total_students} />
        <StatCard label="Active Drives" value={dashboard.active_drives} />
        <StatCard label="Students Placed" value={dashboard.total_placed} />
        <StatCard label="Placement Rate" value={`${dashboard.placement_rate}%`} />
        <StatCard label="Profile Ready" value={dashboard.profile_ready} />
        <StatCard label="Pending Replies" value={dashboard.pending_responses} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Department-wise Placement</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.dept_wise_placed}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dept" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="placed" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {drives.map((drive) => (
              <div key={drive.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="font-medium text-slate-900">{drive.title}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {drive.company.name} · {formatDate(drive.drive_date)}
                </div>
                <div className="mt-2 text-sm text-slate-600">{drive.package_lpa} LPA</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
