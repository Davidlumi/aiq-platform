/**
 * LearningPlanPage — Domain-card layout
 *
 * Clean, full-width layout inspired by world-class learning platforms.
 * One card per capability domain showing the assessment score + readiness,
 * with modules listed underneath. No sidebar, no tabs.
 */

import { useMemo, useState } from "react";
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
  Flame, ArrowRight, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { scoreToColor } from "@/lib/peakon-colors";

// ─── Constants ─────────────────────────────────────────────────────────────────

const CAPABILITY_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ai_foundations:       { label: "AI Foundations",       color: "#4477AA", icon: Brain },
  ai_interaction:       { label: "AI Interaction",       color: "#66AADD", icon: MessageSquare },
  data_literacy:        { label: "Data Literacy",        color: "#228833", icon: BarChart3 },
  governance:           { label: "AI Governance",        color: "#CCBB44", icon: Target },
  execution:            { label: "AI Execution",         color: "#EE6677", icon: Zap },
  strategy:             { label: "AI Strategy",          color: "#AA3377", icon: Lightbulb },
  // Aliases
  foundations:          { label: "AI Foundations",       color: "#4477AA", icon: Brain },
  interaction:          { label: "AI Interaction",       color: "#66AADD", icon: MessageSquare },
  workforce_readiness:  { label: "Workforce Readiness",  color: "#228833", icon: Users },
  change_leadership:    { label: "Change Leadership",    color: "#CCBB44", icon: Target },
  workflow_design:      { label: "Workflow Design",      color: "#EE6677", icon: Layers },
};

const MODALITY_ICONS: Record<string, React.ElementType> = {
  tutorial:  BookOpen,
  video:     Video,
  scenario:  FileText,
  coaching:  MessageSquare,
  quiz:      HelpCircle,
  workshop:  Users,
};

const READINESS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ai_ready:           { label: "AI Ready",         color: "#228833", bg: "#22883318" },
  developing:         { label: "Developing",        color: "#C8B07A", bg: "#C8B07A18" },
  foundation_gap:     { label: "Foundation Gap",    color: "#EE6677", bg: "#EE667718" },
  insufficient_evidence: { label: "Not yet assessed", color: "#888", bg: "#88888818" },
};

// ─── Module Card ───────────────────────────────────────────────────────────────

