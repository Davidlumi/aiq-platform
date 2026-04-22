/**
 * AiQ Beta Application Page
 *
 * Public page — no authentication required.
 * Route: /beta
 *
 * Company-level application form. Validates that hrTeamSize >= 10 before
 * submitting. Shows a friendly ineligibility message for smaller teams.
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Users,
  Building2,
  FlaskConical,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Application received</h1>
        <p className="text-slate-600 mb-2">
          Thank you — we have received the beta application for{" "}
          <span className="font-semibold text-slate-900">{companyName}</span>.
        </p>
        <p className="text-slate-600 mb-8">
          We review applications within 3 business days and will be in touch by email with a
          decision and, if approved, onboarding details.
        </p>
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-left mb-8">
          <h3 className="font-semibold text-slate-900 mb-3 text-sm">What happens next</h3>
          <div className="space-y-3">
            {[
              { step: "1", text: "We review your application against our beta criteria" },
              { step: "2", text: "You receive an email decision within 3 business days" },
              { step: "3", text: "If approved, we schedule a 30-minute onboarding call" },
              { step: "4", text: "Your team gets full platform access — no per-seat limit" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-violet-700 text-xs font-bold">{item.step}</span>
                </div>
                <p className="text-slate-600 text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
        <Link href="/">
          <Button variant="outline" className="border-slate-300">
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <Users className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
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
          <Button variant="outline" className="border-slate-300">
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Already on file</h1>
        <p className="text-slate-600 mb-8">{message}</p>
        <Link href="/">
          <Button variant="outline" className="border-slate-300">
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
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-6 h-16 flex items-center">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900">AiQ</span>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <Badge className="mb-4 bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100">
            <FlaskConical className="w-3 h-3 mr-1.5" />
            Free beta programme
          </Badge>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            Apply for the AiQ beta programme
          </h1>
          <p className="text-slate-600 text-lg max-w-xl">
            Complete this form to apply for a free place in our founding cohort. We review
            applications within 3 business days.
          </p>
          <div className="flex flex-wrap gap-4 mt-5">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users className="w-4 h-4 text-violet-600" />
              Requires 10+ HR professionals
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Building2 className="w-4 h-4 text-violet-600" />
              Company-level application
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-violet-600" />
              No commitment required
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

          {/* Contact details */}
          <Card className="border-slate-200">
            <CardContent className="p-6 space-y-5">
              <h2 className="font-semibold text-slate-900 text-lg border-b border-slate-100 pb-3">
                Your contact details
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contactFirstName">First name <span className="text-red-500">*</span></Label>
                  <Input
                    id="contactFirstName"
                    placeholder="Sarah"
                    {...register("contactFirstName")}
                    className={errors.contactFirstName ? "border-red-400" : ""}
                  />
                  {errors.contactFirstName && (
                    <p className="text-red-500 text-xs">{errors.contactFirstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactLastName">Last name <span className="text-red-500">*</span></Label>
                  <Input
                    id="contactLastName"
                    placeholder="Thornton"
                    {...register("contactLastName")}
                    className={errors.contactLastName ? "border-red-400" : ""}
                  />
                  {errors.contactLastName && (
                    <p className="text-red-500 text-xs">{errors.contactLastName.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactEmail">Work email <span className="text-red-500">*</span></Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="sarah.thornton@company.com"
                  {...register("contactEmail")}
                  className={errors.contactEmail ? "border-red-400" : ""}
                />
                {errors.contactEmail && (
                  <p className="text-red-500 text-xs">{errors.contactEmail.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactTitle">Job title <span className="text-red-500">*</span></Label>
                <Input
                  id="contactTitle"
                  placeholder="Chief People Officer"
                  {...register("contactTitle")}
                  className={errors.contactTitle ? "border-red-400" : ""}
                />
                {errors.contactTitle && (
                  <p className="text-red-500 text-xs">{errors.contactTitle.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="linkedinUrl">LinkedIn profile URL <span className="text-slate-400 text-xs">(optional)</span></Label>
                <Input
                  id="linkedinUrl"
                  type="url"
                  placeholder="https://linkedin.com/in/sarahthornton"
                  {...register("linkedinUrl")}
                  className={errors.linkedinUrl ? "border-red-400" : ""}
                />
                {errors.linkedinUrl && (
                  <p className="text-red-500 text-xs">{errors.linkedinUrl.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Organisation details */}
          <Card className="border-slate-200">
            <CardContent className="p-6 space-y-5">
              <h2 className="font-semibold text-slate-900 text-lg border-b border-slate-100 pb-3">
                Your organisation
              </h2>
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Organisation name <span className="text-red-500">*</span></Label>
                <Input
                  id="companyName"
                  placeholder="Meridian Group"
                  {...register("companyName")}
                  className={errors.companyName ? "border-red-400" : ""}
                />
                {errors.companyName && (
                  <p className="text-red-500 text-xs">{errors.companyName.message}</p>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Sector <span className="text-red-500">*</span></Label>
                  <Select onValueChange={(v) => setValue("sector", v as typeof SECTORS[number])}>
                    <SelectTrigger className={errors.sector ? "border-red-400" : ""}>
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.sector && (
                    <p className="text-red-500 text-xs">{errors.sector.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Total company size <span className="text-red-500">*</span></Label>
                  <Select onValueChange={(v) => setValue("companySize", v as typeof COMPANY_SIZES[number])}>
                    <SelectTrigger className={errors.companySize ? "border-red-400" : ""}>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>{s} employees</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.companySize && (
                    <p className="text-red-500 text-xs">{errors.companySize.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hrTeamSize">
                  Number of HR professionals in your team <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="hrTeamSize"
                  type="number"
                  min={1}
                  placeholder="e.g. 42"
                  {...register("hrTeamSize")}
                  className={errors.hrTeamSize ? "border-red-400" : ""}
                />
                {errors.hrTeamSize && (
                  <p className="text-red-500 text-xs">{errors.hrTeamSize.message}</p>
                )}
                {hrTeamSize > 0 && hrTeamSize < 10 && !errors.hrTeamSize && (
                  <div className="flex items-start gap-2 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-700 text-xs leading-relaxed">
                      The free beta programme requires at least 10 HR professionals. You can still
                      submit — we will note your interest for our upcoming self-serve tier.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Use case */}
          <Card className="border-slate-200">
            <CardContent className="p-6 space-y-5">
              <h2 className="font-semibold text-slate-900 text-lg border-b border-slate-100 pb-3">
                Your context
              </h2>
              <div className="space-y-1.5">
                <Label htmlFor="useCase">
                  How is your HR team currently using AI tools? <span className="text-red-500">*</span>
                </Label>
                <p className="text-slate-500 text-xs">
                  Describe the specific workflows, tools, or processes where AI is involved. Be as specific as possible.
                </p>
                <Textarea
                  id="useCase"
                  rows={4}
                  placeholder="e.g. We use Copilot for drafting job descriptions and policy summaries, and are piloting an AI-assisted CV screening tool for our talent acquisition team. We also use ChatGPT informally for ER letter drafting..."
                  {...register("useCase")}
                  className={errors.useCase ? "border-red-400" : ""}
                />
                {errors.useCase && (
                  <p className="text-red-500 text-xs">{errors.useCase.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currentAiTools">
                  Which AI tools does your team use? <span className="text-slate-400 text-xs">(optional)</span>
                </Label>
                <Input
                  id="currentAiTools"
                  placeholder="e.g. Microsoft Copilot, ChatGPT, Workday AI, Beamery..."
                  {...register("currentAiTools")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="motivation">
                  Why do you want to join the AiQ beta? <span className="text-red-500">*</span>
                </Label>
                <p className="text-slate-500 text-xs">
                  What specific problem are you trying to solve? What would a successful outcome look like for your team?
                </p>
                <Textarea
                  id="motivation"
                  rows={4}
                  placeholder="e.g. We are rolling out Copilot to our entire HR function in Q3 and need to understand where our capability gaps are before we do. We want to be able to demonstrate to our board that our team is AI-ready..."
                  {...register("motivation")}
                  className={errors.motivation ? "border-red-400" : ""}
                />
                {errors.motivation && (
                  <p className="text-red-500 text-xs">{errors.motivation.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          {submitMutation.isError && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 text-sm">Submission failed</p>
                <p className="text-red-600 text-sm mt-0.5">
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
              className="bg-violet-600 hover:bg-violet-700 text-white px-8 h-12 font-semibold flex-shrink-0"
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
