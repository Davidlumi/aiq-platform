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
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock, Pencil, Download, ArrowRight,
  MessageCircle, ChevronDown, ChevronUp,
  Copy, RefreshCw, Check, AlertTriangle, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatGbp as fmt, formatGbpMidpoint as fmtMidpoint } from "@/lib/format";

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
      className="border-l-[3px] pl-7 mb-4 max-w-3xl"
      style={{ borderColor: "var(--color-text-info, hsl(var(--primary)))" }}
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
}
function CapabilityBridge({ hrNow, hrTarget, hrGap, hasAmbition, isLoading, onBuildCapability }: CapabilityBridgeProps) {
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
          WHAT HR NEEDS TO BE ABLE TO DO
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-3 text-xs gap-1.5 flex-shrink-0 border-white/20 text-foreground hover:bg-white/8"
          onClick={onBuildCapability}
          aria-label={nowNum == null ? "Take the assessment" : "Build capability"}
        >
          {nowNum == null ? "Take the assessment" : "Build capability"}
          <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </Button>
      </div>

      {/* Bridge */}
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
          {/* Middle — Bar */}
          <div className="flex-1 min-w-[100px] flex flex-col gap-1">
            <div
              className="relative h-[4px] rounded-sm w-full bg-background"
              role="progressbar"
              aria-valuenow={nowNum}
              aria-valuemin={0}
              aria-valuemax={10}
              aria-valuetext={`${hrNow} of 10, target ${hrTarget}`}
            >
              {/* Current fill */}
              <div
                className="absolute left-0 top-0 h-full rounded-sm bg-foreground"
                style={{ width: `${Math.min(nowNum * 10, 100)}%` }}
              />
              {/* Gap fill */}
              <div
                className="absolute top-0 h-full bg-primary opacity-60"
                style={{
                  left: `${Math.min(nowNum * 10, 100)}%`,
                  width: `${Math.max(0, Math.min((targetNum - nowNum) * 10, 100 - nowNum * 10))}%`,
                }}
              />
              {/* Target marker */}
              <div
                className="absolute top-[-3px] bottom-[-3px] w-[2px] rounded-sm bg-primary"
                style={{ left: `${Math.min(targetNum * 10, 100)}%` }}
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
    <div className="rounded-xl border border-white/8 bg-background p-5 space-y-3 min-h-[180px]">
      <Skeleton className="h-4 w-1/2 rounded" />
      <Skeleton className="h-3 w-full rounded" />
      <Skeleton className="h-3 w-4/5 rounded" />
      <Skeleton className="h-3 w-3/5 rounded" />
      <Skeleton className="h-3 w-2/3 rounded mt-2" />
    </div>
  );
}

