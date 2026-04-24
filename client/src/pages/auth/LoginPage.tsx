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
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

const schema = z.object({
  tenantSlug: z.string().min(1, "Organisation code is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

/**
 * HR AiQ Logo Mark — Brand Guidelines v3.0
 * Midnight circle, white A+Q, Teal-600 'i', Teal-600 arc
 * On dark (hero) surfaces, arc and 'i' use Sage (#5ee8b0)
 */
function AiQLogoMark({ size = 48, variant = "default" }: { size?: number; variant?: "default" | "hero" }) {
  const accent = variant === "hero" ? "var(--navy-300)" : "var(--navy-800)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="HR AiQ logo"
    >
      <circle cx="100" cy="100" r="100" fill="var(--navy-800)" />
      <text x="42" y="128" fontFamily="Sora, system-ui, sans-serif" fontSize="76" fontWeight="800" fill="#ffffff" letterSpacing="-2">A</text>
      <text x="105" y="128" fontFamily="Sora, system-ui, sans-serif" fontSize="76" fontWeight="800" fill={accent} letterSpacing="-2">i</text>
      <text x="122" y="128" fontFamily="Sora, system-ui, sans-serif" fontSize="76" fontWeight="800" fill="#ffffff" letterSpacing="-2">Q</text>
      <path d="M 52 152 Q 100 178 148 152" stroke={accent} strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

const DEMO_CREDENTIALS = [
  { role: "Admin",     email: "admin@demo.aiq.com",   password: "Admin1234!" },
  { role: "HR Leader", email: "hr@demo.aiq.com",       password: "HRLeader1234!" },
  { role: "Manager",   email: "manager@demo.aiq.com",  password: "Manager1234!" },
  { role: "Learner",   email: "learner@demo.aiq.com",  password: "Learner1234!" },
  { role: "Auditor",   email: "auditor@demo.aiq.com",  password: "Auditor1234!" },
];

const FEATURES = [
  {
    label: "Adaptive Assessment Engine",
    desc: "Credibility-weighted scoring across 6 capability dimensions with full audit trail",
  },
  {
    label: "Dynamic Learning Plans",
    desc: "Modality-matched content assigned based on your verified capability profile",
  },
  {
    label: "Policy & Compliance",
    desc: "Automated enforcement with restriction workflows and explainability",
  },
];

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tenantSlug: "lumi" },
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      // Fetch the full auth.me profile (which includes onboardingCompleted, status, etc.)
      // and wait for it to resolve before navigating so ProtectedRoute sees the user
      // immediately and doesn't redirect back to /login.
      await utils.auth.me.fetch();
      // Super admins go directly to back office
      if (data.roles?.includes("super_admin")) {
        navigate("/backoffice");
      } else {
        navigate("/dashboard");
      }
    },
    onError: (err) => {
      setServerError(err.message);
    },
  });

  const onSubmit = (data: FormData) => {
    setServerError(null);
    loginMutation.mutate(data);
  };

  function fillDemo(cred: (typeof DEMO_CREDENTIALS)[0]) {
    setValue("email", cred.email);
    setValue("password", cred.password);
    setValue("tenantSlug", "lumi");
    setServerError(null);
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--neutral-25)", fontFamily: "var(--font-sans)" }}
    >
      {/* ── Left brand panel (Midnight) ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[440px] shrink-0 p-10"
        style={{ background: "var(--navy-800)" }}
      >
        {/* Logo + wordmark */}
        <div className="flex items-center gap-3">
          <AiQLogoMark size={44} variant="hero" />
          <div className="flex flex-col leading-none">
            <span
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "10px",
                fontWeight: 400,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.45)",
                lineHeight: 1,
                marginBottom: "3px",
              }}
            >
              HR
            </span>
            <span
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                lineHeight: 1,
                   color: "var(--neutral-0)",
            }}
          >
              Ai<span style={{ color: "var(--navy-300)" }}>Q</span>
            </span>
          </div>
        </div>

        {/* Hero copy */}
        <div>
          <h2
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: "28px",
              fontWeight: 600,
              color: "var(--neutral-0)",
              lineHeight: 1.3,
              marginBottom: "16px",
            }}
          >
            The AI capability standard<br />for HR professionals
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", lineHeight: 1.7 }}>
            HR AiQ doesn't ask you to define hallucination. It puts you in realistic
            work situations — under time pressure, with incomplete information — and
            reads how you actually behave.
          </p>

          <div className="mt-10 space-y-5">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: "var(--navy-300)" }} />
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "'Sora', sans-serif",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--neutral-0)",
                      marginBottom: "2px",
                    }}
                  >
                    {f.label}
                  </p>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Stat strip */}
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { value: "6", label: "Capabilities" },
              { value: "3", label: "Verified tiers" },
              { value: "90d", label: "Credential expiry" },
            ].map((s) => (
              <div key={s.label}>
                <p
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "22px",
                    fontWeight: 500,
                    color: "var(--navy-300)",
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
          &copy; {new Date().getFullYear()} HR AiQ. Enterprise Capability Intelligence Platform.
        </p>
      </div>

      {/* ── Right login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <AiQLogoMark size={40} />
          <div className="flex flex-col leading-none">
            <span
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "10px",
                fontWeight: 400,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--neutral-500)",
                lineHeight: 1,
                marginBottom: "3px",
              }}
            >
              HR
            </span>
            <span
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "20px",
                fontWeight: 700,
              color: "var(--neutral-900)",
              lineHeight: 1,
            }}
          >
              Ai<span style={{ color: "var(--navy-800)" }}>Q</span>
            </span>
          </div>
        </div>

        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <h1
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "24px",
                fontWeight: 600,
              color: "var(--neutral-900)",
              marginBottom: "6px",
              }}
            >
              Welcome back
            </h1>
            <p style={{ fontSize: "14px", color: "var(--neutral-600)" }}>Sign in to your AiQ account</p>
          </div>

          {serverError && (
            <Alert variant="destructive" className="mb-5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Organisation code */}
            <div className="space-y-1.5">
              <Label
                htmlFor="tenantSlug"
                style={{ fontFamily: "'Sora', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}
              >
                Organisation Code
              </Label>
              <Input
                id="tenantSlug"
                {...register("tenantSlug")}
                placeholder="e.g. hr-datahub"
                className="h-10 bg-white border-[#E5E7EB] focus:border-[#0F6E56] focus:ring-[#0F6E56]/20"
              />
              {errors.tenantSlug ? (
                <p className="text-xs text-red-600">{errors.tenantSlug.message}</p>
              ) : (
                <p className="text-xs" style={{ color: "#9CA3AF" }}>
                  Use the short code provided by your administrator (e.g. <span style={{ fontFamily: "'DM Mono', monospace", color: "#6B7280" }}>hr-datahub</span>), not the organisation display name.
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                style={{ fontFamily: "'Sora', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}
              >
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="you@company.com"
                className="h-10 bg-white border-[#E5E7EB] focus:border-[#0F6E56] focus:ring-[#0F6E56]/20"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  style={{ fontFamily: "'Sora', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}
                >
                  Password
                </Label>
                <Link href="/forgot-password">
                  <span
                    className="text-xs hover:underline cursor-pointer"
                    style={{ color: "#0F6E56", fontFamily: "'Sora', sans-serif" }}
                  >
                    Forgot password?
                  </span>
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="••••••••"
                  className="h-10 bg-white border-[#E5E7EB] focus:border-[#0F6E56] focus:ring-[#0F6E56]/20 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-semibold transition-colors"
              style={{
                background: "#0F6E56",
                color: "#ffffff",
                fontFamily: "'Sora', sans-serif",
                fontSize: "14px",
              }}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <span style={{ fontSize: "13px", color: "#6B7280" }}>Don't have an account? </span>
            <Link href="/register">
              <span
                className="hover:underline cursor-pointer"
                style={{ fontSize: "13px", color: "#0F6E56", fontWeight: 500, fontFamily: "'Sora', sans-serif" }}
              >
                Create account
              </span>
            </Link>
          </div>

          {/* Demo credentials */}
          <div
            className="mt-8 rounded-xl p-4"
            style={{ border: "1px solid #E5E7EB", background: "#ffffff" }}
          >
            <p
              className="uppercase tracking-wider mb-3"
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "11px",
                fontWeight: 700,
                color: "#6B7280",
                letterSpacing: "0.08em",
              }}
            >
              Demo Credentials — Org code:{" "}
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  color: "#0F6E56",
                  fontWeight: 500,
                  textTransform: "none",
                  letterSpacing: "0.02em",
                }}
              >
                demo
              </span>
            </p>
            <div className="space-y-1.5">
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() => fillDemo(cred)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors group"
                  style={{ background: "#F7F8FA" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#e6f4f0")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#F7F8FA")}
                >
                  <span
                    className="text-xs font-semibold"
                    style={{ fontFamily: "'Sora', sans-serif", color: "#374151" }}
                  >
                    {cred.role}
                  </span>
                  <span
                    className="text-xs"
                    style={{ fontFamily: "'DM Mono', monospace", color: "#9CA3AF" }}
                  >
                    {cred.email}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
