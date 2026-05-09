/**
 * Assessment Landing - AiQ Enterprise Platform
 *
 * Auto-redirects to the most recent session:
 *   in_progress → /assessment/:id  (resume)
 *   completed   → /assessment/:id/results
 *   none        → show start screen
 *
 * History + resume are integrated as a left-hand nav panel within the
 * results/session views via AssessmentHistoryPanel (exported for use there).
 */

import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { scoreToColor, formatPeakonScore } from "@/lib/peakon-colors";
import { ProfilingModal, type ProfilingData } from "@/components/ProfilingModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Play,
  CheckCircle2,
  Clock,
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
  ChevronDown,
  Plus,
} from "lucide-react";

// --- Capability Domains -------------------------------------------------------
const CAPABILITY_DOMAINS = [
  { key: "ai_interaction",        label: "AI Interaction",          icon: Target,   colour: "#4477AA" },
  { key: "ai_output_evaluation",  label: "AI Output Evaluation",    icon: Brain,    colour: "#047857" },
  { key: "ai_ethics_trust",       label: "AI Ethics & Trust",       icon: Shield,   colour: "#b91c1c" },
  { key: "ai_change_leadership",  label: "AI Change Leadership",    icon: Gavel,    colour: "#99882A" },
  { key: "ai_workflow_design",    label: "AI Workflow Design",      icon: Workflow, colour: "#66CCEE" },
  { key: "workforce_ai_readiness",label: "Workforce AI Readiness",  icon: Database, colour: "#D97706" },
];

// --- Readiness Config ---------------------------------------------------------
const READINESS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  safe:    { label: "Safe to Deploy",     color: "text-primary",        icon: CheckCircle2 },
  at_risk: { label: "At Risk",            color: "text-[#99882A]",      icon: AlertTriangle },
  unsafe:  { label: "Needs Development",  color: "text-[#CC3344]",      icon: ShieldAlert },
  unknown: { label: "Not Assessed",       color: "text-muted-foreground",icon: HelpCircle },
};

// --- Session badge ------------------------------------------------------------
function SessionBadge({ state }: { state: string }) {
  const map: Record<string, string> = {
    completed:   "bg-primary/12 text-primary border-primary/25",
    in_progress: "bg-[#D97706]/12 text-[#99882A] border-[#D97706]/25",
    abandoned:   "bg-slate-800/60 text-slate-400 border-slate-600/50",
  };
  const labels: Record<string, string> = { completed: "Completed", in_progress: "In Progress", abandoned: "Abandoned" };
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", map[state] ?? map.abandoned)}>
      {labels[state] ?? state}
    </span>
  );
}

