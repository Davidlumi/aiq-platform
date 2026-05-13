/**
 * StrategyAmbitionPage — Final Build (ambition-page-final-build-brief.md)
 * 4 sections: Vision, Guiding Principles, What We Won't Do, Outcomes
 * Each section: empty (dashed) → drafting (spinner) → built (content + pencil)
 * Edit modals for all 4 sections. Review-date footer.
 */
import { useState, useMemo, useCallback, useRef } from "react";
import {
  Pencil, Sparkles, Plus, Trash2, ChevronRight,
  CheckCircle2, Clock, X, Shield,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const CAPABILITY_TAGS = [
  "AI Foundations", "AI Interaction", "AI Output Evaluation",
  "AI Workflow Design", "AI Ethics & Trust",
  "Workforce AI Readiness", "AI Change Leadership",
];

const BUSINESS_TIER_LABELS: Record<number, string> = {
  1: "Foundational", 2: "Measured", 3: "Bold", 4: "Transformative",
};
const HR_TIER_LABELS: Record<number, string> = {
  1: "AI-aware", 2: "AI-using", 3: "AI-enabled", 4: "AI-Led",
};

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
      <blockquote className="border-l-2 border-primary pl-4 text-base italic leading-relaxed text-foreground">
        "{vision}"
      </blockquote>
      {visionInputs && (
        <div className="mt-3 flex flex-wrap gap-2">
          {visionInputs.businessAmbitionTier != null && (
            <Badge variant="secondary" className="text-xs">
              Business: {BUSINESS_TIER_LABELS[visionInputs.businessAmbitionTier] ?? visionInputs.businessAmbitionTier}
            </Badge>
          )}
          {visionInputs.hrDeliveryTier != null && (
            <Badge variant="secondary" className="text-xs">
              HR: {HR_TIER_LABELS[visionInputs.hrDeliveryTier] ?? visionInputs.hrDeliveryTier}
            </Badge>
          )}
        </div>
      )}
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
      <div className="space-y-4">
        {principles.map((p) => (
          <div key={p.number} className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
              {p.number}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">{p.title}</p>
                {p.ai_drafted && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary/70">
                    AI
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{p.description}</p>
              {p.capability_tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {p.capability_tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1.5">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
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

// ─── Outcomes Section ─────────────────────────────────────────────────────────

function FromToBar({
  baseline, target, unit,
}: { baseline: number | null; target: number; unit: string }) {
  const isTbd = baseline === null;
  const pct = isTbd ? 0 : Math.min(100, Math.round((baseline / (target || 1)) * 100));
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
        <span>{isTbd ? "TBD baseline" : `${baseline} ${unit}`}</span>
        <span className="text-primary font-medium">{target} {unit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        {isTbd ? (
          <div
            className="h-full w-full"
            style={{
              background:
                "repeating-linear-gradient(90deg, hsl(var(--muted-foreground)/0.3) 0px, hsl(var(--muted-foreground)/0.3) 4px, transparent 4px, transparent 8px)",
            }}
          />
        ) : (
          <div
            className="h-full bg-primary/60 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        )}
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
                  <FromToBar baseline={o.baseline_value} target={o.target_value} unit={o.unit} />
                  {linkedPrinciple && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Shield className="w-3 h-3" />
                      Tests principle {linkedPrinciple.number}: {linkedPrinciple.title}
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

  const principles: Principle[] | null = useMemo(() =>
    sections?.principles as Principle[] | null ?? null
  , [sections]);

  const exclusions: Exclusion[] | null = useMemo(() =>
    sections?.wontDo as Exclusion[] | null ?? null
  , [sections]);

  const outcomes: Outcome[] | null = useMemo(() =>
    sections?.outcomes as Outcome[] | null ?? null
  , [sections]);

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
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>HR AI Strategy</span>
            <ChevronRight className="w-3 h-3" />
            <span>Ambition</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Where we're going</h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
        {bLabel && <Badge variant="secondary" className="text-xs">{bLabel}</Badge>}
          {hrLabel && <Badge variant="secondary" className="text-xs">{hrLabel}</Badge>}
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full transition-all"
                style={{ width: `${(builtCount / 4) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {builtCount} of 4 sections built
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

        {/* Review footer */}
        <div className="border-t border-border/40 pt-6 flex items-center justify-between">
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
          <Button
            variant="outline" size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={markReviewed}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Mark as reviewed
          </Button>
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
