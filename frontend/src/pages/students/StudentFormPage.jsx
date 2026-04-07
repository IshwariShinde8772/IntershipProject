import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Checkbox } from "../../components/ui/Checkbox";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Progress } from "../../components/ui/Progress";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import { uploadFile } from "../../services/uploads";
import { categories, departments, roles } from "../../utils/constants";

const steps = [
  "Personal Info",
  "Contact & Family",
  "School Academics",
  "Engineering Academics",
  "Extra-Curricular",
  "Industry Network & Documents"
];

const initialForm = {
  name: "",
  prn: "",
  college_id: "",
  gender: "",
  dob: "",
  category: "",
  aadhar_no: "",
  pan_no: "",
  native_place: "",
  district: "",
  permanent_address: "",
  personal_email: "",
  college_email: "",
  personal_contact: "",
  alternate_contact: "",
  father_occupation: "",
  mother_occupation: "",
  sibling_info: "",
  department: "",
  ssc_percentage: "",
  ssc_year: "",
  hsc_percentage: "",
  hsc_board: "",
  hsc_year: "",
  cet_jee_score: "",
  diploma_percentage: "",
  diploma_branch: "",
  diploma_board: "",
  diploma_year: "",
  admission_year: "",
  fe_sem1_sgpa: "",
  fe_sem2_sgpa: "",
  se_sem3_sgpa: "",
  se_sem4_sgpa: "",
  te_sem5_sgpa: "",
  te_sem6_sgpa: "",
  be_sem7_sgpa: "",
  be_sem8_sgpa: "",
  aggregate_cgpa: "",
  dead_atkt_count: "0",
  live_atkt_count: "0",
  year_drop: "0",
  achievements: "",
  technical_certifications: "",
  internships: "",
  be_project_title: "",
  trainings_required: "",
  career_choice: "",
  industry_contact_name: "",
  industry_contact_org: "",
  industry_contact_position: "",
  industry_contact_phone: "",
  resume_url: "",
  profile_photo_url: "",
  consent_declaration: false
};

