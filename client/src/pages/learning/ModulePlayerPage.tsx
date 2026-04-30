/**
 * Module Player Page - AiQ Adaptive Learning Engine
 *
 * Renders all 8 modality types with rich, best-in-class content rendering:
 *   tutorial   - structured lesson with sections, key points, worked example, quiz
 *   practical  - step-by-step exercise with workspace and success criteria
 *   case_study - narrative scenario with decision points and analysis
 *   quiz       - multiple-choice questions with explanations and scoring
 *   scenario   - branching decision scenario with outcomes
 *   video      - video with transcript and reflection
 *   reflection - guided journalling prompts with coaching guidance
 *   coaching   - structured coaching framework (GROW model)
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import { ModulePlayerSkeleton } from "@/components/ui/loading";
import { toast } from "sonner";
import {
  ArrowLeft, BookOpen, Zap, FileText, HelpCircle, Layers,
  Video, MessageSquare, Users, Clock, CheckCircle2, ChevronRight,
  ChevronLeft, Target, Brain, Lightbulb, BarChart3, Star,
  AlertCircle, ThumbsUp, RefreshCw, Sparkles, BookMarked,
  ListChecks, FlaskConical, Quote, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Progress Tracking -------------------------------------------------------

/** A named step in the module progress bar */
export interface ProgressStep {
  id: string;
  label: string;
  sublabel?: string;
}

/**
 * Builds the ordered list of named steps for a given modality + body.
 * Steps map to the phases/sections a learner moves through.
 */
function buildProgressSteps(modality: string, body: any): ProgressStep[] {
  const sections: any[] = body?.conceptSections ?? body?.sections ?? [];
  const quizQuestions: any[] = body?.quizQuestions ?? body?.questions ?? [];
  const framework = body?.coachingFramework;
  const frameworkPhases: any[] = framework?.phases ?? [];
  const rawPrompts: any[] = body?.reflectionPrompts ?? body?.coachingQuestions ?? [];
  const steps: any[] = body?.practicalExercise?.steps ?? body?.steps ?? [];

  switch (modality) {
    case "tutorial": {
      const base: ProgressStep[] = [{ id: "intro", label: "Overview" }];
      sections.forEach((s, i) => {
        const full = s?.heading ?? `Section ${i + 1}`;
        const words = full.split(' ');
        const short = words.length > 3 ? words.slice(0, 3).join(' ') + '…' : full;
        base.push({ id: `section_${i}`, label: short, sublabel: "Learn" });
      });
      if (quizQuestions.length > 0) base.push({ id: "quiz", label: "Knowledge Check" });
      return base;
    }
    case "quiz": {
      const base: ProgressStep[] = [{ id: "intro", label: "Overview" }];
      quizQuestions.forEach((_, i) => base.push({ id: `q_${i}`, label: `Q${i + 1}`, sublabel: "Question" }));
      return base;
    }
    case "practical": {
      const base: ProgressStep[] = [{ id: "intro", label: "Overview" }];
      const practSteps = body?.practicalExercise?.steps ?? body?.steps ?? sections.map((_: any, i: number) => ({ stepNumber: i + 1 }));
      practSteps.forEach((_: any, i: number) => base.push({ id: `step_${i}`, label: `Step ${i + 1}`, sublabel: "Exercise" }));
      return base;
    }
    case "case_study": {
      const choices: any[] = body?.decisionScenario?.choices ?? body?.choices ?? [];
      const base: ProgressStep[] = [
        { id: "intro", label: "Overview" },
        { id: "case", label: "The Case" },
      ];
      if (choices.length > 0) base.push({ id: "decision", label: "Decision" });
      base.push({ id: "insights", label: "Insights" });
      return base;
    }
    case "scenario": {
      return [
        { id: "intro", label: "Context" },
        { id: "situation", label: "Scenario" },
        { id: "decision", label: "Decide" },
        { id: "outcome", label: "Outcome" },
      ];
    }
    case "reflection": {
      const base: ProgressStep[] = [{ id: "intro", label: "Overview" }];
      rawPrompts.forEach((_, i) => base.push({ id: `prompt_${i}`, label: `Prompt ${i + 1}`, sublabel: "Reflect" }));
      return base;
    }
    case "coaching": {
      const base: ProgressStep[] = [{ id: "intro", label: "Overview" }];
      if (frameworkPhases.length > 0) {
        frameworkPhases.forEach((fp: any, i: number) => {
          const phaseLabel = fp?.phase ?? `Phase ${i + 1}`;
          const words = phaseLabel.split(' ');
          const short = words.length > 3 ? words.slice(0, 3).join(' ') + '…' : phaseLabel;
          base.push({ id: `phase_${i}`, label: short, sublabel: "Coaching" });
        });
      }
      rawPrompts.forEach((_, i) => base.push({ id: `reflect_${i}`, label: `Reflection ${i + 1}` }));
      return base;
    }
    case "video": {
      const base: ProgressStep[] = [{ id: "watch", label: "Watch" }];
      const vidPrompts: any[] = body?.reflectionPrompts ?? [];
      if (vidPrompts.length > 0) {
        vidPrompts.forEach((_, i) => base.push({ id: `reflect_${i}`, label: `Reflect ${i + 1}` }));
      } else {
        base.push({ id: "reflect", label: "Reflect" });
      }
      return base;
    }
    default:
      return [{ id: "intro", label: "Overview" }, { id: "content", label: "Content" }];
  }
}

/**
 * Persists progress step index to localStorage keyed by moduleId.
 * Returns [currentStepIdx, setCurrentStepIdx].
 */
function useModuleProgress(moduleId: string, totalSteps: number): [number, (idx: number) => void] {
  const key = `aiq_module_progress_${moduleId}`;
  const [stepIdx, setStepIdx] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < totalSteps) return parsed;
      }
    } catch {}
    return 0;
  });

  const setAndPersist = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, totalSteps - 1));
    setStepIdx(clamped);
    try { localStorage.setItem(key, String(clamped)); } catch {}
  }, [key, totalSteps]);

  return [stepIdx, setAndPersist];
}

