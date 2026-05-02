import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { DocumentLink } from "../../components/documents/DocumentLink";
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
  "School & Diploma Academics",
  "Engineering Academics",
  "Extra-Curricular & Career",
  "Verification Documents"
];

const trainings = ["Aptitude", "Technical", "HR", "Soft Skills", "Company Specified"];
const documentAccept = ".pdf,application/pdf,image/png,image/jpeg,image/jpg";

const documentUploadConfig = {
  ssc_marksheet_url: {
    label: "10th Marksheet File",
    accept: documentAccept,
    folder: "kbtcoe-placement-tracker/student-verification-documents",
    kind: "document"
  },
  hsc_marksheet_url: {
    label: "12th Marksheet File",
    accept: documentAccept,
    folder: "kbtcoe-placement-tracker/student-verification-documents",
    kind: "document"
  },
  diploma_marksheet_url: {
    label: "Diploma Marksheet File",
    accept: documentAccept,
    folder: "kbtcoe-placement-tracker/student-verification-documents",
    kind: "document"
  },
  engineering_marksheets_url: {
    label: "Engineering Marksheet File",
    accept: documentAccept,
    folder: "kbtcoe-placement-tracker/student-verification-documents",
    kind: "document"
  },
  aadhar_card_url: {
    label: "Aadhaar Card File",
    accept: documentAccept,
    folder: "kbtcoe-placement-tracker/student-verification-documents",
    kind: "document"
  },
  resume_url: {
    label: "Resume File",
    accept: documentAccept,
    folder: "kbtcoe-placement-tracker/student-resumes",
    kind: "document"
  },
  profile_photo_url: {
    label: "Profile Photo",
    accept: "image/png,image/jpeg,image/jpg",
    folder: "kbtcoe-placement-tracker/student-profile-photos",
    resourceType: "image",
    kind: "image"
  }
};

const initialSelectedFiles = Object.keys(documentUploadConfig).reduce((accumulator, key) => {
  accumulator[key] = null;
  return accumulator;
}, {});

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
  entry_mode: "",
  ssc_percentage: "",
  ssc_year: "",
  hsc_percentage: "",
  hsc_board: "",
  hsc_year: "",
  cet_jee_score: "",
  ssc_marksheet_url: "",
  hsc_marksheet_url: "",
  diploma_percentage: "",
  diploma_branch: "",
  diploma_board: "",
  diploma_year: "",
  diploma_marksheet_url: "",
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
  dead_atkt_count: "",
  live_atkt_count: "",
  year_drop: "",
  engineering_marksheets_url: "",
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
  aadhar_card_url: "",
  resume_url: "",
  profile_photo_url: "",
  consent_declaration: false
};

const conditionalFieldKeys = [
  "hsc_percentage",
  "hsc_board",
  "hsc_year",
  "hsc_marksheet_url",
  "cet_jee_score",
  "diploma_percentage",
  "diploma_branch",
  "diploma_board",
  "diploma_year",
  "diploma_marksheet_url",
  "fe_sem1_sgpa",
  "fe_sem2_sgpa"
];

const hasMeaningfulValue = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return true;
};

const hydrateForm = (payload) => {
  const nextForm = { ...initialForm };

  Object.keys(initialForm).forEach((key) => {
    if (payload?.[key] !== null && payload?.[key] !== undefined) {
      nextForm[key] = payload[key];
    }
  });

  nextForm.dob = payload?.dob ? payload.dob.slice(0, 10) : "";
  nextForm.consent_declaration = Boolean(payload?.consent_declaration);
  nextForm.trainings_required = payload?.trainings_required ?? "";
  nextForm.entry_mode =
    payload?.entry_mode ??
    (payload?.diploma_percentage || payload?.diploma_year || payload?.diploma_marksheet_url
      ? "DIPLOMA"
      : payload?.hsc_percentage || payload?.hsc_year || payload?.hsc_marksheet_url || payload?.cet_jee_score
        ? "HSC"
        : "");

  return nextForm;
};

