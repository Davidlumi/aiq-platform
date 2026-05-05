/**
 * AIStrategyPage — Redesigned
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  STRATEGY CONTROL PANEL  (sticky top bar)               │
 *   │  Business Ambition ▾  People Ambition ▾  Target Date    │
 *   │  Strategy Label                          [Save]         │
 *   └─────────────────────────────────────────────────────────┘
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  OUTPUT DASHBOARD                                        │
 *   │  Strategic finding hero · KPI tiles · Board options     │
 *   │  Capability vs roadmap bars                             │
 *   │  Trajectory chart                                       │
 *   │  Strategic findings                                     │
 *   └─────────────────────────────────────────────────────────┘
 */
import { useMemo, useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Target, Save, CheckCircle2, ChevronDown, Info } from "lucide-react";
import { getLevelChipStyle, getLevelFromScore, getPreciseLevel } from "@/lib/level-utils";
import { DOMAIN_KEYS, DOMAIN_LABELS, DOMAIN_COLOURS } from "@/lib/domains";
import type { CapabilityKey } from "@/lib/domains";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const BUSINESS_LEVELS: Record<number, { label: string; description: string }> = {
  1: { label: "Cautious",      description: "AI used selectively in low-risk back-office processes" },
  2: { label: "Exploratory",   description: "Piloting AI in specific workflows" },
  3: { label: "Progressive",   description: "AI embedded in core HR processes" },
  4: { label: "Ambitious",     description: "AI is a strategic differentiator" },
  5: { label: "Transformative",description: "AI is central to the business model" },
};

const PEOPLE_LEVELS: Record<number, { label: string; description: string }> = {
  1: { label: "Followers",    description: "HR people use AI tools as directed" },
  2: { label: "Adopters",     description: "Learning and using AI tools day-to-day" },
  3: { label: "Practitioners",description: "Apply AI confidently, evaluate outputs critically" },
  4: { label: "Champions",    description: "Advocate for AI, coach others, contribute to governance" },
  5: { label: "Innovators",   description: "Design AI-enabled processes, lead change" },
};

type DomainKey = typeof DOMAIN_KEYS[number];

function computeDomainTargets(businessLevel: number, peopleLevel: number): Record<DomainKey, number> {
  const base = Math.round((businessLevel * 0.55 + peopleLevel * 0.45) * 20);
  const adjustments: Record<DomainKey, number> = {
    ai_interaction:         Math.round(base + (peopleLevel - 3) * 3),
    ai_output_evaluation:   Math.round(base + (peopleLevel - 3) * 4),
    ai_workflow_design:     Math.round(base + (businessLevel - 3) * 5),
    workforce_ai_readiness: Math.round(base + (businessLevel - 3) * 3),
    ai_ethics_trust:        Math.round(base + (peopleLevel - 3) * 2 + (businessLevel - 3) * 2),
    ai_change_leadership:   Math.round(base + (businessLevel - 3) * 4 + (peopleLevel - 3) * 2),
  };
  const result = {} as Record<DomainKey, number>;
  for (const key of DOMAIN_KEYS) result[key] = Math.max(20, Math.min(100, adjustments[key]));
  return result;
}

