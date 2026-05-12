/**
 * StrategyInvestmentRiskPage — /strategy/investment-risk
 * Section 04: Investment & Risk
 *
 * Blocks:
 *   1. Hero — cost envelope total, phase breakdown, ambition tier pill
 *   2. TCO breakdown — from calculateValueEnvelope
 *   3. Phase cost waterfall — bar chart from calculateCostEnvelope
 *   4. Risk register — from evaluateRiskRules mutation with acknowledge/revoke
 *   5. UK Standing Frameworks — static 5-framework table
 *   6. EU AI Act flagged initiatives — from getStrategyInitiatives regulatoryFlag
 *   7. Cross-functional dependencies — derived from library dependencies[]
 *   8. Solution delivery confidence — from structuredInputs.solution_delivery_confidence
 */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import SectionPageLayout from "@/components/SectionPageLayout";
import {
  PoundSterling, Shield, AlertTriangle, ArrowRight, ChevronDown,
  CheckCircle2, Link2, ChevronRight, Info, RefreshCw,
  BookOpen, Scale, Eye, Layers, BarChart2, Loader2,
} from "lucide-react";
import { SOLUTION_DELIVERY_OPTIONS } from "@/../../shared/strategyInputs";

// ─── Constants ────────────────────────────────────────────────────────────────
const PHASE_COLORS: Record<string, string> = {
  foundation: "#60A5FA",
  build:      "#A78BFA",
  scale:      "#4ADE80",
  optimise:   "#FBBF24",
};
const PHASE_LABELS: Record<string, { label: string; months: string }> = {
  foundation: { label: "Phase 1 — Foundation", months: "Months 1–3"   },
  build:      { label: "Phase 2 — Build",       months: "Months 4–6"   },
  scale:      { label: "Phase 3 — Scale",       months: "Months 7–12"  },
  optimise:   { label: "Phase 4 — Optimise",    months: "Months 13–18" },
};
const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  very_high: { label: "Very High", color: "#F87171", bg: "#F8717120" },
  high:      { label: "High",      color: "#F87171", bg: "#F8717120" },
  medium:    { label: "Medium",    color: "#FBBF24", bg: "#FBBF2420" },
  low:       { label: "Low",       color: "#4ADE80", bg: "#4ADE8020" },
};

const UK_STANDING_FRAMEWORKS = [
  {
    id: "uk_gdpr",
    name: "UK GDPR / Data Protection Act 2018",
    icon: "shield" as const,
    color: "#60A5FA",
    relevance: "Governs processing of employee personal data by AI tools. Requires lawful basis, data minimisation, and DPIA for high-risk processing.",
    action: "Conduct DPIA before deploying any AI tool that processes employee personal data at scale.",
    regulator: "ICO",
  },
  {
    id: "eu_ai_act",
    name: "EU AI Act 2024 (UK Equivalence Watch)",
    icon: "alert" as const,
    color: "#F87171",
    relevance: "Classifies AI in recruitment, performance management, and workforce monitoring as high-risk. UK government is monitoring for equivalence.",
    action: "Classify each AI initiative against EU AI Act risk tiers. Prepare conformity documentation for high-risk systems.",
    regulator: "DSIT / EU AI Office",
  },
  {
    id: "era_2025",
    name: "Employment Rights Act 2025",
    icon: "scale" as const,
    color: "#FBBF24",
    relevance: "Workers have the right to request human review of any AI-assisted employment decision. Applies to hiring, performance, and redundancy processes.",
    action: "Implement human-review workflows for all AI-assisted employment decisions. Document and communicate the right to workers.",
    regulator: "ACAS / Employment Tribunal",
  },
  {
    id: "equality_act_2010",
    name: "Equality Act 2010",
    icon: "eye" as const,
    color: "#A78BFA",
    relevance: "AI tools must not produce discriminatory outcomes across protected characteristics. Applies to all HR AI tools touching employment decisions.",
    action: "Mandate bias audits before any AI tool touches employment decisions. Document audit outcomes and mitigation actions.",
    regulator: "EHRC",
  },
  {
    id: "ico_guidance",
    name: "ICO Guidance on AI & Employment",
    icon: "book" as const,
    color: "#34D399",
    relevance: "ICO has published specific guidance on AI in employment, including transparency obligations, automated decision-making rights, and data retention.",
    action: "Review ICO AI & Employment Guidance (2024). Update privacy notices and employee-facing communications before deployment.",
    regulator: "ICO",
  },
];