export function StudentFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isStudentSelfService = user?.role === roles.STUDENT;
  const effectiveStudentId = isStudentSelfService ? user.studentId : id;
  const isEdit = Boolean(effectiveStudentId);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [resumeFile, setResumeFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;

    api
      .get(`/students/${effectiveStudentId}`)
      .then((response) => {
        const payload = response.data;
        setForm({
          ...initialForm,
          ...payload,
          dob: payload.dob ? payload.dob.slice(0, 10) : "",
          consent_declaration: Boolean(payload.consent_declaration)
        });
      })
      .catch((error) => toast.error(error.response?.data?.message ?? "Unable to load student"));
  }, [effectiveStudentId, isEdit]);

  useEffect(() => {
    if (isStudentSelfService && user?.email) {
      setForm((current) => ({
        ...current,
        college_email: current.college_email || user.email
      }));
    }
  }, [isStudentSelfService, user]);

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const validateCurrentStep = () => {
    const requiredGroups = [
      ["name", "prn", "college_id", "gender", "dob", "category", "department"],
      ["personal_email", "college_email", "personal_contact"],
      ["ssc_percentage", "ssc_year", "hsc_percentage", "hsc_board", "hsc_year"],
      ["admission_year", "se_sem3_sgpa", "se_sem4_sgpa", "te_sem5_sgpa", "te_sem6_sgpa", "aggregate_cgpa"],
      ["career_choice"],
      ["consent_declaration"]
    ];

    const missing = requiredGroups[step].filter((field) => !form[field]);
    if (missing.length > 0) {
      toast.error(`Please complete required fields before moving ahead`);
      return false;
    }
    return true;
  };

  const onNext = () => {
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const onSubmit = async () => {
    if (!validateCurrentStep()) return;
    setSubmitting(true);
    try {
      let payload = { ...form };
      if (resumeFile) payload.resume_url = await uploadFile(resumeFile);
      if (photoFile) payload.profile_photo_url = await uploadFile(photoFile);

      if (isEdit) {
        await api.put(`/students/${effectiveStudentId}`, payload);
        toast.success(isStudentSelfService ? "Profile updated successfully" : "Student updated successfully");
      } else {
        await api.post("/students", payload);
        toast.success("Student created successfully");
      }
      navigate(isStudentSelfService ? "/profile" : "/students");
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to save student");
    } finally {
      setSubmitting(false);
    }
  };

  const trainings = ["Aptitude", "Technical", "HR", "Soft Skills", "Company Specified"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {isStudentSelfService ? "Complete Your Placement Profile" : isEdit ? "Edit Student" : "Add Student"}
        </h1>
        <p className="text-sm text-slate-500">
          {isStudentSelfService
            ? "Fill the same information you would submit in the placement master form. The T&P cell will review this from the admin portal."
            : "Use the guided flow to complete the student profile."}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-700">
              Step {step + 1} of {steps.length}: {steps[step]}
            </div>
            <div className="text-sm text-slate-500">{Math.round(progress)}%</div>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{steps[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {step === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
              </div>
              <div>
                <Label>PRN</Label>
                <Input value={form.prn} onChange={(event) => updateField("prn", event.target.value)} />
              </div>
              <div>
                <Label>College ID</Label>
                <Input value={form.college_id} onChange={(event) => updateField("college_id", event.target.value)} />
              </div>
              <div>
                <Label>Department</Label>
                <Select value={form.department} onChange={(event) => updateField("department", event.target.value)}>
                  <option value="">Select</option>
                  {departments.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onChange={(event) => updateField("gender", event.target.value)}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </Select>
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input type="date" value={form.dob} onChange={(event) => updateField("dob", event.target.value)} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onChange={(event) => updateField("category", event.target.value)}>
                  <option value="">Select</option>
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </div>
              <InputField label="Aadhar No" value={form.aadhar_no} onChange={(value) => updateField("aadhar_no", value)} />
              <InputField label="PAN No" value={form.pan_no} onChange={(value) => updateField("pan_no", value)} />
              <InputField label="Native Place" value={form.native_place} onChange={(value) => updateField("native_place", value)} />
              <InputField label="District" value={form.district} onChange={(value) => updateField("district", value)} />
              <div className="md:col-span-2">
                <Label>Permanent Address</Label>
                <Textarea value={form.permanent_address} onChange={(event) => updateField("permanent_address", event.target.value)} />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="Personal Email" value={form.personal_email} onChange={(value) => updateField("personal_email", value)} />
              <InputField
                label="College Email"
                value={form.college_email}
                onChange={(value) => updateField("college_email", value)}
                disabled={isStudentSelfService}
              />
              <InputField label="Personal Contact" value={form.personal_contact} onChange={(value) => updateField("personal_contact", value)} />
              <InputField label="Alternate Contact" value={form.alternate_contact} onChange={(value) => updateField("alternate_contact", value)} />
              <InputField label="Father Occupation" value={form.father_occupation} onChange={(value) => updateField("father_occupation", value)} />
              <InputField label="Mother Occupation" value={form.mother_occupation} onChange={(value) => updateField("mother_occupation", value)} />
              <div className="md:col-span-2">
                <Label>Sibling Info</Label>
                <Textarea value={form.sibling_info} onChange={(event) => updateField("sibling_info", event.target.value)} />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="SSC Percentage" type="number" value={form.ssc_percentage} onChange={(value) => updateField("ssc_percentage", value)} />
              <InputField label="SSC Passing Year" type="number" value={form.ssc_year} onChange={(value) => updateField("ssc_year", value)} />
              <InputField label="HSC Percentage" type="number" value={form.hsc_percentage} onChange={(value) => updateField("hsc_percentage", value)} />
              <div>
                <Label>HSC Board</Label>
                <Select value={form.hsc_board} onChange={(event) => updateField("hsc_board", event.target.value)}>
                  <option value="">Select</option>
                  <option value="HSC">HSC</option>
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE">ICSE</option>
                </Select>
              </div>
              <InputField label="HSC Year" type="number" value={form.hsc_year} onChange={(value) => updateField("hsc_year", value)} />
              <InputField label="CET/JEE Score" value={form.cet_jee_score} onChange={(value) => updateField("cet_jee_score", value)} />
              <InputField label="Diploma Percentage" type="number" value={form.diploma_percentage} onChange={(value) => updateField("diploma_percentage", value)} />
              <InputField label="Diploma Branch" value={form.diploma_branch} onChange={(value) => updateField("diploma_branch", value)} />
              <InputField label="Diploma Board" value={form.diploma_board} onChange={(value) => updateField("diploma_board", value)} />
              <InputField label="Diploma Year" type="number" value={form.diploma_year} onChange={(value) => updateField("diploma_year", value)} />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="Admission Year" type="number" value={form.admission_year} onChange={(value) => updateField("admission_year", value)} />
              <InputField label="FE Sem I SGPA" type="number" value={form.fe_sem1_sgpa} onChange={(value) => updateField("fe_sem1_sgpa", value)} />
              <InputField label="FE Sem II SGPA" type="number" value={form.fe_sem2_sgpa} onChange={(value) => updateField("fe_sem2_sgpa", value)} />
              <InputField label="SE Sem III SGPA" type="number" value={form.se_sem3_sgpa} onChange={(value) => updateField("se_sem3_sgpa", value)} />
              <InputField label="SE Sem IV SGPA" type="number" value={form.se_sem4_sgpa} onChange={(value) => updateField("se_sem4_sgpa", value)} />
              <InputField label="TE Sem V SGPA" type="number" value={form.te_sem5_sgpa} onChange={(value) => updateField("te_sem5_sgpa", value)} />
              <InputField label="TE Sem VI SGPA" type="number" value={form.te_sem6_sgpa} onChange={(value) => updateField("te_sem6_sgpa", value)} />
              <InputField label="BE Sem VII SGPA" type="number" value={form.be_sem7_sgpa} onChange={(value) => updateField("be_sem7_sgpa", value)} />
              <InputField label="BE Sem VIII SGPA" type="number" value={form.be_sem8_sgpa} onChange={(value) => updateField("be_sem8_sgpa", value)} />
              <InputField label="Aggregate CGPA" type="number" value={form.aggregate_cgpa} onChange={(value) => updateField("aggregate_cgpa", value)} />
              <InputField label="Dead ATKTs" type="number" value={form.dead_atkt_count} onChange={(value) => updateField("dead_atkt_count", value)} />
              <InputField label="Live ATKTs" type="number" value={form.live_atkt_count} onChange={(value) => updateField("live_atkt_count", value)} />
              <InputField label="Year Drop" type="number" value={form.year_drop} onChange={(value) => updateField("year_drop", value)} />
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <div>
                <Label>Achievements</Label>
                <Textarea value={form.achievements} onChange={(event) => updateField("achievements", event.target.value)} />
              </div>
              <div>
                <Label>Technical Certifications</Label>
                <Textarea value={form.technical_certifications} onChange={(event) => updateField("technical_certifications", event.target.value)} />
              </div>
              <div>
                <Label>Internships</Label>
                <Textarea value={form.internships} onChange={(event) => updateField("internships", event.target.value)} />
              </div>
              <InputField label="BE Project Title" value={form.be_project_title} onChange={(value) => updateField("be_project_title", value)} />
              <div>
                <Label>Trainings Required</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  {trainings.map((training) => (
                    <label key={training} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3">
                      <Checkbox
                        checked={form.trainings_required.split(",").includes(training)}
                        onChange={(event) => {
                          const selected = form.trainings_required ? form.trainings_required.split(",").filter(Boolean) : [];
                          const next = event.target.checked
                            ? [...new Set([...selected, training])]
                            : selected.filter((item) => item !== training);
                          updateField("trainings_required", next.join(","));
                        }}
                      />
                      {training}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Career Choice</Label>
                <Select value={form.career_choice} onChange={(event) => updateField("career_choice", event.target.value)}>
                  <option value="">Select</option>
                  <option value="Job">Job</option>
                  <option value="Higher Studies">Higher Studies</option>
                  <option value="Startup">Startup</option>
                  <option value="Not Decided">Not Decided</option>
                </Select>
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="Industry Contact Name" value={form.industry_contact_name} onChange={(value) => updateField("industry_contact_name", value)} />
              <InputField label="Organization" value={form.industry_contact_org} onChange={(value) => updateField("industry_contact_org", value)} />
              <InputField label="Position" value={form.industry_contact_position} onChange={(value) => updateField("industry_contact_position", value)} />
              <InputField label="Phone" value={form.industry_contact_phone} onChange={(value) => updateField("industry_contact_phone", value)} />
              <div>
                <Label>Resume Upload</Label>
                <Input type="file" onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)} />
                {form.resume_url ? <div className="mt-2 text-xs text-slate-500">{form.resume_url}</div> : null}
              </div>
              <div>
                <Label>Profile Photo Upload</Label>
                <Input type="file" onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)} />
                {form.profile_photo_url ? <div className="mt-2 text-xs text-slate-500">{form.profile_photo_url}</div> : null}
              </div>
              <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
                <Checkbox checked={form.consent_declaration} onChange={(event) => updateField("consent_declaration", event.target.checked)} />
                I confirm that the provided information is accurate and can be used for placement activities.
              </label>
            </div>
          ) : null}

          <div className="flex justify-between">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep((current) => Math.max(current - 1, 0))}>
              Previous
            </Button>
            {step === steps.length - 1 ? (
              <Button onClick={onSubmit} disabled={submitting}>
                {submitting ? "Saving..." : isStudentSelfService ? "Save Profile" : "Submit"}
              </Button>
            ) : (
              <Button onClick={onNext}>Next</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", disabled = false }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
    </div>
  );
}
