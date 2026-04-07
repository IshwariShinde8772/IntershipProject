import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { DriveDetailPage as AdminDriveDetailPage } from "./DriveDetailPage";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import { roles } from "../../utils/constants";
import { formatDate } from "../../utils/format";

const responseVariant = {
  RESPONDED: "green",
  AWAITING_RESPONSE: "blue",
  MISSED: "red",
  PROFILE_INCOMPLETE: "yellow",
  NOT_ELIGIBLE: "slate"
};

const responseLabel = {
  RESPONDED: "Responded",
  AWAITING_RESPONSE: "Awaiting Reply",
  MISSED: "Missed Deadline",
  PROFILE_INCOMPLETE: "Profile Incomplete",
  NOT_ELIGIBLE: "Rule Mismatch"
};

export function DriveDetailPage() {
  const { user } = useAuth();

  if (user.role !== roles.STUDENT) {
    return <AdminDriveDetailPage />;
  }

  return <StudentDriveDetailPage />;
}

function StudentDriveDetailPage() {
  const { id } = useParams();
  const [drive, setDrive] = useState(null);

  const loadDrive = async () => {
    try {
      const response = await api.get(`/drives/${id}`);
      setDrive(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to load drive details");
    }
  };

  useEffect(() => {
    loadDrive();
  }, [id]);

  const respondToDrive = async () => {
    try {
      await api.post(`/drives/${id}/apply`);
      toast.success("Response submitted successfully");
      loadDrive();
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to submit response");
    }
  };

  const withdrawResponse = async () => {
    try {
      await api.delete(`/drives/${id}/apply`);
      toast.success("Response withdrawn");
      loadDrive();
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to withdraw response");
    }
  };

  if (!drive) {
    return <div className="text-slate-500">Loading drive details...</div>;
  }

  const application = drive.my_application ?? drive.applications?.[0] ?? null;
  const deadlineClosed = new Date(drive.registration_deadline) < new Date();

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{drive.title}</h1>
              <p className="text-sm text-slate-500">{drive.company.name}</p>
            </div>
            <Badge variant={drive.status === "COMPLETED" ? "green" : drive.status === "ONGOING" ? "yellow" : "blue"}>
              {drive.status}
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <InfoCard label="Package" value={`${drive.package_lpa} LPA`} />
            <InfoCard label="Location" value={drive.job_location} />
            <InfoCard label="Deadline" value={formatDate(drive.registration_deadline)} />
            <InfoCard label="My Profile" value={`${application?.student?.profile_completion ?? 0}% complete`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>My Drive Status</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Only your own response is visible here. T&amp;P can see the full drive analysis in the admin portal.
            </p>
          </div>
          <div className="flex gap-3">
            {application?.is_eligible && !application?.opted_in && !deadlineClosed ? (
              <Button onClick={respondToDrive}>Respond and Opt In</Button>
            ) : null}
            {application?.opted_in && !application?.attended && !deadlineClosed ? (
              <Button variant="outline" onClick={withdrawResponse}>
                Withdraw Response
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Badge variant={application?.is_eligible ? "green" : "slate"}>
              {application?.is_eligible ? "Eligible" : "Not Eligible"}
            </Badge>
            <Badge variant={responseVariant[application?.response_bucket] ?? "slate"}>
              {responseLabel[application?.response_bucket] ?? "Pending"}
            </Badge>
            <Badge variant="blue">
              {application?.opted_in ? "Portal Response Submitted" : "Waiting for your response"}
            </Badge>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            {application?.eligibility_analysis?.reasons?.length > 0
              ? application.eligibility_analysis.reasons.join(" ")
              : "You satisfy the current company rules. Respond before the deadline to stay in the drive."}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eligibility Criteria</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <InfoCard label="Min CGPA" value={drive.eligibility_criteria?.min_cgpa ?? "-"} />
          <InfoCard label="Min SSC" value={`${drive.eligibility_criteria?.min_ssc_percentage ?? "-"}%`} />
          <InfoCard label="Min HSC" value={`${drive.eligibility_criteria?.min_hsc_percentage ?? "-"}%`} />
          <InfoCard label="Max Dead ATKTs" value={drive.eligibility_criteria?.max_dead_atkt ?? "-"} />
          <InfoCard label="Max Live ATKTs" value={drive.eligibility_criteria?.max_live_atkt ?? "-"} />
          <InfoCard
            label="Year Drop"
            value={drive.eligibility_criteria?.allow_year_drop ? "Allowed" : "Not Allowed"}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-700">{value}</div>
    </div>
  );
}
