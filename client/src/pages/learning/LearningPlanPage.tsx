/**
 * LearningPlanPage — v2 Rebuild
 *
 * Block A: Header zone (A1 contextual greeting, A2 continue-learning strip, A3 progress framing)
 * Block B: Strategy linkage (B1 in-flight initiatives panel, B2 modules-per-initiative route)
 * Block C: Domain cards (C1 score demoted, C2 subtle tints, C3 readiness badge removed)
 * Block D: Recent activity (D1 compact completions, D2 coaching conversations)
 */
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, FileText, HelpCircle, Layers, Video, MessageSquare,
  Users, Clock, CheckCircle2, Lock, Play,
  Brain, Target, Sparkles, ArrowRight,
  ChevronDown, ChevronUp, TrendingUp, Flag,
  MessageCircle, ScanSearch, ShieldCheck, Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DOMAIN_KEYS, DOMAIN_LABELS, DOMAIN_COLOURS, DOMAIN_BG_COLOURS,
} from "../../../../shared/dashboard";

// ── Domain icon map ────────────────────────────────────────────────────────────
const DOMAIN_ICONS: Record<string, React.ElementType> = {
  ai_interaction:         MessageSquare,
  ai_output_evaluation:   ScanSearch,
  ai_workflow_design:     Workflow,
  workforce_ai_readiness: Users,
  ai_ethics_trust:        ShieldCheck,
  ai_change_leadership:   TrendingUp,
};

// ── Modality icons ─────────────────────────────────────────────────────────────
const MODALITY_ICONS: Record<string, React.ElementType> = {
  tutorial:   BookOpen,
  video:      Video,
  scenario:   FileText,
  coaching:   MessageSquare,
  practical:  HelpCircle,
  case_study: Brain,
  quiz:       Target,
  reflection: Layers,
};

const LESSON_FORMAT_LABELS: Record<string, string> = {
  tutorial:   "Explainer",
  practical:  "Practical Activity",
  case_study: "Case Study",
  quiz:       "Knowledge Check",
  scenario:   "Scenario Practice",
  video:      "Video Lesson",
  reflection: "Guided Reflection",
  coaching:   "AI Coaching",
};

function getLearningPhase(levelLabel: string): { label: string; color: string; bg: string } {
  const l = (levelLabel ?? "").toLowerCase();
  if (l === "foundation" || l === "beginner" || l === "emerging")
    return { label: "Foundation", color: "#6366F1", bg: "#6366F118" };
  if (l === "developing" || l === "practitioner")
    return { label: "Building", color: "#C8B07A", bg: "#C8B07A18" };
  if (l === "advanced" || l === "expert" || l === "capable" || l === "strong")
    return { label: "Leading", color: "#047857", bg: "#04785718" };
  return { label: "Foundation", color: "#6366F1", bg: "#6366F118" };
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function relativeTime(ts: number | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  return `${Math.floor(days / 7)} weeks ago`;
}

// ── Module row ─────────────────────────────────────────────────────────────────
function ModuleRow({
  item, index, isNext, onStart,
}: {
  item: any; index: number; isNext: boolean; onStart: () => void;
}) {
  const mod = item.module ?? {};
  const ModalityIcon = MODALITY_ICONS[mod.modality] ?? BookOpen;
  const isCompleted = item.status === "completed";
  const isLocked = item.status === "locked";
  const isInProgress = item.status === "in_progress"
    || (item.startedAt && !item.completedAt && !isCompleted && !isLocked);
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl border transition-all",
      isNext ? "border-primary/30 bg-primary/5"
        : isCompleted ? "border-border/30 bg-muted/15"
        : isLocked ? "border-border/20 bg-muted/8 opacity-55"
        : "border-border bg-card hover:border-border/70"
    )}>
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
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className={cn("text-sm font-medium leading-snug truncate",
            isCompleted && "text-muted-foreground line-through decoration-muted-foreground/40")}>
            {mod.title ?? "Module"}
          </span>
          {isNext && (
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest ml-1 flex-shrink-0">
              Next
            </span>
          )}
          {isInProgress && !isNext && (
            <span className="text-[10px] font-medium text-[#C8B07A] flex-shrink-0">In progress</span>
          )}
        </div>
        {(() => {
          const body = typeof mod.bodyJson === "string"
            ? (() => { try { return JSON.parse(mod.bodyJson); } catch { return {}; } })()
            : (mod.bodyJson ?? {});
          const hook = body?.introduction?.hook;
          return hook
            ? <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2 pr-2">{hook}</p>
            : null;
        })()}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {mod.modality && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <ModalityIcon className="h-2.5 w-2.5" />
              {LESSON_FORMAT_LABELS[mod.modality] ?? mod.modality}
            </span>
          )}
          {mod.levelLabel && (() => {
            const phase = getLearningPhase(mod.levelLabel);
            return (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ color: phase.color, backgroundColor: phase.bg }}>
                {phase.label}
              </span>
            );
          })()}
          {mod.durationMins && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />{mod.durationMins} min
            </span>
          )}
        </div>
      </div>
      {isCompleted ? (
        <span className="flex items-center gap-1 text-xs font-medium text-[#047857] flex-shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5" />Completed
        </span>
      ) : isLocked ? null : (
        <button onClick={onStart} className={cn(
          "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0",
          isNext
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-foreground hover:bg-muted/80"
        )}>
          <Play className="h-3 w-3" />
          {isInProgress ? "Resume" : "Start"}
        </button>
      )}
    </div>
  );
}

