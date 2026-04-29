/**
 * AIStrategyPage — Wireframe C3 visual language
 *
 * Strategic finding hero card · capability vs roadmap bars with target markers
 * · trajectory chart (actual + projected) · regulatory exposure cards
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Target, AlertTriangle, CheckCircle2, TrendingUp, Edit2 } from "lucide-react";
import { getLevelFromScore, getLevelChipStyle, getLevelLabel, getPreciseLevel } from "@/lib/level-utils";
import { DOMAIN_KEYS, DOMAIN_LABELS } from "@/lib/domains";
import type { CapabilityKey } from "@/lib/domains";

// ─── Roadmap bar ──────────────────────────────────────────────────────────────
function RoadmapBar({
  label, sub, currentScore, targetScore, status,
}: {
  label: string; sub?: string; currentScore: number | null; targetScore: number | null; status: "aligned" | "partial" | "gap" | "unknown";
}) {
  const STATUS_PILL: Record<string, { label: string; bg: string; text: string }> = {
    aligned: { label: "On track", bg: "#F0FDF4", text: "#047857" },
    partial:  { label: "Developing", bg: "#EFF6FF", text: "#1D4ED8" },
    gap:      { label: "Behind", bg: "#FEF7ED", text: "#B45309" },
    unknown:  { label: "No data", bg: "#F3F4F6", text: "#6B7280" },
  };
  const pill = STATUS_PILL[status] ?? STATUS_PILL.unknown;
  const currentPct = currentScore !== null ? (currentScore / 100) * 100 : 0;
  const targetPct = targetScore !== null ? (targetScore / 100) * 100 : 80;
  const chipStyle = currentScore !== null ? getLevelChipStyle(getLevelFromScore(currentScore)) : null;

  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-medium" style={{ color: "#0F2547" }}>{label}</p>
          {sub && <p className="text-xs" style={{ color: "#6B7280" }}>{sub}</p>}
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: pill.bg, color: pill.text }}>{pill.label}</span>
      </div>
      <div className="relative h-4 rounded" style={{ background: "#F3F4F6" }}>
        {currentScore !== null && (
          <div className="absolute top-0 left-0 h-full rounded transition-all duration-700" style={{ width: `${currentPct}%`, background: chipStyle?.bg ?? "#94A3B8" }} />
        )}
        {/* Target marker */}
        <div className="absolute top-[-4px] h-6 w-0.5" style={{ left: `${targetPct}%`, background: "#1F3A5F" }} />
        <span className="absolute text-xs font-medium whitespace-nowrap" style={{ top: -20, left: `${targetPct}%`, transform: "translateX(-50%)", color: "#1F3A5F" }}>
          TARGET {targetScore !== null ? getPreciseLevel(targetScore) : "—"}
        </span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: "#6B7280" }}>0</span>
        <span className="text-xs font-medium" style={{ color: "#0F2547" }}>
          Currently {currentScore !== null ? getPreciseLevel(currentScore) : "—"}
        </span>
        <span className="text-xs" style={{ color: "#6B7280" }}>5</span>
      </div>
    </div>
  );
}

