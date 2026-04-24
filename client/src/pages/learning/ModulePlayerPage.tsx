/**
 * Module Player Page — AiQ Adaptive Learning Engine
 *
 * Renders all 8 modality types:
 *   tutorial   — structured lesson with sections, examples, key points
 *   practical  — step-by-step exercise with workspace
 *   case_study — narrative scenario with analysis questions
 *   quiz       — multiple-choice questions with explanations
 *   scenario   — branching decision scenario
 *   video      — video with transcript and reflection
 *   reflection — guided journalling prompts
 *   coaching   — structured coaching conversation framework
 */

import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft, BookOpen, Zap, FileText, HelpCircle, Layers,
  Video, MessageSquare, Users, Clock, CheckCircle2, ChevronRight,
  ChevronLeft, Target, Brain, Lightbulb, BarChart3, Star,
  AlertCircle, ThumbsUp, RefreshCw, Send, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const CAPABILITY_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ai_interaction:      { label: "AI Interaction",       color: "#4477AA", icon: Zap },
  ai_output_evaluation:{ label: "AI Output Evaluation", color: "#228833", icon: Brain },
  ai_ethics_trust:     { label: "AI Ethics & Trust",    color: "#AA3377", icon: Target },
  ai_change_leadership:{ label: "AI Change Leadership", color: "#D97706", icon: Lightbulb },
  workflow:            { label: "Workflow Integration", color: "#3b82f6", icon: Layers },
  data_interpretation: { label: "Data Interpretation",  color: "#8b5cf6", icon: BarChart3 },
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

// ─── Tutorial Renderer ────────────────────────────────────────────────────────

