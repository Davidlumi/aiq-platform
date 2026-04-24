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
  ArrowRight, Play, RotateCcw, Lock, Trophy, Star, Sparkles,
  BarChart2, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const CAPABILITY_META: Record<string, { label: string; color: string; icon: React.ElementType; description: string }> = {
  execution:           { label: "AI Execution",        color: "#6366f1", icon: Zap,       description: "Ability to prompt, iterate, and get reliable outputs from AI tools" },
  judgement:           { label: "AI Judgement",         color: "#f59e0b", icon: Brain,     description: "Critical evaluation of AI outputs for accuracy and bias" },
  governance:          { label: "AI Governance",        color: "#10b981", icon: Target,    description: "Policy, compliance, and risk management for AI use" },
  appropriateness:     { label: "Appropriateness",      color: "#ec4899", icon: Lightbulb, description: "Knowing when to use AI and when human judgement is required" },
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
  item: { id: string; moduleId: string; status: string; phase: string; module: any; spacedRepetition: any };
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

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all group bg-card",
      isLocked ? "opacity-50 cursor-not-allowed" : "hover:border-primary/40 cursor-pointer",
      isReview && "border-amber-700/30 bg-amber-950/10",
      isCompleted && "border-emerald-700/30 bg-emerald-950/10",
    )}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cap.color}15` }}>
          {isLocked ? <Lock className="h-5 w-5 text-muted-foreground" /> : <CapIcon className="h-5 w-5" style={{ color: cap.color }} />}
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
            <Badge variant="outline" className="text-[10px] text-muted-foreground">L{mod.difficulty}</Badge>
            <Badge variant="outline" className="text-[10px] text-muted-foreground capitalize">{item.phase}</Badge>
          </div>
          <p className={cn("font-semibold text-sm leading-tight mb-0.5", !isLocked && "group-hover:text-primary transition-colors")}>{mod.title}</p>
          {mod.subtitle && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{mod.subtitle}</p>}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />{mod.durationMins} min
            </span>
            {!isLocked && !isCompleted && (
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary hover:text-primary"
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
  const [activeTab, setActiveTab] = useState<"plan" | "gaps" | "progress" | "peers">("plan");
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
  ];
  type TabId = "plan" | "gaps" | "progress" | "peers";

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
              {/* Plan summary strip */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Today",     value: todayItems.length,    color: "#6366f1" },
                  { label: "Reviews",   value: reviewItems.length,   color: "#f59e0b" },
                  { label: "Upcoming",  value: upcomingItems.length, color: "#10b981" },
                  { label: "Done",      value: completedItems.length,color: "#6b7280" },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl border border-border bg-card text-center">
                    <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
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
    </div>
  );
}
