/**
 * ForgotPasswordPage — AiQ Design System v2.2 auth surface
 * Centered card layout on neutral-25 canvas (simpler than login — no brand panel needed).
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
import { CheckCircle2 } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
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

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
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
        {submitted ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="w-10 h-10" style={{ color: "var(--green-700)" }} />
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: 500, color: "var(--neutral-900)" }}>
              Check your inbox
            </h1>
            <p style={{ fontSize: "14px", color: "var(--neutral-600)", lineHeight: 1.6 }}>
              If an account exists for that email address, a password reset link has been sent.
            </p>

            {devToken && (
              <div
                className="p-3 rounded text-left"
                style={{ background: "var(--neutral-50)", border: "1px solid var(--neutral-200)" }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: "var(--neutral-600)" }}>
                  Dev mode — reset token:
                </p>
                <code className="text-xs break-all" style={{ color: "var(--neutral-900)", fontFamily: "var(--font-mono)" }}>
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
              <Button variant="secondary" className="w-full mt-2">
                Back to sign in
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 style={{ fontSize: "22px", fontWeight: 500, color: "var(--neutral-900)", marginBottom: "6px" }}>
                Reset your password
              </h1>
              <p style={{ fontSize: "14px", color: "var(--neutral-600)" }}>
                Enter your email and we will send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs" style={{ color: "var(--red-700)" }}>{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={resetMutation.isPending}
              >
                Send reset link
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
