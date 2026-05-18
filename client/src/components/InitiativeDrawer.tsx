/**
 * InitiativeDrawer — right-side detail panel for a single initiative.
 * Sections A–G per the Initiatives Display Build Brief.
 *
 * Props:
 *   initiative  — enriched row from intelligence.getStrategyInitiatives
 *   allInPlan   — all initiatives in the current plan (for Prev/Next navigation)
 *   open        — controlled open state
 *   onClose     — close handler
 *   onRemove    — remove from plan handler
 *   onAdd       — add to plan handler (for library view usage)
 *   isInPlan    — whether this initiative is currently in the plan
 */
import React, { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Shield, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Building2, Link2, ArrowRight, Info, Star,
} from "lucide-react";
import { INITIATIVE_LIBRARY } from "../../../shared/initiativeLibrary";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DrawerInitiative = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  fitStatus?: string | null;
  fitScore?: number | null;
  fitRationale?: string | null;
  valueRange?: { low: number; high: number; currency: string } | null;
  valueNarrative?: string | null;
  isIndicative?: boolean;
  confidence?: string | null;
  timeToValueMonths?: { min: number; max: number } | null;
  caseStudyAnchor?: string | null;
  riskFlags?: string[];
  hardGateFailReasons?: string[];
  scoredFactors?: Array<{ key: string; label: string; score: number; maxScore: number }>;
  hardGatesPassed?: string[];
  y1CostRange?: { low: number; high: number } | null;
  // mutable state
  status?: string;
  targetQuarter?: string | null;
  notes?: string | null;
  owner?: string | null;
  acceptanceReason?: string | null;
  principleAlignment?: {
    ranking: "aligned" | "neutral" | "violates";
    score: number;
    rationale?: string | null;
    alignedPrinciples?: string[];
    violatedPrinciples?: string[];
  } | null;
};

