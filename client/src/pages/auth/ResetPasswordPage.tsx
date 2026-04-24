/**
 * ResetPasswordPage — AiQ Design System v2.2 auth surface
 * Centered card on neutral-25 canvas. Mirrors ForgotPasswordPage treatment.
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
import { CheckCircle2, AlertCircle } from "lucide-react";

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine(d => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

function AiQLogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="AiQ logo" role="img">
      <circle cx="100" cy="100" r="90" fill="var(--navy-800)" />
      <text x="100" y="122" fontFamily="Inter, system-ui, sans-serif" fontSize="72" fontWeight="700" fill="white" textAnchor="middle" letterSpacing="-3">
        A<tspan fill="var(--navy-300)">i</tspan>Q
      </text>
      <path d="M 58 140 Q 100 158 142 140" stroke="var(--navy-300)" strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setSuccess(true),
    onError: err => setServerError(err.message),
  });

  const onSubmit = (data: FormData) => {
    setServerError(null);
    resetMutation.mutate({ token, newPassword: data.newPassword });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "var(--neutral-25)", fontFamily: "var(--font-sans)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <AiQLogoMark size={36} />
        <span style={{ fontSize: "18px", fontWeight: 600, color: "var(--neutral-900)" }}>
          Ai<span style={{ color: "var(--navy-800)" }}>Q</span>
        </span>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-[420px] rounded-lg border p-8"
        style={{
          background: "var(--neutral-0)",
          borderColor: "var(--neutral-200)",
          boxShadow: "var(--elevation-sm)",
        }}
      >
        {success ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="w-10 h-10" style={{ color: "var(--green-700)" }} />
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: 500, color: "var(--neutral-900)" }}>
              Password updated
            </h1>
            <p style={{ fontSize: "14px", color: "var(--neutral-600)", lineHeight: 1.6 }}>
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <Link href="/login">
              <Button className="w-full mt-2">Sign in</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 style={{ fontSize: "22px", fontWeight: 500, color: "var(--neutral-900)", marginBottom: "6px" }}>
                Set new password
              </h1>
              <p style={{ fontSize: "14px", color: "var(--neutral-600)" }}>
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
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  {...register("newPassword")}
                />
                {errors.newPassword && (
                  <p className="text-xs" style={{ color: "var(--red-700)" }}>{errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-xs" style={{ color: "var(--red-700)" }}>{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={resetMutation.isPending}
                disabled={!token}
              >
                Reset password
              </Button>
            </form>

            <div className="mt-5 text-center">
              <Link href="/login">
                <span className="text-sm cursor-pointer" style={{ color: "var(--navy-800)" }}>
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
