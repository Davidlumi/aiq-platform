/**
 * HRAIStrategyAssessmentPage — HR AI Strategy Assessment Wizard
 *
 * 4-step wizard that captures the inputs needed to generate and commit
 * the organisation's HR AI Strategy:
 *   Step 1 — Business AI Aspiration
 *   Step 2 — HR's Role in the AI Vision
 *   Step 3 — AI-Drafted Vision & Principles (editable)
 *   Step 4 — Initiative Selection + Commit
 */
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Target,
  Users,
  Lightbulb,
  Shield,
  Zap,
  Layers,
  TrendingUp,
  BookOpen,
  ArrowRight,
  Loader2,
  Edit3,
  CheckCircle2,
  ListPlus,
} from "lucide-react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const BUSINESS_LEVELS: Record<number, { label: string; description: string }> = {
  1: { label: "Cautious",      description: "AI used selectively in low-risk, back-office processes." },
  2: { label: "Exploratory",   description: "Piloting AI in specific workflows, building internal confidence." },
  3: { label: "Progressive",   description: "AI embedded in core HR processes; confident, critical use expected." },
  4: { label: "Ambitious",     description: "AI is a strategic differentiator; HR leads adoption across the business." },
  5: { label: "Transformative", description: "AI is central to the business model; HR professionals are AI-native." },
};

const PEOPLE_LEVELS: Record<number, { label: string; description: string }> = {
  1: { label: "Followers",    description: "HR people use AI tools as directed; compliance is the primary expectation." },
  2: { label: "Adopters",     description: "HR people learn and use AI tools in their day-to-day work." },
  3: { label: "Practitioners", description: "HR people apply AI confidently and evaluate outputs critically." },
  4: { label: "Champions",    description: "HR people advocate for AI, coach others, and contribute to governance." },
  5: { label: "Innovators",   description: "HR people design AI-enabled processes and shape the organisation's AI strategy." },
};

const FILTER_CATEGORIES = [
  "All",
  "Talent Acquisition",
  "Performance & Development",
  "Pay & Reward",
  "Learning & Development",
  "Workforce Planning",
  "GenAI Workforce Rollout",
  "HR Operations",
  "Ethics & Governance",
  "Custom",
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Talent Acquisition":        <Users className="w-3.5 h-3.5" />,
  "Learning & Development":    <Lightbulb className="w-3.5 h-3.5" />,
  "Performance & Development": <TrendingUp className="w-3.5 h-3.5" />,
  "Workforce Planning":        <Layers className="w-3.5 h-3.5" />,
  "Pay & Reward":              <Target className="w-3.5 h-3.5" />,
  "HR Operations":             <Zap className="w-3.5 h-3.5" />,
  "Ethics & Governance":       <Shield className="w-3.5 h-3.5" />,
  "GenAI Workforce Rollout":   <Zap className="w-3.5 h-3.5" />,
};

const AI_TYPE_COLORS: Record<string, string> = {
  generative:  "#A78BFA",
  predictive:  "#60A5FA",
  automation:  "#4ADE80",
  analytical:  "#FBBF24",
  agentic:     "#F472B6",
};

const DA_LABELS: Record<string, string> = {
  recommends_to_human: "Recommends",
  human_in_loop:       "Human-in-loop",
  full_automation:     "Full automation",
};

const CATEGORY_COLOURS: Record<string, string> = {
  "Talent Acquisition":        "#60A5FA",
  "Performance & Development": "#A78BFA",
  "Pay & Reward":              "#FBBF24",
  "Learning & Development":    "#4ADE80",
  "Workforce Planning":        "#F472B6",
  "GenAI Workforce Rollout":   "#FB923C",
  "HR Operations":             "#22D3EE",
  "Ethics & Governance":       "#F87171",
  "Custom":                    "#9CA3AF",
};

const CATEGORY_MAP: Record<string, string> = {
  "Talent Acquisition":        "Talent Acquisition",
  "Learning & Development":    "Learning & Development",
  "Performance & Engagement":  "Performance & Development",
  "Performance & Development": "Performance & Development",
  "Workforce Planning":        "Workforce Planning",
  "Reward & Compensation":     "Pay & Reward",
  "Pay & Reward":              "Pay & Reward",
  "HR Operations":             "HR Operations",
  "Ethics & Governance":       "Ethics & Governance",
};

