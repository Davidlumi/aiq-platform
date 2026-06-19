/**
 * RegisterPage — Self-serve sign-up (Phase 1 Skills Checker Launch)
 *
 * Changes from enterprise register:
 * - No organisation code field — creates a personal tenant automatically
 * - T&C checkbox unticked by default (UK GDPR/PECR compliance — Planet49)
 * - Post-submit "check your email" state with resend option
 * - Calls trpc.auth.selfRegister instead of trpc.auth.register
 */
import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Eye, EyeOff, AlertCircle, Mail, CheckCircle2, Brain, BookOpen, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    acceptedTerms: z.boolean().refine((v) => v === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const FEATURES = [
  { label: "Free capability assessment", desc: "15-minute scenario-based test across 6 domains — full scores and diagnostics included", icon: Brain },
  { label: "Verified capability score", desc: "Headline score plus per-domain breakdown and a plain-English diagnosis of your gaps", icon: Shield },
  { label: "Personalised learning plan", desc: "See your tailored plan instantly. Upgrade to PRO to unlock modules, AI Coach, and downloads", icon: BookOpen },
];

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { acceptedTerms: false },
  });

  const selfRegisterMutation = trpc.auth.selfRegister.useMutation({
    onSuccess: (_data, variables) => {
      setSubmittedEmail(variables.email);
      setSubmitted(true);
    },
    onError: (err) => {
      setServerError(err.message ?? "Something went wrong. Please try again.");
    },
  });

  const resendMutation = trpc.auth.resendVerification.useMutation();

  const onSubmit = (values: FormValues) => {
    setServerError(null);
    if (!turnstileToken) {
      setServerError("Please complete the bot protection check before submitting.");
      return;
    }
    selfRegisterMutation.mutate({
      email: values.email,
      password: values.password,
      firstName: values.firstName,
      lastName: values.lastName,
      acceptedTerms: true,
      origin: window.location.origin,
      turnstileToken,
    });
  };

  const handleTurnstileError = () => {
    setTurnstileToken(null);
    setServerError("Bot protection check failed. Please refresh and try again.");
  };

  // ── Post-submit: check your email state ──────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-[440px] text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-7 h-7 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground mb-2">Check your email</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a verification link to{" "}
              <span className="font-medium text-foreground">{submittedEmail}</span>.
              Click the link to activate your account.
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 text-left space-y-3">
            <p className="text-xs text-muted-foreground">
              Didn't receive it? Check your spam folder, or resend the link.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={resendMutation.isPending || resendMutation.isSuccess}
              onClick={() =>
                resendMutation.mutate({
                  email: submittedEmail,
                  origin: window.location.origin,
                })
              }
            >
              {resendMutation.isSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                  Sent
                </>
              ) : resendMutation.isPending ? (
                "Sending…"
              ) : (
                "Resend verification email"
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Already verified?{" "}
            <Link href="/login">
              <span className="font-medium text-primary cursor-pointer hover:underline">Sign in</span>
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Sign-up form ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ background: "var(--background)" }}>
      {/* Left brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[400px] shrink-0 p-10"
        style={{ background: "linear-gradient(160deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)" }}
      >
        <div>
          <span className="text-2xl font-bold tracking-tight text-white">
            A<span className="text-primary">i</span>Q
          </span>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white leading-snug mb-3">
            Know exactly where you stand on AI
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            A free, adaptive capability assessment that gives you a verified score across the six domains that matter most for HR professionals.
          </p>
          <div className="mt-10 space-y-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(94,232,176,0.12)" }}>
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-0.5">{f.label}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          &copy; {new Date().getFullYear()} AiQ. HR Capability Intelligence.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <span className="text-2xl font-bold tracking-tight text-foreground">
            A<span className="text-primary">i</span>Q
          </span>
        </div>

        <div className="w-full max-w-[440px]">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground mb-1">Create your free account</h1>
            <p className="text-sm text-muted-foreground">
              Get your full AI capability score in 15 minutes — no credit card required.
            </p>
          </div>

          {serverError && (
            <Alert variant="destructive" className="mb-5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs font-medium">First name</Label>
                <Input id="firstName" placeholder="Jane" className="h-10" autoComplete="given-name" {...register("firstName")} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs font-medium">Last name</Label>
                <Input id="lastName" placeholder="Smith" className="h-10" autoComplete="family-name" {...register("lastName")} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">Email address</Label>
              <Input id="email" type="email" placeholder="you@example.com" className="h-10" autoComplete="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="h-10 pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-medium">Confirm password</Label>
              <Input id="confirmPassword" type="password" placeholder="Re-enter password" autoComplete="new-password" className="h-10" {...register("confirmPassword")} />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>

            {/* T&C checkbox — unticked by default (UK GDPR/PECR) */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="acceptedTerms"
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                {...register("acceptedTerms")}
              />
              <label htmlFor="acceptedTerms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">Terms of Service</a>
                {" "}and{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">Privacy Policy</a>
              </label>
            </div>
            {errors.acceptedTerms && <p className="text-xs text-destructive -mt-2">{errors.acceptedTerms.message}</p>}

            {/* C-3: Cloudflare Turnstile bot protection */}
            <div className="flex justify-center pt-1">
              <Turnstile
                ref={turnstileRef}
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ""}
                onSuccess={(token) => setTurnstileToken(token)}
                onError={handleTurnstileError}
                onExpire={() => setTurnstileToken(null)}
                options={{ theme: "dark", size: "normal" }}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-semibold text-sm mt-1"
              disabled={selfRegisterMutation.isPending || !turnstileToken}
            >
              {selfRegisterMutation.isPending ? "Creating account…" : "Create free account"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login">
              <span className="font-medium text-primary cursor-pointer hover:underline">Sign in</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
