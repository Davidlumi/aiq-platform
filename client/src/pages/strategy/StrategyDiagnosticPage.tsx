/**
 * StrategyDiagnosticPage — /strategy/diagnostic
 * Section 01: Where we are
 *
 * Shows:
 *  - Company assessment maturity score + org context
 *  - Six-domain gap profile (bar chart)
 *  - Priority gaps (top 3 below threshold)
 *  - On-track domains (collapsible)
 *  - Drift indicator if scores have shifted since strategy was set
 */
import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, BarChart3, Building2, Info, AlertTriangle,
  ChevronDown, ArrowRight, CheckCircle2,
} from "lucide-react";
import { DOMAIN_KEYS, DOMAIN_LABELS, DOMAIN_COLOURS, DOMAIN_DESCRIPTIONS } from "@/lib/domains";
import type { CapabilityKey } from "@/lib/domains";

// ─── Constants ────────────────────────────────────────────────────────────────

const AMBITION_TIER_BASE: Record<number, number> = { 1: 38, 2: 46, 3: 55, 4: 63, 5: 73 };

const BUSINESS_LEVELS: Record<number, { label: string }> = {
  1: { label: "Cautious" },
  2: { label: "Exploratory" },
  3: { label: "Progressive" },
  4: { label: "Ambitious" },
  5: { label: "Transformative" },
};

// ─── Domain bar chart ─────────────────────────────────────────────────────────