// ─── Step 1: Business AI Aspiration questions ─────────────────────────────────
const ASPIRATION_QUESTIONS = [
  {
    id: "ai_outcomes",
    label: "What AI outcomes matter most to your organisation?",
    placeholder: "e.g. Reducing operational costs, improving customer experience, accelerating product development...",
  },
  {
    id: "business_problems",
    label: "What business problems should AI solve in the next 1–3 years?",
    placeholder: "e.g. High employee turnover, slow hiring cycles, inconsistent performance management...",
  },
  {
    id: "timeline",
    label: "What is your organisation's timeline for AI adoption?",
    placeholder: "e.g. We want to be AI-enabled within 18 months, with full transformation by 2027...",
  },
  {
    id: "risk_appetite",
    label: "How would you describe your organisation's risk appetite for AI?",
    placeholder: "e.g. Conservative — we want to pilot carefully before scaling. Or: Bold — we're prepared to move fast and iterate...",
  },
  {
    id: "success_definition",
    label: "What does AI success look like for your organisation?",
    placeholder: "e.g. Every HR decision is data-informed, employees have AI-powered career tools, HR operates at 30% lower cost...",
  },
];

// ─── Step 2: HR's Role questions ──────────────────────────────────────────────
const HR_ROLE_QUESTIONS = [
  {
    id: "lead_vs_support",
    label: "Should HR lead AI adoption or play a supporting role?",
    placeholder: "e.g. HR should be a strategic partner, leading workforce AI readiness and governance. Or: HR should focus on enabling the business rather than leading...",
  },
  {
    id: "hr_processes_first",
    label: "Which HR processes should AI transform first?",
    placeholder: "e.g. Recruitment screening, performance reviews, learning recommendations, workforce planning...",
  },
  {
    id: "hr_capabilities",
    label: "What HR capabilities need to be built to enable the AI vision?",
    placeholder: "e.g. Data literacy, AI ethics knowledge, change management, human-AI collaboration skills...",
  },
  {
    id: "governance_principles",
    label: "What governance principles matter most to your HR function?",
    placeholder: "e.g. Transparency in AI decisions, human oversight for all people decisions, employee consent and data privacy...",
  },
];

