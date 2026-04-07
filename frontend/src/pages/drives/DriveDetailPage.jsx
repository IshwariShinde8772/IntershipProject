import { useEffect, useMemo, useState } from "react";
import { Funnel, FunnelChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Checkbox } from "../../components/ui/Checkbox";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Select } from "../../components/ui/Select";
import { Table, TableCell, TableHead } from "../../components/ui/Table";
import { Textarea } from "../../components/ui/Textarea";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import { categories, departments, roles } from "../../utils/constants";
import { formatDate } from "../../utils/format";
import { Link, useNavigate, useParams } from "react-router-dom";

const tabs = ["Criteria", "Eligibility Analysis", "Attendance", "Results", "Analytics"];

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

const defaultCriteria = {
  min_cgpa: 0,
  min_ssc_percentage: 0,
  min_hsc_percentage: 0,
  min_diploma_percentage: "",
  max_dead_atkt: 0,
  max_live_atkt: 0,
  allow_year_drop: false,
  allowed_departments: [],
  allowed_genders: [],
  allowed_categories: [],
  career_choice_filter: [],
  custom_conditions: ""
};

function CriteriaModal({ open, initialValues, onClose, onSaved }) {
  const { id } = useParams();
  const [criteria, setCriteria] = useState(initialValues ?? defaultCriteria);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    setCriteria(initialValues ?? defaultCriteria);
  }, [initialValues]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      try {
        const response = await api.post(`/drives/${id}/criteria/preview`, criteria);
        setPreview(response.data.count);
      } catch {
        setPreview(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [criteria, id, open]);

  const toggleArrayValue = (key, value) => {
    setCriteria((current) => {
      const values = current[key] ?? [];
      return {
        ...current,
        [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
      };
    });
  };

  const save = async () => {
    try {
      await api.post(`/drives/${id}/criteria`, criteria);
      toast.success("Criteria saved. Eligibility engine running.");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to save criteria");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        <CardHeader>
          <CardTitle>Edit Eligibility Criteria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Min CGPA" type="number" value={criteria.min_cgpa} onChange={(value) => setCriteria((current) => ({ ...current, min_cgpa: value }))} />
            <Field label="Min SSC %" type="number" value={criteria.min_ssc_percentage} onChange={(value) => setCriteria((current) => ({ ...current, min_ssc_percentage: value }))} />
            <Field label="Min HSC %" type="number" value={criteria.min_hsc_percentage} onChange={(value) => setCriteria((current) => ({ ...current, min_hsc_percentage: value }))} />
            <Field label="Min Diploma %" type="number" value={criteria.min_diploma_percentage} onChange={(value) => setCriteria((current) => ({ ...current, min_diploma_percentage: value }))} />
            <Field label="Max Dead ATKTs" type="number" value={criteria.max_dead_atkt} onChange={(value) => setCriteria((current) => ({ ...current, max_dead_atkt: value }))} />
            <Field label="Max Live ATKTs" type="number" value={criteria.max_live_atkt} onChange={(value) => setCriteria((current) => ({ ...current, max_live_atkt: value }))} />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
            <Checkbox checked={criteria.allow_year_drop} onChange={(event) => setCriteria((current) => ({ ...current, allow_year_drop: event.target.checked }))} />
            Allow year drop
          </label>

          <CheckboxGroup
            label="Allowed Departments"
            values={criteria.allowed_departments}
            options={departments}
            onToggle={(value) => toggleArrayValue("allowed_departments", value)}
          />
          <CheckboxGroup
            label="Allowed Gender"
            values={criteria.allowed_genders}
            options={["Male", "Female"]}
            onToggle={(value) => toggleArrayValue("allowed_genders", value)}
          />
          <CheckboxGroup
            label="Allowed Category"
            values={criteria.allowed_categories}
            options={categories}
            onToggle={(value) => toggleArrayValue("allowed_categories", value)}
          />
          <CheckboxGroup
            label="Career Choice Filter"
            values={criteria.career_choice_filter}
            options={["Job", "Higher Studies", "Startup", "Not Decided"]}
            onToggle={(value) => toggleArrayValue("career_choice_filter", value)}
          />

          <div>
            <Label>Custom Conditions</Label>
            <Textarea value={criteria.custom_conditions} onChange={(event) => setCriteria((current) => ({ ...current, custom_conditions: event.target.value }))} />
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Currently {preview ?? "..."} students match these criteria.
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save}>Save Criteria</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CheckboxGroup({ label, values, options, onToggle }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-slate-700">{label}</div>
      <div className="grid gap-2 md:grid-cols-3">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3">
            <Checkbox checked={values?.includes(option)} onChange={() => onToggle(option)} />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

export function DriveDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drive, setDrive] = useState(null);
  const [activeTab, setActiveTab] = useState("Criteria");
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [attendanceDraft, setAttendanceDraft] = useState({});
  const [resultDraft, setResultDraft] = useState({});
  const [eligibleFilter, setEligibleFilter] = useState("all");

  const loadDrive = async () => {
    try {
      const response = await api.get(`/drives/${id}`);
      setDrive(response.data);
      setAttendanceDraft(
        Object.fromEntries(response.data.applications.map((item) => [item.student_id, item.attended]))
      );
      setResultDraft(
        Object.fromEntries(
          response.data.applications.map((item) => [
            item.student_id,
            {
              shortlisted: item.shortlisted,
              selected: item.selected,
              offer_letter_url: item.offer_letter_url ?? "",
              remarks: item.remarks ?? ""
            }
          ])
        )
      );
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to load drive details");
    }
  };

  useEffect(() => {
    loadDrive();
  }, [id]);

  const eligibleStudents = useMemo(() => {
    if (!drive) return [];
    if (eligibleFilter === "eligible") return drive.applications.filter((item) => item.is_eligible);
    if (eligibleFilter === "awaiting") {
      return drive.applications.filter((item) => item.response_bucket === "AWAITING_RESPONSE");
    }
    if (eligibleFilter === "responded") {
      return drive.applications.filter((item) => item.response_bucket === "RESPONDED");
    }
    if (eligibleFilter === "missed") {
      return drive.applications.filter((item) => item.response_bucket === "MISSED");
    }
    if (eligibleFilter === "profile") {
      return drive.applications.filter((item) => item.response_bucket === "PROFILE_INCOMPLETE");
    }
    if (eligibleFilter === "rules") {
      return drive.applications.filter((item) => item.response_bucket === "NOT_ELIGIBLE");
    }
    return drive.applications;
  }, [drive, eligibleFilter]);

  const attendanceRows = useMemo(
    () => drive?.applications.filter((item) => item.opted_in) ?? [],
    [drive]
  );
  const resultRows = useMemo(
    () => drive?.applications.filter((item) => item.attended) ?? [],
    [drive]
  );

  const saveAttendance = async () => {
    try {
      const payload = attendanceRows.map((item) => ({
        student_id: item.student_id,
        attended: Boolean(attendanceDraft[item.student_id])
      }));
      await api.post(`/drives/${id}/attendance/bulk`, payload);
      toast.success("Attendance saved");
      loadDrive();
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to save attendance");
    }
  };

  const saveResults = async () => {
    if (Object.values(resultDraft).some((item) => item.selected)) {
      const confirmed = window.confirm("Selected students will be marked as PLACED and excluded from future drives.");
      if (!confirmed) return;
    }

    try {
      const payload = resultRows.map((item) => ({
        student_id: item.student_id,
        ...resultDraft[item.student_id]
      }));
      await api.post(`/drives/${id}/results/bulk`, payload);
      toast.success("Results saved");
      loadDrive();
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to save results");
    }
  };

  const notifyEligible = async () => {
    try {
      const response = await api.post(`/drives/${id}/notify`);
      toast.success(
        `${response.data.sent} emails sent, ${response.data.skipped} skipped, ${response.data.failed} failed.`
      );
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to send notifications");
    }
  };

  const exportDrive = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/export/drive/${id}`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${window.__accessToken ?? ""}`
        }
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `drive-${id}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Unable to export drive report");
    }
  };

  const removeDrive = async () => {
    const confirmed = window.confirm(
      `Delete opportunity "${drive.title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/drives/${id}`);
      toast.success("Opportunity deleted successfully");
      navigate("/drives");
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to delete opportunity");
    }
  };

  if (!drive) {
    return <div className="text-slate-500">Loading drive details...</div>;
  }

  const funnelData = [
    { name: "Eligible", value: drive.counts.eligible, fill: "#64748b" },
    { name: "Responded", value: drive.counts.opted_in, fill: "#2563eb" },
    { name: "Attended", value: drive.counts.attended, fill: "#f59e0b" },
    { name: "Shortlisted", value: drive.counts.shortlisted, fill: "#10b981" },
    { name: "Selected", value: drive.counts.selected, fill: "#0f766e" }
  ];

  return (
    <div className="space-y-6">
      <CriteriaModal
        open={showCriteriaModal}
        initialValues={drive.eligibility_criteria}
        onClose={() => setShowCriteriaModal(false)}
        onSaved={loadDrive}
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {drive.company.logo_url ? (
                <img src={drive.company.logo_url} alt={drive.company.name} className="h-16 w-16 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-xl font-semibold text-white">
                  {drive.company.name.slice(0, 1)}
                </div>
              )}
              <div>
                <div className="text-2xl font-semibold text-slate-900">{drive.title}</div>
                <div className="text-sm text-slate-500">{drive.company.name}</div>
              </div>
            </div>
            <Badge variant={drive.status === "COMPLETED" ? "green" : drive.status === "ONGOING" ? "yellow" : "blue"}>{drive.status}</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Stat label="Date" value={formatDate(drive.drive_date)} />
            <Stat label="Deadline" value={formatDate(drive.registration_deadline, { dateStyle: "medium", timeStyle: "short" })} />
            <Stat label="Package" value={`${drive.package_lpa} LPA`} />
            <Stat label="Job Profile" value={drive.job_profile} />
            <Stat label="Location" value={drive.job_location} />
            <Stat label="Bond" value={`${drive.bond_years} year`} />
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Pill label="Eligible" value={drive.counts.eligible} />
            <Pill label="Responded" value={drive.counts.opted_in} />
            <Pill label="Awaiting Reply" value={drive.counts.awaiting_response ?? 0} />
            <Pill label="Missed" value={drive.counts.missed_response ?? 0} />
            <Pill label="Profile Incomplete" value={drive.counts.profile_incomplete ?? 0} />
            <Pill label="Attended" value={drive.counts.attended} />
            <Pill label="Selected" value={drive.counts.selected} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button key={tab} variant={activeTab === tab ? "default" : "outline"} onClick={() => setActiveTab(tab)}>
            {tab}
          </Button>
        ))}
      </div>

      {activeTab === "Criteria" ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Eligibility Criteria</CardTitle>
            {user.role !== roles.STUDENT ? (
              <div className="flex gap-3">
                <Link to={`/drives/${drive.id}/edit`}>
                  <Button variant="outline">Edit Opportunity</Button>
                </Link>
                {user.role === roles.SUPER_ADMIN ? (
                  <Button variant="danger" onClick={removeDrive}>
                    Delete Opportunity
                  </Button>
                ) : null}
                <Button onClick={() => setShowCriteriaModal(true)}>Edit Criteria</Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Stat label="Min CGPA" value={drive.eligibility_criteria?.min_cgpa ?? "-"} />
              <Stat label="Min SSC" value={`${drive.eligibility_criteria?.min_ssc_percentage ?? "-"}%`} />
              <Stat label="Min HSC" value={`${drive.eligibility_criteria?.min_hsc_percentage ?? "-"}%`} />
              <Stat label="Max Dead ATKTs" value={drive.eligibility_criteria?.max_dead_atkt ?? "-"} />
              <Stat label="Max Live ATKTs" value={drive.eligibility_criteria?.max_live_atkt ?? "-"} />
              <Stat label="Year Drop" value={drive.eligibility_criteria?.allow_year_drop ? "Allowed" : "Not Allowed"} />
            </div>
            <TagRow label="Allowed Departments" values={drive.eligibility_criteria?.allowed_departments} />
            <TagRow label="Allowed Categories" values={drive.eligibility_criteria?.allowed_categories} />
            <TagRow label="Career Choice" values={drive.eligibility_criteria?.career_choice_filter} />
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              {drive.eligibility_criteria?.custom_conditions || "No custom conditions added."}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "Eligibility Analysis" ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Eligibility Analysis</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Read-only drive analysis for T&amp;P. Incomplete profiles, missed responses, and rule mismatches are separated here.
              </p>
            </div>
            {user.role !== roles.STUDENT ? (
              <div className="flex gap-3">
                <Button variant="outline" onClick={notifyEligible}>Notify All Eligible</Button>
                <Button variant="outline" onClick={exportDrive}>Export eligible list</Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={eligibleFilter} onChange={(event) => setEligibleFilter(event.target.value)}>
              <option value="all">All Students</option>
              <option value="eligible">Eligible</option>
              <option value="awaiting">Awaiting Reply</option>
              <option value="responded">Responded</option>
              <option value="missed">Missed Deadline</option>
              <option value="profile">Profile Incomplete</option>
              <option value="rules">Rule Mismatch</option>
            </Select>
            <div className="overflow-x-auto">
              <Table>
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <TableHead>Name</TableHead>
                    <TableHead>PRN</TableHead>
                    <TableHead>Dept</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Eligibility</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Reason</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {eligibleStudents.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 align-top">
                      <TableCell>
                        <Link to={`/students/${item.student.id}`} className="font-medium text-slate-900 hover:underline">
                          {item.student.name}
                        </Link>
                      </TableCell>
                      <TableCell>{item.student.prn}</TableCell>
                      <TableCell>{item.student.department}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{item.student.profile_completion ?? 0}% complete</div>
                          <Badge variant={item.student.is_profile_complete ? "green" : "yellow"}>
                            {item.student.is_profile_complete ? "Ready" : "Incomplete"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_eligible ? "green" : "slate"}>
                          {item.is_eligible ? "Eligible" : "Blocked"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={responseVariant[item.response_bucket] ?? "slate"}>
                          {responseLabel[item.response_bucket] ?? item.response_bucket}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-sm whitespace-normal text-sm text-slate-600">
                        {item.eligibility_analysis?.reasons?.length > 0
                          ? item.eligibility_analysis.reasons.join(" ")
                          : "All drive rules satisfied."}
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "Attendance" ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Attendance</CardTitle>
            {user.role !== roles.STUDENT ? <Button onClick={saveAttendance}>Save Attendance</Button> : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-slate-500">
              Opted In: {drive.counts.opted_in} · Marked Present: {Object.values(attendanceDraft).filter(Boolean).length} · Absent: {drive.counts.opted_in - Object.values(attendanceDraft).filter(Boolean).length}
            </div>
            <div className="overflow-x-auto">
              <Table>
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <TableHead>Name</TableHead>
                    <TableHead>PRN</TableHead>
                    <TableHead>Dept</TableHead>
                    <TableHead>CGPA</TableHead>
                    <TableHead>Attended</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRows.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <TableCell>{item.student.name}</TableCell>
                      <TableCell>{item.student.prn}</TableCell>
                      <TableCell>{item.student.department}</TableCell>
                      <TableCell>{item.student.aggregate_cgpa}</TableCell>
                      <TableCell>
                        <Checkbox
                          checked={Boolean(attendanceDraft[item.student_id])}
                          onChange={(event) => setAttendanceDraft((current) => ({ ...current, [item.student_id]: event.target.checked }))}
                          disabled={user.role === roles.STUDENT}
                        />
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "Results" ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Results</CardTitle>
            {user.role !== roles.STUDENT ? <Button onClick={saveResults}>Save Results</Button> : null}
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <TableHead>Name</TableHead>
                  <TableHead>PRN</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Shortlisted</TableHead>
                  <TableHead>Selected</TableHead>
                  <TableHead>Offer Letter</TableHead>
                  <TableHead>Remarks</TableHead>
                </tr>
              </thead>
              <tbody>
                {resultRows.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 align-top">
                    <TableCell>{item.student.name}</TableCell>
                    <TableCell>{item.student.prn}</TableCell>
                    <TableCell>{item.student.department}</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={Boolean(resultDraft[item.student_id]?.shortlisted)}
                        onChange={(event) =>
                          setResultDraft((current) => ({
                            ...current,
                            [item.student_id]: { ...current[item.student_id], shortlisted: event.target.checked }
                          }))
                        }
                        disabled={user.role === roles.STUDENT}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={Boolean(resultDraft[item.student_id]?.selected)}
                        onChange={(event) =>
                          setResultDraft((current) => ({
                            ...current,
                            [item.student_id]: { ...current[item.student_id], selected: event.target.checked }
                          }))
                        }
                        disabled={user.role === roles.STUDENT}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={resultDraft[item.student_id]?.offer_letter_url ?? ""}
                        onChange={(event) =>
                          setResultDraft((current) => ({
                            ...current,
                            [item.student_id]: { ...current[item.student_id], offer_letter_url: event.target.value }
                          }))
                        }
                        disabled={user.role === roles.STUDENT}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={resultDraft[item.student_id]?.remarks ?? ""}
                        onChange={(event) =>
                          setResultDraft((current) => ({
                            ...current,
                            [item.student_id]: { ...current[item.student_id], remarks: event.target.value }
                          }))
                        }
                        disabled={user.role === roles.STUDENT}
                      />
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "Analytics" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Drive Funnel</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive />
                </FunnelChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Drive Gap Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {drive.applications
                .filter((item) => item.response_bucket !== "RESPONDED")
                .map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{item.student.name}</div>
                        <div className="text-sm text-slate-500">
                          {item.student.department} | {item.student.personal_contact || item.student.college_email}
                        </div>
                      </div>
                      <Badge variant={responseVariant[item.response_bucket] ?? "slate"}>
                        {responseLabel[item.response_bucket] ?? item.response_bucket}
                      </Badge>
                    </div>
                    <div className="mt-3 text-sm text-slate-600">
                      {item.eligibility_analysis?.reasons?.length > 0
                        ? item.eligibility_analysis.reasons.join(" ")
                        : "Waiting for student response."}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-700">{value}</div>
    </div>
  );
}

function Pill({ label, value }) {
  return (
    <div className="rounded-full border border-slate-200 bg-white px-4 py-3 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function TagRow({ label, values = [] }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-slate-700">{label}</div>
      <div className="flex flex-wrap gap-2">
        {values.length > 0 ? values.map((value) => <Badge key={value}>{value}</Badge>) : <Badge>All</Badge>}
      </div>
    </div>
  );
}
