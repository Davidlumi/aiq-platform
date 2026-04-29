/**
 * AiQ Beta Programme Page — v3.0
 * Copy: AiQ_Marketing_Site_Copy_v3.docx
 *
 * Public page — no authentication required.
 * Route: /beta
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
  Loader2,
  Star,
  MessageSquare,
  Zap,
  BarChart3,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { MarketingNav, MarketingFooter } from "./MarketingPage";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const navy   = "#0F172A";
const slate  = "#1E293B";
const border = "rgba(255,255,255,0.08)";
const green  = "var(--primary)";

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
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />
      <div className="flex items-center justify-center px-6 py-24">
        <div className="max-w-lg w-full text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(34,197,94,0.12)" }}
          >
            <CheckCircle2 className="w-8 h-8" style={{ color: green }} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            Application received
          </h1>
          <p className="text-slate-300 mb-2">
            Thank you — we have received the application for{" "}
            <span className="font-semibold text-white">{companyName}</span>.
          </p>
          <p className="text-slate-400 mb-8">
            We respond to every application within five business days, even if the answer is no.
            If you look like a fit, we will be in touch to arrange a one-hour conversation.
          </p>
          <div
            className="rounded-xl border p-6 text-left mb-8"
            style={{ background: slate, borderColor: border }}
          >
            <h3 className="font-semibold text-white mb-4">What happens next</h3>
            <div className="space-y-4">
              {[
                { step: "01", label: "Apply", text: "We review your application against our beta criteria" },
                { step: "02", label: "Conversation", text: "If you look like a fit, we schedule a one-hour call to learn about your specific situation" },
                { step: "03", label: "Pilot", text: "If we both want to proceed, we agree the commercial structure and begin onboarding" },
                { step: "04", label: "Loop", text: "The loop runs — quarterly reviews, roadmap input, and close collaboration throughout" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                    style={{ background: "rgba(34,197,94,0.12)", color: green }}
                  >
                    {item.step}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    <p className="text-slate-400 text-sm">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to home
            </Button>
          </Link>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}

// ─── Ineligible screen ────────────────────────────────────────────────────────
function IneligibleScreen({ hrTeamSize }: { hrTeamSize: number }) {
  return (
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />
      <div className="flex items-center justify-center px-6 py-24">
        <div className="max-w-lg w-full text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(204,187,68,0.12)" }}
          >
            <Users className="w-8 h-8" style={{ color: "#D97706" }} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            Not a fit for this cohort
          </h1>
          <p className="text-slate-300 mb-4">
            The AiQ beta programme is currently open to organisations with at least{" "}
            <span className="font-semibold text-white">25 HR professionals</span>. Your team of{" "}
            <span className="font-semibold text-white">{hrTeamSize}</span> is below that threshold.
          </p>
          <p className="text-slate-400 mb-8">
            The unit economics do not work yet for smaller functions, and we would rather tell you
            that than waste your time. We are building a self-serve tier for smaller HR teams and
            will be in touch when it is available.
          </p>
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to home
            </Button>
          </Link>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}

// ─── Duplicate screen ─────────────────────────────────────────────────────────
function DuplicateScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />
      <div className="flex items-center justify-center px-6 py-24">
        <div className="max-w-lg w-full text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(68,119,170,0.12)" }}
          >
            <AlertCircle className="w-8 h-8" style={{ color: "#4477AA" }} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            Already on file
          </h1>
          <p className="text-slate-300 mb-8">{message}</p>
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to home
            </Button>
          </Link>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
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

  if (result?.type === "success") {
    return <SuccessScreen companyName={result.companyName!} />;
  }
  if (result?.type === "ineligible") {
    return <IneligibleScreen hrTeamSize={result.hrTeamSize!} />;
  }
  if (result?.type === "duplicate") {
    return <DuplicateScreen message={result.message!} />;
  }

  return (
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />

      {/* Hero */}
      <section className="pt-24 pb-16 px-6" style={{ background: navy, borderBottom: `1px solid ${border}` }}>
        <div className="max-w-4xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{ background: "rgba(34,197,94,0.12)", color: green, border: "1px solid rgba(34,197,94,0.25)" }}
          >
            Beta Programme
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6" style={{ letterSpacing: "-0.02em" }}>
            Apply to join the AiQ Beta cohort.
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl leading-relaxed">
            We work with a small number of CPOs to refine AiQ with real customer signal before
            general availability.
          </p>
          <div className="flex flex-wrap gap-6 mt-8">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Users className="w-4 h-4 flex-shrink-0" style={{ color: green }} />
              25+ HR professionals required
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Building2 className="w-4 h-4 flex-shrink-0" style={{ color: green }} />
              UK enterprise organisations
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: green }} />
              Response within five business days
            </div>
          </div>
        </div>
      </section>

      {/* What you get / What we need */}
      <section className="py-16 px-6" style={{ background: slate }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-xl font-bold text-white mb-6">What you get</h2>
              <div className="space-y-4">
                {[
                  { icon: BarChart3, text: "Full platform access for your HR function — assessment, diagnosis, personalised development, three-altitude dashboards, board-ready exports, the full strategic capability layer" },
                  { icon: MessageSquare, text: "Direct access to the founders during the beta period — for product feedback, customer success support, and roadmap input" },
                  { icon: Star, text: "Beta pricing — meaningfully below general availability pricing, structured to reflect that you are shaping the product, not just consuming it" },
                  { icon: Zap, text: "Onboarding designed to fit your function — including your AI roadmap capture, role mapping, and policy configuration" },
                  { icon: CheckCircle2, text: "Quarterly business review with the team to review impact, surface issues, and discuss roadmap priorities" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <item.icon className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: green }} />
                    <p className="text-slate-300 text-sm leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-6">What we need from you</h2>
              <div className="space-y-4">
                {[
                  "Active engagement during onboarding — the first 30 days set the trajectory of the engagement, and that requires CPO time, not just delegation to L&D",
                  "Honest feedback as the platform evolves — what is working, what is not, what is missing, what is wrong",
                  "Willingness to be a reference at some point — not initially, but eventually, once we have delivered enough value that referencing AiQ is reciprocal",
                  "Realistic expectations — the platform works and the methodology is rigorous, but visual craft and certain features are still maturing",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style={{ background: green }} />
                    <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who we are looking for */}
      <section className="py-16 px-6" style={{ background: navy }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-3">Who we are looking for</h2>
          <p className="text-slate-300 mb-8">
            UK enterprise CPOs and HR Directors with functions of 25+ HR people, in organisations
            that have made specific AI commitments their HR function is responsible for delivering against.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <div
              className="rounded-xl p-6 border"
              style={{ background: slate, borderColor: "rgba(34,197,94,0.2)" }}
            >
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: green }} />
                You are a strong fit if:
              </h3>
              <div className="space-y-3">
                {[
                  "Your business has AI initiatives with specific timelines and your function has been told to support them",
                  "You are answering specific questions from your CEO, your General Counsel, or your board about HR's AI capability state",
                  "You believe measurement and rigour matter for capability work — even when the measurement is uncomfortable",
                  "You want to influence how this category gets built, not just consume what someone else builds",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style={{ background: green }} />
                    <p className="text-slate-300 text-sm">{text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div
              className="rounded-xl p-6 border"
              style={{ background: slate, borderColor: border }}
            >
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-400" />
                You are probably not a fit if:
              </h3>
              <div className="space-y-3">
                {[
                  "You need a finished product with proven case studies — we are earlier than that",
                  "Your function is under 25 HR people — the unit economics do not work yet, and we would rather tell you that than waste your time",
                  "You are looking primarily for content — there are larger learning libraries available; AiQ's value is the diagnostic and strategic intelligence layer",
                  "You are shopping for the cheapest option — beta pricing is reduced but the full proposition is sized for enterprise budget",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 bg-slate-500" />
                    <p className="text-slate-400 text-sm">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6" style={{ background: slate }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-10">How it works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: "01",
                label: "Apply",
                text: "Tell us about your function, your business AI commitments, and what you are hoping to get from AiQ. The application is brief — we do not need a thesis.",
              },
              {
                num: "02",
                label: "Conversation",
                text: "If you look like a fit, we will have a one-hour conversation. You learn more about AiQ; we learn about your specific situation.",
              },
              {
                num: "03",
                label: "Pilot",
                text: "If we both want to proceed, we agree the commercial structure and start the onboarding — approximately four weeks.",
              },
              {
                num: "04",
                label: "Loop",
                text: "From there, the loop runs. Quarterly business reviews surface what is working and what needs to change.",
              },
            ].map((step) => (
              <div key={step.num} className="flex flex-col gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: "rgba(34,197,94,0.12)", color: green }}
                >
                  {step.num}
                </div>
                <h3 className="font-semibold text-white">{step.label}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application form */}
      <section className="py-16 px-6" style={{ background: navy }}>
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">Application form</h2>
            <p className="text-slate-400">
              We respond to every application within five business days, even if the answer is no.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Contact details */}
            <Card style={{ borderColor: border, background: slate }}>
              <CardContent className="p-6 space-y-5">
                <h3 className="font-semibold text-white border-b pb-3" style={{ borderColor: border }}>
                  Your contact details
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">
                      First name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="Sarah"
                      {...register("contactFirstName")}
                      className={`border-slate-600 text-white placeholder:text-slate-500 ${errors.contactFirstName ? "border-destructive" : ""}`}
                      style={{ background: navy }}
                    />
                    {errors.contactFirstName && (
                      <p className="text-destructive text-xs">{errors.contactFirstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">
                      Last name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="Thornton"
                      {...register("contactLastName")}
                      className={`border-slate-600 text-white placeholder:text-slate-500 ${errors.contactLastName ? "border-destructive" : ""}`}
                      style={{ background: navy }}
                    />
                    {errors.contactLastName && (
                      <p className="text-destructive text-xs">{errors.contactLastName.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">
                    Work email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="sarah.thornton@company.com"
                    {...register("contactEmail")}
                    className={`border-slate-600 text-white placeholder:text-slate-500 ${errors.contactEmail ? "border-destructive" : ""}`}
                    style={{ background: navy }}
                  />
                  {errors.contactEmail && (
                    <p className="text-destructive text-xs">{errors.contactEmail.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">
                    Job title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Chief People Officer"
                    {...register("contactTitle")}
                    className={`border-slate-600 text-white placeholder:text-slate-500 ${errors.contactTitle ? "border-destructive" : ""}`}
                    style={{ background: navy }}
                  />
                  {errors.contactTitle && (
                    <p className="text-destructive text-xs">{errors.contactTitle.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">
                    LinkedIn profile URL{" "}
                    <span className="text-slate-500 text-xs">(optional)</span>
                  </Label>
                  <Input
                    type="url"
                    placeholder="https://linkedin.com/in/sarahthornton"
                    {...register("linkedinUrl")}
                    className={`border-slate-600 text-white placeholder:text-slate-500 ${errors.linkedinUrl ? "border-destructive" : ""}`}
                    style={{ background: navy }}
                  />
                  {errors.linkedinUrl && (
                    <p className="text-destructive text-xs">{errors.linkedinUrl.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Organisation details */}
            <Card style={{ borderColor: border, background: slate }}>
              <CardContent className="p-6 space-y-5">
                <h3 className="font-semibold text-white border-b pb-3" style={{ borderColor: border }}>
                  Your organisation
                </h3>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">
                    Organisation name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Meridian Group"
                    {...register("companyName")}
                    className={`border-slate-600 text-white placeholder:text-slate-500 ${errors.companyName ? "border-destructive" : ""}`}
                    style={{ background: navy }}
                  />
                  {errors.companyName && (
                    <p className="text-destructive text-xs">{errors.companyName.message}</p>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">
                      Sector <span className="text-destructive">*</span>
                    </Label>
                    <Select onValueChange={(v) => setValue("sector", v as typeof SECTORS[number])}>
                      <SelectTrigger
                        className={`border-slate-600 text-white ${errors.sector ? "border-destructive" : ""}`}
                        style={{ background: navy }}
                      >
                        <SelectValue placeholder="Select sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTORS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.sector && (
                      <p className="text-destructive text-xs">{errors.sector.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">
                      Total company size <span className="text-destructive">*</span>
                    </Label>
                    <Select onValueChange={(v) => setValue("companySize", v as typeof COMPANY_SIZES[number])}>
                      <SelectTrigger
                        className={`border-slate-600 text-white ${errors.companySize ? "border-destructive" : ""}`}
                        style={{ background: navy }}
                      >
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_SIZES.map((s) => (
                          <SelectItem key={s} value={s}>{s} employees</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.companySize && (
                      <p className="text-destructive text-xs">{errors.companySize.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">
                    Number of HR professionals in your team <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 42"
                    {...register("hrTeamSize")}
                    className={`border-slate-600 text-white placeholder:text-slate-500 ${errors.hrTeamSize ? "border-destructive" : ""}`}
                    style={{ background: navy }}
                  />
                  {errors.hrTeamSize && (
                    <p className="text-destructive text-xs">{errors.hrTeamSize.message}</p>
                  )}
                  {hrTeamSize > 0 && hrTeamSize < 25 && !errors.hrTeamSize && (
                    <div
                      className="flex items-start gap-2 mt-2 p-3 rounded-lg"
                      style={{ background: "rgba(204,187,68,0.06)", border: "1px solid rgba(204,187,68,0.25)" }}
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#D97706" }} />
                      <p className="text-xs leading-relaxed text-slate-300">
                        The AiQ beta programme requires at least 25 HR professionals. You can still
                        submit — we will note your interest for our upcoming self-serve tier.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Your context */}
            <Card style={{ borderColor: border, background: slate }}>
              <CardContent className="p-6 space-y-5">
                <h3 className="font-semibold text-white border-b pb-3" style={{ borderColor: border }}>
                  Your context
                </h3>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">
                    Your business's named AI initiatives and approximate timelines{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-slate-500 text-xs">
                    Be specific — which initiatives, what timelines, what your function has been asked to deliver.
                  </p>
                  <Textarea
                    rows={4}
                    placeholder="e.g. We are rolling out Copilot to 3,000 employees by Q3 2025. HR has been asked to ensure our people can govern AI-informed decisions and support the transition..."
                    {...register("useCase")}
                    className={`border-slate-600 text-white placeholder:text-slate-500 resize-none ${errors.useCase ? "border-destructive" : ""}`}
                    style={{ background: navy }}
                  />
                  {errors.useCase && (
                    <p className="text-destructive text-xs">{errors.useCase.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">
                    AI tools your HR team currently uses{" "}
                    <span className="text-slate-500 text-xs">(optional)</span>
                  </Label>
                  <Input
                    placeholder="e.g. Microsoft Copilot, ChatGPT, Workday AI, Beamery..."
                    {...register("currentAiTools")}
                    className="border-slate-600 text-white placeholder:text-slate-500"
                    style={{ background: navy }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">
                    What you are hoping AiQ would help you do{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-slate-500 text-xs">
                    What would a successful outcome look like for your function?
                  </p>
                  <Textarea
                    rows={4}
                    placeholder="e.g. We want to know where our capability gaps are before we deploy AI tools at scale, and to have a credible answer when the board asks whether HR is ready to govern AI responsibly..."
                    {...register("motivation")}
                    className={`border-slate-600 text-white placeholder:text-slate-500 resize-none ${errors.motivation ? "border-destructive" : ""}`}
                    style={{ background: navy }}
                  />
                  {errors.motivation && (
                    <p className="text-destructive text-xs">{errors.motivation.message}</p>
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
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
                <div>
                  <p className="font-medium text-sm text-white">Submission failed</p>
                  <p className="text-sm mt-0.5 text-slate-300">
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
                style={{ background: green, color: "white" }}
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
      </section>

      <MarketingFooter />
    </div>
  );
}