// ─── Wizard step indicator ────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  const steps = [
    { label: "Business Aspiration", icon: <Target className="w-4 h-4" /> },
    { label: "HR's Role",           icon: <Users className="w-4 h-4" /> },
    { label: "AI Draft",            icon: <Sparkles className="w-4 h-4" /> },
    { label: "Initiatives",         icon: <ListPlus className="w-4 h-4" /> },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const isComplete = stepNum < current;
        const isCurrent  = stepNum === current;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  isComplete
                    ? "bg-green-500 border-green-500 text-black"
                    : isCurrent
                    ? "bg-green-500/15 border-green-500 text-green-400"
                    : "bg-white/4 border-white/15 text-muted-foreground"
                }`}
              >
                {isComplete ? <Check className="w-4 h-4" /> : step.icon}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  isCurrent ? "text-green-400" : isComplete ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mt-[-14px] rounded-full transition-all ${
                  stepNum < current ? "bg-green-500" : "bg-white/10"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Question card ────────────────────────────────────────────────────────────
function QuestionCard({
  question,
  value,
  onChange,
  index,
}: {
  question: { id: string; label: string; placeholder: string };
  value: string;
  onChange: (val: string) => void;
  index: number;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/2 p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-6 h-6 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-bold text-green-400">{index + 1}</span>
        </div>
        <p className="text-sm font-semibold text-foreground leading-snug">{question.label}</p>
      </div>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={question.placeholder}
        rows={3}
        className="resize-none bg-white/4 border-white/10 text-sm placeholder:text-muted-foreground/50 focus:border-green-500/40"
      />
    </div>
  );
}

// ─── Principle card (editable) ────────────────────────────────────────────────
function PrincipleCard({
  index,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: {
  index: number;
  title: string;
  description: string;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
}) {
  const colors = ["#60A5FA", "#A78BFA", "#4ADE80", "#FBBF24", "#F472B6"];
  const color = colors[index % colors.length];
  return (
    <div
      className="rounded-xl border p-5 bg-white/2"
      style={{ borderColor: `${color}25`, borderLeftColor: color, borderLeftWidth: "3px" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
          style={{ background: `${color}18`, color }}
        >
          {index + 1}
        </div>
        <input
          className="flex-1 bg-transparent text-sm font-semibold text-foreground border-none outline-none focus:ring-0 placeholder:text-muted-foreground/40"
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="Principle title..."
        />
        <Edit3 className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
      </div>
      <Textarea
        value={description}
        onChange={e => onDescriptionChange(e.target.value)}
        rows={2}
        className="resize-none bg-white/4 border-white/10 text-sm placeholder:text-muted-foreground/50 focus:border-green-500/40"
        placeholder="Describe this principle..."
      />
    </div>
  );
}

// ─── Initiative library modal ─────────────────────────────────────────────────
function InitiativeLibraryModal({
  open,
  onClose,
  allInitiatives,
  selectedIds,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  allInitiatives: any[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [detailInitiative, setDetailInitiative] = useState<any | null>(null);

  const filtered = useMemo(() => {
    if (categoryFilter === "All") return allInitiatives;
    return allInitiatives.filter(i => {
      const mapped = CATEGORY_MAP[i.category] ?? i.category;
      return mapped === categoryFilter || i.category === categoryFilter;
    });
  }, [allInitiatives, categoryFilter]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-white/8 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold">Initiative Library</DialogTitle>
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-400 text-black font-semibold"
                onClick={onClose}
              >
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Done ({selectedIds.size})
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {FILTER_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    categoryFilter === cat
                      ? "bg-green-500/20 border-green-500/40 text-green-400"
                      : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
                  }`}
                >
                  {CATEGORY_ICONS[cat]}
                  {cat}
                </button>
              ))}
            </div>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((init: any) => {
                const isSelected = selectedIds.has(init.id);
                const typeColor = AI_TYPE_COLORS[init.aiType] ?? "#9CA3AF";
                const catColor = CATEGORY_COLOURS[CATEGORY_MAP[init.category] ?? init.category] ?? "#9CA3AF";
                return (
                  <div
                    key={init.id}
                    className={`relative rounded-xl border p-4 transition-all cursor-pointer ${
                      isSelected
                        ? "border-green-500/40 bg-green-500/8"
                        : "border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/4"
                    }`}
                    onClick={() => onToggle(init.id)}
                    style={{ borderLeftColor: catColor, borderLeftWidth: "3px" }}
                  >
                    <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? "bg-green-500 border-green-500" : "border-white/20"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <p className="text-sm font-semibold text-foreground pr-7 mb-2 leading-snug">{init.name}</p>
                    {init.category && (
                      <p className="text-xs mb-2 font-medium" style={{ color: catColor }}>
                        {CATEGORY_MAP[init.category] ?? init.category}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {init.aiType && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${typeColor}18`, color: typeColor }}>
                          {init.aiType}
                        </span>
                      )}
                      {init.decisionAuthority && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-muted-foreground">
                          {DA_LABELS[init.decisionAuthority] ?? init.decisionAuthority}
                        </span>
                      )}
                      {init.regulatoryFlag && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">EU AI Act</span>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setDetailInitiative(init); }}
                      className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="w-3 h-3" />
                      View details
                    </button>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-2 text-center py-12 text-muted-foreground">
                  <p className="text-sm">No initiatives in this category.</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail modal */}
      <Dialog open={!!detailInitiative} onOpenChange={() => setDetailInitiative(null)}>
        {detailInitiative && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold pr-6">{detailInitiative.name}</DialogTitle>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {detailInitiative.aiType && (
                  <Badge style={{ background: `${AI_TYPE_COLORS[detailInitiative.aiType] ?? "#9CA3AF"}20`, color: AI_TYPE_COLORS[detailInitiative.aiType] ?? "#9CA3AF" }}>
                    {detailInitiative.aiType}
                  </Badge>
                )}
                {detailInitiative.decisionAuthority && (
                  <Badge variant="outline" className="text-xs">{DA_LABELS[detailInitiative.decisionAuthority] ?? detailInitiative.decisionAuthority}</Badge>
                )}
                {detailInitiative.regulatoryFlag && (
                  <Badge className="bg-amber-500/15 text-amber-400 text-xs">EU AI Act</Badge>
                )}
              </div>
            </DialogHeader>
            {detailInitiative.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{detailInitiative.description}</p>
            )}
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

// ─── Main wizard page ─────────────────────────────────────────────────────────
export default function HRAIStrategyAssessmentPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // ── Fetch existing assessment (pre-fill if re-taking) ──────────────────────
  const existingQ = trpc.intelligence.getStrategyAssessment.useQuery(undefined, {
    retry: false,
  });
  const orgContextQ = trpc.intelligence.orgContext.useQuery(undefined, { retry: false });
  const initiativesQ = trpc.strategy.listInitiatives.useQuery(
    { tenantId: user?.tenantId ?? "" },
    { enabled: !!user?.tenantId }
  );

  // ── Wizard state ───────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // Step 1 — Business AI Aspiration
  const [aspirationAnswers, setAspirationAnswers] = useState<Record<string, string>>({});

  // Step 2 — HR's Role
  const [hrRoleAnswers, setHrRoleAnswers] = useState<Record<string, string>>({});

  // Step 3 — Vision & Principles
  const [visionStatement, setVisionStatement] = useState("");
  const [principles, setPrinciples] = useState<Array<{ title: string; description: string }>>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Step 4 — Initiatives + Ambition levels
  const [businessLevel, setBusinessLevel] = useState<number>(3);
  const [peopleLevel, setPeopleLevel] = useState<number>(3);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showLibrary, setShowLibrary] = useState(false);

  // ── Pre-fill from existing assessment ─────────────────────────────────────
  useEffect(() => {
    const d = existingQ.data;
    if (!d?.completed) return;
    if (d.aspirationAnswers) setAspirationAnswers(d.aspirationAnswers as Record<string, string>);
    if (d.hrRoleAnswers) setHrRoleAnswers(d.hrRoleAnswers as Record<string, string>);
    if (d.visionStatement) { setVisionStatement(d.visionStatement); setHasGenerated(true); }
    if (d.guidingPrinciples) { setPrinciples(d.guidingPrinciples); setHasGenerated(true); }
    if (d.businessAmbitionLevel) setBusinessLevel(d.businessAmbitionLevel);
    if (d.peopleAmbitionLevel) setPeopleLevel(d.peopleAmbitionLevel);
    if (d.selectedInitiativeIds?.length) setSelectedIds(new Set(d.selectedInitiativeIds));
  }, [existingQ.data]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const generateMut = trpc.intelligence.generateVisionAndPrinciples.useMutation({
    onSuccess: (data) => {
      setVisionStatement(data.visionStatement);
      setPrinciples(data.principles);
      setHasGenerated(true);
    },
    onError: (err) => {
      toast.error("Failed to generate vision: " + err.message);
    },
  });

  const saveMut = trpc.intelligence.saveStrategyAssessment.useMutation({
    onSuccess: () => {
      toast.success("HR AI Strategy committed successfully.");
      navigate("/ai-strategy");
    },
    onError: (err) => {
      toast.error("Failed to save strategy: " + err.message);
    },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const sector = orgContextQ.data?.sector ?? "other";
  const sectorLabel = sector.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const allInitiatives = initiativesQ.data ?? [];

  const toggleInitiative = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // ── Step validation ────────────────────────────────────────────────────────
  const step1Valid = ASPIRATION_QUESTIONS.every(q => (aspirationAnswers[q.id] ?? "").trim().length >= 10);
  const step2Valid = HR_ROLE_QUESTIONS.every(q => (hrRoleAnswers[q.id] ?? "").trim().length >= 10);
  const step3Valid = visionStatement.trim().length >= 20 && principles.length === 5;
  const step4Valid = selectedIds.size > 0;

  // ── Generate vision ────────────────────────────────────────────────────────
  const handleGenerate = () => {
    generateMut.mutate({
      sector: sectorLabel,
      businessAmbitionLabel: BUSINESS_LEVELS[businessLevel]?.label ?? "Progressive",
      peopleAmbitionLabel: PEOPLE_LEVELS[peopleLevel]?.label ?? "Practitioners",
      aspirationAnswers,
      hrRoleAnswers,
    });
  };

  // ── Commit strategy ────────────────────────────────────────────────────────
  const handleCommit = () => {
    saveMut.mutate({
      aspirationAnswers,
      hrRoleAnswers,
      visionStatement,
      guidingPrinciples: principles,
      businessAmbitionLevel: businessLevel,
      peopleAmbitionLevel: peopleLevel,
      selectedInitiativeIds: Array.from(selectedIds),
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const isLoading = existingQ.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/8 bg-white/2">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate("/ai-strategy")}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              HR AI Strategy
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">HR AI Strategy Assessment</h1>
              <p className="text-sm text-muted-foreground">
                {existingQ.data?.completed ? "Update your HR AI strategy" : "Build your HR AI strategy in 4 steps"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Wizard body */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <StepIndicator current={step} total={4} />

        {/* ── Step 1: Business AI Aspiration ─────────────────────────────── */}
        {step === 1 && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-bold text-foreground">Business AI Aspiration</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Tell us what your organisation wants to achieve with AI. These answers will shape your HR AI strategy.
              </p>
            </div>
            <div className="space-y-4">
              {ASPIRATION_QUESTIONS.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  value={aspirationAnswers[q.id] ?? ""}
                  onChange={val => setAspirationAnswers(prev => ({ ...prev, [q.id]: val }))}
                  index={i}
                />
              ))}
            </div>
            <div className="flex justify-end mt-6">
              <Button
                disabled={!step1Valid}
                onClick={() => setStep(2)}
                className="bg-green-500 hover:bg-green-400 text-black font-semibold"
              >
                Next: HR's Role
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            {!step1Valid && (
              <p className="text-xs text-muted-foreground text-right mt-2">
                Please answer all questions (at least 10 characters each) to continue.
              </p>
            )}
          </div>
        )}

        {/* ── Step 2: HR's Role ──────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold text-foreground">HR's Role in the AI Vision</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Define how HR will enable, lead, and govern AI adoption across your organisation.
              </p>
            </div>
            <div className="space-y-4">
              {HR_ROLE_QUESTIONS.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  value={hrRoleAnswers[q.id] ?? ""}
                  onChange={val => setHrRoleAnswers(prev => ({ ...prev, [q.id]: val }))}
                  index={i}
                />
              ))}
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <Button
                disabled={!step2Valid}
                onClick={() => setStep(3)}
                className="bg-green-500 hover:bg-green-400 text-black font-semibold"
              >
                Next: AI Draft
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            {!step2Valid && (
              <p className="text-xs text-muted-foreground text-right mt-2">
                Please answer all questions (at least 10 characters each) to continue.
              </p>
            )}
          </div>
        )}

        {/* ── Step 3: AI Draft ───────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold text-foreground">AI-Drafted Vision & Principles</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Our AI will draft a vision statement and 5 guiding principles based on your answers. You can edit everything before committing.
              </p>
            </div>

            {/* Ambition selectors (needed for LLM context) */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Business AI Ambition
                </label>
                <Select value={String(businessLevel)} onValueChange={v => setBusinessLevel(Number(v))}>
                  <SelectTrigger className="bg-white/4 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(l => (
                      <SelectItem key={l} value={String(l)}>
                        {BUSINESS_LEVELS[l].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {businessLevel && (
                  <p className="text-xs text-muted-foreground mt-1.5">{BUSINESS_LEVELS[businessLevel].description}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  People AI Ambition
                </label>
                <Select value={String(peopleLevel)} onValueChange={v => setPeopleLevel(Number(v))}>
                  <SelectTrigger className="bg-white/4 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(l => (
                      <SelectItem key={l} value={String(l)}>
                        {PEOPLE_LEVELS[l].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {peopleLevel && (
                  <p className="text-xs text-muted-foreground mt-1.5">{PEOPLE_LEVELS[peopleLevel].description}</p>
                )}
              </div>
            </div>

            {/* Generate button */}
            {!hasGenerated && (
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-6 text-center mb-6">
                <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground mb-1">Ready to generate your strategy</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Our AI will analyse your answers and create a tailored vision statement and 5 guiding principles for your HR AI strategy.
                </p>
                <Button
                  onClick={handleGenerate}
                  disabled={generateMut.isPending}
                  className="bg-purple-500 hover:bg-purple-400 text-white font-semibold"
                >
                  {generateMut.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Vision & Principles
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Editable vision statement */}
            {hasGenerated && (
              <div className="space-y-5">
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-green-400" />
                    <p className="text-sm font-semibold text-green-400">Vision Statement</p>
                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                      <Edit3 className="w-3 h-3" /> Editable
                    </span>
                  </div>
                  <Textarea
                    value={visionStatement}
                    onChange={e => setVisionStatement(e.target.value)}
                    rows={4}
                    className="resize-none bg-white/4 border-white/10 text-sm leading-relaxed"
                    placeholder="Your AI vision statement..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-foreground">5 Guiding Principles</p>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Edit3 className="w-3 h-3" /> All editable
                    </span>
                  </div>
                  <div className="space-y-3">
                    {principles.map((p, i) => (
                      <PrincipleCard
                        key={i}
                        index={i}
                        title={p.title}
                        description={p.description}
                        onTitleChange={v => setPrinciples(prev => prev.map((x, j) => j === i ? { ...x, title: v } : x))}
                        onDescriptionChange={v => setPrinciples(prev => prev.map((x, j) => j === i ? { ...x, description: v } : x))}
                      />
                    ))}
                  </div>
                </div>

                {/* Regenerate option */}
                <button
                  onClick={() => { setHasGenerated(false); handleGenerate(); }}
                  disabled={generateMut.isPending}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Regenerate with AI
                </button>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <Button
                disabled={!step3Valid}
                onClick={() => setStep(4)}
                className="bg-green-500 hover:bg-green-400 text-black font-semibold"
              >
                Next: Select Initiatives
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Initiative Selection ───────────────────────────────── */}
        {step === 4 && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <ListPlus className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-foreground">Select Your Initiatives</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose the AI initiatives that will deliver your vision. These will populate the HR AI Strategy roadmap.
              </p>
            </div>

            {/* Selected initiatives summary */}
            <div className="rounded-xl border border-white/8 bg-white/2 p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-semibold text-foreground">
                    {selectedIds.size} initiative{selectedIds.size !== 1 ? "s" : ""} selected
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLibrary(true)}
                  className="text-xs"
                >
                  <ListPlus className="w-3.5 h-3.5 mr-1.5" />
                  Browse Library
                </Button>
              </div>

              {selectedIds.size === 0 ? (
                <div className="text-center py-8">
                  <ListPlus className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No initiatives selected yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Open the initiative library to browse and select AI initiatives.</p>
                  <Button
                    size="sm"
                    onClick={() => setShowLibrary(true)}
                    className="mt-4 bg-green-500 hover:bg-green-400 text-black font-semibold"
                  >
                    <ListPlus className="w-3.5 h-3.5 mr-1.5" />
                    Open Initiative Library
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allInitiatives
                    .filter(i => selectedIds.has(i.id))
                    .map((init: any) => {
                      const catColor = CATEGORY_COLOURS[CATEGORY_MAP[init.category] ?? init.category] ?? "#9CA3AF";
                      return (
                        <div
                          key={init.id}
                          className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/2 px-3 py-2.5"
                          style={{ borderLeftColor: catColor, borderLeftWidth: "3px" }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{init.name}</p>
                            <p className="text-xs text-muted-foreground">{CATEGORY_MAP[init.category] ?? init.category}</p>
                          </div>
                          <button
                            onClick={() => toggleInitiative(init.id)}
                            className="w-5 h-5 rounded-full bg-white/8 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors text-muted-foreground flex-shrink-0"
                          >
                            <ChevronRight className="w-3 h-3 rotate-180" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Strategy summary before commit */}
            {selectedIds.size > 0 && (
              <div className="rounded-xl border border-green-500/15 bg-green-500/5 p-5 mb-5">
                <p className="text-xs font-bold tracking-widest uppercase text-green-400 mb-3">Strategy Summary</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Business Ambition</span>
                    <p className="font-semibold text-foreground">{BUSINESS_LEVELS[businessLevel]?.label}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">People Ambition</span>
                    <p className="font-semibold text-foreground">{PEOPLE_LEVELS[peopleLevel]?.label}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Initiatives</span>
                    <p className="font-semibold text-foreground">{selectedIds.size} selected</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sector</span>
                    <p className="font-semibold text-foreground">{sectorLabel}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/8">
                  <span className="text-muted-foreground text-xs">Vision</span>
                  <p className="text-sm text-foreground mt-1 leading-relaxed line-clamp-2">{visionStatement}</p>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ChevronLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <Button
                disabled={!step4Valid || saveMut.isPending}
                onClick={handleCommit}
                className="bg-green-500 hover:bg-green-400 text-black font-semibold"
              >
                {saveMut.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Committing…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Commit Strategy
                  </>
                )}
              </Button>
            </div>
            {!step4Valid && (
              <p className="text-xs text-muted-foreground text-right mt-2">
                Select at least one initiative to commit your strategy.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Initiative library modal */}
      <InitiativeLibraryModal
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        allInitiatives={allInitiatives}
        selectedIds={selectedIds}
        onToggle={toggleInitiative}
      />
    </div>
  );
}
