/**
 * AiQ Beta Application Page
 *
 * Public page — no authentication required.
 * Route: /beta
 *
 * Brand: Dark Slate (#1E293B) nav/header, Primary Green (#10B981) CTAs,
 *        Mint Accent (var(--primary)) highlights, AiQ logo with smile.
 */

import { useState } from "react";
import { Link } from "wouter";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Users,
  Building2,
  FlaskConical,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// ─── AiQ Logo SVG ─────────────────────────────────────────────────────────────

function AiQLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-label="AiQ logo">
      <circle cx="100" cy="100" r="90" fill="#1E293B" />
      <text
        x="100"
        y="120"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="64"
        fontWeight="800"
        fill="white"
        textAnchor="middle"
        letterSpacing="-3"
      >
        A<tspan fill="var(--primary)">i</tspan>Q
      </text>
      <path
        d="M 60 135 Q 100 150 140 135"
        stroke="var(--primary)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Schema (mirrors server-side) ─────────────────────────────────────────────

const SECTORS = [
  "Financial Services",
  "Healthcare",
  "Retail",
  "Manufacturing",
  "Technology",
  "Financial Technology",
  "Professional Services",
  "Logistics & Supply Chain",
  "Banking",
  "Public Sector / Government",
  "Education",
  "Energy & Utilities",
  "Luxury Retail",
  "IT Services",
  "Other",
] as const;

const COMPANY_SIZES = [
  "1-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001-10000",
  "10001-50000",
  "50000+",
] as const;

const formSchema = z.object({
  contactFirstName: z.string().min(1, "First name is required").max(100),
  contactLastName:  z.string().min(1, "Last name is required").max(100),
  contactEmail:     z.string().email("Please enter a valid email address").max(255),
  contactTitle:     z.string().min(1, "Job title is required").max(150),
  companyName:      z.string().min(1, "Company name is required").max(200),
  sector:           z.enum(SECTORS),
  companySize:      z.enum(COMPANY_SIZES),
  hrTeamSize:       z.coerce.number().int().min(1, "Please enter a valid number").max(100000),
  useCase:          z.string().min(20, "Please describe your use case (at least 20 characters)").max(2000),
  currentAiTools:   z.string().max(500).optional(),
  motivation:       z.string().min(20, "Please tell us more (at least 20 characters)").max(2000),
  linkedinUrl:      z.string().max(500).optional(),
});

