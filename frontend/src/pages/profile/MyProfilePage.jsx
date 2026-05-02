import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { DocumentLink } from "../../components/documents/DocumentLink";
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
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    otp: ""
  });
  const [passwordOtpRequested, setPasswordOtpRequested] = useState(false);
  const [sendingPasswordOtp, setSendingPasswordOtp] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

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
  const entryMode =
    profile?.entry_mode ??
    (profile?.diploma_percentage || profile?.diploma_marksheet_url ? "DIPLOMA" : profile ? "HSC" : "");
  const verificationDocuments = [
    { label: "Resume", url: profile?.resume_url },
    { label: "Aadhaar Card", url: profile?.aadhar_card_url },
    { label: "10th Marksheet", url: profile?.ssc_marksheet_url },
    ...(entryMode === "HSC" ? [{ label: "12th Marksheet", url: profile?.hsc_marksheet_url }] : []),
    ...(entryMode === "DIPLOMA"
      ? [{ label: "Diploma Marksheet", url: profile?.diploma_marksheet_url }]
      : []),
    { label: "Engineering Marksheet", url: profile?.engineering_marksheets_url }
  ];

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

  const validatePasswordForm = () => {
    if (!passwordForm.currentPassword.trim()) {
      toast.error("Current password is required");
      return false;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return false;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirmation do not match");
      return false;
    }

    return true;
  };

  const requestPasswordOtp = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    setSendingPasswordOtp(true);

    try {
      const response = await api.post("/auth/change-password/request-otp", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordOtpRequested(true);
      toast.success(response.data?.message ?? "A 6-digit OTP has been sent to your email address");
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to send OTP");
    } finally {
      setSendingPasswordOtp(false);
    }
  };

  const changePassword = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    if (!passwordOtpRequested) {
      toast.error("Request the OTP first");
      return;
    }

    if (!/^\d{6}$/.test(passwordForm.otp.trim())) {
      toast.error("Enter the 6-digit OTP");
      return;
    }

    setChangingPassword(true);

    try {
      await api.post("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        otp: passwordForm.otp
      });
      setUser((current) => ({ ...current, mustChangePassword: false }));
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        otp: ""
      });
      setPasswordOtpRequested(false);
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to change password");
    } finally {
      setChangingPassword(false);
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

      {user.mustChangePassword ? (
        <Card>
          <CardContent className="rounded-2xl border border-amber-200 bg-amber-50 text-sm text-amber-900">
            Your account is using an imported/default password. Request the OTP and change it below before using the portal regularly.
          </CardContent>
        </Card>
      ) : null}

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
            <SummaryCard label="Admission Type" value={entryMode} />
            <SummaryCard label="College Email" value={profile.college_email} />
            <SummaryCard label="Personal Email" value={profile.personal_email} />
            <SummaryCard label="Personal Contact" value={profile.personal_contact} />
            <SummaryCard label="Career Choice" value={profile.career_choice} />
            <SummaryCard label="Aggregate CGPA" value={profile.aggregate_cgpa} />
            <SummaryCard label="Aadhaar Number" value={profile.aadhar_no} />
            <SummaryCard label="Technical Certifications" value={profile.technical_certifications} />
            <SummaryCard label="Internships" value={profile.internships} />
            <SummaryCard label="Project Title" value={profile.be_project_title} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verification Documents</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {verificationDocuments.map((document) => (
            <DocumentCard key={document.label} label={document.label} url={document.url} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Access</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <SummaryCard label="Login Email" value={profile.college_email || user.email} />
          <SummaryCard
            label="Password Status"
            value={user.mustChangePassword ? "Default password active. Change it now." : "Password updated"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Current Password</div>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
              }
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">New Password</div>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
              }
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs uppercase tracking-wide text-slate-400">Confirm New Password</div>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
              }
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-600">
              We will send a 6-digit OTP to {profile.college_email || user.email}. Enter that OTP to finish changing your password.
            </div>
          </div>
          {passwordOtpRequested ? (
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">6-Digit OTP</div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={passwordForm.otp}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    otp: event.target.value.replace(/\D/g, "").slice(0, 6)
                  }))
                }
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
              />
            </div>
          ) : null}
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button onClick={requestPasswordOtp} disabled={sendingPasswordOtp}>
              {sendingPasswordOtp
                ? "Sending OTP..."
                : passwordOtpRequested
                  ? "Resend OTP"
                  : "Send 6-Digit OTP"}
            </Button>
            <Button onClick={changePassword} disabled={changingPassword || !passwordOtpRequested}>
              {changingPassword ? "Updating..." : "Update Password"}
            </Button>
          </div>
          {passwordOtpRequested ? (
            <div className="md:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              OTP sent. Enter the 6-digit code from your email, then click Update Password.
            </div>
          ) : null}
          <div className="md:col-span-2 text-xs text-slate-500">
            Password must be at least 8 characters long.
          </div>
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
  const displayValue = value === null || value === undefined || value === "" ? "-" : value;

  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 break-all text-sm text-slate-700">{displayValue}</div>
    </div>
  );
}

function DocumentCard({ label, url }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-3">
        {url ? (
          <DocumentLink url={url} label="Open document" fileName={label} />
        ) : (
          <span className="text-slate-500">Not uploaded yet</span>
        )}
      </div>
    </div>
  );
}