// ── Block C: Domain card ───────────────────────────────────────────────────────
function DomainCard({
  domainKey, items, nextItem, domainScore, onStart, connectsTo, onViewInitiative,
}: {
  domainKey: string;
  items: any[];
  nextItem: any | null;
  domainScore: number | null;
  onStart: (item: any) => void;
  connectsTo?: { initiativeId: string; name: string } | null;
  onViewInitiative?: (initiativeId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = DOMAIN_LABELS[domainKey as keyof typeof DOMAIN_LABELS] ?? domainKey;
  const colour = DOMAIN_COLOURS[domainKey as keyof typeof DOMAIN_COLOURS] ?? "#4477AA";
  const bgColour = DOMAIN_BG_COLOURS[domainKey as keyof typeof DOMAIN_BG_COLOURS] ?? "rgba(68,119,170,0.12)";
  const DomainIcon = DOMAIN_ICONS[domainKey] ?? BookOpen;
  const completedCount = items.filter(i => i.status === "completed").length;
  const totalCount = items.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextInDomain = items.find(i => i.status === "in_progress" || i.status === "available");
  const hasNext = items.some(i => nextItem && i.id === nextItem.id);
  // C1: score demoted to small text
  const scoreDisplay = domainScore !== null && domainScore > 0
    ? `${(domainScore / 10).toFixed(1)} / 10`
    : null;

  return (
    // C2: subtle domain tint on card background
    <div className="rounded-2xl border border-border overflow-hidden"
      style={{ backgroundColor: bgColour, boxShadow: "var(--card-shadow)" }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full text-left p-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${colour}22` }}>
            <DomainIcon className="h-5 w-5" style={{ color: colour }} />
          </div>
          <div className="flex-1 min-w-0">
            {/* C3: no readiness badge — just domain name */}
            <h3 className="text-sm font-semibold text-foreground mb-2">{label}</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: colour }} />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                {totalCount === 0 ? "No gaps" : `${completedCount}/${totalCount}`}
              </span>
            </div>
            {/* C1: score shown small below progress */}
            {scoreDisplay && (
              <p className="text-[10px] text-muted-foreground mt-1">Score: {scoreDisplay}</p>
            )}
            {/* B2: connects-to initiative clickable link */}
            {connectsTo && onViewInitiative && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Connects to:{" "}
                <button
                  onClick={(e) => { e.stopPropagation(); onViewInitiative(connectsTo.initiativeId); }}
                  className="text-primary hover:underline font-medium">
                  {connectsTo.name}
                </button>
              </p>
            )}
          </div>
          <div className="flex-shrink-0 text-muted-foreground mt-1">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
        {!open && nextInDomain && (
          <div className="mt-3 flex items-center gap-2 pt-3 border-t border-border/30">
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
      {open && (
        <div className="px-5 pb-5 pt-3 border-t border-border/30 space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">
              No modules assigned for this domain.
            </p>
          ) : (
            items.map((item: any, i: number) => (
              <ModuleRow key={item.id} item={item} index={i}
                isNext={!!(nextItem && item.id === nextItem.id)}
                onStart={() => onStart(item)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Block B: Initiative card ───────────────────────────────────────────────────
function InitiativeCard({
  initiative, onViewModules,
}: {
  initiative: {
    id: string; initiativeId: string; name: string; category: string;
    phase: string; status: string; moduleCount: number; completedCount: number;
  };
  onViewModules: (initiativeId: string, initiativeName: string) => void;
}) {
  const pct = initiative.moduleCount > 0
    ? Math.round((initiative.completedCount / initiative.moduleCount) * 100)
    : 0;
  const statusColor = initiative.status === "in_progress"
    ? { color: "#C8B07A", bg: "#C8B07A18", label: "In progress" }
    : initiative.status === "completed"
    ? { color: "#047857", bg: "#04785718", label: "Completed" }
    : { color: "#888", bg: "#88888818", label: "Planned" };

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-card/60 hover:bg-card/80 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Flag className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium text-foreground leading-snug">{initiative.name}</p>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ color: statusColor.color, backgroundColor: statusColor.bg }}>
            {statusColor.label}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2">
          {initiative.category} · {initiative.phase}
        </p>
        {initiative.moduleCount > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1 rounded-full bg-muted/50 overflow-hidden">
              <div className="h-full rounded-full bg-primary/60 transition-all duration-500"
                style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
              {initiative.completedCount}/{initiative.moduleCount} modules
            </span>
          </div>
        )}
        {initiative.moduleCount > 0 ? (
          <button
            onClick={() => onViewModules(initiative.initiativeId, initiative.name)}
            className="text-[10px] font-semibold text-primary hover:underline">
            View linked modules →
          </button>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">
            No modules linked to this initiative yet
          </p>
        )}
      </div>
    </div>
  );
}

// ── Block D: Recent completion row ────────────────────────────────────────────
function CompletionRow({ completion }: {
  completion: {
    id: string; moduleId: string; completedAt: number | null;
    title: string; capability: string | null; durationMins: number | null;
    levelLabel: string | null; hasCoachingFeedback: boolean;
  };
}) {
  const colour = completion.capability
    ? (DOMAIN_COLOURS[completion.capability as keyof typeof DOMAIN_COLOURS] ?? "#888")
    : "#888";
  const DomainIcon = completion.capability
    ? (DOMAIN_ICONS[completion.capability] ?? BookOpen)
    : BookOpen;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${colour}18` }}>
        <DomainIcon className="h-3.5 w-3.5" style={{ color: colour }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{completion.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {completion.durationMins && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />{completion.durationMins} min
            </span>
          )}
          {completion.levelLabel && (() => {
            const phase = getLearningPhase(completion.levelLabel);
            return (
              <span className="text-[10px] font-semibold" style={{ color: phase.color }}>
                {phase.label}
              </span>
            );
          })()}
          {completion.hasCoachingFeedback && (
            <span className="text-[10px] text-primary flex items-center gap-0.5">
              <MessageCircle className="h-2.5 w-2.5" />Coaching
            </span>
          )}
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground flex-shrink-0">
        {relativeTime(completion.completedAt)}
      </span>
    </div>
  );
}

// ── Block D: Coaching conversation row ────────────────────────────────────────
function CoachingRow({ conv, onOpen }: {
  conv: {
    id: string; moduleId: string | null; moduleTitle: string;
    moduleCapability: string | null; messageCount: number;
    lastActiveAt: number | null; lastMessage: string | null;
  };
  onOpen: (id: string) => void;
}) {
  const colour = conv.moduleCapability
    ? (DOMAIN_COLOURS[conv.moduleCapability as keyof typeof DOMAIN_COLOURS] ?? "#888")
    : "#888";

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/30 last:border-0">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: `${colour}18` }}>
        <MessageCircle className="h-3.5 w-3.5" style={{ color: colour }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{conv.moduleTitle}</p>
        {conv.lastMessage && (
          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{conv.lastMessage}…</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">{conv.messageCount} messages</span>
          <span className="text-[10px] text-muted-foreground">·</span>
          <span className="text-[10px] text-muted-foreground">{relativeTime(conv.lastActiveAt)}</span>
        </div>
      </div>
      <button onClick={() => onOpen(conv.id)}
        className="text-[10px] font-semibold text-primary hover:underline flex-shrink-0 mt-1">
        View →
      </button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function LearningPlanPage() {
  const [, setLocation] = useLocation();
  const [initiativeFilter, setInitiativeFilter] = useState<{ id: string; name: string } | null>(null);

  const { data: plan, isLoading: planLoading } = trpc.adaptiveLearning.getAdaptivePlan.useQuery(
    {}, { staleTime: 1000 * 60 * 2 }
  );
  const { data: dashData, isLoading: dashLoading } = trpc.dashboardV2.individual.main.useQuery(
    undefined, { staleTime: 1000 * 60 * 5, retry: false }
  );
  const { data: dashboardCtx, isLoading: ctxLoading } = trpc.adaptiveLearning.getLearningDashboard.useQuery(
    undefined, { staleTime: 1000 * 60 * 3 }
  );
  // B1: getInFlightInitiatives query removed — Strategy Initiatives panel removed per cadence principle
  // B2: getModulesByInitiative retained for per-initiative filtered view (accessed from domain cards + strategy artefact)
  const { data: initiativeModules, isLoading: initiativeModulesLoading } = trpc.adaptiveLearning.getModulesByInitiative.useQuery(
    { initiativeId: initiativeFilter?.id ?? "" },
    { enabled: !!initiativeFilter?.id, staleTime: 1000 * 60 * 2 }
  );
  const { data: completionsData, isLoading: completionsLoading } = trpc.adaptiveLearning.getRecentCompletions.useQuery(
    undefined, { staleTime: 1000 * 60 * 3 }
  );
  const { data: coachingConvs, isLoading: coachingLoading } = trpc.adaptiveLearning.getActiveCoachingConversations.useQuery(
    undefined, { staleTime: 1000 * 60 * 3 }
  );

  const isLoading = planLoading || dashLoading || ctxLoading;

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

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    DOMAIN_KEYS.forEach(k => map.set(k, []));
    for (const item of items) {
      const cap = item.module?.capability ?? "unknown";
      if (!map.has(cap)) map.set(cap, []);
      map.get(cap)!.push(item);
    }
    return map;
  }, [items]);

  const allDomainKeys = useMemo(() => {
    const extra: string[] = [];
    grouped.forEach((_, k) => {
      if (!DOMAIN_KEYS.includes(k as any)) extra.push(k);
    });
    return [...DOMAIN_KEYS, ...extra];
  }, [grouped]);

  const domainMap = useMemo(() => {
    const map: Record<string, { score: number; rating: string }> = {};
    for (const d of (dashData?.domains ?? [])) map[d.key] = { score: d.score, rating: d.rating };
    return map;
  }, [dashData]);

  const firstName = dashboardCtx?.firstName ?? "";
  const greeting = getGreeting();
  const focusDomainLabel = dashboardCtx?.focusDomain
    ? (DOMAIN_LABELS[dashboardCtx.focusDomain as keyof typeof DOMAIN_LABELS] ?? dashboardCtx.focusDomain)
    : null;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // ── No plan state ─────────────────────────────────────────────────────────
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

  // ── Block B2: Initiative modules view ─────────────────────────────────────
  if (initiativeFilter) {
    const filteredItems: any[] = initiativeModules?.items ?? [];
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <button
          onClick={() => setInitiativeFilter(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className="h-4 w-4 rotate-90" />Back to Learning Plan
        </button>
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-card">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Flag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Initiative</p>
            <h2 className="text-base font-semibold text-foreground">{initiativeFilter.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Modules from your learning plan linked to this initiative
            </p>
          </div>
        </div>
        {initiativeModulesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              No modules in your plan are linked to this initiative.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item: any, i: number) => (
              <ModuleRow key={item.id} item={item} index={i}
                isNext={!!(nextItem && item.id === nextItem.id)}
                onStart={() => setLocation(`/learning/module/${item.moduleId}?planItemId=${item.id}`)} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Block A1+A3: Greeting + progress framing (amended per cadence principle v2) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
              <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="4"
                className="text-muted/30" />
              <circle cx="28" cy="28" r="22" fill="none" stroke="var(--primary)" strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
                className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-foreground tabular-nums">{pct}%</span>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {greeting}{firstName ? `, ${firstName}` : ""}
            </h1>
            {/* A1 line 2: module count + strategy-aligned framing */}
            <p className="text-sm text-muted-foreground mt-0.5">
              You&apos;re{" "}
              <span className="text-foreground font-medium">{completedCount} module{completedCount !== 1 ? "s" : ""}</span>{" "}
              into your strategy-aligned learning plan
              {totalItems > 0 && (
                <> — <span className="text-foreground font-medium">{totalItems} modules</span> curated from the full library based on your assessment and AI Strategy</>
              )}.
            </p>
            {/* A1 line 3: personalised current-focus sentence */}
            {focusDomainLabel && dashboardCtx?.strategyExists && dashboardCtx?.focusInitiative ? (
              <p className="text-xs text-muted-foreground mt-1">
                Your current focus is{" "}
                <span className="text-foreground font-medium">{focusDomainLabel}</span>
                {" "}(connects to your{" "}
                <span className="text-foreground font-medium">{dashboardCtx.focusInitiative.name}</span>
                {" "}initiative).{" "}
                <button
                  onClick={() => setLocation("/ai-strategy")}
                  className="text-primary hover:underline font-medium">
                  View full strategy →
                </button>
              </p>
            ) : focusDomainLabel && dashboardCtx?.strategyExists ? (
              <p className="text-xs text-muted-foreground mt-1">
                Your current focus is{" "}
                <span className="text-foreground font-medium">{focusDomainLabel}</span>.{" "}
                <button
                  onClick={() => setLocation("/ai-strategy")}
                  className="text-primary hover:underline font-medium">
                  View full strategy →
                </button>
              </p>
            ) : focusDomainLabel ? (
              // No strategy yet — generate CTA
              <p className="text-xs text-muted-foreground mt-1">
                Your current focus is{" "}
                <span className="text-foreground font-medium">{focusDomainLabel}</span>.{" "}
                <button
                  onClick={() => setLocation("/ai-strategy")}
                  className="text-primary hover:underline font-medium">
                  Generate your AI Strategy to see how these modules connect to specific initiatives in your function →
                </button>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Block A2: Continue Learning strip */}
      {nextItem && (
        <button
          className="w-full flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
          onClick={() => setLocation(`/learning/module/${nextItem.moduleId}?planItemId=${nextItem.id}`)}>
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Play className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">
              Continue Learning
            </p>
            <p className="text-sm font-semibold truncate">{nextItem.module?.title ?? "Next Module"}</p>
            {nextItem.module?.capability && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {DOMAIN_LABELS[nextItem.module.capability as keyof typeof DOMAIN_LABELS]
                  ?? nextItem.module.capability}
                {nextItem.module?.durationMins && ` · ${nextItem.module.durationMins} min`}
              </p>
            )}
          </div>
          <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" />
        </button>
      )}

      {/* Block B1: Strategy Initiatives dominant panel removed per cadence principle.
           Strategy context preserved via: (1) greeting A1 amendment, (2) connects-to on domain cards.
           See /docs/PLATFORM_PRINCIPLES.md — Cadence Principle. */}

      {/* Block C: Domain cards grid */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Capability Domains
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allDomainKeys.map(domainKey => {
            const capItems = grouped.get(domainKey) ?? [];
            const domain = domainMap[domainKey];
            return (
              <DomainCard key={domainKey} domainKey={domainKey} items={capItems}
                nextItem={nextItem} domainScore={domain?.score ?? null}
                onStart={(item) => setLocation(`/learning/module/${item.moduleId}?planItemId=${item.id}`)}
                connectsTo={dashboardCtx?.domainInitiativeMap?.[domainKey] ?? null}
                onViewInitiative={(id) => setLocation(`/learning/initiative/${id}`)} />
            );
          })}
        </div>
      </div>

      {/* Block D: Recent activity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* D1: Recent completions */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-border/40">
            <CheckCircle2 className="h-4 w-4 text-[#047857]" />
            <p className="text-xs font-bold text-foreground uppercase tracking-widest">
              Recent Completions
            </p>
            {!completionsLoading && (completionsData?.totalLast30Days ?? 0) > 0 && (
              <span className="ml-auto text-[10px] text-muted-foreground">
                {completionsData!.totalLast30Days} in 30 days
              </span>
            )}
          </div>
          <div className="px-5 py-2">
            {completionsLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : (completionsData?.completions?.length ?? 0) === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-muted-foreground">No completions in the last 30 days.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start a module above to begin your journey.
                </p>
              </div>
            ) : (
              completionsData!.completions.map(c => <CompletionRow key={c.id} completion={c} />)
            )}
          </div>
        </div>

        {/* D2: Coaching conversations */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-border/40">
            <MessageCircle className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-foreground uppercase tracking-widest">AI Coaching</p>
            {!coachingLoading && (coachingConvs?.length ?? 0) > 0 && (
              <span className="ml-auto text-[10px] text-muted-foreground">
                {coachingConvs!.length} conversation{coachingConvs!.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="px-5 py-2">
            {coachingLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : (coachingConvs?.length ?? 0) === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-muted-foreground">No coaching conversations yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete a module to unlock AI coaching feedback.
                </p>
              </div>
            ) : (
              coachingConvs!.map(conv => (
                <CoachingRow key={conv.id} conv={conv}
                  onOpen={(id) => setLocation(`/learning/coaching/${id}`)} />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
