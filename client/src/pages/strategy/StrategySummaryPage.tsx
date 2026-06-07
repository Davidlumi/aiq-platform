/**
 * StrategySummaryPage — T14 (Phase E)
 *
 * Route: /strategy/summary
 * Gate: Stage 11 must be cleared. If not, redirect to /strategy/board-report.
 * Persistent landing: once Stage 11 is cleared, returning to the flow lands here.
 *
 * Four zones (per brief):
 * 1. Deliverable — export/download the full board report (most prominent)
 * 2. Strategy at a glance — read-only pull of headline from each stage
 * 3. Completion integrity — which stages are Cleared vs Needs re-confirmation
 * 4. Next actions — re-enter any stage, regenerate report, export
 *
 * HARD REQUIREMENT: if Stage 9 (Business Case) is amber (stage9EditedAfterClearing),
 * the headline investment number must carry a "needs re-confirmation" indicator.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Clock,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useGate } from "@/contexts/GateContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtGbk(v: number | undefined | null): string {
  if (v == null) return "—";
  if (v >= 1000) return `£${(v / 1000).toFixed(1)}m`;
  return `£${v}k`;
}

function stageLabel(n: number): string {
  const labels: Record<number, string> = {
    1: "Background Inputs", 2: "Vision", 3: "Strategy", 4: "Principles",
    5: "The Plan", 6: "Roadmap", 7: "Success Measures", 8: "Capability",
    9: "Business Case", 10: "Review", 11: "Board Report",
  };
  return labels[n] ?? `Stage ${n}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StagePill({ cleared, edited, label }: { cleared: boolean; edited: boolean; label: string }) {
  if (!cleared) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
        <Clock className="w-3 h-3" />
        {label}
      </span>
    );
  }
  if (edited) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25">
        <AlertTriangle className="w-3 h-3" />
        {label} — Needs re-confirmation
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
      <CheckCircle2 className="w-3 h-3" />
      {label}
    </span>
  );
}

function StalenessFlag({ stale, children }: { stale: boolean; children: React.ReactNode }) {
  if (!stale) return <>{children}</>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {children}
      <span
        title="Stage 9 (Business Case) needs re-confirmation — this figure may be out of date."
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25 cursor-help"
      >
        <AlertTriangle className="w-3 h-3" />
        Needs re-confirmation
      </span>
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StrategySummaryPage() {
  const [, navigate] = useLocation();
  const gate = useGate();

  // Gate guard: if Stage 11 not cleared, redirect to board report
  useEffect(() => {
    if (!gate.isLoading && !gate.stage11Cleared) {
      navigate("/strategy/board-report");
    }
  }, [gate.isLoading, gate.stage11Cleared, navigate]);

  // ── Data queries ──────────────────────────────────────────────────────────
  const assessmentQ   = trpc.intelligence.getStrategyAssessment.useQuery();
  const ambitionQ     = trpc.intelligence.getAmbitionSections.useQuery();
  const roadmapQ      = trpc.intelligence.getRoadmap.useQuery();
  const riskRegQ      = trpc.intelligence.getRiskRegister.useQuery();
  const reviewQ       = trpc.intelligence.getReviewSession.useQuery();
  const boardReportQ  = trpc.intelligence.getBoardReport.useQuery();
  const initiativesQ  = trpc.contentLibrary.listInitiatives.useQuery({ phase: "all" });

  // Cost envelope — needs selectedInitiativeIds, orgSize, ambitionTier
  const selectedIds = useMemo(
    () => assessmentQ.data?.selectedInitiativeIds ?? [],
    [assessmentQ.data?.selectedInitiativeIds]
  );
  const orgSize = useMemo((): "small" | "medium" | "large" | "enterprise" => {
    const hc = assessmentQ.data?.headcount ?? 0;
    if (hc < 250) return "small";
    if (hc < 1000) return "medium";
    if (hc < 5000) return "large";
    return "enterprise";
  }, [assessmentQ.data?.headcount]);
  const ambitionTier = useMemo((): "cautious" | "progressive" | "transformative" => {
    const biz = assessmentQ.data?.businessAmbitionLevel ?? 2;
    const ppl = assessmentQ.data?.peopleAmbitionLevel ?? 2;
    const avg = ((biz as number) + (ppl as number)) / 2;
    if (avg <= 1.5) return "cautious";
    if (avg <= 2.5) return "progressive";
    return "transformative";
  }, [assessmentQ.data?.businessAmbitionLevel, assessmentQ.data?.peopleAmbitionLevel]);

  const costEnvQ = trpc.intelligence.calculateCostEnvelope.useQuery(
    { selectedInitiativeIds: selectedIds, orgSize, ambitionTier },
    { enabled: selectedIds.length > 0 }
  );

  // ── Derived state ─────────────────────────────────────────────────────────
  const investmentStale = gate.stage9EditedAfterClearing;

  const initiativeMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of initiativesQ.data ?? []) m.set(i.initiative_id, i.display_name);
    return m;
  }, [initiativesQ.data]);

  const roadmapHorizons = useMemo(() => {
    const roadmap = roadmapQ.data?.roadmap;
    if (!roadmap) return null;
    // horizons: [{id, label, order}], assignments: [{initiativeId, horizonId}]
    const horizonLabelMap = new Map(roadmap.horizons.map((h: { id: string; label: string }) => [h.id, h.label.toLowerCase()]));
    // Group assignments by horizon label (now/next/later)
    const groups: Record<string, string[]> = { now: [], next: [], later: [] };
    for (const a of roadmap.assignments) {
      const label = horizonLabelMap.get(a.horizonId) ?? "later";
      const key = label.includes("now") ? "now" : label.includes("next") ? "next" : "later";
      const name = initiativeMap.get(a.initiativeId) ?? a.initiativeId;
      groups[key].push(name);
    }
    return groups;
  }, [roadmapQ.data, initiativeMap]);

  const topMeasures = useMemo(() => {
    const outcomes = ambitionQ.data?.outcomes ?? [];
    return outcomes
      .filter((o: { primary_measure?: string | null }) => o.primary_measure)
      .slice(0, 3);
  }, [ambitionQ.data?.outcomes]);

  const topRisks = useMemo(() => {
    const risks = riskRegQ.data?.risks ?? [];
    return risks
      .filter((r: { status: string }) => r.status !== "dismissed")
      .slice(0, 3);
  }, [riskRegQ.data?.risks]);

  const signOffStatus = useMemo(() => {
    try {
      const raw = reviewQ.data?.reviewSignOffJson;
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Array<{ element: string; status: string }>;
      const total = parsed.length;
      const approved = parsed.filter(e => e.status === "approved" || e.status === "na").length;
      return { total, approved };
    } catch {
      return null;
    }
  }, [reviewQ.data?.reviewSignOffJson]);

  const boardSections = useMemo(() => {
    try {
      const raw = boardReportQ.data?.boardReportSectionsJson;
      if (!raw) return {};
      return JSON.parse(raw) as Record<string, { content: string; wordCount?: number }>;
    } catch {
      return {};
    }
  }, [boardReportQ.data?.boardReportSectionsJson]);

  const totalWords = useMemo(() => {
    return Object.values(boardSections).reduce((sum, s) => sum + (s.wordCount ?? 0), 0);
  }, [boardSections]);

  const sectionCount = Object.keys(boardSections).length;

  // ── Stage integrity data ──────────────────────────────────────────────────
  const stageIntegrity = [
    { n: 1, cleared: gate.stage1Cleared, edited: gate.stage1EditedAfterClearing },
    { n: 2, cleared: gate.stage2Cleared, edited: gate.stage2EditedAfterClearing },
    { n: 3, cleared: gate.stage3Cleared, edited: gate.stage3EditedAfterClearing },
    { n: 4, cleared: gate.stage4Cleared, edited: gate.stage4EditedAfterClearing },
    { n: 5, cleared: gate.stage5Cleared, edited: gate.stage5EditedAfterClearing },
    { n: 6, cleared: gate.stage6Cleared, edited: gate.stage6EditedAfterClearing },
    { n: 7, cleared: gate.stage7Cleared, edited: gate.stage7EditedAfterClearing },
    { n: 8, cleared: gate.stage8Cleared, edited: gate.stage8EditedAfterClearing },
    { n: 9, cleared: gate.stage9Cleared, edited: gate.stage9EditedAfterClearing },
    { n: 10, cleared: gate.stage10Cleared, edited: gate.stage10EditedAfterClearing },
    { n: 11, cleared: gate.stage11Cleared, edited: gate.stage11EditedAfterClearing },
  ];
  const amberCount = stageIntegrity.filter(s => s.cleared && s.edited).length;
  const clearedCount = stageIntegrity.filter(s => s.cleared && !s.edited).length;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const [isRegenerating, setIsRegenerating] = useState(false);
  const utils = trpc.useUtils();

  function handleDownloadPdf() {
    window.open("/api/pdf/board_report", "_blank");
  }
  function handleDownloadDocx() {
    window.open("/api/export/board-report-docx", "_blank");
  }
  async function handleRegenerateReport() {
    // Only regenerate if all upstream stages are confirmed (not amber)
    if (amberCount > 0) {
      toast.warning("One or more stages need re-confirmation. Re-confirm them before regenerating the report to ensure it reflects current data.");
      return;
    }
    setIsRegenerating(true);
    try {
      await utils.intelligence.getBoardReport.invalidate();
      navigate("/strategy/board-report");
    } finally {
      setIsRegenerating(false);
    }
  }

  if (gate.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading strategy summary…</div>
      </div>
    );
  }

  const vision = assessmentQ.data?.visionStatement;
  const archetype = assessmentQ.data?.strategyArchetype;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Strategy complete</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground">HR AI Strategy</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {gate.stage11Cleared ? "All 11 stages confirmed." : "Strategy in progress."}
              {amberCount > 0 && (
                <span className="text-amber-400 ml-2">
                  {amberCount} stage{amberCount !== 1 ? "s" : ""} need re-confirmation.
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleDownloadDocx} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Word
            </Button>
            <Button size="sm" onClick={handleDownloadPdf} className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Download report
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">

        {/* ── Zone 1: Deliverable ──────────────────────────────────────────── */}
        <section>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground mb-1">Board report</h2>
                <p className="text-sm text-muted-foreground">
                  {sectionCount === 6
                    ? `${sectionCount} sections · ${totalWords.toLocaleString()} words`
                    : `${sectionCount} of 6 sections generated`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={handleDownloadDocx} className="gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  Word (.docx)
                </Button>
                <Button size="sm" onClick={handleDownloadPdf} className="gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </Button>
              </div>
            </div>
            {sectionCount < 6 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Not all sections have been generated. Go to Stage 11 to generate the missing sections before exporting.
              </div>
            )}
            {amberCount > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400 mt-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {amberCount} stage{amberCount !== 1 ? "s" : ""} need re-confirmation. The exported report reflects the last confirmed version of those sections.
              </div>
            )}
          </div>
        </section>

        {/* ── Zone 2: Strategy at a glance ─────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Strategy at a glance</h2>
          <div className="space-y-4">

            {/* Vision */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Vision</div>
              {vision ? (
                <p className="text-sm text-foreground leading-relaxed">{vision}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not set</p>
              )}
              {archetype && (
                <Badge variant="secondary" className="mt-2 text-xs">{archetype}</Badge>
              )}
            </div>

            {/* Selected initiatives + roadmap horizons */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Initiative portfolio</div>
              {roadmapHorizons ? (
                <div className="grid grid-cols-3 gap-3">
                  {(["now", "next", "later"] as const).map(h => (
                    <div key={h}>
                      <div className="text-xs font-medium text-muted-foreground mb-1.5 capitalize">{h}</div>
                      {roadmapHorizons[h].length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">None assigned</p>
                      ) : (
                        <ul className="space-y-1">
                          {roadmapHorizons[h].map((name: string, i: number) => (
                            <li key={i} className="text-xs text-foreground leading-snug">{name}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Roadmap not yet configured</p>
              )}
            </div>

            {/* Investment */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Headline investment</div>
              {costEnvQ.data ? (
                <StalenessFlag stale={investmentStale}>
                  <span className="text-xl font-bold text-foreground">
                    {fmtGbk(costEnvQ.data.totalMin)}–{fmtGbk(costEnvQ.data.totalMax)}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">year 1 estimate</span>
                </StalenessFlag>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not calculated</p>
              )}
            </div>

            {/* Top success measures */}
            {topMeasures.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Primary success measures</div>
                <div className="space-y-2">
                  {topMeasures.map((m: { title: string; target_value: number; unit: string; target_date: string }, i: number) => (
                    <div key={i} className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-foreground">{m.title}</span>
                      <span className="text-sm font-medium text-foreground flex-shrink-0">
                        {m.target_value} {m.unit} by {m.target_date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top risks */}
            {topRisks.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Top risks</div>
                <div className="space-y-2">
                  {topRisks.map((r: { description?: string; title?: string; likelihood: number; impact: number }, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs font-medium text-muted-foreground mt-0.5 w-4 flex-shrink-0">{i + 1}.</span>
                      <span className="text-sm text-foreground">{r.description || r.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review sign-off */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Review sign-off</div>
              {signOffStatus ? (
                <p className="text-sm text-foreground">
                  {signOffStatus.approved} of {signOffStatus.total} elements approved or marked N/A
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Review not yet completed</p>
              )}
            </div>

          </div>
        </section>

        {/* ── Zone 3: Completion integrity ─────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Completion integrity</h2>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-foreground font-medium">
                {clearedCount} of 11 stages confirmed
              </span>
              {amberCount > 0 && (
                <span className="text-sm text-amber-400">
                  · {amberCount} need re-confirmation
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {stageIntegrity.map(s => (
                <StagePill
                  key={s.n}
                  cleared={s.cleared}
                  edited={s.edited}
                  label={stageLabel(s.n)}
                />
              ))}
            </div>
          </div>
        </section>

        <Separator />

        {/* ── Zone 4: Next actions ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Next actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => navigate("/strategy/board-report")}
              className="text-left rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <RefreshCw className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm font-medium text-foreground">Regenerate report</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Re-run generation from currently confirmed stage data. Only available when all stages are confirmed.
              </p>
            </button>
            <button
              onClick={handleDownloadDocx}
              className="text-left rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm font-medium text-foreground">Export Word</span>
              </div>
              <p className="text-xs text-muted-foreground">Download the board report as an editable .docx file.</p>
            </button>
            <button
              onClick={() => navigate("/strategy/diagnostic")}
              className="text-left rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm font-medium text-foreground">Edit strategy</span>
              </div>
              <p className="text-xs text-muted-foreground">Return to any stage to update data and re-confirm.</p>
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
