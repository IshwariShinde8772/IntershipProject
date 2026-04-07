import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { AuthSplitLayout } from "./AuthSplitLayout";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from?.pathname ?? "/dashboard", { replace: true });
      toast.success("Logged in successfully");
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout title="KBT College of Engineering" subtitle="T&P Placement Portal">
      <form className="mt-10 space-y-6" onSubmit={onSubmit}>
        <div>
          <Label
            htmlFor="email"
            className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
          >
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="tpo@kbtcoe.org"
            className="h-12 rounded-none border-slate-300 bg-white px-4 text-[15px] focus:border-blue-500"
            required
          />
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
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Enter your password"
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

        <Button
          className="h-12 w-full rounded-none bg-[#3167e3] text-sm font-bold uppercase tracking-[0.18em] text-white hover:bg-[#2558ce]"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Signing In..." : "Sign In"}
        </Button>

        <div className="text-center">
          <Link className="text-sm text-[#3167e3] transition hover:text-[#2558ce]" to="/forgot-password">
            Forgot your password?
          </Link>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