// --- History Panel (also exported for use inside results/session pages) -------
export function AssessmentHistoryPanel({
  sessions,
  activeId,
  onStart,
  isStarting,
}: {
  sessions: any[];
  activeId?: string;
  onStart: () => void;
  isStarting: boolean;
}) {
  const [, navigate] = useLocation();
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">History</p>
        <button
          onClick={onStart}
          disabled={isStarting}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {sessions.length === 0 && (
          <p className="text-xs text-muted-foreground px-4 py-3">No assessments yet.</p>
        )}
        {sessions.map((s: any) => {
          const isActive = s.id === activeId;
          const completedAt = s.completedAt
            ? new Date(s.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : null;
          const startedAt = new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
          const stateConfig = READINESS_CONFIG[s.score?.primaryState ?? "unknown"];
          const StateIcon = stateConfig.icon;
          return (
            <button
              key={s.id}
              onClick={() => {
                if (s.state === "completed") navigate(`/assessment/${s.id}/results`);
                else if (s.state === "in_progress") navigate(`/assessment/${s.id}`);
              }}
              className={cn(
                "w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors border-l-2",
                isActive ? "border-l-primary bg-accent/30" : "border-l-transparent"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <SessionBadge state={s.state} />
                {s.state === "completed" && s.score?.overallScore !== undefined && (
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: scoreToColor(s.score.overallScore).bg }}
                  >
                    {formatPeakonScore(s.score.overallScore)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {completedAt ? `Completed ${completedAt}` : `Started ${startedAt}`}
              </p>
              {s.state === "in_progress" && s.answeredCount !== undefined && (
                <div className="mt-1.5 space-y-0.5">
                  <Progress value={Math.round((s.answeredCount / (s.totalTarget ?? 49)) * 100)} className="h-1" />
                  <p className="text-[10px] text-muted-foreground">{s.answeredCount}/{s.totalTarget ?? 49} answered</p>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Start Screen (no sessions) -----------------------------------------------
function StartScreen({
  onStart,
  isStarting,
  lastCapabilityScores,
}: {
  onStart: () => void;
  isStarting: boolean;
  lastCapabilityScores: Record<string, number>;
}) {
  const [showAbout, setShowAbout] = useState(true);
  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Capability Assessment</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            AIQ V9.2 · 50 interactions · 6 capability domains · ~35 minutes
          </p>
        </div>
        <Button onClick={onStart} disabled={isStarting} className="gap-2 shrink-0">
          <Play className="w-4 h-4" />
          {isStarting ? "Starting…" : "Start Assessment"}
        </Button>
      </div>

      {/* About panel */}
      <Card>
        <CardContent className="p-0">
          <button
            className="w-full flex items-center justify-between p-4 text-left"
            onClick={() => setShowAbout(v => !v)}
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">About the AIQ V9.2 Standard Assessment</span>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showAbout && "rotate-180")} />
          </button>
          {showAbout && (
            <div className="px-4 pb-5 space-y-4 border-t border-border">
              <p className="text-sm text-muted-foreground leading-relaxed pt-3">
                The AIQ V9.2 Standard Assessment measures your practical AI capability across six domains using
                50 scenario-based interactions. Each interaction presents a realistic workplace situation and asks
                you to make a decision. Your answers accumulate into a capability profile - not a pass/fail score.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CAPABILITY_DOMAINS.map(domain => {
                  const Icon = domain.icon;
                  const prior = lastCapabilityScores[domain.key];
                  return (
                    <div key={domain.key} className="flex items-start gap-2.5 p-3 rounded-xl border bg-card">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: `${domain.colour}18` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: domain.colour }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-tight">{domain.label}</p>
                        {prior !== undefined && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${prior}%`, backgroundColor: scoreToColor(prior / 10).bg }} />
                            </div>
                            <span className="text-[10px] font-bold px-1 py-0.5 rounded text-white"
                              style={{ backgroundColor: scoreToColor(prior / 10).bg }}>
                              {formatPeakonScore(prior / 10)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-6 pt-1 flex-wrap">
                {[
                  { label: "Interactions", value: "50" },
                  { label: "Domains", value: "6" },
                  { label: "Est. Time", value: "~35 min" },
                  { label: "Version", value: "V9.2" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-lg font-bold text-primary">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Main Component -----------------------------------------------------------
export default function AssessmentPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const forceNew = new URLSearchParams(search).get("new") === "1";
  const [showProfiling, setShowProfiling] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const { data: defaultBlueprint } = trpc.assessment.defaultBlueprint.useQuery();
  const { data: sessions, isLoading } = trpc.assessment.history.useQuery({});
  const onboardingMutation = trpc.auth.completeOnboarding.useMutation();

  const startMutation = trpc.assessment.startSession.useMutation({
    onSuccess: result => {
      setShowProfiling(false);
      navigate(`/assessment/${result.sessionId}`);
    },
    onError: err => toast.error(err.message),
  });

  const inProgressSession = sessions?.find((s: any) => s.state === "in_progress") as any;
  const lastCompletedSession = sessions?.find((s: any) => s.state === "completed");
  const lastCapabilityScores: Record<string, number> = lastCompletedSession?.score?.capabilityScores ?? {};

  const handleStartClick = () => {
    if (!defaultBlueprint?.id) {
      toast.error("No assessment blueprint available. Please contact your administrator.");
      return;
    }
    setShowProfiling(true);
  };

  const handleProfilingStart = async (data: ProfilingData) => {
    const blueprintId = defaultBlueprint?.id;
    if (!blueprintId) return;
    const ROLE_FAMILY_TO_ARCHETYPE: Record<string, string> = {
      talent: "talent_acquisition", learning: "ld_specialist", hrbp: "hrbp",
      analytics: "people_analytics", reward: "reward",
      ai_ethics_trust: "hr_professional", operations: "hr_ops", other: "hr_professional",
    };
    const archetypeId = ROLE_FAMILY_TO_ARCHETYPE[data.roleFamily] ?? data.roleFamily;
    const roleHint = `${archetypeId}::${data.aiUsageLevel}`;
    try {
      await onboardingMutation.mutateAsync({
        jobFunction: data.jobFunction, seniorityLevel: data.seniorityLevel,
        experienceLevel: data.experienceLevel, aiUsageLevel: data.aiUsageLevel,
        aiToolsUsed: data.aiToolsUsed, sector: data.sector, roleFamily: data.roleFamily,
      });
    } catch {
      toast.warning("Profile data could not be saved, but your assessment will continue.");
    }
    startMutation.mutate({ blueprintId, roleHint });
  };

  // Auto-redirect to latest session (completed → results, in_progress → session)
  useEffect(() => {
    if (forceNew || hasRedirected || isLoading || !sessions) return;
    const inProgress = sessions.find((s: any) => s.state === "in_progress");
    const lastCompleted = sessions.find((s: any) => s.state === "completed");
    if (lastCompleted) {
      setHasRedirected(true);
      navigate(`/assessment/${lastCompleted.id}/results`);
    } else if (inProgress) {
      setHasRedirected(true);
      navigate(`/assessment/${inProgress.id}`);
    }
    // else: no sessions → show start screen below
  }, [sessions, isLoading, hasRedirected, navigate]);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // If sessions exist, we're redirecting — show nothing while navigating
  if (!forceNew && sessions && sessions.length > 0 && !hasRedirected) {
    return null;
  }

  return (
    <>
      <ProfilingModal
        open={showProfiling}
        onClose={() => setShowProfiling(false)}
        onStart={handleProfilingStart}
        isPending={startMutation.isPending || onboardingMutation.isPending}
      />
      {/* Resume banner - shown when an assessment is in progress */}
      {inProgressSession && (
        <div className="mx-6 mt-6 mb-0 rounded-xl border border-[#D97706]/30 bg-[#D97706]/8 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#D97706] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Assessment in Progress</p>
              <p className="text-xs text-muted-foreground">
                {inProgressSession.answeredCount ?? 0} of {inProgressSession.totalTarget ?? 49} questions answered
                {" · "}{Math.round(((inProgressSession.answeredCount ?? 0) / (inProgressSession.totalTarget ?? 49)) * 100)}% complete
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate(`/assessment/${inProgressSession.id}`)}
            className="gap-2 shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            Resume
          </Button>
        </div>
      )}
      <StartScreen
        onStart={handleStartClick}
        isStarting={startMutation.isPending}
        lastCapabilityScores={lastCapabilityScores}
      />
      {/* Assessment history */}
      {sessions && sessions.length > 0 && (
        <div className="mx-6 mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Assessment History</h2>
          <div className="space-y-2">
            {sessions.map((s: any) => (
              <button
                key={s.id}
                onClick={() => {
                  if (s.state === "completed") navigate(`/assessment/${s.id}/results`);
                  else if (s.state === "in_progress") navigate(`/assessment/${s.id}`);
                }}
                className="w-full text-left flex items-center justify-between gap-4 p-4 rounded-xl border bg-card hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {s.state === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-[#D97706] shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">AIQ V9.2 Standard Assessment</p>
                    <p className="text-xs text-muted-foreground">
                      {s.state === "completed"
                        ? `Completed ${new Date(s.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                        : `Started ${new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <SessionBadge state={s.state} />
                  {s.state === "completed" && s.score?.overallScore !== undefined && (
                    <span
                      className="text-sm font-bold tabular-nums px-2 py-0.5 rounded-lg text-white"
                      style={{ backgroundColor: scoreToColor(s.score.overallScore).bg }}
                    >
                      {formatPeakonScore(s.score.overallScore)}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
