/**
 * Learning Plan Page — AiQ Adaptive Learning Engine
 *
 * World-class LMS design patterns (LinkedIn Learning / Degreed / Workday Learning):
 * - Clean sequential module pathway with numbered steps
 * - Rich module cards with capability accent, status, type, duration
 * - 3-tab layout: My Path | Insights | Activity
 * - Clear "Next Up" emphasis with progress ring
 * - Consistent visual language throughout
 */

import { useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import { toast } from "sonner";
import {
  BookOpen, Zap, FileText, HelpCircle, Layers, Video, MessageSquare,
  Users, Clock, CheckCircle2, Lock, Play, RotateCcw,
  Target, Brain, Lightbulb, BarChart3, Sparkles, TrendingUp, Award,
  Flame, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { scoreToColor } from "@/lib/peakon-colors";

// ─── Constants ─────────────────────────────────────────────────────────────────

const CAPABILITY_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ai_interaction:         { label: "AI Interaction",        color: "#4477AA", icon: Zap },
  ai_output_evaluation:   { label: "AI Output Evaluation",  color: "#228833", icon: Brain },
  ai_ethics_trust:        { label: "AI Ethics & Trust",     color: "#AA3377", icon: Target },
  ai_change_leadership:   { label: "AI Change Leadership",  color: "#EE8866", icon: Lightbulb },
  ai_workflow_design:     { label: "AI Workflow Design",    color: "#3b82f6", icon: Layers },
  workforce_ai_readiness: { label: "Workforce Readiness",   color: "#8b5cf6", icon: BarChart3 },
  execution:              { label: "Execution",             color: "#4477AA", icon: Zap },
  judgement:              { label: "Judgement",             color: "#228833", icon: Brain },
  governance:             { label: "Governance",            color: "#AA3377", icon: Target },
  appropriateness:        { label: "Appropriateness",       color: "#EE8866", icon: Lightbulb },
  workflow:               { label: "Workflow",              color: "#3b82f6", icon: Layers },
  data_interpretation:    { label: "Data Interpretation",   color: "#8b5cf6", icon: BarChart3 },
};

const MODALITY_META: Record<string, { label: string; icon: React.ElementType }> = {
  tutorial:   { label: "Tutorial",   icon: BookOpen },
  practical:  { label: "Practical",  icon: Zap },
  case_study: { label: "Case Study", icon: FileText },
  quiz:       { label: "Quiz",       icon: HelpCircle },
  scenario:   { label: "Scenario",   icon: Layers },
  video:      { label: "Video",      icon: Video },
  reflection: { label: "Reflection", icon: MessageSquare },
  coaching:   { label: "Coaching",   icon: Users },
};

// ─── Progress Ring ─────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 80, stroke = 6, color = "#4477AA" }: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
        strokeWidth={stroke} className="text-muted/30" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`} className="transition-all duration-700" />
    </svg>
  );
}

// ─── Module Card ───────────────────────────────────────────────────────────────

function ModuleCard({
  item, index, isNext, onStart,
}: {
  item: any;
  index: number;
  isNext: boolean;
  onStart: () => void;
}) {
  const mod = item.module ?? {};
  const cap = CAPABILITY_META[mod.capability] ?? { label: mod.capability ?? "Capability", color: "#888", icon: BookOpen };
  const modality = MODALITY_META[mod.modality] ?? { label: mod.modality ?? "Module", icon: BookOpen };
  const CapIcon = cap.icon;
  const ModIcon = modality.icon;

  const isCompleted = item.status === "completed";
  const isLocked = item.status === "locked";
  const isInProgress = item.status === "in_progress";

  // Extract score from scoreJson
  const score = (() => {
    try {
      const s = typeof item.scoreJson === "string" ? JSON.parse(item.scoreJson) : (item.scoreJson ?? {});
      return s.overallScore ?? s.score ?? null;
    } catch { return null; }
  })();

  return (
    <div className={cn(
      "group relative flex gap-4 p-4 rounded-2xl border transition-all",
      isCompleted && "bg-muted/30 border-border/50",
      isNext && "bg-card border-primary/30 shadow-sm ring-1 ring-primary/10",
      isInProgress && !isNext && "bg-card border-border",
      isLocked && "bg-muted/20 border-border/30 opacity-50",
      !isCompleted && !isLocked && !isNext && !isInProgress && "bg-card border-border hover:border-primary/20 hover:shadow-sm",
    )}>
      {/* Capability accent bar */}
      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ background: isLocked ? "#ccc" : cap.color }} />

      {/* Step number / status indicator */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5 pl-1">
        <div className={cn(
          "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all",
          isCompleted && "bg-[#7A9E8E]/20 border-[#7A9E8E]/40 text-[#7A9E8E]",
          isNext && "bg-primary/10 border-primary text-primary",
          isInProgress && !isNext && "bg-primary/5 border-primary/40 text-primary",
          isLocked && "bg-muted/30 border-border/50 text-muted-foreground/40",
          !isCompleted && !isLocked && !isNext && !isInProgress && "bg-muted/20 border-border text-muted-foreground",
        )}>
          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : isLocked ? <Lock className="h-3.5 w-3.5" /> : <span>{index + 1}</span>}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Type + capability badges */}
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <ModIcon className="h-3 w-3" />{modality.label}
              </span>
              <span className="text-muted-foreground/30 text-xs">·</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: isLocked ? "#aaa" : cap.color }}>
                <CapIcon className="h-3 w-3" />{cap.label}
              </span>
              {isNext && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  NEXT UP
                </span>
              )}
              {isInProgress && !isNext && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-[#CCBB44]/12 text-[#99882A]">
                  IN PROGRESS
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className={cn(
              "font-semibold text-sm leading-snug",
              isCompleted && "text-muted-foreground",
              isLocked && "text-muted-foreground/50",
            )}>
              {mod.title ?? "Untitled Module"}
            </h3>

            {/* Subtitle */}
            {mod.subtitle && (
              <p className={cn(
                "text-xs mt-0.5 line-clamp-2",
                isLocked ? "text-muted-foreground/40" : "text-muted-foreground",
              )}>{mod.subtitle}</p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />{mod.durationMins ?? 15} min
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                {mod.levelLabel ?? `Level ${mod.difficulty ?? 1}`}
              </span>
              {isCompleted && score !== null && (
                <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: scoreToColor(score / 10).text }}>
                  <CheckCircle2 className="h-3 w-3" />{score}%
                </span>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="flex-shrink-0 ml-2">
            {isCompleted ? (
              <button
                onClick={onStart}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 py-1"
              >
                <RotateCcw className="h-3 w-3" />Review
              </button>
            ) : isLocked ? (
              <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center">
                <Lock className="h-3.5 w-3.5 text-muted-foreground/30" />
              </div>
            ) : isNext ? (
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={onStart}>
                <Play className="h-3 w-3" />Start
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs bg-transparent" onClick={onStart}>
                Start
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Insights Tab ──────────────────────────────────────────────────────────────

function InsightsTab() {
  const { data: gapData } = trpc.adaptiveLearning.getGapAnalysis.useQuery({}, {
    staleTime: 1000 * 60 * 5,
  });

  const gaps: any[] = useMemo(() => {
    try {
      const raw = gapData?.capabilityGapsJson;
      const parsed = typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});
      // capabilityGapsJson is an object keyed by capability
      if (Array.isArray(parsed)) return parsed;
      return Object.entries(parsed).map(([key, val]: [string, any]) => ({ capabilityKey: key, ...val }));
    } catch { return []; }
  }, [gapData]);

  const SEVERITY_CONFIG = {
    critical:   { label: "Critical Gap",   color: "#C08878", bg: "bg-[#C08878]/10", border: "border-[#C08878]/30" },
    developing: { label: "Developing",     color: "#C8B07A", bg: "bg-[#C8B07A]/10", border: "border-[#C8B07A]/30" },
    proficient: { label: "Proficient",     color: "#7A9E8E", bg: "bg-[#7A9E8E]/10", border: "border-[#7A9E8E]/30" },
    advanced:   { label: "Advanced",       color: "#4477AA", bg: "bg-[#4477AA]/10", border: "border-[#4477AA]/30" },
  };

  if (gaps.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Complete an assessment to see your capability insights.</p>
      </div>
    );
  }

  const overallScore = gapData?.overallReadinessScore ? parseFloat(String(gapData.overallReadinessScore)) : null;
  const readinessBand = gapData?.readinessBand ?? "developing";

  return (
    <div className="space-y-5">
      {/* Overall readiness */}
      {overallScore !== null && (
        <div className="p-4 rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-sm">Overall AI Readiness</h3>
              <p className="text-xs text-muted-foreground capitalize">{readinessBand.replace("_", " ")}</p>
            </div>
            <div className="text-3xl font-bold" style={{ color: scoreToColor(overallScore / 10).text }}>
              {(overallScore / 10).toFixed(1)}
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(overallScore, 100)}%`, background: scoreToColor(overallScore / 10).bg }} />
          </div>
        </div>
      )}

      {/* Capability breakdown */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Capability Breakdown</h3>
        <div className="space-y-3">
          {gaps.slice(0, 8).map((gap: any, i: number) => {
            const cap = CAPABILITY_META[gap.capabilityKey] ?? { label: gap.capabilityKey, color: "#888", icon: BookOpen };
            const CapIcon = cap.icon;
            const sev = SEVERITY_CONFIG[gap.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.developing;
            const score = gap.currentScore ?? gap.score ?? 0;
            const benchmark = gap.benchmarkScore ?? gap.benchmark ?? 0;
            return (
              <div key={i} className={cn("p-4 rounded-xl border", sev.bg, sev.border)}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${cap.color}20` }}>
                      <CapIcon className="h-4 w-4" style={{ color: cap.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{cap.label}</p>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${sev.color}20`, color: sev.color }}>
                        {sev.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold" style={{ color: cap.color as string }}>{(Number(score) / 10).toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">vs {(Number(benchmark) / 10).toFixed(1)} benchmark</p>
                  </div>
                </div>
                {/* Score bar */}
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden relative">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(Number(score), 100)}%`, background: cap.color }} />
                    {/* Benchmark marker */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/40" style={{ left: `${Math.min(Number(benchmark), 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>Benchmark: {(Number(benchmark) / 10).toFixed(1)}</span>
                    <span>10</span>
                  </div>
                </div>
                {gap.failureModes && (gap.failureModes as string[]).length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-current/10">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/70">Risk: </span>{(gap.failureModes as string[])[0]}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Activity Tab ──────────────────────────────────────────────────────────────

function ActivityTab({ items }: { items: any[] }) {
  const completedItems = items.filter(i => i.status === "completed");
  // R3-04: Compute day streak from completedAt timestamps
  const dayStreak = (() => {
    const dates = completedItems
      .map((i: any) => i.completedAt)
      .filter(Boolean)
      .map((ts: number) => {
        const d = new Date(ts);
        return `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      });
    const uniqueDays = Array.from(new Set(dates)).sort().reverse() as string[];
    if (uniqueDays.length === 0) return 0;
    const todayD = new Date();
    const today = `${todayD.getFullYear()}-${String(todayD.getMonth()).padStart(2,'0')}-${String(todayD.getDate()).padStart(2,'0')}`;
    const yesterdayD = new Date(Date.now() - 86400000);
    const yesterday = `${yesterdayD.getFullYear()}-${String(yesterdayD.getMonth()).padStart(2,'0')}-${String(yesterdayD.getDate()).padStart(2,'0')}`;
    if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;
    let streak = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const prev = new Date(uniqueDays[i - 1]);
      const curr = new Date(uniqueDays[i]);
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
      if (diffDays === 1) streak++;
      else break;
    }
    return streak;
  })();
  const totalXP = completedItems.reduce((acc: number, i: any) => {
    try {
      const s = typeof i.scoreJson === "string" ? JSON.parse(i.scoreJson) : (i.scoreJson ?? {});
      return acc + (s.overallScore ?? s.score ?? 0);
    } catch { return acc; }
  }, 0);

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-[#7A9E8E]">{completedItems.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-[#C8B07A] flex items-center justify-center gap-1">
            <Flame className="h-5 w-5" />{dayStreak}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Day streak</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-primary">{Math.round(totalXP)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total XP</p>
        </div>
      </div>

      {/* Completed modules */}
      {completedItems.length > 0 ? (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Completed Modules</h3>
          {completedItems.map((item: any, i: number) => {
            const mod = item.module ?? {};
            const cap = CAPABILITY_META[mod.capability] ?? { label: mod.capability ?? "", color: "#888", icon: BookOpen };
            const CapIcon = cap.icon;
            const score = (() => {
              try {
                const s = typeof item.scoreJson === "string" ? JSON.parse(item.scoreJson) : (item.scoreJson ?? {});
                return s.overallScore ?? s.score ?? null;
              } catch { return null; }
            })();
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/30">
                <div className="w-7 h-7 rounded-full bg-[#7A9E8E]/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#7A9E8E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{mod.title ?? "Module"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CapIcon className="h-3 w-3" style={{ color: cap.color }} />{cap.label}
                  </p>
                </div>
                {score !== null && (
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: scoreToColor(score / 10).text }}>
                    {Math.round(score)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Award className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No completed modules yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Start your first module to begin earning XP.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LearningPlanPage() {
  const [, setLocation] = useLocation();
  // tabs removed — single-page layout

  const { data: plan, isLoading } = trpc.adaptiveLearning.getAdaptivePlan.useQuery({}, {
    staleTime: 1000 * 60 * 2,
  });
  // BA-07: Org ambition context
  const { data: ambitionGap } = (trpc.dashboardV2.leader.ambitionGap as any).useQuery(undefined, {
    retry: false,
    onError: () => {},
  });

  const generatePlan = trpc.adaptiveLearning.getAdaptivePlan.useQuery(
    { forceRegenerate: true },
    { enabled: false }
  );

  // Compute derived stats from plan
  const items: any[] = plan?.items ?? [];
  const totalItems = items.length;
  const completedCount = items.filter(i => i.status === "completed").length;
  // Treat items with startedAt but not completedAt as in-progress (status may still be "available")
  const inProgressCount = items.filter(i =>
    i.status === "in_progress" || (i.startedAt && !i.completedAt && i.status !== "completed" && i.status !== "locked")
  ).length;
  const pct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
  const nextItem = items.find(i => i.status === "in_progress" || i.status === "available");

  // Estimated time remaining
  const remainingMins = items
    .filter(i => i.status !== "completed")
    .reduce((acc: number, i: any) => acc + (i.module?.durationMins ?? 15), 0);
  const remainingHours = Math.floor(remainingMins / 60);
  const remainingMinRem = remainingMins % 60;

  if (isLoading) {
    return (
      <div className="px-5 py-6 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 rounded-xl" />
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="px-5 py-6 md:px-8 max-w-7xl mx-auto">
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">No Learning Plan Yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Complete an assessment to get a personalised learning plan tailored to your capability gaps.
            </p>
          </div>
          <Button
            onClick={() => toast.info("Complete an assessment first to generate your plan.")}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />Get Started
          </Button>
        </div>
      </div>
    );
  }

  // Group items by capability domain for the module list
  const capOrder: string[] = [];
  const grouped = new Map<string, any[]>();
  items.forEach((item: any) => {
    const cap = item.module?.capability ?? "other";
    if (!grouped.has(cap)) { grouped.set(cap, []); capOrder.push(cap); }
    grouped.get(cap)!.push(item);
  });

  return (
    <div className="px-5 py-6 md:px-8 max-w-7xl mx-auto space-y-6">

      {/* ── Page header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Your AI Capability Plan</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {completedCount} of {totalItems} modules complete
            {remainingMins > 0 && <> · {remainingHours > 0 ? `${remainingHours}h ` : ""}{remainingMinRem}m remaining</>}
          </p>
        </div>
        <DownloadPdfButton type="learning_plan" label="Download Plan PDF" variant="outline" size="sm" />
      </header>

      {/* ── Org ambition banner ── */}
      {ambitionGap && ambitionGap.configured && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-[#228833]/20 bg-[#228833]/3">
          <div className="w-7 h-7 rounded-lg bg-[#228833]/10 flex items-center justify-center shrink-0 mt-0.5">
            <TrendingUp className="h-3.5 w-3.5 text-[#228833]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#228833]">Aligned to your organisation's AI ambition</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Closing the gap from <strong className="text-foreground">{ambitionGap.functionAvgRaw !== null ? (ambitionGap.functionAvgRaw / 10).toFixed(1) : "—"}/10</strong> to target <strong className="text-foreground">{ambitionGap.ambitionTargetScore !== null ? (ambitionGap.ambitionTargetScore / 10).toFixed(1) : "—"}/10</strong>.
              {ambitionGap.ambitionTargetLabel && <> Goal: <em>"{ambitionGap.ambitionTargetLabel}"</em>.</>}
            </p>
          </div>
        </div>
      )}

      {/* ── 4-column stat grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <ProgressRing pct={pct} size={56} stroke={4} color="#4477AA" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold">{pct}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Progress</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{completedCount} / {totalItems} done</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-[#7A9E8E]">{completedCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-[#C8B07A]">{inProgressCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">In Progress</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{totalItems - completedCount - inProgressCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Remaining</p>
        </div>
      </div>

      {/* ── Overall progress bar ── */}
      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>

      {/* ── Continue learning CTA ── */}
      {nextItem && (
        <button
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15 hover:bg-primary/10 transition-colors text-left"
          onClick={() => setLocation(`/learning/module/${nextItem.moduleId}?planItemId=${nextItem.id}`)}
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Play className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-0.5">Continue Learning</p>
            <p className="text-sm font-semibold truncate">{nextItem.module?.title ?? "Next Module"}</p>
            {nextItem.module?.capability && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {CAPABILITY_META[nextItem.module.capability]?.label ?? nextItem.module.capability}
              </p>
            )}
          </div>
          <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" />
        </button>
      )}

      {/* ── Two-column layout: domain progress sidebar + module list ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">

        {/* Left: domain progress summary */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4 lg:sticky lg:top-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Domain progress</p>
          <div className="space-y-3">
            {capOrder.map(capKey => {
              const capItems = grouped.get(capKey)!;
              const meta = CAPABILITY_META[capKey] ?? { label: capKey, color: "#888", icon: BookOpen };
              const CapIcon = meta.icon;
              const capCompleted = capItems.filter((i: any) => i.status === "completed").length;
              const capTotal = capItems.length;
              const capPct = capTotal > 0 ? Math.round((capCompleted / capTotal) * 100) : 0;
              return (
                <div key={capKey}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: `${meta.color}20` }}>
                        <CapIcon className="h-3 w-3" style={{ color: meta.color }} />
                      </div>
                      <span className="text-xs font-medium text-foreground">{meta.label}</span>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: meta.color }}>{capPct}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${capPct}%`, backgroundColor: meta.color }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{capCompleted}/{capTotal} modules</p>
                </div>
              );
            })}
          </div>

          {/* Gap insights inline */}
          <div className="pt-3 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Gap insights</p>
            <InsightsTab />
          </div>
        </div>

        {/* Right: full module list grouped by domain */}
        <div className="space-y-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Your learning path is being prepared.</p>
            </div>
          ) : (
            capOrder.map((capKey) => {
              const capItems = grouped.get(capKey)!;
              const meta = CAPABILITY_META[capKey] ?? { label: capKey, color: "#888", icon: BookOpen };
              const CapIcon = meta.icon;
              const capCompleted = capItems.filter((i: any) => i.status === "completed").length;
              const capTotal = capItems.length;
              const capPct = capTotal > 0 ? Math.round((capCompleted / capTotal) * 100) : 0;
              return (
                <div key={capKey}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${meta.color}20` }}>
                        <CapIcon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                      </div>
                      <span className="text-sm font-semibold text-foreground">{meta.label}</span>
                      <span className="text-xs text-muted-foreground">{capCompleted}/{capTotal} modules</span>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: meta.color }}>{capPct}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${capPct}%`, backgroundColor: meta.color }} />
                  </div>
                  <div className="space-y-2">
                    {capItems.map((item: any, i: number) => (
                      <ModuleCard
                        key={item.id ?? i}
                        item={item}
                        index={items.indexOf(item)}
                        isNext={!!(nextItem && item.id === nextItem.id)}
                        onStart={() => setLocation(`/learning/module/${item.moduleId}?planItemId=${item.id}`)}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
