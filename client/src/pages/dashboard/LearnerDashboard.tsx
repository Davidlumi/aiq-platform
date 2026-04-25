/**
 * Participant Dashboard — AiQ Platform
 *
 * Design principles (from enterprise launch prompt):
 * - Band-based language: "Strong", "Developing", "Needs Support" — no raw numeric scores
 * - Above-fold hero card: readiness band, governing constraint, revalidation countdown
 * - Capability radar (shape, not numbers)
 * - Scenario callbacks: which scenarios you handled well vs. struggled with
 * - LLM-generated personalised narrative (3 paragraphs)
 * - Learning plan progress + quick actions
 * - Transfer findings panel
 * - No score comparisons, no percentile ranks shown to participant
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ClipboardList, BookOpen, Library,
  AlertTriangle, Calendar, TrendingUp, CheckCircle,
  XCircle, HelpCircle, BarChart3, ChevronRight,
  Sparkles, ThumbsUp, ThumbsDown, Minus, Award,
  Target, RefreshCw, ArrowRight, Info,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from "recharts";

// ─── Design tokens ────────────────────────────────────────────────────────────
const CAP_META: Record<string, { label: string; color: string; shortLabel: string }> = {
  ai_interaction:         { label: "AI Interaction",         color: "#3B82F6", shortLabel: "Interact" },
  ai_output_evaluation:   { label: "Output Evaluation",      color: "#10B981", shortLabel: "Evaluate" },
  ai_workflow_design:     { label: "Workflow Design",        color: "#06B6D4", shortLabel: "Workflow" },
  workforce_ai_readiness: { label: "Workforce Readiness",    color: "#F59E0B", shortLabel: "Readiness" },
  ai_ethics_trust:        { label: "Ethics & Trust",         color: "#8B5CF6", shortLabel: "Ethics" },
  ai_change_leadership:   { label: "Change Leadership",      color: "#EC4899", shortLabel: "Leadership" },
};

const READINESS_META: Record<string, { label: string; color: string; bg: string; icon: any; description: string }> = {
  safe: {
    label: "Deployment Ready",
    color: "#10B981",
    bg: "#10B98118",
    icon: CheckCircle,
    description: "Your AI capability profile meets the threshold for responsible AI deployment in your role.",
  },
  at_risk: {
    label: "Developing",
    color: "#F59E0B",
    bg: "#F59E0B18",
    icon: AlertTriangle,
    description: "You're building your AI capability. Focus on the areas highlighted below to progress.",
  },
  unsafe: {
    label: "Foundational",
    color: "#DC2626",
    bg: "#DC262618",
    icon: XCircle,
    description: "Your assessment indicates foundational gaps. Your learning plan has been tailored to address these.",
  },
  unknown: {
    label: "Not Yet Assessed",
    color: "#9CA3AF",
    bg: "#9CA3AF18",
    icon: HelpCircle,
    description: "Complete your first assessment to receive your personalised capability profile.",
  },
};

// Band from score — never show raw number to participant
function scoreToBand(score: number | null): { label: string; color: string; icon: any } {
  if (score === null) return { label: "Not assessed", color: "#9CA3AF", icon: HelpCircle };
  if (score >= 75) return { label: "Strong",         color: "#10B981",  icon: ThumbsUp };
  if (score >= 55) return { label: "Developing",     color: "#F59E0B",  icon: Minus };
  return                  { label: "Needs Support",  color: "#DC2626",  icon: ThumbsDown };
}

// Outcome class → signal for scenario callbacks
function outcomeToSignal(oc: string | null): { label: string; color: string; icon: any } {
  if (!oc) return { label: "Answered", color: "#9CA3AF", icon: Minus };
  if (oc === "strong")           return { label: "Handled well",    color: "#10B981", icon: ThumbsUp };
  if (oc === "acceptable")       return { label: "Solid approach",  color: "#10B981", icon: ThumbsUp };
  if (oc === "weak")             return { label: "Needs attention", color: "#F59E0B", icon: Minus };
  if (oc === "failure")          return { label: "Area to develop", color: "#DC2626", icon: ThumbsDown };
  if (oc === "critical_failure") return { label: "Priority gap",    color: "#DC2626", icon: ThumbsDown };
  return { label: "Answered", color: "#9CA3AF", icon: Minus };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReadinessHeroCard({
  readiness, daysToRevalidation, revalidationDue, firstName,
}: {
  readiness: string | null;
  daysToRevalidation: number | null;
  revalidationDue: Date | null;
  firstName?: string;
}) {
  const meta = READINESS_META[readiness ?? "unknown"] ?? READINESS_META.unknown;
  const Icon = meta.icon;
  const urgency = daysToRevalidation !== null && daysToRevalidation <= 7 ? "critical"
    : daysToRevalidation !== null && daysToRevalidation <= 30 ? "soon" : "ok";

  return (
    <Card className="border-border overflow-hidden">
      <div className="h-1 w-full" style={{ backgroundColor: meta.color }} />
      <CardContent className="pt-6 pb-6">
        <div className="flex items-center justify-between gap-6">
          {/* Left: hero readiness state */}
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: meta.bg }}>
              <Icon className="w-7 h-7" style={{ color: meta.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">AI Readiness Status</p>
              <h2 className="text-3xl font-bold leading-none" style={{ color: meta.color }}>
                {meta.label}
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-md">{meta.description}</p>
            </div>
          </div>

          {/* Right: revalidation countdown */}
          {daysToRevalidation !== null && (
            <div className={cn(
              "shrink-0 text-center px-5 py-4 rounded-2xl border",
              urgency === "critical" ? "border-[#DC2626]/30 bg-[#DC2626]/6" :
              urgency === "soon"     ? "border-[#F59E0B]/30 bg-[#F59E0B]/6" :
              "border-border bg-muted/20"
            )}>
              <p className={cn(
                "text-4xl font-bold leading-none",
                urgency === "critical" ? "text-[#DC2626]" :
                urgency === "soon"     ? "text-[#F59E0B]" : "text-foreground"
              )}>{daysToRevalidation}</p>
              <p className="text-[11px] text-muted-foreground mt-1">days to<br />revalidation</p>
              {revalidationDue && (
                <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">
                  {new Date(revalidationDue).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CapabilityRadarCard({ scores }: { scores: Record<string, number> }) {
  // Don't render the radar chart if all scores are 0 or missing
  const hasAnyScore = Object.values(scores).some(s => s > 0);
  const data = Object.entries(CAP_META).map(([key, meta]) => ({
    subject: meta.shortLabel,
    score: scores[key] ?? 0,
    fullMark: 100,
  }));
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#3B82F6]" />Capability Shape
        </CardTitle>
        <p className="text-xs text-muted-foreground">Your relative strengths across 6 AI capability domains</p>
      </CardHeader>
      <CardContent>
        {hasAnyScore ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Radar name="Score" dataKey="score" stroke="#10B981" fill="#10B981" fillOpacity={0.18} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {Object.entries(CAP_META).map(([key, meta]) => {
                const score = scores[key] ?? null;
                const band = scoreToBand(score);
                return (
                  <div key={key} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/20">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                    <div className="min-w-0">
                      <p className="text-[9px] text-muted-foreground truncate">{meta.shortLabel}</p>
                      <p className="text-[10px] font-semibold" style={{ color: band.color }}>{band.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">Profile not yet generated</p>
            <p className="text-xs text-muted-foreground mt-1">Complete your assessment to see your capability shape.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScenarioCallbacksCard({
  callbacks,
}: {
  callbacks: Array<{ itemId: string; outcomeClass: string | null; capabilityKey: string | null; title: string | null }>;
}) {
  const withTitle = callbacks.filter(c => c.title);
  const strong = withTitle.filter(c => c.outcomeClass === "strong" || c.outcomeClass === "acceptable").slice(0, 3);
  const weak   = withTitle.filter(c => c.outcomeClass === "weak" || c.outcomeClass === "failure" || c.outcomeClass === "critical_failure").slice(0, 3);

  if (withTitle.length === 0) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Target className="w-4 h-4 text-[#8B5CF6]" />Recent Assessment Moments
        </CardTitle>
        <p className="text-xs text-muted-foreground">Scenarios from your last assessment — what you handled well and where to focus</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {strong.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#10B981] mb-2 flex items-center gap-1.5">
              <ThumbsUp className="w-3 h-3" />Handled well
            </p>
            <div className="space-y-1.5">
              {strong.map(c => (
                <div key={c.itemId} className="flex items-start gap-2 p-2 rounded-lg bg-[#10B981]/5 border border-[#10B981]/15">
                  <CheckCircle className="w-3 h-3 text-[#10B981] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-foreground leading-snug">{c.title}</p>
                    {c.capabilityKey && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{CAP_META[c.capabilityKey]?.label ?? c.capabilityKey}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {weak.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#F59E0B] mb-2 flex items-center gap-1.5">
              <Target className="w-3 h-3" />Areas to develop
            </p>
            <div className="space-y-1.5">
              {weak.map(c => (
                <div key={c.itemId} className="flex items-start gap-2 p-2 rounded-lg bg-[#F59E0B]/5 border border-[#F59E0B]/15">
                  <AlertTriangle className="w-3 h-3 text-[#F59E0B] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-foreground leading-snug">{c.title}</p>
                    {c.capabilityKey && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{CAP_META[c.capabilityKey]?.label ?? c.capabilityKey}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border">
          <Info className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            These reflect scenarios from your most recent assessment. Your learning plan has been adapted based on these patterns.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function NarrativeCard({ narrative }: {
  narrative: { opening: string; strengths: string; development: string };
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#10B981]" />Your Development Narrative
        </CardTitle>
        <p className="text-xs text-muted-foreground">Personalised insight based on your assessment results</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {[narrative.opening, narrative.strengths, narrative.development].map((para, i) => (
          <p key={i} className="text-sm text-foreground leading-relaxed">{para}</p>
        ))}
      </CardContent>
    </Card>
  );
}

function TransferFindingsPanel() {
  const { data } = trpc.adaptiveLearning.getTransferFindings.useQuery(undefined, { retry: 1, staleTime: 60_000 });
  if (!data || !data.findings || data.findings.length === 0) return null;
  const summary = data.summary;
  return (
    <Card className="border-[#F59E0B]/30 bg-[#F59E0B]/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-[#F59E0B]">
          <AlertTriangle className="w-4 h-4" />Learning Transfer Check
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          {data.findings.length} module{data.findings.length !== 1 ? "s" : ""} were completed but the learning didn't translate into practice.
          {summary && <span className="ml-1">({summary.transferRate}% transfer rate)</span>}
          {" "}Alternative approaches have been suggested in your plan.
        </p>
        <div className="space-y-1.5">
          {data.findings.slice(0, 3).map((item: { planItemId: string; moduleTitle: string; capabilityKey?: string; reason: string }) => (
            <div key={item.planItemId} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0" />
                <span className="text-xs text-foreground">{item.moduleTitle}</span>
              </div>
              <span className="text-xs text-muted-foreground capitalize">{String(item.reason ?? "").replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
        <Link href="/learning">
          <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 mt-3">
            <BookOpen className="w-3 h-3" />Review Learning Plan
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LearnerDashboard() {
  const { user } = useAuth();
  const { data, isLoading, refetch } = trpc.dashboard.learner.useQuery();

  const readinessMeta = READINESS_META[data?.latestReadiness ?? "unknown"] ?? READINESS_META.unknown;

  const daysToRevalidation = useMemo(() => {
    if (!data?.revalidation?.dueAt) return null;
    return Math.ceil((new Date(data.revalidation.dueAt).getTime() - Date.now()) / 86400000);
  }, [data?.revalidation?.dueAt]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" /><Skeleton className="h-64" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  const capScores = data?.latestCapabilityScores ?? null;
  const hasAssessment = (data?.totalAssessmentsCompleted ?? 0) > 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {hasAssessment ? `Welcome back, ${user?.firstName ?? ""}` : `Hello, ${user?.firstName ?? ""}`}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {hasAssessment
              ? "Your AI capability profile and development journey"
              : "Start your AI capability assessment to receive your personalised profile"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => refetch()}>
            <RefreshCw className="w-3 h-3" />Refresh
          </Button>
          {hasAssessment && data?.latestReadiness && data.latestReadiness !== "safe" ? (
            <>
              <Link href="/learning">
                <Button size="sm" className="gap-2 bg-[#10B981] hover:bg-[#059669] text-white text-xs">
                  <BookOpen className="w-3.5 h-3.5" />Start Learning
                </Button>
              </Link>
              <Link href="/assessment">
                <Button size="sm" variant="outline" className="gap-2 text-xs">
                  <ClipboardList className="w-3.5 h-3.5" />Reassess
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/assessment">
              <Button size="sm" className="gap-2 bg-[#10B981] hover:bg-[#059669] text-white text-xs">
                <ClipboardList className="w-3.5 h-3.5" />
                {hasAssessment ? "Reassess" : "Take Assessment"}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Above-fold hero ── */}
      <ReadinessHeroCard
        readiness={data?.latestReadiness ?? null}
        daysToRevalidation={daysToRevalidation}
        revalidationDue={data?.revalidation?.dueAt ?? null}
        firstName={user?.firstName ?? undefined}
      />

      {/* ── No assessment CTA ── */}
      {!hasAssessment && (
        <Card className="border-dashed border-2 border-[#10B981]/30 bg-[#10B981]/5">
          <CardContent className="pt-8 pb-8 text-center">
            <ClipboardList className="w-10 h-10 text-[#10B981] mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">Ready to discover your AI capability profile?</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              The adaptive assessment takes 25–35 minutes and produces a personalised profile across 6 AI capability domains.
            </p>
            <Link href="/assessment">
              <Button className="bg-[#10B981] hover:bg-[#059669] text-white gap-2">
                Start Assessment <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ── Capability shape + scenario callbacks ── */}
      {hasAssessment && capScores && (
        <div className="grid lg:grid-cols-2 gap-4">
          <CapabilityRadarCard scores={capScores} />
          <ScenarioCallbacksCard callbacks={data?.scenarioCallbacks ?? []} />
        </div>
      )}

      {/* ── LLM narrative ── */}
      {hasAssessment && data?.llmNarrative && (
        <NarrativeCard narrative={data.llmNarrative} />
      )}

      {/* ── Learning plan + revalidation ── */}
      {hasAssessment && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#10B981]" />Learning Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.planProgress ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-3xl font-bold text-foreground">{data.planProgress.percent}%</span>
                      <span className="text-sm text-muted-foreground ml-2">complete</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {data.planProgress.completed}/{data.planProgress.total} modules
                    </Badge>
                  </div>
                  <Progress value={data.planProgress.percent} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{data.planProgress.inProgress} in progress</span>
                    <span>{data.planProgress.total - data.planProgress.completed} remaining</span>
                  </div>
                  <Link href="/learning">
                    <Button size="sm" variant="outline" className="w-full text-xs gap-1.5">
                      <BookOpen className="w-3 h-3" />View Learning Plan
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    {hasAssessment ? "Your learning plan is being generated" : "No active learning plan yet"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hasAssessment
                      ? "Based on your assessment results, a personalised plan will appear here shortly."
                      : "Your plan will be generated after your first assessment."}
                  </p>
                  {hasAssessment && (
                    <Link href="/learning">
                      <Button size="sm" variant="outline" className="mt-3 text-xs gap-1.5">
                        <BookOpen className="w-3 h-3" />Check Learning Plan
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#F59E0B]" />Revalidation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.revalidation ? (
                <div className="space-y-3">
                  <div className="flex items-end gap-1">
                    <span className={cn(
                      "text-4xl font-bold",
                      daysToRevalidation !== null && daysToRevalidation <= 7  ? "text-[#DC2626]" :
                      daysToRevalidation !== null && daysToRevalidation <= 30 ? "text-[#F59E0B]" : "text-foreground"
                    )}>{daysToRevalidation}</span>
                    <span className="text-muted-foreground mb-1 text-sm">days remaining</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Due: {new Date(data.revalidation.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  {data.revalidation.triggerReason && (
                    <p className="text-xs text-muted-foreground italic">{data.revalidation.triggerReason}</p>
                  )}
                  {daysToRevalidation !== null && daysToRevalidation <= 14 && (
                    <Link href="/assessment">
                      <Button size="sm" className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs gap-1.5">
                        <AlertTriangle className="w-3 h-3" />Start Revalidation Now
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No revalidation scheduled</p>
                  <p className="text-xs text-muted-foreground mt-1">Revalidation is scheduled after your first assessment.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Credibility + risk bands (band language only) ── */}
      {hasAssessment && (data?.credibility || data?.risk) && (
        <div className="grid grid-cols-2 gap-4">
          {data?.credibility && (
            <Card className="border-border">
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-[#3B82F6]" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Response Quality</span>
                </div>
                <p className="text-2xl font-bold text-foreground capitalize">{data.credibility.band}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Consistency of your responses across the assessment</p>
              </CardContent>
            </Card>
          )}
          {data?.risk && (
            <Card className="border-border">
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risk Indicator</span>
                </div>
                <p className={cn(
                  "text-2xl font-bold capitalize",
                  data.risk.band === "high" ? "text-[#DC2626]" : data.risk.band === "medium" ? "text-[#F59E0B]" : "text-[#10B981]"
                )}>{data.risk.band}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Based on governance and ethics signal patterns</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Transfer findings ── */}
      {hasAssessment && <TransferFindingsPanel />}

      {/* ── Quick actions ── */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Take Assessment",  path: "/assessment",  icon: ClipboardList, color: "#10B981" },
            { label: "My Learning Plan", path: "/learning",    icon: BookOpen,      color: "#3B82F6" },
            { label: "Content Library",  path: "/library",     icon: Library,       color: "#8B5CF6" },
          ].map(action => {
            const Icon = action.icon;
            return (
              <Link key={action.path} href={action.path}>
                <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border cursor-pointer transition-colors hover:bg-muted/30"
                  style={{ borderColor: `${action.color}25` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${action.color}15` }}>
                    <Icon className="w-4 h-4" style={{ color: action.color }} />
                  </div>
                  <span className="text-xs font-medium text-center text-foreground">{action.label}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
