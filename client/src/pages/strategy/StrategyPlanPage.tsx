/**
 * StrategyPlanPage — /strategy/plan
 * Section 03: The Plan — phased initiative roadmap
 */
import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft, GitMerge, Layers, Settings2, ArrowRight,
  ChevronDown, ChevronUp, Info, ExternalLink,
} from "lucide-react";

const PHASE_LABELS: Record<string, { label: string; color: string; months: string; description: string }> = {
  "Q1": { label: "Phase 1 — Foundation", color: "#60A5FA", months: "Months 1–3",   description: "Governance, literacy, and quick wins that de-risk everything that follows." },
  "Q2": { label: "Phase 2 — Build",      color: "#A78BFA", months: "Months 4–6",   description: "Core tooling and process automation across priority HR workflows." },
  "Q3": { label: "Phase 3 — Scale",      color: "#4ADE80", months: "Months 7–12",  description: "Expand proven use cases, integrate analytics, and embed AI in BAU." },
  "Q4": { label: "Phase 4 — Optimise",   color: "#FBBF24", months: "Months 13–18", description: "Continuous improvement, advanced analytics, and operating model maturation." },
};

const DA_LABELS: Record<string, string> = {
  recommends_to_human: "Recommends",
  human_in_loop:       "Human-in-loop",
  full_automation:     "Full automation",
};

