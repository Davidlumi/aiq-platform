/**
 * LearningPlanPage — Simplified & Decluttered
 *
 * Layout:
 *   1. Header: title + overall progress ring + PDF download
 *   2. Continue Learning strip (if module in progress)
 *   3. 2-col domain card grid — each card shows score, readiness, module progress
 *   4. Clicking a domain card expands inline module list
 */

import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  BookOpen, FileText, HelpCircle, Layers, Video, MessageSquare,
  Users, Clock, CheckCircle2, Lock, Play,
  Brain, BarChart3, Target, Sparkles, ArrowRight,
  ChevronDown, ChevronUp, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DOMAIN_KEYS, DOMAIN_LABELS, DOMAIN_COLOURS, DOMAIN_DESCRIPTIONS,
} from "../../../../shared/dashboard";

// ── Domain icon map ────────────────────────────────────────────────────────────

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  ai_interaction:        MessageSquare,
  ai_output_evaluation:  BarChart3,
  ai_workflow_design:    Layers,
  workforce_ai_readiness: Users,
  ai_ethics_trust:       Target,
  ai_change_leadership:  TrendingUp,
};

// ── Readiness badge ────────────────────────────────────────────────────────────

const READINESS: Record<string, { label: string; color: string; bg: string }> = {
  ai_ready:               { label: "AI Ready",        color: "#047857", bg: "#04785718" },
  developing:             { label: "Developing",       color: "#C8B07A", bg: "#C8B07A18" },
  not_yet_ready:          { label: "Not Yet Ready",    color: "#DC2626", bg: "#DC262618" },
  foundation_gap:         { label: "Foundation Gap",   color: "#F97316", bg: "#F9731618" },
  insufficient_evidence:  { label: "Not assessed",     color: "#888",    bg: "#88888818" },
};

// ── Modality icons ─────────────────────────────────────────────────────────────

const MODALITY_ICONS: Record<string, React.ElementType> = {
  tutorial:  BookOpen,
  video:     Video,
  scenario:  FileText,
  coaching:  MessageSquare,
  quiz:      HelpCircle,
  workshop:  Users,
};

// ── Module row ─────────────────────────────────────────────────────────────────

function ModuleRow({
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

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all",
        isNext
          ? "border-primary/30 bg-primary/5"
          : isCompleted
          ? "border-border/30 bg-muted/15"
          : isLocked
          ? "border-border/20 bg-muted/8 opacity-55"
          : "border-border bg-card hover:border-border/70"
      )}
    >
      {/* Status dot */}
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
        isCompleted ? "bg-[#047857]/15 text-[#047857]"
          : isLocked ? "bg-muted text-muted-foreground"
          : isNext ? "bg-primary/15 text-primary"
          : "bg-muted/50 text-muted-foreground"
      )}>
        {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" />
          : isLocked ? <Lock className="h-3 w-3" />
          : index + 1}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <ModalityIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className={cn(
            "text-sm font-medium leading-snug truncate",
            isCompleted && "text-muted-foreground line-through decoration-muted-foreground/40"
          )}>
            {mod.title ?? "Module"}
          </span>
          {isNext && <span className="text-[10px] font-bold text-primary uppercase tracking-widest ml-1 flex-shrink-0">Next</span>}
          {isInProgress && !isNext && <span className="text-[10px] font-medium text-[#C8B07A] flex-shrink-0">In progress</span>}
        </div>
        {mod.durationMins && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />{mod.durationMins} min
          </span>
        )}
      </div>

      {/* Action */}
      {isCompleted ? (
        <span className="flex items-center gap-1 text-xs font-medium text-[#047857] flex-shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5" />Completed
          </span>
      ) : isLocked ? null : (
        <button
          onClick={onStart}
          className={cn(
            "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0",
            isNext
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-foreground hover:bg-muted/80"
          )}
        >
          <Play className="h-3 w-3" />
          {isInProgress ? "Resume" : "Start"}
        </button>
      )}
    </div>
  );
}

// ── Domain card ────────────────────────────────────────────────────────────────

