import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { authApi } from "../../services/api";
import { AuthSplitLayout } from "./AuthSplitLayout";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      toast.error("Reset link is missing or invalid");
      return;
    }

    if (form.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      await authApi.post("/auth/reset-password", {
        token,
        newPassword: form.newPassword
      });
      toast.success("Password reset successfully. Please sign in.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout title="Create New Password" subtitle="Secure Your Portal Login">
      <form className="mt-10 space-y-6" onSubmit={onSubmit}>
        {!token ? (
          <div className="rounded-none border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
            This reset link is incomplete or invalid. Request a new password reset email to continue.
          </div>
        ) : null}

        <div>
          <Label
            htmlFor="newPassword"
            className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
          >
            New Password
          </Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              value={form.newPassword}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  newPassword: event.target.value
                }))
              }
              placeholder="Enter a new password"
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
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value
                }))
              }
              placeholder="Re-enter your new password"
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
          disabled={submitting || !token}
          type="submit"
        >
          {submitting ? "Updating..." : "Update Password"}
        </Button>

        <div className="text-center">
          <Link className="text-sm text-[#3167e3] transition hover:text-[#2558ce]" to="/forgot-password">
            Request a new reset link
          </Link>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