const AI_TYPE_COLORS: Record<string, string> = {
  generative:      "#A78BFA",
  predictive:      "#60A5FA",
  automation:      "#4ADE80",
  nlp:             "#F472B6",
  computer_vision: "#FB923C",
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

const DOMAIN_LABELS: Record<string, string> = {
  ai_interaction:           "AI Interaction",
  data_literacy:            "Data Literacy",
  ethical_ai:               "Ethical AI",
  ai_strategy:              "AI Strategy",
  change_management:        "Change Management",
  technical_implementation: "Technical Implementation",
};

function InitiativeDetailModal({ initiative, open, onClose }: { initiative: any | null; open: boolean; onClose: () => void }) {
  const [, navigate] = useLocation();
  if (!initiative) return null;
  const typeColor = AI_TYPE_COLORS[initiative.aiType] ?? "#9CA3AF";
  const segments: string[] = initiative.owningSegmentsJson ?? [];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold pr-6">{initiative.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="flex flex-wrap gap-2">
            {initiative.aiType && (
              <Badge style={{ background: `${typeColor}22`, color: typeColor, border: `1px solid ${typeColor}44` }} className="text-xs">
                {initiative.aiType}
              </Badge>
            )}
            {initiative.decisionAuthority && (
              <Badge variant="outline" className="text-xs">{DA_LABELS[initiative.decisionAuthority] ?? initiative.decisionAuthority}</Badge>
            )}
            {initiative.regulatoryFlag && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">EU AI Act</Badge>
            )}
          </div>
          {initiative.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{initiative.description}</p>
          )}
          {segments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Owning HR Segments</p>
              <div className="flex flex-wrap gap-1.5">
                {segments.map((s: string) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
              </div>
            </div>
          )}
          {initiative.capabilityImpactJson && Object.keys(initiative.capabilityImpactJson).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Capability Impact</p>
              <div className="space-y-2">
                {(Object.entries(initiative.capabilityImpactJson) as [string, number][]).map(([domain, impact]) => (
                  <div key={domain} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-40 truncate">{DOMAIN_LABELS[domain] ?? domain}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/8">
                      <div className="h-full rounded-full bg-green-400/70" style={{ width: `${Math.min(100, impact * 20)}%` }} />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-4 text-right">+{impact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => { onClose(); navigate(`/learning/initiative/${initiative.id}`); }}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
          >
            See modules building this capability <ExternalLink className="w-3 h-3 ml-1" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function StrategyPlanPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [selectedInitiative, setSelectedInitiative] = useState<any | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({ Q1: true, Q2: true, Q3: false, Q4: false });

  const strategyQ    = trpc.intelligence.getStrategy.useQuery();
  const assessmentQ  = trpc.intelligence.getStrategyAssessment.useQuery();
  const initiativesQ = trpc.strategy.listInitiatives.useQuery(
    { tenantId: user?.tenantId ?? "" },
    { enabled: !!user?.tenantId }
  );

  const strategyData   = strategyQ.data;
  const assessment     = assessmentQ.data;
  const allInitiatives = initiativesQ.data ?? [];

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

  const isLoading = strategyQ.isLoading || assessmentQ.isLoading || initiativesQ.isLoading;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto pb-16 px-0">
        <Skeleton className="h-7 w-48 mb-6 mt-2 rounded" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
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
        <span className="text-xs font-medium text-foreground">The Plan</span>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#A78BFA20", color: "#A78BFA" }}>
          <GitMerge className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Section 03</p>
          <h1 className="text-xl font-bold text-foreground">The Plan</h1>
        </div>
        <Button variant="outline" size="sm" className="ml-auto text-xs h-7 border-white/15 hover:border-white/30 text-muted-foreground" onClick={() => navigate("/ai-strategy")}>
          <Settings2 className="w-3 h-3 mr-1.5" />Edit initiatives
        </Button>
      </div>

      {selectedInits.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(["Q1", "Q2", "Q3", "Q4"] as const).map(phase => {
            const group = initiativesByPhase.find(g => g.phase === phase);
            const meta = PHASE_LABELS[phase];
            return (
              <div key={phase} className="rounded-xl border border-white/8 bg-white/2 p-3 text-center">
                <div className="w-2 h-2 rounded-full mx-auto mb-1.5" style={{ background: meta.color }} />
                <p className="text-lg font-bold text-foreground">{group?.items.length ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">{meta.months}</p>
              </div>
            );
          })}
        </div>
      )}

      {selectedInits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-violet-500/20 bg-violet-500/4 p-6 flex items-start gap-4">
          <GitMerge className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground mb-1">No initiatives selected</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">Select initiatives from the library to build your phased roadmap.</p>
            <Button size="sm" variant="outline" className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 h-7 text-xs" onClick={() => navigate("/ai-strategy")}>
              <Layers className="w-3 h-3 mr-1.5" />Browse Initiative Library
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {initiativesByPhase.map(({ phase, items }) => {
            const meta = PHASE_LABELS[phase];
            const isExpanded = expandedPhases[phase] ?? false;
            return (
              <div key={phase} className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
                <button
                  onClick={() => setExpandedPhases(s => ({ ...s, [phase]: !s[phase] }))}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/3 transition-colors"
                  aria-expanded={isExpanded}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-foreground">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">{meta.months} · {items.length} initiative{items.length !== 1 ? "s" : ""} · {meta.description}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </button>
                {isExpanded && (
                  <div className="border-t border-white/6 divide-y divide-white/5 animate-in slide-in-from-top-2 duration-200">
                    {items.map((init: any) => {
                      const typeColor = AI_TYPE_COLORS[init.aiType] ?? "#9CA3AF";
                      return (
                        <button key={init.id} onClick={() => setSelectedInitiative(init)} className="w-full flex items-start gap-3 px-5 py-3 hover:bg-white/3 transition-colors text-left">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground truncate">{init.name}</span>
                              {init.aiType && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${typeColor}20`, color: typeColor }}>{init.aiType}</span>
                              )}
                              {init.regulatoryFlag && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">EU AI Act</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="text-xs text-muted-foreground">{init.category}</span>
                              {init.decisionAuthority && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-white/10 text-muted-foreground">
                                  {DA_LABELS[init.decisionAuthority] ?? init.decisionAuthority}
                                </span>
                              )}
                            </div>
                          </div>
                          <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-white/8 bg-white/2 p-5 flex flex-wrap items-center justify-between gap-4 mt-6">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Next step</p>
          <p className="text-sm text-foreground">Review the cost envelope and risk register for this plan.</p>
        </div>
        <Button variant="outline" size="sm" className="text-xs h-8 border-white/15 hover:border-white/30" onClick={() => navigate("/strategy/investment-risk")}>
          View investment & risk <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>

      <InitiativeDetailModal initiative={selectedInitiative} open={!!selectedInitiative} onClose={() => setSelectedInitiative(null)} />
    </div>
  );
}
