/**
 * OnboardingWizard — AiQ Enterprise Platform
 *
 * A 4-step wizard that collects experience level, AI usage level,
 * and job function to seed the AIL cold start persona and difficulty profile.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Brain,
  Briefcase,
  Zap,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Shield,
  BarChart3,
  Users,
} from "lucide-react";

// ─── Step Data ────────────────────────────────────────────────────────────────

const EXPERIENCE_OPTIONS = [
  {
    value: "junior",
    label: "Early Career",
    description: "0–3 years in HR, learning the fundamentals",
    icon: "🌱",
  },
  {
    value: "mid",
    label: "Developing Professional",
    description: "3–7 years, building specialist knowledge",
    icon: "📈",
  },
  {
    value: "senior",
    label: "Senior Practitioner",
    description: "7–15 years, leading teams and strategy",
    icon: "🎯",
  },
  {
    value: "principal",
    label: "Executive / Principal",
    description: "15+ years, C-suite or equivalent",
    icon: "🏆",
  },
];

const AI_USAGE_OPTIONS = [
  {
    value: "none",
    label: "No Experience",
    description: "I haven't used AI tools in my HR work yet",
    icon: "🔍",
  },
  {
    value: "occasional",
    label: "Occasional User",
    description: "I've tried a few AI tools but don't use them regularly",
    icon: "⚡",
  },
  {
    value: "regular",
    label: "Regular User",
    description: "I use AI tools weekly as part of my workflow",
    icon: "🔄",
  },
  {
    value: "advanced",
    label: "Power User",
    description: "AI tools are central to how I work; I evaluate and implement them",
    icon: "🚀",
  },
];

const JOB_FUNCTIONS = [
  { value: "talent_acquisition", label: "Talent Acquisition", icon: Users },
  { value: "employee_relations", label: "Employee Relations", icon: Shield },
  { value: "learning_development", label: "Learning & Development", icon: Brain },
  { value: "compensation_benefits", label: "Compensation & Benefits", icon: BarChart3 },
  { value: "hr_business_partner", label: "HR Business Partner", icon: Briefcase },
  { value: "people_analytics", label: "People Analytics", icon: BarChart3 },
  { value: "organisational_development", label: "Organisational Development", icon: Users },
  { value: "hr_operations", label: "HR Operations", icon: Zap },
  { value: "dei", label: "Diversity, Equity & Inclusion", icon: Shield },
  { value: "hr_leadership", label: "HR Leadership / CHRO", icon: Brain },
  { value: "workforce_planning", label: "Workforce Planning", icon: BarChart3 },
  { value: "other", label: "Other / Generalist", icon: Briefcase },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [aiUsageLevel, setAiUsageLevel] = useState<string | null>(null);
  const [jobFunction, setJobFunction] = useState<string | null>(null);

  const completeOnboarding = trpc.auth.completeOnboarding.useMutation({
    onSuccess: () => {
      navigate("/dashboard");
    },
    onError: (err) => {
      toast.error("Could not save your profile. Please try again.");
      console.error(err);
    },
  });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  function handleNext() {
    if (step < totalSteps) setStep(step + 1);
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  function handleFinish() {
    if (!experienceLevel || !aiUsageLevel || !jobFunction) return;
    completeOnboarding.mutate({
      experienceLevel: experienceLevel as "junior" | "mid" | "senior" | "principal",
      aiUsageLevel: aiUsageLevel as "none" | "occasional" | "regular" | "advanced",
      jobFunction,
    });
  }

  const canProceed =
    (step === 1) ||
    (step === 2 && experienceLevel !== null) ||
    (step === 3 && aiUsageLevel !== null) ||
    (step === 4 && jobFunction !== null);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-xl mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#10B981] flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground font-sora">AiQ</span>
        </div>
        <Progress value={progress} className="h-1.5 mb-6" />
        <p className="text-xs text-muted-foreground">Step {step} of {totalSteps}</p>
      </div>

      {/* Step Content */}
      <div className="w-full max-w-xl">
        {step === 1 && <WelcomeStep onNext={handleNext} />}
        {step === 2 && (
          <SelectionStep
            title="What is your experience level?"
            subtitle="This calibrates the difficulty of your first assessment to match your career stage."
            options={EXPERIENCE_OPTIONS}
            selected={experienceLevel}
            onSelect={setExperienceLevel}
          />
        )}
        {step === 3 && (
          <SelectionStep
            title="How do you currently use AI tools?"
            subtitle="This helps us understand your starting point and personalise your learning path."
            options={AI_USAGE_OPTIONS}
            selected={aiUsageLevel}
            onSelect={setAiUsageLevel}
          />
        )}
        {step === 4 && (
          <JobFunctionStep
            selected={jobFunction}
            onSelect={setJobFunction}
          />
        )}
      </div>

      {/* Navigation */}
      {step > 1 && (
        <div className="w-full max-w-xl mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="gap-2 text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          {step < totalSteps ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!canProceed || completeOnboarding.isPending}
              className="bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2"
            >
              {completeOnboarding.isPending ? "Setting up..." : "Start My Assessment"}
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <Card className="border-border">
      <CardContent className="p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#10B981]/8 border border-[#10B981]/20 flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8 text-[#10B981]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sora mb-2">
            Welcome to AiQ
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            AiQ measures your capability to work safely and effectively with AI tools in HR.
            It takes three minutes to set up your profile so we can personalise your experience.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-left">
          {[
            { icon: Brain, label: "Adaptive", desc: "Adjusts to your level" },
            { icon: Shield, label: "Behavioural", desc: "Tests real AI capability" },
            { icon: BarChart3, label: "Actionable", desc: "Drives development" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-xl bg-muted/40 p-3">
              <Icon className="w-4 h-4 text-[#10B981] mb-1.5" />
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
        <Button
          onClick={onNext}
          className="w-full bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2"
        >
          Get Started
          <ChevronRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function SelectionStep({
  title,
  subtitle,
  options,
  selected,
  onSelect,
}: {
  title: string;
  subtitle: string;
  options: { value: string; label: string; description: string; icon: string }[];
  selected: string | null;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-foreground font-sora mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={cn(
              "w-full text-left rounded-xl border-2 p-4 transition-all",
              selected === opt.value
                ? "border-[#10B981] bg-[#10B981]/5"
                : "border-border hover:border-[#10B981]/40 bg-card"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{opt.icon}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
              {selected === opt.value && (
                <CheckCircle2 className="w-4 h-4 text-[#10B981] ml-auto shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function JobFunctionStep({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-foreground font-sora mb-1">
          What is your primary HR function?
        </h2>
        <p className="text-sm text-muted-foreground">
          This personalises the scenarios you see to your area of practice.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {JOB_FUNCTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={cn(
              "text-left rounded-xl border-2 p-3 transition-all",
              selected === value
                ? "border-[#10B981] bg-[#10B981]/5"
                : "border-border hover:border-[#10B981]/40 bg-card"
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className={cn("w-4 h-4 shrink-0", selected === value ? "text-[#10B981]" : "text-muted-foreground")} />
              <p className="text-xs font-medium text-foreground leading-tight">{label}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
