/**
 * StrategyValuePage — /strategy/value
 * Section 05: What this strategy is worth
 *
 * 11 blocks per brief:
 *  1. Hero arithmetic strip + 3 primary value cards
 *  2. Permanent caveat banner
 *  3. Value summary 3-year horizon bar chart
 *  4. Value by initiative horizontal bar chart
 *  5. Per-initiative table + drill-down modal (6 sections)
 *  6. Three-tier analysis + reconciliation line
 *  7. Interactive DCF financial model (adjustable rate)
 *  8. Three-scenario analysis (stressed conservative)
 *  9. Qualitative highlights (collapsed default)
 * 10. Future reinvestment guidance
 * 11. CEO sponsorship recommendation (conditional)
 */
import React, { useState, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SectionPageLayout from "@/components/SectionPageLayout";
import {
  TrendingUp,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Users,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { formatGbp as fmt, formatGbpRange as fmtRange } from "@/lib/format";

// ─── Helpers ───────────────────────────────────────────────────────────────────────────────

function fmtMonths(m: { low: number; high: number } | null | undefined): string {
  if (!m) return "N/A";
  const lo = m.low <= 1 ? "<1 month" : `${m.low} months`;
  const hi = m.high <= 1 ? "<1 month" : `${m.high} months`;
  if (lo === hi) return lo;
  return `${lo}–${hi}`;
}

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

function BlockError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
      <p className="text-sm text-red-400">{message}</p>
    </div>
  );
}

