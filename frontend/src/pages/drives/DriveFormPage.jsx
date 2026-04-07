import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { api } from "../../services/api";
import { driveStatuses, driveTypes } from "../../utils/constants";

const initialForm = {
  company_id: "",
  title: "",
  drive_date: "",
  registration_deadline: "",
  job_profile: "",
  job_location: "",
  package_lpa: "",
  bond_years: "0",
  drive_type: "ON_CAMPUS",
  status: "UPCOMING",
  description: ""
};

export function DriveFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/companies").then((response) => setCompanies(response.data));
    if (isEdit) {
      api
        .get(`/drives/${id}`)
        .then((response) =>
          setForm({
            ...initialForm,
            ...response.data,
            drive_date: response.data.drive_date?.slice(0, 10),
            registration_deadline: response.data.registration_deadline?.slice(0, 16)
          })
        )
        .catch((error) => toast.error(error.response?.data?.message ?? "Unable to load drive"));
    }
  }, [id, isEdit]);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        registration_deadline: new Date(form.registration_deadline).toISOString(),
        drive_date: new Date(form.drive_date).toISOString()
      };
      const response = isEdit ? await api.put(`/drives/${id}`, payload) : await api.post("/drives", payload);
      toast.success(`Drive ${isEdit ? "updated" : "created"} successfully`);
      navigate(`/drives/${response.data.id}`);
      } catch (error) {
        toast.error(error.response?.data?.message ?? "Unable to save opportunity");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{isEdit ? "Edit Opportunity" : "Create Opportunity"}</h1>
        <p className="text-sm text-slate-500">Create a placement drive or internship opportunity, then set its eligibility criteria.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Opportunity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <div>
              <Label>Company</Label>
              <Select value={form.company_id} onChange={(event) => updateField("company_id", event.target.value)} required>
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            </div>
            <Field label="Opportunity Title" value={form.title} onChange={(value) => updateField("title", value)} />
            <Field label="Job Profile" value={form.job_profile} onChange={(value) => updateField("job_profile", value)} />
            <Field label="Job Location" value={form.job_location} onChange={(value) => updateField("job_location", value)} />
            <Field label="Package LPA" type="number" value={form.package_lpa} onChange={(value) => updateField("package_lpa", value)} />
            <Field label="Bond Years" type="number" value={form.bond_years} onChange={(value) => updateField("bond_years", value)} />
            <Field label="Drive Date" type="date" value={form.drive_date} onChange={(value) => updateField("drive_date", value)} />
            <Field label="Registration Deadline" type="datetime-local" value={form.registration_deadline} onChange={(value) => updateField("registration_deadline", value)} />
            <div>
              <Label>Drive Type</Label>
              <Select value={form.drive_type} onChange={(event) => updateField("drive_type", event.target.value)}>
                {driveTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                {driveStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button disabled={saving} type="submit">
                {saving ? "Saving..." : "Save Opportunity"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={type !== "number" || label !== "Bond Years"} />
    </div>
  );
}