function DomainCard({
  domainKey,
  items,
  nextItem,
  domainScore,
  domainRating,
  onStart,
}: {
  domainKey: string;
  items: any[];
  nextItem: any | null;
  domainScore: number | null;
  domainRating: string | null;
  onStart: (item: any) => void;
}) {
  const [open, setOpen] = useState(false);

  const label = DOMAIN_LABELS[domainKey as keyof typeof DOMAIN_LABELS] ?? domainKey;
  const colour = DOMAIN_COLOURS[domainKey as keyof typeof DOMAIN_COLOURS] ?? "#4477AA";
  const description = DOMAIN_DESCRIPTIONS[domainKey as keyof typeof DOMAIN_DESCRIPTIONS] ?? "";
  const DomainIcon = DOMAIN_ICONS[domainKey] ?? BookOpen;
  const readiness = READINESS[domainRating ?? "insufficient_evidence"] ?? READINESS["insufficient_evidence"];

  const completedCount = items.filter(i => i.status === "completed").length;
  const totalCount = items.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const hasNext = items.some(i => nextItem && i.id === nextItem.id);
  const nextInDomain = items.find(i => i.status === "in_progress" || i.status === "available");

  return (
    <div
      className="rounded-2xl border border-border bg-card overflow-hidden"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      {/* Card header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left p-5 hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${colour}18` }}
          >
            <DomainIcon className="h-5 w-5" style={{ color: colour }} />
          </div>

          {/* Title + readiness */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm font-semibold text-foreground">{label}</h3>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ color: readiness.color, backgroundColor: readiness.bg }}
              >
                {readiness.label}
              </span>
            </div>

            {/* Module progress */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: colour }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                {completedCount} of {totalCount} modules
              </span>
            </div>
          </div>

          {/* Score */}
          <div className="flex-shrink-0 text-right ml-2">
            {domainScore !== null && domainScore > 0 ? (
              <p className="text-xl font-bold tabular-nums" style={{ color: colour }}>
                {(domainScore / 10).toFixed(1)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">—</p>
            )}
          </div>

          {/* Chevron */}
          <div className="flex-shrink-0 text-muted-foreground mt-1">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>

        {/* Quick action strip — only when collapsed and there's something to do */}
        {!open && nextInDomain && (
          <div className="mt-3 flex items-center gap-2 pt-3 border-t border-border/40">
            <Play className="h-3 w-3 text-primary flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate flex-1">
              {hasNext ? "Next up: " : ""}{nextInDomain.module?.title ?? "Continue"}
            </span>
            <span className="text-xs font-semibold text-primary flex-shrink-0">
              {nextInDomain.status === "in_progress" ? "Resume →" : "Start →"}
            </span>
          </div>
        )}
      </button>

      {/* Expanded module list */}
      {open && (
        <div className="px-5 pb-5 pt-3 border-t border-border/40 space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">No modules assigned for this domain.</p>
          ) : (
            items.map((item: any, i: number) => (
              <ModuleRow
                key={item.id}
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

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function LearningPlanPage() {
  const [, setLocation] = useLocation();

  const { data: plan, isLoading: planLoading } = trpc.adaptiveLearning.getAdaptivePlan.useQuery({}, {
    staleTime: 1000 * 60 * 2,
  });
  const { data: dashData, isLoading: dashLoading } = trpc.dashboardV2.individual.main.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const isLoading = planLoading || dashLoading;

  const items: any[] = plan?.items ?? [];
  const totalItems = items.length;
  const completedCount = items.filter(i => i.status === "completed").length;
  const pct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
  const nextItem = items.find(i => i.status === "in_progress" || i.status === "available");

  const remainingMins = items
    .filter(i => i.status !== "completed")
    .reduce((acc: number, i: any) => acc + (i.module?.durationMins ?? 15), 0);
  const remainingHours = Math.floor(remainingMins / 60);
  const remainingMinRem = remainingMins % 60;

  // Group items by domain, preserving DOMAIN_KEYS order
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    // Pre-populate with all known domain keys in order
    DOMAIN_KEYS.forEach(k => map.set(k, []));
    items.forEach((item: any) => {
      const cap = item.module?.capability ?? "other";
      if (!map.has(cap)) map.set(cap, []);
      map.get(cap)!.push(item);
    });
    return map;
  }, [items]);

  // Domain scores from individual dashboard
  const domainMap = useMemo(() => {
    const m: Record<string, { score: number; rating: string; name: string; colour: string }> = {};
    (dashData?.domains ?? []).forEach((d: any) => { m[d.key] = d; });
    return m;
  }, [dashData]);

  // All domain keys to render (DOMAIN_KEYS order, plus any extras from plan)
  const allDomainKeys = useMemo(() => {
    const extra: string[] = [];
    grouped.forEach((_, k) => {
      if (!DOMAIN_KEYS.includes(k as any)) extra.push(k);
    });
    return [...DOMAIN_KEYS, ...extra];
  }, [grouped]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-14 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-5xl mx-auto">
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Progress ring */}
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
              <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
              <circle
                cx="28" cy="28" r="22" fill="none"
                stroke="var(--primary)" strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-foreground tabular-nums">{pct}%</span>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-semibold text-foreground">Learning Plan</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {completedCount} of {totalItems} modules complete
              {remainingMins > 0 && (
                <> · {remainingHours > 0 ? `${remainingHours}h ` : ""}{remainingMinRem}m remaining</>
              )}
            </p>
          </div>
        </div>


      </div>

      {/* ── Continue Learning strip ──────────────────────────────────────────── */}
      {nextItem && (
        <button
          className="w-full flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
          onClick={() => setLocation(`/learning/module/${nextItem.moduleId}?planItemId=${nextItem.id}`)}
        >
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Play className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Continue Learning</p>
            <p className="text-sm font-semibold truncate">{nextItem.module?.title ?? "Next Module"}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" />
        </button>
      )}

      {/* ── Domain cards grid ────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Capability Domains</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allDomainKeys.map(domainKey => {
            const capItems = grouped.get(domainKey) ?? [];
            const domain = domainMap[domainKey];
            return (
              <DomainCard
                key={domainKey}
                domainKey={domainKey}
                items={capItems}
                nextItem={nextItem}
                domainScore={domain?.score ?? null}
                domainRating={domain?.rating ?? null}
                onStart={(item) => setLocation(`/learning/module/${item.moduleId}?planItemId=${item.id}`)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
