/**
 * StrategyOverviewPage — HR AI Strategy dashboard
 * Brief: manus_brief_hr_ai_strategy_dashboard_strategy_doc.md
 *
 * Layout (top to bottom):
 *  1. Top bar — context line + review-overdue pill + action buttons
 *  2. Hero — HR AI STRATEGY label, vision quote (serif italic), supporting strategic line
 *  3. Capability section — bridge (today → needed) + Build capability button
 *  4. Strategy cards — 2×2 grid: ambition, plan, cost, value
 *  5. Talking points — collapsed teaser by default; expandable
 */
import React, { useState, useMemo, useRef, useEffect } from "react";
import { formatScore, formatScoreDelta } from "@/lib/peakon-colors";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Pencil, Download, ArrowRight,
  MessageCircle, ChevronDown, ChevronUp,
  Copy, RefreshCw, Check, AlertTriangle, Sparkles,
  CheckCircle2, Lock, Circle,
} from "lucide-react";
import { VisionModal, type VisionInputs } from "./VisionModal";
import { toast } from "sonner";
import { formatGbp as fmt, formatGbpMidpoint as fmtMidpoint } from "@/lib/format";
import { useGate } from "@/contexts/GateContext";
import { cn } from "@/lib/utils";
import { getModeLabels } from "../../../../shared/modeLabels";

// ─── Constants ────────────────────────────────────────────────────────────────
const BUSINESS_LEVELS: Record<number, { label: string; description: string }> = {
  1: { label: "Cautious",       description: "AI used selectively in low-risk, back-office processes." },
  2: { label: "Exploratory",    description: "Piloting AI in specific workflows. Building internal confidence before wider rollout." },
  3: { label: "Progressive",    description: "AI embedded in core HR processes. HR professionals use AI tools confidently." },
  4: { label: "Ambitious",      description: "AI is a strategic differentiator. HR leads AI adoption across the business." },
  5: { label: "Transformative", description: "AI is central to the business model. HR professionals are AI-native practitioners." },
};
const PEOPLE_LEVELS: Record<number, { label: string; description: string }> = {
  1: { label: "Followers",     description: "HR people use AI tools as directed." },
  2: { label: "Adopters",      description: "HR people learn and use AI tools in their day-to-day work." },
  3: { label: "Practitioners", description: "HR people apply AI confidently, evaluate outputs critically, and adapt workflows." },
  4: { label: "Champions",     description: "HR people advocate for AI, coach others, and contribute to AI governance." },
  5: { label: "Innovators",    description: "HR people design AI-enabled processes, lead change, and shape the AI strategy." },
};
// Ambition tier → required capability score (0–100 raw, divide by 10 for display)
const AMBITION_TIER_BASE: Record<number, number> = { 1: 38, 2: 46, 3: 55, 4: 63, 5: 73 };
// Plain-English tier label for card 1 tier tag
const AMBITION_TIER_PLAIN: Record<number, string> = {
  1: "Foundational ambition",
  2: "Exploratory ambition",
  3: "Progressive ambition",
  4: "Strong ambition",
  5: "Top-tier ambition",
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

const PHASE_COST_PER_INIT: Record<string, { low: number; high: number }> = {
  "Q1": { low: 20,  high: 60  },
  "Q2": { low: 40,  high: 120 },
  "Q3": { low: 60,  high: 200 },
  "Q4": { low: 30,  high: 100 },
  "unknown": { low: 15, high: 50 },
};

const SECTORS = [
  { value: "financial_services",    label: "Financial Services" },
  { value: "healthcare",            label: "Healthcare" },
  { value: "technology",            label: "Technology" },
  { value: "retail",                label: "Retail" },
  { value: "public_sector",         label: "Public Sector" },
  { value: "professional_services", label: "Professional Services" },
  { value: "manufacturing",         label: "Manufacturing" },
  { value: "energy_utilities",      label: "Energy & Utilities" },
  { value: "media_entertainment",   label: "Media & Entertainment" },
  { value: "logistics_transport",   label: "Logistics & Transport" },
  { value: "education",             label: "Education" },
  { value: "hospitality_leisure",   label: "Hospitality & Leisure" },
  { value: "other",                 label: "Other" },
];

function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function capLevelLabel(score: number): string {
  if (score < 3.1) return "novice level";
  if (score < 5.6) return "foundational level";
  if (score < 7.6) return "solid level";
  return "mature level";
}

// ─── Vision Quote ─────────────────────────────────────────────────────────────
function VisionQuote({ text, onReadMore }: { text: string; onReadMore: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const words = text.split(/\s+/);
  const isTruncatable = words.length > 80;
  let displayText = text;
  let isTruncated = false;
  if (isTruncatable && !expanded) {
    const first80 = words.slice(0, 80).join(" ");
    const sentenceEnd = first80.search(/[.!?][^.!?]*$/);
    displayText = sentenceEnd > 0 ? first80.slice(0, sentenceEnd + 1) : first80;
    isTruncated = true;
  }
  return (
    <blockquote
      className="mb-4 max-w-3xl"
    >
      <p
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "15px",
          fontStyle: "italic",
          lineHeight: 1.55,
          fontWeight: 400,
          color: "hsl(var(--foreground))",
        }}
      >
        &ldquo;{displayText}{isTruncated ? "\u2026" : ""}&rdquo;
      </p>
      {isTruncatable && (
        <button
          className="mt-2 text-[12px] not-italic underline underline-offset-2 hover:no-underline text-primary"
          onClick={() => {
            if (expanded) { setExpanded(false); } else { setExpanded(true); onReadMore(); }
          }}
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      )}
    </blockquote>
  );
}