function ModuleCard({
  item,
  index,
  isNext,
  onStart,
}: {
  item: any;
  index: number;
  isNext: boolean;
  onStart: () => void;
}) {
  const mod = item.module ?? {};
  const ModalityIcon = MODALITY_ICONS[mod.modality] ?? BookOpen;
  const isCompleted = item.status === "completed";
  const isLocked = item.status === "locked";
  const isInProgress = item.status === "in_progress" || (item.startedAt && !item.completedAt && !isCompleted && !isLocked);

  const score = useMemo(() => {
    if (!item.scoreJson) return null;
    try {
      const s = typeof item.scoreJson === "string" ? JSON.parse(item.scoreJson) : item.scoreJson;
      const raw = s.overallScore ?? s.score ?? null;
      return raw !== null ? Math.round(raw) : null;
    } catch { return null; }
  }, [item.scoreJson]);

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-xl border transition-all",
        isNext
          ? "border-primary/30 bg-primary/3 shadow-sm"
          : isCompleted
          ? "border-border/40 bg-muted/20"
          : isLocked
          ? "border-border/30 bg-muted/10 opacity-60"
          : "border-border bg-card hover:border-border/80 hover:shadow-sm"
      )}
    >
      {/* Status indicator */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold",
        isCompleted ? "bg-[#228833]/15 text-[#228833]"
          : isLocked ? "bg-muted text-muted-foreground"
          : isNext ? "bg-primary/15 text-primary"
          : "bg-muted/50 text-muted-foreground"
      )}>
        {isCompleted ? <CheckCircle2 className="h-4 w-4" />
          : isLocked ? <Lock className="h-3.5 w-3.5" />
          : index + 1}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1 capitalize">
            <ModalityIcon className="h-3 w-3" />{mod.modality ?? "module"}
          </span>
          {isNext && (
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Next up</span>
          )}
          {isInProgress && !isNext && (
            <span className="text-xs font-medium text-[#C8B07A]">In progress</span>
          )}
        </div>
        <p className={cn("text-sm font-semibold leading-snug", isCompleted && "text-muted-foreground line-through decoration-muted-foreground/40")}>
          {mod.title ?? "Module"}
        </p>
        {mod.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{mod.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          {mod.durationMins && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{mod.durationMins} min</span>}
          {mod.levelLabel && <span className="capitalize">{mod.levelLabel}</span>}
        </div>
      </div>

      {/* Action */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {score !== null && (
          <span className="text-xs font-bold" style={{ color: scoreToColor(score / 100).text }}>{score}%</span>
        )}
        {isCompleted ? (
          <button
            onClick={onStart}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
          >
            <RotateCcw className="h-3 w-3" />Review
          </button>
        ) : isLocked ? null : (
          <button
            onClick={onStart}
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all",
              isNext
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                : "bg-muted text-foreground hover:bg-muted/80"
            )}
          >
            <Play className="h-3 w-3" />
            {isInProgress ? "Resume" : "Start"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Domain Card ───────────────────────────────────────────────────────────────

function DomainCard({
  domainKey,
  domainName,
  domainScore,
  domainRating,
  domainColor,
  items,
  nextItem,
  onStart,
  defaultOpen,
}: {
  domainKey: string;
  domainName: string;
  domainScore: number | null;
  domainRating: string | null;
  domainColor: string;
  items: any[];
  nextItem: any | null;
  onStart: (item: any) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = CAPABILITY_META[domainKey] ?? { label: domainName, color: domainColor, icon: BookOpen };
  const DomainIcon = meta.icon;
  const completedCount = items.filter(i => i.status === "completed").length;
  const totalCount = items.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const readiness = READINESS_LABELS[domainRating ?? "insufficient_evidence"] ?? READINESS_LABELS["insufficient_evidence"];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Domain header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/20 transition-colors"
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.color}18` }}>
          <DomainIcon className="h-5 w-5" style={{ color: meta.color }} />
        </div>

        {/* Domain info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-foreground">{meta.label}</h2>
            {domainRating && domainRating !== "insufficient_evidence" && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ color: readiness.color, backgroundColor: readiness.bg }}
              >
                {readiness.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            {/* Module progress */}
            <span className="text-xs text-muted-foreground">{completedCount}/{totalCount} modules</span>
            {/* Progress bar */}
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[120px]">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
            </div>
            <span className="text-xs font-medium" style={{ color: meta.color }}>{pct}%</span>
          </div>
        </div>

        {/* Assessment score */}
        {domainScore !== null && domainScore > 0 ? (
          <div className="flex-shrink-0 text-right mr-2">
            <p className="text-xl font-bold" style={{ color: meta.color }}>{(domainScore / 10).toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">/10</p>
          </div>
        ) : (
          <div className="flex-shrink-0 text-right mr-2">
            <p className="text-xs text-muted-foreground">Not assessed</p>
          </div>
        )}

        {/* Chevron */}
        <div className="flex-shrink-0 text-muted-foreground">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Module list */}
      {open && (
        <div className="px-5 pb-5 space-y-2 border-t border-border/50 pt-4">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No modules assigned for this domain.</p>
          ) : (
            items.map((item: any, i: number) => (
              <ModuleCard
                key={item.id ?? i}
                item={item}
                index={i}
                isNext={!!(nextItem && item.id === nextItem.id)}
                onStart={() => onStart(item)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LearningPlanPage() {
  const [, setLocation] = useLocation();

  const { data: plan, isLoading: planLoading } = trpc.adaptiveLearning.getAdaptivePlan.useQuery({}, {
    staleTime: 1000 * 60 * 2,
  });
  const { data: dashData, isLoading: dashLoading } = trpc.dashboardV2.individual.main.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
  const { data: ambitionGap } = (trpc.dashboardV2.leader.ambitionGap as any).useQuery(undefined, {
    retry: false,
    onError: () => {},
  });

  const isLoading = planLoading || dashLoading;

  // Compute derived stats from plan
  const items: any[] = plan?.items ?? [];
  const totalItems = items.length;
  const completedCount = items.filter(i => i.status === "completed").length;
  const pct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
  const nextItem = items.find(i => i.status === "in_progress" || i.status === "available");

  // Estimated time remaining
  const remainingMins = items
    .filter(i => i.status !== "completed")
    .reduce((acc: number, i: any) => acc + (i.module?.durationMins ?? 15), 0);
  const remainingHours = Math.floor(remainingMins / 60);
  const remainingMinRem = remainingMins % 60;

  // Group items by capability domain
  const capOrder: string[] = [];
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    const order: string[] = [];
    items.forEach((item: any) => {
      const cap = item.module?.capability ?? "other";
      if (!map.has(cap)) { map.set(cap, []); order.push(cap); }
      map.get(cap)!.push(item);
    });
    capOrder.splice(0, capOrder.length, ...order);
    return map;
  }, [items]);

  // Domain scores from individual dashboard
  const domainMap = useMemo(() => {
    const m: Record<string, { score: number; rating: string; name: string; colour: string }> = {};
    (dashData?.domains ?? []).forEach((d: any) => { m[d.key] = d; });
    return m;
  }, [dashData]);

  if (isLoading) {
    return (
      <div className="px-5 py-6 md:px-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-2 rounded-full" />
        <Skeleton className="h-14 rounded-xl" />
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="px-5 py-6 md:px-8 max-w-5xl mx-auto">
        <div className="text-center py-20 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">No Learning Plan Yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Complete an assessment to get a personalised learning plan tailored to your capability gaps.
            </p>
          </div>
          <Button onClick={() => setLocation("/assessment")} className="gap-2">
            <Sparkles className="h-4 w-4" />Start Assessment
          </Button>
        </div>
      </div>
    );
  }

  const capOrderFinal: string[] = [];
  grouped.forEach((_, key) => capOrderFinal.push(key));

  return (
    <div className="px-5 py-6 md:px-8 max-w-5xl mx-auto space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Your AI Capability Plan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {completedCount} of {totalItems} modules complete
            {remainingMins > 0 && <> · {remainingHours > 0 ? `${remainingHours}h ` : ""}{remainingMinRem}m remaining</>}
          </p>
        </div>
        <DownloadPdfButton type="learning_plan" label="Download Plan PDF" variant="outline" size="sm" className="shrink-0" />
      </div>

      {/* ── Overall progress bar ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Overall progress</span>
          <span className="text-xs font-semibold text-foreground">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* ── Org ambition banner ── */}
      {ambitionGap && ambitionGap.configured && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-[#228833]/20 bg-[#228833]/3">
          <TrendingUp className="h-4 w-4 text-[#228833] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-[#228833]">Aligned to your organisation's AI ambition — </span>
            closing the gap from <strong className="text-foreground">{ambitionGap.functionAvgRaw !== null ? (ambitionGap.functionAvgRaw / 10).toFixed(1) : "—"}/10</strong> to target <strong className="text-foreground">{ambitionGap.ambitionTargetScore !== null ? (ambitionGap.ambitionTargetScore / 10).toFixed(1) : "—"}/10</strong>.
            {ambitionGap.ambitionTargetLabel && <> Goal: <em>"{ambitionGap.ambitionTargetLabel}"</em>.</>}
          </p>
        </div>
      )}

      {/* ── Continue learning CTA ── */}
      {nextItem && (
        <button
          className="w-full flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
          onClick={() => setLocation(`/learning/module/${nextItem.moduleId}?planItemId=${nextItem.id}`)}
        >
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
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

      {/* ── Domain cards ── */}
      <div className="space-y-3">
        {capOrderFinal.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Your learning path is being prepared.</p>
          </div>
        ) : (
          capOrderFinal.map((capKey, idx) => {
            const capItems = grouped.get(capKey) ?? [];
            const domain = domainMap[capKey];
            const meta = CAPABILITY_META[capKey] ?? { label: capKey, color: "#888", icon: BookOpen };
            return (
              <DomainCard
                key={capKey}
                domainKey={capKey}
                domainName={domain?.name ?? meta.label}
                domainScore={domain?.score ?? null}
                domainRating={domain?.rating ?? null}
                domainColor={domain?.colour ?? meta.color}
                items={capItems}
                nextItem={nextItem}
                onStart={(item) => setLocation(`/learning/module/${item.moduleId}?planItemId=${item.id}`)}
                defaultOpen={idx === 0}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
