/**
 * StrategyAmbitionPage — Final Build (ambition-page-final-build-brief.md)
 * 4 sections: Vision, Guiding Principles, What We Won't Do, Outcomes
 * Each section: empty (dashed) → drafting (spinner) → built (content + pencil)
 * Edit modals for all 4 sections. Review-date footer.
 */
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Link } from "wouter";
import {
  Pencil, Sparkles, Plus, Trash2, ChevronRight,
  CheckCircle2, Clock, X, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { VisionModal, type VisionInputs } from "./VisionModal";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Principle {
  number: number;
  title: string;
  description: string;
  capability_tags: string[];
  ai_drafted: boolean;
}

interface Exclusion {
  text: string;
  ai_drafted: boolean;
}

interface Outcome {
  number: number;
  title: string;
  unit: string;
  baseline_value: number | null;
  baseline_status: "measured" | "not_measured";
  baseline_study_date: string | null;
  target_value: number;
  target_date: string;
  derived_summary: string;
  tests_principle: number | null;
  ai_drafted: boolean;
}

//// ─── Constants ───────────────────────────────────────────────────────────
// Six canonical capability domains (brief Fix 5)
const CAPABILITY_TAGS = [
  "Output evaluation", "AI interaction", "Ethics & trust",
  "Workflow design", "Workforce readiness", "Change leadership",
];
const BUSINESS_TIER_LABELS: Record<number, string> = {
  1: "Foundational", 2: "Measured", 3: "Bold", 4: "Transformative",
};
const HR_TIER_LABELS: Record<number, string> = {
  1: "AI-aware", 2: "AI-using", 3: "AI-enabled", 4: "Innovator",
};
// Default AI-drafted content (brief Fix 1 §§7–9)
const DEFAULT_PRINCIPLES: Principle[] = [
  { number: 1, title: "Human-in-the-loop on consequential decisions", description: "AI prepares and proposes; humans decide on hiring, promotion, performance, and termination.", capability_tags: ["Output evaluation", "AI interaction"], ai_drafted: true },
  { number: 2, title: "Trust and ethics in deployment", description: "Fairness, bias monitoring, privacy, and explainability are non-negotiable. Employees know when AI is used in decisions affecting them.", capability_tags: ["Ethics & trust"], ai_drafted: true },
  { number: 3, title: "Reshape work, then add AI", description: "We don't bolt AI onto existing HR processes. We redesign the work first, then deploy AI into the new design.", capability_tags: ["Workflow design"], ai_drafted: true },
  { number: 4, title: "Build skills first, deploy second", description: "We build AI literacy across HR before we deploy. The team is ready before the tool lands.", capability_tags: ["Workforce readiness"], ai_drafted: true },
  { number: 5, title: "We deploy at people's pace", description: "AI deployment speed is set by what the workforce can absorb, not by what the technology can do. We won't deploy faster than the team can adopt responsibly. Held by the sequencing of outcomes below — skills and redesign precede deployment.", capability_tags: ["Change leadership"], ai_drafted: true },
];
const DEFAULT_EXCLUSIONS: Exclusion[] = [
  { text: "We will not deploy AI in promotion or termination decisions in this period.", ai_drafted: true },
  { text: "We will not let any vendor's AI make shortlist cuts without HR review.", ai_drafted: true },
  { text: "We will not use generative AI for performance reviews this fiscal year.", ai_drafted: true },
  { text: "We will not deploy frontier AI in HR without a dedicated ethics review.", ai_drafted: true },
  { text: "We will not deploy AI in payroll, benefits, compensation, or HR operations in this period.", ai_drafted: true },
];
const DEFAULT_OUTCOMES: Outcome[] = [
  { number: 1, title: "Reduce admin time per hire", unit: "h", baseline_value: 6, baseline_status: "measured", baseline_study_date: null, target_value: 3, target_date: "Q4 2026", derived_summary: "50% reduction", tests_principle: 3, ai_drafted: true },
  { number: 2, title: "HR team at AI Practitioner level", unit: "%", baseline_value: 22, baseline_status: "measured", baseline_study_date: null, target_value: 85, target_date: "Q4 2026", derived_summary: "~4× growth", tests_principle: 4, ai_drafted: true },
  { number: 3, title: "Hiring decisions with documented human reviewer", unit: "%", baseline_value: null, baseline_status: "not_measured", baseline_study_date: "Q4 2025", target_value: 100, target_date: "Q1 2026", derived_summary: "Baseline study scheduled Q4 2025", tests_principle: 1, ai_drafted: true },
  { number: 4, title: "Employee trust in HR's AI use", unit: "%", baseline_value: 48, baseline_status: "measured", baseline_study_date: null, target_value: 80, target_date: "Q3 2027", derived_summary: "+32 points", tests_principle: 2, ai_drafted: true },
];

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionHeader({
  label, onEdit, onDraft, isDrafting,
}: {
  label: string; onEdit?: () => void; onDraft?: () => void; isDrafting?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center gap-1.5">
        {onDraft && !isDrafting && (
          <Button
            variant="ghost" size="sm"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={onDraft}
          >
            <Sparkles className="w-3 h-3" /> Re-draft
          </Button>
        )}
        {isDrafting && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Drafting…
          </span>
        )}
        {onEdit && (
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onEdit}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptySection({
  label, hint, onDraft, onManual, aiEligible = true,
}: {
  label: string; hint: string; onDraft?: () => void;
  onManual: () => void; aiEligible?: boolean;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 p-6 bg-card/30">
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-3">
        {label}
      </p>
      <p className="text-sm text-muted-foreground mb-4">{hint}</p>
      <div className="flex items-center gap-2">
        {aiEligible && onDraft && (
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={onDraft}>
            <Sparkles className="w-3 h-3" /> Draft with AI
          </Button>
        )}
        <Button
          size="sm" variant="ghost"
          className="gap-1.5 text-xs h-8 text-muted-foreground"
          onClick={onManual}
        >
          <Plus className="w-3 h-3" /> Add manually
        </Button>
      </div>
    </div>
  );
}

function DraftingSection({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-primary/30 p-6 bg-primary/5">
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-3">
        {label}
      </p>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Generating with AI…
      </div>
    </div>
  );
}

// ─── Vision Section ───────────────────────────────────────────────────────────

function VisionSection({
  vision, visionInputs, onOpenModal,
}: {
  vision: string | null;
  visionInputs: VisionInputs | null;
  onOpenModal: () => void;
}) {
  if (!vision) {
    return (
      <EmptySection
        label="Vision Statement"
        hint="Define where your HR function is going with AI — the north star for every initiative."
        onDraft={onOpenModal}
        onManual={onOpenModal}
        aiEligible
      />
    );
  }
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <SectionHeader label="Vision Statement" onEdit={onOpenModal} />
      {/* Serif italic quote per brief */}
      <blockquote
        className="border-l-2 pl-4 text-base italic leading-relaxed text-foreground"
        style={{ borderColor: "#5DCAA5", fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        “{vision}”
      </blockquote>
      {/* Change 6: Assertive vision caption per brief */}
      <div className="mt-3 flex items-start gap-1.5">
        <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#5DCAA5" }} />
        <p style={{ fontSize: 11, color: "#6c7385", lineHeight: 1.5 }}>
          AI-drafted starting point ·{" "}
          <span style={{ color: "#9ca3b0", fontWeight: 500 }}>This becomes your CEO talking points.</span>
          {" "}
          <button
            onClick={onOpenModal}
            style={{
              color: "#7ec9ab",
              textDecoration: "underline",
              textDecorationColor: "rgba(126,201,171,0.3)",
              background: "none", border: "none", cursor: "pointer",
              fontSize: 11, padding: 0,
            }}
          >
            Edit it like it&apos;s going to your CEO — because it is.
          </button>
        </p>
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {visionInputs?.businessAmbitionTier != null && (
          <span
            style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 999,
              border: "0.5px solid rgba(255,255,255,0.12)",
              color: "#9ca3b0", background: "transparent",
            }}
          >
            Business: {BUSINESS_TIER_LABELS[visionInputs.businessAmbitionTier] ?? visionInputs.businessAmbitionTier}
          </span>
        )}
        {visionInputs?.hrDeliveryTier != null && (
          <span
            style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 999,
              border: "0.5px solid rgba(255,255,255,0.12)",
              color: "#9ca3b0", background: "transparent",
            }}
          >
            HR: {HR_TIER_LABELS[visionInputs.hrDeliveryTier] ?? visionInputs.hrDeliveryTier}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Guiding Principles Section ───────────────────────────────────────────────

function PrinciplesSection({
  principles, isDrafting, onEdit, onDraft,
}: {
  principles: Principle[] | null;
  isDrafting: boolean;
  onEdit: () => void;
  onDraft: () => void;
}) {
  if (isDrafting) return <DraftingSection label="Guiding Principles" />;
  if (!principles || principles.length === 0) {
    return (
      <EmptySection
        label="Guiding Principles"
        hint="The 4–5 non-negotiable rules that govern every AI decision in HR."
        onDraft={onDraft}
        onManual={onEdit}
      />
    );
  }
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <SectionHeader label="Guiding Principles" onEdit={onEdit} onDraft={onDraft} isDrafting={isDrafting} />
      {/* Fix 4: Section caption */}
      <p className="text-[11px] leading-relaxed mb-4" style={{ color: "#7a8294" }}>
        The decision rules we’ll hold to as we deploy AI across HR.
      </p>
      {/* Fix 5: 2-col grid, numbered badges, capability tags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {principles.map((p, idx) => {
          const isOddLast = principles.length % 2 !== 0 && idx === principles.length - 1;
          return (
            <div
              key={p.number}
              className={`rounded-lg border border-border/40 bg-background/40 p-4 flex flex-col gap-2${
                isOddLast ? " sm:col-span-2" : ""
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{ background: "rgba(93,202,165,0.1)", color: "#5DCAA5" }}
                >
                  {String(p.number).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-foreground leading-snug">{p.title}</p>
                    {p.ai_drafted && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary/70 flex-shrink-0">
                        AI
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{p.description}</p>
                </div>
              </div>
              {p.capability_tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.capability_tags.map(tag => (
                    <span
                      key={tag}
                      className="whitespace-nowrap"
                      style={{
                        fontSize: 9, letterSpacing: "0.04em",
                        padding: "2px 7px", borderRadius: 999,
                        border: "0.5px solid rgba(93,202,165,0.25)",
                        color: "#7ec9ab", background: "transparent",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── What We Won't Do Section ─────────────────────────────────────────────────

function ExclusionsSection({
  exclusions, isDrafting, onEdit, onDraft,
}: {
  exclusions: Exclusion[] | null;
  isDrafting: boolean;
  onEdit: () => void;
  onDraft: () => void;
}) {
  if (isDrafting) return <DraftingSection label="What We Won't Do" />;
  if (!exclusions || exclusions.length === 0) {
    return (
      <EmptySection
        label="What We Won't Do"
        hint="Explicit out-of-scope decisions that protect focus and manage expectations."
        onDraft={onDraft}
        onManual={onEdit}
      />
    );
  }
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <SectionHeader label="What We Won't Do" onEdit={onEdit} onDraft={onDraft} isDrafting={isDrafting} />
      {/* Fix 4: Section caption */}
      <p className="text-[11px] leading-relaxed mb-4" style={{ color: "#7a8294" }}>
        A strategy that makes no cuts is a wishlist. These are the choices we’ve explicitly ruled out for this period.
      </p>
      <ul className="space-y-2">
        {exclusions.map((ex, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <X className="w-3.5 h-3.5 text-destructive/60 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-foreground">{ex.text}</span>
            {ex.ai_drafted && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary/70 flex-shrink-0">
                AI
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Outcomes Section ─────────────────────────────────────────────────────────────────

/**
 * Two-bar from-to visualisation per brief Fix 2.
 * Today bar: muted gray #5b6376, 5px tall, 3px radius.
 * Target bar: teal #5DCAA5, same dimensions.
 * Width normalised within the outcome: larger value = 100%, smaller is proportional.
 * TBD baseline: dashed empty today track, "Not measured" italic label.
 */
function FromToBar({
  outcome,
}: { outcome: Outcome }) {
  const isTbd = outcome.baseline_status === "not_measured" || outcome.baseline_value === null;
  const todayVal = outcome.baseline_value;
  const targetVal = outcome.target_value;
  const unit = outcome.unit;

  // Normalise: larger of the two gets 100% width
  const maxVal = Math.max(todayVal ?? 0, targetVal, 1);
  const todayPct = isTbd ? 0 : Math.round(((todayVal ?? 0) / maxVal) * 100);
  const targetPct = Math.round((targetVal / maxVal) * 100);

  return (
    <div className="mt-3 space-y-1.5">
      {/* Today row */}
      <div className="flex items-center gap-2">
        <span className="w-10 text-[10px] text-muted-foreground flex-shrink-0">Today</span>
        <div
          className="flex-1 relative"
          style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}
        >
          {isTbd ? (
            <div
              style={{
                position: "absolute", inset: 0, borderRadius: 3,
                border: "0.5px dashed rgba(255,255,255,0.15)",
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: `${todayPct}%`, borderRadius: 3,
                background: "#5b6376",
              }}
            />
          )}
        </div>
        <span
          className="w-14 text-right text-[11px] flex-shrink-0"
          style={isTbd ? { color: "#7a8294", fontStyle: "italic" } : { color: "#9ca3b0" }}
        >
          {isTbd ? "Not measured" : `${todayVal} ${unit}`}
        </span>
      </div>
      {/* Target row */}
      <div className="flex items-center gap-2">
        <span className="w-10 text-[10px] text-muted-foreground flex-shrink-0">Target</span>
        <div
          className="flex-1 relative"
          style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}
        >
          <div
            style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${targetPct}%`, borderRadius: 3,
              background: "#5DCAA5",
            }}
          />
        </div>
        <span className="w-14 text-right text-[11px] flex-shrink-0" style={{ color: "#5DCAA5" }}>
          {targetVal}{unit === "%" ? "" : " "}{unit}
        </span>
      </div>
    </div>
  );
}

function OutcomesSection({
  outcomes, principles, isDrafting, onEdit, onDraft,
}: {
  outcomes: Outcome[] | null;
  principles: Principle[] | null;
  isDrafting: boolean;
  onEdit: () => void;
  onDraft: () => void;
}) {
  if (isDrafting) return <DraftingSection label="Outcomes" />;
  if (!outcomes || outcomes.length === 0) {
    return (
      <EmptySection
        label="Outcomes"
        hint="3–5 measurable results that prove the strategy is working."
        onDraft={onDraft}
        onManual={onEdit}
      />
    );
  }
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <SectionHeader label="Outcomes" onEdit={onEdit} onDraft={onDraft} isDrafting={isDrafting} />
      {/* Fix 4: Section caption */}
      <p className="text-[11px] leading-relaxed mb-4" style={{ color: "#7a8294" }}>
        What these choices commit us to.{" "}
        <span style={{ color: "#9ca3b0", fontWeight: 500 }}>Each outcome tests one of our principles</span>
        {" "}— together they make the strategy measurable, not aspirational.
      </p>
      <div className="space-y-5">
        {outcomes.map((o) => {
          const linkedPrinciple = o.tests_principle != null
            ? principles?.find(p => p.number === o.tests_principle)
            : null;
          return (
            <div key={o.number} className="border border-border/40 rounded-lg p-4 bg-background/40">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                  {o.number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{o.title}</p>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">
                      {o.target_date}
                    </Badge>
                    {o.ai_drafted && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary/70">
                        AI
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{o.derived_summary}</p>
                  <FromToBar outcome={o} />
                  {/* Meta line: date + baseline study date for TBD outcomes */}
                  <div className="mt-2 text-[10px]" style={{ color: "#9ca3b0" }}>
                    By {o.target_date}
                    {o.baseline_status === "not_measured" && o.baseline_study_date && (
                      <span> · Baseline study scheduled {o.baseline_study_date}</span>
                    )}
                  </div>
                  {/* Principle cross-reference line */}
                  {linkedPrinciple && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px]">
                      <span style={{ color: "#5DCAA5" }}>↪</span>
                      <span style={{ color: "#9ca3b0" }}>Tests principle {linkedPrinciple.number}:</span>
                      <span style={{ color: "#7ec9ab" }}>{linkedPrinciple.title}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Edit Modals ──────────────────────────────────────────────────────────────

function PrinciplesModal({
  open, onClose, initial, onSave, isDrafting, onDraft,
}: {
  open: boolean; onClose: () => void;
  initial: Principle[] | null;
  onSave: (v: Principle[]) => Promise<void>;
  isDrafting: boolean;
  onDraft: () => void;
}) {
  const [items, setItems] = useState<Principle[]>(() => initial ?? []);
  const [saving, setSaving] = useState(false);

  const prevInitial = useRef(initial);
  if (initial !== prevInitial.current) {
    prevInitial.current = initial;
    setItems(initial ?? []);
  }

  const add = () =>
    setItems(prev => [
      ...prev,
      { number: prev.length + 1, title: "", description: "", capability_tags: [], ai_drafted: false },
    ]);
  const remove = (i: number) =>
    setItems(prev =>
      prev.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, number: idx + 1 })),
    );
  const update = (i: number, field: keyof Principle, val: unknown) =>
    setItems(prev => prev.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));
  const toggleTag = (i: number, tag: string) =>
    setItems(prev =>
      prev.map((p, idx) =>
        idx === i
          ? {
              ...p,
              capability_tags: p.capability_tags.includes(tag)
                ? p.capability_tags.filter(t => t !== tag)
                : [...p.capability_tags, tag],
            }
          : p,
      ),
    );

  const save = async () => {
    setSaving(true);
    try {
      await onSave(items);
      onClose();
    } catch {
      toast.error("Failed to save principles");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Guiding Principles</DialogTitle>
          <DialogDescription>4–5 non-negotiable rules that govern every AI decision in HR.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {items.map((p, i) => (
            <div key={i} className="border border-border/50 rounded-lg p-4 space-y-3 bg-card/50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <Input
                  value={p.title}
                  onChange={e => update(i, "title", e.target.value)}
                  placeholder="Principle title (3–5 words)"
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => remove(i)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Textarea
                value={p.description}
                onChange={e => update(i, "description", e.target.value)}
                placeholder="One-sentence description…"
                className="text-sm min-h-[60px] resize-none"
              />
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5">Capability tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {CAPABILITY_TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(i, tag)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                        p.capability_tags.includes(tag)
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "border-border/50 text-muted-foreground hover:border-border"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" onClick={add}>
              <Plus className="w-3 h-3" /> Add principle
            </Button>
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-xs h-8 text-muted-foreground"
              onClick={onDraft}
              disabled={isDrafting}
            >
              {isDrafting
                ? <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                : <Sparkles className="w-3 h-3" />}
              {isDrafting ? "Drafting…" : "Re-draft with AI"}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExclusionsModal({
  open, onClose, initial, onSave, isDrafting, onDraft,
}: {
  open: boolean; onClose: () => void;
  initial: Exclusion[] | null;
  onSave: (v: Exclusion[]) => Promise<void>;
  isDrafting: boolean;
  onDraft: () => void;
}) {
  const [items, setItems] = useState<Exclusion[]>(() => initial ?? []);
  const [saving, setSaving] = useState(false);
  const [newText, setNewText] = useState("");

  const prevInitial = useRef(initial);
  if (initial !== prevInitial.current) {
    prevInitial.current = initial;
    setItems(initial ?? []);
  }

  const add = () => {
    if (!newText.trim()) return;
    setItems(prev => [...prev, { text: newText.trim(), ai_drafted: false }]);
    setNewText("");
  };
  const remove = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const update = (i: number, val: string) =>
    setItems(prev => prev.map((ex, idx) => (idx === i ? { ...ex, text: val } : ex)));

  const save = async () => {
    setSaving(true);
    try {
      await onSave(items);
      onClose();
    } catch {
      toast.error("Failed to save exclusions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>What We Won't Do</DialogTitle>
          <DialogDescription>Explicit out-of-scope decisions that protect focus.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {items.map((ex, i) => (
            <div key={i} className="flex items-center gap-2">
              <X className="w-3.5 h-3.5 text-destructive/50 flex-shrink-0" />
              <Input
                value={ex.text}
                onChange={e => update(i, e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                onClick={() => remove(i)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2">
            <Input
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && add()}
              placeholder="Add an exclusion…"
              className="flex-1 h-8 text-sm"
            />
            <Button variant="outline" size="sm" className="h-8 px-3" onClick={add}>Add</Button>
          </div>
          <Button
            variant="ghost" size="sm"
            className="gap-1.5 text-xs h-8 text-muted-foreground mt-1"
            onClick={onDraft}
            disabled={isDrafting}
          >
            {isDrafting
              ? <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              : <Sparkles className="w-3 h-3" />}
            {isDrafting ? "Drafting…" : "Suggest with AI"}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OutcomeRow({
  outcome, index, principles, onChange, onRemove,
}: {
  outcome: Outcome; index: number; principles: Principle[] | null;
  onChange: (field: keyof Outcome, val: unknown) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-border/50 rounded-lg p-4 space-y-3 bg-card/50">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </div>
        <Input
          value={outcome.title}
          onChange={e => onChange("title", e.target.value)}
          placeholder="Outcome title (3–6 words)"
          className="flex-1 h-8 text-sm"
        />
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
          onClick={onRemove}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground">Unit</Label>
          <Input
            value={outcome.unit}
            onChange={e => onChange("unit", e.target.value)}
            placeholder="e.g. % reduction"
            className="h-8 text-sm mt-1"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Target date</Label>
          <Input
            value={outcome.target_date}
            onChange={e => onChange("target_date", e.target.value)}
            placeholder="Q4 2026"
            className="h-8 text-sm mt-1"
          />
        </div>
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1.5 block">Baseline</Label>
        <RadioGroup
          value={outcome.baseline_status}
          onValueChange={v => onChange("baseline_status", v)}
          className="flex gap-4"
        >
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="measured" id={`m-${index}`} />
            <Label htmlFor={`m-${index}`} className="text-xs cursor-pointer">Measured</Label>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="not_measured" id={`nm-${index}`} />
            <Label htmlFor={`nm-${index}`} className="text-xs cursor-pointer">TBD / not yet measured</Label>
          </div>
        </RadioGroup>
        {outcome.baseline_status === "measured" && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Baseline value</Label>
              <Input
                type="number"
                value={outcome.baseline_value ?? ""}
                onChange={e => onChange("baseline_value", e.target.value ? Number(e.target.value) : null)}
                className="h-8 text-sm mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Study date</Label>
              <Input
                value={outcome.baseline_study_date ?? ""}
                onChange={e => onChange("baseline_study_date", e.target.value || null)}
                placeholder="Q1 2025"
                className="h-8 text-sm mt-1"
              />
            </div>
          </div>
        )}
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground">Target value</Label>
        <Input
          type="number"
          value={outcome.target_value}
          onChange={e => onChange("target_value", Number(e.target.value))}
          className="h-8 text-sm mt-1"
        />
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground">Summary sentence</Label>
        <Textarea
          value={outcome.derived_summary}
          onChange={e => onChange("derived_summary", e.target.value)}
          placeholder="Reduce X from TBD to Y by Z"
          className="text-sm min-h-[56px] resize-none mt-1"
        />
      </div>
      {principles && principles.length > 0 && (
        <div>
          <Label className="text-[11px] text-muted-foreground">Tests principle (optional)</Label>
          <select
            value={outcome.tests_principle ?? ""}
            onChange={e => onChange("tests_principle", e.target.value ? Number(e.target.value) : null)}
            className="mt-1 w-full h-8 text-sm rounded-md border border-input bg-background px-2 text-foreground"
          >
            <option value="">— none —</option>
            {principles.map(p => (
              <option key={p.number} value={p.number}>{p.number}. {p.title}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function OutcomesModal({
  open, onClose, initial, principles, onSave, isDrafting, onDraft,
}: {
  open: boolean; onClose: () => void;
  initial: Outcome[] | null;
  principles: Principle[] | null;
  onSave: (v: Outcome[]) => Promise<void>;
  isDrafting: boolean;
  onDraft: () => void;
}) {
  const [items, setItems] = useState<Outcome[]>(() => initial ?? []);
  const [saving, setSaving] = useState(false);

  const prevInitial = useRef(initial);
  if (initial !== prevInitial.current) {
    prevInitial.current = initial;
    setItems(initial ?? []);
  }

  const add = () =>
    setItems(prev => [
      ...prev,
      {
        number: prev.length + 1, title: "", unit: "",
        baseline_value: null, baseline_status: "not_measured",
        baseline_study_date: null, target_value: 0, target_date: "",
        derived_summary: "", tests_principle: null, ai_drafted: false,
      },
    ]);
  const remove = (i: number) =>
    setItems(prev =>
      prev.filter((_, idx) => idx !== i).map((o, idx) => ({ ...o, number: idx + 1 })),
    );
  const update = (i: number, field: keyof Outcome, val: unknown) =>
    setItems(prev => prev.map((o, idx) => (idx === i ? { ...o, [field]: val } : o)));

  const save = async () => {
    setSaving(true);
    try {
      await onSave(items);
      onClose();
    } catch {
      toast.error("Failed to save outcomes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Outcomes</DialogTitle>
          <DialogDescription>3–5 measurable results that prove the strategy is working.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {items.map((o, i) => (
            <OutcomeRow
              key={i}
              outcome={o}
              index={i}
              principles={principles}
              onChange={(field, val) => update(i, field, val)}
              onRemove={() => remove(i)}
            />
          ))}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" onClick={add}>
              <Plus className="w-3 h-3" /> Add outcome
            </Button>
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-xs h-8 text-muted-foreground"
              onClick={onDraft}
              disabled={isDrafting}
            >
              {isDrafting
                ? <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                : <Sparkles className="w-3 h-3" />}
              {isDrafting ? "Drafting…" : "Re-draft with AI"}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StrategyAmbitionPage() {
  const { user } = useAuth();

  const sectionsQ = trpc.intelligence.getAmbitionSections.useQuery();
  const strategyQ = trpc.intelligence.getStrategyAssessment.useQuery();

  const saveSectionM = trpc.intelligence.saveAmbitionSection.useMutation();
  const draftSectionM = trpc.intelligence.draftAmbitionSection.useMutation();
  const patchStrategyM = trpc.intelligence.patchStrategyField.useMutation();

  const [visionOpen, setVisionOpen] = useState(false);
  const [principlesOpen, setPrinciplesOpen] = useState(false);
  const [exclusionsOpen, setExclusionsOpen] = useState(false);
  const [outcomesOpen, setOutcomesOpen] = useState(false);

  const [drafting, setDrafting] = useState<Set<string>>(new Set());
  const setDraftingSection = (s: string, v: boolean) =>
    setDrafting(prev => {
      const next = new Set(prev);
      if (v) next.add(s); else next.delete(s);
      return next;
    });

  const sections = sectionsQ.data;
  const strategy = strategyQ.data;

  const orgDescriptor = useMemo(() => {
    const parts: string[] = [];
    if (strategy?.sector) parts.push(strategy.sector);
    if (strategy?.headcount) parts.push(`${strategy.headcount} employees`);
    return parts.join(" · ") || "an HR function";
  }, [strategy]);

  // Clamp to 1–4: assessment wizard uses a 1–5 scale but tier sliders/backend expect 1–4
  const businessTier = sections?.businessAmbitionLevel != null ? Math.min(Math.max(sections.businessAmbitionLevel, 1), 4) : null;
  const hrTier = sections?.peopleAmbitionLevel != null ? Math.min(Math.max(sections.peopleAmbitionLevel, 1), 4) : null;

  const visionInputs = useMemo((): VisionInputs | null => {
    try {
      const raw = strategy?.visionInputs;
      if (!raw) return null;
      return raw as unknown as VisionInputs | null;
    } catch {
      return null;
    }
  }, [strategy]);

  // Use live data if available; fall back to defaults so the page is never blank.
  // Also auto-seed defaults to DB on first load (when sections loaded but data is null).
  const principles: Principle[] = useMemo(() =>
    (sections?.principles as Principle[] | null | undefined)?.length
      ? (sections!.principles as Principle[])
      : DEFAULT_PRINCIPLES
  , [sections]);

  const exclusions: Exclusion[] = useMemo(() =>
    (sections?.wontDo as Exclusion[] | null | undefined)?.length
      ? (sections!.wontDo as Exclusion[])
      : DEFAULT_EXCLUSIONS
  , [sections]);

  const outcomes: Outcome[] = useMemo(() =>
    (sections?.outcomes as Outcome[] | null | undefined)?.length
      ? (sections!.outcomes as Outcome[])
      : DEFAULT_OUTCOMES
  , [sections]);

  // Auto-seed defaults to DB on first load when sections exist but content is null.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (!sections) return; // still loading
    const needsSeed = !(sections?.principles as Principle[] | null | undefined)?.length
      || !(sections?.wontDo as Exclusion[] | null | undefined)?.length
      || !(sections?.outcomes as Outcome[] | null | undefined)?.length;
    if (!needsSeed) { seededRef.current = true; return; }
    seededRef.current = true;
    // Seed each missing section silently
    const seed = async () => {
      try {
        if (!(sections?.principles as Principle[] | null | undefined)?.length)
          await saveSectionM.mutateAsync({ section: "principles", value: DEFAULT_PRINCIPLES as never });
        if (!(sections?.wontDo as Exclusion[] | null | undefined)?.length)
          await saveSectionM.mutateAsync({ section: "wontDo", value: DEFAULT_EXCLUSIONS as never });
        if (!(sections?.outcomes as Outcome[] | null | undefined)?.length)
          await saveSectionM.mutateAsync({ section: "outcomes", value: DEFAULT_OUTCOMES as never });
        await sectionsQ.refetch();
      } catch { /* silent */ }
    };
    void seed();
  }, [sections, saveSectionM, sectionsQ]);

  const lastReviewedAt: number | null = sections?.lastReviewedAt
    ? (sections.lastReviewedAt instanceof Date ? sections.lastReviewedAt.getTime() : sections.lastReviewedAt as unknown as number)
    : null;
  const lastReviewedBy: string | null = sections?.lastReviewedBy ?? null;

  const draftSection = useCallback(async (
    section: "principles" | "wontDo" | "outcomes" | "approachLine",
  ) => {
    setDraftingSection(section, true);
    try {
      const result = await draftSectionM.mutateAsync({
        section,
        orgDescriptor,
        businessAmbitionTier: businessTier,
        hrDeliveryTier: hrTier,
        visionStatement: sections?.vision ?? undefined,
        existingPrinciples: section === "approachLine" ? (principles ?? undefined) : undefined,
      });
      await saveSectionM.mutateAsync({ section, value: result.draft as never });
      await sectionsQ.refetch();
      toast.success("Draft ready");
    } catch {
      toast.error("Draft failed — try again");
    } finally {
      setDraftingSection(section, false);
    }
  }, [draftSectionM, saveSectionM, sectionsQ, orgDescriptor, businessTier, hrTier, sections, principles]);

  const savePrinciples = useCallback(async (v: Principle[]) => {
    await saveSectionM.mutateAsync({ section: "principles", value: v as never });
    await sectionsQ.refetch();
  }, [saveSectionM, sectionsQ]);

  const saveExclusions = useCallback(async (v: Exclusion[]) => {
    await saveSectionM.mutateAsync({ section: "wontDo", value: v as never });
    await sectionsQ.refetch();
  }, [saveSectionM, sectionsQ]);

  const saveOutcomes = useCallback(async (v: Outcome[]) => {
    await saveSectionM.mutateAsync({ section: "outcomes", value: v as never });
    await sectionsQ.refetch();
  }, [saveSectionM, sectionsQ]);

  const markReviewed = useCallback(async () => {
    const name = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : "Unknown";
    await saveSectionM.mutateAsync({ section: "markReviewed", value: { reviewerName: name } as never });
    await sectionsQ.refetch();
    toast.success("Marked as reviewed");
  }, [saveSectionM, sectionsQ, user]);

  const bLabel = businessTier ? BUSINESS_TIER_LABELS[businessTier] ?? null : null;
  const hrLabel = hrTier ? HR_TIER_LABELS[hrTier] ?? null : null;

  const builtCount = useMemo(() => {
    let count = 0;
    if (sections?.vision) count++;
    if (principles?.length) count++;
    if (exclusions?.length) count++;
    if (outcomes?.length) count++;
    return count;
  }, [sections, principles, exclusions, outcomes]);

  if (sectionsQ.isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Loading ambition…
      </div>
    );
  }

  const vision = sections?.vision ?? null;

  return (
    <TooltipProvider>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header — Fix 3 */}
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>HR AI Strategy</span>
            <ChevronRight className="w-3 h-3" />
            <span>Ambition</span>
          </div>
          {/* Section 02 eyebrow */}
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-1" style={{ color: "#5DCAA5" }}>
            Section 02
          </p>
          {/* Title with teal dot */}
          <h1 className="text-2xl font-bold text-foreground">
            Where we’re going<span style={{ color: "#5DCAA5" }}>.</span>
          </h1>
          {/* Ambition pills + time horizon strip */}
          <div className="flex items-center gap-2 flex-wrap mt-3">
            {bLabel && (
              <span
                style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 999,
                  border: "0.5px solid rgba(93,202,165,0.5)",
                  color: "#5DCAA5", background: "transparent",
                }}
              >
                Business: {bLabel}
              </span>
            )}
            {hrLabel && (
              <span
                style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 999,
                  border: "0.5px solid rgba(93,202,165,0.5)",
                  color: "#5DCAA5", background: "transparent",
                }}
              >
                HR: {hrLabel}
              </span>
            )}
            <span style={{ color: "#6c7385", fontSize: 11 }}>·</span>
            <span style={{ color: "#9ca3b0", fontSize: 11 }}>🕒 By end of FY27 · over 18 months</span>
          </div>
          {/* Our approach line */}
          <div className="mt-2" style={{ marginBottom: "0.5rem" }}>
            <span style={{ color: "#5DCAA5", fontSize: 11, fontWeight: 500 }}>Our approach:</span>
            {" "}
            <span style={{ color: "#7a8294", fontSize: 11, lineHeight: 1.5 }}>
              {sections?.approachLine ||
                "AI everywhere across HR, growing what HR can do strategically — not just making existing work faster."}
            </span>
          </div>
        </div>

        {/* Sections */}
        <VisionSection
          vision={vision}
          visionInputs={visionInputs}
          onOpenModal={() => setVisionOpen(true)}
        />

        <PrinciplesSection
          principles={principles}
          isDrafting={drafting.has("principles")}
          onEdit={() => setPrinciplesOpen(true)}
          onDraft={() => draftSection("principles")}
        />

        <ExclusionsSection
          exclusions={exclusions}
          isDrafting={drafting.has("wontDo")}
          onEdit={() => setExclusionsOpen(true)}
          onDraft={() => draftSection("wontDo")}
        />

        <OutcomesSection
          outcomes={outcomes}
          principles={principles}
          isDrafting={drafting.has("outcomes")}
          onEdit={() => setOutcomesOpen(true)}
          onDraft={() => draftSection("outcomes")}
        />

        {/* Review footer — Fix 6 */}
        <div className="border-t border-border/40 pt-6 flex items-center justify-between gap-3">
          {/* Left: review state */}
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            {lastReviewedAt ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-primary/60" />
                Last reviewed{" "}
                {new Date(lastReviewedAt).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short", year: "numeric",
                })}
                {lastReviewedBy ? ` by ${lastReviewedBy}` : ""}
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                Not yet reviewed
              </>
            )}
          </div>
          {/* Right: action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!lastReviewedAt && (
              <Button
                variant="outline" size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={markReviewed}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark as reviewed
              </Button>
            )}
            <Link href="/strategy/journey">
              <button
                className="h-8 px-3 text-xs flex items-center gap-1.5 rounded-md transition-colors"
                style={{ background: "transparent", border: "0.5px solid rgba(255,255,255,0.2)" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(93,202,165,0.5)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#5DCAA5";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)";
                  (e.currentTarget as HTMLButtonElement).style.color = "";
                }}
              >
                <span style={{ color: "#6c7385" }}>Next:</span>
                <span className="text-foreground">How we get there</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Modals */}
      <VisionModal
        isOpen={visionOpen}
        onClose={() => setVisionOpen(false)}
        orgDescriptor={orgDescriptor}
        capabilityScore={null}
        capabilityLabel={null}
        initialInputs={visionInputs}
        onSaved={async (draft) => {
          if (draft) {
            await patchStrategyM.mutateAsync({ field: "visionStatement", value: draft });
          }
          await sectionsQ.refetch();
          await strategyQ.refetch();
          setVisionOpen(false);
        }}
      />

      <PrinciplesModal
        open={principlesOpen}
        onClose={() => setPrinciplesOpen(false)}
        initial={principles}
        onSave={savePrinciples}
        isDrafting={drafting.has("principles")}
        onDraft={() => draftSection("principles")}
      />

      <ExclusionsModal
        open={exclusionsOpen}
        onClose={() => setExclusionsOpen(false)}
        initial={exclusions}
        onSave={saveExclusions}
        isDrafting={drafting.has("wontDo")}
        onDraft={() => draftSection("wontDo")}
      />

      <OutcomesModal
        open={outcomesOpen}
        onClose={() => setOutcomesOpen(false)}
        initial={outcomes}
        principles={principles}
        onSave={saveOutcomes}
        isDrafting={drafting.has("outcomes")}
        onDraft={() => draftSection("outcomes")}
      />
    </TooltipProvider>
  );
}