function overallFromDomains(targets: Record<DomainKey, number>): number {
  const vals = DOMAIN_KEYS.map(k => targets[k]);
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoadmapBar({ label, sub, currentScore, targetScore, status }: {
  label: string; sub?: string; currentScore: number | null; targetScore: number | null;
  status: "aligned" | "partial" | "gap" | "unknown";
}) {
  const STATUS_PILL: Record<string, { label: string; bg: string; text: string }> = {
    aligned: { label: "On track",   bg: "oklch(18% 0.040 142)", text: "#4ADE80" },
    partial:  { label: "Developing", bg: "oklch(18% 0.040 250)", text: "#60A5FA" },
    gap:      { label: "Behind",     bg: "oklch(18% 0.040 68)",  text: "#FCD34D" },
    unknown:  { label: "No data",    bg: "oklch(17% 0.028 240)", text: "#9CA3AF" },
  };
  const pill = STATUS_PILL[status] ?? STATUS_PILL.unknown;
  const currentPct = currentScore !== null ? (currentScore / 100) * 100 : 0;
  const targetPct = targetScore !== null ? (targetScore / 100) * 100 : 80;
  const chipStyle = currentScore !== null ? getLevelChipStyle(getLevelFromScore(currentScore)) : null;

  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: pill.bg, color: pill.text }}>{pill.label}</span>
      </div>
      <div className="relative h-4 rounded" style={{ background: "oklch(22% 0.030 240)" }}>
        {currentScore !== null && (
          <div className="absolute top-0 left-0 h-full rounded transition-all duration-700" style={{ width: `${currentPct}%`, background: chipStyle?.bg ?? "#475569" }} />
        )}
        <div className="absolute top-[-4px] h-6 w-0.5" style={{ left: `${targetPct}%`, background: "oklch(72.3% 0.220 142)" }} />
        <span className="absolute text-xs font-medium whitespace-nowrap" style={{ top: -20, left: `${targetPct}%`, transform: "translateX(-50%)", color: "oklch(72.3% 0.220 142)" }}>
          TARGET {targetScore !== null ? getPreciseLevel(targetScore) : "-"}
        </span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-muted-foreground">0</span>
        <span className="text-xs font-medium text-foreground">Currently {currentScore !== null ? getPreciseLevel(currentScore) : "-"}</span>
        <span className="text-xs text-muted-foreground">5</span>
      </div>
    </div>
  );
}

