/**
 * StrategyBuilderWizard
 * 3-step wizard for CPOs to set the AI People Strategy.
 *
 * Step 1 – Business Ambition (how aggressively the org adopts AI)
 * Step 2 – People Ambition  (how much HR people lead vs follow)
 * Step 3 – Domain Targets   (auto-calculated, CPO can fine-tune)
 *
 * Methodology:
 *   baseTarget = (businessAmbition * 0.55 + peopleAmbition * 0.45) * 20  → 0-100
 *   Each domain gets a weight multiplier based on its strategic relevance
 *   at that ambition level. CPO can override each domain slider.
 *   overallTarget = weighted mean of domain targets.
 */
import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { DOMAIN_KEYS, DOMAIN_LABELS, DOMAIN_COLOURS } from "@/lib/domains";
import { ChevronRight, ChevronLeft, CheckCircle2, Zap, Target, BookOpen, Shield, TrendingUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type DomainKey = typeof DOMAIN_KEYS[number];

interface WizardProps {
  initialData?: {
    businessAmbitionLevel: number | null;
    peopleAmbitionLevel: number | null;
    domainTargets: Record<string, number> | null;
    strategyNarrative: string | null;
    ambitionTargetDate: string | null;
    ambitionTargetLabel: string | null;
    currentDomainScores?: Record<string, number | null> | null;
  } | null;
  onSaved: () => void;
  onCancel: () => void;
}

// ─── Ambition level descriptors ───────────────────────────────────────────────
const BUSINESS_LEVELS: Record<number, { label: string; description: string; icon: React.ReactNode }> = {
  1: { label: "Cautious", description: "AI is used selectively in low-risk, back-office processes. Compliance and stability are the priority.", icon: <Shield className="w-5 h-5" /> },
  2: { label: "Exploratory", description: "Piloting AI in specific workflows. Building internal confidence before wider rollout.", icon: <BookOpen className="w-5 h-5" /> },
  3: { label: "Progressive", description: "AI is embedded in core HR processes. The organisation expects HR to use AI tools confidently.", icon: <TrendingUp className="w-5 h-5" /> },
  4: { label: "Ambitious", description: "AI is a strategic differentiator. HR is expected to lead AI adoption across the business.", icon: <Target className="w-5 h-5" /> },
  5: { label: "Transformative", description: "AI is central to the business model. HR people are expected to be AI-native practitioners.", icon: <Zap className="w-5 h-5" /> },
};

const PEOPLE_LEVELS: Record<number, { label: string; description: string; icon: React.ReactNode }> = {
  1: { label: "Followers", description: "HR people use AI tools as directed. Compliance with policy is the primary expectation.", icon: <Shield className="w-5 h-5" /> },
  2: { label: "Adopters", description: "HR people are expected to learn and use AI tools in their day-to-day work.", icon: <BookOpen className="w-5 h-5" /> },
  3: { label: "Practitioners", description: "HR people apply AI confidently, evaluate outputs critically, and adapt workflows.", icon: <TrendingUp className="w-5 h-5" /> },
  4: { label: "Champions", description: "HR people advocate for AI, coach others, and contribute to AI governance.", icon: <Target className="w-5 h-5" /> },
  5: { label: "Innovators", description: "HR people design AI-enabled processes, lead change, and shape the organisation's AI strategy.", icon: <Zap className="w-5 h-5" /> },
};

// ─── Domain weight multipliers per (businessLevel, peopleLevel) ───────────────
// Each domain has a base weight; multipliers shift emphasis based on ambition.
// Higher business ambition → more weight on workflow design & change leadership.
// Higher people ambition → more weight on ethics, interaction, output evaluation.
function computeDomainTargets(businessLevel: number, peopleLevel: number): Record<DomainKey, number> {
  // Base target (0-100 raw, maps to 0-10 capability score)
  const base = Math.round((businessLevel * 0.55 + peopleLevel * 0.45) * 20);

  // Domain-specific adjustments (delta from base, clamped 0-100)
  const adjustments: Record<DomainKey, number> = {
    ai_interaction:         Math.round(base + (peopleLevel - 3) * 3),
    ai_output_evaluation:   Math.round(base + (peopleLevel - 3) * 4),
    ai_workflow_design:     Math.round(base + (businessLevel - 3) * 5),
    workforce_ai_readiness: Math.round(base + (businessLevel - 3) * 3),
    ai_ethics_trust:        Math.round(base + (peopleLevel - 3) * 2 + (businessLevel - 3) * 2),
    ai_change_leadership:   Math.round(base + (businessLevel - 3) * 4 + (peopleLevel - 3) * 2),
  };

  // Clamp to [20, 100]
  const result = {} as Record<DomainKey, number>;
  for (const key of DOMAIN_KEYS) {
    result[key] = Math.max(20, Math.min(100, adjustments[key]));
  }
  return result;
}

function overallFromDomains(targets: Record<DomainKey, number>): number {
  const vals = DOMAIN_KEYS.map(k => targets[k]);
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

// ─── Slider row ───────────────────────────────────────────────────────────────
function DomainSliderRow({ domainKey, value, onChange, currentScore }: { domainKey: DomainKey; value: number; onChange: (v: number) => void; currentScore?: number | null }) {
  const colour = DOMAIN_COLOURS[domainKey];
  const level = (value / 10).toFixed(1);
  const gap = (currentScore !== null && currentScore !== undefined) ? value - currentScore : null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{DOMAIN_LABELS[domainKey]}</span>
        <div className="flex items-center gap-2">
          {currentScore !== null && currentScore !== undefined && (
            <span className="text-xs text-muted-foreground">Now: {(currentScore / 10).toFixed(1)}</span>
          )}
          {gap !== null && gap > 0 && (
            <span className="text-xs font-medium text-amber-400">+{(gap / 10).toFixed(1)} gap</span>
          )}
          <span className="text-sm font-semibold tabular-nums" style={{ color: colour }}>Target: {level}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Slider
          min={20} max={100} step={5}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          className="flex-1"
          style={{ "--slider-track-color": colour } as React.CSSProperties}
        />
        <span className="text-xs text-muted-foreground w-10 text-right">{value}/100</span>
      </div>
    </div>
  );
}

// ─── Ambition card ────────────────────────────────────────────────────────────
function AmbitionCard({ level, levels, value, onChange, label }: {
  level: number; levels: typeof BUSINESS_LEVELS; value: number; onChange: (v: number) => void; label: string;
}) {
  const info = levels[value] ?? levels[3];
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card/60">
        <span className="text-primary">{info.icon}</span>
        <div>
          <p className="text-base font-semibold text-foreground">{info.label}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{info.description}</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Cautious</span><span>Transformative</span>
        </div>
        <Slider min={1} max={5} step={1} value={[value]} onValueChange={([v]) => onChange(v)} />
        <div className="flex justify-between">
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`w-8 h-8 rounded-full text-xs font-semibold transition-all ${value === n ? "bg-primary text-primary-foreground scale-110" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >{n}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────
export default function StrategyBuilderWizard({ initialData, onSaved, onCancel }: WizardProps) {
  const currentDomainScores = initialData?.currentDomainScores ?? null;
  const utils = trpc.useUtils();
  const [step, setStep] = useState(0);
  const [businessLevel, setBusinessLevel] = useState<number>(initialData?.businessAmbitionLevel ?? 3);
  const [peopleLevel, setPeopleLevel] = useState<number>(initialData?.peopleAmbitionLevel ?? 3);
  const [narrative, setNarrative] = useState(initialData?.strategyNarrative ?? "");
  const [targetDate, setTargetDate] = useState(initialData?.ambitionTargetDate ?? "");
  const [targetLabel, setTargetLabel] = useState(initialData?.ambitionTargetLabel ?? "");

  // Auto-calculate domain targets whenever ambition levels change
  const autoTargets = useMemo(() => computeDomainTargets(businessLevel, peopleLevel), [businessLevel, peopleLevel]);

  // Allow CPO to override per-domain
  const [domainOverrides, setDomainOverrides] = useState<Record<DomainKey, number> | null>(
    initialData?.domainTargets
      ? (initialData.domainTargets as Record<DomainKey, number>)
      : null
  );

  const domainTargets = useMemo<Record<DomainKey, number>>(() => {
    return domainOverrides ?? autoTargets;
  }, [domainOverrides, autoTargets]);

  const overallTarget = useMemo(() => overallFromDomains(domainTargets), [domainTargets]);

  // Reset overrides when ambition levels change (unless user has manually adjusted)
  const handleBusinessChange = useCallback((v: number) => {
    setBusinessLevel(v);
    setDomainOverrides(null); // reset overrides so auto-calc kicks in
  }, []);
  const handlePeopleChange = useCallback((v: number) => {
    setPeopleLevel(v);
    setDomainOverrides(null);
  }, []);

  const handleDomainChange = useCallback((key: DomainKey, value: number) => {
    setDomainOverrides(prev => ({
      ...(prev ?? autoTargets),
      [key]: value,
    }));
  }, [autoTargets]);

  const saveStrategy = trpc.intelligence.saveStrategy.useMutation({
    onSuccess: () => {
      toast.success("AI People Strategy saved successfully.");
      utils.intelligence.getStrategy.invalidate();
      utils.dashboardV2.leader.ambitionGap.invalidate();
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSave() {
    saveStrategy.mutate({
      businessAmbitionLevel: businessLevel,
      peopleAmbitionLevel: peopleLevel,
      domainTargets,
      strategyNarrative: narrative || undefined,
      ambitionTargetScore: overallTarget,
      ambitionTargetDate: targetDate || null,
      ambitionTargetLabel: targetLabel || null,
    });
  }

  const STEPS = [
    { title: "Business Ambition", subtitle: "How aggressively is your organisation adopting AI?" },
    { title: "People Ambition", subtitle: "What level of AI capability do you expect from your HR people?" },
    { title: "Domain Capability Targets", subtitle: "Review and fine-tune the target capability level for each domain." },
    { title: "Confirm & Save", subtitle: "Review your strategy before saving." },
  ];

  return (
    <div className="flex flex-col gap-0 bg-card rounded-2xl border border-border shadow-xl overflow-hidden max-w-2xl w-full mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-0 border-b border-border bg-muted/30">
        {STEPS.map((s, i) => (
          <div key={i} className={`flex-1 px-3 py-3 text-center transition-all ${i === step ? "bg-primary/10 border-b-2 border-primary" : ""}`}>
            <p className={`text-xs font-semibold ${i === step ? "text-primary" : i < step ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
              {i < step ? "✓ " : ""}{s.title}
            </p>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{STEPS[step].title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{STEPS[step].subtitle}</p>
        </div>

        {step === 0 && (
          <AmbitionCard level={businessLevel} levels={BUSINESS_LEVELS} value={businessLevel} onChange={handleBusinessChange} label="Business Ambition" />
        )}

        {step === 1 && (
          <AmbitionCard level={peopleLevel} levels={PEOPLE_LEVELS} value={peopleLevel} onChange={handlePeopleChange} label="People Ambition" />
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
              <div>
                <p className="text-xs text-muted-foreground">Calculated overall target</p>
                <p className="text-xl font-bold text-foreground">Level {(overallTarget / 10).toFixed(1)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Based on Business {businessLevel} · People {peopleLevel}</p>
                {domainOverrides && <p className="text-xs text-amber-400 mt-0.5">Custom adjustments applied</p>}
                {!domainOverrides && <p className="text-xs text-green-400 mt-0.5">Auto-calculated</p>}
              </div>
            </div>
            <div className="space-y-4">
              {DOMAIN_KEYS.map(key => (
                <DomainSliderRow
                  key={key}
                  domainKey={key}
                  value={domainTargets[key]}
                  onChange={v => handleDomainChange(key, v)}
                  currentScore={currentDomainScores?.[key] ?? null}
                />
              ))}
            </div>
            {domainOverrides && (
              <button
                className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
                onClick={() => setDomainOverrides(null)}
              >
                Reset to auto-calculated targets
              </button>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg p-3 bg-muted/40 border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">Business Ambition</p>
                <p className="text-2xl font-bold text-foreground">{businessLevel}</p>
                <p className="text-xs text-muted-foreground">{BUSINESS_LEVELS[businessLevel]?.label}</p>
              </div>
              <div className="rounded-lg p-3 bg-muted/40 border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">People Ambition</p>
                <p className="text-2xl font-bold text-foreground">{peopleLevel}</p>
                <p className="text-xs text-muted-foreground">{PEOPLE_LEVELS[peopleLevel]?.label}</p>
              </div>
              <div className="rounded-lg p-3 bg-primary/10 border border-primary/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">Overall Target</p>
                <p className="text-2xl font-bold text-primary">Level {(overallTarget / 10).toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Capability score</p>
              </div>
            </div>

            {/* Domain targets summary */}
            <div className="rounded-lg border border-border overflow-hidden">
              {DOMAIN_KEYS.map((key, i) => (
                <div key={key} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                  <span className="text-sm text-foreground">{DOMAIN_LABELS[key]}</span>
                  <span className="text-sm font-semibold" style={{ color: DOMAIN_COLOURS[key] }}>
                    Level {(domainTargets[key] / 10).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>

            {/* Optional fields */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Target date (optional)</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Strategy label (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. AI-Ready HR by 2026"
                  value={targetLabel}
                  onChange={e => setTargetLabel(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Strategic narrative (optional)</label>
                <Textarea
                  placeholder="Describe the strategic intent behind this capability target…"
                  value={narrative}
                  onChange={e => setNarrative(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
        <Button variant="outline" size="sm" onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}>
          {step === 0 ? "Cancel" : <><ChevronLeft className="w-4 h-4 mr-1" />Back</>}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button size="sm" onClick={() => setStep(s => s + 1)} className="gap-1">
            Next<ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button size="sm" disabled={saveStrategy.isPending} onClick={handleSave} className="gap-1.5 bg-primary text-primary-foreground">
            {saveStrategy.isPending ? "Saving…" : <><CheckCircle2 className="w-4 h-4" />Save Strategy</>}
          </Button>
        )}
      </div>
    </div>
  );
}