const getStepRequirements = (stepIndex, form) => {
  const isDiplomaStudent = form.entry_mode === "DIPLOMA";
  const isHscStudent = form.entry_mode === "HSC";

  const stepRequirements = [
    [
      { key: "name", label: "Name" },
      { key: "prn", label: "PRN" },
      { key: "college_id", label: "College ID" },
      { key: "department", label: "Department" },
      { key: "gender", label: "Gender" },
      { key: "dob", label: "Date of Birth" },
      { key: "category", label: "Category" },
      { key: "aadhar_no", label: "Aadhaar Number" },
      { key: "native_place", label: "Native Place" },
      { key: "district", label: "District" },
      { key: "permanent_address", label: "Permanent Address" }
    ],
    [
      { key: "personal_email", label: "Personal Email" },
      { key: "college_email", label: "College Email" },
      { key: "personal_contact", label: "Personal Contact" },
      { key: "alternate_contact", label: "Alternate Contact" },
      { key: "father_occupation", label: "Father Occupation" },
      { key: "mother_occupation", label: "Mother Occupation" }
    ],
    [
      { key: "entry_mode", label: "Admission Type" },
      { key: "ssc_percentage", label: "10th Percentage" },
      { key: "ssc_year", label: "10th Passing Year" },
      ...(isHscStudent
        ? [
            { key: "hsc_percentage", label: "12th Percentage" },
            { key: "hsc_board", label: "12th Board" },
            { key: "hsc_year", label: "12th Passing Year" },
            { key: "cet_jee_score", label: "CET/JEE Score" }
          ]
        : []),
      ...(isDiplomaStudent
        ? [
            { key: "diploma_percentage", label: "Diploma Percentage" },
            { key: "diploma_branch", label: "Diploma Branch" },
            { key: "diploma_board", label: "Diploma Board" },
            { key: "diploma_year", label: "Diploma Passing Year" }
          ]
        : [])
    ],
    [
      { key: "admission_year", label: "Admission Year" },
      ...(!isDiplomaStudent
        ? [
            { key: "fe_sem1_sgpa", label: "FE Semester I SGPA" },
            { key: "fe_sem2_sgpa", label: "FE Semester II SGPA" }
          ]
        : []),
      { key: "se_sem3_sgpa", label: "SE Semester III SGPA" },
      { key: "se_sem4_sgpa", label: "SE Semester IV SGPA" },
      { key: "te_sem5_sgpa", label: "TE Semester V SGPA" },
      { key: "te_sem6_sgpa", label: "TE Semester VI SGPA" },
      { key: "aggregate_cgpa", label: "Aggregate CGPA" },
      { key: "dead_atkt_count", label: "Dead ATKT Count" },
      { key: "live_atkt_count", label: "Live ATKT Count" },
      { key: "year_drop", label: "Year Drop" }
    ],
    [
      { key: "career_choice", label: "Career Choice" },
      { key: "be_project_title", label: "BE Project Title" }
    ],
    [
      { key: "ssc_marksheet_url", label: "10th Marksheet File", kind: "file" },
      ...(isHscStudent
        ? [{ key: "hsc_marksheet_url", label: "12th Marksheet File", kind: "file" }]
        : []),
      ...(isDiplomaStudent
        ? [{ key: "diploma_marksheet_url", label: "Diploma Marksheet File", kind: "file" }]
        : []),
      { key: "engineering_marksheets_url", label: "Engineering Marksheet File", kind: "file" },
      { key: "resume_url", label: "Resume File", kind: "file" },
      { key: "aadhar_card_url", label: "Aadhaar Card File", kind: "file" },
      { key: "consent_declaration", label: "Consent Declaration" }
    ]
  ];

  return stepRequirements[stepIndex] ?? [];
};

const isPdfFile = (file) =>
  file.type === "application/pdf" || /\.pdf$/i.test(file.name ?? "");