type FormData = z.infer<typeof formSchema>;

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ companyName }: { companyName: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#F7F8FA" }}>
      <div className="max-w-lg w-full text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
        >
          <CheckCircle2 className="w-8 h-8" style={{ color: "var(--primary)" }} />
        </div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: "#0E1726" }}>
          Application received
        </h1>
        <p className="text-slate-600 mb-2">
          Thank you — we have received the beta application for{" "}
          <span className="font-semibold" style={{ color: "#0E1726" }}>{companyName}</span>.
        </p>
        <p className="text-slate-600 mb-8">
          We review applications within 3 business days and will be in touch by email with a
          decision and, if approved, onboarding details.
        </p>
        <div
          className="rounded-xl border p-6 text-left mb-8"
          style={{ background: "#FFFFFF", borderColor: "#E5E7EB" }}
        >
          <h3 className="font-semibold text-sm mb-3" style={{ color: "#0E1726" }}>
            What happens next
          </h3>
          <div className="space-y-3">
            {[
              { step: "1", text: "We review your application against our beta criteria" },
              { step: "2", text: "You receive an email decision within 3 business days" },
              { step: "3", text: "If approved, we schedule a 30-minute onboarding call" },
              { step: "4", text: "Your team gets full platform access — no per-seat limit" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
                >
                  <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>
                    {item.step}
                  </span>
                </div>
                <p className="text-slate-600 text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
        <Link href="/">
          <Button
            variant="outline"
            style={{ borderColor: "#E5E7EB", color: "#1E293B" }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Ineligible screen ────────────────────────────────────────────────────────

function IneligibleScreen({ hrTeamSize }: { hrTeamSize: number }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#F7F8FA" }}>
      <div className="max-w-lg w-full text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(204,187,68,0.12)" }}
        >
          <Users className="w-8 h-8" style={{ color: "#CCBB44" }} />
        </div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: "#0E1726" }}>
          Not eligible for this cohort
        </h1>
        <p className="text-slate-600 mb-4">
          The free beta programme is currently open to organisations with at least{" "}
          <span className="font-semibold">10 HR professionals</span>. Your team of{" "}
          <span className="font-semibold">{hrTeamSize}</span> does not meet this threshold.
        </p>
        <p className="text-slate-600 mb-8">
          We are building a self-serve tier for smaller HR teams and will be launching later this
          year. We have noted your interest and will be in touch when it is available.
        </p>
        <Link href="/">
          <Button variant="outline" style={{ borderColor: "#E5E7EB", color: "#1E293B" }}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Duplicate screen ─────────────────────────────────────────────────────────

function DuplicateScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#F7F8FA" }}>
      <div className="max-w-lg w-full text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(68,119,170,0.12)" }}
        >
          <AlertCircle className="w-8 h-8" style={{ color: "#4477AA" }} />
        </div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: "#0E1726" }}>
          Already on file
        </h1>
        <p className="text-slate-600 mb-8">{message}</p>
        <Link href="/">
          <Button variant="outline" style={{ borderColor: "#E5E7EB", color: "#1E293B" }}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function BetaApplicationPage() {
  const [result, setResult] = useState<{
    type: "success" | "ineligible" | "duplicate";
    companyName?: string;
    hrTeamSize?: number;
    message?: string;
  } | null>(null);

  const submitMutation = trpc.waitlist.submit.useMutation({
    onSuccess: (data, variables) => {
      if (!data.eligible) {
        setResult({ type: "ineligible", hrTeamSize: variables.hrTeamSize });
      } else if ((data as { eligible: true; duplicate?: boolean; message?: string }).duplicate) {
        setResult({ type: "duplicate", message: (data as { eligible: true; duplicate?: boolean; message?: string }).message });
      } else {
        setResult({ type: "success", companyName: variables.companyName });
      }
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormData>({ resolver: zodResolver(formSchema) as any, defaultValues: { linkedinUrl: "", currentAiTools: "" } });

  const hrTeamSize = watch("hrTeamSize");

  const onSubmit: SubmitHandler<FormData> = (data) => {
    submitMutation.mutate(data);
  };

  // ── Result screens ──────────────────────────────────────────────────────────
  if (result?.type === "success") {
    return <SuccessScreen companyName={result.companyName!} />;
  }
  if (result?.type === "ineligible") {
    return <IneligibleScreen hrTeamSize={result.hrTeamSize!} />;
  }
  if (result?.type === "duplicate") {
    return <DuplicateScreen message={result.message!} />;
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "#F7F8FA" }}>
      {/* Nav */}
      <nav
        className="border-b px-6 h-16 flex items-center"
        style={{ background: "#1E293B", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <AiQLogo size={32} />
              <span className="font-bold text-white">HR AiQ</span>
            </div>
          </Link>
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div
        className="border-b py-10 px-6"
        style={{ background: "#1E293B", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium mb-4"
            style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 25%, transparent)" }}
          >
            <FlaskConical className="w-3 h-3" />
            Free beta programme
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Apply for the AiQ beta programme
          </h1>
          <p className="text-slate-300 text-lg max-w-xl">
            Complete this form to apply for a free place in our founding cohort. We review
            all applications within 3 business days.
          </p>
          <div className="flex flex-wrap gap-4 mt-5">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Users className="w-4 h-4" style={{ color: "var(--primary)" }} />
              Requires 10+ HR professionals
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Building2 className="w-4 h-4" style={{ color: "var(--primary)" }} />
              Company-level application
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle2 className="w-4 h-4" style={{ color: "var(--primary)" }} />
              No commitment required
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

          {/* Contact details */}
          <Card style={{ borderColor: "#E5E7EB", background: "#FFFFFF" }}>
            <CardContent className="p-6 space-y-5">
              <h2
                className="font-semibold text-lg border-b pb-3"
                style={{ color: "#0E1726", borderColor: "#F3F4F6" }}
              >
                Your contact details
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contactFirstName">
                    First name <span className="text-[#CC3344]">*</span>
                  </Label>
                  <Input
                    id="contactFirstName"
                    placeholder="Sarah"
                    {...register("contactFirstName")}
                    className={errors.contactFirstName ? "border-destructive" : ""}
                  />
                  {errors.contactFirstName && (
                    <p className="text-[#CC3344] text-xs">{errors.contactFirstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactLastName">
                    Last name <span className="text-[#CC3344]">*</span>
                  </Label>
                  <Input
                    id="contactLastName"
                    placeholder="Thornton"
                    {...register("contactLastName")}
                    className={errors.contactLastName ? "border-destructive" : ""}
                  />
                  {errors.contactLastName && (
                    <p className="text-[#CC3344] text-xs">{errors.contactLastName.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactEmail">
                  Work email <span className="text-[#CC3344]">*</span>
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="sarah.thornton@company.com"
                  {...register("contactEmail")}
                  className={errors.contactEmail ? "border-destructive" : ""}
                />
                {errors.contactEmail && (
                  <p className="text-[#CC3344] text-xs">{errors.contactEmail.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactTitle">
                  Job title <span className="text-[#CC3344]">*</span>
                </Label>
                <Input
                  id="contactTitle"
                  placeholder="Chief People Officer"
                  {...register("contactTitle")}
                  className={errors.contactTitle ? "border-destructive" : ""}
                />
                {errors.contactTitle && (
                  <p className="text-[#CC3344] text-xs">{errors.contactTitle.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="linkedinUrl">
                  LinkedIn profile URL{" "}
                  <span className="text-slate-400 text-xs">(optional)</span>
                </Label>
                <Input
                  id="linkedinUrl"
                  type="url"
                  placeholder="https://linkedin.com/in/sarahthornton"
                  {...register("linkedinUrl")}
                  className={errors.linkedinUrl ? "border-destructive" : ""}
                />
                {errors.linkedinUrl && (
                  <p className="text-[#CC3344] text-xs">{errors.linkedinUrl.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Organisation details */}
          <Card style={{ borderColor: "#E5E7EB", background: "#FFFFFF" }}>
            <CardContent className="p-6 space-y-5">
              <h2
                className="font-semibold text-lg border-b pb-3"
                style={{ color: "#0E1726", borderColor: "#F3F4F6" }}
              >
                Your organisation
              </h2>
              <div className="space-y-1.5">
                <Label htmlFor="companyName">
                  Organisation name <span className="text-[#CC3344]">*</span>
                </Label>
                <Input
                  id="companyName"
                  placeholder="Meridian Group"
                  {...register("companyName")}
                  className={errors.companyName ? "border-destructive" : ""}
                />
                {errors.companyName && (
                  <p className="text-[#CC3344] text-xs">{errors.companyName.message}</p>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Sector <span className="text-[#CC3344]">*</span></Label>
                  <Select onValueChange={(v) => setValue("sector", v as typeof SECTORS[number])}>
                    <SelectTrigger className={errors.sector ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.sector && (
                    <p className="text-[#CC3344] text-xs">{errors.sector.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Total company size <span className="text-[#CC3344]">*</span></Label>
                  <Select onValueChange={(v) => setValue("companySize", v as typeof COMPANY_SIZES[number])}>
                    <SelectTrigger className={errors.companySize ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>{s} employees</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.companySize && (
                    <p className="text-[#CC3344] text-xs">{errors.companySize.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hrTeamSize">
                  Number of HR professionals in your team <span className="text-[#CC3344]">*</span>
                </Label>
                <Input
                  id="hrTeamSize"
                  type="number"
                  min={1}
                  placeholder="e.g. 42"
                  {...register("hrTeamSize")}
                  className={errors.hrTeamSize ? "border-destructive" : ""}
                />
                {errors.hrTeamSize && (
                  <p className="text-[#CC3344] text-xs">{errors.hrTeamSize.message}</p>
                )}
                {hrTeamSize > 0 && hrTeamSize < 10 && !errors.hrTeamSize && (
                  <div
                    className="flex items-start gap-2 mt-2 p-3 rounded-lg"
                    style={{ background: "rgba(204,187,68,0.06)", border: "1px solid rgba(204,187,68,0.25)" }}
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#CCBB44" }} />
                    <p className="text-xs leading-relaxed" style={{ color: "#92400E" }}>
                      The free beta programme requires at least 10 HR professionals. You can still
                      submit — we will note your interest for our upcoming self-serve tier.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Use case */}
          <Card style={{ borderColor: "#E5E7EB", background: "#FFFFFF" }}>
            <CardContent className="p-6 space-y-5">
              <h2
                className="font-semibold text-lg border-b pb-3"
                style={{ color: "#0E1726", borderColor: "#F3F4F6" }}
              >
                Your context
              </h2>
              <div className="space-y-1.5">
                <Label htmlFor="useCase">
                  How is your HR team currently using AI tools?{" "}
                  <span className="text-[#CC3344]">*</span>
                </Label>
                <p className="text-slate-500 text-xs">
                  Describe the specific workflows, tools, or processes where AI is involved. Be as specific as possible.
                </p>
                <Textarea
                  id="useCase"
                  rows={4}
                  placeholder="e.g. We use Copilot for drafting job descriptions and policy summaries, and are piloting an AI-assisted CV screening tool for our talent acquisition team..."
                  {...register("useCase")}
                  className={errors.useCase ? "border-destructive" : ""}
                />
                {errors.useCase && (
                  <p className="text-[#CC3344] text-xs">{errors.useCase.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currentAiTools">
                  Which AI tools does your team use?{" "}
                  <span className="text-slate-400 text-xs">(optional)</span>
                </Label>
                <Input
                  id="currentAiTools"
                  placeholder="e.g. Microsoft Copilot, ChatGPT, Workday AI, Beamery..."
                  {...register("currentAiTools")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="motivation">
                  Why do you want to join the AiQ beta?{" "}
                  <span className="text-[#CC3344]">*</span>
                </Label>
                <p className="text-slate-500 text-xs">
                  What specific problem are you trying to solve? What would a successful outcome look like for your team?
                </p>
                <Textarea
                  id="motivation"
                  rows={4}
                  placeholder="e.g. We are rolling out Copilot to our entire HR function in Q3 and need to understand where our capability gaps are before we do..."
                  {...register("motivation")}
                  className={errors.motivation ? "border-destructive" : ""}
                />
                {errors.motivation && (
                  <p className="text-[#CC3344] text-xs">{errors.motivation.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          {submitMutation.isError && (
            <div
              className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: "rgba(238,102,119,0.06)", border: "1px solid rgba(238,102,119,0.25)" }}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#EE6677" }} />
              <div>
                <p className="font-medium text-sm" style={{ color: "#991B1B" }}>
                  Submission failed
                </p>
                <p className="text-sm mt-0.5" style={{ color: "#EE6677" }}>
                  {submitMutation.error?.message ?? "An unexpected error occurred. Please try again."}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <p className="text-slate-500 text-xs max-w-sm">
              By submitting this form you agree to be contacted about the AiQ beta programme.
              We will not share your details with third parties.
            </p>
            <Button
              type="submit"
              size="lg"
              disabled={submitMutation.isPending}
              className="px-8 h-12 font-bold flex-shrink-0 hover:opacity-90"
              style={{ background: "var(--primary)", color: "white" }}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit application"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
