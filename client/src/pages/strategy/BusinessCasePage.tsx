/**
 * BusinessCasePage — /strategy/business-case
 * Stage 9 of 11: Business case
 *
 * Layout (per brief Section 6.3):
 *   1. AI-generated narrative (THE CASE) — centerpiece, 400–600 words, Generate/Refine/Challenge
 *   2. Numbers — cost envelope + value summary chart
 *   3. Risks — risk register + EU AI Act + UK frameworks
 *   4. Dependencies — cross-functional + solution delivery confidence
 *   5. Confirm business case → gate
 */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGate } from "@/contexts/GateContext";
import { useDeepDive } from "@/hooks/useDeepDive";
import { DeepDiveConfirmedStatus } from "@/components/DeepDiveConfirmedStatus";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import SectionPageLayout from "@/components/SectionPageLayout";
import { AITextActions } from "@/components/AITextActions";
import {
  Briefcase, PoundSterling, Shield, AlertTriangle, ArrowRight, ChevronDown,
  CheckCircle2, Link2, ChevronRight, Info, RefreshCw, BookOpen, Scale,
  Eye, Layers, BarChart2, Loader2, Sparkles, TrendingUp, Users, FileDown,
} from "lucide-react";
import { SOLUTION_DELIVERY_OPTIONS } from "@/../../shared/strategyInputs";
import { formatGbp, formatGbpK } from "@/lib/format";

// ─── Constants (shared with Investment/Risk) ──────────────────────────────────
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
  { id: "uk_gdpr", name: "UK GDPR / Data Protection Act 2018", icon: "shield" as const, color: "#60A5FA", relevance: "Governs processing of employee personal data by AI tools. Requires lawful basis, data minimisation, and DPIA for high-risk processing.", action: "Conduct DPIA before deploying any AI tool that processes employee personal data at scale.", regulator: "ICO" },
  { id: "eu_ai_act", name: "EU AI Act 2024 (UK Equivalence Watch)", icon: "alert" as const, color: "#F87171", relevance: "Classifies AI in recruitment, performance management, and workforce monitoring as high-risk. UK government is monitoring for equivalence.", action: "Classify each AI initiative against EU AI Act risk tiers. Prepare conformity documentation for high-risk systems.", regulator: "DSIT / EU AI Office" },
  { id: "era_2025", name: "Employment Rights Act 2025", icon: "scale" as const, color: "#FBBF24", relevance: "Workers have the right to request human review of any AI-assisted employment decision. Applies to hiring, performance, and redundancy processes.", action: "Implement human-review workflows for all AI-assisted employment decisions. Document and communicate the right to workers.", regulator: "ACAS / Employment Tribunal" },
  { id: "equality_act_2010", name: "Equality Act 2010", icon: "eye" as const, color: "#A78BFA", relevance: "AI tools must not produce discriminatory outcomes across protected characteristics. Applies to all HR AI tools touching employment decisions.", action: "Mandate bias audits before any AI tool touches employment decisions. Document audit outcomes and mitigation actions.", regulator: "EHRC" },
  { id: "ico_guidance", name: "ICO Guidance on AI & Employment", icon: "book" as const, color: "#34D399", relevance: "ICO has published specific guidance on AI in employment, including transparency obligations, automated decision-making rights, and data retention.", action: "Review ICO AI & Employment Guidance (2024). Update privacy notices and employee-facing communications before deployment.", regulator: "ICO" },
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

