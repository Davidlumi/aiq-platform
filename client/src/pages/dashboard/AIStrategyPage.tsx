/**
 * AI Strategy Page (BA-10)
 *
 * Executive-facing view that consolidates:
 * - Readiness vs Ambition hero (current score → target)
 * - Per-priority gap bars with domain breakdown
 * - Time-to-target projection (linear extrapolation from trajectory)
 * - Recommended actions per priority
 * - CTA to set/edit ambition target
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Calendar,
  BarChart3,
  Lightbulb,
  Users,
} from "lucide-react";
import { formatPeakonScore, scoreToReadinessLabel } from "@/lib/peakon-colors";

const VERDICT_CONFIG: Record<string, { bg: string; border: string; text: string; label: string; icon: React.ReactNode }> = {
  exceeds:  { bg: "#f0fdf4", border: "#047857", text: "#047857", label: "Exceeds ambition target", icon: <CheckCircle2 className="w-4 h-4" /> },
  on_track: { bg: "#eff6ff", border: "#2563EB", text: "#1d4ed8", label: "Within reach of target",  icon: <TrendingUp className="w-4 h-4" /> },
  gap:      { bg: "#fef2f2", border: "#DC2626", text: "#b91c1c", label: "Significant capability gap", icon: <AlertTriangle className="w-4 h-4" /> },
  no_target:{ bg: "#F5F5F5", border: "#D0D0D0", text: "#555",    label: "No target configured",    icon: <Target className="w-4 h-4" /> },
};

const STATUS_COLOURS: Record<string, string> = {
  aligned: "#047857",
  partial:  "#2563EB",
  gap:      "#DC2626",
  unknown:  "#9CA3AF",
};

const PRIORITY_ACTIONS: Record<string, string[]> = {
  aligned: [
    "Maintain momentum with advanced AI scenario practice",
    "Nominate high scorers as AI champions or peer mentors",
  ],
  partial: [
    "Assign targeted learning modules for the relevant capability domains",
    "Schedule a team workshop to close the identified gaps",
  ],
  gap: [
    "Prioritise this area in the next learning plan cycle",
    "Consider external training or coaching for the relevant domains",
    "Review whether current AI tools in use match team capability level",
  ],
  unknown: [
    "Ensure team members complete an assessment to generate data",
  ],
};

export default function AIStrategyPage() {
  const utils = trpc.useUtils();
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [targetScore, setTargetScore] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [targetLabel, setTargetLabel] = useState("");
  const { data: ambitionGap, isLoading } = trpc.dashboardV2.leader.ambitionGap.useQuery(undefined, {
    retry: false,
  } as any);
  const { data: trajectory } = trpc.dashboardV2.leader.domainTrajectory.useQuery(undefined);
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

  // Estimate months to target based on 90-day trajectory
  const monthsToTarget = useMemo(() => {
    if (!ambitionGap || !ambitionGap.configured || ambitionGap.functionAvgRaw === null || ambitionGap.gapRaw === null || ambitionGap.gapRaw <= 0) return null;
    // Use function-level trajectory from domain data
    if (!trajectory?.domains?.length) return null;
    const avgDelta90 = trajectory.domains
      .filter((d: any) => d.delta90d !== null)
      .reduce((s: number, d: any) => s + (d.delta90d ?? 0), 0) / (trajectory.domains.filter((d: any) => d.delta90d !== null).length || 1);
    if (avgDelta90 <= 0) return null;
    // avgDelta90 is raw score points per 90 days
    const pointsPerMonth = avgDelta90 / 3;
    const months = Math.ceil(ambitionGap.gapRaw / pointsPerMonth);
    return months > 0 && months < 120 ? months : null;
  }, [ambitionGap, trajectory]);

  if (isLoading) {
    return (
      <div className="px-5 py-6 md:px-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!ambitionGap || !ambitionGap.configured) {
    return (
      <div className="px-5 py-6 md:px-8 max-w-5xl mx-auto">
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#047857]/10 flex items-center justify-center mx-auto">
            <Target className="w-8 h-8 text-[#047857]" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">No AI Ambition Target Set</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Set a readiness target score and date to unlock the AI Strategy view — including gap analysis, per-priority alignment, and time-to-target projections.
            </p>
          </div>
          <Button
            className="gap-2 bg-[#047857] hover:bg-[#1a6626] text-white"
            onClick={openTargetDialog}
          >
            <Target className="w-4 h-4" />
            Set Ambition Target
          </Button>
        </div>
      </div>
    );
  }

  const vc = VERDICT_CONFIG[ambitionGap.verdict] ?? VERDICT_CONFIG.no_target;
  const currentPeakon = ambitionGap.functionAvgRaw !== null ? (ambitionGap.functionAvgRaw / 10).toFixed(1) : "—";
  const targetPeakon = ambitionGap.ambitionTargetScore !== null ? (ambitionGap.ambitionTargetScore / 10).toFixed(1) : "—";
  const gapPeakon = ambitionGap.gapRaw !== null ? Math.abs(ambitionGap.gapRaw / 10).toFixed(1) : null;

  return (
    <div className="px-5 py-6 md:px-8 max-w-5xl mx-auto space-y-6">
      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-[#047857]" />
            AI Strategy
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Readiness vs ambition — how your HR function's capability maps to your AI strategy
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={openTargetDialog}>
          Edit ambition target <ArrowRight className="w-3 h-3" />
        </Button>
      </header>

      {/* ── Hero: Readiness vs Ambition ── */}
      <div className="rounded-2xl border p-6 space-y-4" style={{ backgroundColor: vc.bg, borderColor: vc.border }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: vc.text + "20", color: vc.text }}>
            {vc.icon}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: vc.text }}>{vc.label}</p>
            {ambitionGap.ambitionTargetLabel && (
              <p className="text-xs mt-0.5 italic" style={{ color: vc.text + "CC" }}>"{ambitionGap.ambitionTargetLabel}"</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Current</p>
            <p className="text-3xl font-bold font-mono tabular-nums text-foreground">{currentPeakon}</p>
            <p className="text-xs text-muted-foreground">/ 10</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Target</p>
            <p className="text-3xl font-bold font-mono tabular-nums" style={{ color: vc.text }}>{targetPeakon}</p>
            <p className="text-xs text-muted-foreground">/ 10</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Gap</p>
            <p className="text-3xl font-bold font-mono tabular-nums" style={{ color: ambitionGap.verdict === "exceeds" ? "#047857" : "#DC2626" }}>
              {ambitionGap.verdict === "exceeds" ? "0.0" : (gapPeakon ?? "—")}
            </p>
            <p className="text-xs text-muted-foreground">pts</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Assessed</p>
            <p className="text-3xl font-bold font-mono tabular-nums text-foreground">{ambitionGap.assessedCount}</p>
            <p className="text-xs text-muted-foreground">employees</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="relative h-3 rounded-full bg-white/60 overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
              style={{
                width: ambitionGap.functionAvgRaw !== null ? Math.min(100, ambitionGap.functionAvgRaw) + "%" : "0%",
                backgroundColor: vc.text,
              }}
            />
            {ambitionGap.ambitionTargetScore !== null && (
              <div
                className="absolute top-0 h-full w-0.5"
                style={{ left: Math.min(ambitionGap.ambitionTargetScore, 99) + "%", backgroundColor: vc.text + "80" }}
              />
            )}
          </div>
          <div className="flex justify-between text-xs" style={{ color: vc.text + "99" }}>
            <span>0</span>
            <span>Target: {targetPeakon}</span>
            <span>10</span>
          </div>
        </div>

        {/* Target date and projection */}
        <div className="flex flex-wrap gap-4 pt-1">
          {ambitionGap.ambitionTargetDate && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: vc.text }}>
              <Calendar className="w-3.5 h-3.5" />
              Target date: <strong>{new Date(ambitionGap.ambitionTargetDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</strong>
            </div>
          )}
          {monthsToTarget !== null && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: vc.text }}>
              <TrendingUp className="w-3.5 h-3.5" />
              At current trajectory: <strong>~{monthsToTarget} month{monthsToTarget !== 1 ? "s" : ""} to target</strong>
            </div>
          )}
        </div>
      </div>

      {/* ── Per-Priority Gap Analysis ── */}
      {ambitionGap.priorityGaps && ambitionGap.priorityGaps.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Readiness by strategic priority</h2>
              <p className="text-xs text-muted-foreground">How current capability aligns with each business priority</p>
            </div>
          </div>

          <div className="space-y-6">
            {ambitionGap.priorityGaps.map((pg: any, i: number) => {
              const barColour = STATUS_COLOURS[pg.status] ?? "#B0B8C4";
              const currentPct = pg.avgCurrentScore !== null ? Math.min(100, Math.round(pg.avgCurrentScore)) : 0;
              const targetPct = pg.requiredScore !== null ? Math.min(100, Math.round(pg.requiredScore)) : 0;
              const actions = PRIORITY_ACTIONS[pg.status] ?? PRIORITY_ACTIONS.unknown;

              return (
                <div key={i} className="space-y-3 pb-5 border-b border-border last:border-0 last:pb-0">
                  {/* Priority header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-mono text-muted-foreground mt-0.5 shrink-0">P{i + 1}</span>
                      <p className="text-sm font-medium text-foreground">{pg.priority}</p>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full border font-medium shrink-0"
                      style={{ borderColor: barColour + "40", backgroundColor: barColour + "15", color: barColour }}
                    >
                      {pg.status === "aligned" ? "Aligned" : pg.status === "partial" ? "Partial" : pg.status === "gap" ? "Gap" : "No data"}
                    </span>
                  </div>

                  {/* Score bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Current: <strong className="text-foreground font-mono">{pg.avgCurrentScore !== null ? (pg.avgCurrentScore / 10).toFixed(1) : "—"}</strong></span>
                      {pg.requiredScore !== null && (
                        <span>Target: <strong className="text-foreground font-mono">{(pg.requiredScore / 10).toFixed(1)}</strong></span>
                      )}
                    </div>
                    <div className="relative h-2.5 rounded-full bg-neutral-100 overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                        style={{ width: currentPct + "%", backgroundColor: barColour }}
                      />
                      {targetPct > 0 && (
                        <div
                          className="absolute top-0 h-full w-0.5 bg-neutral-400"
                          style={{ left: Math.min(targetPct, 99) + "%" }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Relevant domains */}
                  <div className="flex flex-wrap gap-1.5">
                    {pg.relevantDomains.map((d: any) => (
                      <span
                        key={d.domain}
                        className="text-xs px-2 py-0.5 rounded-full border"
                        style={{ borderColor: d.colour + "40", backgroundColor: d.colour + "10", color: d.colour }}
                      >
                        {d.domainName}
                        {d.currentScore !== null && (
                          <span className="ml-1 font-mono font-semibold">{(d.currentScore / 10).toFixed(1)}</span>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Recommended actions */}
                  <div className="space-y-1.5">
                    {actions.map((action, ai) => (
                      <div key={ai} className="flex items-start gap-2 text-xs">
                        <Lightbulb className="w-3 h-3 text-[#D97706] shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* ── Ambition Target Dialog ── */}
      <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#047857]" />
              Set AI Readiness Ambition Target
            </DialogTitle>
            <DialogDescription>
              Define the readiness score your HR function is aiming for and when you want to reach it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Target Readiness Score (0–10)</label>
              <p className="text-xs text-muted-foreground mb-2">7.5 = AI Ready · 9.0 = Advanced</p>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                placeholder="e.g. 7.5"
                className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#047857]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Target Date (optional)</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#047857]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Ambition Statement (optional)</label>
              <input
                type="text"
                value={targetLabel}
                onChange={(e) => setTargetLabel(e.target.value)}
                placeholder="e.g. HR function fully capable of deploying AI tools"
                maxLength={200}
                className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#047857]"
              />
            </div>
            {targetScore && parseFloat(targetScore) >= 0 && parseFloat(targetScore) <= 10 && (
              <div className="p-3 rounded-xl bg-[#047857]/5 border border-[#047857]/15 text-xs text-muted-foreground">
                Target: <strong className="text-foreground">{parseFloat(targetScore).toFixed(1)}</strong> / 10
                {targetDate && <> by <strong className="text-foreground">{new Date(targetDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</strong></>}
                {targetLabel && <> — {targetLabel}</>}
              </div>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowTargetDialog(false)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-[#047857] hover:bg-[#1a6626] text-white"
                onClick={handleSaveTarget}
                disabled={setAmbitionTarget.isPending || !targetScore}
              >
                {setAmbitionTarget.isPending ? "Saving…" : "Save Target"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* ── Summary Actions ── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Next steps</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/dashboard/leader">
            <Button variant="outline" className="w-full gap-2 text-xs justify-start">
              <BarChart3 className="w-3.5 h-3.5" />
              View full function dashboard
            </Button>
          </Link>
          <Button variant="outline" className="w-full gap-2 text-xs justify-start" onClick={openTargetDialog}>
            <Target className="w-3.5 h-3.5" />
            Update ambition target
          </Button>
          <Link href="/admin/learning">
            <Button variant="outline" className="w-full gap-2 text-xs justify-start">
              <TrendingUp className="w-3.5 h-3.5" />
              Review learning content
            </Button>
          </Link>
          <Link href="/reports">
            <Button variant="outline" className="w-full gap-2 text-xs justify-start">
              <ArrowRight className="w-3.5 h-3.5" />
              Export strategy report
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
