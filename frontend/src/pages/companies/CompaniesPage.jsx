import { Building2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import { uploadFile } from "../../services/uploads";
import { roles } from "../../utils/constants";
import { formatDate } from "../../utils/format";

const initialForm = {
  name: "",
  industry: "IT",
  hr_name: "",
  hr_email: "",
  hr_phone: "",
  website: "",
  description: "",
  logo_url: ""
};

function CompanySheet({ open, company, onClose, onSaved }) {
  const [form, setForm] = useState(initialForm);
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(company ? { ...initialForm, ...company } : initialForm);
    setLogoFile(null);
  }, [company]);

  if (!open) return null;

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Company name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form };
      if (logoFile) {
        try {
          payload.logo_url = await uploadFile(logoFile);
        } catch (uploadError) {
          toast.error(
            uploadError.response?.data?.message ??
              uploadError.message ??
              "Logo upload failed. Saving company without logo."
          );
          payload.logo_url = form.logo_url || "";
        }
      }

      if (company?.id) {
        await api.put(`/companies/${company.id}`, payload);
      } else {
        await api.post("/companies", payload);
      }
      toast.success(`Company ${company?.id ? "updated" : "created"} successfully`);
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to save company");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">{company?.id ? "Edit Company" : "Add Company"}</h2>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="space-y-4">
          <Field label="Company Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
          <div>
            <Label>Industry</Label>
            <Select value={form.industry} onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))}>
              {["IT", "Core", "Finance", "Manufacturing", "Consulting", "Other"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </Select>
          </div>
          <Field label="HR Name" value={form.hr_name} onChange={(value) => setForm((current) => ({ ...current, hr_name: value }))} />
          <Field label="HR Email" value={form.hr_email} onChange={(value) => setForm((current) => ({ ...current, hr_email: value }))} />
          <Field label="HR Phone" value={form.hr_phone} onChange={(value) => setForm((current) => ({ ...current, hr_phone: value }))} />
          <Field label="Website" value={form.website} onChange={(value) => setForm((current) => ({ ...current, website: value }))} />
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <div>
            <Label>Logo Upload</Label>
            <Input type="file" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} />
          </div>
          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Company"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CompaniesPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const loadCompanies = async () => {
    try {
      const response = await api.get("/companies");
      setCompanies(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to load companies");
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const openDetail = async (companyId) => {
    try {
      const response = await api.get(`/companies/${companyId}`);
      setDetail(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to load company details");
    }
  };

  const removeCompany = async (companyId, companyName) => {
    const confirmed = window.confirm(
      `Delete company "${companyName}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/companies/${companyId}`);
      toast.success("Company deleted successfully");
      if (detail?.id === companyId) {
        setDetail(null);
      }
      if (selected?.id === companyId) {
        setSelected(null);
        setSheetOpen(false);
      }
      loadCompanies();
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to delete company");
    }
  };

  return (
    <div className="space-y-6">
      <CompanySheet
        open={sheetOpen}
        company={selected}
        onClose={() => {
          setSheetOpen(false);
          setSelected(null);
        }}
        onSaved={loadCompanies}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Companies</h1>
          <p className="text-sm text-slate-500">Manage recruiters, contacts, and their drive history.</p>
        </div>
        <Button
          onClick={() => {
            setSelected(null);
            setSheetOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Company
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {companies.map((company) => (
          <Card key={company.id} className="cursor-pointer transition hover:-translate-y-0.5" onClick={() => openDetail(company.id)}>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.name} className="h-14 w-14 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <Building2 className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <div className="font-semibold text-slate-900">{company.name}</div>
                  <Badge>{company.industry || "Other"}</Badge>
                </div>
              </div>
              <div className="text-sm text-slate-500">{company._count.drives} drives</div>
              <div className="text-sm text-slate-500">
                Last drive: {company.drives[0] ? formatDate(company.drives[0].drive_date) : "No drives yet"}
              </div>
              <Button
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelected(company);
                  setSheetOpen(true);
                }}
              >
                Edit
              </Button>
              {user?.role === roles.SUPER_ADMIN ? (
                <Button
                  variant="danger"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeCompany(company.id, company.name);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {detail ? (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{detail.name}</h2>
                <p className="text-sm text-slate-500">{detail.description || "No description provided."}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge>{detail.industry || "Other"}</Badge>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelected(detail);
                    setSheetOpen(true);
                  }}
                >
                  Edit
                </Button>
                {user?.role === roles.SUPER_ADMIN ? (
                  <Button
                    variant="danger"
                    onClick={() => removeCompany(detail.id, detail.name)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">HR: {detail.hr_name || "-"}</div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Email: {detail.hr_email || "-"}</div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Phone: {detail.hr_phone || "-"}</div>
            </div>
            <div className="space-y-3">
              {detail.drives.map((drive) => (
                <div key={drive.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-medium text-slate-900">{drive.title}</div>
                  <div className="text-sm text-slate-500">
                    {formatDate(drive.drive_date)} · {drive.package_lpa} LPA
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
