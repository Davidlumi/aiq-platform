/**
 * v1.4 Change 5 — Domain Pathway View
 *
 * Route: /development/:domainId
 * Shows all levels in a domain with completion status, level gating, and expandable module lists.
 * Provides a clear "next recommended module" CTA.
 */
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Lock,
  CheckCircle2,
  Circle,
  PlayCircle,
  Clock,
  Target,
  Sparkles,
  BookOpen,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DOMAIN_META: Record<string, { label: string; color: string; description: string; icon: string }> = {
  ai_interaction: {
    label: "AI Interaction",
    color: "#3B82F6",
    description: "Craft effective prompts, manage AI conversations, and get consistent high-quality outputs.",
    icon: "💬",
  },
  ai_output_evaluation: {
    label: "AI Output Evaluation",
    color: "#8B5CF6",
    description: "Critically assess AI-generated content for accuracy, bias, and fitness for purpose.",
    icon: "🔍",
  },
  ai_workflow_design: {
    label: "AI Workflow Design",
    color: "#10B981",
    description: "Design and optimise HR workflows that integrate AI tools effectively.",
    icon: "⚙️",
  },
  ai_ethics_trust: {
    label: "AI Ethics & Trust",
    color: "#F59E0B",
    description: "Apply ethical frameworks to AI use in HR, manage risk, and build stakeholder trust.",
    icon: "⚖️",
  },
  workforce_ai_readiness: {
    label: "Workforce AI Readiness",
    color: "#EF4444",
    description: "Assess and develop your organisation's readiness to adopt and scale AI capabilities.",
    icon: "🏢",
  },
  ai_change_leadership: {
    label: "AI Change Leadership",
    color: "#EC4899",
    description: "Lead AI transformation initiatives, manage resistance, and build a culture of AI fluency.",
    icon: "🚀",
  },
};

const FORMAT_ICONS: Record<string, string> = {
  tutorial: "📖",
  practical: "🛠️",
  case_study: "📋",
  quiz: "❓",
  scenario: "🎭",
  video: "🎬",
  reflection: "🪞",
  coaching: "💡",
};

export default function DomainPathwayPage() {
  const [match, params] = useRoute("/development/:domainId");
  const [, setLocation] = useLocation();
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set([1]));

  const domainId = params?.domainId ?? "";
  const domainMeta = DOMAIN_META[domainId];

  const { data, isLoading, error } = trpc.adaptiveLearning.getDomainPathway.useQuery(
    { domainId },
    { enabled: !!domainId, staleTime: 1000 * 60 * 2 }
  );

  const toggleLevel = (level: number) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  if (!match || !domainMeta) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">Domain not found.</p>
          <Button variant="outline" onClick={() => setLocation("/learning")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Learning
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Back nav */}
        <button
          onClick={() => setLocation("/learning")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Learning Plan
        </button>

        {/* Domain header */}
        <div
          className="rounded-2xl border p-6"
          style={{ borderColor: `${domainMeta.color}30`, background: `${domainMeta.color}08` }}
        >
          <div className="flex items-start gap-4">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: `${domainMeta.color}20` }}
            >
              {domainMeta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground">{domainMeta.label}</h1>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{domainMeta.description}</p>

              {data && (
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{data.levels.reduce((s, l) => s + l.totalModules, 0)} modules</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{data.levels.reduce((s, l) => s + l.completionCount, 0)} completed</span>
                  </div>
                  {data.capabilityScore > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>Capability score: {Math.round(data.capabilityScore * 100)}%</span>
                    </div>
                  )}
                  {data.strategyContext && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: domainMeta.color }}>
                      <Target className="h-3.5 w-3.5" />
                      <span>{data.strategyContext.linkedInitiative}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Next recommended CTA */}
        {data?.nextRecommendedModule && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary mb-0.5">Recommended next</p>
              <p className="text-sm font-semibold text-foreground truncate">{data.nextRecommendedModule.title}</p>
              {data.nextRecommendedModule.durationMins && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {data.nextRecommendedModule.durationMins} min
                </p>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => setLocation(`/learning/module/${data.nextRecommendedModule!.id}`)}
              style={{ backgroundColor: domainMeta.color, color: "white" }}
              className="flex-shrink-0"
            >
              <PlayCircle className="h-4 w-4 mr-1.5" />
              Start
            </Button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">Failed to load pathway data. Please try again.</p>
          </div>
        )}

        {/* Level cards */}
        {data && (
          <div className="space-y-3">
            {data.levels.map(level => {
              const isExpanded = expandedLevels.has(level.level);
              const pct = level.totalModules > 0 ? (level.completionCount / level.totalModules) * 100 : 0;

              return (
                <div
                  key={level.id}
                  className={cn(
                    "rounded-xl border overflow-hidden transition-all",
                    level.locked
                      ? "border-border/50 bg-muted/10 opacity-60"
                      : level.complete
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : level.isCurrentLevel
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-card"
                  )}
                >
                  {/* Level header */}
                  <button
                    onClick={() => !level.locked && toggleLevel(level.level)}
                    disabled={level.locked}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-4 text-left",
                      !level.locked && "hover:bg-muted/10 transition-colors"
                    )}
                  >
                    {/* Status icon */}
                    <div className="flex-shrink-0">
                      {level.locked ? (
                        <Lock className="h-5 w-5 text-muted-foreground/50" />
                      ) : level.complete ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : level.isCurrentLevel ? (
                        <PlayCircle className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/40" />
                      )}
                    </div>

                    {/* Level info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{level.name}</span>
                        {level.isCurrentLevel && !level.complete && (
                          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-primary/30">
                            Active
                          </Badge>
                        )}
                        {level.complete && (
                          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/20 dark:text-emerald-400 text-emerald-600 border-emerald-500/30">
                            Complete
                          </Badge>
                        )}
                        {level.locked && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground/60">
                            Locked
                          </Badge>
                        )}
                      </div>
                      {!level.locked && (
                        <div className="flex items-center gap-3 mt-1.5">
                          <Progress value={pct} className="h-1.5 flex-1 max-w-40" />
                          <span className="text-xs text-muted-foreground">
                            {level.completionCount}/{level.totalModules} modules
                          </span>
                        </div>
                      )}
                      {level.locked && level.lockReason && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{level.lockReason}</p>
                      )}
                    </div>

                    {/* Expand toggle */}
                    {!level.locked && (
                      <div className="flex-shrink-0">
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        }
                      </div>
                    )}
                  </button>

                  {/* Module list */}
                  {isExpanded && !level.locked && (
                    <div className="border-t border-border/50 divide-y divide-border/30">
                      {level.modules.map(mod => (
                        <button
                          key={mod.id}
                          onClick={() => setLocation(`/learning/module/${mod.id}`)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/10 transition-colors group"
                        >
                          {/* Completion status */}
                          <div className="flex-shrink-0">
                            {mod.completed
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              : <Circle className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                            }
                          </div>

                          {/* Module info */}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium truncate",
                              mod.completed ? "text-muted-foreground line-through" : "text-foreground"
                            )}>
                              {mod.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {mod.format && (
                                <span className="text-xs text-muted-foreground/70">
                                  {FORMAT_ICONS[mod.format] ?? "📄"} {mod.format.replace("_", " ")}
                                </span>
                              )}
                              {mod.durationMins && (
                                <span className="text-xs text-muted-foreground/70">
                                  · {mod.durationMins} min
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Arrow */}
                          <ChevronDown className="h-4 w-4 text-muted-foreground/40 -rotate-90 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
