/**
 * AssessmentResultsPage — Clean & Simple
 *
 * Layout:
 *   1. Header: overall score ring + readiness state + completed date
 *   2. Spider chart (full-width card)
 *   3. Domain cards grid (2-col on sm, 3-col on lg)
 *   4. Clicking a domain card → slide-out Sheet with detail + dev link
 */

import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from "recharts";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, AlertTriangle, ShieldAlert, HelpCircle,
  ChevronRight, BookOpen, Target, Brain,
  Shield, Workflow, Database, Gavel, TrendingUp, TrendingDown,
  RotateCcw, Clock, ChevronDown,
} from "lucide-react";
import { Sparkles, BarChart2, AlertCircle } from "lucide-react";
import { scoreToColor, formatPeakonScore } from "@/lib/peakon-colors";

// ── Assessment History Dropdown ────────────────────────────────────────────────

function HistoryDropdown({
  sessions,
  currentSessionId,
}: {
  sessions: any[];
  currentSessionId: string;
}) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = sessions.find(s => s.id === currentSessionId);
  const completedSessions = sessions.filter(s => s.state === "completed");
  const inProgressSession = sessions.find(s => s.state === "in_progress");

  const label = current
    ? current.state === "completed" && current.completedAt
      ? `Completed ${new Date(current.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
      : `Started ${new Date(current.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
    : "Select assessment";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors text-sm font-medium text-foreground"
      >
        <span className="text-muted-foreground text-xs font-normal mr-1">Assessment:</span>
        {label}
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[280px] rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          {inProgressSession && (
            <button
              onClick={() => { setOpen(false); navigate(`/assessment/${inProgressSession.id}`); }}
              className={cn(
                "w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors flex items-center justify-between gap-3 border-b border-border",
                inProgressSession.id === currentSessionId && "bg-accent/30"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">In Progress</p>
                  <p className="text-xs text-muted-foreground">
                    {inProgressSession.answeredCount ?? 0}/{inProgressSession.totalTarget ?? 49} answered
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-amber-400/12 text-amber-400 border-amber-400/25">Resume</span>
            </button>
          )}
          {completedSessions.map((s: any, i: number) => {
            const isActive = s.id === currentSessionId;
            const date = s.completedAt
              ? new Date(s.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : "—";
            const scoreVal = s.score?.overallScore;
            return (
              <button
                key={s.id}
                onClick={() => { setOpen(false); navigate(`/assessment/${s.id}/results`); }}
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors flex items-center justify-between gap-3",
                  i < completedSessions.length - 1 && "border-b border-border",
                  isActive && "bg-accent/30"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {i === 0 ? "Latest assessment" : `Assessment ${completedSessions.length - i}`}
                    </p>
                    <p className="text-xs text-muted-foreground">Completed {date}</p>
                  </div>
                </div>
                {scoreVal !== undefined && (
                  <span
                    className="text-sm font-bold tabular-nums px-2 py-0.5 rounded-lg text-white shrink-0"
                    style={{ backgroundColor: scoreToColor(scoreVal).bg }}
                  >
                    {formatPeakonScore(scoreVal)}
                  </span>
                )}
              </button>
            );
          })}
          <div className="border-t border-border px-4 py-2.5">
            <button
              onClick={() => { setOpen(false); navigate("/assessment?new=1"); }}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              + Start new assessment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── In-Progress Banner ─────────────────────────────────────────────────────────

function InProgressBanner({ session }: { session: any }) {
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const answered = session.answeredCount ?? 0;
  const total = session.totalTarget ?? 49;
  const pct = Math.round((answered / total) * 100);
  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/8 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Clock className="w-5 h-5 text-amber-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Assessment in Progress</p>
          <p className="text-xs text-muted-foreground">{answered} of {total} questions answered · {pct}% complete</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate(`/assessment/${session.id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/15 text-amber-400 text-xs font-semibold hover:bg-amber-400/25 transition-colors border border-amber-400/30"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Resume
        </button>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground text-xs px-1">✕</button>
      </div>
    </div>
  );
}

// ── Signal Breakdown Chart ─────────────────────────────────────────────────────

type SignalItem = { key: string; label: string; normScore: number; isRisk: boolean };

function SignalBreakdownChart({ signals, domainColour }: { signals: SignalItem[]; domainColour: string }) {
  if (!signals || signals.length === 0) return null;

  // Separate positive signals from risk signals
  const positiveSignals = signals.filter(s => !s.isRisk);
  const riskSignals = signals.filter(s => s.isRisk);

  const getBarColour = (s: SignalItem) => {
    if (s.isRisk) {
      // Risk signals: green = low risk (high score), red = high risk (low score)
      if (s.normScore >= 70) return "oklch(0.72 0.19 142)"; // green — risk well-managed
      if (s.normScore >= 50) return "oklch(0.75 0.18 60)";  // amber — moderate risk
      return "oklch(0.65 0.22 25)";                          // red — elevated risk
    }
    // Positive signals: use domain colour for strong, fade for weaker
    if (s.normScore >= 70) return domainColour;
    if (s.normScore >= 50) return `${domainColour}99`;
    return "oklch(0.65 0.22 25)";
  };

  const SignalRow = ({ s }: { s: SignalItem }) => (
    <div key={s.key} className="group">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {s.isRisk && <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />}
          <span className="text-xs text-foreground/80 truncate" title={s.label}>{s.label}</span>
        </div>
        <span className="text-xs font-semibold tabular-nums ml-2 shrink-0" style={{ color: getBarColour(s) }}>
          {s.normScore}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${s.normScore}%`, backgroundColor: getBarColour(s) }}
        />
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-background/40 p-4 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sub-Capability Breakdown</span>
      </div>

      {/* Positive signals */}
      {positiveSignals.length > 0 && (
        <div className="space-y-3 mb-4">
          {positiveSignals.map(s => <SignalRow key={s.key} s={s} />)}
        </div>
      )}

      {/* Risk signals — separated with a divider */}
      {riskSignals.length > 0 && (
        <>
          {positiveSignals.length > 0 && (
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Risk Signals</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}
          <div className="space-y-3">
            {riskSignals.map(s => <SignalRow key={s.key} s={s} />)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
            Risk signals: higher score = risk well-managed. Lower score = area to watch.
          </p>
        </>
      )}
    </div>
  );
}

// ── Domain icons ───────────────────────────────────────────────────────────────

// ── Signal metadata (mirrors server scoring engine) ──────────────────────────

const SIGNAL_TO_DOMAIN: Record<string, string> = {
  prompt_construction_quality: "ai_interaction",
  prompt_iteration_quality: "ai_interaction",
  output_direction_skill: "ai_interaction",
  tool_fluency_index: "ai_interaction",
  output_evaluation_quality: "ai_output_evaluation",
  error_detection_accuracy: "ai_output_evaluation",
  fitness_for_purpose_judgement: "ai_output_evaluation",
  blind_acceptance_risk: "ai_output_evaluation",
  hallucination_acceptance_risk: "ai_output_evaluation",
  bias_detection_skill: "ai_output_evaluation",
  data_interpretation_quality: "ai_output_evaluation",
  workflow_redesign_quality: "ai_workflow_design",
  handoff_design_quality: "ai_workflow_design",
  human_oversight_preservation: "ai_workflow_design",
  automation_expansion_risk: "ai_workflow_design",
  capability_diagnosis_accuracy: "workforce_ai_readiness",
  intervention_design_quality: "workforce_ai_readiness",
  leader_advisory_quality: "workforce_ai_readiness",
  generic_prescription_risk: "workforce_ai_readiness",
  ethics_under_pressure: "ai_ethics_trust",
  stakeholder_impact_awareness: "ai_ethics_trust",
  employee_transparency_advocacy: "ai_ethics_trust",
  pressure_drift_risk: "ai_ethics_trust",
  legal_vs_fair_distinction: "ai_ethics_trust",
  resistance_response_quality: "ai_change_leadership",
  legitimate_concern_recognition: "ai_change_leadership",
  change_pace_calibration: "ai_change_leadership",
  dismissive_of_concern_risk: "ai_change_leadership",
};

const SIGNAL_DISPLAY: Record<string, string> = {
  prompt_construction_quality: "Prompt Construction",
  prompt_iteration_quality: "Prompt Iteration",
  output_direction_skill: "Output Direction",
  tool_fluency_index: "Tool Fluency",
  output_evaluation_quality: "Output Evaluation",
  error_detection_accuracy: "Error Detection",
  fitness_for_purpose_judgement: "Fitness for Purpose",
  blind_acceptance_risk: "Blind Acceptance Risk",
  hallucination_acceptance_risk: "Hallucination Risk",
  bias_detection_skill: "Bias Detection",
  data_interpretation_quality: "Data Interpretation",
  workflow_redesign_quality: "Workflow Redesign",
  handoff_design_quality: "Handoff Design",
  human_oversight_preservation: "Human Oversight",
  automation_expansion_risk: "Automation Risk",
  capability_diagnosis_accuracy: "Capability Diagnosis",
  intervention_design_quality: "Intervention Design",
  leader_advisory_quality: "Leader Advisory",
  generic_prescription_risk: "Generic Prescription Risk",
  ethics_under_pressure: "Ethics Under Pressure",
  stakeholder_impact_awareness: "Stakeholder Impact",
  employee_transparency_advocacy: "Transparency Advocacy",
  pressure_drift_risk: "Pressure Drift Risk",
  legal_vs_fair_distinction: "Legal vs Fair",
  resistance_response_quality: "Resistance Response",
  legitimate_concern_recognition: "Concern Recognition",
  change_pace_calibration: "Change Pace",
  dismissive_of_concern_risk: "Dismissive Risk",
};

const RISK_SIGNALS = new Set([
  "blind_acceptance_risk", "hallucination_acceptance_risk",
  "automation_expansion_risk", "generic_prescription_risk",
  "pressure_drift_risk", "dismissive_of_concern_risk",
]);

function computeDomainSignals(
  signalScores: Record<string, { sum: number; count: number }>,
  domainKey: string
): Array<{ key: string; label: string; normScore: number; isRisk: boolean }> {
  const result: Array<{ key: string; label: string; normScore: number; isRisk: boolean }> = [];
  for (const [sigKey, sv] of Object.entries(signalScores)) {
    if (SIGNAL_TO_DOMAIN[sigKey] !== domainKey) continue;
    if (!sv || typeof sv.sum !== "number" || !sv.count) continue;
    const avg = sv.sum / sv.count;
    const isRisk = RISK_SIGNALS.has(sigKey);
    const normScore = isRisk
      ? Math.max(0, Math.min(100, Math.round(50 - avg * 25)))
      : Math.max(0, Math.min(100, Math.round(50 + avg * 25)));
    result.push({ key: sigKey, label: SIGNAL_DISPLAY[sigKey] ?? sigKey.replace(/_/g, " "), normScore, isRisk });
  }
  return result.sort((a, b) => b.normScore - a.normScore);
}

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  ai_interaction: Target,
  ai_output_evaluation: Brain,
  ai_ethics_trust: Shield,
  ai_change_leadership: Gavel,
  ai_workflow_design: Workflow,
  workforce_ai_readiness: Database,
};

// ── Readiness config ───────────────────────────────────────────────────────────

const READINESS_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string; icon: React.ElementType;
}> = {
  safe:    { label: "AI-Ready",          color: "text-primary",          bg: "bg-primary/10",    border: "border-primary/25",    icon: CheckCircle2 },
  at_risk: { label: "Developing",        color: "text-amber-400",        bg: "bg-amber-400/10",  border: "border-amber-400/25",  icon: AlertTriangle },
  unsafe:  { label: "Needs Development", color: "text-red-400",          bg: "bg-red-400/10",    border: "border-red-400/25",    icon: ShieldAlert },
  unknown: { label: "Not Assessed",      color: "text-muted-foreground", bg: "bg-muted/30",      border: "border-border",        icon: HelpCircle },
  foundation_gap: { label: "Foundation Gap", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/25", icon: ShieldAlert },
  unknown_insufficient_evidence: { label: "Insufficient Data", color: "text-muted-foreground", bg: "bg-muted/30", border: "border-border", icon: HelpCircle },
};

// ── Score to level ─────────────────────────────────────────────────────────────

function scoreToLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Expert",     color: "text-primary" };
  if (score >= 65) return { label: "Proficient", color: "text-emerald-400" };
  if (score >= 50) return { label: "Developing", color: "text-amber-400" };
  if (score >= 35) return { label: "Beginner",   color: "text-orange-400" };
  return              { label: "Novice",      color: "text-red-400" };
}

// ── Domain insight text ────────────────────────────────────────────────────────

function domainInsight(key: string, score: number): string {
  const level = score >= 65 ? "strong" : score >= 45 ? "developing" : "early";
  const insights: Record<string, Record<string, string>> = {
    ai_interaction: {
      strong:     "You interact with AI tools effectively — crafting precise prompts and iterating well.",
      developing: "Your AI interaction skills are developing — focus on prompt structure and iteration.",
      early:      "Building foundational AI interaction skills is your priority right now.",
    },
    ai_output_evaluation: {
      strong:     "You critically evaluate AI outputs before acting — a key capability in HR.",
      developing: "You're building the habit of validating AI outputs before relying on them.",
      early:      "Learning to question and verify AI outputs will significantly reduce risk.",
    },
    ai_ethics_trust: {
      strong:     "You demonstrate strong ethical awareness in AI use — bias, fairness, and accountability.",
      developing: "Your ethical AI awareness is growing — keep exploring bias and accountability frameworks.",
      early:      "Understanding AI ethics and risk is foundational to safe HR AI practice.",
    },
    ai_change_leadership: {
      strong:     "You're well-placed to lead AI adoption and manage change in your organisation.",
      developing: "Your change leadership capability is developing — focus on stakeholder communication.",
      early:      "Building confidence in leading AI change will unlock significant impact.",
    },
    ai_workflow_design: {
      strong:     "You design effective AI-augmented workflows — integrating tools into real processes.",
      developing: "You're learning to embed AI into workflows systematically.",
      early:      "Exploring how AI fits into your day-to-day HR processes is the right starting point.",
    },
    workforce_ai_readiness: {
      strong:     "You can assess and build AI readiness across your workforce effectively.",
      developing: "Your ability to assess and build workforce AI readiness is growing.",
      early:      "Understanding how to develop AI capability in others is a key development area.",
    },
  };
  return insights[key]?.[level] ?? "This domain measures your practical AI capability in a specific area.";
}

// ── Spider Chart ───────────────────────────────────────────────────────────────

function SpiderChart({ domains }: {
  domains: Array<{ key: string; displayName: string; score: number; colour: string }>;
}) {
  const data = domains.map(d => ({
    subject: d.displayName.replace("AI ", "").replace("Workforce ", ""),
    score: Math.round(d.score),
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={data} margin={{ top: 20, right: 50, bottom: 20, left: 50 }}>
        <PolarGrid stroke="rgba(255,255,255,0.20)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 500 }}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="var(--primary)"
          fill="var(--primary)"
          fillOpacity={0.15}
          strokeWidth={2}
          dot={{ fill: "var(--primary)", r: 4, strokeWidth: 0 }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--foreground)",
            fontSize: "13px",
          }}
          formatter={(value: number) => [`${value}/100`, "Score"]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Domain Card ────────────────────────────────────────────────────────────────

function DomainCard({
  domainKey, displayName, score, colour, quadrant, signals, onClick,
}: {
  domainKey: string; displayName: string; score: number;
  colour: string; quadrant?: string;
  signals?: Array<{ key: string; label: string; normScore: number; isRisk: boolean }>;
  onClick: () => void;
}) {
  const Icon = DOMAIN_ICONS[domainKey] ?? Target;
  const level = scoreToLevel(score);
  const isBlindSpot = quadrant === "unconscious_incompetence";
  const isStrength = score >= 70;

  // Show top 3 signals (best + worst to give a balanced view)
  const topSignals = signals && signals.length > 0
    ? signals.slice(0, Math.min(3, signals.length))
    : [];

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border bg-card p-5 hover:bg-accent/30 transition-all duration-200 hover:border-primary/30 group"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${colour}20` }}
          >
            <Icon className="w-4 h-4" style={{ color: colour }} />
          </div>
          <p className="text-sm font-semibold text-foreground leading-tight">{displayName}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isBlindSpot && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/25">
              Blind spot
            </span>
          )}
          {isStrength && !isBlindSpot && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/12 text-primary border border-primary/25">
              Strength
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>

      {/* Overall score row */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={cn("text-xs font-medium", level.color)}>{level.label}</span>
        <span className="text-lg font-bold text-foreground tabular-nums">
          {Math.round(score)}
          <span className="text-xs text-muted-foreground font-normal">/100</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.round(score)}%`, backgroundColor: colour }}
        />
      </div>

      {/* Sub-domain signal bars */}
      {topSignals.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-border/60">
          {topSignals.map(sig => {
            const barColor = sig.isRisk
              ? sig.normScore >= 70 ? "oklch(0.72 0.19 142)" : sig.normScore >= 50 ? "oklch(0.75 0.18 60)" : "oklch(0.65 0.22 25)"
              : `${colour}${sig.normScore >= 70 ? "" : sig.normScore >= 50 ? "aa" : "66"}`;
            return (
              <div key={sig.key}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-muted-foreground truncate mr-2">
                    {sig.isRisk && <span className="text-amber-400 mr-1">▲</span>}
                    {sig.label}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums shrink-0" style={{ color: barColor }}>{sig.normScore}</span>
                </div>
                <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${sig.normScore}%`, backgroundColor: barColor }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

// ── Domain Detail Sheet ────────────────────────────────────────────────────────

function DomainSheet({
  open, onClose, sessionId, domainKey, displayName, score, colour,
  quadrant, quadrantLabel,
}: {
  open: boolean; onClose: () => void; sessionId: string; domainKey: string;
  displayName: string; score: number; colour: string;
  quadrant?: string; quadrantLabel?: string; quadrantDescription?: string;
}) {
  const [, navigate] = useLocation();
  const Icon = DOMAIN_ICONS[domainKey] ?? Target;
  const level = scoreToLevel(score);
  const isBlindSpot = quadrant === "unconscious_incompetence";
  const isStrength = score >= 70;
  const circumference = 2 * Math.PI * 40;

  // AI-generated deep dive — cached so it only runs once per domain
  const { data: deepDiveData, isLoading: deepDiveLoading } = trpc.assessment.generateDomainDeepDive.useQuery(
    { sessionId, domainKey, domainName: displayName, score, quadrant, quadrantLabel },
    { enabled: open && !!sessionId, staleTime: Infinity, retry: 1 }
  );

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border">
        <SheetHeader className="mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${colour}20` }}
            >
              <Icon className="w-5 h-5" style={{ color: colour }} />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold text-foreground">{displayName}</SheetTitle>
              <p className={cn("text-xs font-medium mt-0.5", level.color)}>{level.label}</p>
            </div>
          </div>
        </SheetHeader>

        {/* Score ring + level */}
        <div className="flex items-center gap-5 mb-6 p-4 rounded-xl border border-border bg-background/40">
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="oklch(0.30 0.05 264)" strokeWidth="12" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={colour}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-foreground tabular-nums">{Math.round(score)}</span>
              <span className="text-[10px] text-muted-foreground">/100</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {isBlindSpot ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : isStrength ? (
                <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              {quadrantLabel && (
                <span className={cn(
                  "text-xs font-semibold",
                  isBlindSpot ? "text-amber-400" : isStrength ? "text-primary" : "text-foreground"
                )}>{quadrantLabel}</span>
              )}
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.round(score)}%`, backgroundColor: colour }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">Novice</span>
              <span className="text-[10px] text-muted-foreground">Expert</span>
            </div>
          </div>
        </div>

        {/* AI Deep Dive */}
        <div className="rounded-xl border border-border bg-background/40 p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Analysis</span>
          </div>
          {deepDiveLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-3.5 w-full mt-3" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3.5 w-full mt-3" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          ) : deepDiveData?.deepDive ? (
            <div className="text-sm text-foreground leading-relaxed space-y-3">
              {deepDiveData.deepDive.split(/\n\n+/).map((para: string, i: number) => (
                <p key={i}>{para.trim()}</p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {domainInsight(domainKey, score)}
            </p>
          )}
        </div>

        {/* Signal Breakdown Chart */}
        {deepDiveData?.signals && deepDiveData.signals.length > 0 && (
          <SignalBreakdownChart signals={deepDiveData.signals} domainColour={colour} />
        )}
        {deepDiveLoading && (
          <div className="rounded-xl border border-border bg-background/40 p-4 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-3 w-6" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dev link */}
        <Button
          className="w-full gap-2"
          onClick={() => { navigate(`/learning-plan?domain=${domainKey}`); onClose(); }}
        >
          <BookOpen className="w-4 h-4" />
          View development for {displayName}
        </Button>
      </SheetContent>
    </Sheet>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

function ResultsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-80 w-full rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AssessmentResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isStartingReassess, setIsStartingReassess] = useState(false);

  const { data: defaultBlueprint } = trpc.assessment.defaultBlueprint.useQuery();
  const { data: allSessions } = trpc.assessment.history.useQuery({});
  const startMutation = trpc.assessment.startSession.useMutation({
    onSuccess: result => {
      navigate(`/assessment/${result.sessionId}`);
    },
    onError: err => {
      toast.error(err.message);
      setIsStartingReassess(false);
    },
  });

  const handleReassess = () => {
    if (!defaultBlueprint?.id) {
      toast.error("No assessment blueprint available.");
      return;
    }
    setIsStartingReassess(true);
    // Reuse the same roleHint from the current session's metadata
    const meta = (data?.session?.sessionMetadataJson ?? {}) as Record<string, unknown>;
    const roleHint = (meta.roleHint as string) ?? undefined;
    startMutation.mutate({ blueprintId: defaultBlueprint.id, roleHint });
  };

  const { data, isLoading, error } = trpc.assessment.results.useQuery(
    { sessionId },
    { enabled: !!sessionId }
  );
  const summaryQuery = trpc.assessment.generateSummary.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId, staleTime: Infinity }
  );
  useEffect(() => {
    if (summaryQuery.data?.summary) setSummary(summaryQuery.data.summary);
  }, [summaryQuery.data]);

  if (isLoading) return <ResultsSkeleton />;

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Could not load assessment results.</p>
        <Button variant="outline" onClick={() => navigate("/assessment")}>
          Back to Assessment
        </Button>
      </div>
    );
  }

  const { session, score, competenceConfidenceMatrix, signalScores: rawSignalScores } = data as any;
  const signalScores: Record<string, { sum: number; count: number }> = rawSignalScores ?? {};
  const overallScore: number = score.overallScore;
  const breakdown = score.breakdown as {
    readiness?: { state?: string };
    capabilityScores?: Record<string, { score: number; displayName: string; colour: string; signalCount: number }>;
  };
  const readinessState = breakdown?.readiness?.state ?? "unknown";
  const readinessConfig = READINESS_CONFIG[readinessState] ?? READINESS_CONFIG.unknown;
  const ReadinessIcon = readinessConfig.icon;

  const capabilityScores = breakdown?.capabilityScores ?? {};
  const domains = Object.entries(capabilityScores).map(([key, val]) => ({
    key,
    displayName: val.displayName,
    score: val.score,
    colour: val.colour ?? "#4477AA",
    signalCount: val.signalCount,
  }));

  const completedAt = session.completedAt
    ? new Date(session.completedAt).toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  const selectedDomainData = selectedDomain ? domains.find(d => d.key === selectedDomain) : null;
  const selectedMatrix = selectedDomain
    ? (competenceConfidenceMatrix as any[])?.find((m: any) => m.domain === selectedDomain)
    : null;

  const displayScore = (overallScore / 10).toFixed(1);
  const circumference = 2 * Math.PI * 38;

  // Build progress delta vs previous session
  const longitudinalData = (data as any)?.longitudinalData as Array<{
    sessionId: string; completedAt: Date | null; overallScore: number;
    capabilityScores: Record<string, number>;
  }> | undefined;
  // Current session is the last in longitudinalData; previous is second-to-last
  const prevSession = longitudinalData && longitudinalData.length >= 2
    ? longitudinalData[longitudinalData.length - 2]
    : null;
  const overallDelta = prevSession ? overallScore - prevSession.overallScore : null;

  const inProgressSession = allSessions?.find((s: any) => s.state === "in_progress" && s.id !== sessionId);

  return (
    <div className="space-y-8">
      {/* History dropdown + in-progress banner */}
      <div className="space-y-4">
        {allSessions && allSessions.length > 1 && (
          <HistoryDropdown sessions={allSessions} currentSessionId={sessionId!} />
        )}
        {inProgressSession && <InProgressBanner session={inProgressSession} />}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-8 mb-2">
        {/* Score ring */}
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="38" fill="none" stroke="oklch(0.30 0.05 264)" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="38" fill="none"
              stroke="var(--primary)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(overallScore / 100) * circumference} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-foreground tabular-nums">{displayScore}</span>
            <span className="text-[10px] text-muted-foreground">/10</span>
          </div>
        </div>

        {/* Text */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full border",
              readinessConfig.bg, readinessConfig.color, readinessConfig.border
            )}>
              <ReadinessIcon className="w-3.5 h-3.5" />
              {readinessConfig.label}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Your AI Capability Profile</h1>
          {completedAt && (
            <p className="text-sm text-muted-foreground mb-2">Completed {completedAt}</p>
          )}
          {/* AI summary */}
          {summaryQuery.isLoading && (
            <div className="flex items-center gap-2 mt-1">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse shrink-0" />
              <span className="text-xs text-muted-foreground italic">Generating your summary…</span>
            </div>
          )}
          {summary && (
            <div className="flex items-start gap-2 mt-1">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-2 text-foreground border-border hover:bg-accent"
          onClick={handleReassess}
          disabled={isStartingReassess || startMutation.isPending}
        >
          <RotateCcw className={cn("w-4 h-4", (isStartingReassess || startMutation.isPending) && "animate-spin")} />
          {isStartingReassess || startMutation.isPending ? "Starting…" : "Reassess"}
        </Button>
      </div>

      {/* Progress vs previous assessment */}
      {prevSession && (
        <div className="rounded-2xl border border-border bg-card p-7 mb-0" style={{ boxShadow: "var(--card-shadow)" }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary shrink-0" />
            <h2 className="text-xs font-semibold text-primary uppercase tracking-widest">Progress Since Last Assessment</h2>
            {prevSession.completedAt && (
              <span className="ml-auto text-xs text-muted-foreground">
                vs {new Date(prevSession.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
          </div>

          {/* Overall delta */}
          <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-background/40 border border-border">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-0.5">Overall Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground tabular-nums">{(overallScore / 10).toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">/10</span>
                {overallDelta !== null && (
                  <span className={cn(
                    "text-sm font-semibold tabular-nums",
                    overallDelta > 0 ? "text-primary" : overallDelta < 0 ? "text-red-400" : "text-muted-foreground"
                  )}>
                    {overallDelta > 0 ? `+${overallDelta.toFixed(1)}` : overallDelta.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Previous</p>
              <span className="text-lg font-semibold text-muted-foreground tabular-nums">{(prevSession.overallScore / 10).toFixed(1)}</span>
            </div>
          </div>

          {/* Per-domain deltas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {domains.map(domain => {
              const prev = prevSession.capabilityScores[domain.key];
              const delta = prev !== undefined ? domain.score - prev : null;
              return (
                <div key={domain.key} className="p-4 rounded-lg bg-background/40 border border-border">
                  <p className="text-[10px] text-muted-foreground truncate mb-1" title={domain.displayName}>{domain.displayName}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold text-foreground tabular-nums">{Math.round(domain.score)}</span>
                    {delta !== null && (
                      <span className={cn(
                        "text-[11px] font-semibold tabular-nums",
                        delta > 0 ? "text-primary" : delta < 0 ? "text-red-400" : "text-muted-foreground"
                      )}>
                        {delta > 0 ? `+${Math.round(delta)}` : Math.round(delta)}
                      </span>
                    )}
                  </div>
                  <div className="h-1 rounded-full bg-muted/60 mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.round(domain.score)}%`, backgroundColor: domain.colour }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Capability Profile — two-column: spider left, domain bars right */}
      {domains.length > 0 && (
        <div
          className="rounded-2xl border border-border bg-card p-8 aiq-chart-mount"
          style={{ boxShadow: "var(--card-shadow)" }}
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Capability Profile
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your scores across all {domains.length} capability domains
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left: spider chart */}
            <div className="pt-2">
              <SpiderChart domains={domains} />
            </div>
            {/* Right: domain score bars */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Domain Breakdown</p>
              {[...domains].sort((a, b) => b.score - a.score).map(domain => {
                const level = scoreToLevel(domain.score);
                return (
                  <div key={domain.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground">{domain.displayName}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-medium", level.color)}>{level.label}</span>
                        <span className="text-sm font-bold text-foreground tabular-nums w-8 text-right">
                          {Math.round(domain.score)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.round(domain.score)}%`, backgroundColor: domain.colour }}
                      />
                    </div>
                  </div>
                );
              })}
              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-3 border-t border-border">
                {[
                  { label: "Expert", color: "text-primary", min: 80 },
                  { label: "Proficient", color: "text-emerald-400", min: 65 },
                  { label: "Developing", color: "text-amber-400", min: 50 },
                  { label: "Beginner", color: "text-orange-400", min: 35 },
                  { label: "Novice", color: "text-red-400", min: 0 },
                ].map(tier => (
                  <span key={tier.label} className={cn("text-[11px] font-medium", tier.color)}>
                    {tier.label} {tier.min > 0 ? `≥${tier.min}` : `<35`}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Domain cards */}
      {domains.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">
            Domain Scores
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {domains.map(domain => {
              const matrix = (competenceConfidenceMatrix as any[])?.find((m: any) => m.domain === domain.key);
              const domainSignals = computeDomainSignals(signalScores, domain.key);
              return (
                <DomainCard
                  key={domain.key}
                  domainKey={domain.key}
                  displayName={domain.displayName}
                  score={domain.score}
                  colour={domain.colour}
                  quadrant={matrix?.quadrant}
                  signals={domainSignals}
                  onClick={() => setSelectedDomain(domain.key)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Domain detail sheet */}
      {selectedDomainData && (
        <DomainSheet
          open={!!selectedDomain}
          onClose={() => setSelectedDomain(null)}
          sessionId={sessionId!}
          domainKey={selectedDomainData.key}
          displayName={selectedDomainData.displayName}
          score={selectedDomainData.score}
          colour={selectedDomainData.colour}
          quadrant={selectedMatrix?.quadrant}
          quadrantLabel={selectedMatrix?.quadrantLabel}
          quadrantDescription={selectedMatrix?.quadrantDescription}
        />
      )}
    </div>
  );
}
