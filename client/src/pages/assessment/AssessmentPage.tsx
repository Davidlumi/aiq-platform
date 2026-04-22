/**
 * Assessment Landing Page — AiQ Enterprise Platform
 *
 * Implements the V9.2 assessment landing specification with pre-assessment profiling:
 * - Pre-assessment intake: role, seniority, AI experience level
 * - Purpose panel explaining the AIQ V9.2 Standard Assessment
 * - Blueprint info: 50 interactions, 6 capability domains, ~35 minutes
 * - Active session resume card (if in_progress session exists)
 * - Assessment history with readiness states and scores
 * - Start new / resume CTA
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ClipboardList,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  ChevronRight,
  Target,
  Brain,
  Shield,
  Workflow,
  Database,
  Gavel,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  User,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Capability Domain Info ───────────────────────────────────────────────────

const CAPABILITY_DOMAINS = [
  { key: "execution",           label: "AI Execution",            icon: Target,    colour: "#4477AA", description: "Quality of AI task execution and validation" },
  { key: "judgement",           label: "AI Judgement",            icon: Brain,     colour: "#AA3377", description: "Proportionate decision-making with AI outputs" },
  { key: "governance",          label: "AI Risk & Governance",    icon: Shield,    colour: "#228833", description: "Risk identification and governance application" },
  { key: "appropriateness",     label: "AI Appropriateness",      icon: Gavel,     colour: "#EE6677", description: "Knowing when AI use is appropriate" },
  { key: "workflow",            label: "AI Workflow Application", icon: Workflow,  colour: "#66CCEE", description: "Integrating AI into professional workflows" },
  { key: "data_interpretation", label: "AI Data & Insight",       icon: Database,  colour: "#BBBBBB", description: "Interpreting and challenging AI-generated data" },
];

// ─── Role Options (matching roleArchetypes.ts) ────────────────────────────────

const ROLE_OPTIONS = [
  { value: "hrbp",             label: "HR Business Partner" },
  { value: "hr_generalist",    label: "HR Generalist" },
  { value: "hr_advisor",       label: "HR Advisor" },
  { value: "talent_acquisition", label: "Talent Acquisition Specialist" },
  { value: "er_specialist",    label: "Employee Relations Specialist" },
  { value: "ld_specialist",    label: "L&D Specialist" },
  { value: "people_analytics", label: "People Analytics Specialist" },
  { value: "hr_ops",           label: "HR Operations Specialist" },
  { value: "reward",           label: "Reward & Compensation Specialist" },
  { value: "hr_leader",        label: "HR Leader / CHRO" },
  { value: "hr_professional",  label: "Other HR Professional" },
];

const AI_EXPERIENCE_OPTIONS = [
  { value: "none",         label: "No experience — I haven't used AI tools in my work" },
  { value: "beginner",     label: "Beginner — I've tried a few AI tools occasionally" },
  { value: "intermediate", label: "Intermediate — I use AI tools regularly in my role" },
  { value: "advanced",     label: "Advanced — AI is central to how I work day-to-day" },
];

// ─── Readiness State Config ───────────────────────────────────────────────────

const READINESS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  safe:    { label: "Safe to Deploy", color: "text-[#228833]",        icon: CheckCircle2 },
  at_risk: { label: "At Risk",        color: "text-[#EE8866]",        icon: AlertTriangle },
  unsafe:  { label: "Unsafe",         color: "text-[#EE6677]",        icon: ShieldAlert },
  unknown: { label: "Not Assessed",   color: "text-muted-foreground", icon: HelpCircle },
};

// ─── Session State Badge ──────────────────────────────────────────────────────

function SessionStateBadge({ state }: { state: string }) {
  const map: Record<string, string> = {
    completed:   "bg-[#228833]/10 text-[#228833] border-[#228833]/20",
    in_progress: "bg-[#EE8866]/10 text-[#EE8866] border-[#EE8866]/20",
    abandoned:   "bg-muted text-muted-foreground border-border",
  };
  const labels: Record<string, string> = {
    completed:   "Completed",
    in_progress: "In Progress",
    abandoned:   "Abandoned",
  };
  return (
    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", map[state] ?? map.abandoned)}>
      {labels[state] ?? state}
    </span>
  );
}

// ─── Pre-Assessment Profiling Modal ──────────────────────────────────────────

interface ProfilingModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (roleHint: string, aiExperience: string) => void;
  isPending: boolean;
}

function ProfilingModal({ open, onClose, onStart, isPending }: ProfilingModalProps) {
  const [role, setRole] = useState("");
  const [aiExperience, setAiExperience] = useState("");

  const canStart = role !== "" && aiExperience !== "";

  const handleStart = () => {
    if (!canStart) return;
    // Encode both role and experience into the roleHint string
    const roleHint = `${role}::${aiExperience}`;
    onStart(roleHint, aiExperience);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#3B4EFF]/10 flex items-center justify-center">
              <User className="w-4 h-4 text-[#3B4EFF]" />
            </div>
            <DialogTitle className="text-lg font-semibold font-sora">Before You Begin</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Tell us a little about your role and experience with AI. This helps calibrate the assessment
            to your context — questions will be more relevant and your results more meaningful.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Role selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#3B4EFF]" />
              What best describes your HR role?
            </label>
            <div className="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto pr-1">
              {ROLE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={cn(
                    "text-left px-3 py-2.5 rounded-lg border text-sm transition-all",
                    role === opt.value
                      ? "border-[#3B4EFF] bg-[#3B4EFF]/8 text-[#3B4EFF] font-medium"
                      : "border-border hover:border-[#3B4EFF]/40 text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI experience */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#3B4EFF]" />
              How would you describe your current experience with AI tools?
            </label>
            <div className="space-y-1.5">
              {AI_EXPERIENCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAiExperience(opt.value)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all",
                    aiExperience === opt.value
                      ? "border-[#3B4EFF] bg-[#3B4EFF]/8 text-[#3B4EFF] font-medium"
                      : "border-border hover:border-[#3B4EFF]/40 text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy note */}
          <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            This information is used only to personalise your assessment experience. It does not affect your score.
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStart}
              disabled={!canStart || isPending}
              className="flex-1 bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white"
            >
              <Play className="w-4 h-4 mr-1.5" />
              {isPending ? "Starting…" : "Start Assessment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AssessmentPage() {
  const [, navigate] = useLocation();
  const [showProfiling, setShowProfiling] = useState(false);

  const { data: defaultBlueprint } = trpc.assessment.defaultBlueprint.useQuery();
  const { data: sessions, isLoading } = trpc.assessment.history.useQuery({});

  const startMutation = trpc.assessment.startSession.useMutation({
    onSuccess: result => {
      setShowProfiling(false);
      navigate(`/assessment/${result.sessionId}`);
    },
    onError: err => toast.error(err.message),
  });

  const handleStartClick = () => {
    const blueprintId = defaultBlueprint?.id;
    if (!blueprintId) {
      toast.error("No assessment blueprint available. Please contact your administrator.");
      return;
    }
    setShowProfiling(true);
  };

  const handleProfilingStart = (roleHint: string) => {
    const blueprintId = defaultBlueprint?.id;
    if (!blueprintId) return;
    startMutation.mutate({ blueprintId, roleHint });
  };

  // Find any in-progress session
  const activeSession = sessions?.find(s => s.state === "in_progress");
  const hasCompletedBefore = sessions?.some(s => s.state === "completed") ?? false;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* ── Pre-Assessment Profiling Modal ── */}
      <ProfilingModal
        open={showProfiling}
        onClose={() => setShowProfiling(false)}
        onStart={handleProfilingStart}
        isPending={startMutation.isPending}
      />

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sora">AI Capability Assessment</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            AIQ V9.2 Standard Assessment · 50 interactions · 6 capability domains · ~35 minutes
          </p>
        </div>
        {!activeSession && (
          <Button
            onClick={handleStartClick}
            disabled={startMutation.isPending}
            className="bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white gap-2 shrink-0"
          >
            <Play className="w-4 h-4" />
            {startMutation.isPending ? "Starting…" : hasCompletedBefore ? "Retake Assessment" : "Start Assessment"}
          </Button>
        )}
      </div>

      {/* ── Active Session Resume Card ── */}
      {activeSession && (
        <Card className="border-2 border-[#EE8866]/30 bg-[#EE8866]/4">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EE8866]/15 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-[#EE8866]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Assessment in Progress</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Started {new Date(activeSession.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })} · Your progress has been saved
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate(`/assessment/${activeSession.id}`)}
                className="bg-[#EE8866] hover:bg-[#EE8866]/90 text-white gap-2 shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                Resume
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Purpose Panel ── */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#3B4EFF]" />
            <CardTitle className="text-base font-semibold">About the AIQ V9.2 Standard Assessment</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The AIQ V9.2 Standard Assessment measures your practical AI capability across six domains using
            50 scenario-based interactions. Each interaction presents a realistic workplace situation involving
            AI tools and asks you to make a decision. Your answers generate signal deltas that accumulate into
            a capability profile — not a pass/fail score.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Interactions are weighted by <strong className="text-foreground">risk level</strong> (Low / Medium / High)
            and <strong className="text-foreground">difficulty</strong> (1–3). Higher-risk, higher-difficulty
            interactions carry greater weight in your final profile. A <strong className="text-foreground">confidence
            slider</strong> on each question captures your self-assessment, which feeds into your credibility score.
          </p>

          {/* Capability domains grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            {CAPABILITY_DOMAINS.map(domain => {
              const Icon = domain.icon;
              return (
                <div
                  key={domain.key}
                  className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-muted/20"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `${domain.colour}18` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: domain.colour }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground leading-tight">{domain.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{domain.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Assessment stats */}
          <div className="flex items-center gap-6 pt-1 flex-wrap">
            {[
              { label: "Interactions", value: "50" },
              { label: "Capability Domains", value: "6" },
              { label: "Estimated Time", value: "~35 min" },
              { label: "Model Version", value: "V9.2" },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-lg font-bold text-[#3B4EFF] font-sora">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Assessment History ── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Assessment History</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <Card className="border-border border-dashed">
            <CardContent className="p-8 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No assessments yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start your first AIQ V9.2 assessment to generate your capability profile.
              </p>
              <Button
                onClick={handleStartClick}
                disabled={startMutation.isPending}
                className="mt-4 bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white gap-2"
              >
                <Play className="w-4 h-4" />
                Start First Assessment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sessions.map((session: any) => {
              const primaryState = session.score?.primaryState ?? "unknown";
              const stateConfig = READINESS_CONFIG[primaryState] ?? READINESS_CONFIG.unknown;
              const StateIcon = stateConfig.icon;
              const overallScore = session.score?.overallScore;
              const completedAt = session.completedAt
                ? new Date(session.completedAt).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })
                : null;
              return (
                <Card
                  key={session.id}
                  className={cn(
                    "border-border hover:border-[#3B4EFF]/30 transition-colors cursor-pointer",
                    session.state === "in_progress" && "border-[#EE8866]/30"
                  )}
                  onClick={() => {
                    if (session.state === "completed") navigate(`/assessment/${session.id}/results`);
                    else if (session.state === "in_progress") navigate(`/assessment/${session.id}`);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          {session.state === "completed" ? (
                            <StateIcon className={cn("w-4 h-4", stateConfig.color)} />
                          ) : session.state === "in_progress" ? (
                            <Clock className="w-4 h-4 text-[#EE8866]" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-foreground">
                              AIQ V9.2 Standard Assessment
                            </p>
                            <SessionStateBadge state={session.state} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {completedAt
                              ? `Completed ${completedAt}`
                              : `Started ${new Date(session.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {session.state === "completed" && overallScore !== undefined && (
                          <div className="text-right">
                            <p className={cn("text-lg font-bold font-sora", stateConfig.color)}>
                              {Math.round(overallScore)}
                            </p>
                            <p className={cn("text-xs font-medium", stateConfig.color)}>
                              {stateConfig.label}
                            </p>
                          </div>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
