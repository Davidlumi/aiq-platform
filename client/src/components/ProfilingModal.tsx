/**
 * ProfilingModal — multi-step pre-assessment profiling flow
 *
 * Step 1: Role Family (broad category)
 * Step 2: Specific Role + Seniority
 * Step 3: AI Experience + Tools used
 * Step 4: Context (Sector + Team Size)
 * Step 5: Ready screen
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Users, Briefcase, BarChart3, Shield, BookOpen, Settings2,
  ChevronRight, ChevronLeft, Check, Zap, Brain, AlertTriangle,
  Building2, Layers, Globe, Factory, HeartPulse, GraduationCap,
  HelpCircle, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProfilingData {
  roleFamily: string;
  jobFunction: string;
  seniorityLevel: string;
  experienceLevel: "junior" | "mid" | "senior" | "principal";
  aiUsageLevel: "none" | "occasional" | "regular" | "advanced";
  aiToolsUsed: string;
  sector: string;
}

interface ProfilingModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (data: ProfilingData) => void;
  isPending: boolean;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const ROLE_FAMILIES = [
  {
    id: "talent",
    label: "Talent & Recruitment",
    description: "Hiring, talent acquisition, employer branding",
    icon: Users,
    colour: "var(--primary)",
    roles: [
      "Talent Acquisition Partner",
      "Recruiter",
      "Head of Talent",
      "Employer Brand Manager",
      "Talent Operations Analyst",
    ],
  },
  {
    id: "learning",
    label: "Learning & Development",
    description: "Training, capability building, leadership development",
    icon: BookOpen,
    colour: "var(--primary)",
    roles: [
      "L&D Manager",
      "Learning Designer",
      "Head of L&D",
      "Training Coordinator",
      "Capability Development Lead",
    ],
  },
  {
    id: "hrbp",
    label: "HR Business Partner",
    description: "Strategic partnering, change management, ER",
    icon: Briefcase,
    colour: "#AA3377",
    roles: [
      "HR Business Partner",
      "Senior HRBP",
      "Head of HR",
      "HR Generalist",
      "People Partner",
    ],
  },
  {
    id: "analytics",
    label: "People Analytics & Data",
    description: "Workforce data, reporting, HR systems",
    icon: BarChart3,
    colour: "#CCBB44",
    roles: [
      "People Analytics Manager",
      "HR Data Analyst",
      "Workforce Planning Analyst",
      "HRIS Manager",
      "Insights & Reporting Lead",
    ],
  },
  {
    id: "reward",
    label: "Reward & Benefits",
    description: "Compensation, benefits, pay equity",
    icon: Layers,
    colour: "#EE8866",
    roles: [
      "Reward Manager",
      "Compensation & Benefits Analyst",
      "Head of Reward",
      "Total Reward Specialist",
      "Pay & Grading Analyst",
    ],
  },
  {
    id: "governance",
    label: "HR Governance & Compliance",
    description: "Policy, employment law, risk, audit",
    icon: Shield,
    colour: "#EC4899",
    roles: [
      "HR Compliance Manager",
      "Employment Relations Advisor",
      "HR Policy Manager",
      "Risk & Governance Lead",
      "HR Audit Specialist",
    ],
  },
  {
    id: "operations",
    label: "HR Operations & Shared Services",
    description: "HR ops, payroll, service delivery",
    icon: Settings2,
    colour: "#06B6D4",
    roles: [
      "HR Operations Manager",
      "HR Shared Services Lead",
      "Payroll Manager",
      "HR Service Delivery Manager",
      "HR Operations Analyst",
    ],
  },
  {
    id: "other",
    label: "Other / General HR",
    description: "Generalist or specialist not listed above",
    icon: Globe,
    colour: "#6B7280",
    roles: [
      "HR Manager",
      "HR Director",
      "Chief People Officer",
      "HR Coordinator",
      "HR Advisor",
    ],
  },
];

const SENIORITY_LEVELS = [
  { id: "coordinator", label: "Coordinator / Advisor", description: "0–3 years in role", expLevel: "junior" as const },
  { id: "manager", label: "Manager / Specialist", description: "3–7 years, team or project ownership", expLevel: "mid" as const },
  { id: "senior_manager", label: "Senior Manager / Lead", description: "7–12 years, department or function", expLevel: "senior" as const },
  { id: "director", label: "Director / Head of", description: "12+ years, strategic ownership", expLevel: "principal" as const },
  { id: "executive", label: "VP / CPO / C-Suite", description: "Executive leadership", expLevel: "principal" as const },
];

const AI_EXPERIENCE_LEVELS = [
  {
    id: "none",
    label: "No experience",
    description: "I haven't used AI tools in my work yet",
    usageLevel: "none" as const,
    colour: "#6B7280",
    icon: "○",
  },
  {
    id: "occasional",
    label: "Occasional user",
    description: "I've tried tools like ChatGPT a few times",
    usageLevel: "occasional" as const,
    colour: "#CCBB44",
    icon: "◔",
  },
  {
    id: "regular",
    label: "Regular user",
    description: "I use AI tools weekly as part of my workflow",
    usageLevel: "regular" as const,
    colour: "var(--primary)",
    icon: "◑",
  },
  {
    id: "advanced",
    label: "Advanced practitioner",
    description: "I integrate AI into most tasks and evaluate outputs critically",
    usageLevel: "advanced" as const,
    colour: "var(--primary)",
    icon: "●",
  },
];

const AI_TOOLS = [
  "ChatGPT / GPT-4",
  "Microsoft Copilot",
  "Google Gemini",
  "Claude (Anthropic)",
  "Workday AI",
  "SAP SuccessFactors AI",
  "LinkedIn Talent Insights",
  "Eightfold AI",
  "Beamery",
  "Phenom",
  "HireVue",
  "Textio",
  "Visier",
  "Other HR-specific AI tools",
];

const SECTORS = [
  { id: "financial_services", label: "Financial Services", icon: Building2 },
  { id: "technology", label: "Technology", icon: Settings2 },
  { id: "healthcare", label: "Healthcare & Life Sciences", icon: HeartPulse },
  { id: "public_sector", label: "Public Sector", icon: Globe },
  { id: "professional_services", label: "Professional Services", icon: Briefcase },
  { id: "manufacturing", label: "Manufacturing & Engineering", icon: Factory },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "retail_consumer", label: "Retail & Consumer", icon: Layers },
  { id: "other", label: "Other", icon: Globe },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfilingModal({ open, onClose, onStart, isPending }: ProfilingModalProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [toolsExpanded, setToolsExpanded] = useState(false);

  // UX-8: Why we ask tooltips per step
  const WHY_WE_ASK: Record<number, string> = {
    1: "Role family determines which capability domains matter most for your assessment. An HRBP faces different AI risks than a People Analyst.",
    2: "Your specific role and seniority calibrates question difficulty. A Coordinator and a Director face different expectations.",
    3: "AI experience level sets your starting difficulty. Honest answers lead to a more accurate score — there's no penalty for low experience.",
    4: "Sector context lets us weight scenarios towards your industry's specific regulatory and ethical landscape.",
  };

  // Form state
  const [selectedFamily, setSelectedFamily] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedSeniority, setSelectedSeniority] = useState<string>("");
  const [selectedAiExp, setSelectedAiExp] = useState<string>("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>("");

  const family = ROLE_FAMILIES.find(f => f.id === selectedFamily);
  const seniority = SENIORITY_LEVELS.find(s => s.id === selectedSeniority);
  const aiExp = AI_EXPERIENCE_LEVELS.find(a => a.id === selectedAiExp);

  const canAdvance = () => {
    if (step === 1) return !!selectedFamily;
    if (step === 2) return !!selectedRole && !!selectedSeniority;
    if (step === 3) return !!selectedAiExp;
    if (step === 4) return !!selectedSector;
    return true;
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(s => s + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const handleSubmit = () => {
    if (!family || !seniority || !aiExp) return;
    onStart({
      roleFamily: selectedFamily,
      jobFunction: selectedRole,
      seniorityLevel: selectedSeniority,
      experienceLevel: seniority.expLevel,
      aiUsageLevel: aiExp.usageLevel,
      aiToolsUsed: selectedTools.join(", "),
      sector: selectedSector,
    });
  };

  const toggleTool = (tool: string) => {
    setSelectedTools(prev =>
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    );
  };

  const progress = ((step - 1) / totalSteps) * 100;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isPending) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Before You Begin
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Help us calibrate your assessment — takes about 60 seconds
              </p>
            </div>
            {/* UX-8: Why we ask tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Why we ask</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[220px] text-xs">
                  {WHY_WE_ASK[step]}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Progress value={progress} className="h-1.5" />
          {/* Step labels */}
          <div className="flex items-center gap-1 mt-2">
            {["Role Family", "Your Role", "AI Experience", "Context"].map((label, i) => (
              <div key={label} className="flex items-center gap-1">
                <div className={cn(
                  "flex items-center gap-1 text-xs",
                  i + 1 < step ? "text-primary font-medium" :
                  i + 1 === step ? "text-foreground font-semibold" :
                  "text-muted-foreground"
                )}>
                  <div className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold",
                    i + 1 < step ? "bg-primary text-white" :
                    i + 1 === step ? "bg-foreground text-background" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {i + 1 < step ? <Check className="w-2.5 h-2.5" /> : i + 1}
                  </div>
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {i < 3 && <div className="w-4 h-px bg-border mx-0.5" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-5">
          {/* ── Step 1: Role Family ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Which area of HR best describes your role?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This helps us weight scenarios towards situations you're most likely to encounter.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ROLE_FAMILIES.map(fam => {
                  const Icon = fam.icon;
                  const isSelected = selectedFamily === fam.id;
                  return (
                    <button
                      key={fam.id}
                      onClick={() => setSelectedFamily(fam.id)}
                      className={cn(
                        "flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: `${fam.colour}18` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: fam.colour }} />
                      </div>
                      <div className="min-w-0">
                        <p className={cn(
                          "text-sm font-semibold leading-tight",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {fam.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{fam.description}</p>
                      </div>
                      {isSelected && (
                        <div className="ml-auto shrink-0">
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 2: Specific Role + Seniority ── */}
          {step === 2 && family && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-foreground">What is your specific role?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Select the option that best matches your current position within <strong>{family.label}</strong>.
                </p>
              </div>

              {/* Role selection */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Role</p>
                <div className="grid grid-cols-1 gap-2">
                  {family.roles.map(role => {
                    const isSelected = selectedRole === role;
                    return (
                      <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={cn(
                          "flex items-center justify-between px-4 py-2.5 rounded-lg border text-left text-sm transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary/30"
                            : "border-border hover:border-primary/40 text-foreground"
                        )}
                      >
                        {role}
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seniority selection */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Seniority Level</p>
                <div className="grid grid-cols-1 gap-2">
                  {SENIORITY_LEVELS.map(level => {
                    const isSelected = selectedSeniority === level.id;
                    return (
                      <button
                        key={level.id}
                        onClick={() => setSelectedSeniority(level.id)}
                        className={cn(
                          "flex items-center justify-between px-4 py-2.5 rounded-lg border text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        <div>
                          <p className={cn(
                            "text-sm font-medium",
                            isSelected ? "text-primary" : "text-foreground"
                          )}>
                            {level.label}
                          </p>
                          <p className="text-xs text-muted-foreground">{level.description}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: AI Experience + Tools ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-foreground">How would you describe your AI experience?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Be honest — there's no right answer. This calibrates the difficulty of your first questions.
                </p>
              </div>
              {/* UX-8: Profile context reminder */}
              {selectedRole && selectedSeniority && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs shrink-0">{selectedRole}</Badge>
                  <span>·</span>
                  <span>{SENIORITY_LEVELS.find(s => s.id === selectedSeniority)?.label}</span>
                </div>
              )}

              {/* AI experience level */}
              <div className="grid grid-cols-1 gap-2.5">
                {AI_EXPERIENCE_LEVELS.map(level => {
                  const isSelected = selectedAiExp === level.id;
                  return (
                    <button
                      key={level.id}
                      onClick={() => setSelectedAiExp(level.id)}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/40 hover:bg-muted/20"
                      )}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg font-bold"
                        style={{
                          backgroundColor: `${level.colour}18`,
                          color: level.colour,
                        }}
                      >
                        {level.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-semibold",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {level.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{level.description}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* UX-8: Collapsible AI tools section */}
              <div className="space-y-2">
                <button
                  onClick={() => setToolsExpanded(e => !e)}
                  className="flex items-center gap-2 w-full text-left group"
                >
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex-1">
                    Which AI tools have you used?
                    <span className="font-normal normal-case ml-1">(optional)</span>
                    {selectedTools.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs py-0">{selectedTools.length} selected</Badge>
                    )}
                  </p>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    toolsExpanded ? "rotate-180" : ""
                  )} />
                </button>
                {toolsExpanded && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {AI_TOOLS.map(tool => {
                      const isSelected = selectedTools.includes(tool);
                      return (
                        <button
                          key={tool}
                          onClick={() => toggleTool(tool)}
                          className={cn(
                            "px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                            isSelected
                              ? "border-primary bg-primary text-white"
                              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                          {tool}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 4: Context ── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-foreground">What sector do you work in?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Scenarios will be weighted towards your industry context where possible.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {SECTORS.map(sec => {
                  const Icon = sec.icon;
                  const isSelected = selectedSector === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setSelectedSector(sec.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/40 hover:bg-muted/20"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        isSelected ? "bg-primary/15" : "bg-muted"
                      )}>
                        <Icon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <p className={cn(
                        "text-xs font-medium leading-tight",
                        isSelected ? "text-primary" : "text-foreground"
                      )}>
                        {sec.label}
                      </p>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Summary preview */}
              {selectedFamily && selectedRole && selectedSeniority && selectedAiExp && (
                <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your Profile Summary</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">{selectedRole}</Badge>
                    <Badge variant="secondary" className="text-xs">
                      {SENIORITY_LEVELS.find(s => s.id === selectedSeniority)?.label}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {AI_EXPERIENCE_LEVELS.find(a => a.id === selectedAiExp)?.label}
                    </Badge>
                    {selectedTools.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedTools.length} AI tool{selectedTools.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <p className="text-xs text-muted-foreground">
                      <Zap className="w-3 h-3 inline mr-1 text-primary" />
                      Your assessment will be calibrated to your role and experience level from question 1.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">~35 minutes</span>
                      {" "}· 50 adaptive interactions · 6 capability domains
                    </p>
                    <p className="text-xs text-muted-foreground">
                      We measure: AI Execution, AI Judgement, AI Risk &amp; Governance, AI Appropriateness, AI Workflow Application, and AI Data &amp; Insight.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-border">
          <Button
            variant="ghost"
            onClick={step === 1 ? onClose : handleBack}
            disabled={isPending}
            className="text-muted-foreground"
          >
            {step === 1 ? "Cancel" : (
              <>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            {/* Step dots */}
            <div className="flex gap-1 mr-3">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-full transition-all",
                    i + 1 < step ? "w-2 h-2 bg-primary" :
                    i + 1 === step ? "w-4 h-2 bg-primary" :
                    "w-2 h-2 bg-muted"
                  )}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              disabled={!canAdvance() || isPending}
              className="bg-primary hover:bg-primary/90 text-white gap-2 min-w-[120px]"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting…
                </>
              ) : step === totalSteps ? (
                <>
                  <Brain className="w-4 h-4" />
                  Start Assessment
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