const isImageFile = (file) =>
  ["image/png", "image/jpeg", "image/jpg"].includes(file.type) ||
  /\.(png|jpe?g)$/i.test(file.name ?? "");

const isDocumentFile = (file) => isPdfFile(file) || isImageFile(file);

const getUploadResourceType = (fieldKey, file) => {
  const config = documentUploadConfig[fieldKey];
  if (!config || !file) {
    return "auto";
  }

  if (config.kind === "image") {
    return "image";
  }

  if (config.kind === "document" && isImageFile(file)) {
    return "image";
  }

  if (config.kind === "document" && isPdfFile(file)) {
    return "raw";
  }

  return "auto";
};

function getFileValidationError(fieldKey, file) {
  if (!file) {
    return null;
  }

  const config = documentUploadConfig[fieldKey];
  if (!config) {
    return null;
  }

  if (config.kind === "document" && !isDocumentFile(file)) {
    return `${config.label} must be uploaded as a PDF, JPG, JPEG, or PNG file`;
  }

  if (config.kind === "image" && !isImageFile(file)) {
    return `${config.label} must be uploaded as a JPG or PNG image`;
  }

  if (file.size > 10 * 1024 * 1024) {
    return `${config.label} must be 10 MB or smaller`;
  }

  return null;
}

export function StudentFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isStudentSelfService = user?.role === roles.STUDENT;
  const effectiveStudentId = isStudentSelfService ? user.studentId : id;
  const isEdit = Boolean(effectiveStudentId);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [selectedFiles, setSelectedFiles] = useState(initialSelectedFiles);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;

    api
      .get(`/students/${effectiveStudentId}`)
      .then((response) => {
        setForm(hydrateForm(response.data));
        setSelectedFiles(initialSelectedFiles);
        setErrors({});
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
  const isDiplomaStudent = form.entry_mode === "DIPLOMA";

  const clearFieldErrors = (keys) => {
    const fieldKeys = Array.isArray(keys) ? keys : [keys];
    setErrors((current) => {
      const nextErrors = { ...current };
      fieldKeys.forEach((key) => delete nextErrors[key]);
      return nextErrors;
    });
  };

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
    clearFieldErrors(key === "entry_mode" ? ["entry_mode", ...conditionalFieldKeys] : key);
  };

  const updateTraining = (training, checked) => {
    const selected = form.trainings_required ? form.trainings_required.split(",").filter(Boolean) : [];
    const nextValues = checked
      ? [...new Set([...selected, training])]
      : selected.filter((item) => item !== training);
    updateField("trainings_required", nextValues.join(","));
  };

  const handleFileSelection = (fieldKey, file) => {
    if (!file) {
      setSelectedFiles((current) => ({
        ...current,
        [fieldKey]: null
      }));
      clearFieldErrors(fieldKey);
      return true;
    }

    const validationError = getFileValidationError(fieldKey, file);
    if (validationError) {
      toast.error(validationError);
      return false;
    }

    setSelectedFiles((current) => ({
      ...current,
      [fieldKey]: file
    }));
    clearFieldErrors(fieldKey);
    return true;
  };

  const validateStep = (stepIndex) => {
    const requirements = getStepRequirements(stepIndex, form);
    const nextErrors = {};

    requirements.forEach(({ key, label, kind }) => {
      const value = kind === "file" ? selectedFiles[key] || form[key] : form[key];
      if (!hasMeaningfulValue(value)) {
        nextErrors[key] = `${label} is required`;
      }
    });

    return {
      isValid: Object.keys(nextErrors).length === 0,
      nextErrors
    };
  };

  const validateCurrentStep = () => {
    const { isValid, nextErrors } = validateStep(step);
    setErrors(nextErrors);

    if (!isValid) {
      toast.error("Please complete all required details in this step");
    }

    return isValid;
  };

  const validateAllSteps = () => {
    for (let index = 0; index < steps.length; index += 1) {
      const result = validateStep(index);
      if (!result.isValid) {
        setStep(index);
        setErrors(result.nextErrors);
        toast.error(`Please complete the required details in "${steps[index]}"`);
        return false;
      }
    }

    return true;
  };

  const onNext = () => {
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const uploadSelectedFiles = async () => {
    const payload = {};

    for (const [fieldKey, file] of Object.entries(selectedFiles)) {
      if (!file) {
        continue;
      }

      const config = documentUploadConfig[fieldKey];
      payload[fieldKey] = await uploadFile(file, {
        folder: config.folder,
        resourceType: getUploadResourceType(fieldKey, file)
      });
    }

    return payload;
  };

  const onSubmit = async () => {
    if (!validateAllSteps()) return;

    setSubmitting(true);

    try {
      const uploadedFiles = await uploadSelectedFiles();
      const payload = {
        ...form,
        ...uploadedFiles
      };

      if (isEdit) {
        await api.put(`/students/${effectiveStudentId}`, payload);
        toast.success(isStudentSelfService ? "Profile updated successfully" : "Student updated successfully");
      } else {
        await api.post("/students", payload);
        toast.success("Student created successfully");
      }

      navigate(isStudentSelfService ? "/profile" : "/students");
    } catch (error) {
      toast.error(error.response?.data?.message ?? error.message ?? "Unable to save student");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {isStudentSelfService ? "Complete Your Placement Profile" : isEdit ? "Edit Student" : "Add Student"}
        </h1>
        <p className="text-sm text-slate-500">
          {isStudentSelfService
            ? "Each step must be completed before you move ahead. Verification files can be uploaded as PDF or image for the placement review process."
            : "Use the guided flow to complete the student profile with all required verification documents."}
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
              <TextInputField
                label="Name"
                value={form.name}
                onChange={(value) => updateField("name", value)}
                required
                error={errors.name}
                className="md:col-span-2"
              />
              <TextInputField label="PRN" value={form.prn} onChange={(value) => updateField("prn", value)} required error={errors.prn} />
              <TextInputField
                label="College ID"
                value={form.college_id}
                onChange={(value) => updateField("college_id", value)}
                required
                error={errors.college_id}
              />
              <SelectField
                label="Department"
                value={form.department}
                onChange={(value) => updateField("department", value)}
                options={departments}
                required
                error={errors.department}
              />
              <SelectField
                label="Gender"
                value={form.gender}
                onChange={(value) => updateField("gender", value)}
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" }
                ]}
                required
                error={errors.gender}
              />
              <TextInputField
                label="Date of Birth"
                type="date"
                value={form.dob}
                onChange={(value) => updateField("dob", value)}
                required
                error={errors.dob}
              />
              <SelectField
                label="Category"
                value={form.category}
                onChange={(value) => updateField("category", value)}
                options={categories}
                required
                error={errors.category}
              />
              <TextInputField
                label="Aadhaar Number"
                value={form.aadhar_no}
                onChange={(value) => updateField("aadhar_no", value)}
                required
                error={errors.aadhar_no}
              />
              <TextInputField label="PAN Number" value={form.pan_no} onChange={(value) => updateField("pan_no", value)} />
              <TextInputField
                label="Native Place"
                value={form.native_place}
                onChange={(value) => updateField("native_place", value)}
                required
                error={errors.native_place}
              />
              <TextInputField
                label="District"
                value={form.district}
                onChange={(value) => updateField("district", value)}
                required
                error={errors.district}
              />
              <TextareaField
                label="Permanent Address"
                value={form.permanent_address}
                onChange={(value) => updateField("permanent_address", value)}
                required
                error={errors.permanent_address}
                className="md:col-span-2"
              />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <TextInputField
                label="Personal Email"
                value={form.personal_email}
                onChange={(value) => updateField("personal_email", value)}
                required
                error={errors.personal_email}
              />
              <TextInputField
                label="College Email"
                value={form.college_email}
                onChange={(value) => updateField("college_email", value)}
                disabled={isStudentSelfService}
                required
                error={errors.college_email}
              />
              <TextInputField
                label="Personal Contact"
                value={form.personal_contact}
                onChange={(value) => updateField("personal_contact", value)}
                required
                error={errors.personal_contact}
              />
              <TextInputField
                label="Alternate Contact"
                value={form.alternate_contact}
                onChange={(value) => updateField("alternate_contact", value)}
                required
                error={errors.alternate_contact}
              />
              <TextInputField
                label="Father Occupation"
                value={form.father_occupation}
                onChange={(value) => updateField("father_occupation", value)}
                required
                error={errors.father_occupation}
              />
              <TextInputField
                label="Mother Occupation"
                value={form.mother_occupation}
                onChange={(value) => updateField("mother_occupation", value)}
                required
                error={errors.mother_occupation}
              />
              <TextareaField
                label="Sibling Info"
                value={form.sibling_info}
                onChange={(value) => updateField("sibling_info", value)}
                className="md:col-span-2"
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Fill your 10th details first, then choose only one academic path: <strong>12th</strong> or
                <strong> Diploma / Direct Second Year</strong>.
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Admission Type"
                  value={form.entry_mode}
                  onChange={(value) => updateField("entry_mode", value)}
                  options={[
                    { value: "HSC", label: "HSC" },
                    { value: "DIPLOMA", label: "Diploma / Direct Second Year" }
                  ]}
                  required
                  error={errors.entry_mode}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <TextInputField
                  label="10th Percentage"
                  type="number"
                  value={form.ssc_percentage}
                  onChange={(value) => updateField("ssc_percentage", value)}
                  required
                  error={errors.ssc_percentage}
                />
                <TextInputField
                  label="10th Passing Year"
                  type="number"
                  value={form.ssc_year}
                  onChange={(value) => updateField("ssc_year", value)}
                  required
                  error={errors.ssc_year}
                />
              </div>

              {form.entry_mode === "HSC" ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="mb-3 text-sm font-medium text-emerald-900">12th details are required.</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInputField
                      label="12th Percentage"
                      type="number"
                      value={form.hsc_percentage}
                      onChange={(value) => updateField("hsc_percentage", value)}
                      required
                      error={errors.hsc_percentage}
                    />
                    <SelectField
                      label="12th Board"
                      value={form.hsc_board}
                      onChange={(value) => updateField("hsc_board", value)}
                      options={[
                        { value: "HSC", label: "HSC" },
                        { value: "CBSE", label: "CBSE" },
                        { value: "ICSE", label: "ICSE" }
                      ]}
                      required
                      error={errors.hsc_board}
                    />
                    <TextInputField
                      label="12th Passing Year"
                      type="number"
                      value={form.hsc_year}
                      onChange={(value) => updateField("hsc_year", value)}
                      required
                      error={errors.hsc_year}
                    />
                    <TextInputField
                      label="CET/JEE Score"
                      value={form.cet_jee_score}
                      onChange={(value) => updateField("cet_jee_score", value)}
                      required
                      error={errors.cet_jee_score}
                    />
                  </div>
                </div>
              ) : null}

              {isDiplomaStudent ? (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="mb-3 text-sm font-medium text-blue-900">Diploma student details are required.</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInputField
                      label="Diploma Percentage"
                      type="number"
                      value={form.diploma_percentage}
                      onChange={(value) => updateField("diploma_percentage", value)}
                      required
                      error={errors.diploma_percentage}
                    />
                    <TextInputField
                      label="Diploma Branch"
                      value={form.diploma_branch}
                      onChange={(value) => updateField("diploma_branch", value)}
                      required
                      error={errors.diploma_branch}
                    />
                    <TextInputField
                      label="Diploma Board"
                      value={form.diploma_board}
                      onChange={(value) => updateField("diploma_board", value)}
                      required
                      error={errors.diploma_board}
                    />
                    <TextInputField
                      label="Diploma Passing Year"
                      type="number"
                      value={form.diploma_year}
                      onChange={(value) => updateField("diploma_year", value)}
                      required
                      error={errors.diploma_year}
                    />
                    <FileUploadField
                      fieldKey="diploma_marksheet_url"
                      selectedFile={selectedFiles.diploma_marksheet_url}
                      currentUrl={form.diploma_marksheet_url}
                      onChange={handleFileSelection}
                      required
                      error={errors.diploma_marksheet_url}
                      hint="Upload the complete diploma marksheet as PDF or image."
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              {isDiplomaStudent ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Direct second year entry selected. FE semester SGPA fields are not required.
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <TextInputField
                  label="Admission Year"
                  type="number"
                  value={form.admission_year}
                  onChange={(value) => updateField("admission_year", value)}
                  required
                  error={errors.admission_year}
                />
                {!isDiplomaStudent ? (
                  <>
                    <TextInputField
                      label="FE Semester I SGPA"
                      type="number"
                      value={form.fe_sem1_sgpa}
                      onChange={(value) => updateField("fe_sem1_sgpa", value)}
                      required
                      error={errors.fe_sem1_sgpa}
                    />
                    <TextInputField
                      label="FE Semester II SGPA"
                      type="number"
                      value={form.fe_sem2_sgpa}
                      onChange={(value) => updateField("fe_sem2_sgpa", value)}
                      required
                      error={errors.fe_sem2_sgpa}
                    />
                  </>
                ) : null}
                <TextInputField
                  label="SE Semester III SGPA"
                  type="number"
                  value={form.se_sem3_sgpa}
                  onChange={(value) => updateField("se_sem3_sgpa", value)}
                  required
                  error={errors.se_sem3_sgpa}
                />
                <TextInputField
                  label="SE Semester IV SGPA"
                  type="number"
                  value={form.se_sem4_sgpa}
                  onChange={(value) => updateField("se_sem4_sgpa", value)}
                  required
                  error={errors.se_sem4_sgpa}
                />
                <TextInputField
                  label="TE Semester V SGPA"
                  type="number"
                  value={form.te_sem5_sgpa}
                  onChange={(value) => updateField("te_sem5_sgpa", value)}
                  required
                  error={errors.te_sem5_sgpa}
                />
                <TextInputField
                  label="TE Semester VI SGPA"
                  type="number"
                  value={form.te_sem6_sgpa}
                  onChange={(value) => updateField("te_sem6_sgpa", value)}
                  required
                  error={errors.te_sem6_sgpa}
                />
                <TextInputField
                  label="BE Semester VII SGPA"
                  type="number"
                  value={form.be_sem7_sgpa}
                  onChange={(value) => updateField("be_sem7_sgpa", value)}
                />
                <TextInputField
                  label="BE Semester VIII SGPA"
                  type="number"
                  value={form.be_sem8_sgpa}
                  onChange={(value) => updateField("be_sem8_sgpa", value)}
                />
                <TextInputField
                  label="Aggregate CGPA"
                  type="number"
                  value={form.aggregate_cgpa}
                  onChange={(value) => updateField("aggregate_cgpa", value)}
                  required
                  error={errors.aggregate_cgpa}
                />
                <TextInputField
                  label="Dead ATKTs"
                  type="number"
                  value={form.dead_atkt_count}
                  onChange={(value) => updateField("dead_atkt_count", value)}
                  required
                  error={errors.dead_atkt_count}
                />
                <TextInputField
                  label="Live ATKTs"
                  type="number"
                  value={form.live_atkt_count}
                  onChange={(value) => updateField("live_atkt_count", value)}
                  required
                  error={errors.live_atkt_count}
                />
                <TextInputField
                  label="Year Drop"
                  type="number"
                  value={form.year_drop}
                  onChange={(value) => updateField("year_drop", value)}
                  required
                  error={errors.year_drop}
                />
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <TextareaField
                label="Achievements"
                value={form.achievements}
                onChange={(value) => updateField("achievements", value)}
              />
              <TextareaField
                label="Technical Certifications"
                value={form.technical_certifications}
                onChange={(value) => updateField("technical_certifications", value)}
              />
              <TextareaField
                label="Internships"
                value={form.internships}
                onChange={(value) => updateField("internships", value)}
              />
              <TextInputField
                label="BE Project Title"
                value={form.be_project_title}
                onChange={(value) => updateField("be_project_title", value)}
                required
                error={errors.be_project_title}
              />
              <FieldShell label="Trainings Required">
                <div className="grid gap-2 md:grid-cols-2">
                  {trainings.map((training) => (
                    <label key={training} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3">
                      <Checkbox
                        checked={form.trainings_required.split(",").includes(training)}
                        onChange={(event) => updateTraining(training, event.target.checked)}
                      />
                      {training}
                    </label>
                  ))}
                </div>
              </FieldShell>
              <SelectField
                label="Career Choice"
                value={form.career_choice}
                onChange={(value) => updateField("career_choice", value)}
                options={[
                  { value: "Job", label: "Job" },
                  { value: "Higher Studies", label: "Higher Studies" },
                  { value: "Startup", label: "Startup" },
                  { value: "Not Decided", label: "Not Decided" }
                ]}
                required
                error={errors.career_choice}
              />
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Upload the verification files here as PDF or image. Industry contact details are optional and should be filled only if
                someone is referring you for placement.
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <TextInputField
                  label="Industry Contact Name"
                  value={form.industry_contact_name}
                  onChange={(value) => updateField("industry_contact_name", value)}
                  hint="Optional. Fill this only if you have a referral contact."
                />
                <TextInputField
                  label="Organization"
                  value={form.industry_contact_org}
                  onChange={(value) => updateField("industry_contact_org", value)}
                  hint="Optional referral organization."
                />
                <TextInputField
                  label="Position"
                  value={form.industry_contact_position}
                  onChange={(value) => updateField("industry_contact_position", value)}
                  hint="Optional referral contact designation."
                />
                <TextInputField
                  label="Phone"
                  value={form.industry_contact_phone}
                  onChange={(value) => updateField("industry_contact_phone", value)}
                  hint="Optional referral contact number."
                />
                <FileUploadField
                  fieldKey="ssc_marksheet_url"
                  selectedFile={selectedFiles.ssc_marksheet_url}
                  currentUrl={form.ssc_marksheet_url}
                  onChange={handleFileSelection}
                  required
                  error={errors.ssc_marksheet_url}
                  hint="Upload the complete 10th marksheet as PDF or image."
                />
                {form.entry_mode === "HSC" ? (
                  <FileUploadField
                    fieldKey="hsc_marksheet_url"
                    selectedFile={selectedFiles.hsc_marksheet_url}
                    currentUrl={form.hsc_marksheet_url}
                    onChange={handleFileSelection}
                    required
                    error={errors.hsc_marksheet_url}
                    hint="Upload the complete 12th marksheet as PDF or image."
                  />
                ) : null}
                {isDiplomaStudent ? (
                  <FileUploadField
                    fieldKey="diploma_marksheet_url"
                    selectedFile={selectedFiles.diploma_marksheet_url}
                    currentUrl={form.diploma_marksheet_url}
                    onChange={handleFileSelection}
                    required
                    error={errors.diploma_marksheet_url}
                    hint="Upload the complete diploma marksheet as PDF or image."
                  />
                ) : null}
                <FileUploadField
                  fieldKey="engineering_marksheets_url"
                  selectedFile={selectedFiles.engineering_marksheets_url}
                  currentUrl={form.engineering_marksheets_url}
                  onChange={handleFileSelection}
                  required
                  error={errors.engineering_marksheets_url}
                  hint="Combine all available engineering marksheets from your first available engineering year up to the current semester into one PDF or image file."
                />
                <FileUploadField
                  fieldKey="resume_url"
                  selectedFile={selectedFiles.resume_url}
                  currentUrl={form.resume_url}
                  onChange={handleFileSelection}
                  required
                  error={errors.resume_url}
                  hint="Upload your latest resume as PDF or image."
                />
                <FileUploadField
                  fieldKey="aadhar_card_url"
                  selectedFile={selectedFiles.aadhar_card_url}
                  currentUrl={form.aadhar_card_url}
                  onChange={handleFileSelection}
                  required
                  error={errors.aadhar_card_url}
                  hint="Upload the Aadhaar card file used for verification."
                />
                <FileUploadField
                  fieldKey="profile_photo_url"
                  selectedFile={selectedFiles.profile_photo_url}
                  currentUrl={form.profile_photo_url}
                  onChange={handleFileSelection}
                  hint="Optional profile photo for the portal."
                />
              </div>

              <div>
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                  <Checkbox
                    checked={form.consent_declaration}
                    onChange={(event) => updateField("consent_declaration", event.target.checked)}
                  />
                  <div>
                    <div className="text-sm text-slate-700">
                      I confirm that the provided information and uploaded documents are accurate and can be used for
                      placement verification activities. <span className="text-red-500">*</span>
                    </div>
                    {errors.consent_declaration ? (
                      <div className="mt-2 text-xs font-medium text-red-600">{errors.consent_declaration}</div>
                    ) : null}
                  </div>
                </label>
              </div>
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

function FieldShell({ label, required = false, error, hint, className = "", children }) {
  return (
    <div className={className}>
      {label ? (
        <Label>
          {label} {required ? <span className="text-red-500">*</span> : null}
        </Label>
      ) : null}
      {children}
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
      {error ? <div className="mt-2 text-xs font-medium text-red-600">{error}</div> : null}
    </div>
  );
}

function TextInputField({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  required = false,
  error,
  hint,
  className
}) {
  return (
    <FieldShell label={label} required={required} error={error} hint={hint} className={className}>
      <Input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={error ? "border-red-500 focus:border-red-500" : ""}
      />
    </FieldShell>
  );
}

function TextareaField({ label, value, onChange, required = false, error, hint, className }) {
  return (
    <FieldShell label={label} required={required} error={error} hint={hint} className={className}>
      <Textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={error ? "border-red-500 focus:border-red-500" : ""}
      />
    </FieldShell>
  );
}

function SelectField({ label, value, onChange, options, required = false, error, hint, className }) {
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );

  return (
    <FieldShell label={label} required={required} error={error} hint={hint} className={className}>
      <Select value={value ?? ""} onChange={(event) => onChange(event.target.value)} className={error ? "border-red-500 focus:border-red-500" : ""}>
        <option value="">Select</option>
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </FieldShell>
  );
}

function FileUploadField({ fieldKey, selectedFile, currentUrl, onChange, required = false, error, hint }) {
  const config = documentUploadConfig[fieldKey];
  const uploadedLabel = config.kind === "image" ? "View uploaded image" : "View uploaded document";

  return (
    <FieldShell label={config.label} required={required} error={error} hint={hint}>
      <Input
        type="file"
        accept={config.accept}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          const accepted = onChange(fieldKey, file);
          if (!accepted) {
            event.target.value = "";
          }
        }}
        className={error ? "border-red-500 focus:border-red-500" : ""}
      />
      {selectedFile ? <div className="mt-2 text-xs text-slate-500">Selected: {selectedFile.name}</div> : null}
      {!selectedFile && currentUrl ? (
        <DocumentLink url={currentUrl} label={uploadedLabel} fileName={config.label} className="mt-2 inline-flex text-xs" />
      ) : null}
    </FieldShell>
  );
}