function DomainBarChart({
  rows,
}: {
  rows: Array<{ key: string; label: string; current: number | null; target: number; gap: number | null; color: string }>;
}) {
  return (
    <div className="space-y-3">
      {rows.map(row => {
        const hasCurrent = row.current !== null;
        const gapPts = row.gap !== null ? row.gap : null;
        const isGap = gapPts !== null && gapPts > 5;
        const currentDisp = hasCurrent ? (row.current! / 10).toFixed(1) : null;
        const targetDisp = (row.target / 10).toFixed(1);
        const gapDisp = gapPts !== null ? (gapPts / 10).toFixed(1) : null;
        return (
          <div key={row.key} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">{row.label}</span>
              <div className="flex items-center gap-2">
                {hasCurrent && (
                  <span className="text-xs font-mono" style={{ color: row.color }}>{currentDisp}</span>
                )}
                <span className="text-xs text-muted-foreground">→</span>
                <span className="text-xs font-mono text-muted-foreground">{targetDisp}</span>
                {gapDisp !== null && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    isGap ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"
                  }`}>
                    {gapPts! > 0 ? `-${gapDisp}` : gapPts === 0 ? "✓" : `+${Math.abs(Number(gapDisp))}`}
                  </span>
                )}
              </div>
            </div>
            <div className="relative h-2 rounded-full bg-white/8 overflow-visible">
              {hasCurrent && (
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
                  style={{ width: `${row.current!}%`, background: row.color, opacity: 0.7 }}
                />
              )}
              <div
                className="absolute top-[-3px] w-0.5 h-[calc(100%+6px)] rounded-full bg-white/50"
                style={{ left: `${row.target}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 pt-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-blue-400/70 inline-block" />Current</span>
        <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-white/50 inline-block" />Target</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StrategyDiagnosticPage() {
  const [, navigate] = useLocation();
  const [onTrackCollapsed, setOnTrackCollapsed] = useState(true);

  // ── Queries ───────────────────────────────────────────────────────────────
  const strategyQ           = trpc.intelligence.getStrategy.useQuery();
  const ambitionGapQ        = trpc.dashboardV2.leader.ambitionGap.useQuery();
  const companyAssessmentQ  = trpc.companyAssessment.getMyAssessmentResults.useQuery();

  const strategyData    = strategyQ.data;
  const ambitionGap     = ambitionGapQ.data;
  const companyResults  = companyAssessmentQ.data;

  const businessLevel   = strategyData?.businessAmbitionLevel ?? 3;
  const bLevel          = BUSINESS_LEVELS[businessLevel];
  const overallTarget   = AMBITION_TIER_BASE[businessLevel] ?? 55;

  // Domain targets (from strategy)
  const domainTargets = useMemo(() => {
    const dt = strategyData?.domainTargets as Record<string, number> | null | undefined;
    if (dt) return dt;
    const result: Record<string, number> = {};
    for (const k of DOMAIN_KEYS) result[k] = overallTarget;
    return result;
  }, [strategyData?.domainTargets, overallTarget]);

  // Domain gap rows
  const domainGapRows = useMemo(() => {
    const clamp = (v: number) => Math.min(100, Math.max(0, v));
    const scores = strategyData?.currentDomainScores as Record<string, number> | null | undefined;
    return DOMAIN_KEYS.map(key => {
      const target  = domainTargets[key] ?? overallTarget;
      const current = scores?.[key] ?? null;
      const gap     = current !== null ? target - current : null;
      return {
        key,
        label:       DOMAIN_LABELS[key as CapabilityKey],
        description: (DOMAIN_DESCRIPTIONS as any)?.[key as CapabilityKey] ?? "",
        target,
        current,
        gap,
        color:       DOMAIN_COLOURS[key as CapabilityKey] ?? "#60A5FA",
      };
    }).sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0));
  }, [domainTargets, strategyData, overallTarget]);

  const priorityGaps = domainGapRows.filter(r => r.gap !== null && r.gap > 5).slice(0, 3);
  const onTrackRows  = domainGapRows.filter(r => r.gap === null || r.gap <= 5);

  const hrNow    = ambitionGap?.functionAvgRaw != null ? (ambitionGap.functionAvgRaw / 10).toFixed(1) : null;
  const hrTarget = (overallTarget / 10).toFixed(1);
  const hrGap    = hrNow != null ? ((overallTarget - ambitionGap!.functionAvgRaw!) / 10).toFixed(1) : null;

  const hasDrift = useMemo(() => {
    if (!companyResults || !strategyData?.ambitionTargetScore) return false;
    const currentScore = companyResults.overallScore * 20;
    return Math.abs(currentScore - strategyData.ambitionTargetScore) >= 6;
  }, [companyResults, strategyData]);

  const isLoading = strategyQ.isLoading || ambitionGapQ.isLoading || companyAssessmentQ.isLoading;

  return (
    <div className="max-w-5xl mx-auto pb-16 px-0">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/strategy")}
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          HR AI Strategy
        </Button>
        <span className="text-muted-foreground text-xs">/</span>
        <span className="text-xs font-medium text-foreground">Where we are</span>
      </div>

      {/* Section header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#60A5FA20", color: "#60A5FA" }}>
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Section 01</p>
          <h1 className="text-xl font-bold text-foreground">Where we are</h1>
        </div>
      </div>

      {/* Drift banner */}
      {hasDrift && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-0.5">Capability has shifted since this strategy was set</p>
            <p className="text-xs text-muted-foreground">The latest assessment results differ from the snapshot used when this strategy was configured. Consider revisiting priorities.</p>
          </div>
        </div>
      )}

      {/* Company assessment block */}
      {isLoading ? (
        <div className="rounded-2xl border border-white/8 bg-white/2 p-6 mb-6">
          <Skeleton className="h-4 w-32 mb-4 rounded" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </div>
      ) : companyResults ? (
        <div className="rounded-2xl border border-white/8 bg-white/2 p-6 mb-6">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Organisation Maturity</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Overall Maturity", value: `${companyResults.overallScore.toFixed(1)} / 5`, color: "#60A5FA" },
              { label: "HR Now", value: hrNow ? `${hrNow} / 10` : "—", color: "#60A5FA" },
              { label: "HR Target", value: `${hrTarget} / 10`, color: "#94A3B8" },
              { label: "Gap", value: hrGap && Number(hrGap) > 0 ? hrGap : "—", color: "#FBBF24" },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-xl border border-white/8 bg-white/3 p-4 text-center">
                <p className="text-2xl font-bold mb-0.5" style={{ color: kpi.color }}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            ))}
          </div>
          {companyResults.companyName && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" />
              <span>{companyResults.companyName}</span>
              {companyResults.companySector && (
                <><span>·</span><span>{companyResults.companySector}</span></>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-blue-500/20 bg-blue-500/4 p-5 mb-6 flex items-start gap-4">
          <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground mb-1">No Company Assessment completed</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Complete the Company Assessment to ground this strategy in your organisation's actual AI maturity.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 h-7 text-xs"
              onClick={() => navigate("/company-assessment")}
            >
              <Building2 className="w-3 h-3 mr-1.5" />
              Complete Company Assessment
            </Button>
          </div>
        </div>
      )}

      {/* Six-domain gap profile */}
      <div className="rounded-2xl border border-white/10 bg-white/3 p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">HR Team Capability</p>
            <p className="text-sm font-semibold text-foreground">Six-Domain Gap Profile</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Scores shown as /10. Target line = {bLevel?.label} ambition threshold.
            </p>
          </div>
          {ambitionGap?.configured && hrNow && (
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-center">
                <p className="text-xl font-bold text-blue-400">{hrNow}</p>
                <p className="text-[10px] text-muted-foreground">Now</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="text-center">
                <p className="text-xl font-bold text-green-400">{hrTarget}</p>
                <p className="text-[10px] text-muted-foreground">Target</p>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}
          </div>
        ) : (
          <DomainBarChart rows={domainGapRows} />
        )}

        {!ambitionGap?.configured && !isLoading && (
          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Configure and save a strategy to see the live gap analysis.
          </p>
        )}
      </div>

      {/* Priority gaps */}
      {priorityGaps.length > 0 && (
        <div className="rounded-2xl border border-red-500/15 bg-red-500/4 p-5 mb-4">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-3">
            Priority Gaps — {priorityGaps.length} capabilities below threshold
          </p>
          <div className="space-y-3">
            {priorityGaps.map(row => (
              <div key={row.key} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: row.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-semibold text-foreground">{row.label}</p>
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 flex-shrink-0 ml-2">
                      -{(row.gap! / 10).toFixed(1)} pts
                    </span>
                  </div>
                  {row.description && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{row.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* On-track domains (collapsible) */}
      {onTrackRows.length > 0 && (
        <div className="rounded-2xl border border-green-500/15 bg-green-500/4 p-5 mb-6">
          <button
            onClick={() => setOnTrackCollapsed(c => !c)}
            className="w-full flex items-center justify-between"
            aria-expanded={!onTrackCollapsed}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">
                On Track — {onTrackRows.length} {onTrackRows.length === 1 ? "domain" : "domains"} at or above threshold
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${onTrackCollapsed ? "" : "rotate-180"}`} />
          </button>
          {!onTrackCollapsed && (
            <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
              {onTrackRows.map(row => (
                <div key={row.key} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
                  <p className="text-xs text-foreground">{row.label}</p>
                  {row.current !== null && (
                    <span className="text-xs font-mono text-green-400 ml-auto">{(row.current / 10).toFixed(1)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="rounded-2xl border border-white/8 bg-white/2 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Next step</p>
          <p className="text-sm text-foreground">Review your ambition settings and adjust targets if needed.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8 border-white/15 hover:border-white/30"
          onClick={() => navigate("/strategy/ambition")}
        >
          View ambition settings
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>

    </div>
  );
}
