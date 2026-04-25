/**
 * Learning Plan Page — AiQ Adaptive Learning Engine
 *
 * Three-tab layout:
 *   1. My Plan      — adaptive module queue, today's recommendations, spaced repetition reviews
 *   2. Gap Analysis — capability gap cards, benchmark comparison
 *   3. Progress     — capability progress bars, completed modules
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  BookOpen, Zap, FileText, HelpCircle, Layers, Video,
  MessageSquare, Users, Target, Brain, Lightbulb, BarChart3,
  Clock, ChevronRight, TrendingUp, TrendingDown, Minus,
  CheckCircle2, AlertTriangle, Award, RefreshCw, Flame,
  ArrowRight, Play, RotateCcw, Lock, Trophy, Star, Sparkles, Bell,
  BarChart2, UserCheck, XCircle, Info, ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const CAPABILITY_META: Record<string, { label: string; color: string; icon: React.ElementType; description: string }> = {
  ai_interaction:      { label: "AI Interaction",       color: "#4477AA", icon: Zap,       description: "Practical competence with AI tools — prompting, iterating, and tool selection" },
  ai_output_evaluation:{ label: "AI Output Evaluation", color: "#228833", icon: Brain,     description: "Critical assessment of AI outputs — detecting errors, hallucinations, and fitness for purpose" },
  ai_ethics_trust:     { label: "AI Ethics & Trust",    color: "#AA3377", icon: Target,    description: "Ethical reasoning, employee trust, and principled AI decision-making" },
  ai_change_leadership:{ label: "AI Change Leadership", color: "#D97706", icon: Lightbulb, description: "Leading AI transformation, handling resistance, and calibrating pace of change" },
  workflow:            { label: "Workflow Integration", color: "#3b82f6", icon: Layers,    description: "Embedding AI tools into HR processes and team workflows" },
  data_interpretation: { label: "Data Interpretation",  color: "#8b5cf6", icon: BarChart3, description: "Reading and acting on AI-generated analytics and reports" },
};

const MODALITY_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  tutorial:   { label: "Tutorial",   color: "#6366f1", icon: BookOpen },
  practical:  { label: "Practical",  color: "#10b981", icon: Zap },
  case_study: { label: "Case Study", color: "#f59e0b", icon: FileText },
  quiz:       { label: "Quiz",       color: "#ec4899", icon: HelpCircle },
  scenario:   { label: "Scenario",   color: "#8b5cf6", icon: Layers },
  video:      { label: "Video",      color: "#ef4444", icon: Video },
  reflection: { label: "Reflection", color: "#06b6d4", icon: MessageSquare },
  coaching:   { label: "Coaching",   color: "#84cc16", icon: Users },
};

// ─── Prescription Stage Meta ─────────────────────────────────────────────────
const PRESCRIPTION_STAGE_META: Record<number, { label: string; color: string; desc: string }> = {
  1: { label: "Stage 1 — Block Resolution",   color: "#EF4444", desc: "Addresses critical blocking failure modes first" },
  2: { label: "Stage 2 — Foundation",          color: "#F59E0B", desc: "Builds foundational capability before strategy" },
  3: { label: "Stage 3 — Regulatory",          color: "#6366F1", desc: "UK regulatory and operational compliance" },
  4: { label: "Stage 4 — Strategic",           color: "#10B981", desc: "Strategic development and advanced capability" },
};

const PRIORITY_COLOURS = {
  critical:   { bg: "bg-red-950/20",    border: "border-red-700/40",    text: "text-red-400",    badge: "bg-red-900/30 text-red-400" },
  developing: { bg: "bg-amber-950/20",  border: "border-amber-700/40",  text: "text-amber-400",  badge: "bg-amber-900/30 text-amber-400" },
  proficient: { bg: "bg-emerald-950/20",border: "border-emerald-700/40",text: "text-emerald-400",badge: "bg-emerald-900/30 text-emerald-400" },
  advanced:   { bg: "bg-blue-950/20",   border: "border-blue-700/40",   text: "text-blue-400",   badge: "bg-blue-900/30 text-blue-400" },
};

// ─── Module Card ──────────────────────────────────────────────────────────────

function ModuleCard({
  item,
  onStart,
  isReview = false,
}: {
  item: { id: string; moduleId: string; status: string; phase: string; module: any; spacedRepetition: any; reasonJson?: any; completionState?: string };
  onStart: (moduleId: string, planItemId: string) => void;
  isReview?: boolean;
}) {
  const mod = item.module;
  if (!mod) return null;

  const cap = CAPABILITY_META[mod.capability] ?? { label: mod.capability, color: "#888", icon: BookOpen, description: "" };
  const modal = MODALITY_META[mod.modality] ?? { label: mod.modality, color: "#888", icon: BookOpen };
  const CapIcon = cap.icon;
  const ModalIcon = modal.icon;
  const isLocked = item.status === "locked";
  const isCompleted = item.status === "completed";
  const isNoTransfer = (item as any).completionState === "no_transfer";
  const reasonJson = (() => {
    try { return typeof item.reasonJson === "string" ? JSON.parse(item.reasonJson as string) : (item.reasonJson ?? {}); }
    catch { return {}; }
  })() as any;
  const prescriptionStage: number | undefined = reasonJson?.prescriptionStage;
  const stageMeta = prescriptionStage ? PRESCRIPTION_STAGE_META[prescriptionStage] : undefined;
  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all group bg-card",
      isLocked ? "opacity-50 cursor-not-allowed" : "hover:border-primary/40 cursor-pointer",
      isReview && "border-amber-700/30 bg-amber-950/10",
      isCompleted && !isNoTransfer && "border-emerald-700/30 bg-emerald-950/10",
      isNoTransfer && "border-red-700/30 bg-red-950/10",
    )}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${modal.color}15` }}>
          {isLocked ? <Lock className="h-5 w-5 text-muted-foreground" /> : <ModalIcon className="h-5 w-5" style={{ color: modal.color }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            <Badge variant="outline" className="text-[10px] border-0 px-1.5 py-0.5" style={{ background: `${modal.color}15`, color: modal.color }}>
              <ModalIcon className="h-2.5 w-2.5 mr-1" />{modal.label}
            </Badge>
            {isReview && (
              <Badge variant="outline" className="text-[10px] border-0 px-1.5 py-0.5 bg-amber-900/30 text-amber-400">
                <RotateCcw className="h-2.5 w-2.5 mr-1" />Review due
              </Badge>
            )}
            {isCompleted && (
              <Badge variant="outline" className="text-[10px] border-0 px-1.5 py-0.5 bg-emerald-900/30 text-emerald-400">
                <CheckCircle2 className="h-2.5 w-2.5 mr-1" />Done
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] font-semibold" style={{ color: "#4477AA", borderColor: "#4477AA40" }}>L{mod.difficulty}</Badge>
            <Badge variant="outline" className="text-[10px] text-muted-foreground capitalize">{item.phase}</Badge>
            {stageMeta && (
              <Badge variant="outline" className="text-[10px] border-0 px-1.5 py-0.5 cursor-help" style={{ background: `${stageMeta.color}15`, color: stageMeta.color }} title={stageMeta.label + " — " + stageMeta.desc}>
                S{prescriptionStage}
              </Badge>
            )}
            {isNoTransfer && (
              <Badge variant="outline" className="text-[10px] border-0 px-1.5 py-0.5 bg-red-900/30 text-red-400">
                <XCircle className="h-2.5 w-2.5 mr-1" />No transfer
              </Badge>
            )}
          </div>
          <p className={cn("font-semibold text-sm leading-tight mb-0.5", !isLocked && "group-hover:text-primary transition-colors")}>{mod.title}</p>
          {mod.subtitle && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{mod.subtitle}</p>}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />{mod.durationMins} min
            </span>
            {!isLocked && !isCompleted && (
              <Button size="sm" className="h-7 text-xs gap-1 bg-[#10B981] hover:bg-[#059669] text-white"
                onClick={() => onStart(item.moduleId, item.id)}>
                {isReview ? <><RotateCcw className="h-3 w-3" />Review</> : <><Play className="h-3 w-3" />Start</>}
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}
            {isCompleted && (
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={() => onStart(item.moduleId, item.id)}>
                <RotateCcw className="h-3 w-3" />Revisit
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Gap Analysis Tab ─────────────────────────────────────────────────────────

function GapAnalysisTab({ gapRow }: { gapRow: any }) {
  if (!gapRow) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
        <p className="font-semibold text-lg mb-2">No assessment data yet</p>
        <p className="text-sm text-muted-foreground mb-6">Complete an assessment to see your capability gap analysis.</p>
        <Button onClick={() => window.location.href = "/assessment"} className="gap-2">
          <Target className="h-4 w-4" />Take Assessment
        </Button>
      </div>
    );
  }

  // Parse JSON fields
  const capabilityGaps: Record<string, any> = (() => {
    try {
      return typeof gapRow.capabilityGapsJson === "string"
        ? JSON.parse(gapRow.capabilityGapsJson)
        : (gapRow.capabilityGapsJson ?? {});
    } catch { return {}; }
  })();

  const overallReadiness = gapRow.readinessBand as string;
  const overallScore = parseFloat(String(gapRow.overallReadinessScore));

  const gaps = Object.entries(capabilityGaps).map(([key, g]: [string, any]) => ({
    capability: key,
    score: g.score ?? 0,
    benchmarkScore: g.benchmarkScore ?? 60,
    priority: g.severity ?? "developing",
    gapDescription: g.gapDescription ?? "",
    recommendedModuleCount: g.recommendedModuleCount ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Overall readiness banner */}
      <div className={cn("p-5 rounded-xl border",
        PRIORITY_COLOURS[overallReadiness as keyof typeof PRIORITY_COLOURS]?.bg ?? "bg-card",
        PRIORITY_COLOURS[overallReadiness as keyof typeof PRIORITY_COLOURS]?.border ?? "border-border")}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Overall AI Readiness</p>
            <p className={cn("text-2xl font-bold capitalize",
              PRIORITY_COLOURS[overallReadiness as keyof typeof PRIORITY_COLOURS]?.text ?? "text-foreground")}>
              {overallReadiness}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">Score: {overallScore.toFixed(0)}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">{gaps.length} capabilities assessed</p>
            <p className="text-xs text-muted-foreground">{gaps.filter(g => g.priority === "critical").length} critical gaps</p>
          </div>
        </div>
      </div>

      {/* Capability gap cards */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Capability Breakdown</h3>
        {gaps.sort((a, b) => a.score - b.score).map(gap => {
          const cap = CAPABILITY_META[gap.capability] ?? { label: gap.capability, color: "#888", icon: BookOpen, description: "" };
          const CapIcon = cap.icon;
          const colours = PRIORITY_COLOURS[gap.priority as keyof typeof PRIORITY_COLOURS] ?? PRIORITY_COLOURS.developing;
          const delta = gap.score - gap.benchmarkScore;

          return (
            <div key={gap.capability} className={cn("p-4 rounded-xl border", colours.bg, colours.border)}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cap.color}20` }}>
                  <CapIcon className="h-4 w-4" style={{ color: cap.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm">{cap.label}</p>
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full capitalize", colours.badge)}>
                      {gap.priority}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{cap.description}</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Your score</span>
                      <span className={colours.text}>{gap.score}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${gap.score}%`, background: cap.color }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                      <span>Role benchmark: {gap.benchmarkScore}%</span>
                      <span className="flex items-center gap-0.5">
                        {delta > 0 ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : delta < 0 ? <TrendingDown className="h-3 w-3 text-red-400" /> : <Minus className="h-3 w-3" />}
                        <span className={delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-muted-foreground"}>
                          {delta > 0 ? "+" : ""}{delta}% vs benchmark
                        </span>
                      </span>
                    </div>
                  </div>
                  {gap.gapDescription && (
                    <p className="text-xs text-muted-foreground mt-2 italic">{gap.gapDescription}</p>
                  )}
                  {gap.recommendedModuleCount > 0 && (
                    <p className="text-xs mt-2 flex items-center gap-1" style={{ color: cap.color }}>
                      <BookOpen className="h-3 w-3" />
                      {gap.recommendedModuleCount} module{gap.recommendedModuleCount !== 1 ? "s" : ""} recommended
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────

function ProgressTab({ capProgress }: { capProgress: any }) {
  const capabilities: Record<string, { total: number; completed: number; inProgress: number }> = capProgress?.capabilities ?? {};
  const totalProgress: number = capProgress?.totalProgress ?? 0;

  return (
    <div className="space-y-6">
      {/* Overall progress */}
      <div className="p-5 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold">Overall Plan Progress</p>
          <p className="text-2xl font-bold text-primary">{totalProgress}%</p>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${totalProgress}%` }} />
        </div>
      </div>

      {/* Capability progress */}
      {Object.keys(capabilities).length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">By Capability</h3>
          <div className="space-y-3">
            {Object.entries(capabilities).map(([cap, data]) => {
              const meta = CAPABILITY_META[cap] ?? { label: cap, color: "#888", icon: BookOpen, description: "" };
              const Icon = meta.icon;
              const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
              return (
                <div key={cap} className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}15` }}>
                      <Icon className="h-4 w-4" style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{meta.label}</span>
                        <span className="text-muted-foreground">{data.completed}/{data.total} modules</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: meta.color }} />
                      </div>
                    </div>
                    <span className="text-sm font-semibold w-10 text-right" style={{ color: meta.color }}>{pct}%</span>
                  </div>
                  {data.inProgress > 0 && (
                    <p className="text-xs text-muted-foreground">{data.inProgress} in progress</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {Object.keys(capabilities).length === 0 && (
        <div className="text-center py-12">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="font-semibold mb-2">No progress yet</p>
          <p className="text-sm text-muted-foreground">Start learning modules to see your progress here.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LearningPlanPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"plan" | "gaps" | "progress" | "peers" | "digest">("plan");
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch adaptive plan (auto-generates if none exists)
  const { data: planData, isLoading: planLoading, refetch: refetchPlan } = trpc.adaptiveLearning.getAdaptivePlan.useQuery(
    { forceRegenerate: false },
    { retry: 1 }
  );

  // Fetch gap analysis
  const { data: gapData, isLoading: gapLoading } = trpc.adaptiveLearning.getGapAnalysis.useQuery(
    { forceRegenerate: false },
    { retry: 1 }
  );

  // Fetch capability progress
  const { data: capProgress, isLoading: progressLoading } = trpc.adaptiveLearning.getCapabilityProgress.useQuery(
    undefined,
    { retry: 1 }
  );

  // Fetch due reviews
  const { data: dueReviews } = trpc.adaptiveLearning.getDueReviews.useQuery(undefined, { retry: 1 });
  // Fetch streak & milestones
  const { data: streakData } = trpc.adaptiveLearning.getLearningStreak.useQuery(undefined, { retry: 1 });
  // Fetch peer benchmarks
  const { data: peerData } = trpc.adaptiveLearning.getPeerBenchmarks.useQuery(undefined, { retry: 1 });
  // P3-LL-4/5: Transfer findings
  const { data: transferFindings } = trpc.adaptiveLearning.getTransferFindings.useQuery(undefined, { retry: 1 });
  // P3-LL-6: Learning-aware reassessment context
  const { data: learningAwareCtx } = trpc.adaptiveLearning.getLearningAwareContext.useQuery(undefined, { retry: 1 });
  // Weekly digest, nudges & trending
  const { data: weeklyDigest } = trpc.adaptiveLearning.getWeeklyDigest.useQuery(undefined, { retry: 1 });
  const { data: myNudges } = trpc.adaptiveLearning.getMyNudges.useQuery(undefined, { retry: 1 });
  const { data: trendingModules } = trpc.adaptiveLearning.getTrendingModules.useQuery(undefined, { retry: 1 });

  // Refresh plan (force regenerate)
  const handleRefreshPlan = async () => {
    try {
      await trpc.useUtils().adaptiveLearning.getAdaptivePlan.invalidate();
      // Force regenerate by passing forceRegenerate: true via a separate call
      setRefreshKey(k => k + 1);
      toast.success("Refreshing your learning plan…");
      setTimeout(() => refetchPlan(), 300);
    } catch {
      toast.error("Failed to refresh plan");
    }
  };

  const handleStartModule = (moduleId: string, planItemId: string) => {
    setLocation(`/learning/module/${moduleId}?planItemId=${planItemId}`);
  };

  // Derive plan sections from items
  const planItems: any[] = planData?.items ?? [];
  const now = Date.now();

  const reviewItems = (dueReviews ?? []).map((r: any) => ({
    id: r.id,
    moduleId: r.moduleId,
    status: "available",
    phase: "review",
    module: r.module,
    spacedRepetition: r,
  }));

  const availableItems = planItems.filter(i => i.status === "available" || i.status === "in_progress");
  const completedItems = planItems.filter(i => i.status === "completed");
  const lockedItems = planItems.filter(i => i.status === "locked");

  // Today's items = first 3 available
  const todayItems = availableItems.slice(0, 3);
  const upcomingItems = availableItems.slice(3);

  const criticalGapCount = (() => {
    if (!gapData?.capabilityGapsJson) return 0;
    try {
      const gaps = typeof gapData.capabilityGapsJson === "string"
        ? JSON.parse(gapData.capabilityGapsJson)
        : gapData.capabilityGapsJson;
      return Object.values(gaps).filter((g: any) => g.severity === "critical").length;
    } catch { return 0; }
  })();

  const tabs = [
    { id: "plan" as const,     label: "My Plan",      count: todayItems.length + reviewItems.length },
    { id: "gaps" as const,     label: "Gap Analysis", count: criticalGapCount },
    { id: "progress" as const, label: "Progress",     count: completedItems.length },
    { id: "peers" as const,    label: "Benchmarks",   count: 0 },
    { id: "digest" as const,   label: "Digest",       count: (myNudges as any[] ?? []).filter((n: any) => n.status === "sent").length },
  ];
  type TabId = "plan" | "gaps" | "progress" | "peers" | "digest";

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Learning Plan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Adaptive modules tailored to your capability gaps
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={handleRefreshPlan}>
          <RefreshCw className="h-3.5 w-3.5" />Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30 border border-border/50">
        {tabs.map(tab => (
          <button key={tab.id}
            className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
            {tab.count > 0 && (
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                activeTab === tab.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── My Plan Tab ──────────────────────────────────────────────────────── */}
      {activeTab === "plan" && (
        <div className="space-y-6">
          {planLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          )}

          {!planLoading && !planData && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">No learning plan yet</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                {gapData
                  ? "Your gap analysis is ready. Your personalised plan will be generated automatically."
                  : "Complete an assessment first to generate your personalised learning plan."}
              </p>
              {!gapData && (
                <Button className="gap-2" onClick={() => setLocation("/assessment")}>
                  <Target className="h-4 w-4" />Take Assessment
                </Button>
              )}
            </div>
          )}

          {planData && (
            <>
              {/* Auto-regeneration "plan updated" banner */}
              {(planData as any).autoRegeneratedAt && (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-blue-400 mb-0.5">Your learning plan has been updated</p>
                    <p className="text-xs text-muted-foreground">
                      Your plan was automatically refreshed after your latest assessment to reflect your current capability gaps.
                      Updated {new Date((planData as any).autoRegeneratedAt).toLocaleDateString()}.
                    </p>
                  </div>
                </div>
              )}

              {/* P3-LL-6: Learning-Aware Reassessment Banner */}
              {learningAwareCtx?.learningAwareMode && (
                <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 flex items-center justify-center flex-shrink-0">
                    <Brain className="h-4 w-4 text-[#10B981]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#10B981] mb-0.5">Learning-Aware Reassessment Available</p>
                    <p className="text-xs text-muted-foreground">
                      You've completed {learningAwareCtx.recentlyLearnedSignals.length} learning module{learningAwareCtx.recentlyLearnedSignals.length !== 1 ? "s" : ""} since your last assessment.
                      Your next assessment will be calibrated to test whether this learning has translated to behaviour change.
                    </p>
                    {learningAwareCtx.noTransferModules.length > 0 && (
                      <p className="text-xs text-amber-400 mt-1">
                        {learningAwareCtx.noTransferModules.length} module{learningAwareCtx.noTransferModules.length !== 1 ? "s" : ""} previously showed no transfer — these will be prioritised in your reassessment.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setLocation("/assessment")}
                    className="text-xs font-semibold text-[#10B981] hover:underline flex-shrink-0"
                  >
                    Take reassessment
                  </button>
                </div>
              )}

              {/* P3-LL-5: No-Transfer Findings Panel */}
              {transferFindings?.summary && (transferFindings.summary.noTransferModules ?? 0) > 0 && (
                <div className="rounded-xl border border-red-700/30 bg-red-950/10 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="h-4 w-4 text-red-400" />
                    <h3 className="text-sm font-semibold text-red-400">No-Transfer Findings</h3>
                    <Badge variant="outline" className="text-[10px] bg-red-900/20 text-red-400 border-0">{transferFindings.summary.noTransferModules} module{transferFindings.summary.noTransferModules !== 1 ? "s" : ""}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    These modules were completed but did not produce measurable behaviour change in your subsequent assessment.
                    Transfer rate: <span className="font-semibold text-foreground">{transferFindings.summary.transferRate}%</span>.
                    Consider revisiting these modules with a different approach.
                  </p>
                  <div className="space-y-2">
                    {(transferFindings.findings ?? []).map((f: any) => (
                      <div key={f.moduleId} className="flex items-start gap-2 text-xs">
                        <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium text-foreground">{f.moduleTitle}</span>
                          <span className="text-muted-foreground ml-1">— {f.reason?.replace(/_/g, " ")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Plan summary strip */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Today",     value: todayItems.length,    color: "#6366f1" },
                  { label: "Reviews",   value: reviewItems.length,   color: "#f59e0b" },
                  { label: "Upcoming",  value: upcomingItems.length, color: "#10b981" },
                  { label: "Done",      value: completedItems.length,color: "#6b7280" },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl border border-border bg-card text-center">
                    <p className="text-xl font-bold" style={{ color: s.value > 0 ? s.color : "hsl(var(--muted-foreground))" }}>{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Spaced repetition reviews */}
              {reviewItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <RotateCcw className="h-4 w-4 text-amber-400" />
                    <h3 className="font-semibold text-sm">Due for Review</h3>
                    <Badge variant="outline" className="text-[10px] bg-amber-900/20 text-amber-400 border-0">{reviewItems.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {reviewItems.map((item: any) => (
                      <ModuleCard key={item.id} item={item} onStart={handleStartModule} isReview />
                    ))}
                  </div>
                </div>
              )}

              {/* Today's modules */}
              {todayItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Today's Learning</h3>
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-0">{todayItems.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {todayItems.map((item: any) => (
                      <ModuleCard key={item.id} item={item} onStart={handleStartModule} />
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming modules */}
              {upcomingItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">Coming Up</h3>
                  </div>
                  <div className="space-y-2">
                    {upcomingItems.slice(0, 8).map((item: any) => (
                      <ModuleCard key={item.id} item={item} onStart={handleStartModule} />
                    ))}
                  </div>
                  {upcomingItems.length > 8 && (
                    <p className="text-xs text-muted-foreground text-center mt-3">
                      +{upcomingItems.length - 8} more modules in your plan
                    </p>
                  )}
                </div>
              )}

              {/* Locked modules */}
              {lockedItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm text-muted-foreground">Locked</h3>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">{lockedItems.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {lockedItems.slice(0, 4).map((item: any) => (
                      <ModuleCard key={item.id} item={item} onStart={handleStartModule} />
                    ))}
                  </div>
                </div>
              )}

              {availableItems.length === 0 && reviewItems.length === 0 && completedItems.length > 0 && (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                  <p className="font-semibold text-lg mb-2">All caught up!</p>
                  <p className="text-sm text-muted-foreground">No modules due today. Check back tomorrow for spaced repetition reviews.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

       {/* ── Peer Benchmarks Tab ─────────────────────────────────────── */}
      {activeTab === "peers" && (
        <div className="space-y-5">
          {/* My stats vs platform */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Your Standing</h2>
            </div>
            {!peerData ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Modules Completed", mine: peerData.myStats.modulesCompleted, avg: peerData.platformAverages.avgModulesCompleted, pct: peerData.percentiles.modulesCompleted, icon: BookOpen, color: "#6366f1" },
                  { label: "Mins Learned", mine: peerData.myStats.minsLearned, avg: peerData.platformAverages.avgMinsLearned, pct: null, icon: Clock, color: "#10b981" },
                  { label: "Readiness Score", mine: Math.round(peerData.myStats.readinessScore), avg: peerData.platformAverages.avgReadinessScore, pct: peerData.percentiles.readinessScore, icon: Target, color: "#f59e0b" },
                ].map(stat => (
                  <div key={stat.label} className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                    <p className="text-2xl font-bold">{stat.mine}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Platform avg: {stat.avg}</p>
                    {stat.pct !== null && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Percentile</span><span>{stat.pct}th</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${stat.pct}%`, background: stat.color }} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Readiness band distribution */}
          {peerData && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Platform Readiness Distribution</h2>
                <Badge variant="outline" className="text-[10px]">{peerData.platformAverages.totalLearners} learners</Badge>
              </div>
              <div className="space-y-2">
                {Object.entries(peerData.platformAverages.bandDistribution).map(([band, count]) => {
                  const total = peerData.platformAverages.totalLearners;
                  const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
                  const colors: Record<string, string> = { critical: "#ef4444", developing: "#f59e0b", proficient: "#10b981", advanced: "#6366f1" };
                  const isMe = peerData.myStats.readinessBand === band;
                  return (
                    <div key={band} className={cn("flex items-center gap-3 p-2 rounded-lg", isMe && "bg-primary/5 border border-primary/20")}>
                      <div className="w-20 text-xs capitalize font-medium" style={{ color: colors[band] ?? "#888" }}>{band}</div>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[band] ?? "#888" }} />
                      </div>
                      <div className="w-12 text-right text-xs text-muted-foreground">{pct}%</div>
                      {isMe && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-0 px-1.5">You</Badge>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Streak in benchmarks context */}
          {streakData && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="h-5 w-5 text-orange-400" />
                <h2 className="font-semibold">Your Learning Streak</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Current Streak", value: `${streakData.currentStreak}d`, icon: Flame, color: "#f97316" },
                  { label: "Longest Streak", value: `${streakData.longestStreak}d`, icon: Trophy, color: "#f59e0b" },
                  { label: "Modules Done", value: streakData.totalModulesCompleted, icon: CheckCircle2, color: "#10b981" },
                  { label: "Mins Learned", value: streakData.totalMinsLearned, icon: Clock, color: "#6366f1" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                    <s.icon className="h-5 w-5 mx-auto mb-1" style={{ color: s.color }} />
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Next milestone */}
              {streakData.nextMilestone && (
                <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-medium">Next milestone: {streakData.nextMilestone.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{streakData.nextMilestone.current}/{streakData.nextMilestone.target} modules</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${Math.min(100, (streakData.nextMilestone.current / streakData.nextMilestone.target) * 100)}%` }} />
                  </div>
                </div>
              )}
              {/* Earned milestones */}
              {streakData.milestones.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {streakData.milestones.map((m: string) => (
                    <Badge key={m} variant="outline" className="text-[10px] bg-amber-900/20 text-amber-400 border-amber-700/30">
                      <Trophy className="h-2.5 w-2.5 mr-1" />{m.replace("modules_", "") + " modules"}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* ── Gap Analysis Tab ──────────────────────────────────────────── */}
      {activeTab === "gaps" && (
        gapLoading
          ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
          : <GapAnalysisTab gapRow={gapData} />
      )}

      {/* ── Progress Tab ──────────────────────────────────────────────────── */}
      {activeTab === "progress" && (
        progressLoading
          ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
          : <ProgressTab capProgress={capProgress} />
      )}
      {/* ── Digest Tab ──────────────────────────────────────────────────── */}
      {activeTab === "digest" && (
        <div className="space-y-5">
          {/* Nudges from manager */}
          {myNudges && (myNudges as any[]).length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Module Recommendations</h2>
                <Badge variant="outline" className="text-[10px]">{(myNudges as any[]).length}</Badge>
              </div>
              <div className="space-y-3">
                {(myNudges as any[]).map((nudge: any) => (
                  <div key={nudge.id} className={cn("rounded-lg border p-3", nudge.status === "sent" ? "border-primary/30 bg-primary/5" : "border-border")}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{nudge.moduleTitle ?? "Module"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{nudge.moduleCapability?.replace(/_/g, " ")}</p>
                      </div>
                      {nudge.status === "sent" && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-0">New</Badge>}
                    </div>
                    {nudge.message && <p className="text-xs text-muted-foreground mt-2 italic">"{nudge.message}"</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(nudge.sentAt).toLocaleDateString("en-GB")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Weekly digest */}
          {weeklyDigest && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">This Week</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Modules Done", value: (weeklyDigest as any).weekCompletions, icon: CheckCircle2, color: "#10b981" },
                  { label: "Minutes Learned", value: (weeklyDigest as any).totalMinsThisWeek, icon: Clock, color: "#6366f1" },
                  { label: "Current Streak", value: `${(weeklyDigest as any).currentStreak}d`, icon: Flame, color: "#f97316" },
                  { label: "Reviews Due", value: ((weeklyDigest as any).dueReviews ?? []).length, icon: RotateCcw, color: "#f59e0b" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                    <s.icon className="h-5 w-5 mx-auto mb-1" style={{ color: s.color }} />
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              {(weeklyDigest as any).topPriorityCapability && (
                <div className="rounded-lg bg-muted/30 border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Priority focus area</p>
                  <p className="text-sm font-medium capitalize">{(weeklyDigest as any).topPriorityCapability.capability.replace(/_/g, " ")}</p>
                </div>
              )}
            </div>
          )}
          {/* Trending modules */}
          {trendingModules && (trendingModules as any[]).length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Trending on Platform</h2>
                <span className="text-xs text-muted-foreground">Last 30 days</span>
              </div>
              <div className="space-y-2">
                {(trendingModules as any[]).slice(0, 5).map((mod: any, i: number) => (
                  <div key={mod.moduleId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <span className="w-5 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{mod.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{mod.capability?.replace(/_/g, " ")}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                      <Users className="h-3 w-3" />
                      <span>{mod.completionCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Empty state */}
          {(!myNudges || (myNudges as any[]).length === 0) && (!weeklyDigest || (weeklyDigest as any).weekCompletions === 0) && (
            <div className="text-center py-12 rounded-xl border border-dashed border-border">
              <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="font-semibold mb-1">No digest data yet</p>
              <p className="text-sm text-muted-foreground">Complete some modules to see your weekly progress here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
