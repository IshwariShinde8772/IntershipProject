import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { authApi } from "../../services/api";
import { AuthSplitLayout } from "./AuthSplitLayout";

const initialForm = {
  email: "",
  otp: "",
  newPassword: "",
  confirmPassword: ""
};

export function ForgotPasswordPage({ showResetLinkNotice = false } = {}) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (key, value) =>
    setForm((current) => ({
      ...current,
      [key]: value
    }));

  const requestOtp = async () => {
    if (!form.email.trim()) {
      toast.error("Enter your email address");
      return;
    }

    setSendingOtp(true);

    try {
      const response = await authApi.post("/auth/forgot-password", { email: form.email });
      setOtpSent(true);
      toast.success(response.data?.message ?? "A 6-digit OTP has been sent to your email address");
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!otpSent) {
      await requestOtp();
      return;
    }

    if (!/^\d{6}$/.test(form.otp.trim())) {
      toast.error("Enter the 6-digit OTP");
      return;
    }

    if (form.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setResetting(true);
    try {
      await authApi.post("/auth/reset-password", {
        email: form.email,
        otp: form.otp,
        newPassword: form.newPassword
      });
      toast.success("Password reset successfully. Please sign in.");
      setForm(initialForm);
      setOtpSent(false);
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to reset password");
    } finally {
      setResetting(false);
    }
  };

  return (
    <AuthSplitLayout title="Forgot Password" subtitle="Reset Your Portal Access">
      <form className="mt-10 space-y-6" onSubmit={onSubmit}>
        {showResetLinkNotice ? (
          <div className="rounded-none border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
            Password reset now uses a 6-digit OTP instead of the old reset link. Request a new OTP below to continue.
          </div>
        ) : null}

        <div className="rounded-none border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-slate-600">
          Enter your login email to receive a 6-digit OTP. After that, enter the OTP and your new password to finish resetting access.
        </div>

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
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="student@kbtcoe.org"
            className="h-12 rounded-none border-slate-300 bg-white px-4 text-[15px] focus:border-blue-500"
            required
          />
        </div>

        <Button
          className="h-12 w-full rounded-none bg-[#3167e3] text-sm font-bold uppercase tracking-[0.18em] text-white hover:bg-[#2558ce]"
          disabled={sendingOtp}
          type="button"
          onClick={requestOtp}
        >
          {sendingOtp ? "Sending..." : otpSent ? "Resend 6-Digit OTP" : "Send 6-Digit OTP"}
        </Button>

        {otpSent ? (
          <div className="rounded-none border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
            OTP sent. Check your inbox, then enter the 6-digit code and your new password below.
          </div>
        ) : null}

        {otpSent ? (
          <>
            <div>
              <Label
                htmlFor="otp"
                className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
              >
                6-Digit OTP
              </Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={form.otp}
                onChange={(event) => updateField("otp", event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter OTP"
                className="h-12 rounded-none border-slate-300 bg-white px-4 text-[15px] focus:border-blue-500"
                required
              />
            </div>

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
                  onChange={(event) => updateField("newPassword", event.target.value)}
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
                  onChange={(event) => updateField("confirmPassword", event.target.value)}
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
              disabled={resetting}
              type="submit"
            >
              {resetting ? "Updating..." : "Reset Password"}
            </Button>
          </>
        ) : null}

        <div className="text-center">
          <Link className="text-sm text-[#3167e3] transition hover:text-[#2558ce]" to="/login">
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
