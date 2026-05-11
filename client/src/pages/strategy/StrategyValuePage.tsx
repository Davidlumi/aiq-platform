/**
 * StrategyValuePage — /strategy/value
 * Section 05: The Value Case
 */
import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, TrendingUp, CheckCircle2, ArrowRight, ChevronDown, Info } from "lucide-react";

export default function StrategyValuePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [perInitCollapsed, setPerInitCollapsed] = useState(true);
  const [qualBulletsCollapsed, setQualBulletsCollapsed] = useState(true);

  const assessmentQ = trpc.intelligence.getStrategyAssessment.useQuery();
  const valueEnvQ   = trpc.intelligence.calculateValueEnvelope.useQuery(
    { selectedInitiativeIds: assessmentQ.data?.selectedInitiativeIds ?? [] },
    { enabled: (assessmentQ.data?.selectedInitiativeIds?.length ?? 0) > 0 }
  );

  const assessment = assessmentQ.data;
  const ve         = valueEnvQ.data;

  const isLoading = assessmentQ.isLoading;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto pb-16 px-0">
        <Skeleton className="h-7 w-48 mb-6 mt-2 rounded" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
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
        <span className="text-xs font-medium text-foreground">The Value Case</span>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#34D39920", color: "#34D399" }}>
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Section 05</p>
          <h1 className="text-xl font-bold text-foreground">The Value Case</h1>
        </div>
      </div>

      {!ve ? (
        <div className="rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/4 p-6">
          <TrendingUp className="w-4 h-4 text-emerald-400 mb-2" />
          <p className="text-sm font-semibold text-foreground mb-1">No initiatives selected</p>
          <p className="text-sm text-muted-foreground">Select initiatives to generate the value envelope.</p>
        </div>
      ) : (
        <>
          {/* Headline KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Gross Value",    value: ve.total_quantified_value_gbp ? `£${ve.total_quantified_value_gbp.low.toLocaleString()}k–£${ve.total_quantified_value_gbp.high.toLocaleString()}k` : "Qualitative", color: "#34D399" },
              { label: "Net Value",      value: ve.net_value_gbp   ? `£${ve.net_value_gbp.low.toLocaleString()}k–£${ve.net_value_gbp.high.toLocaleString()}k`   : "Qualitative", color: "#60A5FA" },
              { label: "NPV",            value: ve.financial_model?.npv_gbp ? `£${ve.financial_model.npv_gbp.low.toLocaleString()}k–£${ve.financial_model.npv_gbp.high.toLocaleString()}k` : "—", color: "#A78BFA" },
              { label: "Payback Period", value: ve.payback_period_months ? `${ve.payback_period_months.low}–${ve.payback_period_months.high} mo` : "—",                        color: "#FBBF24" },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-xl border border-white/8 bg-white/2 p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{kpi.label}</p>
                <p className="text-base font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Per-initiative breakdown */}
          {ve.by_initiative && ve.by_initiative.length > 0 && (
            <div className="rounded-xl border border-white/8 bg-white/2 mb-5 overflow-hidden">
              <button
                onClick={() => setPerInitCollapsed(c => !c)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/3 transition-colors"
                aria-expanded={!perInitCollapsed}
              >
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Value by Initiative</p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{perInitCollapsed ? `See ${ve.by_initiative.length} initiatives` : "Hide"}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${perInitCollapsed ? "" : "rotate-180"}`} />
                </div>
              </button>
              {!perInitCollapsed && (
                <div className="divide-y divide-white/5 animate-in slide-in-from-top-2 duration-200">
                  {ve.by_initiative.map((item: any) => (
                    <div key={item.initiative_id} className="px-5 py-3 flex items-start gap-3 hover:bg-white/2 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{item.display_name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            item.value_type === "cost_savings"       ? "bg-emerald-500/15 text-emerald-400" :
                            item.value_type === "productivity_gain"  ? "bg-blue-500/15 text-blue-400" :
                            item.value_type === "risk_avoidance"     ? "bg-red-500/15 text-red-400" :
                            item.value_type === "capability_uplift"  ? "bg-violet-500/15 text-violet-400" :
                            "bg-slate-500/15 text-slate-400"
                          }`}>{item.value_type?.replace(/_/g, " ")}</span>
                          {item.uses_sector_default && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">sector default</span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {item.quantified_value_gbp ? item.monetisation_breakdown : item.qualitative_value?.slice(0, 2).join(" · ")}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {item.quantified_value_gbp ? (
                          <>
                            <div className="text-sm font-semibold text-emerald-400">£{item.quantified_value_gbp.high.toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground">low £{item.quantified_value_gbp.low.toLocaleString()}</div>
                          </>
                        ) : (
                          <div className="text-[11px] text-muted-foreground italic">Qualitative</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Qualitative highlights */}
          {ve.qualitative_summary?.bullet_points?.length > 0 && (
            <div className="rounded-xl border border-white/8 bg-white/2 px-5 py-4 mb-5">
              <button
                onClick={() => setQualBulletsCollapsed(c => !c)}
                className="w-full flex items-center justify-between"
                aria-expanded={!qualBulletsCollapsed}
              >
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Qualitative Value Highlights</div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{qualBulletsCollapsed ? `See ${ve.qualitative_summary.bullet_points.length} outcomes` : "Hide"}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${qualBulletsCollapsed ? "" : "rotate-180"}`} />
                </div>
              </button>
              {!qualBulletsCollapsed && (
                <ul className="space-y-1.5 mt-3 animate-in slide-in-from-top-2 duration-200">
                  {ve.qualitative_summary.bullet_points.map((b: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Methodology note */}
          <div className="rounded-lg border border-white/6 bg-white/2 px-4 py-3 flex items-start gap-2 mb-5">
            <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              All figures are indicative ranges for business case development, derived from sector-benchmarked improvement percentages applied to your operational baseline. Confirm with Finance before commitment.
            </p>
          </div>
        </>
      )}

      <div className="rounded-2xl border border-white/8 bg-white/2 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Next step</p>
          <p className="text-sm text-foreground">Set up your measurement plan and review cadence.</p>
        </div>
        <Button variant="outline" size="sm" className="text-xs h-8 border-white/15 hover:border-white/30" onClick={() => navigate("/strategy/measurement")}>
          View measurement plan <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
