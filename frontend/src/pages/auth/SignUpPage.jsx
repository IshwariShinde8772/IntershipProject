import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Select } from "../../components/ui/Select";
import { useAuth } from "../../hooks/useAuth";
import { departments } from "../../utils/constants";
import { AuthSplitLayout } from "./AuthSplitLayout";

const initialForm = {
  name: "",
  email: "",
  prn: "",
  college_id: "",
  department: "",
  password: "",
  confirmPassword: ""
};

export function SignUpPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!form.email.trim().toLowerCase().endsWith("@kbtcoe.org")) {
      toast.error("Use your @kbtcoe.org college email address");
      return;
    }

    if (!form.prn && !form.college_id) {
      toast.error("Enter your PRN or College ID to continue");
      return;
    }

    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      await signup({
        name: form.name,
        email: form.email,
        prn: form.prn,
        college_id: form.college_id,
        department: form.department,
        password: form.password
      });
      toast.success("Student account is ready");
      navigate("/profile", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to create student account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout title="Student Sign Up" subtitle="Activate Your Placement Account">
      <form className="mt-10 space-y-5" onSubmit={onSubmit}>
        <div className="rounded-none border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-slate-600">
          Use your official KBTCOE email. If the T&P cell already imported your data, this step will activate that account using your PRN or College ID.
        </div>

        <div>
          <Label
            htmlFor="name"
            className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
          >
            Full Name
          </Label>
          <Input
            id="name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Student Name"
            className="h-12 rounded-none border-slate-300 bg-white px-4 text-[15px] focus:border-blue-500"
          />
        </div>

        <div>
          <Label
            htmlFor="email"
            className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
          >
            College Email
          </Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="student@kbtcoe.org"
            className="h-12 rounded-none border-slate-300 bg-white px-4 text-[15px] focus:border-blue-500"
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label
              htmlFor="prn"
              className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
            >
              PRN
            </Label>
            <Input
              id="prn"
              value={form.prn}
              onChange={(event) => updateField("prn", event.target.value)}
              placeholder="72001869L"
              className="h-12 rounded-none border-slate-300 bg-white px-4 text-[15px] focus:border-blue-500"
            />
          </div>

          <div>
            <Label
              htmlFor="college_id"
              className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
            >
              College ID
            </Label>
            <Input
              id="college_id"
              value={form.college_id}
              onChange={(event) => updateField("college_id", event.target.value)}
              placeholder="KBTUG19338"
              className="h-12 rounded-none border-slate-300 bg-white px-4 text-[15px] focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <Label
            htmlFor="department"
            className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
          >
            Department
          </Label>
          <Select
            id="department"
            value={form.department}
            onChange={(event) => updateField("department", event.target.value)}
            className="h-12 rounded-none border-slate-300 bg-white px-4 text-[15px] focus:border-blue-500"
          >
            <option value="">Select Department</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label
            htmlFor="password"
            className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
          >
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Create a strong password"
              className="h-12 rounded-none border-slate-300 bg-white px-4 pr-11 text-[15px] focus:border-blue-500"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <Label
            htmlFor="confirmPassword"
            className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
          >
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(event) => updateField("confirmPassword", event.target.value)}
              placeholder="Re-enter your password"
              className="h-12 rounded-none border-slate-300 bg-white px-4 pr-11 text-[15px] focus:border-blue-500"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
              onClick={() => setShowConfirmPassword((current) => !current)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          className="h-12 w-full rounded-none bg-[#3167e3] text-sm font-bold uppercase tracking-[0.18em] text-white hover:bg-[#2558ce]"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Activating..." : "Create Student Account"}
        </Button>

        <div className="text-center text-sm text-slate-500">
          Already registered?
          {" "}
          <Link className="text-[#3167e3] transition hover:text-[#2558ce]" to="/login">
            Sign in
          </Link>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