// ─── Value Summary Chart ──────────────────────────────────────────────────────
function ValueSummaryChart({ gross, cost, net }: {
  gross: { low: number; high: number };
  cost:  { low: number; high: number };
  net:   { low: number; high: number };
}) {
  const [hovered, setHovered] = useState<"gross" | "cost" | "net" | null>(null);
  const fmt = formatGbp;
  const fmtRange = (lo: number, hi: number) => `${fmt(lo)}–${fmt(hi)}`;
  const bars = [
    { key: "gross" as const, label: "Gross Value", high: gross.high, low: gross.low, color: "#4ADE80" },
    { key: "cost"  as const, label: "Total Cost",  high: cost.high,  low: cost.low,  color: "#F87171" },
    { key: "net"   as const, label: "Net Value",   high: Math.max(0, net.high), low: Math.max(0, net.low), color: "#60A5FA" },
  ];
  const maxVal = Math.max(...bars.map(b => b.high));
  return (
    <div className="flex items-end gap-6 h-40 px-2" role="img" aria-label="Value summary bar chart">
      {bars.map(bar => {
        const heightPct = maxVal > 0 ? (bar.high / maxVal) * 100 : 0;
        const isHov = hovered === bar.key;
        return (
          <div key={bar.key} className="flex-1 flex flex-col items-center gap-1.5"
            onMouseEnter={() => setHovered(bar.key)} onMouseLeave={() => setHovered(null)}
            aria-label={`${bar.label}: ${fmtRange(bar.low, bar.high)}`}
          >
            <div className="text-xs font-medium" style={{ color: bar.color }}>
              {isHov ? fmt(bar.low) : fmt(bar.high)}
            </div>
            <div className="w-full flex items-end" style={{ height: "80px" }}>
              <div className="w-full rounded-t-lg transition-all duration-300 cursor-pointer"
                style={{ height: `${heightPct}%`, background: bar.color, opacity: isHov ? 0.7 : 0.9, minHeight: "4px" }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground text-center">{bar.label}</div>
            <div className="text-[10px] text-muted-foreground/60 text-center">{fmtRange(bar.low, bar.high)}</div>
          </div>
        );
      })}
    </div>
  );
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
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Describe your mitigation approach…" className="text-xs resize-none h-24" maxLength={500} />
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

// ─── Confirm Business Case Dialog ─────────────────────────────────────────────
function ConfirmBusinessCaseDialog({ open, wordCount, onConfirm, onClose, isLoading }: {
  open: boolean; wordCount: number; onConfirm: () => void; onClose: () => void; isLoading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Confirm business case</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your business case narrative ({wordCount} words) will be confirmed and locked. You can still edit it later, but the gate will need to be re-confirmed.
          </p>
          <div className="rounded-lg border border-border bg-foreground/3 px-3 py-2">
            <p className="text-xs text-muted-foreground">This unlocks Stage 10: Leadership Review.</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button size="sm" className="text-xs h-7" onClick={onConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
            Confirm business case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BusinessCasePage() {
  const [, navigate] = useLocation();
  const gate = useGate();
  const { isDeepDive } = useDeepDive();
  const isRewardMode = gate.tenantMode === "reward";
  const utils = trpc.useUtils();
  // Gate redirect: Stage 9 (Business Case) requires Stage 8 to be cleared
  useEffect(() => {
    if (!gate.isLoading && !gate.isStage9Accessible) {
      navigate("/strategy");
    }
  }, [gate.isLoading, gate.isStage9Accessible, navigate]);

  // ── Data queries ──────────────────────────────────────────────────────────
  const assessmentQ  = trpc.intelligence.getStrategyAssessment.useQuery();
  const initiativesQ = trpc.intelligence.getStrategyInitiatives.useQuery();
  const acksQ        = trpc.intelligence.getRiskAcknowledgements.useQuery();
  const contentLibQ  = trpc.contentLibrary.listInitiatives.useQuery({ phase: "all" });

  const ambitionTier = useMemo((): "cautious" | "progressive" | "transformative" => {
    const bl = assessmentQ.data?.businessAmbitionLevel ?? 3;
    if (bl >= 4) return "transformative";
    if (bl >= 3) return "progressive";
    return "cautious";
  }, [assessmentQ.data?.businessAmbitionLevel]);

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

  // ── Risk evaluation ───────────────────────────────────────────────────────
  const evaluateRiskMut = trpc.intelligence.evaluateRiskRules.useMutation({
    onError: (e) => toast.error(e.message),
  });
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

  // ── Acknowledge mutations ─────────────────────────────────────────────────
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

  // ── Collapse state ────────────────────────────────────────────────────────
  const [riskCollapsed, setRiskCollapsed]           = useState<Record<string, boolean>>({});
  const [fwCollapsed, setFwCollapsed]               = useState<Record<string, boolean>>({});
  const [crossFuncCollapsed, setCrossFuncCollapsed] = useState(true);
  const [euAiCollapsed, setEuAiCollapsed]           = useState(false);
  const [tcoCollapsed, setTcoCollapsed]             = useState(false);
  const [qualCollapsed, setQualCollapsed]           = useState(true);
  const [numbersCollapsed, setNumbersCollapsed]     = useState(false);
  const [risksCollapsed, setRisksCollapsed]         = useState(false);
  const [depsCollapsed, setDepsCollapsed]           = useState(false);

  // ── Cross-functional deps ─────────────────────────────────────────────────
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
        ...(DEP_FUNCTION_MAP[key] ?? { label: key, color: "var(--muted-foreground)" }),
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

  // ── Business case narrative ───────────────────────────────────────────────
  const [narrative, setNarrative] = useState<string>("");
  const [narrativeLoaded, setNarrativeLoaded] = useState(false);

  // Load existing narrative from DB on mount
  useEffect(() => {
    if (!narrativeLoaded && assessmentQ.data !== undefined) {
      setNarrative(assessmentQ.data?.businessCaseNarrative ?? "");
      setNarrativeLoaded(true);
    }
  }, [assessmentQ.data, narrativeLoaded]);

  // Auto-save narrative with debounce
  const saveNarrativeMut = trpc.intelligence.saveBusinessCaseNarrative.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!narrativeLoaded || !narrative) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveNarrativeMut.mutate({ narrative });
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrative, narrativeLoaded]);

  const [cpoComputedModel, setCpoComputedModel] = useState<any>(null);

  const generateNarrativeMut = trpc.intelligence.generateBusinessCaseNarrative.useMutation({
    onSuccess: (data) => {
      setNarrative(data.text);
      if (data.cpoModel) setCpoComputedModel(data.cpoModel);
      toast.success("Business case narrative generated");
    },
    onError: (e) => toast.error(`Generation failed: ${e.message}`),
  });

  const handleGenerateNarrative = () => {
    const costEnv = costEnvQ.data;
    const ve = valueEnvQ.data as any;
    const topRisks = (liveRisks ?? [])
      .filter(r => r.severity === "high" || r.severity === "very_high")
      .slice(0, 3)
      .map(r => r.displayName);
    const keyDeps = crossFuncGroups.slice(0, 3).map(d => d.label);
    const principles = (assessmentQ.data?.guidingPrinciples ?? []).map((p: any) => p.title);
    const selectedInitiativeNames = (initiativesQ.data ?? [])
      .filter((i: any) => selectedIds.includes(i.initiative_id ?? i.id))
      .map((i: any) => i.display_name ?? i.name ?? i.initiative_id)
      .slice(0, 12);

    // Build CPO engine inputs from operationalBaseline for the never-invents-numbers guardrail
    const ob = (assessmentQ.data?.operationalBaseline as any) ?? {};
    const cpoEngineInputs = !isRewardMode && ob ? {
      totalHeadcount: ob.sectionA?.totalHeadcount ?? assessmentQ.data?.headcount ?? 0,
      sector: assessmentQ.data?.sector ?? "professional_services",
      hiresPerYear: ob.sectionD?.annualHires ?? undefined,
      attritionRatePct: ob.sectionD?.attritionRate ?? undefined,
      lAndDSpendPerFteGbp: (ob.sectionD?.annualLDSpend && ob.sectionA?.totalHeadcount && ob.sectionA.totalHeadcount > 0)
        ? Math.round(ob.sectionD.annualLDSpend / ob.sectionA.totalHeadcount)
        : undefined,
      costPerHireGbp: ob.sectionD?.costPerExternalHire ?? undefined,
      timeToFillDays: ob.sectionD?.avgTimeToFill ?? undefined,
      annualRevenueGbp: ob.sectionD?.annualRevenue ?? undefined,
    } : undefined;

    generateNarrativeMut.mutate({
      orgName: (assessmentQ.data?.structuredInputs as any)?.org_name,
      sector: assessmentQ.data?.sector ?? undefined,
      headcount: assessmentQ.data?.headcount ?? undefined,
      vision: assessmentQ.data?.visionStatement ?? undefined,
      strategy: assessmentQ.data?.strategyStatement ?? undefined,
      archetype: assessmentQ.data?.strategyArchetype ?? undefined,
      principles,
      selectedInitiatives: selectedIds,
      totalCostLow: costEnv ? costEnv.totalMin * 1000 : undefined,
      totalCostHigh: costEnv ? costEnv.totalMax * 1000 : undefined,
      totalValueLow: ve?.net_value_gbp?.low ?? undefined,
      totalValueHigh: ve?.net_value_gbp?.high ?? undefined,
      topRisks,
      keyDependencies: keyDeps,
      mode: isRewardMode ? "reward" : "cpo",
      cpoEngineInputs: cpoEngineInputs as any,
      cpoRecommendedScenario: "central",
    });
  };

  // ── Gate confirm ──────────────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const markEditedMut = trpc.gate.markEdited.useMutation();
  const confirmMut = trpc.gate.completeStage9.useMutation({
    onSuccess: () => {
      gate.refetch();
      toast.success("Business case confirmed — Stage 8 unlocked");
      setConfirmOpen(false);
      navigate("/strategy/review");
    },
    onError: (e) => toast.error(`Confirmation failed: ${e.message}`),
  });

  const wordCount = useMemo(() => {
    const text = narrative.trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }, [narrative]);

  const canConfirm = wordCount >= 50;

  // Mark edited when narrative changes after gate cleared
  useEffect(() => {
    if (gate.stage9Cleared && narrativeLoaded && narrative) {
      markEditedMut.mutate({ stage: "stage9" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrative]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const costEnv = costEnvQ.data;
  const ve      = valueEnvQ.data as any;
  const fmt     = formatGbp;
  const fmtGbk  = formatGbpK;

  const isLoading   = assessmentQ.isLoading;
  const hasStrategy = !!(assessmentQ.data?.completed && selectedIds.length > 0);

  const tierConfig = {
    cautious:       { label: "Cautious",       color: "#4ADE80", bg: "#4ADE8020" },
    progressive:    { label: "Progressive",    color: "#FBBF24", bg: "#FBBF2420" },
    transformative: { label: "Transformative", color: "#F87171", bg: "#F8717120" },
  }[ambitionTier] ?? { label: "Progressive", color: "#FBBF24", bg: "#FBBF2420" };

  const riskItems     = (liveRisks ?? []).filter(r => r.type !== "note");
  const noteItems     = (liveRisks ?? []).filter(r => r.type === "note");
  const highRiskCount = riskItems.filter(r => r.severity === "high" || r.severity === "very_high").length;

  // ── All risks acknowledged check ──────────────────────────────────────────
  const allRisksAcknowledged = useMemo(() => {
    if (riskItems.length === 0) return true;
    return riskItems.every(r => isAcknowledged(r.ruleId));
  }, [riskItems, isAcknowledged]);

  if (isLoading) {
    return (
      <SectionPageLayout sectionNumber="09" sectionLabel="Business Case" title="Business case" accentColor="#60A5FA" icon={<Briefcase className="w-5 h-5" />}>
        <div className="space-y-5">
          {[...Array(4)].map((_, i) => <BlockSkeleton key={i} lines={4} />)}
        </div>
      </SectionPageLayout>
    );
  }

  if (!hasStrategy) {
    return (
      <SectionPageLayout sectionNumber="09" sectionLabel="Business Case" title="Business case" accentColor="#60A5FA" icon={<Briefcase className="w-5 h-5" />}>
        <div className="rounded-xl border border-dashed border-blue-500/20 bg-blue-500/4 p-8 flex items-start gap-4">
          <Briefcase className="w-5 h-5 dark:text-blue-400 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">No strategy configured yet</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">Complete Stages 1–6 to generate your business case.</p>
            <Button size="sm" className="text-xs h-8" onClick={() => navigate("/strategy/diagnostic")}>
              Start strategy assessment <ArrowRight className="w-3 h-3 ml-1.5" />
            </Button>
          </div>
        </div>
      </SectionPageLayout>
    );
  }

  return (
    <SectionPageLayout
      sectionNumber="09"
      sectionLabel="Business Case"
      title="Business case"
      accentColor="#60A5FA"
      icon={<Briefcase className="w-5 h-5" />}
      isLocked={!gate.isStage9Accessible}
      editedAfterClearing={gate.stage9EditedAfterClearing || gate.stage7EditedAfterClearing || gate.stage8EditedAfterClearing}
      upstreamStageLabel={
        gate.stage8EditedAfterClearing
          ? "Capability (Stage 8)"
          : gate.stage7EditedAfterClearing
            ? "Success Measures (Stage 7)"
            : "Success Measures"
      }
      isDeepDive={isDeepDive}
      confirmedAt={gate.gateState?.stage9.completedAt}
      stageProgress={!isDeepDive && gate.isStage9Accessible ? {
        stageNumber: 9,
        title: "Business Case",
        description: "Generate your investment narrative, review risk factors, and confirm the business case. Requires at least 50 words in the narrative.",
        isCleared: !!gate.stage9Cleared,
        // T11: show amber in StageProgressHeader if stage9 OR upstream stage7/stage8 was edited
        isEdited: !!(gate.stage9EditedAfterClearing || gate.stage7EditedAfterClearing || gate.stage8EditedAfterClearing),
        canConfirm,
        isPending: confirmMut.isPending,
        onConfirm: () => {
          const upstreamEdited = gate.stage7EditedAfterClearing || gate.stage8EditedAfterClearing;
          if (gate.stage9Cleared && !gate.stage9EditedAfterClearing && !upstreamEdited) {
            navigate("/strategy/review");
          } else {
            setConfirmOpen(true);
          }
        },
        backRoute: "/strategy/capability",
        nextRoute: "/strategy/capability",
        nextLabel: "Capability",
      } : undefined}
      actions={
        <Button
          variant="outline" size="sm"
          className="text-xs h-7 border-border hover:border-border/80 text-muted-foreground"
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
      {/* ── Block 1: THE CASE — AI narrative (centerpiece) ────────────────── */}
      <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/8 to-blue-500/3 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-4 h-4 dark:text-blue-400 text-blue-600" />
          <p className="text-[10px] font-bold dark:text-blue-400 text-blue-600 uppercase tracking-widest flex-1">The Case</p>
          <span className="text-[10px] text-muted-foreground">{wordCount} words</span>
          {wordCount >= 300 && wordCount <= 800 && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 dark:border-green-500/30 border-green-300 dark:text-green-400 text-green-600">Ready</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          {isRewardMode
            ? "The case you'll take to your CFO and CHRO. Numbers and risks support the argument — but the argument is the deliverable."
            : "The case you'll take to your board. Numbers and risks support the argument — but the argument is the deliverable."}
        </p>

        {/* AI actions toolbar */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Button
            variant="outline" size="sm"
            className="text-xs h-7 gap-1.5 dark:border-blue-500/30 border-blue-300 dark:text-blue-400 text-blue-600 hover:bg-blue-500/10"
            onClick={handleGenerateNarrative}
            disabled={generateNarrativeMut.isPending}
          >
            {generateNarrativeMut.isPending
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Sparkles className="w-3 h-3" />
            }
            {narrative ? "Regenerate" : "Generate narrative"}
          </Button>
          {narrative && (
            <AITextActions
              text={narrative}
              context={{
                stage: "business_case",
                orgContext: {
                  sector: assessmentQ.data?.sector ?? undefined,
                  headcount: assessmentQ.data?.headcount ?? undefined,
                  strategyArchetype: assessmentQ.data?.strategyArchetype ?? undefined,
                  visionStatement: assessmentQ.data?.visionStatement ?? undefined,
                },
              }}
              onResult={(t) => setNarrative(t)}
              actions={["refine", "challenge"]}
              showLabels
            />
          )}
        </div>

        <Textarea
          value={narrative}
          onChange={e => setNarrative(e.target.value)}
          placeholder="Click 'Generate narrative' to create a board-ready business case, or write your own here…"
          className="text-sm resize-none min-h-[280px] bg-background/60 border-border/60 leading-relaxed"
        />
        {wordCount > 0 && wordCount < 50 && (
          <p className="text-[10px] dark:text-amber-400 text-amber-600 mt-1.5">Minimum 50 words required to confirm.</p>
        )}
      </div>

      {/* ── Block 2: NUMBERS — collapsible ────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white/2 overflow-hidden">
        <button
          onClick={() => setNumbersCollapsed(c => !c)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-foreground/3 transition-colors"
          aria-expanded={!numbersCollapsed}
        >
          <PoundSterling className="w-4 h-4 dark:text-amber-400 text-amber-600" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1 text-left">Numbers</p>
          {costEnv && <span className="text-sm font-bold dark:text-amber-400 text-amber-600 mr-2">{fmtGbk(costEnv.totalMin)}–{fmtGbk(costEnv.totalMax)}</span>}
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${numbersCollapsed ? "" : "rotate-180"}`} />
        </button>
        {!numbersCollapsed && (
          <div className="px-5 pb-5 animate-in slide-in-from-top-1 duration-200 space-y-5">
            {/* Cost hero */}
            {costEnv ? (
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-[10px] font-bold dark:text-amber-400 text-amber-600 uppercase tracking-widest mb-1">Total Investment Envelope (3-year)</p>
                    <p className="text-2xl font-bold text-foreground">{fmtGbk(costEnv.totalMin)}–{fmtGbk(costEnv.totalMax)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Across {selectedIds.length} initiative{selectedIds.length !== 1 ? "s" : ""} · {costEnv.currency ?? "GBP"} · indicative
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide flex-shrink-0" style={{ background: tierConfig.bg, color: tierConfig.color }}>
                    {tierConfig.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {costEnv.byPhase.map(phase => {
                    const cfg   = PHASE_LABELS[phase.phase] ?? { label: phase.label, months: "" };
                    const color = PHASE_COLORS[phase.phase] ?? "var(--muted-foreground)";
                    return (
                      <div key={phase.phase} className="rounded-xl border border-border bg-foreground/3 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                          <p className="text-[10px] font-semibold text-muted-foreground truncate">{cfg.label}</p>
                        </div>
                        <p className="text-sm font-bold text-foreground">{fmtGbk(phase.minGbk)}–{fmtGbk(phase.maxGbk)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{phase.initiativeCount} initiative{phase.initiativeCount !== 1 ? "s" : ""}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : costEnvQ.isLoading ? (
              <BlockSkeleton lines={3} />
            ) : null}

            {/* Value summary chart */}
            {ve ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 dark:text-emerald-400 text-emerald-600" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Value Summary · 3-year horizon</p>
                </div>
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="rounded-lg border dark:border-emerald-500/30 border-emerald-300 bg-emerald-500/8 p-3 flex-1 min-w-[120px]">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Gross value</div>
                    <div className="text-lg font-bold dark:text-emerald-400 text-emerald-600">{fmt(ve.total_quantified_value_gbp?.high)}</div>
                  </div>
                  <div className="rounded-lg border dark:border-red-500/25 border-red-300 bg-red-500/6 p-3 flex-1 min-w-[120px]">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Total cost</div>
                    <div className="text-lg font-bold dark:text-red-400 text-red-600">{fmt(ve.tco?.total_3yr_gbp?.high)}</div>
                  </div>
                  <div className="rounded-lg border dark:border-blue-500/25 border-blue-300 bg-blue-500/6 p-3 flex-1 min-w-[120px]">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Net value</div>
                    <div className="text-lg font-bold dark:text-blue-400 text-blue-600">{fmt(Math.max(0, ve.net_value_gbp?.high))}</div>
                  </div>
                </div>
                {ve.total_quantified_value_gbp && ve.tco?.total_3yr_gbp && ve.net_value_gbp && (
                  <ValueSummaryChart
                    gross={{ low: ve.total_quantified_value_gbp.low, high: ve.total_quantified_value_gbp.high }}
                    cost={{ low: ve.tco.total_3yr_gbp.low, high: ve.tco.total_3yr_gbp.high }}
                    net={{ low: Math.max(0, ve.net_value_gbp.low), high: Math.max(0, ve.net_value_gbp.high) }}
                  />
                )}
              </div>
            ) : valueEnvQ.isLoading ? (
              <BlockSkeleton lines={3} />
            ) : null}

            {/* TCO breakdown */}
            {ve?.tco && (
              <div>
                <button onClick={() => setTcoCollapsed(c => !c)} className="w-full flex items-center gap-2 mb-2" aria-expanded={!tcoCollapsed}>
                  <Layers className="w-3.5 h-3.5 dark:text-amber-400 text-amber-600" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1 text-left">Total Cost of Ownership breakdown</p>
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${tcoCollapsed ? "" : "rotate-180"}`} />
                </button>
                {!tcoCollapsed && (
                  <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                    {[
                      { label: "Implementation",    low: ve.tco.implementation_gbp?.low,    high: ve.tco.implementation_gbp?.high,    color: "#FBBF24" },
                      { label: "Change Management", low: ve.tco.change_management_gbp?.low,  high: ve.tco.change_management_gbp?.high, color: "#FB923C" },
                      { label: "Training",          low: ve.tco.training_gbp?.low,           high: ve.tco.training_gbp?.high,          color: "#60A5FA" },
                      { label: "Ongoing (annual)",  low: ve.tco.ongoing_annual_gbp?.low,     high: ve.tco.ongoing_annual_gbp?.high,    color: "#A78BFA" },
                    ].filter(r => r.low != null).map(row => {
                      const pct = ve.tco.implementation_gbp?.high > 0 ? Math.min(Math.round((row.high / ve.tco.implementation_gbp.high) * 100), 100) : 0;
                      return (
                        <div key={row.label}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-muted-foreground">{row.label}</p>
                            <p className="text-xs font-semibold" style={{ color: row.color }}>{fmt(row.low)}–{fmt(row.high)}</p>
                          </div>
                          <div className="h-1.5 rounded-full bg-foreground/8 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: row.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Qualitative highlights */}
            {ve?.qualitative_summary?.bullet_points?.length > 0 && (
              <div>
                <button onClick={() => setQualCollapsed(c => !c)} className="w-full flex items-center gap-2 mb-2" aria-expanded={!qualCollapsed}>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1 text-left">Qualitative value highlights</p>
                  <span className="text-[11px] text-muted-foreground">{qualCollapsed ? `See ${ve.qualitative_summary.bullet_points.length} outcomes` : "Hide"}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${qualCollapsed ? "" : "rotate-180"}`} />
                </button>
                {!qualCollapsed && (
                  <ul className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                    {ve.qualitative_summary.bullet_points.map((b: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 dark:text-violet-400 text-violet-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">{b}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Reinvestment guidance */}
            {ve?.reinvestment_plan && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-bold dark:text-emerald-400 text-emerald-600 dark:bg-emerald-500/15 bg-emerald-100/80 px-2 py-0.5 rounded-full uppercase tracking-wide">Forward-looking guidance</span>
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{ve.reinvestment_plan.headline}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{ve.reinvestment_plan.narrative}</p>
                {ve.reinvestment_plan.suggested_reinvestment_gbp && (
                  <p className="text-sm font-medium dark:text-emerald-400 text-emerald-600 mt-2">
                    Future reinvestment guide: {fmt(ve.reinvestment_plan.suggested_reinvestment_gbp)}
                  </p>
                )}
              </div>
            )}

            {/* CEO sponsorship */}
            {ve?.ceo_sponsorship_required && ve.ceo_sponsorship && (
              <div className="rounded-lg border dark:border-violet-500/25 border-violet-300 bg-violet-500/6 p-4">
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 dark:text-violet-400 text-violet-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">CEO sponsorship recommended</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">{ve.ceo_sponsorship.rationale}</p>
                    <div className="rounded-lg border border-violet-500/15 bg-violet-500/8 p-3">
                      <p className="text-[10px] font-bold dark:text-violet-400 text-violet-600 uppercase tracking-widest mb-1">Recommended action</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{ve.ceo_sponsorship.suggested_framing}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CPO Computed Business Case Model — shown only in CPO mode after generation */}
        {!isRewardMode && cpoComputedModel && (
          <div className="mt-3 rounded-xl border dark:border-blue-500/25 border-blue-300 bg-blue-500/5 overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3">
              <BarChart2 className="w-4 h-4 dark:text-blue-400 text-blue-600" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1">Computed Business Case Model</p>
              <span className="text-[10px] font-bold dark:text-blue-400 text-blue-600 dark:bg-blue-500/15 bg-blue-100/80 px-2 py-0.5 rounded-full uppercase tracking-wide">Board-ready · 3-year</span>
            </div>
            <div className="px-5 pb-5 space-y-4">
              {/* Three-scenario headline metrics */}
              <div className="grid grid-cols-3 gap-3">
                {(["conservative", "central", "optimistic"] as const).map(s => {
                  const r = cpoComputedModel.rollup?.[s];
                  if (!r) return null;
                  const isSelected = s === "central";
                  return (
                    <div key={s} className={`rounded-xl border p-3 ${isSelected ? "dark:border-blue-500/40 border-blue-400 dark:bg-blue-500/10 bg-blue-50" : "border-border bg-foreground/3"}` }>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: s === "conservative" ? "#F87171" : s === "central" ? "#60A5FA" : "#4ADE80" }}>{s}</p>
                      <p className="text-lg font-bold text-foreground">{fmtGbk(r.netBenefit3yr)}</p>
                      <p className="text-[10px] text-muted-foreground">Net benefit</p>
                      <div className="mt-2 space-y-0.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">TCO</span>
                          <span className="font-medium text-foreground">{fmtGbk(r.tco3yr)}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">ROI</span>
                          <span className="font-medium text-foreground">{r.roi3yr != null ? `${r.roi3yr}x` : "—"}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">Payback</span>
                          <span className="font-medium text-foreground">{r.paybackMonths != null ? `${r.paybackMonths}mo` : "—"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Per-initiative lines */}
              {cpoComputedModel.lines?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Per-Initiative (central scenario)</p>
                  <div className="space-y-1.5">
                    {cpoComputedModel.lines.map((l: any) => (
                      <div key={l.initiativeId} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-foreground/3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{l.label}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{l.category?.replace(/_/g, " ")}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-semibold dark:text-emerald-400 text-emerald-600">{l.hasQuantifiedValue ? fmtGbk(l.value3yrCentral) : "qualitative"}</p>
                          <p className="text-[10px] text-muted-foreground">TCO {fmtGbk(l.tco3yrCentral)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overlap discounts */}
              {cpoComputedModel.overlapDiscounts?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Value-Overlap Protection</p>
                  <div className="space-y-1.5">
                    {cpoComputedModel.overlapDiscounts.map((d: any) => (
                      <div key={d.category} className="flex items-start gap-3 rounded-lg border dark:border-amber-500/20 border-amber-300 bg-amber-500/5 px-3 py-2">
                        <Info className="w-3.5 h-3.5 dark:text-amber-400 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground capitalize">{d.category?.replace(/_/g, " ")} overlap — {Math.round(d.discountPct * 100)}% discount</p>
                          <p className="text-[10px] text-muted-foreground">{d.initiativeLabels?.join(" · ")}</p>
                        </div>
                        <p className="text-xs font-semibold dark:text-amber-400 text-amber-600 flex-shrink-0">−{fmtGbk(d.discountAmountCentral)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <p className="text-[10px] text-muted-foreground">Total overlap discount (central): <span className="font-semibold dark:text-amber-400 text-amber-600">−{fmtGbk(cpoComputedModel.rollup?.central?.overlapDiscountTotal)}</span></p>
                  </div>
                </div>
              )}

              {/* Qualitative-only notice */}
              {cpoComputedModel.qualitativeOnlyIds?.length > 0 && (
                <div className="rounded-lg border dark:border-violet-500/20 border-violet-300 bg-violet-500/5 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">
                    <span className="font-semibold dark:text-violet-400 text-violet-600">{cpoComputedModel.qualitativeOnlyIds.length} initiative{cpoComputedModel.qualitativeOnlyIds.length !== 1 ? "s" : ""}</span> in your portfolio are qualitative-only — value formulas not yet available. Excluded from financial model.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Block 3: RISKS — collapsible ──────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white/2 overflow-hidden">
        <button
          onClick={() => setRisksCollapsed(c => !c)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-foreground/3 transition-colors"
          aria-expanded={!risksCollapsed}
        >
          <Shield className="w-4 h-4 dark:text-red-400 text-red-600" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1 text-left">Risks</p>
          {highRiskCount > 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1.5 rounded">{highRiskCount} high</Badge>}
          {allRisksAcknowledged && riskItems.length > 0 && <CheckCircle2 className="w-3.5 h-3.5 dark:text-green-400 text-green-600" />}
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${risksCollapsed ? "" : "rotate-180"}`} />
        </button>
        {!risksCollapsed && (
          <div className="px-5 pb-5 animate-in slide-in-from-top-1 duration-200 space-y-4">
            {/* Risk register */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1">Risk Register</p>
                {evaluateRiskMut.isPending && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Evaluating…</span>}
                {riskItems.length > 0 && <span className="text-[10px] text-muted-foreground">{riskItems.length} rule{riskItems.length !== 1 ? "s" : ""} matched</span>}
              </div>
              {!evaluateRiskMut.isPending && riskItems.length === 0 && (
                <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 dark:text-green-400 text-green-600 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">No risk rules triggered for your current selection.</p>
                </div>
              )}
              <div className="space-y-2">
                {riskItems.map(risk => {
                  const sev   = SEVERITY_CONFIG[risk.severity] ?? SEVERITY_CONFIG.medium;
                  const acked = isAcknowledged(risk.ruleId);
                  const ackData = acksMap.get(risk.ruleId);
                  return (
                    <div key={risk.ruleId} className={`rounded-lg border overflow-hidden transition-colors ${acked ? "border-green-500/20 bg-green-500/3" : "border-border bg-white/2"}`}>
                      <button onClick={() => setRiskCollapsed(s => ({ ...s, [risk.ruleId]: !s[risk.ruleId] }))} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-foreground/3 transition-colors" aria-expanded={!riskCollapsed[risk.ruleId]}>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide flex-shrink-0" style={{ background: sev.bg, color: sev.color }}>{sev.label}</span>
                        <span className="text-sm font-medium text-foreground flex-1 text-left">{risk.displayName}</span>
                        {acked && <CheckCircle2 className="w-3.5 h-3.5 dark:text-green-400 text-green-600 flex-shrink-0" />}
                        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform ${riskCollapsed[risk.ruleId] ? "" : "rotate-180"}`} />
                      </button>
                      {!riskCollapsed[risk.ruleId] && (
                        <div className="px-4 pb-4 animate-in slide-in-from-top-1 duration-200 space-y-3">
                          <p className="text-xs text-muted-foreground leading-relaxed">{risk.riskStatement}</p>
                          <div className="rounded-lg border border-border bg-white/2 px-3 py-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Recommended action</p>
                            <p className="text-xs text-foreground leading-relaxed">{risk.recommendedAction}</p>
                          </div>
                          {acked && ackData?.note && (
                            <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
                              <p className="text-[10px] font-bold dark:text-green-400 text-green-600 uppercase tracking-widest mb-1">Mitigation note</p>
                              <p className="text-xs text-foreground leading-relaxed">{ackData.note}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            {!acked ? (
                              <Button size="sm" variant="outline" className="text-xs h-7 dark:border-green-500/30 border-green-300 dark:text-green-400 text-green-600 hover:bg-green-500/10" onClick={() => handleAcknowledge(risk.ruleId, risk.displayName, "risk")} disabled={acknowledgeMut.isPending}>
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
                <div className="mt-3 space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Regulatory Notes</p>
                  {noteItems.map(note => (
                    <div key={note.ruleId} className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                      <div className="flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 dark:text-blue-400 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-1">{note.displayName}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{note.riskStatement}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* EU AI Act */}
            {euAiFlagged.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <button onClick={() => setEuAiCollapsed(c => !c)} className="w-full flex items-center gap-2" aria-expanded={!euAiCollapsed}>
                  <AlertTriangle className="w-4 h-4 dark:text-amber-400 text-amber-600" />
                  <p className="text-[10px] font-bold dark:text-amber-400 text-amber-600 uppercase tracking-widest flex-1 text-left">EU AI Act Flagged Initiatives</p>
                  <span className="text-xs dark:text-amber-400 text-amber-600 font-semibold mr-2">{euAiFlagged.length} flagged</span>
                  <ChevronDown className={`w-3.5 h-3.5 dark:text-amber-400 text-amber-600 transition-transform ${euAiCollapsed ? "" : "rotate-180"}`} />
                </button>
                {!euAiCollapsed && (
                  <div className="mt-3 animate-in slide-in-from-top-1 duration-200 space-y-2">
                    {euAiFlagged.map((init: any) => (
                      <div key={init.id} className="flex items-center gap-2 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2">
                        <AlertTriangle className="w-3 h-3 dark:text-amber-400 text-amber-600 flex-shrink-0" />
                        <span className="text-xs text-foreground flex-1">{init.name}</span>
                        <span className="text-[10px] text-muted-foreground">{init.category}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* UK Standing Frameworks */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Scale className="w-4 h-4 dark:text-purple-400 text-purple-600" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1">UK Standing Regulatory Frameworks</p>
                <span className="text-[10px] text-muted-foreground">Always applicable</span>
              </div>
              <div className="space-y-2">
                {UK_STANDING_FRAMEWORKS.map(fw => {
                  const acked   = isAcknowledged(fw.id);
                  const ackData = acksMap.get(fw.id);
                  return (
                    <div key={fw.id} className={`rounded-lg border overflow-hidden transition-colors ${acked ? "border-green-500/20 bg-green-500/3" : "border-border bg-white/2"}`}>
                      <button onClick={() => setFwCollapsed(s => ({ ...s, [fw.id]: !s[fw.id] }))} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-foreground/3 transition-colors" aria-expanded={!fwCollapsed[fw.id]}>
                        <FrameworkIcon icon={fw.icon} color={fw.color} />
                        <span className="text-sm font-medium text-foreground flex-1 text-left">{fw.name}</span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0 hidden sm:block">{fw.regulator}</span>
                        {acked && <CheckCircle2 className="w-3.5 h-3.5 dark:text-green-400 text-green-600 flex-shrink-0" />}
                        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform ${fwCollapsed[fw.id] ? "" : "rotate-180"}`} />
                      </button>
                      {!fwCollapsed[fw.id] && (
                        <div className="px-4 pb-4 animate-in slide-in-from-top-1 duration-200 space-y-3">
                          <p className="text-xs text-muted-foreground leading-relaxed">{fw.relevance}</p>
                          <div className="rounded-lg border border-border bg-white/2 px-3 py-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Required action</p>
                            <p className="text-xs text-foreground leading-relaxed">{fw.action}</p>
                          </div>
                          {acked && ackData?.note && (
                            <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
                              <p className="text-[10px] font-bold dark:text-green-400 text-green-600 uppercase tracking-widest mb-1">Compliance note</p>
                              <p className="text-xs text-foreground leading-relaxed">{ackData.note}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            {!acked ? (
                              <Button size="sm" variant="outline" className="text-xs h-7 dark:border-green-500/30 border-green-300 dark:text-green-400 text-green-600 hover:bg-green-500/10" onClick={() => handleAcknowledge(fw.id, fw.name, "framework")} disabled={acknowledgeMut.isPending}>
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
          </div>
        )}
      </div>

      {/* ── Block 4: DEPENDENCIES — collapsible ───────────────────────────── */}
      <div className="rounded-xl border border-border bg-white/2 overflow-hidden">
        <button
          onClick={() => setDepsCollapsed(c => !c)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-foreground/3 transition-colors"
          aria-expanded={!depsCollapsed}
        >
          <Link2 className="w-4 h-4 text-muted-foreground" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1 text-left">Dependencies</p>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${depsCollapsed ? "" : "rotate-180"}`} />
        </button>
        {!depsCollapsed && (
          <div className="px-5 pb-5 animate-in slide-in-from-top-1 duration-200 space-y-4">
            {/* Cross-functional deps */}
            <div>
              <button onClick={() => setCrossFuncCollapsed(c => !c)} className="w-full flex items-center gap-2 mb-2" aria-expanded={!crossFuncCollapsed}>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1 text-left">Cross-Functional Dependencies</p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{crossFuncCollapsed ? "See dependencies" : "Hide"}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${crossFuncCollapsed ? "" : "rotate-180"}`} />
                </div>
              </button>
              {!crossFuncCollapsed && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  {crossFuncGroups.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {crossFuncGroups.map(dep => (
                        <div key={dep.key} className="rounded-lg border border-border bg-white/2 p-4">
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
                        <div key={dep.label} className="rounded-lg border border-border bg-white/2 p-4">
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

            {/* Solution delivery confidence */}
            {solutionDeliveryConf !== undefined && (() => {
              const opt   = SOLUTION_DELIVERY_OPTIONS.find(o => o.value === solutionDeliveryConf);
              if (!opt) return null;
              const pct   = ((solutionDeliveryConf - 1) / 4) * 100;
              const color = solutionDeliveryConf >= 4 ? "#22C55E" : solutionDeliveryConf === 3 ? "#F59E0B" : "#EF4444";
              return (
                <div className="rounded-xl border border-border bg-white/2 p-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Solution Delivery Confidence</p>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                    <span className="text-xs font-mono text-muted-foreground">{solutionDeliveryConf}/5</span>
                  </div>
                  <div className="h-2 rounded-full bg-foreground/8 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{opt.description}</p>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── Gate confirm footer ────────────────────────────────────────────── */}
      {gate.stage9Cleared && isDeepDive ? (
        <DeepDiveConfirmedStatus
          confirmedAt={gate.gateState?.stage9.completedAt}
          label="Stage 9 confirmed"
        />
      ) : (
      <div className="rounded-2xl border border-border bg-white/2 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
            {gate.stage9Cleared ? "Stage 9 confirmed" : "Confirm business case"}
          </p>
          <p className="text-sm text-muted-foreground">
            {gate.stage9Cleared
              ? "Business case confirmed. Continue to Stage 8: Capability to deliver."
              : canConfirm
                ? "Your narrative is ready. Confirm to unlock Stage 8."
                : "Write or generate a narrative (min 50 words) to confirm."
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 border-border"
            title="Intermediate export — final board report is produced at Stage 11"
            onClick={() => {
              const a = document.createElement("a");
              a.href = "/api/pdf/business_case";
              a.download = "aiq-business-case-intermediate.pdf";
              a.click();
            }}
          >
            <FileDown className="w-3.5 h-3.5 mr-1.5" />
            Export intermediate report
          </Button>
          {gate.stage9Cleared && (
            <Button variant="outline" size="sm" className="text-xs h-8 border-border" onClick={() => navigate("/strategy/review")}>
              Continue to Stage 8 <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}
          <Button
            size="sm"
            className="text-xs h-8"
            disabled={!canConfirm || confirmMut.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            {confirmMut.isPending && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
            {gate.stage9Cleared ? "Re-confirm" : "Confirm business case →"}
          </Button>
        </div>
      </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
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
      <ConfirmBusinessCaseDialog
        open={confirmOpen}
        wordCount={wordCount}
        onConfirm={() => confirmMut.mutate({ businessCaseNarrative: narrative })}
        onClose={() => setConfirmOpen(false)}
        isLoading={confirmMut.isPending}
      />
    </SectionPageLayout>
  );
}