function TrajectoryChart({ domains, targetScore, targetDate }: {
  domains: Array<{ domain: string; timeSeries: Array<{ date: string; avgScore: number | null }>; currentValue: number | null; delta90d: number | null }>;
  targetScore: number | null; targetDate: string | null;
}) {
  const allMonths = new Set<string>();
  for (const d of domains) for (const p of d.timeSeries) allMonths.add(p.date);
  const months = Array.from(allMonths).sort();
  if (months.length === 0) return null;

  const monthlyAvg = months.map(m => {
    const vals = domains.map(d => d.timeSeries.find(p => p.date === m)?.avgScore).filter(v => v !== null && v !== undefined) as number[];
    return { date: m, avg: vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null };
  });

  const W = 700; const H = 220; const PAD_L = 50; const PAD_R = 20; const PAD_T = 30; const PAD_B = 40;
  const chartW = W - PAD_L - PAD_R; const chartH = H - PAD_T - PAD_B;

  function scoreToY(score: number) { return PAD_T + (1 - score / 100) * chartH; }
  function idxToX(i: number, total: number) { return PAD_L + (i / Math.max(total - 1, 1)) * chartW; }

  const validPts = monthlyAvg.filter(m => m.avg !== null);
  const actualPts = validPts.map((m, i) => ({ x: idxToX(i, validPts.length), y: scoreToY(m.avg!) }));
  const actualPolyline = actualPts.map(p => `${p.x},${p.y}`).join(" ");

  let projPts: Array<{ x: number; y: number }> = [];
  if (validPts.length >= 2 && targetScore !== null) {
    const lastPt = actualPts[actualPts.length - 1];
    const prevPt = actualPts[Math.max(0, actualPts.length - 3)];
    const slopePerStep = (lastPt.y - prevPt.y) / Math.max(actualPts.length - 1, 1);
    const targetY = scoreToY(targetScore);
    const stepsNeeded = slopePerStep !== 0 ? Math.abs((targetY - lastPt.y) / slopePerStep) : 12;
    const steps = Math.min(Math.ceil(stepsNeeded), 24);
    projPts = [lastPt];
    for (let i = 1; i <= steps; i++) {
      projPts.push({ x: lastPt.x + (i / steps) * chartW * 0.5, y: Math.max(PAD_T, lastPt.y + slopePerStep * i) });
    }
  }
  const projPolyline = projPts.map(p => `${p.x},${p.y}`).join(" ");
  const targetY = targetScore !== null ? scoreToY(targetScore) : null;
  const levelLines = [20, 40, 60, 80, 100].map(score => ({ score, y: scoreToY(score), label: (score / 10).toFixed(0) }));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="aiq-chart-mount" style={{ width: "100%", height: H }}>
        {levelLines.map(l => (
          <g key={l.score}>
            <line x1={PAD_L} y1={l.y} x2={W - PAD_R} y2={l.y} stroke="oklch(22% 0.030 240)" strokeWidth={0.5} strokeDasharray="2 2" />
            <text x={PAD_L - 8} y={l.y + 4} textAnchor="end" style={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "Sora, system-ui, sans-serif" }}>{l.label}</text>
          </g>
        ))}
        {targetY !== null && (
          <>
            <line x1={PAD_L} y1={targetY} x2={W - PAD_R} y2={targetY} stroke="oklch(72.3% 0.220 142)" strokeWidth={1.5} strokeDasharray="6 4" />
            <text x={W - PAD_R + 4} y={targetY + 4} style={{ fontSize: 10, fill: "oklch(72.3% 0.220 142)", fontWeight: 500, fontFamily: "Sora, system-ui, sans-serif" }}>
              {targetScore !== null ? getPreciseLevel(targetScore) : ""}
            </text>
          </>
        )}
        {actualPts.length >= 2 && <polyline points={actualPolyline} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinejoin="round" />}
        {actualPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === actualPts.length - 1 ? 5 : 4} fill="var(--primary)" />)}
        {projPts.length >= 2 && <polyline points={projPolyline} fill="none" stroke="var(--primary)" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="5 3" strokeLinejoin="round" />}
        {validPts.map((m, i) => {
          const x = idxToX(i, validPts.length);
          const [year, month] = m.date.split("-");
          const label = `${["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(month)]} ${year.slice(2)}`;
          if (i % Math.max(1, Math.floor(validPts.length / 6)) !== 0 && i !== validPts.length - 1) return null;
          return <text key={i} x={x} y={H - 8} textAnchor="middle" style={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "Sora, system-ui, sans-serif" }}>{label}</text>;
        })}
      </svg>
      <div className="flex gap-5 mt-3 pt-3" style={{ borderTop: "0.5px solid oklch(22% 0.030 240)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 18, height: 2.5, background: "#60A5FA", display: "inline-block" }} />
          <span className="text-xs text-muted-foreground">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 18, height: 2, background: "#557DAE", display: "inline-block" }} />
          <span className="text-xs text-muted-foreground">Projected at current pace</span>
        </div>
        {targetY !== null && (
          <div className="flex items-center gap-1.5">
            <span style={{ width: 18, height: 1.5, background: "oklch(72.3% 0.220 142)", display: "inline-block" }} />
            <span className="text-xs text-muted-foreground">Target threshold</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Strategy Control Panel ───────────────────────────────────────────────────

function StrategyControlPanel({
  businessLevel, setBusinessLevel,
  peopleLevel, setPeopleLevel,
  targetDate, setTargetDate,
  targetLabel, setTargetLabel,
  overallTarget,
  isDirty,
  isSaving,
  onSave,
  configured,
}: {
  businessLevel: number; setBusinessLevel: (v: number) => void;
  peopleLevel: number; setPeopleLevel: (v: number) => void;
  targetDate: string; setTargetDate: (v: string) => void;
  targetLabel: string; setTargetLabel: (v: string) => void;
  overallTarget: number;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  configured: boolean;
}) {
  return (
    <div
      className="rounded-xl border border-border bg-card shadow-md mb-5"
      style={{ background: "oklch(14% 0.025 240)" }}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">AI People Strategy Controls</span>
          {configured && !isDirty && (
            <Badge variant="outline" className="text-xs text-green-400 border-green-400/30 bg-green-400/10 ml-1">
              <CheckCircle2 className="w-3 h-3 mr-1" />Saved
            </Badge>
          )}
          {isDirty && (
            <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30 bg-amber-400/10 ml-1">
              Unsaved changes
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Overall target:</span>
          <span className="text-sm font-bold text-primary">Level {(overallTarget / 10).toFixed(1)}</span>
          <Button
            size="sm"
            disabled={!isDirty || isSaving}
            onClick={onSave}
            className="gap-1.5 text-xs h-7 px-3 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            <Save className="w-3 h-3" />
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Controls row */}
      <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">

        {/* Business Ambition */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Business Ambition</label>
          <Select value={String(businessLevel)} onValueChange={v => setBusinessLevel(Number(v))}>
            <SelectTrigger className="h-9 text-sm bg-background/60 border-border w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map(n => (
                <SelectItem key={n} value={String(n)}>
                  <span className="font-medium">{n} — {BUSINESS_LEVELS[n].label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground leading-snug">{BUSINESS_LEVELS[businessLevel]?.description}</p>
        </div>

        {/* People Ambition */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">People Ambition</label>
          <Select value={String(peopleLevel)} onValueChange={v => setPeopleLevel(Number(v))}>
            <SelectTrigger className="h-9 text-sm bg-background/60 border-border w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map(n => (
                <SelectItem key={n} value={String(n)}>
                  <span className="font-medium">{n} — {PEOPLE_LEVELS[n].label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground leading-snug">{PEOPLE_LEVELS[peopleLevel]?.description}</p>
        </div>

        {/* Target Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Target Date</label>
          <input
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-background/60 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">When should HR reach this level?</p>
        </div>

        {/* Strategy Label */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Strategy Label</label>
          <input
            type="text"
            placeholder="e.g. AI-Ready HR by 2026"
            value={targetLabel}
            onChange={e => setTargetLabel(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">Short name for this strategy</p>
        </div>
      </div>

      {/* Domain targets row — collapsible */}
      <DomainTargetsRow businessLevel={businessLevel} peopleLevel={peopleLevel} />
    </div>
  );
}

// ─── Domain targets expandable row ───────────────────────────────────────────

function DomainTargetsRow({ businessLevel, peopleLevel }: { businessLevel: number; peopleLevel: number }) {
  const [open, setOpen] = useState(false);
  const targets = useMemo(() => computeDomainTargets(businessLevel, peopleLevel), [businessLevel, peopleLevel]);

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="font-medium uppercase tracking-wider">Domain capability targets (auto-calculated)</span>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {DOMAIN_KEYS.map(key => (
              <span key={key} className="text-xs font-semibold" style={{ color: DOMAIN_COLOURS[key as CapabilityKey] }}>
                {(targets[key] / 10).toFixed(1)}
              </span>
            ))}
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="px-5 pb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          {DOMAIN_KEYS.map(key => (
            <div key={key} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: "oklch(17% 0.028 240)", border: "0.5px solid oklch(22% 0.030 240)" }}>
              <span className="text-xs text-muted-foreground">{DOMAIN_LABELS[key as CapabilityKey]}</span>
              <span className="text-sm font-bold ml-2" style={{ color: DOMAIN_COLOURS[key as CapabilityKey] }}>
                {(targets[key] / 10).toFixed(1)}
              </span>
            </div>
          ))}
          <div className="col-span-2 md:col-span-3 flex items-start gap-1.5 mt-1">
            <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Targets are auto-calculated from your ambition settings. To fine-tune individual domain targets, use the advanced strategy builder.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AIStrategyPage() {
  const utils = trpc.useUtils();

  const { data: ambitionGap, isLoading } = trpc.dashboardV2.leader.ambitionGap.useQuery(undefined, { retry: false } as any);
  const { data: trajectory } = trpc.dashboardV2.leader.domainTrajectory.useQuery(undefined);
  const { data: findings } = trpc.dashboardV2.leader.strategicFindings.useQuery(undefined);
  const { data: strategyData } = trpc.intelligence.getStrategy.useQuery(undefined, { retry: false } as any);

  // Control panel state — initialised from saved strategy
  const [businessLevel, setBusinessLevelRaw] = useState<number>(3);
  const [peopleLevel, setPeopleLevelRaw] = useState<number>(3);
  const [targetDate, setTargetDateRaw] = useState<string>("");
  const [targetLabel, setTargetLabelRaw] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);

  // Sync from saved strategy once loaded
  useEffect(() => {
    if (strategyData?.configured) {
      setBusinessLevelRaw(strategyData.businessAmbitionLevel ?? 3);
      setPeopleLevelRaw(strategyData.peopleAmbitionLevel ?? 3);
      setTargetDateRaw(strategyData.ambitionTargetDate ?? "");
      setTargetLabelRaw(strategyData.ambitionTargetLabel ?? "");
      setIsDirty(false);
    }
  }, [strategyData]);

  const setBusinessLevel = useCallback((v: number) => { setBusinessLevelRaw(v); setIsDirty(true); }, []);
  const setPeopleLevel = useCallback((v: number) => { setPeopleLevelRaw(v); setIsDirty(true); }, []);
  const setTargetDate = useCallback((v: string) => { setTargetDateRaw(v); setIsDirty(true); }, []);
  const setTargetLabel = useCallback((v: string) => { setTargetLabelRaw(v); setIsDirty(true); }, []);

  const domainTargets = useMemo(() => computeDomainTargets(businessLevel, peopleLevel), [businessLevel, peopleLevel]);
  const overallTarget = useMemo(() => overallFromDomains(domainTargets), [domainTargets]);

  const saveStrategy = trpc.intelligence.saveStrategy.useMutation({
    onSuccess: () => {
      toast.success("AI People Strategy saved.");
      setIsDirty(false);
      utils.intelligence.getStrategy.invalidate();
      utils.dashboardV2.leader.ambitionGap.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSave() {
    saveStrategy.mutate({
      businessAmbitionLevel: businessLevel,
      peopleAmbitionLevel: peopleLevel,
      domainTargets,
      ambitionTargetScore: overallTarget,
      ambitionTargetDate: targetDate || null,
      ambitionTargetLabel: targetLabel || null,
    });
  }

  // ── Derived display values ──────────────────────────────────────────────────

  const monthsToTarget = useMemo(() => {
    if (!ambitionGap?.configured || ambitionGap.functionAvgRaw === null || ambitionGap.gapRaw === null || ambitionGap.gapRaw <= 0) return null;
    if (!trajectory?.domains?.length) return null;
    const deltas = trajectory.domains.map((d: any) => d.delta90d).filter((d: any) => d !== null) as number[];
    if (deltas.length === 0) return null;
    const avgDelta90d = deltas.reduce((s: number, d: number) => s + d, 0) / deltas.length;
    if (avgDelta90d <= 0) return null;
    return Math.ceil(ambitionGap.gapRaw * (3 / avgDelta90d));
  }, [ambitionGap, trajectory]);

  const currentLevel = ambitionGap?.functionAvgRaw != null ? getPreciseLevel(ambitionGap.functionAvgRaw) : null;
  const targetLevelDisplay = ambitionGap?.ambitionTargetScore != null ? getPreciseLevel(ambitionGap.ambitionTargetScore) : null;
  const gapLevel = ambitionGap?.gapRaw != null ? (ambitionGap.gapRaw / 10).toFixed(1) : null;

  const strategicFindingText = useMemo(() => {
    if (!ambitionGap?.configured || currentLevel === null || targetLevelDisplay === null) {
      return "Set your AI People Strategy above to generate your strategic finding.";
    }
    const targetDateStr = ambitionGap.ambitionTargetDate
      ? new Date(ambitionGap.ambitionTargetDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : "your target date";
    if (ambitionGap.verdict === "exceeds") {
      return `HR is already at Level ${currentLevel} — exceeding the Level ${targetLevelDisplay} ${targetDateStr} target. Consider raising the ambition bar.`;
    }
    if (monthsToTarget !== null) {
      const closeDate = new Date();
      closeDate.setMonth(closeDate.getMonth() + monthsToTarget);
      const closeStr = closeDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      return `HR is at Level ${currentLevel} against a Level ${targetLevelDisplay} ${targetDateStr} target. The gap closes ${closeStr} at current pace.`;
    }
    return `HR is at Level ${currentLevel} against a Level ${targetLevelDisplay} target. Accelerated development is required to meet the AI roadmap.`;
  }, [ambitionGap, currentLevel, targetLevelDisplay, monthsToTarget]);

  const boardOptions = useMemo(() => {
    if (!ambitionGap?.configured || ambitionGap.gapRaw === null || ambitionGap.gapRaw <= 0) return [];
    const targetDateStr = ambitionGap.ambitionTargetDate
      ? new Date(ambitionGap.ambitionTargetDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : "the target date";
    return [
      `Invest in accelerated development to meet the ${targetDateStr} target`,
      monthsToTarget ? `Extend AI roadmap timeline by ${monthsToTarget} months to align with current learning pace` : "Extend AI roadmap timeline to align with current learning pace",
      "Reduce capability bar for non-customer-facing roles and focus investment on high-impact functions",
    ];
  }, [ambitionGap, monthsToTarget]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Page header */}
      <div className="pb-3 border-b border-border">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">Strategic dashboard</p>
        <h1 className="text-lg font-semibold text-foreground">HR capability vs AI roadmap</h1>
      </div>

      {/* ── CONTROL PANEL ─────────────────────────────────────────────────────── */}
      <StrategyControlPanel
        businessLevel={businessLevel}
        setBusinessLevel={setBusinessLevel}
        peopleLevel={peopleLevel}
        setPeopleLevel={setPeopleLevel}
        targetDate={targetDate}
        setTargetDate={setTargetDate}
        targetLabel={targetLabel}
        setTargetLabel={setTargetLabel}
        overallTarget={overallTarget}
        isDirty={isDirty}
        isSaving={saveStrategy.isPending}
        onSave={handleSave}
        configured={!!strategyData?.configured}
      />

      {/* ── OUTPUT DASHBOARD ──────────────────────────────────────────────────── */}

      {/* Strategic finding hero */}
      <div className="bg-card rounded-xl border border-border shadow-md p-7">
        <p className="text-xs font-medium uppercase tracking-widest mb-3 text-primary">Strategic finding</p>
        <h2 className="text-xl font-medium leading-relaxed mb-6 text-foreground">{strategicFindingText}</h2>

        {/* 3 KPI tiles */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-lg p-4" style={{ background: "oklch(17% 0.028 240)", border: "0.5px solid oklch(22% 0.030 240)" }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-1 text-muted-foreground">Current</p>
            <p className="text-2xl font-medium text-foreground">Level {currentLevel ?? "-"}</p>
            <p className="text-xs mt-0.5 text-muted-foreground">across {ambitionGap?.assessedCount ?? 0} HR people</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: "oklch(17% 0.028 240)", border: "0.5px solid oklch(22% 0.030 240)" }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-1 text-muted-foreground">{ambitionGap?.ambitionTargetLabel ?? "Target"}</p>
            <p className="text-2xl font-medium text-foreground">Level {targetLevelDisplay ?? "-"}</p>
            <p className="text-xs mt-0.5 text-muted-foreground">from AI roadmap</p>
          </div>
          <div className="rounded-lg p-4"
            style={{
              background: ambitionGap?.verdict === "gap" ? "oklch(18% 0.040 68)" : "oklch(17% 0.028 240)",
              border: ambitionGap?.verdict === "gap" ? "0.5px solid oklch(30% 0.090 68)" : "0.5px solid oklch(22% 0.030 240)"
            }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: ambitionGap?.verdict === "gap" ? "#F59E0B" : "var(--muted-foreground)" }}>Gap</p>
            <p className="text-2xl font-medium text-foreground">{gapLevel !== null && parseFloat(gapLevel) > 0 ? `${gapLevel} levels` : "On target"}</p>
            <p className="text-xs mt-0.5" style={{ color: ambitionGap?.verdict === "gap" ? "#F59E0B" : "var(--muted-foreground)" }}>
              {monthsToTarget ? `closes in ~${monthsToTarget} months` : ambitionGap?.configured ? "at current pace" : "no target set"}
            </p>
          </div>
        </div>

        {/* Board options */}
        {boardOptions.length > 0 && (
          <div className="rounded-lg p-5" style={{ background: "oklch(17% 0.028 240)", border: "0.5px solid oklch(22% 0.030 240)" }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-3 text-primary">Three options for the board</p>
            <div className="flex flex-col gap-2.5">
              {boardOptions.map((opt, i) => (
                <div key={i} className="grid gap-2.5 items-start" style={{ gridTemplateColumns: "22px 1fr" }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 bg-primary text-primary-foreground">{i + 1}</span>
                  <p className="text-sm leading-relaxed text-foreground">{opt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No target state */}
        {!ambitionGap?.configured && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-border" style={{ background: "oklch(17% 0.028 240)" }}>
            <Target className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Configure your strategy in the control panel above to generate your strategic finding and roadmap analysis.</p>
          </div>
        )}
      </div>

      {/* Capability vs roadmap bars — priority gaps */}
      {ambitionGap?.priorityGaps && ambitionGap.priorityGaps.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <p className="text-sm font-medium mb-5 text-foreground">Capability against AI roadmap</p>
          <div className="flex flex-col gap-8">
            {ambitionGap.priorityGaps.map((pg: any, i: number) => (
              <RoadmapBar
                key={i}
                label={pg.priority}
                sub={pg.relevantDomains?.map((d: any) => d.domainName).join(" · ")}
                currentScore={pg.avgCurrentScore}
                targetScore={pg.requiredScore}
                status={pg.status}
              />
            ))}
          </div>
        </div>
      )}

      {/* Capability vs roadmap bars — domain-level fallback */}
      {(!ambitionGap?.priorityGaps || ambitionGap.priorityGaps.length === 0) && ambitionGap?.configured && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <p className="text-sm font-medium mb-5 text-foreground">Capability against AI roadmap</p>
          <div className="flex flex-col gap-8">
            {DOMAIN_KEYS.map(key => {
              const domainData = trajectory?.domains?.find((d: any) => d.domain === key);
              const perDomainTarget = strategyData?.domainTargets?.[key] ?? ambitionGap.ambitionTargetScore;
              return (
                <RoadmapBar
                  key={key}
                  label={DOMAIN_LABELS[key as CapabilityKey]}
                  currentScore={domainData?.currentValue ?? null}
                  targetScore={perDomainTarget}
                  status={domainData?.currentValue !== null && perDomainTarget !== null
                    ? (domainData!.currentValue! >= perDomainTarget ? "aligned" : domainData!.currentValue! >= perDomainTarget - 15 ? "partial" : "gap")
                    : "unknown"}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Trajectory chart */}
      {trajectory?.domains && trajectory.domains.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <p className="text-sm font-medium mb-4 text-foreground">Trajectory · function average</p>
          <TrajectoryChart
            domains={trajectory.domains}
            targetScore={ambitionGap?.ambitionTargetScore ?? null}
            targetDate={ambitionGap?.ambitionTargetDate ?? null}
          />
        </div>
      )}

      {/* Strategic findings */}
      {findings?.findings && findings.findings.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <p className="text-sm font-medium mb-4 text-foreground">Strategic findings</p>
          <div className="flex flex-col gap-3">
            {findings.findings.slice(0, 5).map((f: any, i: number) => {
              const isHighPriority = f.priority === "high" || f.type === "risk" || f.type === "governance";
              return (
                <div key={i} className="flex gap-3 p-3 rounded-lg"
                  style={{
                    background: isHighPriority ? "oklch(18% 0.040 68)" : "oklch(17% 0.028 240)",
                    border: `0.5px solid ${isHighPriority ? "oklch(30% 0.090 68)" : "oklch(22% 0.030 240)"}`
                  }}>
                  <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: isHighPriority ? "#FCD34D" : "#9CA3AF" }} />
                  <div>
                    <p className="text-sm font-medium mb-0.5 text-foreground">{f.title ?? f.finding ?? "Finding"}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{f.description ?? f.detail ?? ""}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
