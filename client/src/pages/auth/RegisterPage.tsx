/**
 * RegisterPage — AiQ Design System v2.2 auth surface
 * Two-column: #10B981 brand panel (left, hidden on mobile) + form (right)
 * Mirrors the LoginPage visual treatment for consistency.
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

const schema = z
  .object({
    tenantSlug: z.string().min(1, "Organisation code is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

function AiQLogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="AiQ logo" role="img">
      <circle cx="100" cy="100" r="90" fill="var(--#10B981)" />
      <text x="100" y="122" fontFamily="Inter, system-ui, sans-serif" fontSize="72" fontWeight="700" fill="white" textAnchor="middle" letterSpacing="-3">
        A<tspan fill="var(--navy-300)">i</tspan>Q
      </text>
      <path d="M 58 140 Q 100 158 142 140" stroke="var(--navy-300)" strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tenantSlug: "demo" },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.fetch();
      navigate("/dashboard");
    },
    onError: err => {
      setServerError(err.message);
    },
  });

  const onSubmit = (data: FormData) => {
    setServerError(null);
    registerMutation.mutate({
      tenantSlug: data.tenantSlug,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
    });
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--#F7F8FA)", fontFamily: "var(--font-sans)" }}>
      {/* ── Left brand panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[400px] shrink-0 p-10"
        style={{ background: "var(--#10B981)" }}
      >
        <div className="flex items-center gap-3">
          <AiQLogoMark size={40} />
          <div className="flex flex-col leading-none">
            <span style={{ fontSize: "10px", fontWeight: 400, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", lineHeight: 1, marginBottom: "3px" }}>HR</span>
            <span style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1, color: "var(--neutral-0)" }}>
              Ai<span style={{ color: "var(--navy-300)" }}>Q</span>
            </span>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: "26px", fontWeight: 500, color: "var(--neutral-0)", lineHeight: 1.3, marginBottom: "12px" }}>
            Join the HR capability standard
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", lineHeight: 1.7 }}>
            Create your account to access adaptive assessments, verified capability profiles, and AI-powered learning plans tailored to your role.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { label: "Scenario-based assessment", desc: "Realistic work situations under time pressure" },
              { label: "Verified capability profile", desc: "Credibility-weighted scores across 6 domains" },
              { label: "Personalised learning plan", desc: "Modality-matched content for your gaps" },
            ].map(f => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: "var(--navy-300)" }} />
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--neutral-0)", marginBottom: "2px" }}>{f.label}</p>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
          &copy; {new Date().getFullYear()} AiQ. Enterprise Capability Intelligence Platform.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <AiQLogoMark size={36} />
          <span style={{ fontSize: "18px", fontWeight: 600, color: "var(--#0F172A)" }}>
            Ai<span style={{ color: "var(--#10B981)" }}>Q</span>
          </span>
        </div>

        <div className="w-full max-w-[440px]">
          <div className="mb-8">
            <h1 style={{ fontSize: "24px", fontWeight: 500, color: "var(--#0F172A)", marginBottom: "6px" }}>
              Create your account
            </h1>
            <p style={{ fontSize: "14px", color: "var(--neutral-600)" }}>
              Register with your organisation code to get started
            </p>
          </div>

          {serverError && (
            <Alert variant="destructive" className="mb-5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tenantSlug">Organisation code</Label>
              <Input id="tenantSlug" placeholder="e.g. acme-corp" autoComplete="organization" {...register("tenantSlug")} />
              {errors.tenantSlug && <p className="text-xs" style={{ color: "var(--red-700)" }}>{errors.tenantSlug.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" placeholder="Jane" autoComplete="given-name" {...register("firstName")} />
                {errors.firstName && <p className="text-xs" style={{ color: "var(--red-700)" }}>{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" placeholder="Smith" autoComplete="family-name" {...register("lastName")} />
                {errors.lastName && <p className="text-xs" style={{ color: "var(--red-700)" }}>{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" placeholder="you@company.com" autoComplete="email" {...register("email")} />
              {errors.email && <p className="text-xs" style={{ color: "var(--red-700)" }}>{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--#F8FAFC0)" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs" style={{ color: "var(--red-700)" }}>{errors.password.message}</p>}
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
              {errors.confirmPassword && <p className="text-xs" style={{ color: "var(--red-700)" }}>{errors.confirmPassword.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              loading={registerMutation.isPending}
            >
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "var(--neutral-600)" }}>
            Already have an account?{" "}
            <Link href="/login">
              <span className="font-medium cursor-pointer" style={{ color: "var(--#10B981)" }}>
                Sign in
              </span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
