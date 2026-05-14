/**
 * Company HR AI Assessment — CPO Onboarding Flow
 * Multi-step wizard: Welcome → Organisation Profile → Assessment Briefing → Start
 */
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  Building2,
  Users,
  Target,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  BarChart3,
  Shield,
  Lightbulb,
  Layers,
  Brain,
  ArrowRight,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { getSubSectors, type SubSectorDef } from "../../../../shared/sectorTaxonomy";

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "profile", label: "Organisation Profile" },
  { id: "briefing", label: "Assessment Briefing" },
];

// Display labels → DB enum slug mapping
const SECTOR_OPTIONS: { label: string; value: string }[] = [
  { label: "Financial Services",          value: "financial_services" },
  { label: "Healthcare & Life Sciences",  value: "healthcare" },
  { label: "Technology & Software",       value: "technology" },
  { label: "Professional Services",       value: "professional_services" },
  { label: "Retail & Consumer",           value: "retail" },
  { label: "Manufacturing & Engineering", value: "manufacturing" },
  { label: "Public Sector & Education",   value: "public_sector" },
  { label: "Energy & Utilities",          value: "energy_utilities" },
  { label: "Media & Entertainment",       value: "media_entertainment" },
  { label: "Logistics & Transport",        value: "logistics_transport" },
  { label: "Education",                    value: "education" },
  { label: "Hospitality & Leisure",        value: "hospitality_leisure" },
  { label: "Other",                        value: "other" },
];

const HEADCOUNT_BANDS = [
  "Under 100",
  "100–499",
  "500–999",
  "1,000–4,999",
  "5,000–9,999",
  "10,000+",
];

const HR_TEAM_SIZES = [
  "Solo HR (1 person)",
  "Small team (2–5)",
  "Mid-size team (6–20)",
  "Large team (21–50)",
  "Enterprise HR function (50+)",
];

const HRIS_PLATFORMS = [
  "Workday",
  "SAP SuccessFactors",
  "Oracle HCM",
  "BambooHR",
  "HiBob",
  "Personio",
  "ADP",
  "Ceridian Dayforce",
  "ServiceNow HR",
  "Custom / in-house",
  "None / spreadsheets",
  "Other",
];

const AI_TOOLS = [
  "LinkedIn Talent Insights",
  "Eightfold AI",
  "Beamery",
  "Phenom",
  "Pymetrics / Harver",
  "HireVue",
  "Textio",
  "Visier",
  "Orgvue",
  "Gloat",
  "Microsoft Copilot for HR",
  "ChatGPT / Claude (informal)",
  "None yet",
];

const MOTIVATIONS = [
  "Board / executive mandate to accelerate AI adoption",
  "Competitive pressure — peers are moving faster",
  "Specific HR pain points we want AI to solve",
  "Regulatory / compliance preparation (EU AI Act etc.)",
  "People team capability gap — we need to upskill",
  "Exploring — no specific driver yet",
];

const AUDIENCES = [
  "CHRO / CPO",
  "CEO / ExCo",
  "HR Leadership Team",
  "People Analytics team",
  "Board People Committee",
  "HR Business Partners",
];

const ORG_TYPES: { label: string; value: string; desc: string }[] = [
  { label: "Listed / Public Company",    value: "listed_plc",      desc: "Publicly traded on a stock exchange" },
  { label: "Private Equity Backed",      value: "pe_backed",       desc: "PE-owned or portfolio company" },
  { label: "Private / Family Owned",     value: "private_family",  desc: "Privately held, owner-managed" },
  { label: "Public Sector / Government", value: "public_sector",   desc: "Government department or agency" },
  { label: "Charity / Not-for-Profit",   value: "charity_nfp",     desc: "Registered charity or NFP" },
  { label: "Start-up / Scale-up",        value: "startup_scaleup", desc: "Early-stage or high-growth company" },
  { label: "Mutual / Co-operative",      value: "mutual_coop",     desc: "Member-owned structure" },
];