const DEP_FUNCTION_MAP: Record<string, { label: string; color: string }> = {
  it_data:          { label: "IT / Data",           color: "#60A5FA" },
  legal_compliance: { label: "Legal / Compliance",  color: "#F87171" },
  finance:          { label: "Finance",              color: "#FBBF24" },
  l_and_d:          { label: "L&D",                 color: "#A78BFA" },
  comms:            { label: "Communications",       color: "#34D399" },
  exec_sponsor:     { label: "Executive Sponsor",    color: "#FB923C" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function BlockSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-5 space-y-3">
      <Skeleton className="h-3 w-24 rounded" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 rounded ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

function FrameworkIcon({ icon, color }: { icon: "shield"|"alert"|"scale"|"eye"|"book"; color: string }) {
  const cls = "w-3.5 h-3.5";
  if (icon === "shield") return <Shield className={cls} style={{ color }} />;
  if (icon === "alert")  return <AlertTriangle className={cls} style={{ color }} />;
  if (icon === "scale")  return <Scale className={cls} style={{ color }} />;
  if (icon === "eye")    return <Eye className={cls} style={{ color }} />;
  return <BookOpen className={cls} style={{ color }} />;
}

// ─── AcknowledgeModal ─────────────────────────────────────────────────────────
interface AcknowledgeModalProps {
  open: boolean;
  displayName: string;
  existingNote?: string | null;
  onConfirm: (note: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}
function AcknowledgeModal({ open, displayName, existingNote, onConfirm, onClose, isLoading }: AcknowledgeModalProps) {
  const [note, setNote] = useState(existingNote ?? "");
  useEffect(() => { if (open) setNote(existingNote ?? ""); }, [open, existingNote]);
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Acknowledge risk</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-xs text-muted-foreground leading-relaxed">
            You are acknowledging <strong className="text-foreground">{displayName}</strong>. This records that your organisation has reviewed this risk and has a mitigation plan in place.
          </p>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Mitigation note (optional)</label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Describe your mitigation approach…"
              className="text-xs resize-none h-24"
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{note.length}/500</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button size="sm" className="text-xs h-7" onClick={() => onConfirm(note)} disabled={isLoading}>
            {isLoading && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
            Acknowledge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function StrategyInvestmentRiskPage() {
  const [, navigate] = useLocation();

  const assessmentQ  = trpc.intelligence.getStrategyAssessment.useQuery();
  const strategyQ    = trpc.intelligence.getStrategy.useQuery();
  const initiativesQ = trpc.intelligence.getStrategyInitiatives.useQuery();
  const acksQ        = trpc.intelligence.getRiskAcknowledgements.useQuery();
  const contentLibQ  = trpc.contentLibrary.listInitiatives.useQuery({ phase: "all" });

  const ambitionTier = useMemo((): "cautious" | "progressive" | "transformative" => {
    const bl = strategyQ.data?.businessAmbitionLevel ?? 3;
    if (bl >= 4) return "transformative";
    if (bl >= 3) return "progressive";
    return "cautious";
  }, [strategyQ.data?.businessAmbitionLevel]);

  const orgSize = useMemo((): "small" | "medium" | "large" | "enterprise" => {
    const hc = (assessmentQ.data?.operationalBaseline as any)?.headcount ?? 0;
    if (hc >= 5000) return "enterprise";
    if (hc >= 1000) return "large";
    if (hc >= 250)  return "medium";
    return "small";
  }, [assessmentQ.data?.operationalBaseline]);

  const selectedIds = useMemo(() => assessmentQ.data?.selectedInitiativeIds ?? [], [assessmentQ.data?.selectedInitiativeIds]);

  const costEnvQ = trpc.intelligence.calculateCostEnvelope.useQuery(
    { selectedInitiativeIds: selectedIds, orgSize, ambitionTier },
    { enabled: selectedIds.length > 0 }
  );

  const valueEnvQ = trpc.intelligence.calculateValueEnvelope.useQuery(
    {
      selectedInitiativeIds: selectedIds,
      operationalBaseline: (assessmentQ.data?.operationalBaseline as any) ?? {},
      planHorizonMonths: 36,
      solutionDeliveryConfidence: (assessmentQ.data?.structuredInputs as any)?.solution_delivery_confidence,
    },
    { enabled: selectedIds.length > 0 }
  );

  // Risk evaluation
  const evaluateRiskMut = trpc.intelligence.evaluateRiskRules.useMutation();
  type LiveRisk = {
    ruleId: string; displayName: string; riskStatement: string;
    severity: string; recommendedAction: string; regulatoryBasis: string[];
    sources: string[]; type: string;
  };
  const [liveRisks, setLiveRisks] = useState<LiveRisk[] | null>(null);

  useEffect(() => {
    if (selectedIds.length === 0 || liveRisks !== null) return;
    evaluateRiskMut.mutate(
      { ambitionTier, orgSize, selectedInitiativeIds: selectedIds },
      { onSuccess: (data) => setLiveRisks(data as unknown as LiveRisk[]) }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds.length, ambitionTier, orgSize]);

  // Acknowledge mutations
  const utils = trpc.useUtils();
  const acknowledgeMut = trpc.intelligence.acknowledgeRisk.useMutation({
    onSuccess: () => utils.intelligence.getRiskAcknowledgements.invalidate(),
  });
  const revokeMut = trpc.intelligence.revokeRiskAcknowledgement.useMutation({
    onSuccess: () => utils.intelligence.getRiskAcknowledgements.invalidate(),
  });

  const [ackModal, setAckModal] = useState<{
    open: boolean; ruleId: string; displayName: string; itemType: "risk" | "framework";
  } | null>(null);

  const acksMap = useMemo(() => {
    const m = new Map<string, { note: string | null; revokedAt: number | null }>();
    for (const a of acksQ.data ?? []) m.set(a.itemId, { note: a.note, revokedAt: a.revokedAt });
    return m;
  }, [acksQ.data]);

  const isAcknowledged = useCallback((id: string) => {
    const a = acksMap.get(id);
    return !!a && !a.revokedAt;
  }, [acksMap]);

  function handleAcknowledge(ruleId: string, displayName: string, itemType: "risk" | "framework") {
    setAckModal({ open: true, ruleId, displayName, itemType });
  }

  function handleAckConfirm(note: string) {
    if (!ackModal) return;
    acknowledgeMut.mutate(
      { itemId: ackModal.ruleId, itemType: ackModal.itemType, note: note || undefined },
      {
        onSuccess: () => { toast.success("Risk acknowledged"); setAckModal(null); },
        onError: (e) => toast.error(`Failed: ${e.message}`),
      }
    );
  }

  function handleRevoke(ruleId: string) {
    revokeMut.mutate(
      { itemId: ruleId },
      {
        onSuccess: () => toast.success("Acknowledgement revoked"),
        onError: (e) => toast.error(`Failed: ${e.message}`),
      }
    );
  }

  // Collapse state
  const [riskCollapsed, setRiskCollapsed]           = useState<Record<string, boolean>>({});
  const [fwCollapsed, setFwCollapsed]               = useState<Record<string, boolean>>({});
  const [crossFuncCollapsed, setCrossFuncCollapsed] = useState(true);
  const [euAiCollapsed, setEuAiCollapsed]           = useState(false);
  const [tcoCollapsed, setTcoCollapsed]             = useState(false);

  // Cross-functional deps
  const crossFuncGroups = useMemo(() => {
    const libItems   = contentLibQ.data ?? [];
    const selectedSet = new Set(selectedIds);
    const depToInits: Record<string, string[]> = {};
    for (const item of libItems) {
      if (!selectedSet.has(item.initiative_id)) continue;
      const cat = item.category ?? "";
      if (cat.includes("Analytics") || cat.includes("Operations") || cat.includes("Automation")) {
        (depToInits["it_data"] ??= []).push(item.display_name);
      }
      if (cat.includes("Governance") || cat.includes("Ethics") || cat.includes("Compliance")) {
        (depToInits["legal_compliance"] ??= []).push(item.display_name);
      }
      if (cat.includes("Learning") || cat.includes("Capability") || cat.includes("Literacy")) {
        (depToInits["l_and_d"] ??= []).push(item.display_name);
      }
    }
    if (ambitionTier === "transformative") {
      depToInits["exec_sponsor"] = ["Required for all transformative initiatives"];
    }
    return Object.entries(depToInits)
      .filter(([, items]) => items.length > 0)
      .map(([key, items]) => ({
        key,
        ...(DEP_FUNCTION_MAP[key] ?? { label: key, color: "#94A3B8" }),
        items: items.slice(0, 4),
        totalCount: items.length,
      }));
  }, [contentLibQ.data, selectedIds, ambitionTier]);

  const euAiFlagged = useMemo(
    () => (initiativesQ.data ?? []).filter((i: any) => i.regulatoryFlag),
    [initiativesQ.data]
  );

  const solutionDeliveryConf = useMemo(() => {
    const si = assessmentQ.data?.structuredInputs as any;
    return si?.solution_delivery_confidence as 1 | 2 | 3 | 4 | 5 | undefined;
  }, [assessmentQ.data?.structuredInputs]);

  const costEnv = costEnvQ.data;
  const tco     = valueEnvQ.data?.tco;
  const fmt    = (n: number) => n >= 1000 ? `£${(n / 1000).toFixed(1)}M` : `£${Math.round(n)}k`;
  const fmtGbk = (n: number) => `£${n}k`;

  const isLoading   = assessmentQ.isLoading || strategyQ.isLoading;
  const hasStrategy = !!(assessmentQ.data?.completed && selectedIds.length > 0);

  if (isLoading) {
    return (
      <SectionPageLayout sectionNumber="04" sectionLabel="Investment & Risk" title="What it costs" accentColor="#FBBF24" icon={<PoundSterling className="w-5 h-5" />}>
        <div className="space-y-5">
          <BlockSkeleton lines={3} /><BlockSkeleton lines={4} /><BlockSkeleton lines={3} /><BlockSkeleton lines={5} />
        </div>
      </SectionPageLayout>
    );
  }

  if (!hasStrategy) {
    return (
      <SectionPageLayout sectionNumber="04" sectionLabel="Investment & Risk" title="What it costs" accentColor="#FBBF24" icon={<PoundSterling className="w-5 h-5" />}>
        <div className="rounded-xl border border-dashed border-amber-500/20 bg-amber-500/4 p-8 flex items-start gap-4">
          <PoundSterling className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">No strategy configured yet</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">Complete the HR AI Strategy assessment to generate your investment envelope, risk register, and regulatory framework analysis.</p>
            <Button size="sm" className="text-xs h-8" onClick={() => navigate("/ai-strategy/assessment")}>
              Start strategy assessment <ArrowRight className="w-3 h-3 ml-1.5" />
            </Button>
          </div>
        </div>
      </SectionPageLayout>
    );
  }

  const tierConfig = {
    cautious:       { label: "Cautious",       color: "#4ADE80", bg: "#4ADE8020" },
    progressive:    { label: "Progressive",    color: "#FBBF24", bg: "#FBBF2420" },
    transformative: { label: "Transformative", color: "#F87171", bg: "#F8717120" },
  }[ambitionTier];

  const riskItems     = (liveRisks ?? []).filter(r => r.type !== "note");
  const noteItems     = (liveRisks ?? []).filter(r => r.type === "note");
  const highRiskCount = riskItems.filter(r => r.severity === "high" || r.severity === "very_high").length;

  return (
    <SectionPageLayout
      sectionNumber="04"
      sectionLabel="Investment & Risk"
      title="What it costs"
      accentColor="#FBBF24"
      icon={<PoundSterling className="w-5 h-5" />}
      actions={
        <Button
          variant="outline" size="sm"
          className="text-xs h-7 border-white/15 hover:border-white/30 text-muted-foreground"
          onClick={() => {
            setLiveRisks(null);
            evaluateRiskMut.mutate(
              { ambitionTier, orgSize, selectedInitiativeIds: selectedIds },
              { onSuccess: (data) => setLiveRisks(data as unknown as LiveRisk[]) }
            );
          }}
          disabled={evaluateRiskMut.isPending}
        >
          {evaluateRiskMut.isPending ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1.5" />}
          Refresh risks
        </Button>
      }
    >
      {/* ── Block 1: Hero ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/8 to-amber-500/3 p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Total Investment Envelope</p>
            {costEnv
              ? <p className="text-3xl font-bold text-foreground">{fmtGbk(costEnv.totalMin)}–{fmtGbk(costEnv.totalMax)}</p>
              : <Skeleton className="h-8 w-40 rounded" />
            }
            <p className="text-xs text-muted-foreground mt-1">
              Across {selectedIds.length} initiative{selectedIds.length !== 1 ? "s" : ""} · {costEnv?.currency ?? "GBP"} · indicative
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide" style={{ background: tierConfig.bg, color: tierConfig.color }}>
              {tierConfig.label} ambition
            </span>
            <span className="text-[10px] text-muted-foreground">{orgSize} organisation</span>
          </div>
        </div>
        {costEnv ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {costEnv.byPhase.map(phase => {
              const cfg   = PHASE_LABELS[phase.phase] ?? { label: phase.label, months: "" };
              const color = PHASE_COLORS[phase.phase] ?? "#94A3B8";
              return (
                <div key={phase.phase} className="rounded-xl border border-white/8 bg-white/3 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <p className="text-[10px] font-semibold text-muted-foreground truncate">{cfg.label}</p>
                  </div>
                  <p className="text-sm font-bold text-foreground">{fmtGbk(phase.minGbk)}–{fmtGbk(phase.maxGbk)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{phase.initiativeCount} initiative{phase.initiativeCount !== 1 ? "s" : ""} · {cfg.months}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        )}
        {costEnv?.caveat && (
          <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed flex items-start gap-1.5">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />{costEnv.caveat}
          </p>
        )}
      </div>

      {/* ── Block 2: TCO Breakdown ────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/8 bg-white/2 overflow-hidden">
        <button
          onClick={() => setTcoCollapsed(c => !c)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/3 transition-colors"
          aria-expanded={!tcoCollapsed}
        >
          <Layers className="w-4 h-4 text-amber-400" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1 text-left">Total Cost of Ownership (3-year)</p>
          {tco && <span className="text-sm font-bold text-amber-400 mr-2">{fmt(tco.total_3yr_gbp.low * 1000)}–{fmt(tco.total_3yr_gbp.high * 1000)}</span>}
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${tcoCollapsed ? "" : "rotate-180"}`} />
        </button>
        {!tcoCollapsed && (
          <div className="px-5 pb-5 animate-in slide-in-from-top-1 duration-200">
            {tco ? (
              <>
                <div className="space-y-2.5 mb-4">
                  {[
                    { label: "Implementation",    low: tco.implementation_gbp.low,    high: tco.implementation_gbp.high,    color: "#FBBF24" },
                    { label: "Change Management", low: tco.change_management_gbp.low,  high: tco.change_management_gbp.high, color: "#FB923C" },
                    { label: "Training",          low: tco.training_gbp.low,           high: tco.training_gbp.high,          color: "#60A5FA" },
                    { label: "Ongoing (annual)",  low: tco.ongoing_annual_gbp.low,     high: tco.ongoing_annual_gbp.high,    color: "#A78BFA" },
                    { label: "Internal Resource", low: tco.internal_resource_gbp.low,  high: tco.internal_resource_gbp.high, color: "#34D399" },
                  ].map(row => {
                    const pct = tco.implementation_gbp.high > 0 ? Math.min(Math.round((row.high / tco.implementation_gbp.high) * 100), 100) : 0;
                    return (
                      <div key={row.label}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-muted-foreground">{row.label}</p>
                          <p className="text-xs font-semibold" style={{ color: row.color }}>{fmt(row.low * 1000)}–{fmt(row.high * 1000)}</p>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: row.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-white/8 pt-3 flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">Total 3-Year TCO</p>
                  <p className="text-sm font-bold text-amber-400">{fmt(tco.total_3yr_gbp.low * 1000)}–{fmt(tco.total_3yr_gbp.high * 1000)}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
                  Includes implementation, change management (12–15%), training (£200–400 per HR FTE), ongoing maintenance (18–20% per year), and internal project management (15%). Excludes internal headcount costs.
                </p>
              </>
            ) : valueEnvQ.isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 rounded" />)}</div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">TCO data unavailable. Ensure initiatives are selected.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Block 3: Phase cost waterfall ────────────────────────────────── */}
      {costEnv && costEnv.byPhase.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/2 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Phase Cost Breakdown</p>
          </div>
          <div className="space-y-4">
            {costEnv.byPhase.map(phase => {
              const color  = PHASE_COLORS[phase.phase] ?? "#94A3B8";
              const cfg    = PHASE_LABELS[phase.phase] ?? { label: phase.label, months: "" };
              const maxVal = Math.max(...costEnv.byPhase.map(p => p.maxGbk));
              const barPct = maxVal > 0 ? Math.round((phase.maxGbk / maxVal) * 100) : 0;
              return (
                <div key={phase.phase}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <p className="text-xs font-medium text-foreground">{cfg.label}</p>
                      <span className="text-[10px] text-muted-foreground">{cfg.months}</span>
                    </div>
                    <p className="text-xs font-semibold" style={{ color }}>{fmtGbk(phase.minGbk)}–{fmtGbk(phase.maxGbk)}</p>
                  </div>
                  <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barPct}%`, backgroundColor: color }} />
                  </div>
                  {phase.initiatives.length > 0 && (
                    <div className="mt-1.5 pl-4 space-y-0.5">
                      {phase.initiatives.map(init => (
                        <div key={init.id} className="flex items-center justify-between">
                          <p className="text-[10px] text-muted-foreground truncate max-w-[60%]">{init.name}</p>
                          <p className="text-[10px] text-muted-foreground">{fmtGbk(init.minGbk)}–{fmtGbk(init.maxGbk)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Block 4: Risk Register ────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/8 bg-white/2 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-red-400" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1">Risk Register</p>
          {evaluateRiskMut.isPending && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Evaluating…
            </span>
          )}
          {riskItems.length > 0 && <span className="text-[10px] text-muted-foreground">{riskItems.length} rule{riskItems.length !== 1 ? "s" : ""} matched</span>}
          {highRiskCount > 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1.5 rounded">{highRiskCount} high</Badge>}
        </div>

        {evaluateRiskMut.isPending && !liveRisks && (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        )}

        {!evaluateRiskMut.isPending && riskItems.length === 0 && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">No risk rules triggered for your current initiative selection and ambition tier.</p>
          </div>
        )}

        <div className="space-y-2">
          {riskItems.map(risk => {
            const sev   = SEVERITY_CONFIG[risk.severity] ?? SEVERITY_CONFIG.medium;
            const acked = isAcknowledged(risk.ruleId);
            const ackData = acksMap.get(risk.ruleId);
            return (
              <div key={risk.ruleId} className={`rounded-lg border overflow-hidden transition-colors ${acked ? "border-green-500/20 bg-green-500/3" : "border-white/8 bg-white/2"}`}>
                <button
                  onClick={() => setRiskCollapsed(s => ({ ...s, [risk.ruleId]: !s[risk.ruleId] }))}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors"
                  aria-expanded={!riskCollapsed[risk.ruleId]}
                >
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide flex-shrink-0" style={{ background: sev.bg, color: sev.color }}>{sev.label}</span>
                  <span className="text-sm font-medium text-foreground flex-1 text-left">{risk.displayName}</span>
                  {acked && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform ${riskCollapsed[risk.ruleId] ? "" : "rotate-180"}`} />
                </button>
                {!riskCollapsed[risk.ruleId] && (
                  <div className="px-4 pb-4 animate-in slide-in-from-top-1 duration-200 space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">{risk.riskStatement}</p>
                    <div className="rounded-lg border border-white/8 bg-white/2 px-3 py-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Recommended action</p>
                      <p className="text-xs text-foreground leading-relaxed">{risk.recommendedAction}</p>
                    </div>
                    {risk.regulatoryBasis.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {risk.regulatoryBasis.map(rb => (
                          <span key={rb} className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-muted-foreground">{rb}</span>
                        ))}
                      </div>
                    )}
                    {acked && ackData?.note && (
                      <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
                        <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">Mitigation note</p>
                        <p className="text-xs text-foreground leading-relaxed">{ackData.note}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      {!acked ? (
                        <Button size="sm" variant="outline" className="text-xs h-7 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50" onClick={() => handleAcknowledge(risk.ruleId, risk.displayName, "risk")} disabled={acknowledgeMut.isPending}>
                          <CheckCircle2 className="w-3 h-3 mr-1.5" />Acknowledge
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground hover:text-foreground" onClick={() => handleRevoke(risk.ruleId)} disabled={revokeMut.isPending}>
                          Revoke acknowledgement
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {noteItems.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Regulatory Notes</p>
            {noteItems.map(note => (
              <div key={note.ruleId} className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                <div className="flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">{note.displayName}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{note.riskStatement}</p>
                    {note.regulatoryBasis.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {note.regulatoryBasis.map(rb => (
                          <span key={rb} className="text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-300">{rb}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Block 5: UK Standing Frameworks ──────────────────────────────── */}
      <div className="rounded-xl border border-white/8 bg-white/2 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-4 h-4 text-purple-400" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1">UK Standing Regulatory Frameworks</p>
          <span className="text-[10px] text-muted-foreground">Always applicable</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          These frameworks apply to all UK organisations deploying AI in HR, regardless of initiative selection. Acknowledge each to confirm your organisation has reviewed its obligations.
        </p>
        <div className="space-y-2">
          {UK_STANDING_FRAMEWORKS.map(fw => {
            const acked   = isAcknowledged(fw.id);
            const ackData = acksMap.get(fw.id);
            return (
              <div key={fw.id} className={`rounded-lg border overflow-hidden transition-colors ${acked ? "border-green-500/20 bg-green-500/3" : "border-white/8 bg-white/2"}`}>
                <button
                  onClick={() => setFwCollapsed(s => ({ ...s, [fw.id]: !s[fw.id] }))}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors"
                  aria-expanded={!fwCollapsed[fw.id]}
                >
                  <FrameworkIcon icon={fw.icon} color={fw.color} />
                  <span className="text-sm font-medium text-foreground flex-1 text-left">{fw.name}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 hidden sm:block">{fw.regulator}</span>
                  {acked && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform ${fwCollapsed[fw.id] ? "" : "rotate-180"}`} />
                </button>
                {!fwCollapsed[fw.id] && (
                  <div className="px-4 pb-4 animate-in slide-in-from-top-1 duration-200 space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">{fw.relevance}</p>
                    <div className="rounded-lg border border-white/8 bg-white/2 px-3 py-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Required action</p>
                      <p className="text-xs text-foreground leading-relaxed">{fw.action}</p>
                    </div>
                    {acked && ackData?.note && (
                      <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
                        <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">Compliance note</p>
                        <p className="text-xs text-foreground leading-relaxed">{ackData.note}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      {!acked ? (
                        <Button size="sm" variant="outline" className="text-xs h-7 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50" onClick={() => handleAcknowledge(fw.id, fw.name, "framework")} disabled={acknowledgeMut.isPending}>
                          <CheckCircle2 className="w-3 h-3 mr-1.5" />Acknowledge
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground hover:text-foreground" onClick={() => handleRevoke(fw.id)} disabled={revokeMut.isPending}>
                          Revoke acknowledgement
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Block 6: EU AI Act flagged initiatives ────────────────────────── */}
      {euAiFlagged.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <button onClick={() => setEuAiCollapsed(c => !c)} className="w-full flex items-center gap-2" aria-expanded={!euAiCollapsed}>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex-1 text-left">EU AI Act Flagged Initiatives</p>
            <span className="text-xs text-amber-400 font-semibold mr-2">{euAiFlagged.length} flagged</span>
            <ChevronDown className={`w-3.5 h-3.5 text-amber-400 transition-transform ${euAiCollapsed ? "" : "rotate-180"}`} />
          </button>
          {!euAiCollapsed && (
            <div className="mt-3 animate-in slide-in-from-top-1 duration-200">
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                These initiatives involve AI in high-risk HR processes under the EU AI Act. Engage Legal / Compliance before deployment and prepare conformity documentation.
              </p>
              <div className="space-y-2">
                {euAiFlagged.map((init: any) => (
                  <div key={init.id} className="flex items-center gap-2 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2">
                    <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span className="text-xs text-foreground flex-1">{init.name}</span>
                    <span className="text-[10px] text-muted-foreground">{init.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Block 7: Cross-functional dependencies ────────────────────────── */}
      <div className="rounded-xl border border-white/8 bg-white/2 p-5">
        <button onClick={() => setCrossFuncCollapsed(c => !c)} className="w-full flex items-center gap-2" aria-expanded={!crossFuncCollapsed}>
          <Link2 className="w-4 h-4 text-muted-foreground" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1 text-left">Cross-Functional Dependencies</p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{crossFuncCollapsed ? "See dependencies" : "Hide"}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${crossFuncCollapsed ? "" : "rotate-180"}`} />
          </div>
        </button>
        {!crossFuncCollapsed && (
          <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Successful delivery of your selected initiatives requires active engagement from these functions. Align stakeholders before Phase 1 kick-off.
            </p>
            {crossFuncGroups.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {crossFuncGroups.map(dep => (
                  <div key={dep.key} className="rounded-lg border border-white/8 bg-white/2 p-4">
                    <p className="text-xs font-bold mb-2" style={{ color: dep.color }}>{dep.label}</p>
                    <ul className="space-y-1.5">
                      {dep.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5 text-muted-foreground" />{item}
                        </li>
                      ))}
                      {dep.totalCount > dep.items.length && (
                        <li className="text-[10px] text-muted-foreground pl-4">+{dep.totalCount - dep.items.length} more</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "IT / Data", color: "#60A5FA", items: ["Data infrastructure readiness audit (Month 1)", "AI tool procurement and integration support", "Data governance framework alignment"] },
                  { label: "Legal / Compliance", color: "#F87171", items: ["EU AI Act risk classification for flagged initiatives", "Employment law review for AI-assisted decisions", "Data protection impact assessments (DPIA)"] },
                  { label: "Finance", color: "#FBBF24", items: ["Phase budget sign-off before each phase launch", "ROI measurement framework agreement", "Vendor contract review and approval"] },
                ].map(dep => (
                  <div key={dep.label} className="rounded-lg border border-white/8 bg-white/2 p-4">
                    <p className="text-xs font-bold mb-2" style={{ color: dep.color }}>{dep.label}</p>
                    <ul className="space-y-1.5">
                      {dep.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5 text-muted-foreground" />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Block 8: Solution Delivery Confidence ────────────────────────── */}
      {solutionDeliveryConf !== undefined && (() => {
        const opt   = SOLUTION_DELIVERY_OPTIONS.find(o => o.value === solutionDeliveryConf);
        if (!opt) return null;
        const pct   = ((solutionDeliveryConf - 1) / 4) * 100;
        const color = solutionDeliveryConf >= 4 ? "#22C55E" : solutionDeliveryConf === 3 ? "#F59E0B" : "#EF4444";
        return (
          <div className="rounded-xl border border-white/8 bg-white/2 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-3 h-3 text-blue-400" />
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Solution Delivery Confidence</p>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                <span className="text-xs font-mono text-muted-foreground">{solutionDeliveryConf}/5</span>
              </div>
              <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{opt.description}</p>
            </div>
            {solutionDeliveryConf <= 2 && (
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <p className="text-xs text-amber-300"><strong>Engine impact:</strong> Phase durations have been extended by 20% and change management costs increased by 5% to reflect your delivery confidence rating.</p>
              </div>
            )}
            {solutionDeliveryConf >= 4 && (
              <div className="mt-3 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
                <p className="text-xs text-green-300"><strong>Strong delivery track record:</strong> Your cost estimates reflect standard timelines. Consider allocating savings to accelerate Phase 3 and 4 initiatives.</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Footer nav ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/8 bg-white/2 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Next step</p>
          <p className="text-sm text-foreground">Review the value and ROI case for this investment.</p>
        </div>
        <Button variant="outline" size="sm" className="text-xs h-8 border-white/15 hover:border-white/30" onClick={() => navigate("/strategy/value")}>
          View value case <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>

      {/* ── Acknowledge modal ─────────────────────────────────────────────── */}
      {ackModal && (
        <AcknowledgeModal
          open={ackModal.open}
          displayName={ackModal.displayName}
          existingNote={acksMap.get(ackModal.ruleId)?.note}
          onConfirm={handleAckConfirm}
          onClose={() => setAckModal(null)}
          isLoading={acknowledgeMut.isPending}
        />
      )}
    </SectionPageLayout>
  );
}
