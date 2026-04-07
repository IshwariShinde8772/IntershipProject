import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Table, TableCell, TableHead } from "../../components/ui/Table";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import { roles } from "../../utils/constants";
import { formatDate, getInitials } from "../../utils/format";

const statusVariant = {
  PLACED: "green",
  NOT_PLACED: "slate",
  OPTED_OUT: "orange",
  HIGHER_STUDIES: "blue"
};

const responseLabel = {
  RESPONDED: "Responded",
  AWAITING_RESPONSE: "Awaiting Reply",
  MISSED: "Missed Deadline",
  PROFILE_INCOMPLETE: "Profile Incomplete",
  NOT_ELIGIBLE: "Rule Mismatch"
};

const tabs = ["Personal", "Academic", "Extra-Curricular", "Drive History"];

function InfoGrid({ items }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">{item.label}</div>
          <div className="mt-1 text-sm text-slate-700">{item.value || "-"}</div>
        </div>
      ))}
    </div>
  );
}

export function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [activeTab, setActiveTab] = useState("Personal");

  useEffect(() => {
    api
      .get(`/students/${id}`)
      .then((response) => setStudent(response.data))
      .catch((error) => toast.error(error.response?.data?.message ?? "Unable to load student"));
  }, [id]);

  const semesterChart = useMemo(() => {
    if (!student) return [];
    return [
      { sem: "Sem 1", sgpa: Number(student.fe_sem1_sgpa ?? 0) },
      { sem: "Sem 2", sgpa: Number(student.fe_sem2_sgpa ?? 0) },
      { sem: "Sem 3", sgpa: Number(student.se_sem3_sgpa ?? 0) },
      { sem: "Sem 4", sgpa: Number(student.se_sem4_sgpa ?? 0) },
      { sem: "Sem 5", sgpa: Number(student.te_sem5_sgpa ?? 0) },
      { sem: "Sem 6", sgpa: Number(student.te_sem6_sgpa ?? 0) },
      { sem: "Sem 7", sgpa: Number(student.be_sem7_sgpa ?? 0) },
      { sem: "Sem 8", sgpa: Number(student.be_sem8_sgpa ?? 0) }
    ];
  }, [student]);

  if (!student) {
    return <div className="text-slate-500">Loading student profile...</div>;
  }

  const removeStudent = async () => {
    const confirmed = window.confirm(
      `Deactivate student "${student.name}"?`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/students/${student.id}`);
      toast.success("Student deactivated successfully");
      navigate("/students");
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to deactivate student");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {student.profile_photo_url ? (
              <img src={student.profile_photo_url} alt={student.name} className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 text-2xl font-semibold text-white">
                {getInitials(student.name)}
              </div>
            )}
            <div>
              <div className="text-2xl font-semibold text-slate-900">{student.name}</div>
              <div className="text-sm text-slate-500">
                {student.prn} · {student.department}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant={statusVariant[student.placement_status] ?? "slate"}>{student.placement_status}</Badge>
                <Badge variant="blue">{student.personal_contact}</Badge>
                <Badge variant="slate">{student.college_email}</Badge>
                <Badge variant={student.is_profile_complete ? "green" : "yellow"}>
                  {student.is_profile_complete ? "Drive Ready" : `${student.profile_completion ?? 0}% complete`}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Read-only T&amp;P view of the student-submitted profile.
            </div>
            {user?.role === roles.SUPER_ADMIN ? (
              <Button variant="danger" onClick={removeStudent}>
                Deactivate Student
              </Button>
            ) : null}
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

      {activeTab === "Personal" ? (
        <Card>
          <CardContent>
            <InfoGrid
              items={[
                { label: "Date of Birth", value: formatDate(student.dob) },
                { label: "Gender", value: student.gender },
                { label: "Category", value: student.category },
                { label: "Native Place", value: student.native_place },
                { label: "District", value: student.district },
                { label: "Permanent Address", value: student.permanent_address },
                { label: "Personal Email", value: student.personal_email },
                { label: "Alternate Contact", value: student.alternate_contact },
                { label: "Father Occupation", value: student.father_occupation },
                { label: "Mother Occupation", value: student.mother_occupation }
              ]}
            />
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "Academic" ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Engineering Performance</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={semesterChart}>
                  <XAxis dataKey="sem" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sgpa" stroke="#0f172a" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-slate-900 p-6 text-white">
                <div className="text-sm text-slate-300">Aggregate CGPA</div>
                <div className="mt-2 text-5xl font-semibold">{student.aggregate_cgpa}</div>
              </div>
              <div className="flex gap-3">
                <Badge variant="red">Dead ATKTs: {student.dead_atkt_count}</Badge>
                <Badge variant="yellow">Live ATKTs: {student.live_atkt_count}</Badge>
              </div>
              <InfoGrid
                items={[
                  { label: "SSC", value: `${student.ssc_percentage}% (${student.ssc_year})` },
                  { label: "HSC", value: `${student.hsc_percentage}% (${student.hsc_year})` },
                  {
                    label: "Diploma",
                    value: student.diploma_percentage ? `${student.diploma_percentage}%` : "Not Applicable"
                  }
                ]}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "Extra-Curricular" ? (
        <Card>
          <CardContent>
            <InfoGrid
              items={[
                { label: "Technical Certifications", value: student.technical_certifications },
                { label: "Internships", value: student.internships },
                { label: "Achievements", value: student.achievements },
                { label: "BE Project Title", value: student.be_project_title },
                { label: "Career Choice", value: student.career_choice },
                { label: "Trainings Required", value: student.trainings_required }
              ]}
            />
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "Drive History" ? (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <TableHead>Drive Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Eligible</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Attended</TableHead>
                  <TableHead>Shortlisted</TableHead>
                  <TableHead>Selected</TableHead>
                  <TableHead>Notes</TableHead>
                </tr>
              </thead>
              <tbody>
                {student.applications.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 align-top">
                    <TableCell>{item.drive.title}</TableCell>
                    <TableCell>{item.drive.company.name}</TableCell>
                    <TableCell>{formatDate(item.drive.drive_date)}</TableCell>
                    <TableCell>{item.drive.package_lpa}</TableCell>
                    <TableCell>{item.is_eligible ? "Yes" : "No"}</TableCell>
                    <TableCell>{responseLabel[item.response_bucket] ?? (item.opted_in ? "Responded" : "Pending")}</TableCell>
                    <TableCell>{item.attended ? "Yes" : "No"}</TableCell>
                    <TableCell>{item.shortlisted ? "Yes" : "No"}</TableCell>
                    <TableCell>{item.selected ? "Yes" : "No"}</TableCell>
                    <TableCell className="max-w-sm whitespace-normal text-sm text-slate-600">
                      {item.eligibility_analysis?.reasons?.length > 0
                        ? item.eligibility_analysis.reasons.join(" ")
                        : "All drive rules matched."}
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
