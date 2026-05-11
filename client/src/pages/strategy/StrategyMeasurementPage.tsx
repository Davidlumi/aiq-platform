/**
 * StrategyMeasurementPage — /strategy/measurement
 * Section 06: Measurement Plan
 */
import React from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BarChart3, Sparkles } from "lucide-react";
import {
  MEASUREMENT_CADENCE_OPTIONS,
  PILOT_SCOPE_OPTIONS,
  PILOT_DURATION_OPTIONS,
  PILOT_SUCCESS_METRICS,
} from "@/../../shared/strategyInputs";

export default function StrategyMeasurementPage() {
  const [, navigate] = useLocation();

  const assessmentQ = trpc.intelligence.getStrategyAssessment.useQuery();
  const assessment  = assessmentQ.data;
  const structuredInputs = assessment?.structuredInputs as Record<string, unknown> | null | undefined;

  const cadenceId   = structuredInputs?.measurement_cadence as string | undefined;
  const cadenceOpt  = cadenceId ? MEASUREMENT_CADENCE_OPTIONS.find(o => o.value === cadenceId) : undefined;
  const pilotDesign = structuredInputs?.pilot_design as { scope?: string; duration?: string; success_metrics?: string[] } | undefined;
  const pilotScopeOpt   = pilotDesign?.scope     ? PILOT_SCOPE_OPTIONS.find(o => o.value === pilotDesign.scope)         : undefined;
  const pilotDurOpt     = pilotDesign?.duration   ? PILOT_DURATION_OPTIONS.find(o => o.value === pilotDesign.duration)   : undefined;
  const pilotMetricOpts = (pilotDesign?.success_metrics ?? []).map(id => PILOT_SUCCESS_METRICS.find(m => m.id === id)).filter(Boolean) as typeof PILOT_SUCCESS_METRICS;

  const hasMeasurement = cadenceOpt || pilotDesign;

  if (assessmentQ.isLoading) {
    return (
      <div className="max-w-5xl mx-auto pb-16 px-0">
        <Skeleton className="h-7 w-48 mb-6 mt-2 rounded" />
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-16 px-0">
      <div className="flex items-center gap-2 mb-6 pt-2">
        <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground" onClick={() => navigate("/strategy")}>
          <ArrowLeft className="w-3 h-3 mr-1" />HR AI Strategy
        </Button>
        <span className="text-muted-foreground text-xs">/</span>
        <span className="text-xs font-medium text-foreground">Measurement Plan</span>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#2DD4BF20", color: "#2DD4BF" }}>
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Section 06</p>
          <h1 className="text-xl font-bold text-foreground">Measurement Plan</h1>
        </div>
        <Button variant="outline" size="sm" className="ml-auto text-xs h-7 border-white/15 hover:border-white/30 text-muted-foreground" onClick={() => navigate("/ai-strategy/assessment")}>
          <Sparkles className="w-3 h-3 mr-1.5" />Re-run wizard
        </Button>
      </div>

      {!hasMeasurement ? (
        <div className="rounded-xl border border-dashed border-teal-500/20 bg-teal-500/4 p-6 flex items-start gap-4">
          <BarChart3 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground mb-1">Measurement plan not configured</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Complete the Build Strategy wizard to set your review cadence and pilot design.
            </p>
            <Button size="sm" variant="outline" className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10 h-7 text-xs" onClick={() => navigate("/ai-strategy/assessment")}>
              <Sparkles className="w-3 h-3 mr-1.5" />Build Strategy
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {cadenceOpt && (
            <div className="rounded-xl border border-teal-500/15 bg-teal-500/5 p-5">
              <p className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-2">Review Cadence</p>
              <p className="text-base font-bold text-foreground mb-1">{cadenceOpt.label}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                KPI tracking and strategy re-assessment will follow this rhythm. Schedule the first review before the end of the Foundation phase.
              </p>
            </div>
          )}

          {pilotDesign && (
            <div className="rounded-xl border border-white/8 bg-white/2 p-5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Pilot Design</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {pilotScopeOpt && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Scope</p>
                    <p className="text-sm font-semibold text-foreground">{pilotScopeOpt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{pilotScopeOpt.description}</p>
                  </div>
                )}
                {pilotDurOpt && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Duration</p>
                    <p className="text-sm font-semibold text-foreground">{pilotDurOpt.label}</p>
                  </div>
                )}
              </div>
              {pilotMetricOpts.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Success Metrics</p>
                  <div className="space-y-2">
                    {(["efficiency", "effectiveness", "strategic"] as const).map(tier => {
                      const tierMetrics = pilotMetricOpts.filter(m => m.tier === tier);
                      if (tierMetrics.length === 0) return null;
                      const tierColors = { efficiency: "#60A5FA", effectiveness: "#A78BFA", strategic: "#4ADE80" };
                      const tierLabels = { efficiency: "Efficiency", effectiveness: "Effectiveness", strategic: "Strategic" };
                      return (
                        <div key={tier}>
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: tierColors[tier] }}>{tierLabels[tier]}</p>
                          <div className="flex flex-wrap gap-2">
                            {tierMetrics.map(m => (
                              <span key={m.id} className="text-xs px-2.5 py-1 rounded-full border" style={{ borderColor: `${tierColors[tier]}40`, background: `${tierColors[tier]}15`, color: tierColors[tier] }}>
                                {m.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* KPI framework */}
          <div className="rounded-xl border border-white/8 bg-white/2 p-5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Recommended KPI Framework</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { tier: "Efficiency",     color: "#60A5FA", kpis: ["Time-to-hire reduction (%)", "HR cost per FTE (£)", "Admin hours saved per week"] },
                { tier: "Effectiveness",  color: "#A78BFA", kpis: ["Quality-of-hire score", "Manager satisfaction with HR AI tools", "Attrition rate change (%)"] },
                { tier: "Strategic",      color: "#4ADE80", kpis: ["AI capability maturity score", "% HR processes with AI augmentation", "Board-level AI confidence rating"] },
              ].map(col => (
                <div key={col.tier} className="rounded-lg border border-white/6 bg-white/2 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: col.color }}>{col.tier}</p>
                  <ul className="space-y-1.5">
                    {col.kpis.map((kpi, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: col.color }} />
                        {kpi}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