/** The sticky progress bar rendered above the module content card */
function ModuleProgressBar({
  steps, currentStepIdx, completed,
}: {
  steps: ProgressStep[];
  currentStepIdx: number;
  completed: boolean;
}) {
  const total = steps.length;
  const pct = completed ? 100 : total <= 1 ? 0 : Math.round((currentStepIdx / (total - 1)) * 100);

  return (
    <div className="rounded-xl border border-border bg-card px-4 pt-3.5 pb-3 space-y-2.5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {completed ? "Module Complete" : "Your Progress"}
        </span>
        <span className="text-xs font-bold tabular-nums" style={{ color: completed ? "#4A6E5E" : "var(--primary)" }}>
          {pct}%
        </span>
      </div>

      {/* Smooth fill bar */}
      <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: completed
              ? "#4A6E5E"
              : "linear-gradient(90deg, var(--primary) 0%, color-mix(in oklch, var(--primary) 80%, transparent) 100%)",
          }}
        />
      </div>

      {/* Step indicators */}
      {total > 1 && (
        <div className="flex items-start gap-0.5 overflow-x-auto pt-1 pb-1 scrollbar-none">
          {steps.map((step, i) => {
            const isDone = completed || i < currentStepIdx;
            const isCurrent = !completed && i === currentStepIdx;
            return (
              <div key={step.id} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                  isDone ? "bg-primary" : isCurrent ? "bg-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-card" : "bg-muted"
                )}>
                  {isDone ? (
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  ) : (
                    <span className={cn("text-xs font-bold", isCurrent ? "text-primary" : "text-muted-foreground")}>
                      {i + 1}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-xs text-center leading-tight max-w-[52px] truncate",
                  isCurrent ? "text-foreground font-semibold" : isDone ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Constants ----------------------------------------------------------------

const CAPABILITY_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ai_interaction:       { label: "AI Interaction",         color: "#4477AA", icon: Zap },
  ai_output_evaluation: { label: "AI Output Evaluation",   color: "#047857", icon: Brain },
  ai_ethics_trust:      { label: "AI Ethics & Trust",      color: "#b91c1c", icon: Target },
  ai_change_leadership: { label: "AI Change Leadership",   color: "#EE8866", icon: Lightbulb },
  ai_workflow_design:   { label: "AI Workflow Design",     color: "#047857", icon: Layers },
  workflow:             { label: "Workflow Integration",   color: "#047857", icon: Layers },
  data_interpretation:  { label: "Data Interpretation",    color: "#BBBBBB", icon: BarChart3 },
  appropriateness:      { label: "AI Appropriateness",     color: "#047857", icon: Target },
  execution:            { label: "AI Execution",           color: "#DC2626", icon: Zap },
  judgement:            { label: "AI Judgement",           color: "#b91c1c", icon: Brain },
  governance:           { label: "AI Governance",          color: "#66CCEE", icon: ListChecks },
  workforce_ai_readiness: { label: "Workforce AI Readiness", color: "#D97706", icon: Users },
};

const MODALITY_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  tutorial:   { label: "Tutorial",   color: "#4477AA", icon: BookOpen },
  practical:  { label: "Practical",  color: "#047857", icon: FlaskConical },
  case_study: { label: "Case Study", color: "#D97706", icon: FileText },
  quiz:       { label: "Quiz",       color: "#b91c1c", icon: HelpCircle },
  scenario:   { label: "Scenario",   color: "#EE8866", icon: Layers },
  video:      { label: "Video",      color: "#DC2626", icon: Video },
  reflection: { label: "Reflection", color: "#66CCEE", icon: MessageSquare },
  coaching:   { label: "Coaching",   color: "#047857", icon: Users },
};

// --- Shared sub-components ----------------------------------------------------

function IntroductionPanel({ intro }: { intro: any }) {
  if (!intro) return null;
  return (
    <div className="space-y-4">
      {intro.hook && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-sm leading-relaxed font-medium text-foreground">{intro.hook}</p>
        </div>
      )}
      {intro.whyItMatters && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border">
          <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Why This Matters</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{intro.whyItMatters}</p>
          </div>
        </div>
      )}
      {intro.learningObjectives && intro.learningObjectives.length > 0 && (
        <div className="p-4 rounded-xl bg-muted/20 border border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Learning Objectives</p>
          <ul className="space-y-2">
            {intro.learningObjectives.map((obj: string, i: number) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground/80">{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ConceptSection({ section, index, total }: { section: any; index: number; total: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Section {index + 1} of {total}
        </span>
      </div>
      <h3 className="text-lg font-bold text-foreground">{section.heading}</h3>
      {section.body && (
        <div className="space-y-3">
          {String(section.body).split("\n\n").map((para: string, i: number) => (
            <p key={i} className="text-sm leading-relaxed text-foreground/80">{para}</p>
          ))}
        </div>
      )}
      {section.keyPoints && section.keyPoints.length > 0 && (
        <div className="p-4 rounded-xl bg-muted border border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Key Points</p>
          <ul className="space-y-2">
            {section.keyPoints.map((kp: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span className="text-foreground/80">{kp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {section.example && (
        <div className="p-4 rounded-xl bg-muted border-l-4 border-primary/60">
          <p className="text-xs font-semibold text-primary mb-1.5">Real-World Example</p>
          <p className="text-sm text-foreground/80 leading-relaxed">{section.example}</p>
        </div>
      )}
      {section.researchNote && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/20 border border-border">
          <Quote className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground italic leading-relaxed">{section.researchNote}</p>
        </div>
      )}
    </div>
  );
}

function WorkedExamplePanel({ example }: { example: any }) {
  if (!example) return null;
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-[#C8B07A]/30 bg-[#C8B07A]/5 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2.5">
          <BookMarked className="h-4 w-4 text-[#8E7848]" />
          <div>
            <p className="text-xs font-semibold text-[#8E7848] uppercase tracking-widest">Worked Example</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{example.title}</p>
          </div>
        </div>
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-90")} />
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[#C8B07A]/20">
          <div className="pt-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">The Scenario</p>
            {String(example.scenario ?? "").split("\n\n").map((p: string, i: number) => (
              <p key={i} className="text-sm leading-relaxed text-foreground/80">{p}</p>
            ))}
          </div>
          {example.analysis && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Expert Analysis</p>
              {String(example.analysis).split("\n\n").map((p: string, i: number) => (
                <p key={i} className="text-sm leading-relaxed text-foreground/80">{p}</p>
              ))}
            </div>
          )}
          {example.outcome && (
            <div className="p-3 rounded-lg bg-[#7A9E8E]/10 border border-[#7A9E8E]/20">
              <p className="text-xs font-semibold text-[#4A6E5E] mb-1">Outcome</p>
              <p className="text-sm text-foreground/80">{example.outcome}</p>
            </div>
          )}
          {example.lessonLearned && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs font-semibold text-primary mb-1">Lesson Learned</p>
              <p className="text-sm text-foreground/80 font-medium">{example.lessonLearned}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KeyTakeawaysPanel({ takeaways }: { takeaways: string[] }) {
  if (!takeaways || takeaways.length === 0) return null;
  return (
    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
      <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Key Takeaways</p>
      <ul className="space-y-2.5">
        {takeaways.map((t: string, i: number) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <Star className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-foreground/80 font-medium">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FurtherReadingPanel({ items }: { items: any[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="p-4 rounded-xl bg-muted/40 border border-border">
      <div className="flex items-center gap-2 mb-3">
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Further Reading</p>
      </div>
      <ul className="space-y-3">
        {items.map((item: any, i: number) => (
          <li key={i} className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.author} · {item.source} · {item.year}</p>
            {item.relevance && <p className="text-xs text-muted-foreground italic">{item.relevance}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Tutorial Renderer --------------------------------------------------------

function TutorialRenderer({ body, onComplete, onProgressChange }: { body: any; onComplete: (score: number) => void; onProgressChange?: (stepIdx: number) => void }) {
  const [phase, setPhase] = useState<"intro" | "learn" | "quiz">("intro");
  const [sectionIdx, setSectionIdx] = useState(0);
  const [quizIdx, setQuizIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [scores, setScores] = useState<boolean[]>([]);

  // New rich schema
  const intro = body?.introduction;
  const sections: any[] = body?.conceptSections ?? body?.sections ?? [];
  const workedExample = body?.workedExample;
  const keyTakeaways: string[] = body?.keyTakeaways ?? body?.keyPoints ?? [];
  const furtherReading: any[] = body?.furtherReading ?? [];
  const quizQuestions: any[] = body?.quizQuestions ?? body?.questions ?? [];

  // Normalise legacy sections
  const normalisedSections = sections.map((s: any) => ({
    heading: s?.heading ?? s?.title ?? "Content",
    body: s?.body ?? s?.content ?? "",
    keyPoints: s?.keyPoints ?? s?.tips ?? [],
    example: s?.example ?? (s?.examples?.[0]?.scenario ?? s?.examples?.[0] ?? null),
    researchNote: s?.researchNote ?? null,
  }));

  const currentSection = normalisedSections[sectionIdx];
  const isLastSection = sectionIdx === normalisedSections.length - 1;
  const hasQuiz = quizQuestions.length > 0;

  // Quiz state
  const currentQ = quizQuestions[quizIdx];
  const isLastQ = quizIdx === quizQuestions.length - 1;
  const correctIdx: number = typeof currentQ?.correctIndex === "number" ? currentQ.correctIndex : 0;
  const isCorrect = answered && selectedIdx === correctIdx;

  const handleAnswer = (idx: number) => {
    if (answered) return;
    setSelectedIdx(idx);
    setAnswered(true);
    setScores(s => [...s, idx === correctIdx]);
  };

  const handleNextQ = () => {
    if (isLastQ) {
      const correct = scores.filter(Boolean).length;
      const score = Math.round((correct / quizQuestions.length) * 100);
      onComplete(score);
    } else {
      setQuizIdx(i => i + 1);
      setSelectedIdx(null);
      setAnswered(false);
    }
  };

  // Report progress changes
  useEffect(() => {
    if (!onProgressChange) return;
    if (phase === "intro") { onProgressChange(0); return; }
    if (phase === "learn") { onProgressChange(1 + sectionIdx); return; }
    if (phase === "quiz") { onProgressChange(1 + normalisedSections.length + quizIdx); return; }
  }, [phase, sectionIdx, quizIdx, onProgressChange, normalisedSections.length]);

  if (normalisedSections.length === 0 && !intro) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-muted border border-border">
          <p className="text-sm text-muted-foreground">Module content is being prepared. Check back soon.</p>
        </div>
        <Button onClick={() => onComplete(80)} className="w-full gap-2">
          <CheckCircle2 className="h-4 w-4" />Mark Complete
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Phase tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted border border-border/50">
        {([
          { id: "intro", label: "Overview" },
          { id: "learn", label: "Learn" },
          ...(hasQuiz ? [{ id: "quiz", label: "Check" }] : []),
        ] as const).map(tab => (
          <button
            key={tab.id}
            className={cn("flex-1 py-1.5 px-2 rounded-lg text-xs font-medium capitalize transition-all",
              phase === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
            onClick={() => setPhase(tab.id as any)}>
            {tab.label}
          </button>
        ))}
      </div>

      {phase === "intro" && (
        <div className="space-y-5">
          <IntroductionPanel intro={intro} />
          {normalisedSections.length > 0 && (
            <div className="p-3 rounded-xl bg-muted border border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-2">In this module</p>
              <ul className="space-y-1">
                {normalisedSections.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    {s.heading}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button className="w-full gap-1.5" onClick={() => setPhase("learn")}>
            Start Learning<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === "learn" && (
        <div className="space-y-6">
          {/* Section progress */}
          <div className="flex items-center gap-1.5">
            {normalisedSections.map((_, i) => (
              <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all",
                i < sectionIdx ? "bg-primary" : i === sectionIdx ? "bg-primary/60" : "bg-muted")} />
            ))}
          </div>

          {currentSection && (
            <ConceptSection section={currentSection} index={sectionIdx} total={normalisedSections.length} />
          )}

          {/* Worked example on last section */}
          {isLastSection && workedExample && (
            <WorkedExamplePanel example={workedExample} />
          )}

          {/* Key takeaways on last section */}
          {isLastSection && <KeyTakeawaysPanel takeaways={keyTakeaways} />}

          {/* Further reading on last section */}
          {isLastSection && <FurtherReadingPanel items={furtherReading} />}

          {/* Navigation */}
          <div className="flex gap-3">
            {sectionIdx > 0 && (
              <Button variant="outline" onClick={() => setSectionIdx(i => i - 1)} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" />Previous
              </Button>
            )}
            {!isLastSection && (
              <Button className="flex-1 gap-1.5" onClick={() => setSectionIdx(i => i + 1)}>
                Next Section<ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {isLastSection && hasQuiz && (
              <Button className="flex-1 gap-1.5" onClick={() => setPhase("quiz")}>
                Knowledge Check<ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {isLastSection && !hasQuiz && (
              <Button className="flex-1 gap-1.5" onClick={() => onComplete(85)}>
                <CheckCircle2 className="h-4 w-4" />Complete Module
              </Button>
            )}
          </div>
        </div>
      )}

      {phase === "quiz" && hasQuiz && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Knowledge Check</p>
            <span className="text-xs text-muted-foreground ml-auto">{quizIdx + 1} / {quizQuestions.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {quizQuestions.map((_, i) => (
              <div key={i} className={cn("h-1.5 flex-1 rounded-full",
                i < quizIdx ? (scores[i] ? "bg-primary" : "bg-[#b45309]") : i === quizIdx ? "bg-primary/60" : "bg-muted")} />
            ))}
          </div>
          <div className="p-4 rounded-xl bg-muted border border-border">
            <p className="font-semibold text-sm leading-relaxed">{currentQ?.question}</p>
          </div>
          <div className="space-y-2">
            {(currentQ?.options ?? []).map((opt: string, i: number) => (
              <button key={i}
                className={cn("w-full text-left p-3.5 rounded-xl border text-sm transition-all",
                  !answered && "hover:border-primary/50 hover:bg-muted/20",
                  answered && i === correctIdx && "border-[#7A9E8E]/60 bg-[#7A9E8E]/10 text-[#4A6E5E]",
                  answered && i === selectedIdx && i !== correctIdx && "border-[#b45309]/60 bg-[#b45309]/10 text-[#8E5848]",
                  !answered && "border-border bg-card")}
                onClick={() => handleAnswer(i)}>
                <div className="flex items-start gap-2.5">
                  <span className={cn("w-5 h-5 rounded-full border text-xs flex items-center justify-center flex-shrink-0 mt-0.5",
                    answered && i === correctIdx ? "border-[#7A9E8E] bg-[#7A9E8E] text-white" :
                    answered && i === selectedIdx && i !== correctIdx ? "border-[#b45309] bg-[#b45309] text-white" :
                    "border-muted-foreground text-muted-foreground")}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt}</span>
                </div>
              </button>
            ))}
          </div>
          {answered && currentQ?.explanation && (
            <div className={cn("p-4 rounded-xl border text-sm",
              isCorrect ? "bg-[#7A9E8E]/10 border-[#7A9E8E]/30 text-[#4A6E5E]" : "bg-[#C8B07A]/10 border-[#C8B07A]/30 text-[#8E7848]")}>
              <div className="flex items-start gap-2">
                {isCorrect ? <ThumbsUp className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className="font-semibold mb-1">{isCorrect ? "Correct!" : "Not quite"}</p>
                  <p className="text-xs opacity-90">{currentQ.explanation}</p>
                </div>
              </div>
            </div>
          )}
          {answered && (
            <Button className="w-full gap-1.5" onClick={handleNextQ}>
              {isLastQ ? <><CheckCircle2 className="h-4 w-4" />See Results</> : <>Next Question<ChevronRight className="h-4 w-4" /></>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// --- Quiz Renderer ------------------------------------------------------------

function QuizRenderer({ body, onComplete, onProgressChange }: { body: any; onComplete: (score: number) => void; onProgressChange?: (stepIdx: number) => void }) {
  const [phase, setPhase] = useState<"intro" | "questions">("intro");
  const [qIdx, setQIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [scores, setScores] = useState<boolean[]>([]);

  const intro = body?.introduction;
  const sections: any[] = body?.conceptSections ?? body?.sections ?? [];
  const questions: any[] = body?.quizQuestions ?? body?.questions ?? [];
  const keyTakeaways: string[] = body?.keyTakeaways ?? [];

  const q = questions[qIdx];
  const isLast = qIdx === questions.length - 1;
  const correctIdx: number = typeof q?.correctIndex === "number" ? q.correctIndex : 0;
  const isCorrect = answered && selectedIdx === correctIdx;

  const handleAnswer = (idx: number) => {
    if (answered) return;
    setSelectedIdx(idx);
    setAnswered(true);
    setScores(s => [...s, idx === correctIdx]);
  };

  const handleNext = () => {
    if (isLast) {
      const correct = scores.filter(Boolean).length;
      onComplete(Math.round((correct / questions.length) * 100));
    } else {
      setQIdx(i => i + 1);
      setSelectedIdx(null);
      setAnswered(false);
    }
  };

  useEffect(() => {
    if (!onProgressChange) return;
    if (phase === "intro") { onProgressChange(0); return; }
    onProgressChange(1 + qIdx);
  }, [phase, qIdx, onProgressChange]);

  if (questions.length === 0) {
    return (
      <div className="space-y-5">
        {sections.map((s: any, i: number) => (
          <div key={i} className="space-y-2">
            <h3 className="font-semibold text-sm">{s.heading ?? s.title}</h3>
            <p className="text-sm leading-relaxed text-foreground/80">{s.body ?? s.content}</p>
          </div>
        ))}
        <KeyTakeawaysPanel takeaways={keyTakeaways} />
        <Button className="w-full gap-1.5" onClick={() => onComplete(80)}>
          <CheckCircle2 className="h-4 w-4" />Complete Knowledge Check
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {phase === "intro" && (
        <div className="space-y-5">
          <IntroductionPanel intro={intro} />
          {sections.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Pre-reading</p>
              {sections.map((s: any, i: number) => (
                <div key={i} className="space-y-2">
                  <h3 className="font-semibold text-sm">{s.heading ?? s.title}</h3>
                  <p className="text-sm leading-relaxed text-foreground/80">{s.body ?? s.content}</p>
                  {(s.keyPoints ?? []).map((kp: string, j: number) => (
                    <div key={j} className="flex items-start gap-2 text-xs text-muted-foreground ml-3">
                      <span className="text-primary mt-0.5">›</span><span>{kp}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          <Button className="w-full gap-1.5" onClick={() => setPhase("questions")}>
            Start Quiz ({questions.length} questions)<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === "questions" && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Question {qIdx + 1} of {questions.length}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {questions.map((_, i) => (
              <div key={i} className={cn("h-1.5 flex-1 rounded-full",
                i < qIdx ? (scores[i] ? "bg-primary" : "bg-[#b45309]") : i === qIdx ? "bg-primary/60" : "bg-muted")} />
            ))}
          </div>
          <div className="p-4 rounded-xl bg-muted border border-border">
            <p className="font-semibold text-sm leading-relaxed">{q?.question}</p>
          </div>
          <div className="space-y-2">
            {(q?.options ?? []).map((opt: string, i: number) => (
              <button key={i}
                className={cn("w-full text-left p-3.5 rounded-xl border text-sm transition-all",
                  !answered && "hover:border-primary/50 hover:bg-muted/20",
                  answered && i === correctIdx && "border-[#7A9E8E]/60 bg-[#7A9E8E]/10 text-[#4A6E5E]",
                  answered && i === selectedIdx && i !== correctIdx && "border-[#b45309]/60 bg-[#b45309]/10 text-[#8E5848]",
                  !answered && "border-border bg-card")}
                onClick={() => handleAnswer(i)}>
                <div className="flex items-start gap-2.5">
                  <span className={cn("w-5 h-5 rounded-full border text-xs flex items-center justify-center flex-shrink-0 mt-0.5",
                    answered && i === correctIdx ? "border-[#7A9E8E] bg-[#7A9E8E] text-white" :
                    answered && i === selectedIdx && i !== correctIdx ? "border-[#b45309] bg-[#b45309] text-white" :
                    "border-muted-foreground text-muted-foreground")}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt}</span>
                </div>
              </button>
            ))}
          </div>
          {answered && q?.explanation && (
            <div className={cn("p-4 rounded-xl border text-sm",
              isCorrect ? "bg-[#7A9E8E]/10 border-[#7A9E8E]/30 text-[#4A6E5E]" : "bg-[#C8B07A]/10 border-[#C8B07A]/30 text-[#8E7848]")}>
              <div className="flex items-start gap-2">
                {isCorrect ? <ThumbsUp className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className="font-semibold mb-1">{isCorrect ? "Correct!" : "Not quite"}</p>
                  <p className="text-xs opacity-90">{q.explanation}</p>
                </div>
              </div>
            </div>
          )}
          {answered && (
            <Button className="w-full gap-1.5" onClick={handleNext}>
              {isLast ? <><CheckCircle2 className="h-4 w-4" />See Results</> : <>Next Question<ChevronRight className="h-4 w-4" /></>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// --- Practical Renderer -------------------------------------------------------

function PracticalRenderer({ body, onComplete, onProgressChange }: { body: any; onComplete: (score: number) => void; onProgressChange?: (stepIdx: number) => void }) {
  const [phase, setPhase] = useState<"intro" | "exercise">("intro");
  const [stepIdx, setStepIdx] = useState(0);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [stepsDone, setStepsDone] = useState<Set<number>>(new Set());

  const intro = body?.introduction;
  const sections: any[] = body?.conceptSections ?? body?.sections ?? [];
  const exercise = body?.practicalExercise;
  const keyTakeaways: string[] = body?.keyTakeaways ?? [];

  // Support both new schema (practicalExercise.steps) and legacy schema (body.steps / body.sections)
  const steps: any[] = exercise?.steps ?? body?.steps ?? sections.map((s: any, i: number) => ({
    stepNumber: i + 1,
    instruction: s?.body ?? s?.content ?? s?.instruction ?? "",
    tip: (s?.tips ?? [])[0] ?? s?.tip ?? null,
    title: s?.heading ?? s?.title ?? `Step ${i + 1}`,
  }));

  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  const handleStepComplete = () => {
    setStepsDone(s => { const next = new Set(s); next.add(stepIdx); return next; });
    if (!isLast) {
      setStepIdx(i => i + 1);
    } else {
      onComplete(90);
    }
  };

  useEffect(() => {
    if (!onProgressChange) return;
    if (phase === "intro") { onProgressChange(0); return; }
    onProgressChange(1 + stepIdx);
  }, [phase, stepIdx, onProgressChange]);

  return (
    <div className="space-y-6">
      {phase === "intro" && (
        <div className="space-y-5">
          <IntroductionPanel intro={intro} />
          {sections.length > 0 && !exercise && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Background</p>
              {sections.map((s: any, i: number) => (
                <div key={i} className="space-y-2">
                  <h3 className="font-semibold text-sm">{s.heading ?? s.title}</h3>
                  <p className="text-sm leading-relaxed text-foreground/80">{s.body ?? s.content}</p>
                </div>
              ))}
            </div>
          )}
          {exercise && (
            <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Exercise</p>
              <p className="text-sm font-semibold">{exercise.title}</p>
              {exercise.context && <p className="text-sm text-foreground/80">{exercise.context}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">{steps.length} steps</span>
                {exercise.successCriteria && (
                  <span className="text-xs text-muted-foreground">· {exercise.successCriteria.length} success criteria</span>
                )}
              </div>
            </div>
          )}
          <Button className="w-full gap-1.5" onClick={() => setPhase("exercise")}>
            Start Exercise<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === "exercise" && (
        <div className="space-y-5">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div key={i} className={cn("h-1.5 flex-1 rounded-full",
                stepsDone.has(i) ? "bg-primary" : i === stepIdx ? "bg-primary/60" : "bg-muted")} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Step {stepIdx + 1} of {steps.length}</p>

          {step && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                  {step.stepNumber ?? stepIdx + 1}
                </div>
                <div className="flex-1">
                  {step.title && step.title !== `Step ${stepIdx + 1}` && (
                    <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                  )}
                  <p className="text-sm leading-relaxed text-foreground/80">{step.instruction}</p>
                </div>
              </div>

              {step.tip && (
                <div className="p-3 rounded-xl bg-[#C8B07A]/10 border border-[#C8B07A]/30">
                  <p className="text-xs font-semibold text-[#8E7848] mb-1">Expert Tip</p>
                  <p className="text-xs text-foreground/80">{step.tip}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Your Response</p>
                <textarea
                  className="w-full min-h-[120px] p-3 rounded-xl border border-border bg-muted text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Type your response here…"
                  value={responses[stepIdx] ?? ""}
                  onChange={e => setResponses(r => ({ ...r, [stepIdx]: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Success criteria on last step */}
          {isLast && exercise?.successCriteria && exercise.successCriteria.length > 0 && (
            <div className="p-4 rounded-xl bg-[#7A9E8E]/10 border border-[#7A9E8E]/30">
              <p className="text-xs font-semibold text-[#4A6E5E] mb-2">Success Criteria</p>
              <ul className="space-y-1.5">
                {exercise.successCriteria.map((c: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#4A6E5E] mt-0.5 flex-shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isLast && exercise?.commonMistakes && exercise.commonMistakes.length > 0 && (
            <div className="p-4 rounded-xl bg-[#C8B07A]/10 border border-[#C8B07A]/30">
              <p className="text-xs font-semibold text-[#8E7848] mb-2">Common Mistakes to Avoid</p>
              <ul className="space-y-1.5">
                {exercise.commonMistakes.map((m: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                    <AlertCircle className="h-3.5 w-3.5 text-[#8E7848] mt-0.5 flex-shrink-0" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isLast && <KeyTakeawaysPanel takeaways={keyTakeaways} />}

          <div className="flex gap-3">
            {stepIdx > 0 && (
              <Button variant="outline" onClick={() => setStepIdx(i => i - 1)} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" />Back
              </Button>
            )}
            <Button className="flex-1 gap-1.5" onClick={handleStepComplete}
              disabled={(responses[stepIdx] ?? "").trim().length < 10}>
              {isLast ? <><CheckCircle2 className="h-4 w-4" />Complete Practical</> : <>Next Step<ChevronRight className="h-4 w-4" /></>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Case Study Renderer ------------------------------------------------------

function CaseStudyRenderer({ body, onComplete, onProgressChange }: { body: any; onComplete: (score: number) => void; onProgressChange?: (stepIdx: number) => void }) {
  const [phase, setPhase] = useState<"intro" | "case" | "decision" | "insights">("intro");
  const [chosen, setChosen] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const intro = body?.introduction;
  const sections: any[] = body?.conceptSections ?? body?.sections ?? [];
  const scenario = body?.decisionScenario;
  const workedExample = body?.workedExample;
  const keyTakeaways: string[] = body?.keyTakeaways ?? [];
  const furtherReading: any[] = body?.furtherReading ?? [];

  // Legacy case study support
  const legacyNarrative = body?.narrative ?? body?.overview;
  const legacyQuestions: any[] = body?.analysisQuestions ?? body?.questions ?? [];
  const allAnswered = legacyQuestions.every((_, i) => (answers[i] ?? "").trim().length > 20);

  const choices: any[] = scenario?.choices ?? body?.choices ?? body?.decisionPoints ?? [];
  const choice = chosen !== null ? choices[chosen] : null;

  const casePhaseOrder = ["intro", "case", ...(choices.length > 0 ? ["decision"] : []), "insights"];

  useEffect(() => {
    if (!onProgressChange) return;
    onProgressChange(casePhaseOrder.indexOf(phase));
  }, [phase, onProgressChange]);

  return (
    <div className="space-y-6">
      {/* Phase tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted border border-border/50">
        {(["intro", "case", ...(choices.length > 0 ? ["decision"] : []), "insights"] as const).map(p => (
          <button key={p} className={cn("flex-1 py-1.5 px-2 rounded-lg text-xs font-medium capitalize transition-all",
            phase === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
            onClick={() => setPhase(p as any)}>
            {p === "intro" ? "Overview" : p === "case" ? "Case" : p === "decision" ? "Decision" : "Insights"}
          </button>
        ))}
      </div>

      {phase === "intro" && (
        <div className="space-y-5">
          <IntroductionPanel intro={intro} />
          {sections.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Context</p>
              {sections.map((s: any, i: number) => (
                <div key={i} className="space-y-2">
                  <h3 className="font-semibold text-sm">{s.heading ?? s.title}</h3>
                  <p className="text-sm leading-relaxed text-foreground/80">{s.body ?? s.content}</p>
                </div>
              ))}
            </div>
          )}
          <Button className="w-full gap-1.5" onClick={() => setPhase("case")}>
            Read the Case<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === "case" && (
        <div className="space-y-5">
          {scenario && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">The Situation</h3>
              {String(scenario.situation ?? "").split("\n\n").map((p: string, i: number) => (
                <p key={i} className="text-sm leading-relaxed text-foreground/80">{p}</p>
              ))}
              {scenario.yourRole && (
                <div className="p-4 rounded-xl bg-muted/20 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Your Role</p>
                  <p className="text-sm">{scenario.yourRole}</p>
                </div>
              )}
              {scenario.stakeholders && (
                <div className="p-3 rounded-xl bg-muted border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Key Stakeholders</p>
                  <p className="text-sm text-foreground/80">{scenario.stakeholders}</p>
                </div>
              )}
            </div>
          )}
          {!scenario && legacyNarrative && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">The Case</h3>
              {String(legacyNarrative).split("\n\n").map((p: string, i: number) => (
                <p key={i} className="text-sm leading-relaxed text-foreground/80">{p}</p>
              ))}
            </div>
          )}
          {workedExample && !scenario && (
            <WorkedExamplePanel example={workedExample} />
          )}
          {legacyQuestions.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Analysis Questions</h3>
              {legacyQuestions.map((q: any, i: number) => (
                <div key={i} className="space-y-2">
                  <p className="text-sm font-medium">{i + 1}. {q.question ?? q}</p>
                  <textarea
                    className="w-full min-h-[100px] p-3 rounded-xl border border-border bg-muted text-sm resize-none focus:outline-none focus:border-primary/50"
                    placeholder="Your analysis…"
                    value={answers[i] ?? ""}
                    onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}
          <Button className="w-full gap-1.5"
            disabled={legacyQuestions.length > 0 && !allAnswered}
            onClick={() => setPhase(choices.length > 0 ? "decision" : "insights")}>
            {choices.length > 0 ? <>Make Your Decision<ChevronRight className="h-4 w-4" /></> : <>View Insights<ChevronRight className="h-4 w-4" /></>}
          </Button>
        </div>
      )}

      {phase === "decision" && choices.length > 0 && (
        <div className="space-y-5">
          {scenario?.decisionQuestion && (
            <div className="p-4 rounded-xl bg-muted/20 border border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Decision Point</p>
              <p className="text-sm font-semibold">{scenario.decisionQuestion}</p>
            </div>
          )}
          <div className="space-y-2">
            {choices.map((c: any, i: number) => (
              <button key={i}
                className={cn("w-full text-left p-4 rounded-xl border text-sm transition-all",
                  chosen === i ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40")}
                onClick={() => setChosen(i)}>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full border border-muted-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{c.text ?? c.option ?? c}</span>
                </div>
              </button>
            ))}
          </div>
          {choice && (
            <div className={cn("p-4 rounded-xl border",
              choice.isOptimal ? "bg-[#7A9E8E]/10 border-[#7A9E8E]/30" : "bg-[#C8B07A]/10 border-[#C8B07A]/30")}>
              <p className={cn("text-xs font-semibold mb-1.5", choice.isOptimal ? "text-[#4A6E5E]" : "text-[#8E7848]")}>
                {choice.isOptimal ? "Strong Choice" : "Consider This"}
              </p>
              <p className="text-sm">{choice.outcome ?? choice.feedback}</p>
              {choice.reasoning && (
                <p className="text-xs text-muted-foreground mt-2 italic">{choice.reasoning}</p>
              )}
            </div>
          )}
          {scenario?.bestPractice && chosen !== null && (
            <div className="p-4 rounded-xl bg-muted border border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Best Practice</p>
              <p className="text-sm">{scenario.bestPractice}</p>
            </div>
          )}
          <Button className="w-full gap-1.5" disabled={chosen === null} onClick={() => setPhase("insights")}>
            View Insights<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === "insights" && (
        <div className="space-y-5">
          {workedExample && scenario && <WorkedExamplePanel example={workedExample} />}
          <KeyTakeawaysPanel takeaways={keyTakeaways} />
          <FurtherReadingPanel items={furtherReading} />
          <Button className="w-full gap-1.5" onClick={() => onComplete(choice?.isOptimal ? 90 : chosen !== null ? 75 : 80)}>
            <CheckCircle2 className="h-4 w-4" />Complete Case Study
          </Button>
        </div>
      )}
    </div>
  );
}

// --- Scenario Renderer --------------------------------------------------------

function ScenarioRenderer({ body, onComplete, onProgressChange }: { body: any; onComplete: (score: number) => void; onProgressChange?: (stepIdx: number) => void }) {
  const [phase, setPhase] = useState<"intro" | "situation" | "decision" | "outcome">("intro");
  const [chosen, setChosen] = useState<number | null>(null);

  const intro = body?.introduction;
  const sections: any[] = body?.conceptSections ?? body?.sections ?? [];
  const scenario = body?.decisionScenario;
  const keyTakeaways: string[] = body?.keyTakeaways ?? [];
  const furtherReading: any[] = body?.furtherReading ?? [];

  // Legacy scenario support
  const legacySituation = body?.situation ?? body?.overview;
  const legacyChoices: any[] = body?.choices ?? body?.decisionPoints ?? [];
  const choices: any[] = scenario?.choices ?? legacyChoices;
  const choice = chosen !== null ? choices[chosen] : null;

  const scenarioPhaseOrder = ["intro", "situation", "decision", "outcome"];

  useEffect(() => {
    if (!onProgressChange) return;
    onProgressChange(scenarioPhaseOrder.indexOf(phase));
  }, [phase, onProgressChange]);

  return (
    <div className="space-y-6">
      {/* Phase tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted border border-border/50">
        {(["intro", "situation", "decision", "outcome"] as const).map(p => (
          <button key={p} className={cn("flex-1 py-1.5 px-2 rounded-lg text-xs font-medium capitalize transition-all",
            phase === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
            onClick={() => setPhase(p)}>
            {p === "intro" ? "Context" : p === "situation" ? "Scenario" : p === "decision" ? "Decide" : "Outcome"}
          </button>
        ))}
      </div>

      {phase === "intro" && (
        <div className="space-y-5">
          <IntroductionPanel intro={intro} />
          {sections.length > 0 && (
            <div className="space-y-4">
              {sections.map((s: any, i: number) => (
                <div key={i} className="space-y-2">
                  <h3 className="font-semibold text-sm">{s.heading ?? s.title}</h3>
                  <p className="text-sm leading-relaxed text-foreground/80">{s.body ?? s.content}</p>
                </div>
              ))}
            </div>
          )}
          <Button className="w-full gap-1.5" onClick={() => setPhase("situation")}>
            Enter Scenario<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === "situation" && (
        <div className="space-y-5">
          {(scenario?.situation || legacySituation) && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">The Situation</h3>
              {String(scenario?.situation ?? legacySituation ?? "").split("\n\n").map((p: string, i: number) => (
                <p key={i} className="text-sm leading-relaxed text-foreground/80">{p}</p>
              ))}
            </div>
          )}
          {(scenario?.yourRole ?? body?.yourRole) && (
            <div className="p-4 rounded-xl bg-muted/20 border border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Your Role</p>
              <p className="text-sm">{scenario?.yourRole ?? body?.yourRole}</p>
            </div>
          )}
          {scenario?.stakeholders && (
            <div className="p-3 rounded-xl bg-muted border border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Key Stakeholders</p>
              <p className="text-sm text-foreground/80">{scenario.stakeholders}</p>
            </div>
          )}
          <Button className="w-full gap-1.5" onClick={() => setPhase("decision")}>
            Make Your Decision<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === "decision" && (
        <div className="space-y-5">
          {(scenario?.decisionQuestion ?? body?.decisionQuestion) && (
            <div className="p-4 rounded-xl bg-muted/20 border border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Decision Point</p>
              <p className="text-sm font-semibold">{scenario?.decisionQuestion ?? body?.decisionQuestion}</p>
            </div>
          )}
          <div className="space-y-2">
            {choices.map((c: any, i: number) => (
              <button key={i}
                className={cn("w-full text-left p-4 rounded-xl border text-sm transition-all",
                  chosen === i ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40")}
                onClick={() => setChosen(i)}>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full border border-muted-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{c.text ?? c.option ?? c}</span>
                </div>
              </button>
            ))}
          </div>
          <Button className="w-full gap-1.5" disabled={chosen === null} onClick={() => setPhase("outcome")}>
            See Outcome<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === "outcome" && (
        <div className="space-y-5">
          {choice && (
            <div className={cn("p-4 rounded-xl border",
              choice.isOptimal ? "bg-[#7A9E8E]/10 border-[#7A9E8E]/30" : "bg-[#C8B07A]/10 border-[#C8B07A]/30")}>
              <p className={cn("text-xs font-semibold mb-1.5", choice.isOptimal ? "text-[#4A6E5E]" : "text-[#8E7848]")}>
                {choice.isOptimal ? "Strong Choice" : "Consider This"}
              </p>
              <p className="text-sm">{choice.outcome ?? choice.feedback}</p>
              {choice.reasoning && (
                <p className="text-xs text-muted-foreground mt-2 italic">{choice.reasoning}</p>
              )}
            </div>
          )}
          {(scenario?.bestPractice ?? body?.bestPractice) && (
            <div className="p-4 rounded-xl bg-muted border border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Best Practice</p>
              <p className="text-sm">{scenario?.bestPractice ?? body?.bestPractice}</p>
            </div>
          )}
          <KeyTakeawaysPanel takeaways={keyTakeaways} />
          <FurtherReadingPanel items={furtherReading} />
          <Button className="w-full gap-1.5" onClick={() => onComplete(choice?.isOptimal ? 90 : 70)}>
            <CheckCircle2 className="h-4 w-4" />Complete Scenario
          </Button>
        </div>
      )}
    </div>
  );
}

// --- Reflection Renderer ------------------------------------------------------

function ReflectionRenderer({ body, onComplete, onProgressChange }: { body: any; onComplete: (score: number) => void; onProgressChange?: (stepIdx: number) => void }) {
  const [phase, setPhase] = useState<"intro" | "reflect">("intro");
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [promptIdx, setPromptIdx] = useState(0);

  const intro = body?.introduction;
  const sections: any[] = body?.conceptSections ?? body?.sections ?? [];

  // New schema: reflectionPrompts is array of {prompt, guidance}
  // Legacy schema: reflectionPrompts is array of strings
  const rawPrompts: any[] = body?.reflectionPrompts ?? body?.prompts ?? [];
  const prompts = rawPrompts.map((p: any) =>
    typeof p === "string" ? { prompt: p, guidance: null } : p
  );

  const currentPrompt = prompts[promptIdx];
  const isLast = promptIdx === prompts.length - 1;
  const allAnswered = prompts.every((_, i) => (responses[i] ?? "").trim().length > 30);

  useEffect(() => {
    if (!onProgressChange) return;
    if (phase === "intro") { onProgressChange(0); return; }
    onProgressChange(1 + promptIdx);
  }, [phase, promptIdx, onProgressChange]);

  return (
    <div className="space-y-6">
      {phase === "intro" && (
        <div className="space-y-5">
          <IntroductionPanel intro={intro} />
          {sections.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Priming Your Thinking</p>
              {sections.map((s: any, i: number) => (
                <div key={i} className="space-y-2">
                  <h3 className="font-semibold text-sm">{s.heading ?? s.title}</h3>
                  <p className="text-sm leading-relaxed text-foreground/80">{s.body ?? s.content}</p>
                </div>
              ))}
            </div>
          )}
          {prompts.length > 0 && (
            <div className="p-3 rounded-xl bg-muted/20 border border-border">
              <p className="text-xs text-muted-foreground">{prompts.length} reflection prompts · Take your time with each one</p>
            </div>
          )}
          <Button className="w-full gap-1.5" onClick={() => setPhase("reflect")}>
            Begin Reflection<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === "reflect" && (
        <div className="space-y-5">
          <div className="flex items-center gap-1.5">
            {prompts.map((_, i) => (
              <div key={i} className={cn("h-1.5 flex-1 rounded-full",
                (responses[i] ?? "").trim().length > 30 ? "bg-primary" : i === promptIdx ? "bg-primary/60" : "bg-muted")} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Prompt {promptIdx + 1} of {prompts.length}</p>

          {currentPrompt && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                  {promptIdx + 1}
                </span>
                <p className="text-sm font-semibold leading-relaxed">{currentPrompt.prompt}</p>
              </div>
              {currentPrompt.guidance && (
                <div className="ml-8 p-3 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-muted-foreground italic">{currentPrompt.guidance}</p>
                </div>
              )}
              <textarea
                className="w-full min-h-[140px] p-3 rounded-xl border border-border bg-muted text-sm resize-none focus:outline-none focus:border-primary/50"
                placeholder="Reflect here - there are no right or wrong answers…"
                value={responses[promptIdx] ?? ""}
                onChange={e => setResponses(r => ({ ...r, [promptIdx]: e.target.value }))}
              />
            </div>
          )}

          <div className="flex gap-3">
            {promptIdx > 0 && (
              <Button variant="outline" onClick={() => setPromptIdx(i => i - 1)} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" />Back
              </Button>
            )}
            {!isLast && (
              <Button className="flex-1 gap-1.5"
                disabled={(responses[promptIdx] ?? "").trim().length < 30}
                onClick={() => setPromptIdx(i => i + 1)}>
                Next Prompt<ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {isLast && (
              <Button className="flex-1 gap-1.5"
                disabled={(responses[promptIdx] ?? "").trim().length < 30}
                onClick={() => onComplete(90)}>
                <CheckCircle2 className="h-4 w-4" />Complete Reflection
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Coaching Renderer --------------------------------------------------------

function CoachingRenderer({ body, onComplete, onProgressChange }: { body: any; onComplete: (score: number) => void; onProgressChange?: (stepIdx: number) => void }) {
  const [phase, setPhase] = useState<"intro" | "framework" | "questions">("intro");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});

  const intro = body?.introduction;
  const sections: any[] = body?.conceptSections ?? body?.sections ?? [];
  const framework = body?.coachingFramework;
  const keyTakeaways: string[] = body?.keyTakeaways ?? [];

  // New schema: reflectionPrompts as array of {prompt, guidance}
  // Legacy schema: coachingQuestions as string array
  const rawPrompts: any[] = body?.reflectionPrompts ?? body?.coachingQuestions ?? body?.questions ?? [];
  const prompts = rawPrompts.map((p: any) =>
    typeof p === "string" ? { prompt: p, guidance: null } : p
  );

  const currentPrompt = prompts[questionIdx];
  const isLastQ = questionIdx === prompts.length - 1;
  const allAnswered = prompts.every((_, i) => (responses[`q_${i}`] ?? "").trim().length > 20);

  // If we have a coaching framework, use phase-based navigation
  const frameworkPhases: any[] = framework?.phases ?? [];
  const currentFrameworkPhase = frameworkPhases[phaseIdx];
  const isLastPhase = phaseIdx === frameworkPhases.length - 1;

  useEffect(() => {
    if (!onProgressChange) return;
    if (phase === "intro") { onProgressChange(0); return; }
    if (phase === "framework") { onProgressChange(1 + phaseIdx); return; }
    // questions phase: after all framework phases
    onProgressChange(1 + frameworkPhases.length + questionIdx);
  }, [phase, phaseIdx, questionIdx, onProgressChange, frameworkPhases.length]);

  return (
    <div className="space-y-6">
      {phase === "intro" && (
        <div className="space-y-5">
          <IntroductionPanel intro={intro} />
          {sections.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Coaching Context</p>
              {sections.map((s: any, i: number) => (
                <div key={i} className="space-y-2">
                  <h3 className="font-semibold text-sm">{s.heading ?? s.title}</h3>
                  <p className="text-sm leading-relaxed text-foreground/80">{s.body ?? s.content}</p>
                </div>
              ))}
            </div>
          )}
          {framework && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs font-semibold text-primary mb-2">Coaching Framework: {framework.model}</p>
              <div className="flex gap-2 flex-wrap">
                {frameworkPhases.map((fp: any, i: number) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {fp.phase}
                  </span>
                ))}
              </div>
            </div>
          )}
          <Button className="w-full gap-1.5" onClick={() => setPhase(frameworkPhases.length > 0 ? "framework" : "questions")}>
            Begin Coaching<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === "framework" && frameworkPhases.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center gap-1.5">
            {frameworkPhases.map((_, i) => (
              <div key={i} className={cn("h-1.5 flex-1 rounded-full",
                i < phaseIdx ? "bg-primary" : i === phaseIdx ? "bg-primary/60" : "bg-muted")} />
            ))}
          </div>
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">
              {framework.model} - {currentFrameworkPhase?.phase}
            </p>
            <p className="text-sm text-foreground/80">{currentFrameworkPhase?.purpose}</p>
          </div>
          {currentFrameworkPhase?.questions && (
            <div className="space-y-3">
              {currentFrameworkPhase.questions.map((q: string, i: number) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Users className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{q}</p>
                  </div>
                  <textarea
                    className="w-full min-h-[100px] p-3 rounded-xl border border-border bg-muted text-sm resize-none focus:outline-none focus:border-primary/50"
                    placeholder="Your response…"
                    value={responses[`p${phaseIdx}_q${i}`] ?? ""}
                    onChange={e => setResponses(r => ({ ...r, [`p${phaseIdx}_q${i}`]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            {phaseIdx > 0 && (
              <Button variant="outline" onClick={() => setPhaseIdx(i => i - 1)} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" />Back
              </Button>
            )}
            {!isLastPhase && (
              <Button className="flex-1 gap-1.5" onClick={() => setPhaseIdx(i => i + 1)}>
                Next Phase<ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {isLastPhase && (
              <Button className="flex-1 gap-1.5" onClick={() => prompts.length > 0 ? setPhase("questions") : onComplete(90)}>
                {prompts.length > 0 ? <>Reflection Prompts<ChevronRight className="h-4 w-4" /></> : <><CheckCircle2 className="h-4 w-4" />Complete Coaching</>}
              </Button>
            )}
          </div>
        </div>
      )}

      {phase === "questions" && prompts.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center gap-1.5">
            {prompts.map((_, i) => (
              <div key={i} className={cn("h-1.5 flex-1 rounded-full",
                (responses[`q_${i}`] ?? "").trim().length > 20 ? "bg-primary" : i === questionIdx ? "bg-primary/60" : "bg-muted")} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Reflection {questionIdx + 1} of {prompts.length}</p>

          {currentPrompt && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Users className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold leading-relaxed">{currentPrompt.prompt}</p>
              </div>
              {currentPrompt.guidance && (
                <div className="ml-6 p-3 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-muted-foreground italic">{currentPrompt.guidance}</p>
                </div>
              )}
              <textarea
                className="w-full min-h-[140px] p-3 rounded-xl border border-border bg-muted text-sm resize-none focus:outline-none focus:border-primary/50"
                placeholder="Your response…"
                value={responses[`q_${questionIdx}`] ?? ""}
                onChange={e => setResponses(r => ({ ...r, [`q_${questionIdx}`]: e.target.value }))}
              />
            </div>
          )}

          <div className="flex gap-3">
            {questionIdx > 0 && (
              <Button variant="outline" onClick={() => setQuestionIdx(i => i - 1)} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" />Back
              </Button>
            )}
            {!isLastQ && (
              <Button className="flex-1 gap-1.5"
                disabled={(responses[`q_${questionIdx}`] ?? "").trim().length < 20}
                onClick={() => setQuestionIdx(i => i + 1)}>
                Next<ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {isLastQ && (
              <Button className="flex-1 gap-1.5"
                disabled={(responses[`q_${questionIdx}`] ?? "").trim().length < 20}
                onClick={() => onComplete(90)}>
                <CheckCircle2 className="h-4 w-4" />Complete Coaching
              </Button>
            )}
          </div>
          <KeyTakeawaysPanel takeaways={keyTakeaways} />
        </div>
      )}
    </div>
  );
}

// --- Video Renderer -----------------------------------------------------------

function VideoRenderer({ body, onComplete, onProgressChange }: { body: any; onComplete: (score: number) => void; onProgressChange?: (stepIdx: number) => void }) {
  const [phase, setPhase] = useState<"watch" | "reflect">("watch");
  const [watched, setWatched] = useState(false);
  const [reflectionIdx, setReflectionIdx] = useState(0);
  const [responses, setResponses] = useState<Record<number, string>>({});

  const intro = body?.introduction;
  const sections: any[] = body?.conceptSections ?? body?.sections ?? [];
  const workedExample = body?.workedExample;
  const keyTakeaways: string[] = body?.keyTakeaways ?? [];
  const furtherReading: any[] = body?.furtherReading ?? [];

  const rawPrompts: any[] = body?.reflectionPrompts ?? [];
  const prompts = rawPrompts.map((p: any) =>
    typeof p === "string" ? { prompt: p, guidance: null } : p
  );

  const currentPrompt = prompts[reflectionIdx];
  const isLastPrompt = reflectionIdx === prompts.length - 1;

  useEffect(() => {
    if (!onProgressChange) return;
    if (phase === "watch") { onProgressChange(0); return; }
    onProgressChange(1 + reflectionIdx);
  }, [phase, reflectionIdx, onProgressChange]);

  return (
    <div className="space-y-6">
      {phase === "watch" && (
        <div className="space-y-5">
          {/* Video placeholder */}
          <div className="rounded-xl overflow-hidden bg-muted border border-border aspect-video flex items-center justify-center">
            {body?.videoUrl ? (
              <iframe src={body.videoUrl} className="w-full h-full" allowFullScreen onLoad={() => setWatched(true)} />
            ) : (
              <div className="text-center p-8">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium text-foreground mb-1">Video Content</p>
                <p className="text-xs text-muted-foreground mb-4">
                  {intro?.hook ?? body?.videoDescription ?? "Watch this module then complete the reflection below."}
                </p>
                <Button variant="outline" size="sm" onClick={() => setWatched(true)}>
                  Mark as Watched
                </Button>
              </div>
            )}
          </div>

          {/* Learning objectives */}
          {intro?.learningObjectives && intro.learningObjectives.length > 0 && (
            <div className="p-4 rounded-xl bg-muted/20 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Learning Objectives</p>
              <ul className="space-y-1.5">
                {intro.learningObjectives.map((obj: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-foreground/80">{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Transcript / reading content */}
          {sections.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                Reading Notes
              </summary>
              <div className="mt-3 space-y-4">
                {sections.map((s: any, i: number) => (
                  <div key={i} className="space-y-2 pl-4 border-l-2 border-border">
                    <h4 className="font-semibold text-sm">{s.heading ?? s.title}</h4>
                    <p className="text-sm leading-relaxed text-foreground/80">{s.body ?? s.content}</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          {workedExample && <WorkedExamplePanel example={workedExample} />}

          {watched && (
            <Button className="w-full gap-1.5" onClick={() => setPhase("reflect")}>
              Continue to Reflection<ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {phase === "reflect" && (
        <div className="space-y-5">
          {prompts.length > 0 ? (
            <>
              <div className="flex items-center gap-1.5">
                {prompts.map((_, i) => (
                  <div key={i} className={cn("h-1.5 flex-1 rounded-full",
                    (responses[i] ?? "").trim().length > 30 ? "bg-primary" : i === reflectionIdx ? "bg-primary/60" : "bg-muted")} />
                ))}
              </div>
              {currentPrompt && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">{currentPrompt.prompt}</p>
                  {currentPrompt.guidance && (
                    <p className="text-xs text-muted-foreground italic">{currentPrompt.guidance}</p>
                  )}
                  <textarea
                    className="w-full min-h-[120px] p-3 rounded-xl border border-border bg-muted text-sm resize-none focus:outline-none focus:border-primary/50"
                    placeholder="Your reflection…"
                    value={responses[reflectionIdx] ?? ""}
                    onChange={e => setResponses(r => ({ ...r, [reflectionIdx]: e.target.value }))}
                  />
                </div>
              )}
              <div className="flex gap-3">
                {reflectionIdx > 0 && (
                  <Button variant="outline" onClick={() => setReflectionIdx(i => i - 1)} className="gap-1.5">
                    <ChevronLeft className="h-4 w-4" />Back
                  </Button>
                )}
                {!isLastPrompt && (
                  <Button className="flex-1 gap-1.5"
                    disabled={(responses[reflectionIdx] ?? "").trim().length < 30}
                    onClick={() => setReflectionIdx(i => i + 1)}>
                    Next<ChevronRight className="h-4 w-4" />
                  </Button>
                )}
                {isLastPrompt && (
                  <Button className="flex-1 gap-1.5"
                    disabled={(responses[reflectionIdx] ?? "").trim().length < 30}
                    onClick={() => onComplete(80)}>
                    <CheckCircle2 className="h-4 w-4" />Complete Module
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">Reflection</p>
              <p className="text-sm text-muted-foreground">{body?.reflectionPrompt ?? "What was your key takeaway? How will you apply it?"}</p>
              <textarea
                className="w-full min-h-[120px] p-3 rounded-xl border border-border bg-muted text-sm resize-none focus:outline-none focus:border-primary/50"
                placeholder="Your reflection…"
                value={responses[0] ?? ""}
                onChange={e => setResponses(r => ({ ...r, [0]: e.target.value }))}
              />
              <Button className="w-full gap-1.5" disabled={(responses[0] ?? "").trim().length < 20} onClick={() => onComplete(80)}>
                <CheckCircle2 className="h-4 w-4" />Complete Module
              </Button>
            </>
          )}
          <KeyTakeawaysPanel takeaways={keyTakeaways} />
          <FurtherReadingPanel items={furtherReading} />
        </div>
      )}
    </div>
  );
}

// --- Completion Screen --------------------------------------------------------

function CompletionScreen({
  score, title, capability, moduleId, onContinue, onReportNoTransfer, noTransferResult,
  masteryGateResult, onRetake,
}: {
  score: number;
  title: string;
  capability: string;
  moduleId: string;
  onContinue: () => void;
  onReportNoTransfer?: (reason: "no_engagement" | "partial_engagement" | "completed_no_change" | "regression") => void;
  noTransferResult?: { alternativeTitle: string | null; alternativeModality: string | null; message: string } | null;
  masteryGateResult?: { blocked: boolean; message: string | null; threshold: number; score: number } | null;
  onRetake?: () => void;
}) {
  const [showNoTransferPrompt, setShowNoTransferPrompt] = useState(false);
  const [, setLocation] = useLocation();
  const { data: nextModule } = trpc.adaptiveLearning.getNextModuleSuggestion.useQuery(
    { completedModuleId: moduleId, capability },
    { enabled: !!moduleId, staleTime: 0 }
  );
  const cap = CAPABILITY_META[capability] ?? { label: capability, color: "#888", icon: BookOpen };
  const CapIcon = cap.icon;
  const isGateBlocked = masteryGateResult?.blocked ?? false;
  const xpEarned = score >= 80 ? 100 : score >= 60 ? 70 : 40;
  const reviewDays = score >= 80 ? 7 : score >= 60 ? 3 : 1;

  return (
    <div className="py-6 space-y-5 max-w-lg mx-auto">
      {/* Hero completion banner */}
      <div className="text-center space-y-3">
        <div className={cn(
          "w-20 h-20 rounded-full border-2 flex items-center justify-center mx-auto",
          isGateBlocked ? "bg-[#C8B07A]/15 border-[#C8B07A]/30" : "bg-[#7A9E8E]/15 border-[#7A9E8E]/30"
        )}>
          {isGateBlocked
            ? <AlertCircle className="h-10 w-10 text-[#C8B07A]" />
            : <CheckCircle2 className="h-10 w-10 text-[#7A9E8E]" />
          }
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-1">
            {isGateBlocked ? "Mastery Gate - Retake Required" : "Module Complete!"}
          </h2>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </div>

      {/* Mastery Gate Blocked Banner */}
      {isGateBlocked && masteryGateResult && (
        <div className="rounded-xl border border-[#C8B07A]/30 bg-[#C8B07A]/10 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#8E7848]" />
            <span className="text-sm font-semibold text-[#8E7848]">Below Mastery Threshold</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{masteryGateResult.message}</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${masteryGateResult.score}%`, background: masteryGateResult.score >= masteryGateResult.threshold ? "#7A9E8E" : "#C8B07A" }} />
            </div>
            <span className="text-xs font-semibold text-[#8E7848]">{masteryGateResult.score}%</span>
            <span className="text-xs text-muted-foreground">/ {masteryGateResult.threshold}% required</span>
          </div>
          {onRetake && (
            <Button size="sm" className="w-full gap-1.5 bg-[#C8B07A] hover:bg-[#B89A6A] text-white" onClick={onRetake}>
              <RefreshCw className="h-3.5 w-3.5" />Retake Module
            </Button>
          )}
        </div>
      )}

      {/* Score + XP + review row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-muted p-3 text-center">
          <p className="text-2xl font-bold text-[#7A9E8E]">{score}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Score</p>
        </div>
        <div className="rounded-xl border border-border bg-muted p-3 text-center">
          <p className="text-2xl font-bold text-[#C8B07A]">+{xpEarned}</p>
          <p className="text-xs text-muted-foreground mt-0.5">XP earned</p>
        </div>
        <div className="rounded-xl border border-border bg-muted p-3 text-center">
          <p className="text-2xl font-bold text-primary">{reviewDays}d</p>
          <p className="text-xs text-muted-foreground mt-0.5">Next review</p>
        </div>
      </div>

      {/* Capability context */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cap.color}20` }}>
          <CapIcon className="h-4 w-4" style={{ color: cap.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Capability domain</p>
          <p className="text-sm font-medium truncate">{cap.label}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Spaced repetition</p>
          <p className="text-xs font-medium text-[#7A9E8E]">Scheduled ✓</p>
        </div>
      </div>

      {/* Next module suggestion */}
      {nextModule && (
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Up next in your plan</p>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ChevronRight className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug">{nextModule.title}</p>
              {nextModule.subtitle && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{nextModule.subtitle}</p>}
              <div className="flex gap-2 mt-1.5">
                {nextModule.modality && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{nextModule.modality?.replace("_", " ")}</span>
                )}
                {nextModule.durationMins && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{nextModule.durationMins} min</span>
                )}
              </div>
            </div>
          </div>
          <Button size="sm" className="w-full gap-1.5" onClick={() => setLocation(`/learning/module/${nextModule.moduleId}${nextModule.planItemId ? `?planItemId=${nextModule.planItemId}` : ''}`)}>
            Start Next Module<ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* No-transfer disclosure */}
      {noTransferResult ? (
        <div className="rounded-xl border border-[#C8B07A]/30 bg-[#C8B07A]/10 p-4 text-left space-y-2">
          <p className="text-sm font-medium text-[#8E7848]">Transfer finding recorded</p>
          <p className="text-xs text-muted-foreground">{noTransferResult.message}</p>
          {noTransferResult.alternativeTitle && (
            <p className="text-xs text-[#8E7848]">
              Alternative suggested: <span className="font-medium">{noTransferResult.alternativeTitle}</span>
              {noTransferResult.alternativeModality && ` (${noTransferResult.alternativeModality})`}
            </p>
          )}
        </div>
      ) : !showNoTransferPrompt ? (
        <button
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          onClick={() => setShowNoTransferPrompt(true)}>
          Didn't feel like this translated to practice?
        </button>
      ) : (
        <div className="rounded-xl border border-border bg-muted p-4 text-left space-y-3">
          <p className="text-sm font-medium">What happened?</p>
          <p className="text-xs text-muted-foreground">This helps us find a better approach for you.</p>
          <div className="grid grid-cols-1 gap-2">
            {([
              ["no_engagement", "I didn't really engage with it"],
              ["partial_engagement", "I started but didn't finish properly"],
              ["completed_no_change", "I completed it but nothing changed for me"],
              ["regression", "I feel less confident than before"],
            ] as const).map(([reason, label]) => (
              <button key={reason}
                className="text-left text-xs px-3 py-2 rounded-lg border border-border hover:border-[#C8B07A]/50 hover:bg-[#C8B07A]/10 transition-colors"
                onClick={() => { onReportNoTransfer?.(reason); setShowNoTransferPrompt(false); }}>
                {label}
              </button>
            ))}
          </div>
          <button className="text-xs text-muted-foreground" onClick={() => setShowNoTransferPrompt(false)}>Cancel</button>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-2">
        <Button className="w-full gap-2" onClick={onContinue}>
          <ArrowLeft className="h-4 w-4" />Back to Learning Plan
        </Button>
      </div>
    </div>
  );
}

// --- Main Page ----------------------------------------------------------------

export default function ModulePlayerPage() {
  const params = useParams<{ moduleId: string }>();
  const [, setLocation] = useLocation();
  const [completed, setCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const planItemId = (() => {
    if (typeof window === "undefined") return undefined;
    return new URLSearchParams(window.location.search).get("planItemId") ?? undefined;
  })();

  const { data: mod, isLoading } = trpc.adaptiveLearning.getModuleDetail.useQuery(
    { moduleId: params.moduleId ?? "" },
    { enabled: !!params.moduleId, retry: 1 }
  );

  const { data: personalised, isLoading: personalisedLoading } = trpc.adaptiveLearning.getPersonalisedModuleContext.useQuery(
    { moduleId: params.moduleId ?? "" },
    { enabled: !!params.moduleId && !!mod, retry: 1, staleTime: 1000 * 60 * 60 }
  );

  const [noTransferResult, setNoTransferResult] = useState<{ alternativeTitle: string | null; alternativeModality: string | null; message: string } | null>(null);
  const [masteryGateResult, setMasteryGateResult] = useState<{ blocked: boolean; message: string | null; threshold: number; score: number } | null>(null);

  const markComplete = trpc.adaptiveLearning.markModuleComplete.useMutation({
    onSuccess: (data) => {
      if (data.masteryGateBlocked) {
        toast.error(`Score ${data.score}% - below ${data.masteryGateThreshold}% mastery threshold. Retake required.`);
        setMasteryGateResult({ blocked: true, message: data.masteryGateMessage, threshold: data.masteryGateThreshold, score: data.score });
      } else {
        toast.success("Module completed! Spaced repetition scheduled.");
        setMasteryGateResult(data.score !== undefined ? { blocked: false, message: null, threshold: data.masteryGateThreshold, score: data.score } : null);
      }
    },
    onError: err => toast.error(err.message),
  });

  const recordNoTransfer = trpc.adaptiveLearning.recordNoTransfer.useMutation({
    onSuccess: (data) => {
      setNoTransferResult(data);
      toast(data.message, { icon: "⚠️" });
    },
    onError: err => toast.error(err.message),
  });

  const handleComplete = (score: number) => {
    setFinalScore(score);
    setCompleted(true);
    markComplete.mutate({ moduleId: params.moduleId ?? "", planItemId, score, timeSpentMins: 0 });
  };

  const handleNoTransfer = (reason: "no_engagement" | "partial_engagement" | "completed_no_change" | "regression") => {
    if (!planItemId || !mod) return;
    recordNoTransfer.mutate({ planItemId, moduleId: params.moduleId ?? "", capability: mod.capability, noTransferReason: reason, attemptCount: 1 });
  };

  const handleBack = () => setLocation("/learning");

  // Derive progress steps from mod data (or use fallback when mod not yet loaded).
  // IMPORTANT: hooks must be called unconditionally before any early returns.
  const body = (() => {
    if (!mod) return {};
    try {
      return typeof mod.bodyJson === "string" ? JSON.parse(mod.bodyJson as string) : (mod.bodyJson ?? {});
    } catch { return {}; }
  })();
  const progressSteps = mod ? buildProgressSteps(mod.modality, body) : [{ id: "loading", label: "Loading" }];
  const [currentProgressStep, setCurrentProgressStep] = useModuleProgress(
    params.moduleId ?? "",
    progressSteps.length
  );

  if (isLoading) return <ModulePlayerSkeleton />;

  if (!mod) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto text-center py-16">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
        <p className="font-semibold mb-2">Module not found</p>
        <Button variant="outline" onClick={handleBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />Back to Learning Plan
        </Button>
      </div>
    );
  }

  const cap = CAPABILITY_META[mod.capability] ?? { label: mod.capability, color: "#888", icon: BookOpen };
  const modal = MODALITY_META[mod.modality] ?? { label: mod.modality, color: "#888", icon: BookOpen };
  const CapIcon = cap.icon;
  const ModalIcon = modal.icon;

  return (
    <div className="px-5 py-6 md:px-8 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-foreground hover:text-foreground/80" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4" />Learning Plan
      </Button>

      {!completed ? (
        <>
          {/* Module header */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs border-0 px-2 py-1" style={{ background: `${modal.color}15`, color: modal.color }}>
                <ModalIcon className="h-3 w-3 mr-1.5" />{modal.label}
              </Badge>
              <Badge variant="outline" className="text-xs border-0 px-2 py-1" style={{ background: `${cap.color}15`, color: cap.color }}>
                <CapIcon className="h-3 w-3 mr-1.5" />{cap.label}
              </Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground">Level {mod.difficulty}</Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />{mod.durationMins} min
              </Badge>
            </div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold flex-1">{mod.title}</h1>
              <DownloadPdfButton
                type="module"
                moduleId={params.moduleId}
                label="PDF"
                variant="ghost"
                size="sm"
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
              />
            </div>
            {mod.subtitle && <p className="text-sm text-muted-foreground">{mod.subtitle}</p>}
          </div>

              {/* Progress bar */}
          <ModuleProgressBar
            steps={progressSteps}
            currentStepIdx={currentProgressStep}
            completed={false}
          />

          {/* LLM Personalised Context Panel - collapsible, shown below progress bar */}
          {(personalisedLoading || personalised) && (
            <details className="group rounded-xl border border-border bg-muted/20 overflow-hidden">
              <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none list-none">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-semibold text-primary flex-1">Personalised for you</span>
                {personalisedLoading && <span className="text-xs text-muted-foreground animate-pulse">Generating…</span>}
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-4 pb-4 space-y-2 border-t border-border">
              {personalised ? (
                <>
                  {personalised.personalisedIntro && (
                    <p className="text-sm text-foreground/80 leading-relaxed pt-3">{personalised.personalisedIntro}</p>
                  )}
                  {Array.isArray(personalised.contextualExamples) && (personalised.contextualExamples as string[]).length > 0 && (
                    <div className="space-y-1">
                      {(personalised.contextualExamples as string[]).slice(0, 2).map((ex, i) => (
                        <p key={i} className="text-xs text-muted-foreground border-l-2 border-border pl-3 italic">{ex}</p>
                      ))}
                    </div>
                  )}
                  {Array.isArray(personalised.failureModeCallouts) && (personalised.failureModeCallouts as string[]).length > 0 && (
                    <div className="p-2.5 rounded-lg bg-[#C8B07A]/10 border border-[#C8B07A]/30 mt-1">
                      {(personalised.failureModeCallouts as string[]).slice(0, 1).map((fm, i) => (
                        <p key={i} className="text-xs text-[#8E7848]">
                          <span className="font-semibold">Watch out: </span>{fm}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-1.5 pt-3">
                  <div className="h-3 rounded bg-muted animate-pulse w-3/4" />
                  <div className="h-3 rounded bg-muted animate-pulse w-1/2" />
                </div>
              )}
              </div>
            </details>
          )}

          {/* Module content */}
          <div className="p-5 rounded-2xl border border-border bg-card">
            {mod.modality === "tutorial"   && <TutorialRenderer   body={body} onComplete={handleComplete} onProgressChange={setCurrentProgressStep} />}
            {mod.modality === "quiz"       && <QuizRenderer        body={body} onComplete={handleComplete} onProgressChange={setCurrentProgressStep} />}
            {mod.modality === "practical"  && <PracticalRenderer   body={body} onComplete={handleComplete} onProgressChange={setCurrentProgressStep} />}
            {mod.modality === "case_study" && <CaseStudyRenderer   body={body} onComplete={handleComplete} onProgressChange={setCurrentProgressStep} />}
            {mod.modality === "reflection" && <ReflectionRenderer  body={body} onComplete={handleComplete} onProgressChange={setCurrentProgressStep} />}
            {mod.modality === "scenario"   && <ScenarioRenderer    body={body} onComplete={handleComplete} onProgressChange={setCurrentProgressStep} />}
            {mod.modality === "coaching"   && <CoachingRenderer    body={body} onComplete={handleComplete} onProgressChange={setCurrentProgressStep} />}
            {mod.modality === "video"      && <VideoRenderer       body={body} onComplete={handleComplete} onProgressChange={setCurrentProgressStep} />}
          </div>
        </>
      ) : (
        <>
          {/* Progress bar - 100% on completion */}
          <ModuleProgressBar
            steps={progressSteps}
            currentStepIdx={progressSteps.length - 1}
            completed={true}
          />
          <div className="p-5 pt-8 rounded-2xl border border-border bg-card">
          <CompletionScreen
            score={finalScore}
            title={mod.title}
            capability={mod.capability}
            moduleId={params.moduleId ?? ""}
            onContinue={handleBack}
            onReportNoTransfer={planItemId ? handleNoTransfer : undefined}
            noTransferResult={noTransferResult}
            masteryGateResult={masteryGateResult}
            onRetake={() => { setCompleted(false); setFinalScore(0); setMasteryGateResult(null); }}
          />
          </div>
        </>
      )}
    </div>
  );
}
