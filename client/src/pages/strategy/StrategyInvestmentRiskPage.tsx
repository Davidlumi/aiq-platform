/**
 * StrategyInvestmentRiskPage — /strategy/investment-risk
 * Section 04: Investment & Risk
 */
import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, PoundSterling, Shield, AlertTriangle, ArrowRight, ChevronDown } from "lucide-react";

const PHASE_COST_PER_INIT: Record<string, { low: number; high: number }> = {
  "Q1": { low: 20,  high: 60  },
  "Q2": { low: 40,  high: 120 },
  "Q3": { low: 60,  high: 200 },
  "Q4": { low: 30,  high: 100 },
};

const PHASE_LABELS: Record<string, { label: string; color: string; months: string }> = {
  "Q1": { label: "Phase 1 — Foundation", color: "#60A5FA", months: "Months 1–3"   },
  "Q2": { label: "Phase 2 — Build",      color: "#A78BFA", months: "Months 4–6"   },
  "Q3": { label: "Phase 3 — Scale",      color: "#4ADE80", months: "Months 7–12"  },
  "Q4": { label: "Phase 4 — Optimise",   color: "#FBBF24", months: "Months 13–18" },
};

const FOUNDATION_CATEGORIES = new Set(["Change & Capability", "Governance & Ethics", "HR Operations"]);
const SCALE_CATEGORIES      = new Set(["People Analytics", "HR Business Partnering"]);
const OPTIMISE_CATEGORIES   = new Set(["Ethics & Governance", "Governance & Ethics", "People Analytics", "HR Business Partnering"]);

function assignPhase(initiative: { category: string; complexity: number | string; name: string }): string {
  const complexity = Number(initiative.complexity);
  const cat = initiative.category ?? "";
  if (initiative.name.toLowerCase().includes("literacy")) return "Q1";
  if (initiative.name.toLowerCase().includes("ethics & governance")) return "Q1";
  if (complexity <= 2 && FOUNDATION_CATEGORIES.has(cat)) return "Q1";
  if (complexity <= 2) return "Q2";
  if (complexity === 3 && FOUNDATION_CATEGORIES.has(cat)) return "Q2";
  if (complexity === 3 && SCALE_CATEGORIES.has(cat)) return "Q3";
  if (complexity === 3) return "Q2";
  if (complexity >= 4 && OPTIMISE_CATEGORIES.has(cat)) return "Q4";
  if (complexity >= 4 && SCALE_CATEGORIES.has(cat)) return "Q3";
  if (complexity >= 4) return "Q3";
  return "Q2";
}

export default function StrategyInvestmentRiskPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [riskCollapsed, setRiskCollapsed] = useState<Record<string, boolean>>({});

  const strategyQ    = trpc.intelligence.getStrategy.useQuery();
  const assessmentQ  = trpc.intelligence.getStrategyAssessment.useQuery();
  const initiativesQ = trpc.strategy.listInitiatives.useQuery(
    { tenantId: user?.tenantId ?? "" },
    { enabled: !!user?.tenantId }
  );
  const ambitionTier = useMemo((): "cautious" | "progressive" | "transformative" => {
    const bl = strategyQ.data?.businessAmbitionLevel ?? 3;
    if (bl >= 4) return "transformative";
    if (bl >= 3) return "progressive";
    return "cautious";
  }, [strategyQ.data?.businessAmbitionLevel]);

  const costEnvQ = trpc.intelligence.calculateCostEnvelope.useQuery(
    {
      selectedInitiativeIds: assessmentQ.data?.selectedInitiativeIds ?? [],
      orgSize: "medium",
      ambitionTier,
    },
    { enabled: (assessmentQ.data?.selectedInitiativeIds?.length ?? 0) > 0 }
  );

  const strategyData   = strategyQ.data;
  const assessment     = assessmentQ.data;
  const allInitiatives = initiativesQ.data ?? [];
  const costEnvelope   = costEnvQ.data;

  const selectedInitiativeIds = useMemo(() => {
    const ids = assessment?.selectedInitiativeIds ?? strategyData?.selectedInitiativeIds ?? [];
    return new Set<string>(ids);
  }, [assessment?.selectedInitiativeIds, strategyData?.selectedInitiativeIds]);

  const selectedInits = useMemo(
    () => allInitiatives.filter((i: any) => selectedInitiativeIds.has(i.id)),
    [allInitiatives, selectedInitiativeIds]
  );

  const initiativesByPhase = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const init of selectedInits) {
      const phase = assignPhase(init as { category: string; complexity: number | string; name: string });
      if (!groups[phase]) groups[phase] = [];
      groups[phase].push(init);
    }
    return (["Q1", "Q2", "Q3", "Q4"] as const)
      .filter(p => groups[p]?.length > 0)
      .map(p => ({ phase: p, items: groups[p] }));
  }, [selectedInits]);

  const totalLow  = costEnvelope?.totalMin ?? initiativesByPhase.reduce((s, g) => s + g.items.length * (PHASE_COST_PER_INIT[g.phase]?.low ?? 20), 0);
  const totalHigh = costEnvelope?.totalMax ?? initiativesByPhase.reduce((s, g) => s + g.items.length * (PHASE_COST_PER_INIT[g.phase]?.high ?? 60), 0);

  const isLoading = strategyQ.isLoading || assessmentQ.isLoading || initiativesQ.isLoading;

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
        <span className="text-xs font-medium text-foreground">Investment & Risk</span>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#FBBF2420", color: "#FBBF24" }}>
          <PoundSterling className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Section 04</p>
          <h1 className="text-xl font-bold text-foreground">Investment & Risk</h1>
        </div>
      </div>

      {/* Total cost banner */}
      {selectedInits.length > 0 && (
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <PoundSterling className="w-4 h-4 text-amber-400" />
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Total Cost Envelope</p>
            <span className="ml-auto text-[10px] text-muted-foreground">Indicative — confirm with Finance</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">£{totalLow.toLocaleString()}k</span>
            <span className="text-muted-foreground text-sm">–</span>
            <span className="text-2xl font-bold text-foreground">£{totalHigh.toLocaleString()}k</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Across {selectedInits.length} initiatives over 18 months</p>

          {/* By phase */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {initiativesByPhase.map(({ phase, items }) => {
              const meta = PHASE_LABELS[phase];
              const cost = PHASE_COST_PER_INIT[phase] ?? { low: 20, high: 60 };
              const livePhase = costEnvelope?.byPhase?.find((p: any) => p.phase === { Q1: "foundation", Q2: "build", Q3: "scale", Q4: "optimise" }[phase]);
              const low  = livePhase?.minGbk ?? items.length * cost.low;
              const high = livePhase?.maxGbk ?? items.length * cost.high;
              return (
                <div key={phase} className="rounded-lg border border-white/8 bg-white/2 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                    <p className="text-[10px] text-muted-foreground">{meta.months}</p>
                  </div>
                  <p className="text-sm font-bold text-foreground">£{low}k–£{high}k</p>
                  <p className="text-[10px] text-muted-foreground">{items.length} initiative{items.length !== 1 ? "s" : ""}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Regulatory risks from initiatives */}
      {(() => {
        const regulatoryInits = selectedInits.filter((i: any) => i.regulatoryFlag);
        if (regulatoryInits.length === 0) return null;
        return (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">EU AI Act Flagged Initiatives</p>
              <span className="ml-auto text-xs text-amber-400 font-semibold">{regulatoryInits.length} flagged</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">These initiatives involve AI in high-risk HR processes. Engage Legal / Compliance before deployment.</p>
            <div className="space-y-2">
              {regulatoryInits.map((init: any) => (
                <div key={init.id} className="flex items-center gap-2 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2">
                  <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  <span className="text-xs text-foreground">{init.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{init.category}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Risk register */}
      <div className="rounded-xl border border-white/8 bg-white/2 p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-red-400" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Risk Register</p>
        </div>
        {[
          { id: "r1", level: "high",   title: "Change fatigue",          description: "Multiple concurrent AI initiatives may overwhelm HR teams. Mitigate by phasing rollout and investing in change management in Phase 1.", color: "#F87171" },
          { id: "r2", level: "high",   title: "Data quality gaps",       description: "AI tools require clean, structured HR data. Conduct a data audit in Phase 1 before deploying predictive or generative tools.", color: "#F87171" },
          { id: "r3", level: "medium", title: "Vendor lock-in",          description: "Selecting proprietary AI platforms without exit clauses creates long-term dependency. Require data portability in all vendor contracts.", color: "#FBBF24" },
          { id: "r4", level: "medium", title: "Algorithmic bias",        description: "AI tools trained on historical HR data may perpetuate existing biases. Mandate bias audits before any tool touches employment decisions.", color: "#FBBF24" },
          { id: "r5", level: "low",    title: "Skills gap in HR team",   description: "HR teams may lack the technical literacy to evaluate AI outputs critically. Address through the AI literacy programme in Phase 1.", color: "#4ADE80" },
        ].map(risk => (
          <div key={risk.id} className="rounded-lg border border-white/8 bg-white/2 mb-2 overflow-hidden">
            <button
              onClick={() => setRiskCollapsed(s => ({ ...s, [risk.id]: !s[risk.id] }))}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors"
              aria-expanded={!riskCollapsed[risk.id]}
            >
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide flex-shrink-0" style={{ background: `${risk.color}20`, color: risk.color }}>{risk.level}</span>
              <span className="text-sm font-medium text-foreground flex-1 text-left">{risk.title}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform ${riskCollapsed[risk.id] ? "" : "rotate-180"}`} />
            </button>
            {!riskCollapsed[risk.id] && (
              <div className="px-4 pb-3 animate-in slide-in-from-top-1 duration-200">
                <p className="text-xs text-muted-foreground leading-relaxed">{risk.description}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/2 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Next step</p>
          <p className="text-sm text-foreground">Review the value and ROI case for this investment.</p>
        </div>
        <Button variant="outline" size="sm" className="text-xs h-8 border-white/15 hover:border-white/30" onClick={() => navigate("/strategy/value")}>
          View value case <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