// ─── List Card (cards 1 & 2) ──────────────────────────────────────────────────
interface ListCardProps {
  accentColor: string;
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
}
function ListCard({ accentColor, title, tierTag, items, extraCount, footerLink, footerLabel, emptyMessage, emptyCta, emptyCtaHref, onNavigate, onCardClick }: ListCardProps) {
  return (
    <div
      className="rounded-xl border border-white/10 bg-background flex flex-col cursor-pointer hover:border-white/20 transition-all duration-150"
      style={{ borderTop: `2px solid ${accentColor}`, padding: "1.25rem" }}
      onClick={onCardClick}
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCardClick(); } }}
      role="article"
    >
      {/* Title row */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-[14px] font-medium text-foreground">{title}</h3>
        {tierTag && (
          <span className="text-[10px] font-bold uppercase tracking-wide flex-shrink-0" style={{ color: accentColor }}>
            {tierTag}
          </span>
        )}
      </div>
      {/* Body */}
      {items.length === 0 ? (
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
      {items.length > 0 && (
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
function ValueCard({ accentColor, title, headline, subLine, footerLink, footerLabel, emptyMessage, emptyCta, emptyCtaHref, isEmpty, onNavigate, onCardClick }: ValueCardProps) {
  return (
    <div
      className="rounded-xl border border-white/10 bg-background flex flex-col cursor-pointer hover:border-white/20 transition-all duration-150"
      style={{ borderTop: `2px solid ${accentColor}`, padding: "1.25rem" }}
      onClick={onCardClick}
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCardClick(); } }}
      role="article"
    >
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
        className="rounded-xl mb-8 px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/3 transition-colors"
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
            className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/3 transition-colors rounded-xl"
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
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
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
              <div className="flex flex-wrap items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
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
            {/* Bullets */}
            <div className="space-y-3" role="list" aria-label="CEO talking points">
              {(tpQ.isLoading || generateMut.isPending) ? (
                [1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex flex-col gap-1">
                    <Skeleton className="h-2.5 w-20 rounded" />
                    <div className="flex items-start gap-2">
                      <Skeleton className="h-1.5 w-1.5 rounded-full mt-2 flex-shrink-0" />
                      <Skeleton className="h-4 w-full rounded" />
                    </div>
                  </div>
                ))
              ) : data?.bullets?.length ? (
                data.bullets.map((bullet, idx) => {
                  const TP_CATEGORIES = ["Vision", "Ambition", "Capability gap", "Financial impact", "Strategic dependency"];
                  const categoryLabel = TP_CATEGORIES[idx];
                  return (
                    <div key={idx} role="listitem" className="group flex flex-col gap-0.5">
                      {/* Category label — tertiary text, makes coverage visible */}
                      {categoryLabel && (
                        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50 pl-[18px]">
                          {categoryLabel}
                        </span>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" aria-hidden="true" />
                        {editingIdx === idx ? (
                          <div className="flex-1 flex flex-col gap-1.5">
                            <Textarea
                              ref={editRef}
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="text-sm min-h-[60px] bg-white/5 border-white/15 resize-none"
                              onKeyDown={e => {
                                if (e.key === "Escape") cancelEdit();
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(idx); }
                              }}
                            />
                            <div className="flex gap-1.5">
                              <Button size="sm" className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => saveEdit(idx)}>Save</Button>
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={cancelEdit}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-start justify-between gap-2 min-w-0">
                            <p className="text-sm text-foreground leading-relaxed">{bullet}</p>
                            <button
                              className="opacity-0 group-hover:opacity-100 focus:opacity-100 flex-shrink-0 p-1 rounded hover:bg-white/8 text-muted-foreground hover:text-foreground transition-opacity"
                              onClick={() => startEdit(idx)}
                              aria-label={`Edit bullet ${idx + 1}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No talking points yet. Click Regenerate to generate them.</p>
              )}
            </div>
            {generateMut.isError && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function StrategyOverviewPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

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
  const valueEnvQ           = trpc.intelligence.calculateValueEnvelope.useQuery(
    { selectedInitiativeIds: [] },
    { enabled: false }
  );
  const [liveRisks, setLiveRisks] = useState<any[] | null>(null);
  const evaluateRiskMut     = trpc.intelligence.evaluateRiskRules.useMutation();

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
  const hrNow    = ambitionGap?.functionAvgRaw != null ? (ambitionGap.functionAvgRaw / 10).toFixed(1) : null;
  const hrTarget = (overallTarget / 10).toFixed(1);
  const hrGap    = hrNow != null ? ((overallTarget - ambitionGap!.functionAvgRaw!) / 10).toFixed(1) : null;

  // Strategy hash for talking points stale detection
  const strategyHash = useMemo(() => {
    const ids = Array.from(selectedInitiativeIds).sort().join(",");
    return btoa(`${ids}|${businessLevel}|${peopleLevel}`).slice(0, 32);
  }, [selectedInitiativeIds, businessLevel, peopleLevel]);

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
  function handleEditStrategy() {
    (window as any).umami?.track("strategy.edit.clicked");
    navigate("/strategy/ambition");
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

  // ── Card 1: Ambition (list-style) ────────────────────────────────────────
  const ambitionAccent = "#2DD4BF";
  const ambitionItems  = commitments.slice(0, 3);
  const ambitionExtra  = Math.max(0, commitments.length - 3);
  const ambitionTierTag = AMBITION_TIER_PLAIN[businessLevel] ?? "";

  // ── Card 2: Plan (list-style) ────────────────────────────────────────────
  const planAccent  = "#A78BFA";
  const planItems   = selectedInits.slice(0, 3).map((i: any) => i.name ?? i.id);
  const planExtra   = Math.max(0, selectedInitiativeIds.size - 3);
  const planTierTag = selectedInitiativeIds.size > 0
    ? `${selectedInitiativeIds.size} initiative${selectedInitiativeIds.size !== 1 ? "s" : ""} · 18 months`
    : "";

  // ── Card 3: Cost (value-style) ───────────────────────────────────────────
  const costAccent   = "#F59E0B";
  const costHeadline = totalCostLow > 0 ? fmtMidpoint(totalCostLow, totalCostHigh) : "";
  const costSubLine  = totalCostLow > 0
    ? `between ${fmt(totalCostLow)} and ${fmt(totalCostHigh)} · over 3 years${frameworkCount > 0 ? ` · affected by ${frameworkCount} compliance rule${frameworkCount !== 1 ? "s" : ""}` : ""}`
    : "";
  const costIsEmpty  = totalCostLow === 0;

  // ── Card 4: Value (value-style) ──────────────────────────────────────────
  const valueAccent   = "#22C55E";
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
          <Sparkles className="w-8 h-8 text-blue-400" />
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

        {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-8 pt-2">
          {/* Left: context line + review overdue pill */}
          <div className="flex flex-col gap-1.5 min-w-0">
            {isLoading ? (
              <Skeleton className="h-4 w-72 rounded" />
            ) : (
              <p className="text-[12px] text-muted-foreground leading-snug">{contextLine}</p>
            )}
            {isReviewOverdue && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 w-fit rounded-full px-2 py-[2px] text-[11px] font-medium bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-colors"
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
          {/* Right: action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs border-white/15 text-foreground hover:bg-white/8"
              onClick={handleEditStrategy}
            >
              <Pencil className="w-3 h-3 mr-1.5" />
              Edit strategy
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs border-white/15 text-foreground hover:bg-white/8"
              onClick={handleExportBoardPack}
            >
              <Download className="w-3 h-3 mr-1.5" />
              Export for the board
            </Button>
          </div>
        </div>

        {/* ══ HERO BLOCK ════════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-4">HR AI STRATEGY</p>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full rounded" />
              <Skeleton className="h-6 w-4/5 rounded" />
              <Skeleton className="h-6 w-3/4 rounded" />
              <Skeleton className="h-4 w-2/3 rounded mt-2" />
            </div>
          ) : (
            <>
              {displayVision ? (
                <div>
                  <VisionQuote text={displayVision} onReadMore={() => navigate("/strategy/ambition")} />
                  {!userVisionInput && (
                    <p className="text-xs text-muted-foreground mt-2">
                      This vision was AI-drafted.{" "}
                      <button
                        className="underline underline-offset-2 hover:no-underline"
                        onClick={() => navigate("/strategy/ambition")}
                      >
                        Edit it to make it yours
                      </button>
                      {" "}— your words will anchor the CEO talking points.
                    </p>
                  )}
                </div>
              ) : (
                <div className="border-l-[3px] border-primary/40 pl-7 mb-4">
                  <p className="text-sm text-muted-foreground italic">
                    No vision set yet —{" "}
                    <button className="underline underline-offset-2 hover:no-underline" onClick={() => navigate("/strategy/ambition")}>
                      define your strategy ambition first
                    </button>
                  </p>
                </div>
              )}
              {heroSupportingLine && (
                <p className="text-[15px] text-muted-foreground leading-[1.6] max-w-[740px] mt-3">
                  {heroSupportingLine}
                </p>
              )}
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
        />

        {/* ══ STRATEGY CARDS — 2×2 GRID ════════════════════════════════════════ */}
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
                title="Where we're going"
                tierTag={ambitionTierTag}
                items={ambitionItems}
                extraCount={ambitionExtra}
                footerLink="/strategy/ambition"
                footerLabel="See full ambition"
                emptyMessage="No commitments set yet — define your strategy ambition."
                emptyCta="Go to ambition wizard →"
                emptyCtaHref="/strategy/ambition"
                onNavigate={navigate}
                onCardClick={() => {
                  (window as any).umami?.track("strategy.card.clicked", { card: "ambition" });
                  navigate("/strategy/ambition");
                }}
              />
            )}
          </div>
          {/* Card 2 — How we get there */}
          <div role="listitem">
            {isLoading || initiativesQ.isLoading ? <CardSkeleton /> : (
              <ListCard
                accentColor={planAccent}
                title="How we get there"
                tierTag={planTierTag}
                items={planItems}
                extraCount={planExtra}
                footerLink="/strategy/plan"
                footerLabel="See the full plan"
                emptyMessage="No initiatives defined yet — build your plan."
                emptyCta="Go to plan flow →"
                emptyCtaHref="/strategy/plan"
                onNavigate={navigate}
                onCardClick={() => {
                  (window as any).umami?.track("strategy.card.clicked", { card: "plan" });
                  navigate("/strategy/plan");
                }}
              />
            )}
          </div>
          {/* Card 3 — What it costs */}
          <div role="listitem">
            {isLoading ? <CardSkeleton /> : (
              <ValueCard
                accentColor={costAccent}
                title="What it costs"
                headline={costHeadline}
                subLine={costSubLine}
                footerLink="/strategy/investment-risk"
                footerLabel="See the costs"
                emptyMessage="Cost not estimated yet — work through the plan."
                emptyCta="Go to plan →"
                emptyCtaHref="/strategy/plan"
                isEmpty={costIsEmpty}
                onNavigate={navigate}
                onCardClick={() => {
                  (window as any).umami?.track("strategy.card.clicked", { card: "cost" });
                  navigate("/strategy/investment-risk");
                }}
              />
            )}
          </div>
          {/* Card 4 — What this is worth */}
          <div role="listitem">
            {isLoading || (valueEnvWithIdsQ.isLoading && selectedInitiativeIds.size > 0) ? <CardSkeleton /> : (
              <ValueCard
                accentColor={valueAccent}
                title="What this is worth"
                headline={valueHeadline}
                subLine={valueSubLine}
                footerLink="/strategy/value"
                footerLabel="See what this is worth"
                emptyMessage="Value not estimated yet — work through the plan."
                emptyCta="Go to plan →"
                emptyCtaHref="/strategy/plan"
                isEmpty={valueIsEmpty}
                onNavigate={navigate}
                onCardClick={() => {
                  (window as any).umami?.track("strategy.card.clicked", { card: "value" });
                  navigate("/strategy/value");
                }}
              />
            )}
          </div>
        </div>

        {/* ══ TALKING POINTS ═══════════════════════════════════════════════════ */}
        <TalkingPointsBlock
          strategyHash={strategyHash}
          hasStrategy={hasStrategy}
          hasInitiatives={selectedInitiativeIds.size > 0}
        />

      </div>
    </TooltipProvider>
  );
}
