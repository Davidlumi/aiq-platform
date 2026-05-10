/**
 * InitiativeModulesPage — /learning/initiative/:initiativeId
 *
 * Shows the subset of the user's adaptive learning plan that is linked to a
 * specific strategy initiative.  Accessible from:
 *   1. Domain card "Connects to: [initiative]" clickable link
 *   2. Strategy artefact Section 3 per-initiative "See modules →" link
 *
 * Per cadence principle (docs/PLATFORM_PRINCIPLES.md): this is the bridge
 * surface between the quarterly strategy artefact and the weekly learning
 * dashboard.  It is intentionally lightweight — no new panel on /learning.
 */
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Video, FileText, MessageSquare, HelpCircle, Brain,
  Target, Layers, Clock, CheckCircle2, Lock, Play, Flag, ArrowLeft,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DOMAIN_LABELS } from "../../../../shared/dashboard";

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
  return { label: "Leading", color: "#047857", bg: "#04785718" };
}

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
          {mod.capability && (
            <span className="text-[10px] text-muted-foreground">
              {DOMAIN_LABELS[mod.capability as keyof typeof DOMAIN_LABELS] ?? mod.capability}
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

export default function InitiativeModulesPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ initiativeId: string }>();
  const initiativeId = params.initiativeId ?? "";

  const { data, isLoading } = trpc.adaptiveLearning.getModulesByInitiative.useQuery(
    { initiativeId },
    { enabled: !!initiativeId, staleTime: 1000 * 60 * 2 }
  );

  const items: any[] = data?.items ?? [];
  const nextItem = items.find(i => i.status === "in_progress" || i.status === "available");
  const completedCount = items.filter(i => i.status === "completed").length;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Back navigation */}
      <button
        onClick={() => setLocation("/learning")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />Back to Learning Plan
      </button>

      {/* Initiative header */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-card">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Flag className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">
            Strategy Initiative
          </p>
          {isLoading ? (
            <Skeleton className="h-5 w-48 mb-1" />
          ) : (
            <h2 className="text-base font-semibold text-foreground">
              {data?.initiativeName ?? "Initiative"}
            </h2>
          )}
          {!isLoading && items.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedCount} of {items.length} module{items.length !== 1 ? "s" : ""} completed
              {" "}· Modules from your learning plan linked to this initiative
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation("/ai-strategy")}
          className="flex-shrink-0 gap-1.5 text-xs">
          <ChevronDown className="h-3 w-3 -rotate-90" />
          View full strategy
        </Button>
      </div>

      {/* Module list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No modules linked yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              No modules in your current learning plan are linked to this initiative.
              As your plan evolves, linked modules will appear here.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLocation("/learning")}>
            Back to Learning Plan
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any, i: number) => (
            <ModuleRow
              key={item.id}
              item={item}
              index={i}
              isNext={!!(nextItem && item.id === nextItem.id)}
              onStart={() => setLocation(`/learning/module/${item.moduleId}?planItemId=${item.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
