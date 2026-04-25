/**
 * ResetPasswordPage — AiQ Platform
 * Centered card on light canvas. Mirrors ForgotPasswordPage treatment.
 */
import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

function AiQLogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="AiQ logo" role="img">
      <circle cx="100" cy="100" r="90" fill="#1E293B" />
      <text x="100" y="122" fontFamily="system-ui, -apple-system, sans-serif" fontSize="72" fontWeight="700" fill="white" textAnchor="middle" letterSpacing="-3">
        A<tspan fill="var(--primary)">i</tspan>Q
      </text>
      <path d="M 58 140 Q 100 158 142 140" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setSuccess(true),
    onError: (err) => setServerError(err.message),
  });

  const onSubmit = (data: FormData) => {
    setServerError(null);
    resetMutation.mutate({ token, newPassword: data.newPassword });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "#F7F8FA" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <AiQLogoMark size={36} />
        <span style={{ fontSize: "18px", fontWeight: 600, color: "var(--foreground)" }}>
          Ai<span className="text-primary">Q</span>
        </span>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-[420px] rounded-xl p-8"
        style={{
          background: "#ffffff",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        }}
      >
        {success ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "#ECFDF5" }}
              >
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: 600, color: "var(--foreground)" }}>
              Password updated
            </h1>
            <p style={{ fontSize: "14px", color: "#64748B", lineHeight: 1.6 }}>
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <Link href="/login">
              <Button className="w-full h-11 mt-2 font-semibold">Sign in</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--foreground)", marginBottom: "6px" }}>
                Set new password
              </h1>
              <p style={{ fontSize: "14px", color: "#64748B" }}>
                Enter your new password below.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {!token && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Invalid or missing reset token. Please request a new reset link.</AlertDescription>
                </Alert>
              )}
              {serverError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="newPassword" style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
                  New password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="h-11"
                  {...register("newPassword")}
                />
                {errors.newPassword && (
                  <p className="text-xs text-destructive">{errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
                  Confirm password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className="h-11"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-semibold text-sm"
                disabled={!token || resetMutation.isPending}
              >
                {resetMutation.isPending ? "Resetting…" : "Reset password"}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <Link href="/login">
                <span className="text-sm cursor-pointer hover:underline text-primary font-medium">
                  <ArrowLeft className="w-3 h-3 inline mr-1" />
                  Back to sign in
                </span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