interface InitiativeDrawerProps {
  initiative: DrawerInitiative | null;
  allInPlan?: DrawerInitiative[];
  open: boolean;
  onClose: () => void;
  onRemove?: (id: string) => void;
  onAdd?: (id: string) => void;
  isInPlan?: boolean;
  onNavigate?: (id: string) => void;
  onUpdateOwner?: (id: string, owner: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLOURS: Record<string, string> = {
  talent_acquisition:        "#60A5FA",
  learning_development:      "#4ADE80",
  performance_engagement:    "#A78BFA",
  workforce_planning:        "#F472B6",
  reward_compensation:       "#FBBF24",
  hr_operations:             "#FB923C",
  governance_ethics:         "#94A3B8",
  frontline_workforce:       "#34D399",
};

const PHASE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Foundation", color: "#60A5FA" },
  2: { label: "Build",      color: "#A78BFA" },
  3: { label: "Scale",      color: "#4ADE80" },
};

const QUARTER_LABELS: Record<string, { label: string; color: string }> = {
  Q1: { label: "Foundation", color: "#60A5FA" },
  Q2: { label: "Build",      color: "#A78BFA" },
  Q3: { label: "Scale",      color: "#4ADE80" },
  Q4: { label: "Optimise",   color: "#FBBF24" },
};

const FIT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  STRONG_FIT:     { label: "Strong fit",   color: "#4ADE80", bg: "bg-green-500/10 text-green-400 border-green-500/20" },
  POSSIBLE_FIT:   { label: "Possible fit", color: "#FBBF24", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  POOR_FIT:       { label: "Weak fit",     color: "#F87171", bg: "bg-red-500/10 text-red-400 border-red-500/20" },
  WEAK_FIT:       { label: "Weak fit",     color: "#F87171", bg: "bg-red-500/10 text-red-400 border-red-500/20" },
  HARD_GATE_FAIL: { label: "Not applicable", color: "#94A3B8", bg: "bg-muted text-muted-foreground border-border" },
  NOT_APPLICABLE: { label: "Not applicable", color: "#94A3B8", bg: "bg-muted text-muted-foreground border-border" },
};

const CONFIDENCE_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  HIGH:   { label: "High",   color: "#4ADE80", description: "All inputs are CPO-provided; no estimates used." },
  MEDIUM: { label: "Medium", color: "#FBBF24", description: "1–2 inputs estimated from benchmarks." },
  LOW:    { label: "Low",    color: "#F87171", description: "3+ inputs estimated; treat as directional only." },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGBP(k: number): string {
  if (k >= 1000) return `£${(k / 1000).toFixed(1)}M`;
  return `£${k}k`;
}

function formatRange(low: number, high: number): string {
  return `${formatGBP(low)}–${formatGBP(high)}`;
}

function getCategoryColor(category: string | null | undefined): string {
  if (!category) return "#94A3B8";
  const key = category.toLowerCase().replace(/[^a-z_]/g, "_").replace(/ /g, "_");
  return CATEGORY_COLOURS[key] ?? "#94A3B8";
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true, accent }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; accent?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 px-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
          {accent && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />}
          {title}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/50" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Fit Score Bar ────────────────────────────────────────────────────────────

function FitScoreBar({ score, maxScore, label }: { score: number; maxScore: number; label: string }) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const color = pct >= 75 ? "#4ADE80" : pct >= 40 ? "#FBBF24" : "#F87171";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground/80">{label}</span>
        <span className="text-muted-foreground">{score}/{maxScore}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export default function InitiativeDrawer({
  initiative,
  allInPlan = [],
  open,
  onClose,
  onRemove,
  onAdd,
  isInPlan = true,
  onNavigate,
  onUpdateOwner,
}: InitiativeDrawerProps) {
  const [noteText, setNoteText] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [ownerText, setOwnerText] = useState("");
  const [ownerEditing, setOwnerEditing] = useState(false);

  // Sync note + owner text when initiative changes
  useEffect(() => {
    setNoteText(initiative?.notes ?? "");
    setNoteOpen(false);
    setOwnerText(initiative?.owner ?? "");
    setOwnerEditing(false);
  }, [initiative?.id]);

  // Library entry for static data (vendor landscape, prerequisites, co-deployments, phase rationale)
  const libEntry = useMemo(
    () => initiative ? INITIATIVE_LIBRARY.find(i => i.id === initiative.id) ?? null : null,
    [initiative?.id]
  );

  // Navigation: prev/next in plan order
  const planIndex = useMemo(
    () => allInPlan.findIndex(i => i.id === initiative?.id),
    [allInPlan, initiative?.id]
  );
  const prevInit = planIndex > 0 ? allInPlan[planIndex - 1] : null;
  const nextInit = planIndex >= 0 && planIndex < allInPlan.length - 1 ? allInPlan[planIndex + 1] : null;

  if (!open || !initiative) return null;

  const fitCfg = FIT_CONFIG[initiative.fitStatus ?? ""] ?? null;
  const confCfg = CONFIDENCE_CONFIG[initiative.confidence ?? ""] ?? null;
  const catColor = getCategoryColor(initiative.category);
  const phase = libEntry?.phase;
  const phaseCfg = phase ? PHASE_LABELS[phase] : null;
  const quarterCfg = initiative.targetQuarter ? QUARTER_LABELS[initiative.targetQuarter] : null;

  // Value midpoint
  const valueMid = initiative.valueRange
    ? Math.round((initiative.valueRange.low + initiative.valueRange.high) / 2)
    : null;

  // Y1 cost midpoint
  const y1Mid = initiative.y1CostRange
    ? Math.round((initiative.y1CostRange.low + initiative.y1CostRange.high) / 2)
    : null;

  // Scored factors sorted by score desc
  const topFactors = useMemo(
    () => [...(initiative.scoredFactors ?? [])].sort((a, b) => b.score - a.score),
    [initiative.scoredFactors]
  );

  // Risk flags
  const hasRisk = (initiative.riskFlags ?? []).length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="fixed right-0 top-0 h-full w-full sm:w-[640px] max-w-full bg-card border-l border-border z-50 flex flex-col shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Initiative detail: ${initiative.name}`}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="px-4 pt-4 pb-3 space-y-2">
            {/* Top row: category dot + ID + close */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                <span className="text-[10px] font-mono text-muted-foreground/60 truncate">{initiative.id}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {/* Prev/Next */}
                {prevInit && (
                  <button
                    onClick={() => onNavigate?.(prevInit.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Previous initiative"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                {nextInit && (
                  <button
                    onClick={() => onNavigate?.(nextInit.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Next initiative"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-1"
                  aria-label="Close drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-base font-semibold text-foreground leading-snug pr-2">{initiative.name}</h2>

            {/* Key facts strip */}
            <div className="flex flex-wrap items-center gap-2">
              {fitCfg && (
                <Badge variant="outline" className={`text-xs ${fitCfg.bg}`}>
                  {initiative.fitScore != null && `${initiative.fitScore} · `}{fitCfg.label}
                </Badge>
              )}
              {valueMid != null && (
                <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-400 border-violet-500/20">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {formatGBP(valueMid)} value
                  {confCfg && <span className="ml-1 opacity-70">({confCfg.label})</span>}
                </Badge>
              )}
              {(quarterCfg ?? phaseCfg) && (
                <Badge variant="outline" className="text-xs" style={{
                  borderColor: ((quarterCfg ?? phaseCfg)!.color) + "40",
                  color: (quarterCfg ?? phaseCfg)!.color,
                  backgroundColor: (quarterCfg ?? phaseCfg)!.color + "15",
                }}>
                  {(quarterCfg ?? phaseCfg)!.label} phase
                </Badge>
              )}
              {initiative.timeToValueMonths && (
                <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
                  <Clock className="w-3 h-3 mr-1" />
                  {initiative.timeToValueMonths.min}–{initiative.timeToValueMonths.max} months
                </Badge>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              {isInPlan ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 text-red-400 border-red-500/30 hover:bg-red-500/10 bg-transparent"
                  onClick={() => onRemove?.(initiative.id)}
                >
                  Remove from plan
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => onAdd?.(initiative.id)}
                >
                  Add to plan
                </Button>
              )}
              <button
                onClick={() => setNoteOpen(!noteOpen)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                {noteOpen ? "Hide note" : (noteText ? "Edit note" : "Add a note for the session")}
              </button>
            </div>

            {/* Note input */}
            {noteOpen && (
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Notes for the facilitator session…"
                rows={3}
                className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            )}

            {/* Owner field (optional) */}
            {isInPlan && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-10 flex-shrink-0">Owner</span>
                {ownerEditing ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="text"
                      value={ownerText}
                      onChange={e => setOwnerText(e.target.value)}
                      placeholder="e.g. Head of Talent Acquisition"
                      className="flex-1 text-xs bg-muted border border-border rounded px-2 py-1 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          onUpdateOwner?.(initiative!.id, ownerText.trim());
                          setOwnerEditing(false);
                        }
                        if (e.key === "Escape") { setOwnerText(initiative?.owner ?? ""); setOwnerEditing(false); }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => { onUpdateOwner?.(initiative!.id, ownerText.trim()); setOwnerEditing(false); }}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                    >Save</button>
                    <button
                      onClick={() => { setOwnerText(initiative?.owner ?? ""); setOwnerEditing(false); }}
                      className="text-xs text-muted-foreground hover:underline"
                    >Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setOwnerEditing(true)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    {ownerText || "Assign owner (optional)"}
                  </button>
                )}
              </div>
            )}

            {/* Acceptance reason (if violator) */}
            {initiative.acceptanceReason && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-0.5">Accepted with reason</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{initiative.acceptanceReason}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── A. What this is ── */}
          <Section title="What this is" accent={catColor}>
            {initiative.description && (
              <p className="text-sm text-foreground/80 leading-relaxed">{initiative.description}</p>
            )}
            {libEntry?.vendorLandscape && libEntry.vendorLandscape.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Vendor landscape
                </p>
                <ul className="space-y-1.5">
                  {libEntry.vendorLandscape.map((v, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          {/* ── B. Why this fits your org ── */}
          <Section title="Why this fits your org" accent="#4ADE80">
            {initiative.fitRationale && (
              <p className="text-sm text-foreground/80 leading-relaxed">{initiative.fitRationale}</p>
            )}

            {/* Soft factor breakdown */}
            {topFactors.length > 0 && (
              <div className="mt-3 space-y-2.5">
                <p className="text-xs font-medium text-muted-foreground">Fit score breakdown</p>
                {topFactors.map(f => (
                  <FitScoreBar key={f.key} score={f.score} maxScore={f.maxScore} label={f.label} />
                ))}
                {initiative.fitScore != null && (
                  <div className="pt-1 flex items-center justify-between text-xs border-t border-border/50">
                    <span className="text-muted-foreground">Total fit score</span>
                    <span className="font-semibold text-foreground">{initiative.fitScore}/100</span>
                  </div>
                )}
              </div>
            )}

            {/* Hard gates passed */}
            {(initiative.hardGatesPassed ?? []).length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Requirements met</p>
                {initiative.hardGatesPassed!.map((g, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{g}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Hard gate failures */}
            {(initiative.hardGateFailReasons ?? []).length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Requirements not met</p>
                {initiative.hardGateFailReasons!.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── C. Documented outcomes ── */}
          {initiative.caseStudyAnchor && (
            <Section title="Documented outcomes" accent="#A78BFA">
              <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
                <div className="flex items-start gap-2">
                  <Star className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/80 leading-relaxed">{initiative.caseStudyAnchor}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-1">Source: vendor case study / analyst report</p>
            </Section>
          )}

          {/* ── D. Value estimate ── */}
          {(initiative.valueRange || initiative.valueNarrative) && (
            <Section title="Value estimate" accent="#FBBF24">
              {initiative.valueRange && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <p className="text-[10px] text-muted-foreground/70 mb-0.5">Value range</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatRange(initiative.valueRange.low, initiative.valueRange.high)}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">annual</p>
                  </div>
                  {initiative.y1CostRange && (
                    <div className="p-3 rounded-lg bg-muted border border-border">
                      <p className="text-[10px] text-muted-foreground/70 mb-0.5">Initial cost</p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatRange(initiative.y1CostRange.low, initiative.y1CostRange.high)}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">first 12 months</p>
                    </div>
                  )}
                </div>
              )}
              {initiative.valueNarrative && (
                <p className="text-sm text-foreground/70 leading-relaxed">{initiative.valueNarrative}</p>
              )}
              {confCfg && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/50">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: confCfg.color }} />
                  <div>
                    <span className="text-xs font-medium" style={{ color: confCfg.color }}>{confCfg.label} confidence</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{confCfg.description}</p>
                  </div>
                </div>
              )}
              {initiative.isIndicative && (
                <p className="text-[10px] text-muted-foreground/50">
                  These figures are estimates. Actual value depends on implementation quality, adoption, and org-specific factors.
                </p>
              )}
            </Section>
          )}

          {/* ── E. Risk flags & mitigations ── */}
          {hasRisk && (
            <Section title="Risk flags" accent="#F87171">
              <div className="space-y-3">
                {initiative.riskFlags!.map((flag, i) => {
                  const isHigh = flag.toLowerCase().includes("high") || flag.toLowerCase().includes("breach") || flag.toLowerCase().includes("critical");
                  return (
                    <div key={i} className={`p-3 rounded-lg border ${isHigh ? "bg-red-500/5 border-red-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
                      <div className="flex items-start gap-2">
                        <Shield className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isHigh ? "text-red-400" : "text-amber-400"}`} />
                        <p className={`text-xs leading-relaxed ${isHigh ? "text-red-300" : "text-amber-300"}`}>{flag}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* ── F. Prerequisites & co-deployments ── */}
          {libEntry && (libEntry.prerequisites.length > 0 || libEntry.coDeployments.length > 0) && (
            <Section title="Prerequisites & pairs well with" accent="#60A5FA">
              {libEntry.prerequisites.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Before deploying this initiative</p>
                  <ul className="space-y-1.5">
                    {libEntry.prerequisites.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {libEntry.coDeployments.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Pairs naturally with</p>
                  <div className="flex flex-wrap gap-2">
                    {libEntry.coDeployments.map(coId => {
                      const coLib = INITIATIVE_LIBRARY.find(i => i.id === coId);
                      return (
                        <button
                          key={coId}
                          onClick={() => onNavigate?.(coId)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted border border-border text-xs text-foreground/70 hover:text-foreground hover:border-primary/40 transition-colors"
                        >
                          <Link2 className="w-3 h-3" />
                          {coLib?.label ?? coId}
                          <ArrowRight className="w-2.5 h-2.5 opacity-50" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* ── G. Principle alignment ── */}
          {initiative.principleAlignment && initiative.principleAlignment.ranking !== "neutral" && (
            <Section
              title="Principle alignment"
              accent={
                initiative.principleAlignment.ranking === "violates" ? "#F87171" : "#4ADE80"
              }
              defaultOpen
            >
              <div className={`p-3 rounded-lg border ${
                initiative.principleAlignment.ranking === "violates"
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-emerald-500/5 border-emerald-500/20"
              }`}>
                <div className="flex items-start gap-2">
                  {initiative.principleAlignment.ranking === "violates" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1.5 min-w-0">
                    <p className={`text-xs font-medium ${
                      initiative.principleAlignment.ranking === "violates" ? "text-red-400" : "text-emerald-400"
                    }`}>
                      {initiative.principleAlignment.ranking === "violates" ? "Conflicts with stated principles" : "Aligned with stated principles"}
                    </p>
                    {initiative.principleAlignment.rationale && (
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {initiative.principleAlignment.rationale}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {(initiative.principleAlignment.violatedPrinciples ?? []).length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Conflicting principles</p>
                  {initiative.principleAlignment.violatedPrinciples!.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              )}
              {(initiative.principleAlignment.alignedPrinciples ?? []).length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Supporting principles</p>
                  {initiative.principleAlignment.alignedPrinciples!.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* ── H. Phase rationale ── */}
          {libEntry?.phaseRationale && (
            <Section title="Phase rationale" accent={phaseCfg?.color ?? "#94A3B8"} defaultOpen={false}>
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-sm text-foreground/80 leading-relaxed">{libEntry.phaseRationale}</p>
              </div>
              {initiative.timeToValueMonths && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  Time to first measurable outcome: {initiative.timeToValueMonths.min}–{initiative.timeToValueMonths.max} months
                </div>
              )}
            </Section>
          )}

          {/* Spacer for mobile scroll */}
          <div className="h-8" />
        </div>

        {/* ── Footer navigation ── */}
        {allInPlan.length > 1 && (
          <div className="flex-shrink-0 border-t border-border px-4 py-3 flex items-center justify-between bg-card/95">
            <button
              onClick={() => prevInit && onNavigate?.(prevInit.id)}
              disabled={!prevInit}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {prevInit?.name ? <span className="truncate max-w-[120px]">{prevInit.name}</span> : "Previous"}
            </button>
            <span className="text-[10px] text-muted-foreground/50">
              {planIndex + 1} / {allInPlan.length}
            </span>
            <button
              onClick={() => nextInit && onNavigate?.(nextInit.id)}
              disabled={!nextInit}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {nextInit?.name ? <span className="truncate max-w-[120px]">{nextInit.name}</span> : "Next"}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