const DIMENSIONS = [
  {
    key: "strategy_governance",
    label: "Strategy & Governance",
    icon: Target,
    color: "text-violet-400",
    desc: "How clearly is AI embedded in your people strategy, and how robust is your governance framework?",
  },
  {
    key: "data_infrastructure",
    label: "Data & Infrastructure",
    icon: Layers,
    color: "text-blue-400",
    desc: "What is the quality and accessibility of your HR data, and how AI-ready is your technology stack?",
  },
  {
    key: "talent_capability",
    label: "Talent & Capability",
    icon: Users,
    color: "text-emerald-400",
    desc: "How AI-capable is your HR team, and how effectively are you building workforce AI literacy?",
  },
  {
    key: "process_adoption",
    label: "Process & Adoption",
    icon: BarChart3,
    color: "text-amber-400",
    desc: "To what extent are AI tools embedded in your core HR processes and adopted by the business?",
  },
  {
    key: "ethics_trust",
    label: "Ethics & Trust",
    icon: Shield,
    color: "text-rose-400",
    desc: "How well does your organisation manage AI bias, fairness, transparency, and employee trust?",
  },
  {
    key: "value_impact",
    label: "Value & Impact",
    icon: Lightbulb,
    color: "text-cyan-400",
    desc: "How effectively do you measure and communicate the business value of your HR AI investments?",
  },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function CompanyOnboardingPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    sector: "",        // DB slug e.g. "financial_services"
    subSector: "",     // DB slug e.g. "banking_capital_markets"
    orgType: "",       // DB slug e.g. "listed_plc"
    headcountBand: "",
    hrTeamSize: "",
    hrisPlatform: "",
    existingAiTools: [] as string[],
    assessmentMotivation: "",
    resultsAudience: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createCompany = trpc.companyAssessment.createCompany.useMutation();
  const startAssessment = trpc.companyAssessment.startAssessment.useMutation();
  const seedQuestions = trpc.companyAssessment.seedQuestions.useMutation();

  // Derived: sub-sector options for the currently selected sector
  const subSectorOptions: SubSectorDef[] = form.sector ? getSubSectors(form.sector) : [];

  const updateField = (field: string, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSectorSelect = (value: string) => {
    // Reset sub-sector whenever sector changes
    setForm((prev) => ({ ...prev, sector: value, subSector: "" }));
    setErrors((prev) => ({ ...prev, sector: "" }));
  };

  const toggleTool = (tool: string) => {
    setForm((prev) => ({
      ...prev,
      existingAiTools: prev.existingAiTools.includes(tool)
        ? prev.existingAiTools.filter((t) => t !== tool)
        : [...prev.existingAiTools, tool],
    }));
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!form.name.trim()) newErrors.name = "Organisation name is required";
      if (!form.sector) newErrors.sector = "Please select a sector";
      if (!form.headcountBand) newErrors.headcountBand = "Please select headcount";
      if (!form.hrTeamSize) newErrors.hrTeamSize = "Please select HR team size";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleStart = async () => {
    try {
      // Seed questions if needed
      await seedQuestions.mutateAsync();
      // Create company, then start assessment
      const company = await createCompany.mutateAsync({
        name: form.name,
        sector: form.sector,
        subSector: form.subSector || undefined,
        orgType: form.orgType || undefined,
        headcountBand: form.headcountBand,
        hrTeamSize: form.hrTeamSize,
        hrisPlatform: form.hrisPlatform,
        existingAiTools: form.existingAiTools,
        assessmentMotivation: form.assessmentMotivation,
        resultsAudience: form.resultsAudience,
      });
      const assessment = await startAssessment.mutateAsync({ companyId: company.companyId });
      // Navigate to assessment
      navigate(`/company-assessment/${assessment.assessmentId}`);
    } catch (err) {
      console.error("Failed to start company assessment:", err);
    }
  };

  // Helper: display label for selected sector
  const selectedSectorLabel = SECTOR_OPTIONS.find((s) => s.value === form.sector)?.label ?? "";

  return (
    <div className="bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Building2 className="w-5 h-5 text-violet-400" />
        <span className="text-sm font-medium text-foreground/70">Company HR AI Assessment</span>
        <span className="text-foreground/30 mx-1">·</span>
        <span className="text-sm text-muted-foreground">{user?.firstName} {user?.lastName}</span>
      </div>

      {/* Progress steps */}
      <div className="flex items-center justify-center gap-0 pt-8 pb-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  i < step
                    ? "bg-violet-500 text-white"
                    : i === step
                    ? "bg-violet-500/20 border-2 border-violet-500 text-violet-400"
                    : "bg-foreground/5 border border-border/60 text-foreground/30"
                }`}
              >
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  i === step ? "text-violet-400" : i < step ? "text-muted-foreground" : "text-foreground/30"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-16 h-px mx-2 mb-5 transition-all ${
                  i < step ? "bg-violet-500" : "bg-foreground/10"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded-full px-4 py-1.5 text-sm text-violet-400 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Organisational AI Readiness
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Company HR AI Strategy Assessment
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed max-w-lg mx-auto">
                A rigorous, evidence-based assessment of your organisation's readiness to design,
                deploy, and govern AI across your people practices — grounded in frameworks from
                Deloitte, PwC, CIPD, and MIT Sloan.
              </p>
            </div>

            {/* What you'll get */}
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  icon: BarChart3,
                  title: "Maturity Score Across 6 Dimensions",
                  desc: "Benchmarked against sector peers, with domain-level gap analysis",
                },
                {
                  icon: Target,
                  title: "AI Strategy Recommendations",
                  desc: "Prioritised initiatives mapped to your capability gaps and ambition level",
                },
                {
                  icon: Brain,
                  title: "Team Cascade Readiness",
                  desc: "Understand how your org score connects to individual HR team capability",
                },
                {
                  icon: Shield,
                  title: "Governance & Ethics Risk Map",
                  desc: "Identify regulatory exposure and build a defensible AI governance framework",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 bg-foreground/5 border border-border rounded-xl p-4"
                >
                  <div className="w-9 h-9 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                    <item.icon className="w-4.5 h-4.5 text-violet-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-white">{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Time estimate */}
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span>⏱ 15–20 minutes</span>
              <span>·</span>
              <span>40–52 adaptive questions</span>
              <span>·</span>
              <span>Instant results</span>
            </div>
          </div>
        )}

        {/* ── Step 1: Organisation Profile ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Tell us about your organisation</h2>
              <p className="text-muted-foreground text-sm mt-1">
                This context calibrates the assessment and benchmarks your results against sector peers.
              </p>
            </div>

            {/* Organisation name */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Organisation Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. Acme Financial Services"
                className={`w-full bg-foreground/5 border rounded-lg px-4 py-3 text-sm text-white placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all ${
                  errors.name ? "border-rose-500" : "border-border"
                }`}
              />
              {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Sector */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Sector <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SECTOR_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleSectorSelect(s.value)}
                    className={`text-left px-3 py-2.5 rounded-lg text-sm border transition-all ${
                      form.sector === s.value
                        ? "bg-violet-500/20 border-violet-500 text-violet-300"
                        : "bg-foreground/5 border-border text-muted-foreground hover:border-border/60"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {errors.sector && <p className="text-rose-400 text-xs mt-1">{errors.sector}</p>}
            </div>

            {/* Sub-sector — cascading, only shown when a sector with sub-sectors is selected */}
            {form.sector && subSectorOptions.length > 0 && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Sub-sector
                  <span className="text-foreground/30 font-normal normal-case ml-1">(optional — improves benchmark accuracy)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {subSectorOptions.map((ss) => (
                    <button
                      key={ss.value}
                      onClick={() =>
                        updateField("subSector", form.subSector === ss.value ? "" : ss.value)
                      }
                      className={`text-left px-3 py-2.5 rounded-lg text-sm border transition-all ${
                        form.subSector === ss.value
                          ? "bg-violet-500/15 border-violet-400 text-violet-300"
                          : "bg-foreground/3 border-border text-muted-foreground hover:border-border"
                      }`}
                    >
                      {ss.label}
                    </button>
                  ))}
                </div>
                {form.subSector && (
                  <p className="text-xs text-violet-400/70 mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Benchmarks will use {subSectorOptions.find((s) => s.value === form.subSector)?.label} norms
                  </p>
                )}
              </div>
            )}

            {/* Organisation Type */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Organisation Type
                <span className="ml-2 text-foreground/30 font-normal normal-case tracking-normal text-[11px]">Calibrates governance &amp; compliance benchmarks</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ORG_TYPES.map((ot) => (
                  <button
                    key={ot.value}
                    onClick={() => updateField("orgType", form.orgType === ot.value ? "" : ot.value)}
                    className={`text-left px-3 py-2.5 rounded-lg text-sm border transition-all ${
                      form.orgType === ot.value
                        ? "bg-violet-500/20 border-violet-500 text-violet-300"
                        : "bg-foreground/5 border-border text-muted-foreground hover:border-border/60"
                    }`}
                  >
                    <span className="block font-medium">{ot.label}</span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">{ot.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Headcount */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Total Headcount <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {HEADCOUNT_BANDS.map((b) => (
                  <button
                    key={b}
                    onClick={() => updateField("headcountBand", b)}
                    className={`px-3 py-2.5 rounded-lg text-sm border transition-all ${
                      form.headcountBand === b
                        ? "bg-violet-500/20 border-violet-500 text-violet-300"
                        : "bg-foreground/5 border-border text-muted-foreground hover:border-border/60"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
              {errors.headcountBand && (
                <p className="text-rose-400 text-xs mt-1">{errors.headcountBand}</p>
              )}
            </div>

            {/* HR team size */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                HR Team Size <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {HR_TEAM_SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateField("hrTeamSize", s)}
                    className={`text-left px-4 py-2.5 rounded-lg text-sm border transition-all ${
                      form.hrTeamSize === s
                        ? "bg-violet-500/20 border-violet-500 text-violet-300"
                        : "bg-foreground/5 border-border text-muted-foreground hover:border-border/60"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {errors.hrTeamSize && (
                <p className="text-rose-400 text-xs mt-1">{errors.hrTeamSize}</p>
              )}
            </div>

            {/* HRIS Platform */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Primary HRIS Platform
              </label>
              <div className="grid grid-cols-2 gap-2">
                {HRIS_PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => updateField("hrisPlatform", p)}
                    className={`text-left px-3 py-2.5 rounded-lg text-sm border transition-all ${
                      form.hrisPlatform === p
                        ? "bg-violet-500/20 border-violet-500 text-violet-300"
                        : "bg-foreground/5 border-border text-muted-foreground hover:border-border/60"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Existing AI tools */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                AI Tools Currently in Use{" "}
                <span className="text-foreground/30 font-normal normal-case">(select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {AI_TOOLS.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleTool(t)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      form.existingAiTools.includes(t)
                        ? "bg-violet-500/20 border-violet-500 text-violet-300"
                        : "bg-foreground/5 border-border text-muted-foreground hover:border-border/60"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Assessment motivation */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Primary Motivation for this Assessment
              </label>
              <div className="grid grid-cols-1 gap-2">
                {MOTIVATIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => updateField("assessmentMotivation", m)}
                    className={`text-left px-4 py-2.5 rounded-lg text-sm border transition-all ${
                      form.assessmentMotivation === m
                        ? "bg-violet-500/20 border-violet-500 text-violet-300"
                        : "bg-foreground/5 border-border text-muted-foreground hover:border-border/60"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Results audience */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Who will see these results?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AUDIENCES.map((a) => (
                  <button
                    key={a}
                    onClick={() => updateField("resultsAudience", a)}
                    className={`text-left px-3 py-2.5 rounded-lg text-sm border transition-all ${
                      form.resultsAudience === a
                        ? "bg-violet-500/20 border-violet-500 text-violet-300"
                        : "bg-foreground/5 border-border text-muted-foreground hover:border-border/60"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Assessment Briefing ── */}
        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold">What the assessment covers</h2>
              <p className="text-muted-foreground text-sm mt-1">
                The assessment evaluates your organisation across 6 dimensions of HR AI readiness,
                using an adaptive question engine that adjusts to your responses.
              </p>
            </div>

            {/* Dimensions grid */}
            <div className="grid grid-cols-1 gap-3">
              {DIMENSIONS.map((d) => (
                <div
                  key={d.key}
                  className="flex items-start gap-4 bg-foreground/5 border border-border rounded-xl p-4"
                >
                  <div className="w-9 h-9 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                    <d.icon className={`w-4.5 h-4.5 ${d.color}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-white">{d.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{d.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Methodology note */}
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-violet-300">
                <Brain className="w-4 h-4" />
                Adaptive Methodology
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Questions are drawn from a bank of 60+ items calibrated against the Deloitte AI
                Maturity Index, PwC AI Readiness Framework, and CIPD People Profession AI
                Competency Model. The adaptive engine selects questions based on your previous
                answers, targeting areas of uncertainty to produce a precise maturity score in
                fewer questions than a fixed-form assessment.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {["Deloitte AI Maturity Index", "PwC AI Readiness Framework", "CIPD Profession Map", "MIT Sloan AI Strategy", "EU AI Act"].map(
                  (ref) => (
                    <Badge
                      key={ref}
                      variant="outline"
                      className="text-[10px] border-violet-500/30 text-violet-400/70"
                    >
                      {ref}
                    </Badge>
                  )
                )}
              </div>
            </div>

            {/* What happens next */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                After the assessment
              </div>
              <div className="space-y-2">
                {[
                  "Maturity score across all 6 dimensions with sector benchmarks",
                  "Gap analysis identifying your highest-priority capability areas",
                  "Pre-populated AI Strategy Builder with recommended initiatives",
                  "Team cascade: connect individual HR team scores to org-level gaps",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Organisation summary */}
            {form.name && (
              <div className="bg-foreground/5 border border-border rounded-xl p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Assessment for
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-border/60 text-foreground/70">
                    <Building2 className="w-3 h-3 mr-1" />
                    {form.name}
                  </Badge>
                  {selectedSectorLabel && (
                    <Badge variant="outline" className="border-border/60 text-foreground/70">
                      {selectedSectorLabel}
                    </Badge>
                  )}
                  {form.subSector && (
                    <Badge variant="outline" className="border-violet-500/30 text-violet-400/80">
                      <ChevronDown className="w-3 h-3 mr-1" />
                      {subSectorOptions.find((s) => s.value === form.subSector)?.label ?? form.subSector}
                    </Badge>
                  )}
                  {form.orgType && (
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400/80">
                      {ORG_TYPES.find((o) => o.value === form.orgType)?.label ?? form.orgType}
                    </Badge>
                  )}
                  {form.headcountBand && (
                    <Badge variant="outline" className="border-border/60 text-foreground/70">
                      <Users className="w-3 h-3 mr-1" />
                      {form.headcountBand}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0}
            className="text-muted-foreground hover:text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              className="bg-violet-600 hover:bg-violet-700 text-white px-6"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleStart}
              disabled={createCompany.isPending || seedQuestions.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white px-8"
            >
              {createCompany.isPending ? "Starting…" : "Begin Assessment"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
