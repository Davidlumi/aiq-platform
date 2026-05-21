/**
 * RewardBusinessCasePage — Stage 7 of the Reward AI Strategy flow.
 *
 * Sections:
 *   1. Headline metrics strip (3yr net benefit, ROI, payback)
 *   2. Scenario sensitivity toggle (Conservative / Central / Optimistic)
 *   3. Investment table (per-initiative cost/value breakdown with override UI)
 *   4. Overlap discount callout
 *   5. Programme funding section (off-band population, separate from TCO)
 *   6. Value by category (sub-domain breakdown)
 *   7. Four narrative sections (AI-generated, editable, with affordances)
 *   8. Confirm gate
 *
 * Gate: requires Stage 5 (Portfolio) to be completed.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2, RefreshCw, AlertTriangle, Lock, Sparkles,
  RotateCcw, Info, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, Pencil, X, PoundSterling,
  BarChart3, Clock, Layers, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SectionPageLayout from "@/components/SectionPageLayout";
import { useLocation } from "wouter";
import type { BusinessCaseModel, ScenarioRollup, Scenario } from "@/../../server/services/rewardBusinessCaseEngine";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000)     return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString()}`;
}

function fmtRange(low: number, high: number): string {
  if (low === high) return fmt(low);
  return `${fmt(low)}–${fmt(high)}`;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Scenario toggle ──────────────────────────────────────────────────────────

const SCENARIOS: { key: Scenario; label: string; description: string }[] = [
  { key: "conservative", label: "Conservative", description: "Low-end cost and value estimates" },
  { key: "central",      label: "Central",      description: "Midpoint estimates — recommended baseline" },
  { key: "optimistic",   label: "Optimistic",   description: "High-end value, low-end cost" },
];

function ScenarioToggle({
  active,
  onChange,
}: {
  active: Scenario;
  onChange: (s: Scenario) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
      {SCENARIOS.map(s => (
        <button
          key={s.key}
          onClick={() => onChange(s.key)}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            active === s.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={s.description}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ─── Headline metrics strip ───────────────────────────────────────────────────

function HeadlineMetrics({
  rollup,
  scenario,
}: {
  rollup: ScenarioRollup;
  scenario: Scenario;
}) {
  const roiPct = rollup.roi3yr != null ? Math.round(rollup.roi3yr * 100) : null;
  const paybackYrs = rollup.paybackMonths != null
    ? (rollup.paybackMonths / 12).toFixed(1)
    : null;

  const netBenefitPositive = rollup.netBenefit3yr >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Net benefit */}
      <Card className="border-border/60">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">3yr Net Benefit</p>
              <p className={cn(
                "text-2xl font-semibold tabular-nums",
                netBenefitPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}>
                {netBenefitPositive ? "+" : ""}{fmt(rollup.netBenefit3yr)}
              </p>
            </div>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              netBenefitPositive ? "bg-emerald-500/10" : "bg-rose-500/10"
            )}>
              {netBenefitPositive
                ? <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                : <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">After overlap discounts</p>
        </CardContent>
      </Card>

      {/* TCO */}
      <Card className="border-border/60">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">3yr TCO</p>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {fmt(rollup.tco3yr)}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/10">
              <PoundSterling className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Excl. programme funding</p>
        </CardContent>
      </Card>

      {/* ROI */}
      <Card className="border-border/60">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">3yr ROI</p>
              <p className={cn(
                "text-2xl font-semibold tabular-nums",
                roiPct == null ? "text-muted-foreground" :
                roiPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}>
                {roiPct != null ? `${roiPct >= 0 ? "+" : ""}${roiPct}%` : "—"}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-violet-500/10">
              <BarChart3 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">(Net value − TCO) / TCO</p>
        </CardContent>
      </Card>

      {/* Payback */}
      <Card className="border-border/60">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Payback</p>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {paybackYrs != null ? `${paybackYrs} yrs` : ">3 yrs"}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-500/10">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {scenario === "conservative" ? "Conservative scenario" :
             scenario === "optimistic"   ? "Optimistic scenario" : "Central scenario"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Investment table ─────────────────────────────────────────────────────────

function InvestmentTable({
  model,
  scenario,
  onOverride,
}: {
  model: BusinessCaseModel;
  scenario: Scenario;
  onOverride: (initiativeId: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <span>Initiative</span>
        <span className="text-right w-28">Year 1 Cost</span>
        <span className="text-right w-28">Ongoing / yr</span>
        <span className="text-right w-28">3yr Value</span>
        <span className="text-right w-28">3yr TCO</span>
      </div>

      {model.lines.map(line => {
        const isExpanded = expanded.has(line.initiativeId);
        const year1 = scenario === "conservative" ? line.effectiveYear1Low
          : scenario === "optimistic" ? line.effectiveYear1High
          : Math.round((line.effectiveYear1Low + line.effectiveYear1High) / 2);
        const ongoing = scenario === "conservative" ? line.effectiveOngoingLow
          : scenario === "optimistic" ? line.effectiveOngoingHigh
          : Math.round((line.effectiveOngoingLow + line.effectiveOngoingHigh) / 2);
        const value3yr = scenario === "conservative" ? line.value3yrConservative
          : scenario === "optimistic" ? line.value3yrOptimistic
          : line.value3yrCentral;
        const tco3yr = scenario === "conservative" ? line.tco3yrConservative
          : scenario === "optimistic" ? line.tco3yrOptimistic
          : line.tco3yrCentral;

        return (
          <div key={line.initiativeId} className="border-b border-border/50 last:border-0">
            <div
              className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-4 py-3 hover:bg-muted/20 cursor-pointer items-center"
              onClick={() => toggle(line.initiativeId)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isExpanded
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{line.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{line.phase}</Badge>
                    <span className="text-[10px] text-muted-foreground">{line.subDomain}</span>
                    {line.hasOverride && (
                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                        Overridden
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-sm tabular-nums text-right w-28">{fmt(year1)}</span>
              <span className="text-sm tabular-nums text-right w-28">{fmt(ongoing)}</span>
              <span className="text-sm tabular-nums text-right w-28 text-emerald-600 dark:text-emerald-400">{fmt(value3yr)}</span>
              <span className="text-sm tabular-nums text-right w-28 text-muted-foreground">{fmt(tco3yr)}</span>
            </div>

            {isExpanded && (
              <div className="px-4 pb-3 pt-0 bg-muted/10 border-t border-border/30">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs mb-3">
                  <div>
                    <p className="text-muted-foreground mb-0.5">Year 1 range</p>
                    <p className="font-medium">{fmtRange(line.effectiveYear1Low, line.effectiveYear1High)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Ongoing range</p>
                    <p className="font-medium">{fmtRange(line.effectiveOngoingLow, line.effectiveOngoingHigh)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">3yr value range</p>
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">
                      {fmtRange(line.effectiveValueLow, line.effectiveValueHigh)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Value type</p>
                    <p className="font-medium">{line.primaryValueType}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Time to first value</p>
                    <p className="font-medium">{line.timeToFirstValueMonths} months</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Cost type</p>
                    <p className="font-medium capitalize">{line.costType.replace(/_/g, " ")}</p>
                  </div>
                </div>
                {line.costNote && (
                  <p className="text-xs text-muted-foreground italic mb-2">{line.costNote}</p>
                )}
                {line.hasOverride && line.overrideNote && (
                  <Alert className="mb-2 py-2 border-amber-500/30 bg-amber-500/5">
                    <AlertDescription className="text-xs">
                      <span className="font-medium">Override note:</span> {line.overrideNote}
                    </AlertDescription>
                  </Alert>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={e => { e.stopPropagation(); onOverride(line.initiativeId); }}
                >
                  <Pencil className="w-3 h-3 mr-1.5" />
                  {line.hasOverride ? "Edit override" : "Override figures"}
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Rollup footer */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-4 py-3 bg-muted/40 border-t border-border text-sm font-semibold">
        <span>Portfolio total</span>
        <span className="text-right w-28 tabular-nums">
          {fmt(scenario === "conservative"
            ? model.lines.reduce((s, l) => s + l.effectiveYear1Low, 0)
            : scenario === "optimistic"
            ? model.lines.reduce((s, l) => s + l.effectiveYear1High, 0)
            : model.lines.reduce((s, l) => s + Math.round((l.effectiveYear1Low + l.effectiveYear1High) / 2), 0))}
        </span>
        <span className="text-right w-28 tabular-nums">
          {fmt(scenario === "conservative"
            ? model.lines.reduce((s, l) => s + l.effectiveOngoingLow, 0)
            : scenario === "optimistic"
            ? model.lines.reduce((s, l) => s + l.effectiveOngoingHigh, 0)
            : model.lines.reduce((s, l) => s + Math.round((l.effectiveOngoingLow + l.effectiveOngoingHigh) / 2), 0))}
        </span>
        <span className="text-right w-28 tabular-nums text-emerald-600 dark:text-emerald-400">
          {fmt(model.rollup[scenario].grossValue3yr)}
        </span>
        <span className="text-right w-28 tabular-nums text-muted-foreground">
          {fmt(model.rollup[scenario].tco3yr)}
        </span>
      </div>
    </div>
  );
}

// ─── Overlap discount callout ─────────────────────────────────────────────────

function OverlapDiscountCallout({
  model,
  scenario,
}: {
  model: BusinessCaseModel;
  scenario: Scenario;
}) {
  if (model.overlapDiscounts.length === 0) return null;

  const total = model.overlapDiscounts.reduce((s, d) => {
    return s + (scenario === "conservative" ? d.discountAmountConservative
      : scenario === "optimistic" ? d.discountAmountOptimistic
      : d.discountAmountCentral);
  }, 0);

  return (
    <Alert className="border-blue-500/30 bg-blue-500/5">
      <Info className="h-4 w-4 text-blue-500" />
      <AlertDescription>
        <p className="text-sm font-medium mb-1">Overlap discount applied: {fmt(total)}</p>
        <p className="text-xs text-muted-foreground mb-2">
          Where multiple initiatives address the same sub-domain, a conservative overlap discount is applied
          (15% on the lower-value initiative for pairs; 25% on all-but-highest for three or more).
          This avoids double-counting value that would be captured by any single initiative in the group.
        </p>
        <div className="space-y-1">
          {model.overlapDiscounts.map(d => (
            <div key={d.subDomain} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {d.subDomain}: {d.initiativeTitles.join(", ")} ({Math.round(d.discountPct * 100)}% discount)
              </span>
              <span className="font-medium text-rose-600 dark:text-rose-400">
                −{fmt(scenario === "conservative" ? d.discountAmountConservative
                  : scenario === "optimistic" ? d.discountAmountOptimistic
                  : d.discountAmountCentral)}
              </span>
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}

// ─── Programme funding section ────────────────────────────────────────────────

function ProgrammeFundingSection({
  model,
  offBandPopulationPct,
  programmeFundingNote,
  onSaveAssumptions,
  isSaving,
}: {
  model: BusinessCaseModel;
  offBandPopulationPct?: number;
  programmeFundingNote?: string;
  onSaveAssumptions: (pct?: number, note?: string) => void;
  isSaving: boolean;
}) {
  const [editingPct, setEditingPct] = useState(false);
  const [pctValue, setPctValue] = useState(offBandPopulationPct?.toString() ?? "");
  const [noteValue, setNoteValue] = useState(programmeFundingNote ?? "");

  if (model.programmeFundingLines.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Programme Funding</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            These costs depend on workforce-specific data and are shown separately from the TCO above.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => setEditingPct(v => !v)}
        >
          <Pencil className="w-3 h-3 mr-1.5" />
          Set assumptions
        </Button>
      </div>

      {editingPct && (
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-3 space-y-3">
            <div>
              <Label className="text-xs">Off-band population (% of headcount below new band minimums)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={pctValue}
                  onChange={e => setPctValue(e.target.value)}
                  placeholder="e.g. 15"
                  className="h-8 w-24 text-sm"
                />
                <span className="text-sm text-muted-foreground">%</span>
                <span className="text-xs text-muted-foreground ml-2">Typically 10–30% for first-generation pay band design</span>
              </div>
            </div>
            <div>
              <Label className="text-xs">Additional note (optional)</Label>
              <Textarea
                value={noteValue}
                onChange={e => setNoteValue(e.target.value)}
                placeholder="e.g. Based on current pay data analysis from March 2025 audit"
                className="mt-1 h-16 text-sm resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={isSaving}
                onClick={() => {
                  const pct = pctValue ? parseFloat(pctValue) : undefined;
                  onSaveAssumptions(pct, noteValue || undefined);
                  setEditingPct(false);
                }}
              >
                {isSaving ? <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> : null}
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setEditingPct(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        {model.programmeFundingLines.map(line => (
          <div key={line.initiativeId} className="flex items-start justify-between px-4 py-3 border-b border-border/50 last:border-0">
            <div className="min-w-0 mr-4">
              <p className="text-sm font-medium">{line.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{line.note}</p>
            </div>
            <div className="text-right shrink-0">
              {line.estimatedLow != null && line.estimatedHigh != null ? (
                <p className="text-sm font-medium tabular-nums">
                  {fmtRange(line.estimatedLow, line.estimatedHigh)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">{line.sizingNote}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {programmeFundingNote && (
        <p className="text-xs text-muted-foreground italic">{programmeFundingNote}</p>
      )}
    </div>
  );
}

// ─── Value by category ────────────────────────────────────────────────────────

function ValueByCategory({
  model,
  scenario,
}: {
  model: BusinessCaseModel;
  scenario: Scenario;
}) {
  // Group by sub-domain
  const bySubDomain = model.lines.reduce<Record<string, { value: number; count: number }>>((acc, line) => {
    const v = scenario === "conservative" ? line.value3yrConservative
      : scenario === "optimistic" ? line.value3yrOptimistic
      : line.value3yrCentral;
    if (!acc[line.subDomain]) acc[line.subDomain] = { value: 0, count: 0 };
    acc[line.subDomain].value += v;
    acc[line.subDomain].count += 1;
    return acc;
  }, {});

  const sorted = Object.entries(bySubDomain).sort((a, b) => b[1].value - a[1].value);
  const maxValue = sorted[0]?.[1].value ?? 1;

  return (
    <div className="space-y-2">
      {sorted.map(([domain, { value, count }]) => (
        <div key={domain}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium">{domain}</span>
            <span className="text-muted-foreground tabular-nums">
              {fmt(value)} · {count} initiative{count !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-500"
              style={{ width: `${Math.round((value / maxValue) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Narrative section ────────────────────────────────────────────────────────

type NarrativeKey = "execSummary" | "investmentRationale" | "valueNarrative" | "riskAssumptions";

const NARRATIVE_META: Record<NarrativeKey, { label: string; description: string }> = {
  execSummary:         { label: "Executive Summary", description: "3yr headline numbers, programme scope, recommended scenario" },
  investmentRationale: { label: "Investment Rationale", description: "Why this programme, why now, link to strategic shifts" },
  valueNarrative:      { label: "Value Narrative", description: "What the numbers mean in practice — fairness, retention, compliance" },
  riskAssumptions:     { label: "Risk and Assumptions", description: "Honest about what could move the numbers, overlap discount, programme funding" },
};

type Affordance = "expand" | "refine" | "challenge" | "suggest";
const AFFORDANCES: { key: Affordance; label: string; tooltip: string }[] = [
  { key: "expand",    label: "Expand",    tooltip: "Add depth and supporting evidence" },
  { key: "refine",    label: "Refine",    tooltip: "Tighten language and sharpen argument" },
  { key: "challenge", label: "Challenge", tooltip: "Surface and acknowledge weak assumptions" },
  { key: "suggest",   label: "Suggest",   tooltip: "Alternative framing of the same section" },
];

function NarrativeSection({
  sectionKey,
  text,
  aiOriginal,
  onSave,
  onAffordance,
  isSavingSection,
  isAffordanceLoading,
}: {
  sectionKey: NarrativeKey;
  text: string | null;
  aiOriginal: string | null;
  onSave: (key: NarrativeKey, text: string) => void;
  onAffordance: (key: NarrativeKey, action: Affordance) => void;
  isSavingSection: boolean;
  isAffordanceLoading: boolean;
}) {
  const [localText, setLocalText] = useState(text ?? "");
  const [isDirty, setIsDirty] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meta = NARRATIVE_META[sectionKey];

  useEffect(() => {
    setLocalText(text ?? "");
    setIsDirty(false);
  }, [text]);

  const handleChange = (v: string) => {
    setLocalText(v);
    setIsDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onSave(sectionKey, v);
      setIsDirty(false);
    }, 1200);
  };

  const wordCount = countWords(localText);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold">{meta.label}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isDirty && <span className="text-xs text-muted-foreground">Saving…</span>}
            {!isDirty && localText && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <Textarea
          value={localText}
          onChange={e => handleChange(e.target.value)}
          placeholder={`Write the ${meta.label.toLowerCase()} here, or generate it with AI above…`}
          className="min-h-[140px] text-sm resize-y"
        />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <TooltipProvider>
              {AFFORDANCES.map(a => (
                <Tooltip key={a.key}>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={!localText || isAffordanceLoading}
                      onClick={() => onAffordance(sectionKey, a.key)}
                    >
                      {isAffordanceLoading ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : a.label}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{a.tooltip}</TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            {aiOriginal && aiOriginal !== localText && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => handleChange(aiOriginal)}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset to AI draft
              </Button>
            )}
            <span className="text-xs text-muted-foreground">{wordCount} words</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Override dialog ──────────────────────────────────────────────────────────

function OverrideDialog({
  initiativeId,
  model,
  onClose,
  onSave,
  isSaving,
}: {
  initiativeId: string | null;
  model: BusinessCaseModel;
  onClose: () => void;
  onSave: (id: string, fields: Record<string, number | string | undefined>) => void;
  isSaving: boolean;
}) {
  const line = model.lines.find(l => l.initiativeId === initiativeId);
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!line) return;
    setFields({
      year1Low:     line.effectiveYear1Low.toString(),
      year1High:    line.effectiveYear1High.toString(),
      ongoingLow:   line.effectiveOngoingLow.toString(),
      ongoingHigh:  line.effectiveOngoingHigh.toString(),
      valueLow:     line.effectiveValueLow.toString(),
      valueHigh:    line.effectiveValueHigh.toString(),
      overrideNote: line.overrideNote ?? "",
    });
  }, [line]);

  if (!line) return null;

  const handleSave = () => {
    const parsed: Record<string, number | string | undefined> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (k === "overrideNote") { parsed[k] = v || undefined; continue; }
      const n = parseFloat(v);
      if (!isNaN(n)) parsed[k] = n;
    }
    onSave(line.initiativeId, parsed);
  };

  return (
    <Dialog open={!!initiativeId} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Override figures — {line.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground">
            Model figures are shown as defaults. Edit any field to override. Leave blank to use the model value.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "year1Low",   label: "Year 1 Low (£)" },
              { key: "year1High",  label: "Year 1 High (£)" },
              { key: "ongoingLow", label: "Ongoing Low / yr (£)" },
              { key: "ongoingHigh",label: "Ongoing High / yr (£)" },
              { key: "valueLow",   label: "3yr Value Low (£)" },
              { key: "valueHigh",  label: "3yr Value High (£)" },
            ].map(({ key, label }) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number"
                  min={0}
                  value={fields[key] ?? ""}
                  onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))}
                  className="h-8 text-sm mt-1"
                />
              </div>
            ))}
          </div>
          <div>
            <Label className="text-xs">Override note (optional)</Label>
            <Textarea
              value={fields.overrideNote ?? ""}
              onChange={e => setFields(f => ({ ...f, overrideNote: e.target.value }))}
              placeholder="e.g. Vendor quote received March 2025"
              className="h-16 text-sm mt-1 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
            Save override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RewardBusinessCasePage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.rewardBusinessCase.getStatus.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const [activeScenario, setActiveScenario] = useState<Scenario>("central");
  const [overrideTarget, setOverrideTarget] = useState<string | null>(null);
  const [affordanceLoading, setAffordanceLoading] = useState<NarrativeKey | null>(null);

  // Sync scenario from DB recommendation
  useEffect(() => {
    if (data?.recommendedScenario) setActiveScenario(data.recommendedScenario);
  }, [data?.recommendedScenario]);

  const generateMutation = trpc.rewardBusinessCase.generateNarrative.useMutation({
    onSuccess: () => {
      utils.rewardBusinessCase.getStatus.invalidate();
      toast.success("Business case narrative generated");
    },
    onError: (e) => toast.error(e.message),
  });

  const affordanceMutation = trpc.rewardBusinessCase.affordance.useMutation({
    onSuccess: (result, vars) => {
      utils.rewardBusinessCase.getStatus.invalidate();
      setAffordanceLoading(null);
      toast.success(`${vars.section} updated`);
    },
    onError: (e) => {
      setAffordanceLoading(null);
      toast.error(e.message);
    },
  });

  const saveNarrativeMutation = trpc.rewardBusinessCase.saveNarrative.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const setOverrideMutation = trpc.rewardBusinessCase.setOverride.useMutation({
    onSuccess: () => {
      utils.rewardBusinessCase.getStatus.invalidate();
      setOverrideTarget(null);
      toast.success("Override saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const setAssumptionsMutation = trpc.rewardBusinessCase.setAssumptions.useMutation({
    onSuccess: () => {
      utils.rewardBusinessCase.getStatus.invalidate();
      toast.success("Assumptions saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const setScenarioMutation = trpc.rewardBusinessCase.setScenario.useMutation({
    onSuccess: () => utils.rewardBusinessCase.getStatus.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const confirmMutation = trpc.rewardBusinessCase.confirm.useMutation({
    onSuccess: () => {
      utils.rewardBusinessCase.getStatus.invalidate();
      toast.success("Business case confirmed");
    },
    onError: (e) => toast.error(e.message),
  });

  const keepAsIsMutation = trpc.rewardBusinessCase.keepAsIs.useMutation({
    onSuccess: () => utils.rewardBusinessCase.getStatus.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const handleScenarioChange = (s: Scenario) => {
    setActiveScenario(s);
    setScenarioMutation.mutate({ scenario: s });
  };

  const handleAffordance = (key: NarrativeKey, action: Affordance) => {
    const currentText = data?.narratives?.[key];
    if (!currentText) return;
    setAffordanceLoading(key);
    affordanceMutation.mutate({
      section: key,
      actionType: action,
      currentText,
    });
  };

  const handleSaveNarrative = useCallback((key: NarrativeKey, text: string) => {
    saveNarrativeMutation.mutate({ section: key, text });
  }, [saveNarrativeMutation]);

  const handleSaveOverride = (id: string, fields: Record<string, number | string | undefined>) => {
    setOverrideMutation.mutate({ initiativeId: id, ...fields } as Parameters<typeof setOverrideMutation.mutate>[0]);
  };

  const model = data?.model as BusinessCaseModel | undefined;
  const narratives = data?.narratives;
  const hasAllNarratives = !!(
    narratives?.execSummary &&
    narratives?.investmentRationale &&
    narratives?.valueNarrative &&
    narratives?.riskAssumptions
  );

  const isConfirmed = !!data?.isConfirmed;
  const isStale = !!data?.isStale;

  if (isLoading) {
    return (
      <SectionPageLayout
        sectionNumber="07"
        sectionLabel="Business Case"
        title="Business Case"
        accentColor="#8b5cf6"
        icon={<PoundSterling className="w-4 h-4 text-white" />}
      >
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </SectionPageLayout>
    );
  }

  if (!data?.canStart) {
    return (
      <SectionPageLayout
        sectionNumber="07"
        sectionLabel="Business Case"
        title="Business Case"
        accentColor="#8b5cf6"
        icon={<PoundSterling className="w-4 h-4 text-white" />}
        isLocked
      >
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <Lock className="h-4 w-4 text-amber-500" />
          <AlertDescription>
            {data?.blockedReason ?? "Complete Stage 5 (Portfolio) to unlock the Business Case."}
          </AlertDescription>
        </Alert>
      </SectionPageLayout>
    );
  }

  return (
    <SectionPageLayout
      sectionNumber="07"
      sectionLabel="Business Case"
      title="Business Case"
      accentColor="#8b5cf6"
      icon={<PoundSterling className="w-4 h-4 text-white" />}
      editedAfterClearing={isStale}
      upstreamStageLabel="Portfolio"
      stageProgress={{
        stageNumber: 7,
        title: "Business Case",
        description: "Review the financial model, adjust any figures, generate the narrative, then confirm to complete your Reward AI Strategy.",
        isCleared: isConfirmed,
        canConfirm: hasAllNarratives && !confirmMutation.isPending,
        isPending: confirmMutation.isPending,
        onConfirm: () => confirmMutation.mutate(),
        backRoute: "/strategy/reward-initiatives",
        nextRoute: "/strategy",
        nextLabel: "Strategy Summary",
      }}
    >
      <div className="space-y-8">

        {/* Staleness banner */}
        {isStale && (
          <Alert className="border-amber-500/40 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
              <span className="text-sm">
                Your portfolio has changed since you confirmed this business case. Review and re-confirm, or keep it as-is.
              </span>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => keepAsIsMutation.mutate()} disabled={keepAsIsMutation.isPending}>
                  Keep as-is
                </Button>
                <Button size="sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                  {generateMutation.isPending
                    ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Regenerating…</>
                    : "Regenerate"}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Scenario toggle + generate CTA */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold">Financial Model</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {model?.initiativeCount ?? 0} initiatives · {model?.portfolioSubDomains?.length ?? 0} sub-domains
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ScenarioToggle active={activeScenario} onChange={handleScenarioChange} />
            <Button
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending
                ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Generating…</>
                : <><Sparkles className="h-3.5 w-3.5 mr-1.5" />{hasAllNarratives ? "Regenerate narrative" : "Generate narrative"}</>}
            </Button>
          </div>
        </div>

        {/* Headline metrics */}
        {model && (
          <HeadlineMetrics rollup={model.rollup[activeScenario]} scenario={activeScenario} />
        )}

        {/* Investment table */}
        {model && model.lines.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Investment Breakdown</h3>
            <InvestmentTable
              model={model}
              scenario={activeScenario}
              onOverride={id => setOverrideTarget(id)}
            />
          </div>
        )}

        {/* Overlap discount */}
        {model && (
          <OverlapDiscountCallout model={model} scenario={activeScenario} />
        )}

        {/* Programme funding */}
        {model && (
          <ProgrammeFundingSection
            model={model}
            offBandPopulationPct={data?.programmeFundingAssumptions?.offBandPopulationPct}
            programmeFundingNote={data?.programmeFundingAssumptions?.programmeFundingNote}
            onSaveAssumptions={(pct, note) => setAssumptionsMutation.mutate({ offBandPopulationPct: pct, programmeFundingNote: note })}
            isSaving={setAssumptionsMutation.isPending}
          />
        )}

        {/* Value by category */}
        {model && model.lines.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Value by Sub-domain</h3>
            <Card className="border-border/60">
              <CardContent className="pt-4 pb-3">
                <ValueByCategory model={model} scenario={activeScenario} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Narrative sections */}
        {(model || hasAllNarratives) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Narrative Sections</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI-drafted from your financial model. Edit directly or use the affordance buttons.
                </p>
              </div>
              {!hasAllNarratives && !generateMutation.isPending && (
                <Alert className="border-blue-500/30 bg-blue-500/5 py-2 px-3 max-w-xs">
                  <Info className="h-3.5 w-3.5 text-blue-500" />
                  <AlertDescription className="text-xs">
                    Click "Generate narrative" above to populate all four sections.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {(["execSummary", "investmentRationale", "valueNarrative", "riskAssumptions"] as NarrativeKey[]).map(key => (
              <NarrativeSection
                key={key}
                sectionKey={key}
                text={narratives?.[key] ?? null}
                aiOriginal={null}
                onSave={handleSaveNarrative}
                onAffordance={handleAffordance}
                isSavingSection={saveNarrativeMutation.isPending}
                isAffordanceLoading={affordanceLoading === key && affordanceMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Confirm gate */}
        {hasAllNarratives && !isConfirmed && (
          <Alert className="border-emerald-500/30 bg-emerald-500/5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <span className="text-sm">All four narrative sections are complete. Confirm to finalise your Business Case.</span>
              <Button
                size="sm"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
              >
                {confirmMutation.isPending
                  ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Confirming…</>
                  : <>Confirm Business Case <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></>}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isConfirmed && (
          <Alert className="border-emerald-500/40 bg-emerald-500/5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <AlertDescription className="text-sm">
              Business case confirmed. Your Reward AI Strategy is complete.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Override dialog */}
      {model && (
        <OverrideDialog
          initiativeId={overrideTarget}
          model={model}
          onClose={() => setOverrideTarget(null)}
          onSave={handleSaveOverride}
          isSaving={setOverrideMutation.isPending}
        />
      )}
    </SectionPageLayout>
  );
}
