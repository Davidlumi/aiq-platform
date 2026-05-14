/**
 * ForgotPasswordPage - AiQ Platform
 * Centered card layout on light canvas.
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
import { CheckCircle2, ArrowLeft } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormData = z.infer<typeof schema>;

function AiQLogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="AiQ logo" role="img">
      <circle cx="100" cy="100" r="90" fill="var(--muted)" />
      <text x="100" y="122" fontFamily="system-ui, -apple-system, sans-serif" fontSize="72" fontWeight="700" fill="white" textAnchor="middle" letterSpacing="-3">
        A<tspan fill="var(--primary)">i</tspan>Q
      </text>
      <path d="M 58 140 Q 100 158 142 140" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const resetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (data: any) => {
      setSubmitted(true);
      if (data._devToken) setDevToken(data._devToken);
    },
  });

  const onSubmit = (data: FormData) => {
    resetMutation.mutate({ email: data.email });
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
        {submitted ? (
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
              Check your inbox
            </h1>
            <p style={{ fontSize: "14px", color: "#64748B", lineHeight: 1.6 }}>
              If an account exists for that email address, a password reset link has been sent.
            </p>

            {devToken && (
              <div
                className="p-3 rounded-lg text-left"
                style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: "#64748B" }}>
                  Dev mode - reset token:
                </p>
                <code className="text-xs break-all" style={{ color: "var(--foreground)", fontFamily: "monospace" }}>
                  {devToken}
                </code>
                <Link href={`/reset-password?token=${devToken}`}>
                  <Button size="sm" variant="secondary" className="mt-2 w-full text-xs">
                    Use this token
                  </Button>
                </Link>
              </div>
            )}

            <Link href="/login">
              <Button variant="outline" className="w-full mt-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to sign in
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--foreground)", marginBottom: "6px" }}>
                Reset your password
              </h1>
              <p style={{ fontSize: "14px", color: "#64748B" }}>
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="h-11"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-semibold text-sm"
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? "Sending…" : "Send reset link"}
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