// ─── Trajectory chart ─────────────────────────────────────────────────────────
function TrajectoryChart({
  domains, targetScore, targetDate,
}: {
  domains: Array<{ domain: string; timeSeries: Array<{ date: string; avgScore: number | null }>; currentValue: number | null; delta90d: number | null }>;
  targetScore: number | null;
  targetDate: string | null;
}) {
  // Aggregate all domains into a function average per month
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
  const maxScore = 100; const minScore = 0;

  function scoreToY(score: number) {
    return PAD_T + (1 - score / maxScore) * chartH;
  }
  function idxToX(i: number, total: number) {
    return PAD_L + (i / Math.max(total - 1, 1)) * chartW;
  }

  const validPts = monthlyAvg.filter(m => m.avg !== null);
  const actualPts = validPts.map((m, i) => ({ x: idxToX(i, validPts.length), y: scoreToY(m.avg!) }));
  const actualPolyline = actualPts.map(p => `${p.x},${p.y}`).join(" ");

  // Project forward: linear extrapolation from last 3 points
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

  // Target line
  const targetY = targetScore !== null ? scoreToY(targetScore) : null;

  // Level labels on Y axis
  const levelLines = [20, 40, 60, 80, 100].map(score => ({ score, y: scoreToY(score), label: (score / 10).toFixed(0) }));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
        {/* Grid lines */}
        {levelLines.map(l => (
          <g key={l.score}>
            <line x1={PAD_L} y1={l.y} x2={W - PAD_R} y2={l.y} stroke="#F3F4F6" strokeWidth={0.5} strokeDasharray="2 2" />
            <text x={PAD_L - 8} y={l.y + 4} textAnchor="end" style={{ fontSize: 10, fill: "#6B7280", fontFamily: "Inter, system-ui, sans-serif" }}>{l.label}</text>
          </g>
        ))}
        {/* Target threshold line */}
        {targetY !== null && (
          <>
            <line x1={PAD_L} y1={targetY} x2={W - PAD_R} y2={targetY} stroke="#1F3A5F" strokeWidth={1.5} strokeDasharray="6 4" />
            <text x={W - PAD_R + 4} y={targetY + 4} style={{ fontSize: 10, fill: "#1F3A5F", fontWeight: 500, fontFamily: "Inter, system-ui, sans-serif" }}>
              {targetScore !== null ? getPreciseLevel(targetScore) : ""}
            </text>
          </>
        )}
        {/* Actual line */}
        {actualPts.length >= 2 && (
          <polyline points={actualPolyline} fill="none" stroke="#1F3A5F" strokeWidth={2.5} strokeLinejoin="round" />
        )}
        {/* Actual dots */}
        {actualPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === actualPts.length - 1 ? 5 : 4} fill="#1F3A5F" />
        ))}
        {/* Projected line */}
        {projPts.length >= 2 && (
          <polyline points={projPolyline} fill="none" stroke="#557DAE" strokeWidth={2} strokeDasharray="5 3" strokeLinejoin="round" />
        )}
        {/* X axis labels */}
        {validPts.map((m, i) => {
          const x = idxToX(i, validPts.length);
          const [year, month] = m.date.split("-");
          const label = `${["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(month)]} ${year.slice(2)}`;
          if (i % Math.max(1, Math.floor(validPts.length / 6)) !== 0 && i !== validPts.length - 1) return null;
          return (
            <text key={i} x={x} y={H - 8} textAnchor="middle" style={{ fontSize: 10, fill: "#6B7280", fontFamily: "Inter, system-ui, sans-serif" }}>{label}</text>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex gap-5 mt-3 pt-3" style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 18, height: 2.5, background: "#1F3A5F", display: "inline-block" }} />
          <span className="text-xs" style={{ color: "#4B5563" }}>Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 18, height: 2, background: "#557DAE", display: "inline-block", borderTop: "1px dashed #557DAE" }} />
          <span className="text-xs" style={{ color: "#4B5563" }}>Projected at current pace</span>
        </div>
        {targetY !== null && (
          <div className="flex items-center gap-1.5">
            <span style={{ width: 18, height: 1.5, background: "#1F3A5F", display: "inline-block", borderTop: "1px dashed #1F3A5F" }} />
            <span className="text-xs" style={{ color: "#4B5563" }}>Target threshold</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AIStrategyPage() {
  const utils = trpc.useUtils();
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [targetScore, setTargetScore] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [targetLabel, setTargetLabel] = useState("");

  const { data: ambitionGap, isLoading } = trpc.dashboardV2.leader.ambitionGap.useQuery(undefined, { retry: false } as any);
  const { data: trajectory } = trpc.dashboardV2.leader.domainTrajectory.useQuery(undefined);
  const { data: findings } = trpc.dashboardV2.leader.strategicFindings.useQuery(undefined);

  const setAmbitionTarget = trpc.intelligence.setAmbitionTarget.useMutation({
    onSuccess: () => {
      toast.success("Ambition target saved — dashboard updated.");
      setShowTargetDialog(false);
      utils.dashboardV2.leader.ambitionGap.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function openTargetDialog() {
    if (ambitionGap?.ambitionTargetScore != null) setTargetScore(String((ambitionGap.ambitionTargetScore / 10).toFixed(1)));
    if (ambitionGap?.ambitionTargetDate) setTargetDate(ambitionGap.ambitionTargetDate);
    if (ambitionGap?.ambitionTargetLabel) setTargetLabel(ambitionGap.ambitionTargetLabel);
    setShowTargetDialog(true);
  }

  function handleSaveTarget() {
    const score = parseFloat(targetScore);
    if (isNaN(score) || score < 0 || score > 10) { toast.error("Score must be between 0 and 10"); return; }
    setAmbitionTarget.mutate({
      ambitionTargetScore: Math.round(score * 10),
      ambitionTargetDate: targetDate || null,
      ambitionTargetLabel: targetLabel || null,
    });
  }

  // Months to target estimate
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

  // Strategic finding text
  const strategicFindingText = useMemo(() => {
    if (!ambitionGap?.configured || currentLevel === null || targetLevel === null) {
      return "Set an ambition target to generate your strategic finding.";
    }
    const targetDateStr = ambitionGap.ambitionTargetDate
      ? new Date(ambitionGap.ambitionTargetDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : "your target date";
    if (ambitionGap.verdict === "exceeds") {
      return `HR is at Level ${currentLevel} — already exceeding the Level ${targetLevel} target. The function is ahead of the AI roadmap.`;
    }
    if (monthsToTarget !== null) {
      const closeDate = new Date();
      closeDate.setMonth(closeDate.getMonth() + monthsToTarget);
      const closeStr = closeDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      return `HR is at Level ${currentLevel} against a Level ${targetLevel} ${targetDateStr} target. The gap closes ${closeStr} at current pace.`;
    }
    return `HR is at Level ${currentLevel} against a Level ${targetLevel} target. Accelerated development is required to meet the AI roadmap.`;
  }, [ambitionGap, currentLevel, targetLevel, monthsToTarget]);

  // Board options
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

  // Regulatory exposure findings
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
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-400 mb-0.5">Strategic dashboard</p>
          <h1 className="text-lg font-semibold" style={{ color: "#0F2547" }}>HR capability vs AI roadmap</h1>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={openTargetDialog}>
          <Edit2 className="w-3.5 h-3.5" />{ambitionGap?.configured ? "Edit target" : "Set target"}
        </Button>
      </div>

      {/* Strategic finding hero */}
      <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-7">
        <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "#1F3A5F" }}>Strategic finding</p>
        <h2 className="text-xl font-medium leading-relaxed mb-6" style={{ color: "#0F2547" }}>{strategicFindingText}</h2>

        {/* 3 stat tiles */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-lg p-4" style={{ background: "#F9FAFB" }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "#6B7280" }}>Current</p>
            <p className="text-2xl font-medium" style={{ color: "#0F2547" }}>Level {currentLevel ?? "—"}</p>
            <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>across {ambitionGap?.assessedCount ?? 0} HR people</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: "#F9FAFB" }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "#6B7280" }}>{ambitionGap?.ambitionTargetLabel ?? "Target"}</p>
            <p className="text-2xl font-medium" style={{ color: "#0F2547" }}>Level {targetLevel ?? "—"}</p>
            <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>from AI roadmap</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: ambitionGap?.verdict === "gap" ? "#FEF7ED" : "#F9FAFB", border: ambitionGap?.verdict === "gap" ? "0.5px solid #FED7AA" : undefined }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: ambitionGap?.verdict === "gap" ? "#B45309" : "#6B7280" }}>Gap</p>
            <p className="text-2xl font-medium" style={{ color: "#0F2547" }}>{gapLevel !== null && parseFloat(gapLevel) > 0 ? `${gapLevel} levels` : "On target"}</p>
            <p className="text-xs mt-0.5" style={{ color: ambitionGap?.verdict === "gap" ? "#B45309" : "#6B7280" }}>
              {monthsToTarget ? `closes in ~${monthsToTarget} months` : ambitionGap?.configured ? "at current pace" : "no target set"}
            </p>
          </div>
        </div>

        {/* Board options */}
        {boardOptions.length > 0 && (
          <div className="rounded-lg p-5" style={{ background: "#F0F4F8" }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "#2E4C7A" }}>Three options for the board</p>
            <div className="flex flex-col gap-2.5">
              {boardOptions.map((opt, i) => (
                <div key={i} className="grid gap-2.5 items-start" style={{ gridTemplateColumns: "22px 1fr" }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0" style={{ background: "#1F3A5F", color: "#FFFFFF" }}>{i + 1}</span>
                  <p className="text-sm leading-relaxed" style={{ color: "#0F2547" }}>{opt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No target state */}
        {!ambitionGap?.configured && (
          <div className="flex items-center gap-3 p-4 rounded-lg" style={{ background: "#F9FAFB", border: "0.5px solid #E5E7EB" }}>
            <Target className="w-4 h-4 flex-shrink-0" style={{ color: "#9CA3AF" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "#0F2547" }}>No ambition target configured</p>
              <p className="text-xs" style={{ color: "#6B7280" }}>Set a target level and date to generate your strategic finding and roadmap analysis.</p>
            </div>
            <Button size="sm" className="ml-auto flex-shrink-0" style={{ backgroundColor: "#1F3A5F", color: "#FFFFFF" }} onClick={openTargetDialog}>Set target</Button>
          </div>
        )}
      </div>

      {/* Capability vs roadmap bars */}
      {ambitionGap?.priorityGaps && ambitionGap.priorityGaps.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
          <p className="text-sm font-medium mb-5" style={{ color: "#0F2547" }}>Capability against AI roadmap</p>
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
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
          <p className="text-sm font-medium mb-5" style={{ color: "#0F2547" }}>Capability against AI roadmap</p>
          <div className="flex flex-col gap-8">
            {DOMAIN_KEYS.map(key => {
              const domainData = trajectory?.domains?.find(d => d.domain === key);
              return (
                <RoadmapBar
                  key={key}
                  label={DOMAIN_LABELS[key as CapabilityKey]}
                  currentScore={domainData?.currentValue ?? null}
                  targetScore={ambitionGap.ambitionTargetScore}
                  status={domainData?.currentValue !== null && ambitionGap.ambitionTargetScore !== null
                    ? (domainData!.currentValue! >= ambitionGap.ambitionTargetScore ? "aligned" : domainData!.currentValue! >= ambitionGap.ambitionTargetScore - 15 ? "partial" : "gap")
                    : "unknown"}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Trajectory chart */}
      {trajectory?.domains && trajectory.domains.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
          <p className="text-sm font-medium mb-4" style={{ color: "#0F2547" }}>Trajectory · function average</p>
          <TrajectoryChart
            domains={trajectory.domains}
            targetScore={ambitionGap?.ambitionTargetScore ?? null}
            targetDate={ambitionGap?.ambitionTargetDate ?? null}
          />
        </div>
      )}

      {/* Regulatory exposure */}
      {findings?.findings && findings.findings.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
          <p className="text-sm font-medium mb-4" style={{ color: "#0F2547" }}>Strategic findings</p>
          <div className="flex flex-col gap-3">
            {findings.findings.slice(0, 5).map((f: any, i: number) => {
              const isHighPriority = f.priority === "high" || f.type === "risk" || f.type === "governance";
              return (
                <div key={i} className="flex gap-3 p-3 rounded-lg" style={{ background: isHighPriority ? "#FEF7ED" : "#F9FAFB", border: `0.5px solid ${isHighPriority ? "#FED7AA" : "#E5E7EB"}` }}>
                  <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: isHighPriority ? "#B45309" : "#6B7280" }} />
                  <div>
                    <p className="text-sm font-medium mb-0.5" style={{ color: "#0F2547" }}>{f.title ?? f.finding ?? "Finding"}</p>
                    <p className="text-xs leading-relaxed" style={{ color: "#4B5563" }}>{f.description ?? f.detail ?? ""}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Set target dialog */}
      <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set ambition target</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Target level (0–10)</label>
              <Input placeholder="e.g. 4.0" value={targetScore} onChange={e => setTargetScore(e.target.value)} />
              <p className="text-xs mt-1" style={{ color: "#6B7280" }}>Level 3 = Capable · Level 4 = Strong · Level 5 = AI Ready</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Target date</label>
              <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Label (optional)</label>
              <Input placeholder="e.g. December 2026" value={targetLabel} onChange={e => setTargetLabel(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowTargetDialog(false)}>Cancel</Button>
            <Button disabled={setAmbitionTarget.isPending} onClick={handleSaveTarget} style={{ backgroundColor: "#1F3A5F", color: "#FFFFFF" }}>
              {setAmbitionTarget.isPending ? "Saving…" : "Save target"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
