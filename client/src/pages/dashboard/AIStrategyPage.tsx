/**
 * AIStrategyPage - Wireframe C3 visual language
 * Dark navy brand theme (AiQ Design System)
 *
 * Strategic finding hero card · capability vs roadmap bars with target markers
 * · trajectory chart (actual + projected) · regulatory exposure cards
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Edit2 } from "lucide-react";
import { getLevelChipStyle, getLevelFromScore, getPreciseLevel } from "@/lib/level-utils";
import { DOMAIN_KEYS, DOMAIN_LABELS } from "@/lib/domains";
import type { CapabilityKey } from "@/lib/domains";
import StrategyBuilderWizard from "@/components/StrategyBuilderWizard";

// --- Roadmap bar --------------------------------------------------------------
function RoadmapBar({
  label, sub, currentScore, targetScore, status,
}: {
  label: string; sub?: string; currentScore: number | null; targetScore: number | null; status: "aligned" | "partial" | "gap" | "unknown";
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
        {/* Target marker */}
        <div className="absolute top-[-4px] h-6 w-0.5" style={{ left: `${targetPct}%`, background: "oklch(72.3% 0.220 142)" }} />
        <span className="absolute text-xs font-medium whitespace-nowrap" style={{ top: -20, left: `${targetPct}%`, transform: "translateX(-50%)", color: "oklch(72.3% 0.220 142)" }}>
          TARGET {targetScore !== null ? getPreciseLevel(targetScore) : "-"}
        </span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-muted-foreground">0</span>
        <span className="text-xs font-medium text-foreground">
          Currently {currentScore !== null ? getPreciseLevel(currentScore) : "-"}
        </span>
        <span className="text-xs text-muted-foreground">5</span>
      </div>
    </div>
  );
}

