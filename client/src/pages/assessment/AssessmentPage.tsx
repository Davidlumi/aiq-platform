/**
 * Assessment Landing Page — AiQ Enterprise Platform
 *
 * Implements the V9.2 assessment landing specification with pre-assessment profiling:
 * - Pre-assessment intake: role, seniority, AI experience level, sector
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
} from "lucide-react";
import { ProfilingModal, type ProfilingData } from "@/components/ProfilingModal";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Capability Domain Info ───────────────────────────────────────────────────

const CAPABILITY_DOMAINS = [
  { key: "ai_interaction",      label: "AI Interaction",          icon: Target,    colour: "#4477AA", description: "Practical competence with AI tools and chatbots" },
  { key: "ai_output_evaluation",label: "AI Output Evaluation",   icon: Brain,     colour: "#228833", description: "Critical assessment of AI outputs before acting" },
  { key: "ai_ethics_trust",     label: "AI Ethics & Trust",       icon: Shield,    colour: "#AA3377", description: "Ethical reasoning and employee trust in AI" },
  { key: "ai_change_leadership",label: "AI Change Leadership",    icon: Gavel,     colour: "#D97706", description: "Leading AI transformation and handling resistance" },
  { key: "ai_workflow_design",   label: "AI Workflow Design",      icon: Workflow,  colour: "#66CCEE", description: "Designing AI-augmented workflows with human oversight" },
  { key: "workforce_ai_readiness",label: "Workforce AI Readiness",  icon: Database,  colour: "#CCBB44", description: "Diagnosing team capability gaps and designing interventions" },
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AssessmentPage() {
  const [, navigate] = useLocation();
  const [showProfiling, setShowProfiling] = useState(false);

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

  // P12: derive prior capability scores from last completed session
  const lastCompletedSession = sessions?.find((s: any) => s.state === "completed");
  const lastCapabilityScores: Record<string, number> = lastCompletedSession?.score?.capabilityScores ?? {};
  const hasCompletedBefore = !!lastCompletedSession;

  const handleStartClick = () => {
    const blueprintId = defaultBlueprint?.id;
    if (!blueprintId) {
      toast.error("No assessment blueprint available. Please contact your administrator.");
      return;
    }
    setShowProfiling(true);
  };

  const handleProfilingStart = async (data: ProfilingData) => {
    const blueprintId = defaultBlueprint?.id;
    if (!blueprintId) return;

    // T2-8: Build roleHint using roleFamily ID first (maps directly to ROLE_ARCHETYPES keys)
    // roleFamily IDs: talent, learning, hrbp, analytics, reward, governance, operations, other
    // These map to: talent_acquisition, ld_specialist, hrbp, people_analytics, reward, hr_professional, hr_ops, hr_professional
    const ROLE_FAMILY_TO_ARCHETYPE: Record<string, string> = {
      talent: "talent_acquisition",
      learning: "ld_specialist",
      hrbp: "hrbp",
      analytics: "people_analytics",
      reward: "reward",
      ai_ethics_trust: "hr_professional",
      operations: "hr_ops",
      other: "hr_professional",
    };
    const archetypeId = ROLE_FAMILY_TO_ARCHETYPE[data.roleFamily] ?? data.roleFamily;
    const roleHint = `${archetypeId}::${data.aiUsageLevel}`;

    // Persist profile data to the user record
    try {
      await onboardingMutation.mutateAsync({
        jobFunction: data.jobFunction,
        seniorityLevel: data.seniorityLevel,
        experienceLevel: data.experienceLevel,
        aiUsageLevel: data.aiUsageLevel,
        aiToolsUsed: data.aiToolsUsed,
        sector: data.sector,
        roleFamily: data.roleFamily,
      });
    } catch {
      // Non-fatal: profile save failed but we can still start the assessment
      toast.warning("Profile data could not be saved, but your assessment will continue.");
    }

    startMutation.mutate({ blueprintId, roleHint });
  };

  // Find any in-progress session
  const activeSession = sessions?.find(s => s.state === "in_progress");
  // hasCompletedBefore is derived above from lastCompletedSession

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* ── Pre-Assessment Profiling Modal ── */}
      <ProfilingModal
        open={showProfiling}
        onClose={() => setShowProfiling(false)}
        onStart={handleProfilingStart}
        isPending={startMutation.isPending || onboardingMutation.isPending}
      />

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Capability Assessment</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            AIQ V9.2 Standard Assessment · 50 interactions · 6 capability domains · ~35 minutes
          </p>
        </div>
        {!activeSession && (
          <Button
            onClick={handleStartClick}
            disabled={startMutation.isPending}
            className="bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2 shrink-0"
          >
            <Play className="w-4 h-4" />
            {startMutation.isPending ? "Starting…" : hasCompletedBefore ? "Retake Assessment" : "Start Assessment"}
          </Button>
        )}
      </div>

      {/* ── Active Session Resume Card ── */}
      {activeSession && (
        <Card className="border-2 border-[#EE8866]/30 bg-[#EE8866]/4">
          <CardContent className="p-5 space-y-3">
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
            {/* T2-7: Show progress bar for in-progress session */}
            {(activeSession as any).answeredCount !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {(activeSession as any).answeredCount} of {(activeSession as any).totalTarget ?? 49} questions answered
                  </span>
                  <span className="text-xs font-semibold text-[#EE8866]">
                    {Math.round(((activeSession as any).answeredCount / ((activeSession as any).totalTarget ?? 49)) * 100)}% complete
                  </span>
                </div>
                <Progress
                  value={Math.round(((activeSession as any).answeredCount / ((activeSession as any).totalTarget ?? 49)) * 100)}
                  className="h-1.5"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Purpose Panel ── */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#10B981]" />
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
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-tight">{domain.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{domain.description}</p>
                    {/* P12: Show prior score if available */}
                    {lastCapabilityScores[domain.key] !== undefined && (
                      <div className="mt-1.5 flex items-center gap-1">
                        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${lastCapabilityScores[domain.key]}%`, backgroundColor: domain.colour }}
                          />
                        </div>
                        <span className="text-[10px] font-bold shrink-0" style={{ color: domain.colour }}>
                          {Math.round(lastCapabilityScores[domain.key])}
                        </span>
                      </div>
                    )}
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
                <p className="text-lg font-bold text-[#10B981]">{stat.value}</p>
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
                className="mt-4 bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2"
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
                    "border-border hover:border-[#10B981]/30 transition-colors cursor-pointer",
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
                            <p className={cn("text-lg font-bold", stateConfig.color)}>
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
