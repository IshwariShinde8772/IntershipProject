import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { authApi } from "../../services/api";
import { AuthSplitLayout } from "./AuthSplitLayout";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await authApi.post("/auth/forgot-password", { email });
      setSubmitted(true);
      toast.success(response.data?.message ?? "If the account exists, a reset link has been sent");
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Unable to send reset link");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout title="Forgot Password" subtitle="Reset Your Portal Access">
      <form className="mt-10 space-y-6" onSubmit={onSubmit}>
        <div className="rounded-none border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-slate-600">
          Enter your college login email. If the account exists, the reset link will be sent to that mailbox.
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="student@kbtcoe.org"
            className="h-12 rounded-none border-slate-300 bg-white px-4 text-[15px] focus:border-blue-500"
            required
          />
        </div>

        {submitted ? (
          <div className="rounded-none border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
            Reset link request submitted. Check your inbox and spam folder.
          </div>
        ) : null}

        <Button
          className="h-12 w-full rounded-none bg-[#3167e3] text-sm font-bold uppercase tracking-[0.18em] text-white hover:bg-[#2558ce]"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Sending..." : "Send Reset Link"}
        </Button>

        <div className="text-center">
          <Link className="text-sm text-[#3167e3] transition hover:text-[#2558ce]" to="/login">
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