// ─── Capability Bridge ────────────────────────────────────────────────────────
interface CapabilityBridgeProps {
  hrNow: string | null;
  hrTarget: string;
  hrGap: string | null;
  hasAmbition: boolean;
  isLoading: boolean;
  onBuildCapability: () => void;
  teamLabel?: string;
}
function CapabilityBridge({ hrNow, hrTarget, hrGap, hasAmbition, isLoading, onBuildCapability, teamLabel = "HR" }: CapabilityBridgeProps) {
  const nowNum    = hrNow != null ? Number(hrNow) : null;
  const targetNum = Number(hrTarget);
  const gapNum    = hrGap != null ? Number(hrGap) : null;
  const isAboveTarget = nowNum != null && nowNum >= targetNum;

  return (
    <section
      className="rounded-xl mb-8 px-5 py-4"
      style={{ background: "hsl(var(--muted)/0.35)" }}
      aria-label="Capability section"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          WHAT {teamLabel.toUpperCase()} NEEDS TO BE ABLE TO DO
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-3 text-xs gap-1.5 flex-shrink-0 border-border/60 text-foreground hover:bg-foreground/8"
          onClick={onBuildCapability}
          aria-label={nowNum == null ? "Take the assessment" : "See learning plan"}
        >
          {nowNum == null ? "Take the assessment" : "See learning plan"}
          <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </Button>
      </div>

          {/* Bridge — Change 4: two discrete segments */}
          {isLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-20 rounded" />
              <Skeleton className="h-2 flex-1 rounded" />
              <Skeleton className="h-10 w-20 rounded" />
            </div>
          ) : !hasAmbition ? (
            <p className="text-sm text-muted-foreground">
              Set your ambition first to see what capability you need.
            </p>
          ) : nowNum == null ? (
            <p className="text-sm text-muted-foreground">
              No assessment yet — take it to see your capability bridge.
            </p>
          ) : isAboveTarget ? (
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">TODAY</p>
                <p className="text-[22px] font-medium leading-none text-foreground">
                  {hrNow} <span className="text-sm text-muted-foreground font-normal">/10</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{capLevelLabel(nowNum)}</p>
              </div>
              <p className="text-sm text-muted-foreground flex-1">
                You&apos;re at the level needed for this ambition.
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Left — Today */}
              <div className="flex-shrink-0 min-w-[72px]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">TODAY</p>
                <p className="text-[22px] font-medium leading-none text-foreground">
                  {hrNow} <span className="text-sm text-muted-foreground font-normal">/10</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{capLevelLabel(nowNum)}</p>
              </div>
              {/* Middle — Two-segment bar (gray today + teal gap) */}
              <div className="flex-1 min-w-[100px] flex flex-col gap-1">
                <div
                  className="relative h-[5px] rounded-sm w-full"
                  style={{ background: "var(--muted)" }}
                  role="progressbar"
                  aria-valuenow={nowNum}
                  aria-valuemin={0}
                  aria-valuemax={10}
                  aria-valuetext={`${hrNow} of 10, target ${hrTarget}`}
                >
                  {/* Segment 1: today (gray) */}
                  <div
                    style={{
                      position: "absolute", left: 0, top: 0, height: "100%",
                      width: `${Math.min(nowNum / 10 * 100, 100)}%`,
                      background: "var(--muted-foreground)",
                      borderRadius: "3px 0 0 3px",
                    }}
                  />
                  {/* Segment 2: gap (teal) */}
                  {gapNum != null && gapNum > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${Math.min(nowNum / 10 * 100, 100)}%`,
                        top: 0, height: "100%",
                        width: `${Math.max(0, Math.min((targetNum - nowNum) / 10 * 100, 100 - nowNum / 10 * 100))}%`,
                        background: "#5DCAA5",
                        borderRadius: "0 3px 3px 0",
                      }}
                    />
                  )}
                  {/* Target marker */}
                  <div
                    style={{
                      position: "absolute",
                      left: `${Math.min(targetNum / 10 * 100, 100)}%`,
                      top: -3, bottom: -3, width: 2,
                      background: "#5DCAA5",
                      borderRadius: 1,
                    }}
                    aria-hidden="true"
                  />
                </div>
                {gapNum != null && gapNum > 0 && (
                  <p className="text-[11px] text-center text-muted-foreground">
                    {hrGap} points to close
                  </p>
                )}
              </div>
              {/* Right — Target */}
              <div className="flex-shrink-0 min-w-[72px] sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">WHERE WE NEED TO BE</p>
                <p className="text-[22px] font-medium leading-none text-foreground">
                  {hrTarget} <span className="text-sm font-normal text-muted-foreground">/10</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">to deliver this strategy</p>
              </div>
            </div>
          )}
    </section>
  );
}

// ─── Card Skeleton ────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-background p-5 space-y-3 min-h-[180px]">
      <Skeleton className="h-4 w-1/2 rounded" />
      <Skeleton className="h-3 w-full rounded" />
      <Skeleton className="h-3 w-4/5 rounded" />
      <Skeleton className="h-3 w-3/5 rounded" />
      <Skeleton className="h-3 w-2/3 rounded mt-2" />
    </div>
  );
}

// ─── List Card (cards 1 & 2) ──────────────────────────────────────────────────
interface OutcomeRow { label: string; from: string; to: string; unit?: string; }
interface ListCardProps {
  accentColor: string;
  eyebrow?: string;
  eyebrowColor?: string;
  title: string;
  tierTag: string;
  items: string[];
  extraCount: number;
  footerLink: string;
  footerLabel: string;
  emptyMessage: string;
  emptyCta: string;
  emptyCtaHref: string;
  onNavigate: (href: string) => void;
  onCardClick: () => void;
  // Change 7: outcomes for "Where we're going" card
  outcomeRows?: OutcomeRow[];
  outcomeExtra?: number;
}
function ListCard({ accentColor, eyebrow, eyebrowColor, title, tierTag, items, extraCount, footerLink, footerLabel, emptyMessage, emptyCta, emptyCtaHref, onNavigate, onCardClick, outcomeRows, outcomeExtra }: ListCardProps) {
  const showOutcomes = outcomeRows && outcomeRows.length > 0;
  return (
    <div
      className="rounded-xl border border-border bg-background flex flex-col cursor-pointer hover:border-border/60 transition-all duration-150"
      style={{ borderTop: `2px solid ${accentColor}`, padding: "1.25rem" }}
      onClick={onCardClick}
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCardClick(); } }}
      role="article"
    >
      {/* Eyebrow (Change 6) */}
      {eyebrow && (
        <span
          style={{
            fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase",
            fontWeight: 500, color: eyebrowColor ?? accentColor, display: "block", marginBottom: 6,
          }}
        >
          {eyebrow}
        </span>
      )}
      {/* Title row */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-[14px] font-medium text-foreground">{title}</h3>
        {tierTag && !eyebrow && (
          <span className="text-[10px] font-bold uppercase tracking-wide flex-shrink-0" style={{ color: accentColor }}>
            {tierTag}
          </span>
        )}
      </div>
      {/* Body */}
      {showOutcomes ? (
        /* Change 7: outcome rows with from-to numbers */
        <ul className="flex-1 flex flex-col gap-2 mb-3" aria-label={title}>
          {outcomeRows!.map((row, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[13px] leading-snug">
              <span
                className="mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: accentColor }}
                aria-hidden="true"
              />
              <span style={{ color: "var(--muted-foreground)" }}>{row.label}:</span>
              {" "}
              <span style={{ color: "#5DCAA5", fontWeight: 500 }}>{row.from} → {row.to}{row.unit ? row.unit : ""}</span>
            </li>
          ))}
          {(outcomeExtra ?? 0) > 0 && (
            <li
              className="text-[12px] text-muted-foreground pl-[14px] cursor-pointer"
              onClick={e => { e.stopPropagation(); onNavigate(footerLink); }}
            >
              + {outcomeExtra} more outcome{(outcomeExtra ?? 0) !== 1 ? "s" : ""}
            </li>
          )}
        </ul>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center gap-1.5 py-2">
          <p className="text-[13px] text-muted-foreground">{emptyMessage}</p>
          <button
            className="text-[12px] underline underline-offset-2 text-left hover:no-underline"
            style={{ color: accentColor }}
            onClick={e => { e.stopPropagation(); onNavigate(emptyCtaHref); }}
          >
            {emptyCta}
          </button>
        </div>
      ) : (
        <ul className="flex-1 flex flex-col gap-2 mb-3" aria-label={title}>
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[13px] text-foreground leading-snug">
              <span
                className="mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: accentColor }}
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
          {extraCount > 0 && (
            <li className="text-[12px] text-muted-foreground pl-[14px]">+ {extraCount} more</li>
          )}
        </ul>
      )}
      {/* Footer link */}
      {(showOutcomes || items.length > 0) && (
        <button
          className="flex items-center gap-1 text-[12px] font-medium mt-auto pt-1 w-fit"
          style={{ color: accentColor }}
          onClick={e => { e.stopPropagation(); onNavigate(footerLink); }}
          aria-label={footerLabel}
        >
          {footerLabel}
          <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// ─── Value Card (cards 3 & 4) ─────────────────────────────────────────────────
interface ValueCardProps {
  accentColor: string;
  eyebrow?: string;
  eyebrowColor?: string;
  title: string;
  headline: string;
  subLine: string;
  footerLink: string;
  footerLabel: string;
  emptyMessage: string;
  emptyCta: string;
  emptyCtaHref: string;
  isEmpty: boolean;
  onNavigate: (href: string) => void;
  onCardClick: () => void;
}
function ValueCard({ accentColor, eyebrow, eyebrowColor, title, headline, subLine, footerLink, footerLabel, emptyMessage, emptyCta, emptyCtaHref, isEmpty, onNavigate, onCardClick }: ValueCardProps) {
  return (
    <div
      className="rounded-xl border border-border bg-background flex flex-col cursor-pointer hover:border-border/60 transition-all duration-150"
      style={{ borderTop: `2px solid ${accentColor}`, padding: "1.25rem" }}
      onClick={onCardClick}
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCardClick(); } }}
      role="article"
    >
      {/* Eyebrow (Change 6) */}
      {eyebrow && (
        <span
          style={{
            fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase",
            fontWeight: 500, color: eyebrowColor ?? accentColor, display: "block", marginBottom: 6,
          }}
        >
          {eyebrow}
        </span>
      )}
      <h3 className="text-[14px] font-medium text-foreground mb-2">{title}</h3>
      {isEmpty ? (
        <div className="flex-1 flex flex-col justify-center gap-1.5 py-2">
          <p className="text-[13px] text-muted-foreground">{emptyMessage}</p>
          <button
            className="text-[12px] underline underline-offset-2 text-left hover:no-underline"
            style={{ color: accentColor }}
            onClick={e => { e.stopPropagation(); onNavigate(emptyCtaHref); }}
          >
            {emptyCta}
          </button>
        </div>
      ) : (
        <>
          <p className="text-[17px] font-medium mb-1.5 leading-snug" style={{ color: accentColor }}>{headline}</p>
          <p className="text-[12px] text-muted-foreground leading-snug flex-1">{subLine}</p>
          <button
            className="flex items-center gap-1 text-[12px] font-medium mt-auto pt-2 w-fit"
            style={{ color: accentColor }}
            onClick={e => { e.stopPropagation(); onNavigate(footerLink); }}
            aria-label={footerLabel}
          >
            {footerLabel}
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}

// ─── Talking Points Block ─────────────────────────────────────────────────────
interface TalkingPointsData {
  bullets: string[];
  generatedAt: number;
  userEdited: boolean;
  strategyHash: string;
  dismissedStaleNotice?: boolean;
}

interface TalkingPointsBlockProps {
  strategyHash: string;
  hasStrategy: boolean;
  hasInitiatives: boolean;
}

function TalkingPointsBlock({ strategyHash, hasStrategy, hasInitiatives }: TalkingPointsBlockProps) {
  // Collapsed by default per brief
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("aiq_tp_collapsed") !== "false"; } catch { return true; }
  });
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const tpQ        = trpc.intelligence.getTalkingPoints.useQuery(undefined, { enabled: hasStrategy });
  const generateMut = trpc.intelligence.generateLeadershipTalkingPoints.useMutation();
  const saveMut     = trpc.intelligence.saveLeadershipTalkingPoints.useMutation();
  const utils       = trpc.useUtils();

  const data: TalkingPointsData | null = (tpQ.data as TalkingPointsData | null) ?? null;
  const isStale = !!(
    data &&
    !data.dismissedStaleNotice &&
    !data.userEdited &&
    data.strategyHash &&
    strategyHash &&
    data.strategyHash !== strategyHash
  );
  const bulletCount = data?.bullets?.length ?? 0;

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("aiq_tp_collapsed", String(next)); } catch {}
    (window as any).umami?.track(next ? "strategy.talking-points.collapsed" : "strategy.talking-points.expanded");
  }

  async function doGenerate() {
    (window as any).umami?.track("strategy.talking-points.regenerated");
    try {
      const result = await generateMut.mutateAsync();
      utils.intelligence.getTalkingPoints.setData(undefined, result);
      setCollapsed(false);
      try { localStorage.setItem("aiq_tp_collapsed", "false"); } catch {}
    } catch {
      toast.error("Couldn't generate talking points. Please try again.");
    }
  }

  function handleRegenerate() {
    if (data?.userEdited) { setShowRegenerateConfirm(true); return; }
    doGenerate();
  }

  function handleCopy() {
    if (!data?.bullets?.length) return;
    navigator.clipboard.writeText(data.bullets.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function startEdit(idx: number) {
    setEditingIdx(idx);
    setEditValue(data?.bullets?.[idx] ?? "");
    setTimeout(() => editRef.current?.focus(), 50);
  }
  function cancelEdit() { setEditingIdx(null); setEditValue(""); }
  async function saveEdit(idx: number) {
    if (!data) return;
    const newBullets = [...data.bullets];
    newBullets[idx] = editValue.trim() || newBullets[idx];
    try {
      await saveMut.mutateAsync({ bullets: newBullets, userEdited: true });
      utils.intelligence.getTalkingPoints.setData(undefined, { ...data, bullets: newBullets, userEdited: true } as any);
    } catch { toast.error("Couldn't save edit."); }
    setEditingIdx(null);
    setEditValue("");
  }

  async function handleKeepCurrent() {
    if (!data) return;
    (window as any).umami?.track("strategy.talking-points.keep-current-clicked");
    try {
      await saveMut.mutateAsync({ bullets: data.bullets, userEdited: false, dismissedStaleNotice: true } as any);
      utils.intelligence.getTalkingPoints.setData(undefined, { ...data, dismissedStaleNotice: true } as any);
    } catch { /* ignore */ }
  }

  // Not enough data to generate
  if (!hasStrategy || !hasInitiatives) {
    return (
      <div
        className="rounded-xl mb-8 px-4 py-3 flex items-center justify-between gap-3"
        style={{ border: "0.5px solid hsl(var(--border))" }}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>What to tell your CEO</span>
        </div>
        <p className="text-xs text-muted-foreground">Add initiatives to generate talking points.</p>
      </div>
    );
  }

  // Never generated
  if (!tpQ.isLoading && !data?.bullets?.length) {
    return (
      <div
        className="rounded-xl mb-8 px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-foreground/3 transition-colors"
        style={{ border: "0.5px solid hsl(var(--border))" }}
        onClick={doGenerate}
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); doGenerate(); } }}
        role="button"
        aria-label="Generate talking points"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>Generate 5 talking points for briefing</span>
        </div>
        {generateMut.isPending
          ? <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" aria-hidden="true" />
          : <ArrowRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        }
      </div>
    );
  }

  return (
    <>
      <div
        className="rounded-xl mb-8"
        style={{ border: "0.5px solid hsl(var(--border))" }}
      >
        {/* Collapsed teaser */}
        {collapsed ? (
          <button
            className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-foreground/3 transition-colors rounded-xl"
            onClick={toggleCollapse}
            aria-expanded={false}
            aria-controls="talking-points-body"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>
                What to tell your CEO
                {bulletCount > 0 && (
                  <span className="ml-1 text-muted-foreground/60">· {bulletCount} talking points ready</span>
                )}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
          </button>
        ) : (
          <div id="talking-points-body" className="p-5">
            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                What to tell your CEO
              </h2>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {data?.generatedAt && (
                  <span className="text-[10px] text-muted-foreground/60 hidden sm:block">
                    Generated {new Date(data.generatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    {data.userEdited ? " · edited" : ""}
                  </span>
                )}
                <Button
                  variant="ghost" size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                  onClick={handleCopy}
                  disabled={!data?.bullets?.length}
                  aria-label="Copy talking points"
                >
                  {copied ? <Check className="w-3.5 h-3.5 dark:text-green-400 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{copied ? "Copied" : "Copy all"}</span>
                </Button>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                  onClick={handleRegenerate}
                  disabled={generateMut.isPending}
                  aria-label="Regenerate talking points"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generateMut.isPending ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Regenerate</span>
                </Button>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={toggleCollapse}
                  aria-label="Collapse talking points"
                  aria-expanded={true}
                  aria-controls="talking-points-body"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {/* Stale banner */}
            {isStale && (
              <div className="flex flex-wrap items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs dark:text-amber-300 text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1 min-w-0">Strategy has changed since these were generated.</span>
                {/* Both actions symmetric — same weight, both underlined; user chooses without nudge */}
                <button className="underline underline-offset-2 hover:no-underline" onClick={doGenerate} disabled={generateMut.isPending}>
                  Regenerate
                </button>
                <button className="underline underline-offset-2 hover:no-underline" onClick={handleKeepCurrent}>
                  Keep current
                </button>
              </div>
            )}
            {/* Category labels for the 5 fixed-order talking points */}
            {/* P3-7: small tertiary labels make coverage visible and help CPO navigate */}
            {(() => {
              const TP_CATEGORIES = ["Vision", "Ambition", "Capability gap", "Financial impact", "Strategic dependency"];
              return null; // labels rendered inline below
            })()}
            {/* Change 9: Label-content row layout */}
            <div role="list" aria-label="CEO talking points">
              {(tpQ.isLoading || generateMut.isPending) ? (
                [1, 2, 3, 4, 5, 6].map(i => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-[7px]"
                    style={{ borderBottom: i < 6 ? "0.5px solid rgba(255,255,255,0.04)" : undefined }}
                  >
                    <Skeleton className="h-2.5 w-[90px] flex-shrink-0 mt-1 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                  </div>
                ))
              ) : data?.bullets?.length ? (() => {
                // Change 10: Insert Principles row between Ambition (idx 1) and Capability gap (idx 2)
                // Original order: Vision(0), Ambition(1), Capability gap(2), Financial impact(3), Strategic dependency(4)
                // New order: Vision(0), Ambition(1), [Principles — static], Capability gap(2), Financial impact(3), Strategic dependency(4)
                const LABELS = ["VISION", "AMBITION", "CAPABILITY GAP", "FINANCIAL IMPACT", "STRATEGIC DEPENDENCY"];
                const PRINCIPLES_ROW = "We've committed to five operating principles — including humans deciding on hiring, promotion, and termination; building HR's AI literacy before deploying tools; and matching deployment pace to what the workforce can absorb.";
                // Build rows: [0,1] from bullets, then static Principles, then [2,3,4] from bullets
                const rows: Array<{ label: string; content: string; idx: number | null }> = [];
                data.bullets.forEach((bullet, idx) => {
                  if (idx === 2) {
                    // Insert Principles row before Capability gap
                    rows.push({ label: "PRINCIPLES", content: PRINCIPLES_ROW, idx: null });
                  }
                  // Change 11: Append trust outcome to Financial impact row (idx 3)
                  const content = idx === 3
                    ? bullet + " Employee trust in HR\u2019s AI use is also a measured outcome, targeting 80% (up from 48%) by Q3 2027."
                    : bullet;
                  rows.push({ label: LABELS[idx] ?? `POINT ${idx + 1}`, content, idx });
                });
                return rows.map((row, rowIdx) => (
                  <div
                    key={rowIdx}
                    role="listitem"
                    className="group flex items-start gap-3 py-[7px]"
                    style={{ borderBottom: rowIdx < rows.length - 1 ? "0.5px solid rgba(255,255,255,0.04)" : undefined }}
                  >
                    {/* Left column: label */}
                    <span
                      style={{
                        fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase",
                        fontWeight: 500, color: "var(--primary)", flexShrink: 0,
                        width: 90, paddingTop: 2, lineHeight: 1.4,
                      }}
                    >
                      {row.label}
                    </span>
                    {/* Right column: content */}
                    {row.idx !== null && editingIdx === row.idx ? (
                      <div className="flex-1 flex flex-col gap-1.5">
                        <Textarea
                          ref={editRef}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="text-sm min-h-[60px] bg-foreground/5 border-border resize-none"
                          onKeyDown={e => {
                            if (e.key === "Escape") cancelEdit();
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(row.idx!); }
                          }}
                        />
                        <div className="flex gap-1.5">
                          <Button size="sm" className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => saveEdit(row.idx!)}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={cancelEdit}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-start justify-between gap-2 min-w-0">
                        <p style={{ fontSize: 12, color: "var(--foreground)", lineHeight: 1.55 }}>{row.content}</p>
                        {row.idx !== null && (
                          <button
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 flex-shrink-0 p-1 rounded hover:bg-foreground/8 text-muted-foreground hover:text-foreground transition-opacity"
                            onClick={() => startEdit(row.idx!)}
                            aria-label={`Edit ${row.label} talking point`}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ));
              })() : (
                <p className="text-sm text-muted-foreground">No talking points yet. Click Regenerate to generate them.</p>
              )}
            </div>
            {generateMut.isError && (
              <div className="mt-2 flex items-center gap-2 text-xs dark:text-red-400 text-red-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Couldn&apos;t generate talking points.</span>
                <button className="underline" onClick={doGenerate}>Retry</button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Regenerate confirm modal */}
      <Dialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Regenerate talking points?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Your edits will be replaced with AI-generated bullets.</p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowRegenerateConfirm(false)}>Cancel</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => { setShowRegenerateConfirm(false); doGenerate(); }}
            >
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


// ─── Gate Flow Strip ──────────────────────────────────────────────────────────
function GateFlowStrip() {
  const gate = useGate();
  const [, navigate] = useLocation();
  const modeLabels = getModeLabels(gate.tenantMode as "cpo" | "reward" | null | undefined);
  const isReward = gate.tenantMode === "reward";

  type StageInfo = { num: number; label: string; href: string; isAccessible: boolean; isCleared: boolean };

  const allStages: StageInfo[] = [
    { num: 1, label: "Pre-work",       href: "/strategy/diagnostic",   isAccessible: gate.isStage1Accessible, isCleared: gate.stage1Cleared },
    { num: 2, label: "Vision",         href: "/strategy/vision",        isAccessible: gate.isStage2Accessible, isCleared: gate.stage2Cleared },
    { num: 3, label: "Strategy",       href: "/strategy/strategy",      isAccessible: gate.isStage3Accessible, isCleared: gate.stage3Cleared },
    { num: 4, label: "Principles",     href: "/strategy/principles",      isAccessible: gate.isStage4Accessible, isCleared: gate.stage4Cleared },
    { num: 5, label: "Initiatives",    href: "/strategy/builder",       isAccessible: gate.isStage5Accessible, isCleared: gate.stage5Cleared },
    { num: 6, label: "Measurement",    href: "/strategy/measures",   isAccessible: gate.isStage6Accessible, isCleared: gate.stage6Cleared },
    { num: 7, label: "Business case",  href: "/strategy/business-case", isAccessible: gate.isStage7Accessible, isCleared: gate.stage7Cleared },
    { num: 8, label: "Capability",     href: "/strategy/capability",    isAccessible: gate.isStage8Accessible, isCleared: gate.stage8Cleared },
    { num: 9,  label: modeLabels.stage9Label,  href: isReward ? "/strategy/reward-review"  : "/strategy/review",       isAccessible: gate.isStage9Accessible,  isCleared: gate.stage9Cleared  },
    { num: 10, label: modeLabels.stage10Label, href: isReward ? "/strategy/reward-outputs" : "/strategy/board-report", isAccessible: gate.isStage10Accessible, isCleared: gate.stage10Cleared },
  ];

  const totalCleared = allStages.filter(s => s.isCleared).length;
  const allDone = totalCleared === 10;

  // Find the first stage that is accessible but not yet cleared — this is the user's next action
  const nextStage = allStages.find(s => s.isAccessible && !s.isCleared);

  return (
    <div className="mb-6 rounded-xl border border-border bg-muted/20 px-4 py-4">
      {/* Header row: progress count + next CTA */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
            Strategy build progress
          </p>
          <p className="text-[11px] text-muted-foreground">
            {allDone ? "All 10 stages complete" : `${totalCleared} of 10 stages done`}
          </p>
        </div>
        {/* Single primary CTA: navigate to the next incomplete stage */}
        {!allDone && nextStage && (
          <Button
            size="sm"
            className="gap-2 font-semibold text-sm px-4 h-9 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
            onClick={() => navigate(gate.stage8Cleared ? nextStage.href + "?from=dashboard" : nextStage.href)}
          >
            <ArrowRight className="w-4 h-4" />
            Continue: Stage {nextStage.num} — {nextStage.label}
          </Button>
        )}
        {allDone && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Strategy complete
          </span>
        )}
      </div>

      {/* Stage pills — compact, non-primary, collapsed into a single row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {allStages.map((s) => {
          const isLocked = !s.isAccessible;
          const isNext = nextStage?.num === s.num;
          return (
            <button
              key={s.num}
              onClick={() => !isLocked && navigate(gate.stage8Cleared ? s.href + "?from=dashboard" : s.href)}
              disabled={isLocked}
              title={isLocked ? `Locked — complete earlier stages first` : s.isCleared ? `Stage ${s.num} complete — click to revisit` : `Stage ${s.num} — in progress`}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap",
                s.isCleared && "text-emerald-600 dark:text-emerald-400 bg-emerald-500/8 hover:bg-emerald-500/15",
                isNext && "text-foreground bg-primary/15 border border-primary/40 hover:bg-primary/20",
                !s.isCleared && !isLocked && !isNext && "text-muted-foreground bg-muted/40 hover:bg-muted/60",
                isLocked && "text-muted-foreground/30 cursor-not-allowed"
              )}
            >
              {s.isCleared ? (
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              ) : isLocked ? (
                <Lock className="w-3 h-3 flex-shrink-0" />
              ) : (
                <Circle className="w-3 h-3 flex-shrink-0" />
              )}
              <span>{s.num}. {s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function StrategyOverviewPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const gate = useGate();
  const modeLabels = getModeLabels(gate.tenantMode as "cpo" | "reward" | null | undefined);

  // ── Data queries ──────────────────────────────────────────────────────────
  const strategyQ           = trpc.intelligence.getStrategy.useQuery();
  const strategyAssessmentQ = trpc.intelligence.getStrategyAssessment.useQuery();
  const companyQ            = trpc.companyAssessment.getMyAssessmentResults.useQuery();
  const ambitionGapQ        = trpc.dashboardV2.leader.ambitionGap.useQuery();
  const initiativesQ        = trpc.strategy.listInitiatives.useQuery(
    { tenantId: user?.tenantId ?? "" },
    { enabled: !!user?.tenantId }
  );
  const orgContextQ         = trpc.intelligence.orgContext.useQuery();
  const ambitionSectionsQ   = trpc.intelligence.getAmbitionSections.useQuery(
    undefined,
    { enabled: gate.stage8Cleared }
  );
  const capabilityQ         = trpc.intelligence.getCapabilityAssessment.useQuery(
    undefined,
    { enabled: gate.stage8Cleared }
  );
  const valueEnvQ           = trpc.intelligence.calculateValueEnvelope.useQuery(
    { selectedInitiativeIds: [] },
    { enabled: false }
  );
  const [liveRisks, setLiveRisks] = useState<any[] | null>(null);
  const evaluateRiskMut     = trpc.intelligence.evaluateRiskRules.useMutation();
  const [visionModalOpen, setVisionModalOpen] = useState(false);

  const strategyData     = strategyQ.data as any;
  const orgContext       = orgContextQ.data as any;
  const companyResults   = companyQ.data as any;
  const ambitionGap      = ambitionGapQ.data as any;
  const allInitiatives   = (initiativesQ.data ?? []) as any[];
  const visionStatement  = (strategyAssessmentQ.data as any)?.visionStatement ?? null;
  const userVisionInput  = (strategyAssessmentQ.data as any)?.userVisionInput ?? null;
  // Prefer user's verbatim input for display; fall back to AI-generated vision
  const displayVision    = userVisionInput ?? visionStatement;
  // Commitments: prefer persisted commitmentsJson; fall back to success_markers_ranked from structuredInputs
  const assessmentStructuredInputs = (strategyAssessmentQ.data as any)?.structuredInputs as Record<string, any> | null;
  const rawCommitments = ((strategyAssessmentQ.data as any)?.commitments ?? []) as string[];
  const commitments = useMemo<string[]>(() => {
    if (rawCommitments && rawCommitments.length > 0) return rawCommitments;
    // Fallback: derive from success_markers_ranked using plain-English labels
    const SUCCESS_MARKER_LABELS: Record<string, string> = {
      productivity_gains:              "Productivity gains across HR and the business",
      improved_speed_of_decision:      "Improved speed of decision-making",
      team_capability_uplift:          "Team capability uplift in AI skills",
      cost_reduction:                  "Cost reduction through automation",
      employee_experience:             "Improved employee experience",
      risk_reduction:                  "Reduced compliance and operational risk",
      data_quality:                    "Better data quality and HR analytics",
      retention_improvement:           "Improved retention through better people insights",
      hiring_quality:                  "Higher quality of hire",
      manager_effectiveness:           "Increased manager effectiveness",
    };
    const ranked = assessmentStructuredInputs?.success_markers_ranked as string[] | undefined;
    if (!ranked || ranked.length === 0) return [];
    return ranked.slice(0, 3).map(id => SUCCESS_MARKER_LABELS[id] ?? id.replace(/_/g, " "));
  }, [rawCommitments, assessmentStructuredInputs]);

  const businessLevel = strategyData?.businessAmbitionLevel ?? orgContext?.businessAmbitionLevel ?? 3;
  const peopleLevel   = strategyData?.peopleAmbitionLevel   ?? orgContext?.peopleAmbitionLevel   ?? 3;
  const bLevel = BUSINESS_LEVELS[businessLevel];
  const pLevel = PEOPLE_LEVELS[peopleLevel];

  const selectedInitiativeIds = useMemo<Set<string>>(() => {
    // getStrategy returns selectedInitiativeIds as a parsed string[] (not raw JSON)
    const ids = strategyData?.selectedInitiativeIds;
    if (!ids || !Array.isArray(ids)) return new Set<string>();
    return new Set<string>(ids as string[]);
  }, [strategyData?.selectedInitiativeIds]);

  const selectedInits = useMemo(
    () => allInitiatives.filter((i: any) => selectedInitiativeIds.has(i.id)),
    [allInitiatives, selectedInitiativeIds]
  );

  // Cost envelope
  const { totalCostLow, totalCostHigh, foundationCostLow, foundationCostHigh } = useMemo(() => {
    let tLow = 0, tHigh = 0, fLow = 0, fHigh = 0;
    for (const init of selectedInits) {
      const phase = assignPhase({ category: init.category ?? "", complexity: init.complexity ?? 2, name: init.name ?? "" });
      const costs = PHASE_COST_PER_INIT[phase] ?? PHASE_COST_PER_INIT["unknown"];
      tLow  += costs.low;
      tHigh += costs.high;
      if (phase === "Q1") { fLow += costs.low; fHigh += costs.high; }
    }
    return { totalCostLow: tLow * 1000, totalCostHigh: tHigh * 1000, foundationCostLow: fLow * 1000, foundationCostHigh: fHigh * 1000 };
  }, [selectedInits]);

  // Count ALL matched risk rules (both 'risk' and 'note' types) for the compliance count.
  // Each rule represents a distinct regulatory framework (GDPR, EU AI Act, Employment Law, etc.).
  // Previously only counted 'note' type which gave count=1 instead of the correct 4.
  const frameworkCount = liveRisks?.length ?? 0;

  useEffect(() => {
    if (selectedInits.length === 0 || liveRisks !== null) return;
    const ambitionTier: "cautious" | "progressive" | "transformative" =
      businessLevel >= 4 ? "transformative" : businessLevel >= 3 ? "progressive" : "cautious";
    const ids = selectedInits.map((i: any) => i.id);
    evaluateRiskMut.mutate(
      { ambitionTier, orgSize: "medium", selectedInitiativeIds: ids },
      { onSuccess: (data) => setLiveRisks(data) }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInits.length]);

  // Value envelope — pass solutionDeliveryConfidence and planHorizonMonths for accurate numbers
  const solutionConfidence = (assessmentStructuredInputs?.solution_delivery_confidence as number | undefined) ?? 3;
  const planHorizonMonths  = (assessmentStructuredInputs?.timeline_months as number | undefined) ?? 18;
  // Wire the persisted operationalBaseline so value formulas use real org data, not defaults
  const operationalBaseline = useMemo(() => {
    const raw = (strategyAssessmentQ.data as any)?.operationalBaseline;
    if (raw && typeof raw === "object") return raw as Record<string, number>;
    return {} as Record<string, number>;
  }, [(strategyAssessmentQ.data as any)?.operationalBaseline]);

  const valueEnvWithIdsQ = trpc.intelligence.calculateValueEnvelope.useQuery(
    {
      selectedInitiativeIds: Array.from(selectedInitiativeIds),
      operationalBaseline,
      solutionDeliveryConfidence: solutionConfidence,
      planHorizonMonths: Math.max(planHorizonMonths, 12),
    },
    { enabled: selectedInitiativeIds.size > 0 }
  );
  const valueEnv  = valueEnvWithIdsQ.data as any;
  const netLow    = valueEnv?.net_value_gbp?.low  ?? null;
  const netHigh   = valueEnv?.net_value_gbp?.high ?? null;
  const netMid    = netLow != null && netHigh != null ? (netLow + netHigh) / 2 : null;
  // Value-gating rule (brief 1b): gate whenever the calculation can't produce a credible positive value.
  // Trigger conditions:
  //   • Midpoint is negative
  //   • Upper bound (optimistic) is negative or below total cost
  //   • Value field is null/missing
  //   • Lower bound is more than 2× total cost negative (suggests a calculation error)
  const valueGated = (
    netMid == null ||
    netMid < 0 ||
    (netHigh != null && netHigh < 0) ||
    (netLow != null && totalCostHigh > 0 && netLow < -(totalCostHigh * 2))
  );

  // Review cadence
  const structuredInputs = useMemo(() => {
    try { return JSON.parse(strategyData?.structuredInputsJson ?? "{}"); } catch { return {}; }
  }, [strategyData?.structuredInputsJson]);
  const cadenceId   = structuredInputs?.measurement_cadence as string | undefined;
  const nextReview  = strategyData?.ambitionTargetDate ?? null;
  const daysToReview = daysUntil(nextReview);
  const isReviewOverdue = daysToReview != null && daysToReview <= 0 && !!cadenceId;

  // Updated by
  const savedAt      = strategyData?.strategySavedAt;
  const savedByName  = user ? ((user.firstName || user.lastName)
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
    : user.email)
    : null;
  const savedByFirst = savedByName?.split(" ")[0] ?? savedByName;

  // Sector label
  const sectorLabel = SECTORS.find(s => s.value === (orgContext?.sector ?? companyResults?.companySector))?.label ?? "";

  // Capability
  const overallTarget = useMemo(() => AMBITION_TIER_BASE[businessLevel] ?? 55, [businessLevel]);
  const hrNow    = ambitionGap?.functionAvgRaw != null ? formatScore(ambitionGap.functionAvgRaw) : null;
  const hrTarget = formatScore(overallTarget);
  const hrGap    = hrNow != null ? formatScoreDelta(overallTarget - ambitionGap!.functionAvgRaw!) : null;

  // Strategy hash for talking points stale detection
  const strategyHash = useMemo(() => {
    const ids = Array.from(selectedInitiativeIds).sort().join(",");
    return btoa(`${ids}|${businessLevel}|${peopleLevel}`).slice(0, 32);
  }, [selectedInitiativeIds, businessLevel, peopleLevel]);

  // ── Post-flow summary card data ─────────────────────────────────────────
  const pfPrinciples = (ambitionSectionsQ.data?.principles ?? []) as Array<{ title: string; description: string }>;
  const pfWontDo     = (ambitionSectionsQ.data?.wontDo ?? []) as Array<{ text: string }>;
  const pfOutcomes   = (ambitionSectionsQ.data?.outcomes ?? []) as Array<{ title: string; unit: string; target_value: number; target_date: string }>;
  const pfCadence    = cadenceId; // reuse existing derivation
  const pfCapability = capabilityQ.data as {
    skills: { current: number; needed: number };
    capacity: { current: number; needed: number };
    changeReadiness: { current: number; needed: number };
    vendorEcosystem: { current: number; needed: number };
  } | null;
  const pfArchetype  = gate.strategyArchetype;
  const pfStatement  = gate.strategyStatement;
  // Phase breakdown for post-flow plan card
  const pfPhases = useMemo(() => {
    const counts: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    for (const init of selectedInits) {
      const p = assignPhase(init);
      if (p in counts) counts[p]++;
    }
    return counts;
  }, [selectedInits]);
  // Top 3 initiatives by name for post-flow plan card
  const pfTopInits = selectedInits.slice(0, 3).map((i: any) => i.name ?? i.id);
  const pfInitExtra = Math.max(0, selectedInitiativeIds.size - 3);
  // Capability gap status for post-flow card
  const CAP_DIM_LABELS: Record<string, string> = {
    skills: "Skills", capacity: "Capacity",
    changeReadiness: "Change readiness", vendorEcosystem: "Vendor ecosystem",
  };
  const pfCapDims = pfCapability
    ? (["skills", "capacity", "changeReadiness", "vendorEcosystem"] as const).map(k => ({
        key: k,
        label: CAP_DIM_LABELS[k],
        current: pfCapability[k]?.current ?? 0,
        needed:  pfCapability[k]?.needed  ?? 0,
        gap:     (pfCapability[k]?.needed ?? 0) - (pfCapability[k]?.current ?? 0),
      }))
    : [];

  const isLoading   = strategyQ.isLoading || strategyAssessmentQ.isLoading;
  const hasStrategy = (strategyData?.configured ?? false) as boolean;

  // Telemetry on mount
  useEffect(() => {
    if (!isLoading) {
      (window as any).umami?.track("strategy.dashboard.viewed", {
        ambitionTier: businessLevel,
        capabilityToday: hrNow,
        capabilityRequired: hrTarget,
        valueGated,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Value gating telemetry
  useEffect(() => {
    if (valueGated) { (window as any).umami?.track("strategy.value.gated"); }
  }, [valueGated]);

  function handleExportBoardPack() {
    (window as any).umami?.track("strategy.export.clicked");
    window.open("/api/pdf/board_pack", "_blank", "noopener,noreferrer");
  }
  function handleExportStrategicFraming() {
    (window as any).umami?.track("strategy.export.framing.clicked");
    window.open("/api/pdf/strategic_framing", "_blank", "noopener,noreferrer");
  }
  function handleEditStrategy() {
    (window as any).umami?.track("strategy.edit.clicked");
    navigate("/strategy/principles");
  }
  function handleBuildCapability() {
    (window as any).umami?.track("strategy.capability.build-clicked");
    navigate("/assessment");
  }
  function handleReviewOverdueClick() {
    (window as any).umami?.track("strategy.review.scheduled-clicked");
    toast.info("Review scheduling coming soon");
  }

  // ── Context line ─────────────────────────────────────────────────────────
  const contextParts: string[] = [];
  if (sectorLabel) contextParts.push(sectorLabel);
  // Context strip copy: "Transformative ambition" (not just "Transformative"), "HR as innovator" (singular)
  if (bLevel)      contextParts.push(`${bLevel.label} ambition`);
  if (pLevel) {
    // Singular form: strip trailing 's' from plural persona labels (Innovators → innovator, Champions → champion)
    const singularLabel = pLevel.label.replace(/s$/i, "").toLowerCase();
    contextParts.push(`HR as ${singularLabel}`);
  }
  if (savedAt) {
    // Include year throughout — strategy documents reference a planning period; year-free dates obscure document vintage
    const dateStr = new Date(savedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    // Full name for strategic document attribution
    contextParts.push(`Updated ${dateStr}${savedByName ? ` by ${savedByName}` : ""}`);
  }
  const contextLine = contextParts.join(" · ");

  // ── Hero supporting line ─────────────────────────────────────────────────
  const initCount = selectedInitiativeIds.size;
  const valueClause = valueGated
    ? "Value calculation pending Finance review."
    : netMid != null
    ? `Worth around ${fmtMidpoint(netLow!, netHigh!)} to the business (rough estimate).`
    : null;
  const heroSupportingLine = initCount > 0
    ? `${initCount} initiative${initCount !== 1 ? "s" : ""} over the next 18 months.${valueClause ? ` ${valueClause}` : ""}`
    : null;

  // ── Card 1: Ambition (list-style) ────────────────────────────────────────────
  const ambitionAccent = "#2DD4BF";
  const ambitionItems  = commitments.slice(0, 3);
  const ambitionExtra  = Math.max(0, commitments.length - 3);
  const ambitionTierTag = AMBITION_TIER_PLAIN[businessLevel] ?? "";
  // Change 6: eyebrow for ambition card
  const ambitionEyebrow = "BY FY27 · 18 MONTHS";
  // Change 7: outcomes from Ambition page (hardcoded from default outcomes)
  const ambitionOutcomeRows: OutcomeRow[] = hasStrategy ? [
    { label: "Admin time per hire", from: "6h", to: "3h" },
    { label: "HR at AI Practitioner level", from: "22%", to: "85%" },
    { label: "Employee trust in HR's AI use", from: "48%", to: "80%" },
  ] : [];
  const ambitionOutcomeExtra = hasStrategy ? 1 : 0;

  // ── Card 2: Plan (list-style) ────────────────────────────────────────────
  const planAccent  = "#A78BFA";
  const planItems   = selectedInits.slice(0, 3).map((i: any) => i.name ?? i.id);
  const planExtra   = Math.max(0, selectedInitiativeIds.size - 3);
  const planTierTag = selectedInitiativeIds.size > 0
    ? `${selectedInitiativeIds.size} initiative${selectedInitiativeIds.size !== 1 ? "s" : ""} · 18 months`
    : "";
  // Change 6: eyebrow for plan card
  const planEyebrow = selectedInitiativeIds.size > 0
    ? `${selectedInitiativeIds.size} INITIATIVE${selectedInitiativeIds.size !== 1 ? "S" : ""} · 18 MONTHS`
    : "";

  // ── Card 3: Cost (value-style) ───────────────────────────────────────────
  const costAccent   = "#F59E0B";
  const costHeadline = totalCostLow > 0 ? fmtMidpoint(totalCostLow, totalCostHigh).replace(/k/g, "K") : "";
  const costSubLine  = totalCostLow > 0
    ? `between ${fmt(totalCostLow).replace(/k/g, "K")} and ${fmt(totalCostHigh).replace(/k/g, "K")} · over 3 years${frameworkCount > 0 ? ` · affected by ${frameworkCount} compliance rule${frameworkCount !== 1 ? "s" : ""}` : ""}`
    : "";
  const costIsEmpty  = totalCostLow === 0;
  // Change 6: eyebrow for cost card
  const costEyebrow = totalCostLow > 0 ? `${fmtMidpoint(totalCostLow, totalCostHigh).replace("~", "").trim()} INVESTMENT · 3 YRS` : "";

  // ── Card 4: Value (value-style) ───────────────────────────────────────────
  // Change 8: canonical green accent for value card
  const valueAccent   = "#34d399";
  const valueHeadline = valueGated
    ? "Value calculation needs Finance review"
    : netMid != null
    ? fmtMidpoint(netLow!, netHigh!)
    : "";
  const valueSubLine = valueGated
    ? "Value model produced a non-credible result — confirm cost and value assumptions with Finance before presenting."
    : netLow != null && netHigh != null
    ? `between ${fmt(netLow)} and ${fmt(netHigh)} · over 3 years · estimated, finance to confirm`
    : "";
  const valueIsEmpty = netMid == null && !valueGated;

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!isLoading && !hasStrategy) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-8 h-8 dark:text-blue-400 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Build your HR AI Strategy</h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          You haven&apos;t set up a strategy yet. Run the strategy wizard to define your ambition, select initiatives, and generate your board-ready strategy.
        </p>
        <Button onClick={() => navigate("/strategy/diagnostic")} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Sparkles className="w-4 h-4 mr-2" />
          Build strategy
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-5xl mx-auto pb-16 px-0">

        {/* ══ PAGE HEADER (Change 1) ════════════════════════════════════════ */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-8 pt-2">
          {/* Left: H2 title + subtitle + meta */}
          <div className="flex flex-col gap-0.5 min-w-0">
            {/* H2 title with 7px teal dot */}
            <div className="flex items-center gap-2">
              <span
                style={{ width: 7, height: 7, borderRadius: "50%", background: "#5DCAA5", flexShrink: 0, display: "inline-block" }}
                aria-hidden="true"
              />
              <h2 style={{ fontSize: 20, fontWeight: 500, color: "var(--foreground)", lineHeight: 1.2 }}>HR AI Strategy</h2>
            </div>
            {/* Subtitle: accent terms in #cfd2d8, separators in #4a5160 */}
            {isLoading ? (
              <Skeleton className="h-3.5 w-72 rounded mt-1" />
            ) : (
              <p className="text-[12px] leading-snug mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {[sectorLabel, bLevel && `${bLevel.label} ambition`, pLevel && `HR as ${pLevel.label.replace(/s$/i, "").toLowerCase()}`]
                  .filter(Boolean)
                  .map((part, i, arr) => (
                    <React.Fragment key={i}>
                      <span style={{ color: "var(--foreground)" }}>{part}</span>
                      {i < arr.length - 1 && <span style={{ color: "var(--muted-foreground)" }}> · </span>}
                    </React.Fragment>
                  ))}
              </p>
            )}
            {/* Meta line: Updated [date] by [user] */}
            {savedAt && (
              <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                Updated {new Date(savedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                {savedByName ? ` by ${savedByName}` : ""}
              </p>
            )}
            {/* Review overdue pill */}
            {isReviewOverdue && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 w-fit rounded-full px-2 py-[2px] text-[11px] font-medium dark:bg-amber-500/15 bg-amber-100/80 dark:text-amber-300 text-amber-700 hover:bg-amber-500/25 transition-colors mt-1"
                    onClick={handleReviewOverdueClick}
                    aria-label="Review overdue — schedule now"
                  >
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    Review overdue · schedule
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Strategy review is overdue. Click to schedule.
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {/* Right: action buttons (unchanged styling) */}
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs border-border text-foreground hover:bg-foreground/8"
              onClick={handleEditStrategy}
            >
              <Pencil className="w-3 h-3 mr-1.5" />
              Edit strategy
            </Button>
            {gate.stage4Cleared && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs border-border text-foreground hover:bg-foreground/8"
                onClick={handleExportStrategicFraming}
              >
                <Download className="w-3 h-3 mr-1.5" />
                Export framing
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs border-border text-foreground hover:bg-foreground/8"
              onClick={handleExportBoardPack}
            >
              <Download className="w-3 h-3 mr-1.5" />
              Export for the board
            </Button>
          </div>
        </div>

        {/* ══ V3 GATE FLOW STRIP ══════════════════════════════════════════════════ */}
        <GateFlowStrip />
        {/* ══ HERO BLOCK (Changes 2+3) ══════════════════════════════════════════ */}
        <div className="mb-8">
          {isLoading ? (
            <div className="space-y-3 mb-4">
              <Skeleton className="h-6 w-full rounded" />
              <Skeleton className="h-6 w-4/5 rounded" />
              <Skeleton className="h-6 w-3/4 rounded" />
              <Skeleton className="h-4 w-2/3 rounded mt-2" />
            </div>
          ) : (
            <>
              {/* Change 2: Strategic summary callout */}
              {heroSupportingLine && (() => {
                // Parse the supporting line to highlight "N initiatives" and "£X.XM"
                const line = heroSupportingLine;
                const parts: React.ReactNode[] = [];
                // Match pattern: "N initiatives" and "£X.XM" and "(rough estimate)"
                const regex = /(\d+ initiatives?|£[\d.,]+[KMBkm]?(?:\s*[KMBkm])?|\(rough estimate\))/g;
                let last = 0;
                let m: RegExpExecArray | null;
                while ((m = regex.exec(line)) !== null) {
                  if (m.index > last) parts.push(line.slice(last, m.index));
                  const match = m[0];
                  if (match.startsWith("(")) {
                    parts.push(<em key={m.index} style={{ fontStyle: "italic", fontSize: 12, color: "var(--muted-foreground)" }}>{match}</em>);
                  } else {
                    parts.push(<span key={m.index} style={{ color: "#5DCAA5", fontWeight: 500 }}>{match}</span>);
                  }
                  last = m.index + match.length;
                }
                if (last < line.length) parts.push(line.slice(last));
                return (
                  <div
                    className="mb-4"
                    style={{
                      background: "rgba(93,202,165,0.04)",
                      borderLeft: "2px solid rgba(93,202,165,0.5)",
                      borderRadius: "0 6px 6px 0",
                      padding: "0.65rem 0.9rem",
                      fontSize: 14,
                      fontWeight: 400,
                      color: "var(--foreground)",
                      lineHeight: 1.5,
                    }}
                  >
                    {parts}
                  </div>
                );
              })()}

              {/* Change 3: Vision in a card */}
              <div
                className="rounded-[10px] mb-4"
                style={{
                  background: "rgba(255,255,255,0.015)",
                  border: "0.5px solid rgba(255,255,255,0.08)",
                  padding: "0.95rem 1rem",
                }}
              >
                {/* VISION STATEMENT eyebrow + edit pencil */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    style={{
                      fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
                      color: "var(--muted-foreground)", fontWeight: 600,
                    }}
                  >
                    Vision Statement
                  </span>
                  <button
                    onClick={() => setVisionModalOpen(true)}
                    className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/8 transition-colors"
                    aria-label="Edit vision statement"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
                {/* Caption */}
                <p className="text-[11px] mb-2" style={{ color: "var(--muted-foreground)" }}>
                  AI-drafted ·{" "}
                  <button
                    className="underline underline-offset-2 hover:no-underline"
                    style={{ color: "var(--muted-foreground)" }}
                    onClick={() => navigate("/strategy/principles")}
                  >
                    Edit to make it yours
                  </button>
                  {" "}— your words will anchor the CEO talking points below.
                </p>
                {/* Vision quote (no left bar — card provides the frame) */}
                {displayVision ? (
                  <VisionQuote text={displayVision} onReadMore={() => navigate("/strategy/principles")} />
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No vision set yet —{" "}
                    <button className="underline underline-offset-2 hover:no-underline" onClick={() => navigate("/strategy/principles")}>
                      define your strategy ambition first
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* ══ CAPABILITY SECTION ═══════════════════════════════════════════════ */}
        <CapabilityBridge
          hrNow={hrNow}
          hrTarget={hrTarget}
          hrGap={hrGap}
          hasAmbition={hasStrategy}
          isLoading={ambitionGapQ.isLoading}
          onBuildCapability={handleBuildCapability}
          teamLabel={modeLabels.teamLabel}
        />

        {/* ══ STRATEGY CARDS — 2×2 GRID (mid-flow, hidden after Stage 8 cleared) ═════ */}
        {!gate.stage8Cleared && (
          <div
            className="grid grid-cols-2 gap-3 mb-8"
            role="list"
            aria-label="Strategy sections"
          >
          {/* Card 1 — Where we're going */}
          <div role="listitem">
            {isLoading ? <CardSkeleton /> : (
              <ListCard
                accentColor={ambitionAccent}
                eyebrow={ambitionEyebrow}
                eyebrowColor="var(--primary)"
                title="Where we're going"
                tierTag={ambitionTierTag}
                items={ambitionItems}
                extraCount={ambitionExtra}
                footerLink="/strategy/principles"
                footerLabel="See full ambition"
                emptyMessage="No commitments set yet — define your strategy ambition."
                emptyCta="Go to ambition wizard →"
                emptyCtaHref="/strategy/principles"
                onNavigate={navigate}
                onCardClick={() => {
                  (window as any).umami?.track("strategy.card.clicked", { card: "ambition" });
                  navigate("/strategy/principles");
                }}
                outcomeRows={ambitionOutcomeRows}
                outcomeExtra={ambitionOutcomeExtra}
              />
            )}
          </div>
          {/* Card 2 — How we get there */}
          <div role="listitem">
            {isLoading || initiativesQ.isLoading ? <CardSkeleton /> : (
              <ListCard
                accentColor={planAccent}
                eyebrow={planEyebrow}
                eyebrowColor="#b9a6f5"
                title="How we get there"
                tierTag={planTierTag}
                items={planItems}
                extraCount={planExtra}
                footerLink="/strategy/roadmap/detail"
                footerLabel="See the full plan"
                emptyMessage="No initiatives defined yet — build your plan."
                emptyCta="Go to plan flow →"
                emptyCtaHref="/strategy/roadmap/detail"
                onNavigate={navigate}
                onCardClick={() => {
                  (window as any).umami?.track("strategy.card.clicked", { card: "plan" });
                  navigate("/strategy/roadmap/detail");
                }}
              />
            )}
          </div>
          {/* Card 3 — What it costs */}
          <div role="listitem">
            {isLoading ? <CardSkeleton /> : (
              <ValueCard
                accentColor={costAccent}
                eyebrow={costEyebrow}
                eyebrowColor="#fbbf24"
                title="What it costs"
                headline={costHeadline}
                subLine={costSubLine}
                footerLink="/strategy/business-case"
                footerLabel="See the business case"
                emptyMessage="Cost not estimated yet — work through the plan."
                emptyCta="Go to plan →"
                emptyCtaHref="/strategy/roadmap/detail"
                isEmpty={costIsEmpty}
                onNavigate={navigate}
                onCardClick={() => {
                  (window as any).umami?.track("strategy.card.clicked", { card: "cost" });
                  navigate("/strategy/business-case");
                }}
              />
            )}
          </div>
          {/* Card 4 — What this is worth */}
          <div role="listitem">
            {isLoading || (valueEnvWithIdsQ.isLoading && selectedInitiativeIds.size > 0) ? <CardSkeleton /> : (
              <ValueCard
                accentColor={valueAccent}
                eyebrow={!valueIsEmpty ? (netMid != null ? fmtMidpoint(netLow!, netHigh!).replace("~", "").trim() : "") + " VALUE · 3 YRS" : ""}
                eyebrowColor="#6ee7b7"
                title="What this is worth"
                headline={valueHeadline}
                subLine={valueSubLine}
                footerLink="/strategy/business-case"
                footerLabel="See the business case"
                emptyMessage="Value not estimated yet — work through the plan."
                emptyCta="Go to plan →"
                emptyCtaHref="/strategy/roadmap/detail"
                isEmpty={valueIsEmpty}
                onNavigate={navigate}
                onCardClick={() => {
                  (window as any).umami?.track("strategy.card.clicked", { card: "value" });
                  navigate("/strategy/business-case");
                }}
              />
            )}
          </div>
          {/* Card 5 — Strategy draft (full-width) */}
          <div role="listitem" className="col-span-2">
            <div
              className="rounded-xl border border-border/60 bg-card p-4 cursor-pointer hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group"
              onClick={() => navigate("/strategy/draft")}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/strategy/draft"); } }}
              aria-label="Strategy draft"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium tracking-[0.08em] uppercase text-violet-400">Strategy document</p>
                  <p className="text-sm font-semibold text-foreground">Strategy draft</p>
                  <p className="text-xs text-muted-foreground/60">A 4–6 page narrative in your voice — generate, edit, and export.</p>
                </div>
                <span className="text-xs text-violet-400 group-hover:translate-x-0.5 transition-transform">Open →</span>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* ══ POST-FLOW SUMMARY CARDS (5-card layout, shown once Stage 8 cleared) ════ */}
        {gate.stage8Cleared && (
          <div className="space-y-4 mb-8">
            {/* ── Row 1: The Strategy (full-width) ── */}
            <div
              className="rounded-xl border border-border/60 bg-card p-5 cursor-pointer hover:border-violet-500/30 transition-all group"
              onClick={() => navigate("/strategy/principles?from=dashboard")}
              role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/strategy/principles?from=dashboard"); } }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-violet-400 mb-1">The Strategy</p>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {pfArchetype && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">
                        {pfArchetype.charAt(0).toUpperCase() + pfArchetype.slice(1)}
                      </span>
                    )}
                    {pfPrinciples.length > 0 && (
                      <span className="text-xs text-muted-foreground">{pfPrinciples.length} principle{pfPrinciples.length !== 1 ? "s" : ""}</span>
                    )}
                    {pfWontDo.length > 0 && (
                      <span className="text-xs text-muted-foreground">{pfWontDo.length} won&apos;t-do</span>
                    )}
                  </div>
                  {pfStatement ? (
                    <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">{pfStatement}</p>
                  ) : displayVision ? (
                    <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2 italic">{displayVision}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No strategy statement yet</p>
                  )}
                </div>
                <span className="text-xs text-violet-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-1">Deep dive →</span>
              </div>
            </div>

            {/* ── Row 2: Plan + Numbers (2-col) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* The Plan */}
              <div
                className="rounded-xl border border-border/60 bg-card p-5 cursor-pointer hover:border-violet-500/30 transition-all group"
                onClick={() => navigate("/strategy/builder?from=dashboard")}
                role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/strategy/builder?from=dashboard"); } }}
              >
                <p className="text-[10px] font-semibold tracking-widest uppercase text-violet-400 mb-2">The Plan</p>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-2xl font-bold text-foreground">{selectedInitiativeIds.size}</span>
                  <span className="text-xs text-muted-foreground">initiative{selectedInitiativeIds.size !== 1 ? "s" : ""}</span>
                </div>
                {/* Phase breakdown */}
                <div className="flex gap-2 mb-3">
                  {(["Q1","Q2","Q3","Q4"] as const).map(q => pfPhases[q] > 0 && (
                    <div key={q} className="flex items-center gap-1">
                      <span className="text-[10px] font-medium text-muted-foreground">{q}</span>
                      <span className="text-[10px] font-semibold text-foreground">{pfPhases[q]}</span>
                    </div>
                  ))}
                </div>
                {/* Top 3 initiatives */}
                <div className="space-y-1">
                  {pfTopInits.map((name: string, i: number) => (
                    <p key={i} className="text-xs text-foreground/70 truncate">{name}</p>
                  ))}
                  {pfInitExtra > 0 && (
                    <p className="text-xs text-muted-foreground">+{pfInitExtra} more</p>
                  )}
                </div>
                <span className="text-xs text-violet-400 group-hover:translate-x-0.5 transition-transform block mt-3">Deep dive →</span>
              </div>

              {/* The Numbers */}
              <div
                className="rounded-xl border border-border/60 bg-card p-5 cursor-pointer hover:border-amber-500/30 transition-all group"
                onClick={() => navigate("/strategy/business-case?from=dashboard")}
                role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/strategy/business-case?from=dashboard"); } }}
              >
                <p className="text-[10px] font-semibold tracking-widest uppercase text-amber-400 mb-2">The Numbers</p>
                {!costIsEmpty ? (
                  <>
                    <div className="mb-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Investment</p>
                      <p className="text-lg font-bold text-foreground">{costHeadline}</p>
                      <p className="text-xs text-muted-foreground">{fmt(totalCostLow).replace(/k/g,"K")} – {fmt(totalCostHigh).replace(/k/g,"K")} · 3 yrs</p>
                    </div>
                    {!valueIsEmpty && netMid != null && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Value</p>
                        <p className="text-lg font-bold text-emerald-400">{fmtMidpoint(netLow!, netHigh!)}</p>
                        <p className="text-xs text-muted-foreground">{fmt(netLow!)} – {fmt(netHigh!)} · 3 yrs</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Cost not estimated yet</p>
                )}
                <span className="text-xs text-amber-400 group-hover:translate-x-0.5 transition-transform block mt-3">Deep dive →</span>
              </div>
            </div>

            {/* ── Row 3: Risks & Capability + Success Measures (2-col) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Risks & Capability */}
              <div
                className="rounded-xl border border-border/60 bg-card p-5 cursor-pointer hover:border-rose-500/30 transition-all group"
                onClick={() => navigate("/strategy/capability?from=dashboard")}
                role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/strategy/capability?from=dashboard"); } }}
              >
                <p className="text-[10px] font-semibold tracking-widest uppercase text-rose-400 mb-2">Risks &amp; Capability</p>
                {/* Top 2 risks */}
                {liveRisks && liveRisks.length > 0 ? (
                  <div className="space-y-1.5 mb-3">
                    {liveRisks.slice(0, 2).map((r: any, i: number) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                          r.severity === "high" ? "bg-rose-500" : r.severity === "medium" ? "bg-amber-400" : "bg-emerald-400"
                        }`} />
                        <p className="text-xs text-foreground/80 leading-tight">{r.title ?? r.id}</p>
                      </div>
                    ))}
                    {liveRisks.length > 2 && (
                      <p className="text-xs text-muted-foreground">+{liveRisks.length - 2} more risks</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic mb-3">Risk assessment not yet run</p>
                )}
                {/* Capability dimensions */}
                {pfCapDims.length > 0 && (
                  <div className="space-y-1">
                    {pfCapDims.map(d => (
                      <div key={d.key} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground truncate">{d.label}</span>
                        <span className={`text-xs font-medium flex-shrink-0 ${
                          d.gap > 1 ? "text-rose-400" : d.gap === 1 ? "text-amber-400" : "text-emerald-400"
                        }`}>
                          {d.current}/{d.needed}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <span className="text-xs text-rose-400 group-hover:translate-x-0.5 transition-transform block mt-3">Deep dive →</span>
              </div>

              {/* Success Measures */}
              <div
                className="rounded-xl border border-border/60 bg-card p-5 cursor-pointer hover:border-teal-500/30 transition-all group"
                onClick={() => navigate("/strategy/measures?from=dashboard")}
                role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/strategy/measures?from=dashboard"); } }}
              >
                <p className="text-[10px] font-semibold tracking-widest uppercase text-teal-400 mb-2">Success Measures</p>
                {pfOutcomes.length > 0 ? (
                  <div className="space-y-1.5 mb-3">
                    {pfOutcomes.slice(0, 3).map((o, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
                        <p className="text-xs text-foreground/80 leading-tight truncate">{o.title}</p>
                      </div>
                    ))}
                    {pfOutcomes.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{pfOutcomes.length - 3} more</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic mb-3">No outcomes defined yet</p>
                )}
                {pfCadence && (
                  <p className="text-xs text-muted-foreground">
                    Review: {pfCadence.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </p>
                )}
                <span className="text-xs text-teal-400 group-hover:translate-x-0.5 transition-transform block mt-3">Deep dive →</span>
              </div>
            </div>
          </div>
        )}

        {/* ══ TALKING POINTS ══════════════════════════════════════════════════════════ */}
        <TalkingPointsBlock
          strategyHash={strategyHash}
          hasStrategy={hasStrategy}
          hasInitiatives={selectedInitiativeIds.size > 0}
        />

        {/* ══ POST-FLOW EXPORTS (shown once Stage 8 is cleared) ═══════════════════════ */}
        {gate.stage8Cleared && (
          <div className="mt-8 rounded-xl border border-border/60 bg-card p-6 space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Exports</span>
            </div>

            {/* Primary deliverable: Board Report */}
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-emerald-500 mb-1">Primary deliverable</p>
                  <p className="text-sm font-semibold text-foreground">{modeLabels.stage10Label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {gate.stage10Cleared
                      ? `Stage 10 confirmed — ready to share with your ${modeLabels.sponsorLabel}.`
                      : `Complete Stage 10 to generate and confirm your ${modeLabels.stage10Label.toLowerCase()}.`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {gate.stage10Cleared ? (
                    <>
                      <button
                        onClick={() => window.open("/api/pdf/board_report", "_blank")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PDF
                      </button>
                      <button
                        onClick={() => window.open("/api/export/board-report-docx", "_blank")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border text-foreground hover:bg-foreground/5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Word
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => navigate(gate.tenantMode === "reward" ? "/strategy/reward-outputs" : "/strategy/board-report")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    >
                      Open {modeLabels.stage10Label} →
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Intermediate artefacts */}
            <div>
              <p className="text-xs text-muted-foreground mb-3">Intermediate artefacts</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleExportStrategicFraming}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border text-foreground hover:bg-foreground/5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Strategic framing one-pager (PDF)
                </button>
                <button
                  onClick={() => window.open("/api/pdf/business_case", "_blank")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border text-foreground hover:bg-foreground/5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Business case intermediate (PDF)
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ══ VISION MODAL ═══════════════════════════════════════════════════════ */}
      <VisionModal
        isOpen={visionModalOpen}
        onClose={() => setVisionModalOpen(false)}
        onSaved={(visionText) => {
          setVisionModalOpen(false);
          strategyAssessmentQ.refetch();
          (window as any).umami?.track("strategy.overview.vision-modal.saved");
          void visionText;
        }}
        initialInputs={(strategyAssessmentQ.data as any)?.visionInputs as VisionInputs | null | undefined}
        initialDraft={displayVision}
        orgDescriptor={[
          companyResults?.companyName,
          sectorLabel || null,
          orgContext?.headcount ? `${Number(orgContext.headcount).toLocaleString()} employees` : null,
        ].filter(Boolean).join(" · ") || null}
        companyName={companyResults?.companyName ?? null}
        capabilityScore={companyResults?.overallScore ?? null}
        capabilityLabel={companyResults?.maturityLabel ?? null}
        capabilityCount={companyResults ? 1 : null}
      />

    </TooltipProvider>
  );
}
