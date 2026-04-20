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
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";

const schema = z.object({
  tenantSlug: z.string().min(1, "Organisation code is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

/** Official AiQ logo mark */
function AiQLogoMark({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AiQ logo"
    >
      <circle cx="100" cy="100" r="100" fill="#1E293B" />
      <text
        x="100"
        y="128"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="80"
        fontWeight="800"
        fill="#FFFFFF"
        letterSpacing="-4"
      >
        AiQ
      </text>
      <text
        x="100"
        y="128"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="80"
        fontWeight="800"
        fill="#1E293B"
        letterSpacing="-4"
      >
        A Q
      </text>
      <text
        x="104"
        y="128"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="80"
        fontWeight="800"
        fill="#34D399"
        letterSpacing="-4"
      >
        i
      </text>
      <path
        d="M 58 155 Q 100 175 142 155"
        stroke="#34D399"
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

const DEMO_CREDENTIALS = [
  { role: "Admin", email: "admin@demo.aiq.com", password: "Admin1234!" },
  { role: "HR Leader", email: "hr@demo.aiq.com", password: "HRLeader1234!" },
  { role: "Manager", email: "manager@demo.aiq.com", password: "Manager1234!" },
  { role: "Learner", email: "learner@demo.aiq.com", password: "Learner1234!" },
  { role: "Auditor", email: "auditor@demo.aiq.com", password: "Auditor1234!" },
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
    defaultValues: { tenantSlug: "demo" },
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      navigate("/dashboard");
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
    setValue("tenantSlug", "demo");
    setServerError(null);
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-[#1E293B] p-10">
        <div className="flex items-center gap-3">
          <AiQLogoMark size={44} />
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/40">HR</p>
            <p className="text-[22px] font-extrabold tracking-tight text-white leading-none">AiQ</p>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Capability Intelligence<br />for the Modern Workforce
          </h2>
          <p className="text-white/60 text-base leading-relaxed">
            Adaptive assessments, personalised learning plans, and real-time compliance
            monitoring — all in one platform.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { label: "Adaptive Assessment Engine", desc: "Credibility-weighted scoring with full audit trail" },
              { label: "Dynamic Learning Plans", desc: "Modality-matched content based on your skill profile" },
              { label: "Policy & Compliance", desc: "Automated enforcement with escalation workflows" },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#34D399]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-[#34D399]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.label}</p>
                  <p className="text-xs text-white/50">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/30">
          &copy; {new Date().getFullYear()} HR AiQ. Enterprise Capability Intelligence Platform.
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <AiQLogoMark size={40} />
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#9CA3AF]">HR</p>
            <p className="text-xl font-extrabold tracking-tight text-[#0E1726] leading-none">AiQ</p>
          </div>
        </div>

        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#0E1726] mb-1">Welcome back</h1>
            <p className="text-[#6B7280] text-sm">Sign in to your AiQ account</p>
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
              <Label htmlFor="tenantSlug" className="text-sm font-medium text-[#374151]">
                Organisation Code
              </Label>
              <Input
                id="tenantSlug"
                {...register("tenantSlug")}
                placeholder="e.g. demo"
                className="h-10 bg-white border-[#E5E7EB] focus:border-[#3B4EFF] focus:ring-[#3B4EFF]/20"
              />
              {errors.tenantSlug && (
                <p className="text-xs text-red-600">{errors.tenantSlug.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-[#374151]">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="you@company.com"
                className="h-10 bg-white border-[#E5E7EB] focus:border-[#3B4EFF] focus:ring-[#3B4EFF]/20"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-[#374151]">
                  Password
                </Label>
                <Link href="/forgot-password">
                  <span className="text-xs text-[#3B4EFF] hover:underline cursor-pointer">
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
                  className="h-10 bg-white border-[#E5E7EB] focus:border-[#3B4EFF] focus:ring-[#3B4EFF]/20 pr-10"
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
              className="w-full h-10 bg-[#3B4EFF] hover:bg-[#2D3FCC] text-white font-semibold transition-colors"
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
            <span className="text-sm text-[#6B7280]">Don't have an account? </span>
            <Link href="/register">
              <span className="text-sm text-[#3B4EFF] font-medium hover:underline cursor-pointer">
                Create account
              </span>
            </Link>
          </div>

          {/* Demo credentials */}
          <div className="mt-8 border border-[#E5E7EB] rounded-xl p-4 bg-white">
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
              Demo Credentials — Org code: <span className="text-[#3B4EFF]">demo</span>
            </p>
            <div className="space-y-1.5">
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() => fillDemo(cred)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#F7F8FA] hover:bg-[#EEF0FF] hover:text-[#3B4EFF] transition-colors group"
                >
                  <span className="text-xs font-semibold text-[#374151] group-hover:text-[#3B4EFF]">
                    {cred.role}
                  </span>
                  <span className="text-xs text-[#9CA3AF] group-hover:text-[#3B4EFF] font-mono">
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