function BlockHeading({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</h2>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// Value type colour map
const VALUE_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  cost_savings:      { label: "Cost savings",      color: "#4ADE80", bg: "#4ADE8020" },
  productivity_gain: { label: "Productivity gain", color: "#60A5FA", bg: "#60A5FA20" },
  risk_avoidance:    { label: "Risk avoidance",    color: "#F87171", bg: "#F8717120" },
  capability_uplift: { label: "Capability uplift", color: "#A78BFA", bg: "#A78BFA20" },
  strategic:         { label: "Strategic",         color: "#FBBF24", bg: "#FBBF2420" },
};

function ValueTypeBadge({ type }: { type: string }) {
  const cfg = VALUE_TYPE_CONFIG[type] ?? { label: type.replace(/_/g, " "), color: "#94A3B8", bg: "#94A3B820" };
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

// Confidence badge
const CONFIDENCE_CONFIG: Record<string, { label: string; color: string }> = {
  high:   { label: "High",   color: "#4ADE80" },
  medium: { label: "Medium", color: "#FBBF24" },
  low:    { label: "Low",    color: "#F87171" },
};

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const cfg = CONFIDENCE_CONFIG[confidence?.toLowerCase()] ?? { label: confidence, color: "#94A3B8" };
  return (
    <span className="text-[10px] font-medium" style={{ color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ─── Scenario assumption deltas (per brief spec) ──────────────────────────────

const SCENARIO_ASSUMPTIONS = {
  pessimistic: [
    "Implementation delay: +6 months",
    "Productivity gains: 50% of optimistic",
    "Adoption rate: 60%",
    "Higher vendor costs: top of cost range",
  ],
  base: [
    "On-time delivery",
    "Productivity gains at midpoint",
    "Adoption rate: 80%",
    "Cost at midpoint",
  ],
  optimistic: [
    "All capability gains realised",
    "Productivity gains at top of range",
    "Adoption rate: 100%",
    "Cost at bottom of range",
  ],
};

// ─── Type alias for initiative item ──────────────────────────────────────────

type InitiativeItem = {
  initiative_id: string;
  display_name: string;
  value_type: string;
  quantified_value_gbp: { low: number; high: number } | null;
  qualitative_value: string[];
  monetisation_breakdown: string;
  sources: string[];
  uses_sector_default: boolean;
  confidence: string;
  payback_months: { low: number; high: number } | null;
};

// ─── Per-initiative drill-down modal ─────────────────────────────────────────

function InitiativeModal({ item, open, onClose }: { item: InitiativeItem; open: boolean; onClose: () => void }) {
  const qv = item.quantified_value_gbp;

  const sensitivityRows = qv
    ? [
        { assumption: "Productivity / efficiency improvement %", minus: fmt(qv.low * -0.2) + " to " + fmt(qv.high * -0.2), plus: "+" + fmt(qv.low * 0.2) + " to +" + fmt(qv.high * 0.2) },
        { assumption: "Adoption rate",                           minus: fmt(qv.low * -0.2) + " to " + fmt(qv.high * -0.2), plus: "+" + fmt(qv.low * 0.2) + " to +" + fmt(qv.high * 0.2) },
        { assumption: "Fully-loaded HR cost rate",               minus: fmt(qv.low * -0.2) + " to " + fmt(qv.high * -0.2), plus: "+" + fmt(qv.low * 0.2) + " to +" + fmt(qv.high * 0.2) },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0F1117] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground">{item.display_name}</DialogTitle>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <ValueTypeBadge type={item.value_type} />
            {qv && <span className="text-xs text-emerald-400 font-medium">{fmtRange(qv.low, qv.high)}</span>}
            <span className="text-[10px] text-muted-foreground">Confidence: <ConfidenceBadge confidence={item.confidence} /></span>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Section 2: Methodology */}
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Methodology</h3>
            {qv ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Value is estimated by applying a sector-benchmarked improvement percentage to your operational baseline.
                The formula is: <span className="font-mono text-xs text-foreground/80">{item.monetisation_breakdown}</span>.
                The improvement range ({VALUE_TYPE_CONFIG[item.value_type]?.label ?? item.value_type}) is sourced from the named studies below.
                {item.uses_sector_default && " Sector default values are used where your operational baseline was not provided — confirm with Finance."}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                This initiative produces qualitative value only. Monetisation is not modelled because the value pathway is indirect, context-dependent, or requires ex-post measurement to quantify reliably.
              </p>
            )}
          </div>

          {/* Section 3: Bottom-up calculation */}
          {qv && (
            <div>
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Bottom-up calculation</h3>
              <div className="rounded-lg border border-white/8 bg-white/2 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Step</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium">Low</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium">High</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5">
                      <td className="px-3 py-2 text-foreground/80">Improvement formula</td>
                      <td className="px-3 py-2 text-right text-muted-foreground" colSpan={2}>{item.monetisation_breakdown}</td>
                    </tr>
                    <tr className="border-b border-white/5 bg-white/2">
                      <td className="px-3 py-2 font-semibold text-foreground">3-year value (annual × 3)</td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-400">{fmt(qv.low * 3)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-400">{fmt(qv.high * 3)}</td>
                    </tr>
                    {item.payback_months && (
                      <tr>
                        <td className="px-3 py-2 text-muted-foreground">Payback period</td>
                        <td className="px-3 py-2 text-right text-muted-foreground" colSpan={2}>{fmtMonths(item.payback_months)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 4: Key assumptions */}
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Key assumptions</h3>
            <ul className="space-y-1.5">
              {item.sources.length > 0 ? item.sources.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                  Improvement benchmarks sourced from: <span className="text-foreground/80 font-medium">{s}</span>
                </li>
              )) : (
                <li className="text-xs text-muted-foreground italic">No named sources available for this initiative.</li>
              )}
              {item.uses_sector_default && (
                <li className="flex items-start gap-2 text-xs text-amber-400">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  Sector default values used — confirm operational baseline with Finance for accuracy.
                </li>
              )}
            </ul>
          </div>

          {/* Section 5: Sensitivity table */}
          {qv && sensitivityRows.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Sensitivity (±20% on key assumptions)</h3>
              <div className="rounded-lg border border-white/8 bg-white/2 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Assumption</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium">−20% impact</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium">+20% impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivityRows.map((row, i) => (
                      <tr key={i} className={i < sensitivityRows.length - 1 ? "border-b border-white/5" : ""}>
                        <td className="px-3 py-2 text-foreground/80">{row.assumption}</td>
                        <td className="px-3 py-2 text-right text-red-400">{row.minus}</td>
                        <td className="px-3 py-2 text-right text-emerald-400">{row.plus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 6: Named sources */}
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Named sources</h3>
            {item.sources.length > 0 ? (
              <ul className="space-y-1">
                {item.sources.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <BookOpen className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">No named sources available. Confirm with Finance before commitment.</p>
            )}
          </div>

          {/* Qualitative value */}
          {item.qualitative_value?.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Qualitative outcomes</h3>
              <ul className="space-y-1">
                {item.qualitative_value.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Sparkles className="w-3 h-3 text-violet-400 mt-0.5 shrink-0" />
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Value summary bar chart ──────────────────────────────────────────────────

function ValueSummaryChart({ gross, cost, net }: {
  gross: { low: number; high: number };
  cost:  { low: number; high: number };
  net:   { low: number; high: number };
}) {
  const [hovered, setHovered] = useState<"gross" | "cost" | "net" | null>(null);
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
          <div
            key={bar.key}
            className="flex-1 flex flex-col items-center gap-1.5"
            onMouseEnter={() => setHovered(bar.key)}
            onMouseLeave={() => setHovered(null)}
            aria-label={`${bar.label}: ${fmtRange(bar.low, bar.high)}`}
          >
            <div className="text-xs font-medium" style={{ color: bar.color }}>
              {isHov ? fmt(bar.low) : fmt(bar.high)}
            </div>
            <div className="w-full flex items-end" style={{ height: "80px" }}>
              <div
                className="w-full rounded-t-lg transition-all duration-300 cursor-pointer"
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

// ─── Initiative horizontal bar chart ─────────────────────────────────────────

function InitiativeBarChart({ items, onSelect }: { items: InitiativeItem[]; onSelect: (item: InitiativeItem) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const maxVal = Math.max(...items.map(i => i.quantified_value_gbp?.high ?? 0));

  return (
    <div className="space-y-2">
      {items.map(item => {
        const qv = item.quantified_value_gbp;
        const cfg = VALUE_TYPE_CONFIG[item.value_type] ?? { color: "#94A3B8", bg: "#94A3B820" };
        const widthPct = qv && maxVal > 0 ? (qv.high / maxVal) * 100 : 0;
        const isHov = hovered === item.initiative_id;
        return (
          <div
            key={item.initiative_id}
            className="flex items-center gap-3 cursor-pointer group"
            onMouseEnter={() => setHovered(item.initiative_id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelect(item)}
            role="button"
            aria-label={`${item.display_name}: ${qv ? fmtRange(qv.low, qv.high) : "Qualitative"}`}
          >
            <div className="w-36 shrink-0 text-[11px] text-foreground/80 truncate group-hover:text-foreground transition-colors">
              {item.display_name}
            </div>
            <div className="flex-1 relative h-5 flex items-center">
              {qv ? (
                <>
                  <div
                    className="h-4 rounded-r-sm transition-all duration-200"
                    style={{ width: `${widthPct}%`, background: cfg.color, opacity: isHov ? 0.7 : 0.85, minWidth: "4px" }}
                  />
                  <span className="ml-2 text-[10px] shrink-0" style={{ color: cfg.color }}>
                    {isHov ? fmt(qv.low) : fmt(qv.high)}
                  </span>
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground italic ml-1">Qualitative</span>
              )}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-3 pt-2 mt-1 border-t border-white/8">
        {Object.entries(VALUE_TYPE_CONFIG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="w-2 h-2 rounded-full" style={{ background: v.color }} />
            {v.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Scenario card ────────────────────────────────────────────────────────────

function ScenarioCard({ label, color, bg, border, assumptions, cost, value, net, roi, highlighted }: {
  label: string; color: string; bg: string; border: string;
  assumptions: string[]; cost: number; value: number; net: number; roi: number; highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 flex flex-col gap-3 ${highlighted ? "shadow-sm" : ""}`}
      style={{ background: bg, borderColor: border }}
    >
      <div className="text-xs font-bold" style={{ color }}>{label}</div>
      <div>
        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Assumptions</div>
        <ul className="space-y-1">
          {assumptions.map((a, i) => (
            <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
              <span className="mt-0.5 shrink-0" style={{ color }}>•</span>{a}
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-1.5 border-t border-white/8 pt-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Cost</span>
          <span className="font-medium text-foreground">{fmt(cost)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Value</span>
          <span className="font-medium text-foreground">{fmt(value)}</span>
        </div>
        <div className="flex justify-between text-xs border-t border-white/8 pt-1.5">
          <span className="text-muted-foreground">Net</span>
          <span className="font-semibold" style={{ color }}>{fmt(net)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">ROI</span>
          <span className="font-semibold" style={{ color }}>
            {roi >= 500 ? ">500%" : `${roi}%`}
            {roi >= 500 && <span className="text-[9px] text-muted-foreground ml-1">(capped)</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StrategyValuePage() {
  const [, navigate] = useLocation();

  // DCF rate state — session-scoped, not persisted
  const [discountRate, setDiscountRate] = useState(8.0);
  const [rateInput, setRateInput] = useState("8.0");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // UI state
  const [perInitCollapsed, setPerInitCollapsed] = useState(true);
  const [qualCollapsed, setQualCollapsed] = useState(true);
  const [selectedInitiative, setSelectedInitiative] = useState<InitiativeItem | null>(null);

  // Queries
  const assessmentQ = trpc.intelligence.getStrategyAssessment.useQuery();
  const assessment  = assessmentQ.data;

  const valueEnvQ = trpc.intelligence.calculateValueEnvelope.useQuery(
    {
      selectedInitiativeIds: assessment?.selectedInitiativeIds ?? [],
      operationalBaseline:   assessment?.operationalBaseline ?? {},
      planHorizonMonths:     (assessment as any)?.planHorizonMonths ?? 36,
      solutionDeliveryConfidence: (assessment as any)?.structuredInputs?.solution_delivery_confidence ?? undefined,
      discountRate: discountRate / 100,
    },
    { enabled: (assessment?.selectedInitiativeIds?.length ?? 0) > 0 }
  );
  const ve = valueEnvQ.data as any;

  // NPV at 15% for sensitivity hint
  const ve15Q = trpc.intelligence.calculateValueEnvelope.useQuery(
    {
      selectedInitiativeIds: assessment?.selectedInitiativeIds ?? [],
      operationalBaseline:   assessment?.operationalBaseline ?? {},
      planHorizonMonths:     (assessment as any)?.planHorizonMonths ?? 36,
      discountRate: 0.15,
    },
    { enabled: (assessment?.selectedInitiativeIds?.length ?? 0) > 0 && discountRate !== 15 }
  );
  const ve15 = ve15Q.data as any;

  // Debounced discount rate update
  const handleRateChange = useCallback((raw: string) => {
    setRateInput(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 2 && parsed <= 20) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setDiscountRate(parsed), 300);
    }
  }, []);

  const resetRate = useCallback(() => {
    setDiscountRate(8.0);
    setRateInput("8.0");
  }, []);

  // Sorted by-initiative list
  const sortedByInit = useMemo((): InitiativeItem[] => {
    if (!ve?.by_initiative) return [];
    return [...ve.by_initiative].sort((a: InitiativeItem, b: InitiativeItem) => {
      const aVal = a.quantified_value_gbp?.high ?? 0;
      const bVal = b.quantified_value_gbp?.high ?? 0;
      return bVal - aVal;
    });
  }, [ve?.by_initiative]);

  const qualOnlyCount = useMemo(() => sortedByInit.filter(i => !i.quantified_value_gbp).length, [sortedByInit]);

  // Three-tier reconciliation
  const tierSum = useMemo(() => {
    if (!ve?.tiered_value) return null;
    const { efficiency, effectiveness, strategic } = ve.tiered_value;
    return {
      low:  efficiency.low  + effectiveness.low  + strategic.low,
      high: efficiency.high + effectiveness.high + strategic.high,
    };
  }, [ve?.tiered_value]);

  const isLoading  = assessmentQ.isLoading;
  const hasStrategy = !isLoading && (assessment?.selectedInitiativeIds?.length ?? 0) > 0;
  const noStrategy  = !isLoading && (assessment?.selectedInitiativeIds?.length ?? 0) === 0;

  return (
    <SectionPageLayout
      sectionNumber="05"
      sectionLabel="Value"
      title="What this strategy is worth"
      accentColor="#4ADE80"
      icon={<TrendingUp className="w-5 h-5" />}
    >
      {/* ── Loading ──────────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <BlockSkeleton key={i} lines={4} />)}
        </div>
      )}

      {/* ── No strategy ──────────────────────────────────────────────────────── */}
      {noStrategy && (
        <div className="rounded-xl border border-white/8 bg-white/2 p-8 text-center">
          <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Generate your strategy to see its value.</p>
          <Button size="sm" variant="outline" className="text-xs border-white/15" onClick={() => navigate("/strategy/diagnostic")}>
            Build your strategy <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      {hasStrategy && (
        <>
          {/* ── Block 1: Hero arithmetic strip ───────────────────────────────── */}
          {valueEnvQ.isLoading ? (
            <BlockSkeleton lines={4} />
          ) : valueEnvQ.isError ? (
            <BlockError message="Value model unavailable. Refresh to retry." />
          ) : ve ? (
            <div className="rounded-xl border border-white/8 bg-white/2 p-5 mb-4">
              {/* Arithmetic strip */}
              <div
                className="flex flex-wrap items-center justify-center gap-3 mb-5 py-3 px-4 rounded-lg bg-white/3 border border-white/6"
                aria-label={`Gross value ${fmtRange(ve.total_quantified_value_gbp.low, ve.total_quantified_value_gbp.high)}, minus TCO ${fmtRange(ve.tco.total_3yr_gbp.low, ve.tco.total_3yr_gbp.high)}, equals net value ${fmtRange(ve.net_value_gbp.low, ve.net_value_gbp.high)}`}
              >
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Gross value</div>
                  <div className="text-lg font-bold text-emerald-400">{fmtRange(ve.total_quantified_value_gbp.low, ve.total_quantified_value_gbp.high)}</div>
                </div>
                <div className="text-xl font-light text-muted-foreground px-1">−</div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">TCO</div>
                  <div className="text-lg font-bold text-red-400">{fmtRange(ve.tco.total_3yr_gbp.low, ve.tco.total_3yr_gbp.high)}</div>
                  <button
                    className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5 mx-auto mt-0.5"
                    onClick={() => navigate("/strategy/investment-risk")}
                  >
                    from Investment &amp; Risk <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>
                <div className="text-xl font-light text-muted-foreground px-1">=</div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Net value</div>
                  <div className="text-lg font-bold text-blue-400">{fmtRange(ve.net_value_gbp.low, ve.net_value_gbp.high)}</div>
                </div>
              </div>

              {/* 3 primary value cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/8 p-4 relative">
                  <div className="absolute top-2 right-2">
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Primary metric</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Net value</div>
                  <div className="text-2xl font-bold text-emerald-400">{fmtRange(ve.net_value_gbp.low, ve.net_value_gbp.high)}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">over 3 years</div>
                </div>
                <div className="rounded-lg border border-blue-500/25 bg-blue-500/6 p-4">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Payback period</div>
                  <div className="text-2xl font-bold text-blue-400">{fmtMonths(ve.payback_period_months)}</div>
                  <div className="text-[11px] text-blue-300/70 mt-1">Unusually fast — verify with Finance</div>
                </div>
                <div className="rounded-lg border border-violet-500/25 bg-violet-500/6 p-4">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Qualitative outcomes</div>
                  <div className="text-2xl font-bold text-violet-400">{qualOnlyCount}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">non-monetised, see breakdown below</div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                Indicative ranges from cited sources. Confirm with Finance before commitment.
              </p>
            </div>
          ) : null}

          {/* ── Block 2: Permanent caveat banner ─────────────────────────────── */}
          {ve && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 p-4 flex items-start gap-3 mb-4">
              <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-200/80 leading-relaxed">{ve.caveat}</p>
            </div>
          )}

          {/* ── Block 3: Value summary bar chart ─────────────────────────────── */}
          {valueEnvQ.isLoading ? (
            <BlockSkeleton lines={5} />
          ) : ve ? (
            <div className="rounded-xl border border-white/8 bg-white/2 p-5 mb-4">
              <BlockHeading label="Value summary · 3-year horizon" sub="Bar height shows high estimate. Hover or tap a bar for the low estimate." />
              <ValueSummaryChart
                gross={ve.total_quantified_value_gbp}
                cost={ve.tco.total_3yr_gbp}
                net={ve.net_value_gbp}
              />
            </div>
          ) : null}

          {/* ── Block 4: Value by initiative horizontal bar chart ────────────── */}
          {ve && sortedByInit.length > 0 && (
            <div className="rounded-xl border border-white/8 bg-white/2 p-5 mb-4">
              <BlockHeading label="Value by initiative · high estimate" sub="Hover any bar for the low estimate. Click to open detail." />
              <InitiativeBarChart items={sortedByInit} onSelect={setSelectedInitiative} />
            </div>
          )}

          {/* ── Block 5: Per-initiative table ────────────────────────────────── */}
          {ve && sortedByInit.length > 0 && (
            <div className="rounded-xl border border-white/8 bg-white/2 mb-4 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors"
                onClick={() => setPerInitCollapsed(c => !c)}
                aria-expanded={!perInitCollapsed}
              >
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Per-initiative value breakdown</span>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{perInitCollapsed ? `See ${sortedByInit.length} initiatives` : "Hide"}</span>
                  {perInitCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </div>
              </button>
              {!perInitCollapsed && (
                <div className="animate-in slide-in-from-top-2 duration-200 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-t border-b border-white/8 bg-white/3">
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Initiative</th>
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Value type</th>
                        <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Value range</th>
                        <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedByInit.map((item, i) => (
                        <tr
                          key={item.initiative_id}
                          className={`border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors ${i === sortedByInit.length - 1 ? "border-b-0" : ""}`}
                          onClick={() => setSelectedInitiative(item)}
                        >
                          <td className="px-4 py-3 font-medium text-foreground/90">{item.display_name}</td>
                          <td className="px-4 py-3"><ValueTypeBadge type={item.value_type} /></td>
                          <td className="px-4 py-3 text-right">
                            {item.quantified_value_gbp ? (
                              <span className="text-emerald-400 font-medium">{fmtRange(item.quantified_value_gbp.low, item.quantified_value_gbp.high)}</span>
                            ) : (
                              <span className="text-muted-foreground italic">Qualitative</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right"><ConfidenceBadge confidence={item.confidence} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Block 6: Three-tier analysis ─────────────────────────────────── */}
          {ve?.tiered_value && (
            <div className="rounded-xl border border-white/8 bg-white/2 p-5 mb-4">
              <BlockHeading label="Three-tier value analysis · strategic narrative for board" />
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/6 border border-emerald-500/15">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-foreground">Efficiency</div>
                      <div className="text-[11px] text-muted-foreground">Time savings, cost reduction, headcount avoidance</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-emerald-400 shrink-0">{fmtRange(ve.tiered_value.efficiency.low, ve.tiered_value.efficiency.high)}</div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/6 border border-blue-500/15">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-foreground">Effectiveness</div>
                      <div className="text-[11px] text-muted-foreground">Quality of hire, attrition reduction, engagement</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-blue-400 shrink-0">{fmtRange(ve.tiered_value.effectiveness.low, ve.tiered_value.effectiveness.high)}</div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-violet-500/6 border border-violet-500/15">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-violet-400 shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-foreground">Strategic</div>
                      <div className="text-[11px] text-muted-foreground">Risk avoidance, capability uplift, compliance</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-violet-400 shrink-0">{fmtRange(ve.tiered_value.strategic.low, ve.tiered_value.strategic.high)}</div>
                </div>
              </div>
              {/* Reconciliation line */}
              {tierSum && (
                <div className="rounded-lg border border-white/8 bg-white/3 p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Three-tier sum</span>
                    <span className="font-medium text-foreground">{fmtRange(tierSum.low, tierSum.high)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Net value (above)</span>
                    <span className="font-medium text-foreground">{fmtRange(ve.net_value_gbp.low, ve.net_value_gbp.high)}</span>
                  </div>
                  <div className="border-t border-white/8 pt-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">Difference</span>
                    <span className="font-medium text-amber-400">{fmtRange(Math.abs(ve.net_value_gbp.low - tierSum.low), Math.abs(ve.net_value_gbp.high - tierSum.high))}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
                    The three-tier view is a narrative frame for board presentation. The difference reflects overlapping value across initiatives and qualitative outcomes monetised in the per-initiative breakdown but not categorised in the three-tier frame.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Block 7: Interactive DCF financial model ──────────────────────── */}
          {ve?.financial_model && (
            <div className="rounded-xl border border-white/8 bg-white/2 p-5 mb-4">
              <BlockHeading label="Financial model · 3-year DCF" />
              {/* Discount rate input */}
              <div className="flex flex-wrap items-end gap-4 mb-4 p-3 rounded-lg bg-white/3 border border-white/8">
                <div className="flex-1 min-w-[160px]">
                  <label htmlFor="discount-rate" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                    Discount rate
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="discount-rate"
                      type="number"
                      min={2}
                      max={20}
                      step={0.5}
                      value={rateInput}
                      onChange={e => handleRateChange(e.target.value)}
                      className="w-20 bg-white/5 border border-white/15 rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:border-blue-400"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    {discountRate !== 8.0 && (
                      <button
                        onClick={resetRate}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset to default
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Platform default 8.0% — adjust to your WACC for organisational accuracy
                  </p>
                </div>
              </div>
              {/* NPV + Payback tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/6 p-4">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">NPV at {discountRate.toFixed(1)}%</div>
                  <div className="text-xl font-bold text-blue-400" aria-live="polite">
                    {fmtRange(ve.financial_model.npv_gbp.low, ve.financial_model.npv_gbp.high)}
                  </div>
                  {ve15 && discountRate !== 15 && (
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      At 15% discount: <span className="text-foreground/70">{fmtRange(ve15.financial_model.npv_gbp.low, ve15.financial_model.npv_gbp.high)}</span>
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-white/10 bg-white/3 p-4">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Payback period</div>
                  <div className="text-xl font-bold text-foreground">{fmtMonths(ve.payback_period_months)}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">IRR suppressed — use NPV &amp; payback</div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mb-4">
                DCF model discounts projected annual cashflows over 3 years. NPV &gt; 0 indicates the strategy creates value above the cost of capital.
              </p>
              {/* IRR suppression warning */}
              {ve.financial_model.irr_suppressed && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 p-3 flex items-start gap-2" role="alert">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-amber-400 mb-0.5">IRR not shown</div>
                    <p className="text-[11px] text-amber-200/70 leading-relaxed">
                      IRR is unreliable at this investment scale. When annual value significantly exceeds implementation cost, IRR becomes mathematically extreme and loses meaning as a decision metric. Use NPV and payback period as the primary financial metrics for board presentation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Block 8: Three-scenario analysis ─────────────────────────────── */}
          {ve?.scenario_analysis && (
            <div className="rounded-xl border border-white/8 bg-white/2 p-5 mb-4">
              <BlockHeading label="Three-scenario analysis · range of plausible outcomes" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <ScenarioCard
                  label="Conservative"
                  color="#F87171" bg="#F8717110" border="#F8717130"
                  assumptions={SCENARIO_ASSUMPTIONS.pessimistic}
                  cost={ve.tco.total_3yr_gbp.high}
                  value={ve.scenario_analysis.pessimistic.value_gbp}
                  net={ve.scenario_analysis.pessimistic.net_gbp}
                  roi={ve.scenario_analysis.pessimistic.roi_pct}
                />
                <ScenarioCard
                  label="Base"
                  color="#60A5FA" bg="#60A5FA10" border="#60A5FA30"
                  assumptions={SCENARIO_ASSUMPTIONS.base}
                  cost={(ve.tco.total_3yr_gbp.low + ve.tco.total_3yr_gbp.high) / 2}
                  value={ve.scenario_analysis.base.value_gbp}
                  net={ve.scenario_analysis.base.net_gbp}
                  roi={ve.scenario_analysis.base.roi_pct}
                  highlighted
                />
                <ScenarioCard
                  label="Optimistic"
                  color="#4ADE80" bg="#4ADE8010" border="#4ADE8030"
                  assumptions={SCENARIO_ASSUMPTIONS.optimistic}
                  cost={ve.tco.total_3yr_gbp.low}
                  value={ve.scenario_analysis.optimistic.value_gbp}
                  net={ve.scenario_analysis.optimistic.net_gbp}
                  roi={ve.scenario_analysis.optimistic.roi_pct}
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Conservative case stresses key assumptions to model credible downside. Base case represents expected delivery. Optimistic case assumes ideal conditions. Use Conservative as the floor for go/no-go decisions.
              </p>
            </div>
          )}

          {/* ── Block 9: Qualitative highlights ──────────────────────────────── */}
          {ve?.qualitative_summary?.bullet_points?.length > 0 && (
            <div className="rounded-xl border border-white/8 bg-white/2 mb-4 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors"
                onClick={() => setQualCollapsed(c => !c)}
                aria-expanded={!qualCollapsed}
              >
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Qualitative value highlights</span>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{qualCollapsed ? `See ${ve.qualitative_summary.bullet_points.length} outcomes` : "Hide"}</span>
                  {qualCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </div>
              </button>
              {!qualCollapsed && (
                <div className="px-5 pb-4 animate-in slide-in-from-top-2 duration-200">
                  <ul className="space-y-2">
                    {ve.qualitative_summary.bullet_points.map((b: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm text-foreground/90">{b}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Why not monetised? Value is indirect, context-dependent, or requires ex-post measurement to quantify reliably at the strategy stage.
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ── Block 10: Future reinvestment guidance ────────────────────────── */}
          {ve?.reinvestment_plan && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full uppercase tracking-wide">Forward-looking guidance</span>
              </div>
              {/* Explicit don't-commit framing */}
              <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/8 p-3 mb-3">
                <p className="text-xs text-emerald-200/80 leading-relaxed italic">
                  "This is forward-looking guidance for when value is being realised. Don't commit reinvestment capital until your strategy has shown evidence of delivery against forecast — typically 12 months into execution with quantified value tracked."
                </p>
              </div>
              <h2 className="text-sm font-semibold text-foreground mb-1">{ve.reinvestment_plan.headline}</h2>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{ve.reinvestment_plan.narrative}</p>
              {ve.reinvestment_plan.suggested_reinvestment_gbp && (
                <div className="text-sm font-medium text-emerald-400 mb-3">
                  Future reinvestment guide: {fmt(ve.reinvestment_plan.suggested_reinvestment_gbp)}
                </div>
              )}
              {ve.reinvestment_plan.phase2_focus_areas?.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Phase 2 focus areas</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ve.reinvestment_plan.phase2_focus_areas.map((a: string, i: number) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/15">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Block 11: CEO sponsorship recommendation (conditional) ─────────── */}
          {ve?.ceo_sponsorship_required && ve.ceo_sponsorship && (
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/6 p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-bold text-violet-400 bg-violet-500/15 px-2 py-0.5 rounded-full uppercase tracking-wide">Sponsorship</span>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-sm font-semibold text-foreground mb-1">CEO sponsorship recommended</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">{ve.ceo_sponsorship.rationale}</p>
                  <div className="rounded-lg border border-violet-500/15 bg-violet-500/8 p-3">
                    <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">Recommended action</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{ve.ceo_sponsorship.suggested_framing}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Next step footer ──────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/8 bg-white/2 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Next step</p>
              <p className="text-sm text-foreground">Set up your measurement plan and review cadence.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 border-white/15 hover:border-white/30"
              onClick={() => navigate("/strategy/measurement")}
            >
              View measurement plan <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </>
      )}

      {/* ── Per-initiative drill-down modal ──────────────────────────────────── */}
      {selectedInitiative && (
        <InitiativeModal
          item={selectedInitiative}
          open={!!selectedInitiative}
          onClose={() => setSelectedInitiative(null)}
        />
      )}
    </SectionPageLayout>
  );
}