function TutorialRenderer({ body, onComplete }: { body: any; onComplete: (score: number) => void }) {
  const [sectionIdx, setSectionIdx] = useState(0);
  const sections: any[] = body?.sections ?? [];
  const keyPoints: string[] = body?.keyPoints ?? [];
  const learningObjectives: string[] = body?.learningObjectives ?? [];
  const citations: string[] = body?.citations ?? [];

  if (sections.length === 0) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-muted/20 border border-border">
          <p className="text-sm text-muted-foreground">Module content is being prepared. Check back soon.</p>
        </div>
        <Button onClick={() => onComplete(80)} className="w-full gap-2">
          <CheckCircle2 className="h-4 w-4" />Mark Complete
        </Button>
      </div>
    );
  }

  const section = sections[sectionIdx];
  const isLast = sectionIdx === sections.length - 1;

  return (
    <div className="space-y-5">
      {/* Learning objectives */}
      {sectionIdx === 0 && learningObjectives.length > 0 && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Learning Objectives</p>
          <ul className="space-y-1.5">
            {learningObjectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Section progress */}
      <div className="flex items-center gap-2">
        {sections.map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all",
            i < sectionIdx ? "bg-primary" : i === sectionIdx ? "bg-primary/60" : "bg-muted")} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Section {sectionIdx + 1} of {sections.length}</p>

      {/* Section content */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">{section.heading}</h3>
        {section.body && (
          <div className="prose prose-sm prose-invert max-w-none">
            {String(section.body).split("\n\n").map((para: string, i: number) => (
              <p key={i} className="text-sm leading-relaxed text-foreground/90 mb-3">{para}</p>
            ))}
          </div>
        )}

        {/* Examples */}
        {section.examples && section.examples.length > 0 && (
          <div className="space-y-3">
            {section.examples.map((ex: any, i: number) => (
              <div key={i} className="p-4 rounded-xl bg-muted/20 border-l-4 border-primary/60">
                <p className="text-xs font-semibold text-primary mb-1.5">Example {i + 1}</p>
                <p className="text-sm">{ex.scenario ?? ex}</p>
                {ex.prompt && (
                  <div className="mt-2 p-2 rounded bg-muted/30">
                    <p className="text-xs font-mono text-muted-foreground">{ex.prompt}</p>
                  </div>
                )}
                {ex.output && (
                  <div className="mt-2 p-2 rounded bg-emerald-950/20 border border-emerald-700/20">
                    <p className="text-xs text-emerald-400 font-semibold mb-1">Output</p>
                    <p className="text-xs text-foreground/80">{ex.output}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Key points (on last section) */}
        {isLast && keyPoints.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-700/30">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Key Takeaways</p>
            <ul className="space-y-1.5">
              {keyPoints.map((kp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Star className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>{kp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Research citations (on last section) */}
        {isLast && citations.length > 0 && (
          <div className="p-4 rounded-xl bg-muted/10 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Further Reading</p>
            <ul className="space-y-1">
              {citations.map((c, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">›</span>{c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {sectionIdx > 0 && (
          <Button variant="outline" onClick={() => setSectionIdx(i => i - 1)} className="gap-1.5">
            <ChevronLeft className="h-4 w-4" />Previous
          </Button>
        )}
        {!isLast && (
          <Button className="flex-1 gap-1.5" onClick={() => setSectionIdx(i => i + 1)}>
            Next Section<ChevronRight className="h-4 w-4" />
          </Button>
        )}
        {isLast && (
          <Button className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => onComplete(85)}>
            <CheckCircle2 className="h-4 w-4" />Complete Module
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Quiz Renderer ────────────────────────────────────────────────────────────

function QuizRenderer({ body, onComplete }: { body: any; onComplete: (score: number) => void }) {
  const questions: any[] = body?.questions ?? [];
  const [qIdx, setQIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [scores, setScores] = useState<boolean[]>([]);

  if (questions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm mb-4">No quiz questions available yet.</p>
        <Button onClick={() => onComplete(75)}>Mark Complete</Button>
      </div>
    );
  }

  const q = questions[qIdx];
  const isLast = qIdx === questions.length - 1;

  // Normalise options to plain strings
  const rawOptions: any[] = q.options ?? [];
  const optionTexts: string[] = rawOptions.map((o: any) =>
    typeof o === "string" ? o : (o.text ?? String(o))
  );
  const optionIds: string[] = rawOptions.map((o: any, i: number) =>
    typeof o === "string" ? String(i) : (o.id ?? String(i))
  );

  // Resolve correct index — supports numeric correctIndex OR letter/id correctAnswer
  const correctIdx: number = (() => {
    if (typeof q.correctIndex === "number") return q.correctIndex;
    const ca = q.correctAnswer ?? q.correct_answer;
    if (ca !== undefined) {
      const byId = optionIds.indexOf(String(ca));
      if (byId !== -1) return byId;
      // Try letter A/B/C/D → 0/1/2/3
      const letter = String(ca).toLowerCase();
      const letterIdx = "abcdefghij".indexOf(letter);
      if (letterIdx !== -1) return letterIdx;
    }
    return 0;
  })();

  const isCorrect = answered && selectedIdx === correctIdx;

  const handleAnswer = (idx: number) => {
    if (answered) return;
    setSelectedIdx(idx);
    setAnswered(true);
    setScores(s => { const n = [...s]; n.push(idx === correctIdx); return n; });
  };

  const handleNext = () => {
    if (isLast) {
      const correct = scores.filter(Boolean).length;
      const score = Math.round((correct / questions.length) * 100);
      onComplete(score);
    } else {
      setQIdx(i => i + 1);
      setSelectedIdx(null);
      setAnswered(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {questions.map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full",
            i < qIdx ? (scores[i] ? "bg-emerald-500" : "bg-red-500") : i === qIdx ? "bg-primary/60" : "bg-muted")} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Question {qIdx + 1} of {questions.length}</p>

      {/* Question */}
      <div className="p-4 rounded-xl bg-muted/20 border border-border">
        <p className="font-semibold text-sm leading-relaxed">{q.question}</p>
        {q.context && <p className="text-xs text-muted-foreground mt-2">{q.context}</p>}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {optionTexts.map((optText: string, i: number) => (
          <button key={i}
            className={cn("w-full text-left p-3.5 rounded-xl border text-sm transition-all",
              !answered && "hover:border-primary/50 hover:bg-primary/5",
              answered && i === correctIdx && "border-emerald-500/60 bg-emerald-950/20 text-emerald-300",
              answered && i === selectedIdx && i !== correctIdx && "border-red-500/60 bg-red-950/20 text-red-300",
              !answered && selectedIdx === i && "border-primary bg-primary/10",
              !answered && selectedIdx !== i && "border-border bg-card",
            )}
            onClick={() => handleAnswer(i)}>
            <div className="flex items-start gap-2.5">
              <span className={cn("w-5 h-5 rounded-full border text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5",
                answered && i === correctIdx ? "border-emerald-500 bg-emerald-500 text-white" :
                answered && i === selectedIdx && i !== correctIdx ? "border-red-500 bg-red-500 text-white" :
                "border-muted-foreground text-muted-foreground")}>
                {String.fromCharCode(65 + i)}
              </span>
              <span>{optText}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Explanation */}
      {answered && q.explanation && (
        <div className={cn("p-4 rounded-xl border text-sm",
          isCorrect ? "bg-emerald-950/20 border-emerald-700/30 text-emerald-200" : "bg-amber-950/20 border-amber-700/30 text-amber-200")}>
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
  );
}

// ─── Practical Renderer ───────────────────────────────────────────────────────

function PracticalRenderer({ body, onComplete }: { body: any; onComplete: (score: number) => void }) {
  const steps: any[] = body?.steps ?? [];
  const [stepIdx, setStepIdx] = useState(0);
  const [workspaceText, setWorkspaceText] = useState("");
  const [stepsDone, setStepsDone] = useState<Set<number>>(new Set());

  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  const handleStepComplete = () => {
    setStepsDone(s => { const next = new Set(s); next.add(stepIdx); return next; });
    if (!isLast) {
      setStepIdx(i => i + 1);
      setWorkspaceText("");
    } else {
      onComplete(90);
    }
  };

  if (steps.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm mb-4">Practical steps are being prepared.</p>
        <Button onClick={() => onComplete(80)}>Mark Complete</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step progress */}
      <div className="flex items-center gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full",
            stepsDone.has(i) ? "bg-emerald-500" : i === stepIdx ? "bg-primary/60" : "bg-muted")} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Step {stepIdx + 1} of {steps.length}</p>

      {/* Step content */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
            {stepIdx + 1}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{step.title ?? `Step ${stepIdx + 1}`}</h3>
            {step.instruction && <p className="text-sm text-foreground/80 mt-1">{step.instruction}</p>}
          </div>
        </div>

        {step.context && (
          <div className="p-3 rounded-xl bg-muted/20 border border-border text-sm text-muted-foreground">
            {step.context}
          </div>
        )}

        {step.prompt && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-xs font-semibold text-primary mb-1">Your Task</p>
            <p className="text-sm">{step.prompt}</p>
          </div>
        )}

        {/* Workspace */}
        {step.requiresInput !== false && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Your Response</p>
            <textarea
              className="w-full min-h-[120px] p-3 rounded-xl border border-border bg-muted/20 text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="Type your response here…"
              value={workspaceText}
              onChange={e => setWorkspaceText(e.target.value)}
            />
          </div>
        )}

        {step.tip && (
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-700/20 text-xs text-amber-300">
            <span className="font-semibold">Tip: </span>{step.tip}
          </div>
        )}
      </div>

      <Button className="w-full gap-1.5" onClick={handleStepComplete}
        disabled={step.requiresInput !== false && workspaceText.trim().length < 10}>
        {isLast ? <><CheckCircle2 className="h-4 w-4" />Complete Practical</> : <>Next Step<ChevronRight className="h-4 w-4" /></>}
      </Button>
    </div>
  );
}

// ─── Case Study Renderer ──────────────────────────────────────────────────────

function CaseStudyRenderer({ body, onComplete }: { body: any; onComplete: (score: number) => void }) {
  const [phase, setPhase] = useState<"read" | "analyse" | "reflect">("read");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const questions: any[] = body?.analysisQuestions ?? [];

  const allAnswered = questions.every((_, i) => (answers[i] ?? "").trim().length > 20);

  return (
    <div className="space-y-5">
      {/* Phase tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/20 border border-border/50">
        {(["read", "analyse", "reflect"] as const).map(p => (
          <button key={p} className={cn("flex-1 py-1.5 px-2 rounded-lg text-xs font-medium capitalize transition-all",
            phase === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
            onClick={() => setPhase(p)}>
            {p}
          </button>
        ))}
      </div>

      {phase === "read" && (
        <div className="space-y-4">
          {body?.narrative && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">The Scenario</h3>
              {String(body.narrative).split("\n\n").map((para: string, i: number) => (
                <p key={i} className="text-sm leading-relaxed text-foreground/90">{para}</p>
              ))}
            </div>
          )}
          {body?.challenge && (
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-700/30">
              <p className="text-xs font-semibold text-red-400 mb-1">The Challenge</p>
              <p className="text-sm">{body.challenge}</p>
            </div>
          )}
          <Button className="w-full gap-1.5" onClick={() => setPhase("analyse")}>
            Analyse the Case<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === "analyse" && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Analysis Questions</h3>
          {questions.map((q: any, i: number) => (
            <div key={i} className="space-y-2">
              <p className="text-sm font-medium">{i + 1}. {q.question ?? q}</p>
              <textarea
                className="w-full min-h-[100px] p-3 rounded-xl border border-border bg-muted/20 text-sm resize-none focus:outline-none focus:border-primary/50"
                placeholder="Your analysis…"
                value={answers[i] ?? ""}
                onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))}
              />
            </div>
          ))}
          <Button className="w-full gap-1.5" disabled={!allAnswered} onClick={() => setPhase("reflect")}>
            Review Insights<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === "reflect" && (
        <div className="space-y-4">
          {body?.keyInsights && (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-700/30">
              <p className="text-xs font-semibold text-emerald-400 mb-2">Key Insights</p>
              <ul className="space-y-1.5">
                {(body.keyInsights as string[]).map((insight: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <ThumbsUp className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {body?.lessonsLearned && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs font-semibold text-primary mb-2">Lessons Learned</p>
              <p className="text-sm">{body.lessonsLearned}</p>
            </div>
          )}
          <Button className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => onComplete(85)}>
            <CheckCircle2 className="h-4 w-4" />Complete Case Study
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Reflection Renderer ──────────────────────────────────────────────────────

function ReflectionRenderer({ body, onComplete }: { body: any; onComplete: (score: number) => void }) {
  const prompts: string[] = body?.prompts ?? body?.reflectionPrompts ?? [];
  const [responses, setResponses] = useState<Record<number, string>>({});
  const allAnswered = prompts.every((_, i) => (responses[i] ?? "").trim().length > 30);

  return (
    <div className="space-y-5">
      {body?.intro && (
        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-700/30">
          <p className="text-sm text-cyan-200">{body.intro}</p>
        </div>
      )}
      <h3 className="font-semibold text-sm">Reflection Prompts</h3>
      <p className="text-xs text-muted-foreground">Take your time with each prompt. There are no right or wrong answers.</p>
      {prompts.map((prompt: string, i: number) => (
        <div key={i} className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-cyan-900/40 text-cyan-400 text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-sm font-medium leading-relaxed">{prompt}</p>
          </div>
          <textarea
            className="w-full min-h-[120px] p-3 rounded-xl border border-border bg-muted/20 text-sm resize-none focus:outline-none focus:border-cyan-500/50"
            placeholder="Reflect here…"
            value={responses[i] ?? ""}
            onChange={e => setResponses(r => ({ ...r, [i]: e.target.value }))}
          />
        </div>
      ))}
      {body?.closingThought && (
        <div className="p-3 rounded-xl bg-muted/10 border border-border text-xs text-muted-foreground italic">
          {body.closingThought}
        </div>
      )}
      <Button className="w-full gap-1.5 bg-cyan-600 hover:bg-cyan-700" disabled={!allAnswered} onClick={() => onComplete(90)}>
        <CheckCircle2 className="h-4 w-4" />Complete Reflection
      </Button>
    </div>
  );
}

// ─── Scenario Renderer ────────────────────────────────────────────────────────

function ScenarioRenderer({ body, onComplete }: { body: any; onComplete: (score: number) => void }) {
  const [step, setStep] = useState<"setup" | "decision" | "outcome">("setup");
  const [chosen, setChosen] = useState<number | null>(null);
  const choices: any[] = body?.choices ?? body?.decisionPoints ?? [];

  const choice = chosen !== null ? choices[chosen] : null;

  return (
    <div className="space-y-5">
      {step === "setup" && (
        <>
          {body?.situation && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">The Situation</h3>
              {String(body.situation).split("\n\n").map((p: string, i: number) => (
                <p key={i} className="text-sm leading-relaxed text-foreground/90">{p}</p>
              ))}
            </div>
          )}
          {body?.yourRole && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs font-semibold text-primary mb-1">Your Role</p>
              <p className="text-sm">{body.yourRole}</p>
            </div>
          )}
          <Button className="w-full gap-1.5" onClick={() => setStep("decision")}>
            Make Your Decision<ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {step === "decision" && (
        <>
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-700/30">
            <p className="text-xs font-semibold text-amber-400 mb-1">Decision Point</p>
            <p className="text-sm font-medium">{body?.decisionQuestion ?? "What would you do?"}</p>
          </div>
          <div className="space-y-2">
            {choices.map((c: any, i: number) => (
              <button key={i}
                className={cn("w-full text-left p-4 rounded-xl border text-sm transition-all",
                  chosen === i ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40")}
                onClick={() => setChosen(i)}>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full border border-muted-foreground text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{c.text ?? c.option ?? c}</span>
                </div>
              </button>
            ))}
          </div>
          <Button className="w-full gap-1.5" disabled={chosen === null} onClick={() => setStep("outcome")}>
            See Outcome<ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {step === "outcome" && choice && (
        <>
          <div className={cn("p-4 rounded-xl border",
            choice.isOptimal ? "bg-emerald-950/20 border-emerald-700/30" : "bg-amber-950/20 border-amber-700/30")}>
            <p className={cn("text-xs font-semibold mb-1", choice.isOptimal ? "text-emerald-400" : "text-amber-400")}>
              {choice.isOptimal ? "Strong Choice" : "Consider This"}
            </p>
            <p className="text-sm">{choice.outcome ?? choice.feedback ?? "Good thinking — here's what typically happens."}</p>
          </div>
          {body?.bestPractice && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs font-semibold text-primary mb-1">Best Practice</p>
              <p className="text-sm">{body.bestPractice}</p>
            </div>
          )}
          {body?.learningPoint && (
            <div className="p-4 rounded-xl bg-muted/20 border border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Learning Point</p>
              <p className="text-sm">{body.learningPoint}</p>
            </div>
          )}
          <Button className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => onComplete(choice.isOptimal ? 90 : 70)}>
            <CheckCircle2 className="h-4 w-4" />Complete Scenario
          </Button>
        </>
      )}
    </div>
  );
}

// ─── Coaching Renderer ────────────────────────────────────────────────────────

function CoachingRenderer({ body, onComplete }: { body: any; onComplete: (score: number) => void }) {
  const questions: string[] = body?.coachingQuestions ?? body?.questions ?? [];
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [qIdx, setQIdx] = useState(0);
  const allAnswered = questions.every((_, i) => (responses[i] ?? "").trim().length > 20);

  const q = questions[qIdx];
  const isLast = qIdx === questions.length - 1;

  return (
    <div className="space-y-5">
      {body?.intro && (
        <div className="p-4 rounded-xl bg-green-950/20 border border-green-700/30">
          <p className="text-xs font-semibold text-green-400 mb-1">Coaching Framework</p>
          <p className="text-sm text-foreground/90">{body.intro}</p>
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center gap-1.5">
        {questions.map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full",
            (responses[i] ?? "").trim().length > 20 ? "bg-green-500" : i === qIdx ? "bg-primary/60" : "bg-muted")} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Question {qIdx + 1} of {questions.length}</p>

      {/* Coaching question */}
      <div className="p-4 rounded-xl bg-green-950/20 border border-green-700/30">
        <div className="flex items-start gap-2.5">
          <Users className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium leading-relaxed">{q}</p>
        </div>
      </div>

      <textarea
        className="w-full min-h-[140px] p-3 rounded-xl border border-border bg-muted/20 text-sm resize-none focus:outline-none focus:border-green-500/50"
        placeholder="Your response…"
        value={responses[qIdx] ?? ""}
        onChange={e => setResponses(r => ({ ...r, [qIdx]: e.target.value }))}
      />

      <div className="flex gap-3">
        {qIdx > 0 && (
          <Button variant="outline" onClick={() => setQIdx(i => i - 1)} className="gap-1.5">
            <ChevronLeft className="h-4 w-4" />Back
          </Button>
        )}
        {!isLast && (
          <Button className="flex-1 gap-1.5" disabled={(responses[qIdx] ?? "").trim().length < 20}
            onClick={() => setQIdx(i => i + 1)}>
            Next<ChevronRight className="h-4 w-4" />
          </Button>
        )}
        {isLast && (
          <Button className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700"
            disabled={(responses[qIdx] ?? "").trim().length < 20}
            onClick={() => onComplete(90)}>
            <CheckCircle2 className="h-4 w-4" />Complete Coaching
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Video Renderer ───────────────────────────────────────────────────────────

function VideoRenderer({ body, onComplete }: { body: any; onComplete: (score: number) => void }) {
  const [watched, setWatched] = useState(false);
  const [reflectionText, setReflectionText] = useState("");

  return (
    <div className="space-y-5">
      {/* Video placeholder */}
      <div className="rounded-xl overflow-hidden bg-muted/20 border border-border aspect-video flex items-center justify-center">
        {body?.videoUrl ? (
          <iframe src={body.videoUrl} className="w-full h-full" allowFullScreen
            onLoad={() => setWatched(true)} />
        ) : (
          <div className="text-center p-8">
            <Video className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground mb-2">Video content</p>
            <p className="text-xs text-muted-foreground">{body?.videoDescription ?? "Watch the video then complete the reflection below."}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setWatched(true)}>
              Mark as Watched
            </Button>
          </div>
        )}
      </div>

      {/* Transcript */}
      {body?.transcript && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            View Transcript
          </summary>
          <div className="mt-2 p-3 rounded-xl bg-muted/10 border border-border text-xs text-muted-foreground leading-relaxed">
            {body.transcript}
          </div>
        </details>
      )}

      {/* Reflection */}
      {watched && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Reflection</p>
          <p className="text-sm text-muted-foreground">{body?.reflectionPrompt ?? "What was your key takeaway from this video? How will you apply it?"}</p>
          <textarea
            className="w-full min-h-[100px] p-3 rounded-xl border border-border bg-muted/20 text-sm resize-none focus:outline-none focus:border-primary/50"
            placeholder="Your reflection…"
            value={reflectionText}
            onChange={e => setReflectionText(e.target.value)}
          />
          <Button className="w-full gap-1.5" disabled={reflectionText.trim().length < 20} onClick={() => onComplete(80)}>
            <CheckCircle2 className="h-4 w-4" />Complete Module
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Completion Screen ────────────────────────────────────────────────────────

function CompletionScreen({
  score, title, onContinue, onReportNoTransfer, noTransferResult,
}: {
  score: number;
  title: string;
  onContinue: () => void;
  onReportNoTransfer?: (reason: "no_engagement" | "partial_engagement" | "completed_no_change" | "regression") => void;
  noTransferResult?: { alternativeTitle: string | null; alternativeModality: string | null; message: string } | null;
}) {
  const [showNoTransferPrompt, setShowNoTransferPrompt] = useState(false);
  return (
    <div className="text-center py-8 space-y-4">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-1">Module Complete!</h2>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/30 border border-emerald-700/30">
        <Star className="h-4 w-4 text-amber-400" />
        <span className="font-semibold text-emerald-300">{score}% score</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {score >= 80 ? "Excellent work! This module is scheduled for review in 7 days." :
         score >= 60 ? "Good effort! Review scheduled in 3 days." :
         "Keep practising — review scheduled for tomorrow."}
      </p>

      {/* No-transfer disclosure */}
      {noTransferResult ? (
        <div className="rounded-xl border border-amber-700/30 bg-amber-950/20 p-4 text-left space-y-2">
          <p className="text-sm font-medium text-amber-300">Transfer finding recorded</p>
          <p className="text-xs text-muted-foreground">{noTransferResult.message}</p>
          {noTransferResult.alternativeTitle && (
            <p className="text-xs text-amber-200/70">
              Alternative suggested: <span className="font-medium">{noTransferResult.alternativeTitle}</span>
              {noTransferResult.alternativeModality && ` (${noTransferResult.alternativeModality})`}
            </p>
          )}
        </div>
      ) : !showNoTransferPrompt ? (
        <button
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          onClick={() => setShowNoTransferPrompt(true)}
        >
          Didn’t feel like this translated to practice?
        </button>
      ) : (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-left space-y-3">
          <p className="text-sm font-medium">What happened?</p>
          <p className="text-xs text-muted-foreground">This helps us find a better approach for you.</p>
          <div className="grid grid-cols-1 gap-2">
            {([
              ["no_engagement", "I didn’t really engage with it"],
              ["partial_engagement", "I started but didn’t finish properly"],
              ["completed_no_change", "I completed it but nothing changed for me"],
              ["regression", "I feel less confident than before"],
            ] as const).map(([reason, label]) => (
              <button
                key={reason}
                className="text-left text-xs px-3 py-2 rounded-lg border border-border hover:border-amber-500/50 hover:bg-amber-950/20 transition-colors"
                onClick={() => { onReportNoTransfer?.(reason); setShowNoTransferPrompt(false); }}
              >
                {label}
              </button>
            ))}
          </div>
          <button className="text-xs text-muted-foreground" onClick={() => setShowNoTransferPrompt(false)}>Cancel</button>
        </div>
      )}

      <Button className="gap-2" onClick={onContinue}>
        <ArrowLeft className="h-4 w-4" />Back to Learning Plan
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ModulePlayerPage() {
  const params = useParams<{ moduleId: string }>();
  const [, setLocation] = useLocation();
  const [completed, setCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  // Extract planItemId from query string
  const planItemId = (() => {
    if (typeof window === "undefined") return undefined;
    return new URLSearchParams(window.location.search).get("planItemId") ?? undefined;
  })();

  const { data: mod, isLoading } = trpc.adaptiveLearning.getModuleDetail.useQuery(
    { moduleId: params.moduleId ?? "" },
    { enabled: !!params.moduleId, retry: 1 }
  );
  // LLM-personalised context (cached per user+module)
  const { data: personalised, isLoading: personalisedLoading } = trpc.adaptiveLearning.getPersonalisedModuleContext.useQuery(
    { moduleId: params.moduleId ?? "" },
    { enabled: !!params.moduleId && !!mod, retry: 1, staleTime: 1000 * 60 * 60 }
  );
  const [noTransferResult, setNoTransferResult] = useState<{ alternativeTitle: string | null; alternativeModality: string | null; message: string } | null>(null);

  const markComplete = trpc.adaptiveLearning.markModuleComplete.useMutation({
    onSuccess: () => {
      toast.success("Module completed! Spaced repetition scheduled.");
    },
    onError: err => {
      toast.error(err.message);
    },
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
    markComplete.mutate({
      moduleId: params.moduleId ?? "",
      planItemId,
      score,
      timeSpentMins: 0,
    });
  };

  const handleNoTransfer = (reason: "no_engagement" | "partial_engagement" | "completed_no_change" | "regression") => {
    if (!planItemId || !mod) return;
    recordNoTransfer.mutate({
      planItemId,
      moduleId: params.moduleId ?? "",
      capability: mod.capability,
      noTransferReason: reason,
      attemptCount: 1,
    });
  };

  const handleBack = () => {
    setLocation("/learning");
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

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

  // Parse body JSON
  const body = (() => {
    try {
      return typeof mod.bodyJson === "string" ? JSON.parse(mod.bodyJson as string) : (mod.bodyJson ?? {});
    } catch { return {}; }
  })();

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground" onClick={handleBack}>
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
            <h1 className="text-2xl font-bold">{mod.title}</h1>
            {mod.subtitle && <p className="text-sm text-muted-foreground">{mod.subtitle}</p>}
          </div>

          {/* LLM Personalised Context Panel */}
          {(personalisedLoading || personalised) && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Personalised for you</span>
                {personalisedLoading && <span className="text-xs text-muted-foreground animate-pulse ml-1">Generating…</span>}
              </div>
              {personalised ? (
                <>
                  {personalised.personalisedIntro && (
                    <p className="text-sm text-foreground/90 leading-relaxed">{personalised.personalisedIntro}</p>
                  )}
                  {Array.isArray(personalised.contextualExamples) && (personalised.contextualExamples as string[]).length > 0 && (
                    <div className="space-y-1">
                      {(personalised.contextualExamples as string[]).slice(0, 2).map((ex, i) => (
                        <p key={i} className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3 italic">{ex}</p>
                      ))}
                    </div>
                  )}
                  {Array.isArray(personalised.failureModeCallouts) && (personalised.failureModeCallouts as string[]).length > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-700/30 mt-1">
                      {(personalised.failureModeCallouts as string[]).slice(0, 1).map((fm, i) => (
                        <p key={i} className="text-xs text-amber-400">
                          <span className="font-semibold">Watch out: </span>{fm}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-1.5">
                  <div className="h-3 rounded bg-primary/10 animate-pulse w-3/4" />
                  <div className="h-3 rounded bg-primary/10 animate-pulse w-1/2" />
                </div>
              )}
            </div>
          )}
          {/* Module content */}
          <div className="p-5 rounded-2xl border border-border bg-card">
            {mod.modality === "tutorial"   && <TutorialRenderer  body={body} onComplete={handleComplete} />}
            {mod.modality === "quiz"       && <QuizRenderer       body={body} onComplete={handleComplete} />}
            {mod.modality === "practical"  && <PracticalRenderer  body={body} onComplete={handleComplete} />}
            {mod.modality === "case_study" && <CaseStudyRenderer  body={body} onComplete={handleComplete} />}
            {mod.modality === "reflection" && <ReflectionRenderer body={body} onComplete={handleComplete} />}
            {mod.modality === "scenario"   && <ScenarioRenderer   body={body} onComplete={handleComplete} />}
            {mod.modality === "coaching"   && <CoachingRenderer   body={body} onComplete={handleComplete} />}
            {mod.modality === "video"      && <VideoRenderer      body={body} onComplete={handleComplete} />}
          </div>
        </>
      ) : (
        <div className="p-5 rounded-2xl border border-border bg-card">
          <CompletionScreen
            score={finalScore}
            title={mod.title}
            onContinue={handleBack}
            onReportNoTransfer={planItemId ? handleNoTransfer : undefined}
            noTransferResult={noTransferResult}
          />
        </div>
      )}
    </div>
  );
}
