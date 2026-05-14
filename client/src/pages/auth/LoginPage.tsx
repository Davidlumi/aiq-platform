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
import { Loader2, Eye, EyeOff, AlertCircle, Shield, Brain, BookOpen } from "lucide-react";

const schema = z.object({
  tenantSlug: z.string().min(1, "Organisation code is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

/** AiQ logo mark - dark slate circle, white A+Q, green i dot */
function AiQLogoMark({ size = 48, variant = "default" }: { size?: number; variant?: "default" | "hero" }) {
  const accent = variant === "hero" ? "var(--primary)" : "var(--primary)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AiQ logo"
    >
      <circle cx="100" cy="100" r="90" fill="var(--muted)" />
      <text
        x="100"
        y="122"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="72"
        fontWeight="700"
        fill="white"
        textAnchor="middle"
        letterSpacing="-3"
      >
        A<tspan fill={accent}>i</tspan>Q
      </text>
      <path
        d="M 58 140 Q 100 158 142 140"
        stroke={accent}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

const DEMO_CREDENTIALS = [
  { role: "HR Leader (CPO)", email: "sarah.thornton@acme.co.uk", org: "acme" },
  { role: "Manager",         email: "priya.sharma@acme.co.uk",   org: "acme" },
  { role: "Learner",         email: "zoe.patel@acme.co.uk",      org: "acme" },
  { role: "Admin",           email: "admin@demo.aiq.com",        org: "lumi" },
  { role: "Auditor",         email: "auditor@demo.aiq.com",      org: "lumi" },
];

const FEATURES = [
  {
    label: "Adaptive Assessment Engine",
    desc: "Credibility-weighted scoring across 6 capability dimensions with full audit trail",
    icon: Brain,
  },
  {
    label: "Dynamic Learning Plans",
    desc: "Modality-matched content assigned based on your verified capability profile",
    icon: BookOpen,
  },
  {
    label: "Policy & Compliance",
    desc: "Automated enforcement with restriction workflows and explainability",
    icon: Shield,
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
    defaultValues: { tenantSlug: "" },
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.fetch();
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
    setValue("password", "manutd99");
    setValue("tenantSlug", cred.org);
    setServerError(null);
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#F7F8FA" }}>
      {/* -- Left brand panel -- */}
      <div
        className="hidden lg:flex flex-col justify-between w-[440px] shrink-0 p-10"
        style={{
          background: "linear-gradient(160deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
        }}
      >
        {/* Logo + wordmark */}
        <div className="flex items-center gap-3">
          <AiQLogoMark size={40} variant="hero" />
          <div className="flex flex-col leading-none">
            <span
              style={{
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.14em",
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
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                lineHeight: 1,
                color: "#F8FAFC",
              }}
            >
              Ai<span style={{ color: "var(--primary)" }}>Q</span>
            </span>
          </div>
        </div>

        {/* Hero copy */}
        <div>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 600,
              color: "#F8FAFC",
              lineHeight: 1.35,
              marginBottom: "14px",
            }}
          >
            The AI capability standard
            <br />
            for HR professionals
          </h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", lineHeight: 1.7 }}>
            AiQ doesn't ask you to define hallucination. It puts you in realistic
            work situations - under time pressure, with incomplete information - and
            reads how you actually behave.
          </p>

          <div className="mt-10 space-y-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(94,232,176,0.12)" }}
                  >
                    <Icon className="w-4 h-4" style={{ color: "var(--primary)" }} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#F8FAFC",
                        marginBottom: "3px",
                      }}
                    >
                      {f.label}
                    </p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stat strip */}
          <div
            className="mt-10 grid grid-cols-3 gap-4 pt-6"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            {[
              { value: "6", label: "Capabilities" },
              { value: "3", label: "Verified tiers" },
              { value: "90d", label: "Credential expiry" },
            ].map((s) => (
              <div key={s.label}>
                <p
                  style={{
                    fontFamily: "monospace",
                    fontSize: "22px",
                    fontWeight: 600,
                    color: "var(--primary)",
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
          &copy; {new Date().getFullYear()} AiQ. Enterprise Capability Intelligence Platform.
        </p>
      </div>

      {/* -- Right login form -- */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <AiQLogoMark size={36} />
          <span style={{ fontSize: "18px", fontWeight: 600, color: "var(--foreground)" }}>
            Ai<span className="text-primary">Q</span>
          </span>
        </div>

        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 600,
                color: "var(--foreground)",
                marginBottom: "6px",
              }}
            >
              Welcome back
            </h1>
            <p style={{ fontSize: "14px", color: "#64748B" }}>Sign in to your AiQ account</p>
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
              <Label htmlFor="tenantSlug" style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
                Organisation code
              </Label>
              <Input
                id="tenantSlug"
                {...register("tenantSlug")}
                placeholder="e.g. acme"
                className="h-11"
                autoComplete="organization"
              />
              {errors.tenantSlug ? (
                <p className="text-xs text-destructive">{errors.tenantSlug.message}</p>
              ) : (
                <p className="text-xs" style={{ color: "#9CA3AF" }}>
                  The short code provided by your administrator
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="you@company.com"
                className="h-11"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
                  Password
                </Label>
                <Link href="/forgot-password">
                  <span
                    className="text-xs hover:underline cursor-pointer text-primary font-medium"
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
                  placeholder="Enter your password"
                  className="h-11 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#9CA3AF" }}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold text-sm"
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
                style={{ fontSize: "13px", color: "var(--primary)", fontWeight: 500 }}
              >
                Create account
              </span>
            </Link>
          </div>

          {/* Demo credentials */}
          <div
            className="mt-8 rounded-xl p-4"
            style={{ border: "1px solid #E2E8F0", background: "#ffffff" }}
          >
            <p
              className="uppercase tracking-wider mb-3"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#6B7280",
                letterSpacing: "0.08em",
              }}
            >
              Demo credentials - password:{" "}
              <span
                style={{
                  fontFamily: "monospace",
                  color: "var(--primary)",
                  fontWeight: 500,
                  textTransform: "none",
                  letterSpacing: "0.02em",
                }}
              >
                manutd99
              </span>
            </p>
            <div className="space-y-1">
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.email}
                  type="button"
                  onClick={() => fillDemo(cred)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all group"
                  style={{ background: "#F8FAFC" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#ECFDF5";
                    (e.currentTarget as HTMLElement).style.transform = "translateX(2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#F8FAFC";
                    (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
                  }}
                >
                  <span className="text-xs font-semibold" style={{ color: "#374151" }}>
                    {cred.role}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ fontFamily: "monospace", color: "#64748B", background: "#E2E8F0", fontSize: "10px" }}
                    >
                      {cred.org}
                    </span>
                    <span className="text-xs" style={{ fontFamily: "monospace", color: "#9CA3AF" }}>
                      {cred.email}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
