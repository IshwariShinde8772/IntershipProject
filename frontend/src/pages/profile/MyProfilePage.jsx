import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Table, TableCell, TableHead } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import { formatDate } from "../../utils/format";

const responseLabel = {
  RESPONDED: "Responded",
  AWAITING_RESPONSE: "Awaiting Reply",
  MISSED: "Missed Deadline",
  PROFILE_INCOMPLETE: "Profile Incomplete",
  NOT_ELIGIBLE: "Rule Mismatch"
};

export function MyProfilePage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);

  const loadProfile = async () => {
    try {
      const response = await api.get(`/students/${user.studentId}`);
      setProfile(response.data);
      setUser((current) => ({ ...current, name: response.data.name }));
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to load profile");
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user.studentId]);

  const profileCompletion = profile?.profile_completion ?? 0;
  const pendingResponses =
    profile?.applications.filter((item) => item.response_bucket === "AWAITING_RESPONSE") ?? [];
  const missedResponses =
    profile?.applications.filter((item) => item.response_bucket === "MISSED") ?? [];

  const applyToDrive = async (driveId) => {
    try {
      await api.post(`/drives/${driveId}/apply`);
      toast.success("Applied to drive");
      loadProfile();
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to apply");
    }
  };

  const withdrawFromDrive = async (driveId) => {
    try {
      await api.delete(`/drives/${driveId}/apply`);
      toast.success("Application withdrawn");
      loadProfile();
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to withdraw");
    }
  };

  if (!profile) {
    return <div className="text-slate-500">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{profile.name || user.name}</h1>
            <p className="text-sm text-slate-500">
              {profile.prn} · {profile.department} · {profile.college_email}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>{profile.placement_status}</Badge>
              <Badge variant="blue">Profile Completion: {profileCompletion}%</Badge>
              <Badge variant={profile.is_profile_complete ? "green" : "yellow"}>
                {profile.is_profile_complete ? "Drive Ready" : "Profile Incomplete"}
              </Badge>
            </div>
          </div>
          <Link to="/profile/edit">
            <Button>{profileCompletion < 100 ? "Complete Profile" : "Edit Full Profile"}</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Drive Readiness</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Pending Responses" value={pendingResponses.length} />
          <SummaryCard label="Missed Responses" value={missedResponses.length} />
          <SummaryCard
            label="Missing Required Fields"
            value={profile.missing_profile_fields?.length ? profile.missing_profile_fields.join(", ") : "None"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SummaryCard label="College Email" value={profile.college_email} />
            <SummaryCard label="Personal Email" value={profile.personal_email} />
            <SummaryCard label="Personal Contact" value={profile.personal_contact} />
            <SummaryCard label="Career Choice" value={profile.career_choice} />
            <SummaryCard label="Aggregate CGPA" value={profile.aggregate_cgpa} />
            <SummaryCard label="Resume" value={profile.resume_url} />
            <SummaryCard label="Technical Certifications" value={profile.technical_certifications} />
            <SummaryCard label="Internships" value={profile.internships} />
            <SummaryCard label="Project Title" value={profile.be_project_title} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Access</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <SummaryCard label="Login Email" value={profile.college_email || user.email} />
          <SummaryCard label="Default Password Format" value="Use your KBTCOE email prefix, for example kbtug23588" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Opportunities</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <TableHead>Opportunity</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>My Status</TableHead>
                <TableHead>Eligibility Notes</TableHead>
                <TableHead>Action</TableHead>
              </tr>
            </thead>
            <tbody>
              {profile.applications.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <TableCell>{item.drive.title}</TableCell>
                  <TableCell>{item.drive.company.name}</TableCell>
                  <TableCell>{item.drive.package_lpa} LPA</TableCell>
                  <TableCell>{formatDate(item.drive.registration_deadline)}</TableCell>
                  <TableCell>
                    {item.selected
                      ? "Selected"
                      : item.shortlisted
                        ? "Shortlisted"
                        : item.attended
                          ? "Attended"
                          : responseLabel[item.response_bucket] ?? (item.is_eligible ? "Eligible" : "Not Eligible")}
                  </TableCell>
                  <TableCell className="max-w-sm whitespace-normal text-sm text-slate-600">
                    {item.eligibility_analysis?.reasons?.length > 0
                      ? item.eligibility_analysis.reasons.join(" ")
                      : "All company rules matched."}
                  </TableCell>
                  <TableCell>
                    {item.is_eligible && !item.opted_in ? (
                      <Button onClick={() => applyToDrive(item.drive_id)}>Opt In</Button>
                    ) : null}
                    {item.opted_in && !item.attended ? (
                      <Button variant="outline" onClick={() => withdrawFromDrive(item.drive_id)}>
                        Withdraw
                      </Button>
                    ) : null}
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 break-all text-sm text-slate-700">{value || "-"}</div>
    </div>
  );
}