// --- Trajectory chart ---------------------------------------------------------
function TrajectoryChart({
  domains, targetScore, targetDate,
}: {
  domains: Array<{ domain: string; timeSeries: Array<{ date: string; avgScore: number | null }>; currentValue: number | null; delta90d: number | null }>;
  targetScore: number | null;
  targetDate: string | null;
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
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const maxScore = 100;

  function scoreToY(score: number) {
    return PAD_T + (1 - score / maxScore) * chartH;
  }
  function idxToX(i: number, total: number) {
    return PAD_L + (i / Math.max(total - 1, 1)) * chartW;
  }

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
      const x = lastPt.x + (i / steps) * chartW * 0.5;
      const y = Math.max(PAD_T, lastPt.y + slopePerStep * i);
      projPts.push({ x, y });
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
        {actualPts.length >= 2 && (
          <polyline points={actualPolyline} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinejoin="round" />
        )}
        {actualPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === actualPts.length - 1 ? 5 : 4} fill="var(--primary)" />
        ))}
        {projPts.length >= 2 && (
          <polyline points={projPolyline} fill="none" stroke="var(--primary)" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="5 3" strokeLinejoin="round" />
        )}
        {validPts.map((m, i) => {
          const x = idxToX(i, validPts.length);
          const [year, month] = m.date.split("-");
          const label = `${["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(month)]} ${year.slice(2)}`;
          if (i % Math.max(1, Math.floor(validPts.length / 6)) !== 0 && i !== validPts.length - 1) return null;
          return (
            <text key={i} x={x} y={H - 8} textAnchor="middle" style={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "Sora, system-ui, sans-serif" }}>{label}</text>
          );
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

// --- Page ---------------------------------------------------------------------
export default function AIStrategyPage() {
  const utils = trpc.useUtils();
  const [showWizard, setShowWizard] = useState(false);

  const { data: ambitionGap, isLoading } = trpc.dashboardV2.leader.ambitionGap.useQuery(undefined, { retry: false } as any);
  const { data: trajectory } = trpc.dashboardV2.leader.domainTrajectory.useQuery(undefined);
  const { data: findings } = trpc.dashboardV2.leader.strategicFindings.useQuery(undefined);
  const { data: strategyData } = trpc.intelligence.getStrategy.useQuery(undefined, { retry: false } as any);

  const monthsToTarget = useMemo(() => {
    if (!ambitionGap?.configured || ambitionGap.functionAvgRaw === null || ambitionGap.gapRaw === null || ambitionGap.gapRaw <= 0) return null;
    if (!trajectory?.domains?.length) return null;
    const deltas = trajectory.domains.map(d => d.delta90d).filter(d => d !== null) as number[];
    if (deltas.length === 0) return null;
    const avgDelta90d = deltas.reduce((s, d) => s + d, 0) / deltas.length;
    if (avgDelta90d <= 0) return null;
    const monthsPerPoint = 3 / avgDelta90d;
    return Math.ceil(ambitionGap.gapRaw * monthsPerPoint);
  }, [ambitionGap, trajectory]);

  const currentLevel = ambitionGap?.functionAvgRaw !== null && ambitionGap?.functionAvgRaw !== undefined
    ? getPreciseLevel(ambitionGap.functionAvgRaw) : null;
  const targetLevel = ambitionGap?.ambitionTargetScore !== null && ambitionGap?.ambitionTargetScore !== undefined
    ? getPreciseLevel(ambitionGap.ambitionTargetScore) : null;
  const gapLevel = ambitionGap?.gapRaw !== null && ambitionGap?.gapRaw !== undefined
    ? (ambitionGap.gapRaw / 10).toFixed(1) : null;

  const strategicFindingText = useMemo(() => {
    if (!ambitionGap?.configured || currentLevel === null || targetLevel === null) {
      return "Set your AI People Strategy to generate your strategic finding.";
    }
    const targetDateStr = ambitionGap.ambitionTargetDate
      ? new Date(ambitionGap.ambitionTargetDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : "your target date";
    if (ambitionGap.verdict === "exceeds") {
      return `HR is at Level ${currentLevel} - already exceeding the Level ${targetLevel} target. The function is ahead of the AI roadmap.`;
    }
    if (monthsToTarget !== null) {
      const closeDate = new Date();
      closeDate.setMonth(closeDate.getMonth() + monthsToTarget);
      const closeStr = closeDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      return `HR is at Level ${currentLevel} against a Level ${targetLevel} ${targetDateStr} target. The gap closes ${closeStr} at current pace.`;
    }
    return `HR is at Level ${currentLevel} against a Level ${targetLevel} target. Accelerated development is required to meet the AI roadmap.`;
  }, [ambitionGap, currentLevel, targetLevel, monthsToTarget]);

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

  const regulatoryFindings = useMemo(() => {
    if (!findings?.findings) return [];
    return findings.findings.filter((f: any) => f.type === "governance" || f.type === "risk" || f.patternId?.includes("governance") || f.patternId?.includes("risk"));
  }, [findings]);

  if (isLoading) {
    return (
      <div className="px-5 py-6 md:px-8 max-w-4xl mx-auto space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-5 py-6 md:px-8 max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">Strategic dashboard</p>
          <h1 className="text-lg font-semibold text-foreground">HR capability vs AI roadmap</h1>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setShowWizard(true)}>
          <Edit2 className="w-3.5 h-3.5" />{ambitionGap?.configured ? "Edit strategy" : "Set AI strategy"}
        </Button>
      </div>

      {/* Strategy Builder Wizard — full-screen overlay */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <StrategyBuilderWizard
            initialData={strategyData ?? null}
            onSaved={() => {
              setShowWizard(false);
              utils.dashboardV2.leader.ambitionGap.invalidate();
              utils.intelligence.getStrategy.invalidate();
            }}
            onCancel={() => setShowWizard(false)}
          />
        </div>
      )}

      {/* Strategy summary banner — shown when strategy is configured */}
      {strategyData?.configured && (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/60">
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Business Ambition</p>
              <p className="text-lg font-bold text-foreground">{strategyData.businessAmbitionLevel}/5</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">People Ambition</p>
              <p className="text-lg font-bold text-foreground">{strategyData.peopleAmbitionLevel}/5</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Overall Target</p>
              <p className="text-lg font-bold text-primary">Level {strategyData.ambitionTargetScore !== null ? (strategyData.ambitionTargetScore / 10).toFixed(1) : "-"}</p>
            </div>
            {strategyData.ambitionTargetLabel && (
              <div>
                <p className="text-xs text-muted-foreground">Goal</p>
                <p className="text-sm font-medium text-foreground">{strategyData.ambitionTargetLabel}</p>
              </div>
            )}
          </div>
          {strategyData.strategySavedAt && (
            <p className="ml-auto text-xs text-muted-foreground">
              Saved {new Date(strategyData.strategySavedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
      )}

      {/* Strategic finding hero */}
      <div className="bg-card rounded-xl border border-border shadow-md p-7">
        <p className="text-xs font-medium uppercase tracking-widest mb-3 text-primary">Strategic finding</p>
        <h2 className="text-xl font-medium leading-relaxed mb-6 text-foreground">{strategicFindingText}</h2>

        {/* 3 stat tiles */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-lg p-4" style={{ background: "oklch(17% 0.028 240)", border: "0.5px solid oklch(22% 0.030 240)" }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-1 text-muted-foreground">Current</p>
            <p className="text-2xl font-medium text-foreground">Level {currentLevel ?? "-"}</p>
            <p className="text-xs mt-0.5 text-muted-foreground">across {ambitionGap?.assessedCount ?? 0} HR people</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: "oklch(17% 0.028 240)", border: "0.5px solid oklch(22% 0.030 240)" }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-1 text-muted-foreground">{ambitionGap?.ambitionTargetLabel ?? "Target"}</p>
            <p className="text-2xl font-medium text-foreground">Level {targetLevel ?? "-"}</p>
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
            <div>
              <p className="text-sm font-medium text-foreground">No AI People Strategy configured</p>
              <p className="text-xs text-muted-foreground">Set your business and people ambition levels to generate your strategic finding and roadmap analysis.</p>
            </div>
            <Button size="sm" className="ml-auto flex-shrink-0 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setShowWizard(true)}>
              Set strategy
            </Button>
          </div>
        )}
      </div>

      {/* Capability vs roadmap bars */}
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

      {/* Domain capability bars (if no priority gaps) */}
      {(!ambitionGap?.priorityGaps || ambitionGap.priorityGaps.length === 0) && ambitionGap?.configured && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <p className="text-sm font-medium mb-5 text-foreground">Capability against AI roadmap</p>
          <div className="flex flex-col gap-8">
            {DOMAIN_KEYS.map(key => {
              const domainData = trajectory?.domains?.find(d => d.domain === key);
              // Use per-domain target if available from strategy, otherwise fall back to overall
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
