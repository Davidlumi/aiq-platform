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
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

/** AiQ logo mark */
function AiQLogoMark({ size = 48, variant = "default" }: { size?: number; variant?: "default" | "hero" }) {
  const accent = "var(--primary)";
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

const FEATURES = [
  {
    label: "Free capability assessment",
    desc: "15-minute scenario-based assessment across 6 domains. Full scores and diagnostics included.",
    icon: Brain,
  },
  {
    label: "Personalised learning plan",
    desc: "See your tailored learning plan instantly. Upgrade to PRO to click into modules and track progress.",
    icon: BookOpen,
  },
  {
    label: "AiQ PRO — unlock everything",
    desc: "Modules, AI Coach, knowledge base, and downloadable reports. £50/month or £480/year.",
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
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.fetch();
      if (data.isPlatformSuperuser) {
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
            Know exactly where you
            <br />
            stand on AI in HR
          </h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", lineHeight: 1.7 }}>
            A free, scenario-based capability assessment built for HR professionals.
            Get your full score, diagnostics, and a personalised learning plan — no credit card required.
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
              { value: "6", label: "Domains" },
              { value: "15", label: "Minutes" },
              { value: "Free", label: "To start" },
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
          &copy; {new Date().getFullYear()} AiQ. HR Capability Intelligence.
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
                autoFocus
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
                Create account — it's free
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
