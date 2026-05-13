/**
 * StrategyAmbitionPage — /strategy/ambition
 * Section 02: Where we're going
 *
 * Rebuilt per strategy-ambition-rebuild-brief.md
 *
 * Three states per section: empty | drafting | built
 * Phase 1: empty-state page with hero card + 7 dashed sections
 * Phase 2: edit modals for all 6 non-Vision sections
 * Phase 3: batch "Draft everything with AI" flow
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowRight, Target, Sparkles, AlertCircle, Plus, Trash2,
  Pencil, Loader2, CheckCircle2, Info, UserCheck, Lock as LockIcon,
  Users, X, RefreshCw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import SectionPageLayout from "@/components/SectionPageLayout";
import { VisionModal, type VisionInputs } from "./VisionModal";
import {
  EXISTING_AI_TOOLS,
  EXECUTIVE_SPONSORS,
  GATEKEEPERS,
  AFFECTED_GROUPS,
  POTENTIAL_RESISTORS,
} from "@/../../shared/strategyInputs";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionKey = "vision" | "outcomes" | "waysOfWork" | "principles" | "aiLandscape" | "wontDo" | "stakeholderMap";
type SectionState = "empty" | "drafting" | "built";

interface Principle { title: string; description: string; }
interface StakeholderMap {
  executive_sponsors: string[];
  gatekeepers: string[];
  affected_groups: string[];
  potential_resistors: string[];
  notes?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUSINESS_LEVELS: Record<number, { label: string; waysOfWork: string }> = {
  1: { label: "Cautious",       waysOfWork: "AI will be introduced carefully, with human oversight at every step." },
  2: { label: "Exploratory",    waysOfWork: "AI will be piloted in low-risk processes to build confidence and capability." },
  3: { label: "Progressive",    waysOfWork: "AI will augment HR workflows, with humans retaining decision authority." },
  4: { label: "Ambitious",      waysOfWork: "AI will be embedded across most HR processes, driving significant efficiency and insight." },
  5: { label: "Transformative", waysOfWork: "AI will fundamentally reshape how HR operates, enabling new business models." },
};

const PEOPLE_LEVELS: Record<number, { label: string; expectation: string; tooltip: string }> = {
  1: { label: "AI-Aware",     expectation: "HR teams will understand AI basics and know when to escalate.", tooltip: "HR staff understand AI concepts and can identify when AI is being used, but do not yet use it directly." },
  2: { label: "AI-Assisted",  expectation: "HR teams will use AI tools confidently in day-to-day work.", tooltip: "HR staff use AI tools in their day-to-day work with guidance and support." },
  3: { label: "AI-Augmented", expectation: "HR teams will co-design AI solutions and interpret AI outputs critically.", tooltip: "HR staff work alongside AI systems, critically evaluating outputs and co-designing solutions." },
  4: { label: "AI-Native",    expectation: "HR teams will build, configure, and govern AI tools independently.", tooltip: "HR staff build, configure, and govern AI tools without external dependency." },
  5: { label: "AI-Led",       expectation: "HR teams will lead enterprise AI strategy and set the standard for the organisation.", tooltip: "HR leads enterprise AI strategy, setting the standard for the wider organisation." },
};

const SECTION_META: Record<SectionKey, { label: string; hint: string; aiEligible: boolean }> = {
  vision:         { label: "Vision Statement",                   hint: "Define your strategic intent — generate a board-ready draft.",                          aiEligible: true },
  outcomes:       { label: "By the end of this strategy period", hint: "3–5 measurable outcomes HR will achieve.",                                              aiEligible: true },
  waysOfWork:     { label: "How AI will change ways of work",    hint: "Describe how AI reshapes HR delivery at your ambition tier.",                           aiEligible: true },
  principles:     { label: "Guiding Principles",                 hint: "4–5 principles that govern responsible AI adoption in HR.",                             aiEligible: true },
  aiLandscape:    { label: "Current AI Landscape",               hint: "Tools already deployed in HR — initiatives will complement rather than duplicate these.", aiEligible: false },
  wontDo:         { label: "What We Won't Do",                   hint: "A strategy that makes no cuts is a wishlist. Define your explicit out-of-scope.",        aiEligible: true },
  stakeholderMap: { label: "Stakeholder Map",                    hint: "Executive sponsors, gatekeepers, affected groups, and potential resistors.",             aiEligible: true },
};

const AI_ELIGIBLE_SECTIONS: SectionKey[] = ["outcomes", "waysOfWork", "principles", "wontDo", "stakeholderMap"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptySection({
  sectionKey,
  onDraftWithAI,
  onAddManually,
  isDrafting,
}: {
  sectionKey: SectionKey;
  onDraftWithAI?: () => void;
  onAddManually: () => void;
  isDrafting?: boolean;
}) {
  const meta = SECTION_META[sectionKey];
  return (
    <div className="rounded-xl border border-dashed border-border/50 bg-card/30 p-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">{meta.label}</p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{meta.hint}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {meta.aiEligible && onDraftWithAI && (
          <Button
            size="sm"
            className="h-7 text-xs bg-teal-600 hover:bg-teal-500 text-white"
            onClick={onDraftWithAI}
            disabled={isDrafting}
          >
            {isDrafting ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Drafting…</> : <><Sparkles className="w-3 h-3 mr-1.5" />Draft with AI</>}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={onAddManually}
        >
          <Plus className="w-3 h-3 mr-1.5" />Add manually
        </Button>
      </div>
    </div>
  );
}

function DraftingSection({ sectionKey, onCancel }: { sectionKey: SectionKey; onCancel: () => void }) {
  const meta = SECTION_META[sectionKey];
  return (
    <div className="rounded-xl border border-dashed border-teal-500/30 bg-teal-500/4 p-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">{meta.label}</p>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin text-teal-400 flex-shrink-0" />
        <span>Drafting with AI…</span>
        <button
          type="button"
          className="ml-auto text-xs text-muted-foreground/60 hover:text-muted-foreground underline transition-colors"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function BuiltSectionHeader({ label, onEdit }: { label: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{label}</p>
      <button
        type="button"
        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1 rounded"
        onClick={onEdit}
        aria-label={`Edit ${label}`}
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Edit Modals ──────────────────────────────────────────────────────────────

function OutcomesModal({
  open, onClose, initial, onSave,
}: { open: boolean; onClose: () => void; initial: string[]; onSave: (v: string[]) => Promise<void>; }) {
  const [items, setItems] = useState<string[]>(initial.length ? initial : [""]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setItems(initial.length ? [...initial] : [""]); }, [open, JSON.stringify(initial)]);
  const handleSave = async () => {
    const clean = items.filter(s => s.trim());
    if (!clean.length) return;
    setSaving(true);
    try { await onSave(clean); onClose(); } catch { toast.error("Save failed"); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Section 02 · Ambition</p>
          <DialogTitle>By the end of this strategy period</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-teal-500/15 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-teal-400">{i + 1}</span>
              </div>
              <input
                value={item}
                onChange={e => { const n = [...items]; n[i] = e.target.value; setItems(n); }}
                className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="Outcome statement…"
              />
              <button type="button" className="text-muted-foreground/40 hover:text-red-400 transition-colors" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button type="button" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1" onClick={() => setItems([...items, ""])}>
            <Plus className="w-3.5 h-3.5" />Add outcome
          </button>
        </div>
        <DialogFooter>
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground underline transition-colors mr-auto" onClick={onClose}>Cancel</button>
          <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WaysOfWorkModal({
  open, onClose, initial, onSave,
}: { open: boolean; onClose: () => void; initial: string; onSave: (v: string) => Promise<void>; }) {
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setText(initial); }, [open, initial]);
  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try { await onSave(text.trim()); onClose(); } catch { toast.error("Save failed"); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Section 02 · Ambition</p>
          <DialogTitle>How AI will change ways of work</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
            placeholder="Describe how AI will reshape HR delivery at your ambition tier…"
          />
        </div>
        <DialogFooter>
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground underline transition-colors mr-auto" onClick={onClose}>Cancel</button>
          <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrinciplesModal({
  open, onClose, initial, onSave,
}: { open: boolean; onClose: () => void; initial: Principle[]; onSave: (v: Principle[]) => Promise<void>; }) {
  const [items, setItems] = useState<Principle[]>(initial.length ? initial : [{ title: "", description: "" }]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setItems(initial.length ? initial.map(p => ({ ...p })) : [{ title: "", description: "" }]); }, [open, JSON.stringify(initial)]);
  const handleSave = async () => {
    const clean = items.filter(p => p.title.trim());
    if (!clean.length) return;
    setSaving(true);
    try { await onSave(clean); onClose(); } catch { toast.error("Save failed"); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Section 02 · Ambition</p>
          <DialogTitle>Guiding Principles</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-80 overflow-y-auto">
          {items.map((p, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border/40 bg-muted/10 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={p.title}
                  onChange={e => { const n = [...items]; n[i] = { ...n[i], title: e.target.value }; setItems(n); }}
                  className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="Principle title…"
                />
                <button type="button" className="text-muted-foreground/40 hover:text-red-400 transition-colors" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={p.description}
                onChange={e => { const n = [...items]; n[i] = { ...n[i], description: e.target.value }; setItems(n); }}
                rows={2}
                className="w-full bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="One-sentence description…"
              />
            </div>
          ))}
          <button type="button" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => setItems([...items, { title: "", description: "" }])}>
            <Plus className="w-3.5 h-3.5" />Add principle
          </button>
        </div>
        <DialogFooter>
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground underline transition-colors mr-auto" onClick={onClose}>Cancel</button>
          <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AILandscapeModal({
  open, onClose, initial, onSave,
}: { open: boolean; onClose: () => void; initial: string[]; onSave: (v: string[]) => Promise<void>; }) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [customInput, setCustomInput] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setSelected([...initial]); setCustomInput(""); } }, [open, JSON.stringify(initial)]);
  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const addCustom = () => {
    const v = customInput.trim();
    if (v && !selected.includes(v)) setSelected([...selected, v]);
    setCustomInput("");
  };
  const handleSave = async () => {
    setSaving(true);
    try { await onSave(selected); onClose(); } catch { toast.error("Save failed"); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Section 02 · Ambition</p>
          <DialogTitle>Current AI Landscape</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-xs text-muted-foreground mb-3">Select tools already deployed in HR.</p>
          <div className="flex flex-wrap gap-2 mb-4 max-h-48 overflow-y-auto">
            {EXISTING_AI_TOOLS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selected.includes(t.id) ? "border-teal-500/50 bg-teal-500/15 text-teal-300" : "border-border/60 bg-muted/20 text-muted-foreground hover:border-border"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustom()}
              className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              placeholder="Add a tool not listed…"
            />
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addCustom}>Add</Button>
          </div>
          {selected.filter(id => !EXISTING_AI_TOOLS.find(t => t.id === id)).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selected.filter(id => !EXISTING_AI_TOOLS.find(t => t.id === id)).map(id => (
                <span key={id} className="text-xs px-2.5 py-1 rounded-full border border-teal-500/50 bg-teal-500/15 text-teal-300 flex items-center gap-1">
                  {id}
                  <button type="button" onClick={() => setSelected(selected.filter(x => x !== id))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground underline transition-colors mr-auto" onClick={onClose}>Cancel</button>
          <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WontDoModal({
  open, onClose, initial, onSave,
}: { open: boolean; onClose: () => void; initial: string[]; onSave: (v: string[]) => Promise<void>; }) {
  const [items, setItems] = useState<string[]>(initial.length ? initial : [""]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setItems(initial.length ? [...initial] : [""]); }, [open, JSON.stringify(initial)]);
  const handleSave = async () => {
    const clean = items.filter(s => s.trim());
    if (!clean.length) return;
    setSaving(true);
    try { await onSave(clean); onClose(); } catch { toast.error("Save failed"); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Section 02 · Ambition</p>
          <DialogTitle>What We Won't Do</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-red-400 text-xs flex-shrink-0">×</span>
              <input
                value={item}
                onChange={e => { const n = [...items]; n[i] = e.target.value; setItems(n); }}
                className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="Out-of-scope item…"
              />
              <button type="button" className="text-muted-foreground/40 hover:text-red-400 transition-colors" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button type="button" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1" onClick={() => setItems([...items, ""])}>
            <Plus className="w-3.5 h-3.5" />Add exclusion
          </button>
        </div>
        <DialogFooter>
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground underline transition-colors mr-auto" onClick={onClose}>Cancel</button>
          <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StakeholderModal({
  open, onClose, initial, onSave,
}: { open: boolean; onClose: () => void; initial: StakeholderMap | null; onSave: (v: StakeholderMap) => Promise<void>; }) {
  const empty: StakeholderMap = { executive_sponsors: [], gatekeepers: [], affected_groups: [], potential_resistors: [], notes: "" };
  const [data, setData] = useState<StakeholderMap>(initial ?? empty);
  const [inputs, setInputs] = useState({ executive_sponsors: "", gatekeepers: "", affected_groups: "", potential_resistors: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setData(initial ?? empty); setInputs({ executive_sponsors: "", gatekeepers: "", affected_groups: "", potential_resistors: "" }); } }, [open, JSON.stringify(initial)]);

  const GROUPS: Array<{ key: keyof Omit<StakeholderMap, "notes">; label: string; options: readonly { id: string; label: string }[]; color: string }> = [
    { key: "executive_sponsors",  label: "Executive Sponsors",  options: EXECUTIVE_SPONSORS,  color: "#60A5FA" },
    { key: "gatekeepers",         label: "Gatekeepers",         options: GATEKEEPERS,         color: "#FBBF24" },
    { key: "affected_groups",     label: "Affected Groups",     options: AFFECTED_GROUPS,     color: "#4ADE80" },
    { key: "potential_resistors", label: "Potential Resistors", options: POTENTIAL_RESISTORS, color: "#F87171" },
  ];

  const toggle = (key: keyof Omit<StakeholderMap, "notes">, id: string) => {
    setData(prev => ({
      ...prev,
      [key]: (prev[key] as string[]).includes(id) ? (prev[key] as string[]).filter(x => x !== id) : [...(prev[key] as string[]), id],
    }));
  };
  const addCustom = (key: keyof Omit<StakeholderMap, "notes">) => {
    const v = inputs[key].trim();
    if (v && !(data[key] as string[]).includes(v)) {
      setData(prev => ({ ...prev, [key]: [...(prev[key] as string[]), v] }));
    }
    setInputs(prev => ({ ...prev, [key]: "" }));
  };

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(data); onClose(); } catch { toast.error("Save failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Section 02 · Ambition</p>
          <DialogTitle>Stakeholder Map</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {GROUPS.map(g => (
            <div key={g.key} className="rounded-lg border border-border/40 bg-muted/10 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: g.color }}>{g.label}</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {g.options.map(o => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggle(g.key, o.id)}
                    className="text-xs px-2 py-0.5 rounded-full border transition-colors"
                    style={(data[g.key] as string[]).includes(o.id)
                      ? { borderColor: `${g.color}50`, background: `${g.color}20`, color: g.color }
                      : { borderColor: "hsl(var(--border) / 0.6)", background: "hsl(var(--muted) / 0.2)", color: "hsl(var(--muted-foreground))" }
                    }
                  >
                    {o.label}
                  </button>
                ))}
                {(data[g.key] as string[]).filter(id => !g.options.find(o => o.id === id)).map(id => (
                  <span key={id} className="text-xs px-2 py-0.5 rounded-full border flex items-center gap-1" style={{ borderColor: `${g.color}50`, background: `${g.color}20`, color: g.color }}>
                    {id}
                    <button type="button" onClick={() => toggle(g.key, id)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={inputs[g.key]}
                  onChange={e => setInputs(prev => ({ ...prev, [g.key]: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addCustom(g.key)}
                  className="flex-1 bg-muted/30 border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="Add custom…"
                />
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => addCustom(g.key)}>Add</button>
              </div>
            </div>
          ))}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Notes (optional)</p>
            <textarea
              value={data.notes ?? ""}
              onChange={e => setData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
              placeholder="Any additional context…"
            />
          </div>
        </div>
        <DialogFooter>
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground underline transition-colors mr-auto" onClick={onClose}>Cancel</button>
          <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Review Draft Modal ───────────────────────────────────────────────────────

function ReviewDraftModal({
  open, onClose, sectionKey, draft, onAccept,
}: {
  open: boolean;
  onClose: () => void;
  sectionKey: SectionKey;
  draft: unknown;
  onAccept: () => void;
}) {
  const meta = SECTION_META[sectionKey];
  const renderDraft = () => {
    if (!draft) return null;
    if (typeof draft === "string") return <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{draft}</p>;
    if (Array.isArray(draft)) {
      if (draft.length && typeof draft[0] === "object" && "title" in draft[0]) {
        return (
          <div className="space-y-3">
            {(draft as Principle[]).map((p, i) => (
              <div key={i} className="rounded-lg border border-border/40 bg-muted/10 p-3">
                <p className="text-sm font-semibold text-foreground mb-1">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.description}</p>
              </div>
            ))}
          </div>
        );
      }
      return (
        <ol className="space-y-2">
          {(draft as string[]).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <span className="w-5 h-5 rounded-full bg-teal-500/15 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-teal-400">{i + 1}</span>
              {item}
            </li>
          ))}
        </ol>
      );
    }
    if (typeof draft === "object") {
      const sm = draft as StakeholderMap;
      return (
        <div className="space-y-2 text-sm text-muted-foreground">
          {sm.executive_sponsors?.length > 0 && <p><strong className="text-foreground">Sponsors:</strong> {sm.executive_sponsors.join(", ")}</p>}
          {sm.gatekeepers?.length > 0 && <p><strong className="text-foreground">Gatekeepers:</strong> {sm.gatekeepers.join(", ")}</p>}
          {sm.affected_groups?.length > 0 && <p><strong className="text-foreground">Affected Groups:</strong> {sm.affected_groups.join(", ")}</p>}
          {sm.potential_resistors?.length > 0 && <p><strong className="text-foreground">Resistors:</strong> {sm.potential_resistors.join(", ")}</p>}
        </div>
      );
    }
    return null;
  };
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">AI Draft · Review</p>
          <DialogTitle>{meta.label}</DialogTitle>
        </DialogHeader>
        <div className="py-2">{renderDraft()}</div>
        <DialogFooter>
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground underline transition-colors mr-auto" onClick={onClose}>Discard</button>
          <Button size="sm" className="h-8 text-xs bg-teal-600 hover:bg-teal-500 text-white" onClick={onAccept}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Accept draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Batch Confirm Modal ──────────────────────────────────────────────────────

function BatchConfirmModal({ open, onClose, onConfirm, count }: { open: boolean; onClose: () => void; onConfirm: () => void; count: number }) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Draft everything with AI?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          This will draft {count} sections. You can edit anything afterwards. Continue?
        </p>
        <DialogFooter>
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground underline transition-colors mr-auto" onClick={onClose}>Cancel</button>
          <Button size="sm" className="h-8 text-xs bg-teal-600 hover:bg-teal-500 text-white" onClick={onConfirm}>
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />Draft {count} sections
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StrategyAmbitionPage() {
  const [, navigate] = useLocation();

  // Queries
  const assessmentQ     = trpc.intelligence.getStrategyAssessment.useQuery();
  const sectionsQ       = trpc.intelligence.getAmbitionSections.useQuery();
  const companyResultsQ = trpc.companyAssessment.getMyAssessmentResults.useQuery();

  const assessment     = assessmentQ.data;
  const sections       = sectionsQ.data;
  const companyResults = companyResultsQ.data;

  // Derived
  const businessLevel = assessment?.businessAmbitionLevel ?? 3;
  const peopleLevel   = assessment?.peopleAmbitionLevel   ?? 3;
  const bLevel        = BUSINESS_LEVELS[businessLevel];
  const pLevel        = PEOPLE_LEVELS[peopleLevel];

  const utils = trpc.useUtils();

  // ── Section states ─────────────────────────────────────────────────────────
  const sectionStates = useMemo((): Record<SectionKey, SectionState> => {
    if (!sections) return { vision: "empty", outcomes: "empty", waysOfWork: "empty", principles: "empty", aiLandscape: "empty", wontDo: "empty", stakeholderMap: "empty" };
    return {
      vision:         sections.vision ? "built" : "empty",
      outcomes:       sections.outcomes && sections.outcomes.length > 0 ? "built" : "empty",
      waysOfWork:     sections.waysOfWork ? "built" : "empty",
      principles:     sections.principles && sections.principles.length > 0 ? "built" : "empty",
      aiLandscape:    sections.aiLandscape && sections.aiLandscape.length > 0 ? "built" : "empty",
      wontDo:         sections.wontDo && sections.wontDo.length > 0 ? "built" : "empty",
      stakeholderMap: sections.stakeholderMap ? "built" : "empty",
    };
  }, [sections]);

  // Override with drafting state
  const [draftingSet, setDraftingSet] = useState<Set<SectionKey>>(new Set());
  const getState = (k: SectionKey): SectionState => draftingSet.has(k) ? "drafting" : sectionStates[k];

  const builtCount = useMemo(() => (Object.keys(SECTION_META) as SectionKey[]).filter(k => getState(k) === "built").length, [sectionStates, draftingSet]);
  const totalCount = Object.keys(SECTION_META).length;

  // ── Modal state ────────────────────────────────────────────────────────────
  const [visionModalOpen, setVisionModalOpen]         = useState(false);
  const [outcomesModalOpen, setOutcomesModalOpen]     = useState(false);
  const [waysModalOpen, setWaysModalOpen]             = useState(false);
  const [principlesModalOpen, setPrinciplesModalOpen] = useState(false);
  const [landscapeModalOpen, setLandscapeModalOpen]   = useState(false);
  const [wontDoModalOpen, setWontDoModalOpen]         = useState(false);
  const [stakeholderModalOpen, setStakeholderModalOpen] = useState(false);
  const [batchConfirmOpen, setBatchConfirmOpen]       = useState(false);

  // Review draft modal
  const [reviewDraft, setReviewDraft] = useState<{ sectionKey: SectionKey; draft: unknown } | null>(null);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveMut = trpc.intelligence.saveAmbitionSection.useMutation({
    onSuccess: () => { utils.intelligence.getAmbitionSections.invalidate(); utils.intelligence.getStrategyAssessment.invalidate(); },
    onError: (e) => toast.error(`Save failed: ${e.message}`),
  });

  const draftMut = trpc.intelligence.draftAmbitionSection.useMutation({
    onError: (e) => toast.error(`Draft failed: ${e.message}`),
  });

  const orgDescriptor = [
    companyResults?.companyName,
    (assessment as any)?.sector,
    (assessment as any)?.headcount ? `${Number((assessment as any).headcount).toLocaleString()} employees` : null,
  ].filter(Boolean).join(" · ") || null;

  // Map businessLevel (1-5) to brief's 1-4 tier
  const businessTier = Math.max(1, Math.min(4, Math.ceil(businessLevel / 1.25))) as 1 | 2 | 3 | 4;
  const hrTier = Math.max(1, Math.min(4, Math.ceil(peopleLevel / 1.25))) as 1 | 2 | 3 | 4;

  const draftSection = useCallback(async (sectionKey: SectionKey) => {
    if (sectionKey === "vision") { setVisionModalOpen(true); return; }
    if (sectionKey === "aiLandscape") { setLandscapeModalOpen(true); return; }
    setDraftingSet(prev => new Set(Array.from(prev).concat(sectionKey)));
    try {
      const result = await draftMut.mutateAsync({
        section: sectionKey as "outcomes" | "waysOfWork" | "principles" | "wontDo" | "stakeholderMap",
        orgDescriptor,
        businessAmbitionTier: businessTier,
        hrDeliveryTier: hrTier,
        visionStatement: sections?.vision ?? null,
      });
      setDraftingSet(prev => { const n = new Set(prev); n.delete(sectionKey); return n; });
      setReviewDraft({ sectionKey, draft: result.draft });
    } catch {
      setDraftingSet(prev => { const n = new Set(prev); n.delete(sectionKey); return n; });
    }
  }, [draftMut, orgDescriptor, businessTier, hrTier, sections?.vision]);

  const acceptDraft = useCallback(async () => {
    if (!reviewDraft) return;
    const { sectionKey, draft } = reviewDraft;
    try {
      await saveMut.mutateAsync({ section: sectionKey, value: draft } as any);
      setReviewDraft(null);
      toast.success("Draft accepted");
    } catch { /* handled by mutation */ }
  }, [reviewDraft, saveMut]);

  const cancelDraft = useCallback((sectionKey: SectionKey) => {
    setDraftingSet(prev => { const n = new Set(prev); n.delete(sectionKey); return n; });
  }, []);

  const draftAll = useCallback(async () => {
    setBatchConfirmOpen(false);
    const eligible = AI_ELIGIBLE_SECTIONS.filter(k => getState(k) === "empty");
    if (!eligible.length) { toast.info("All sections already built"); return; }
    // Start all in parallel — no review modal for batch
    await Promise.allSettled(eligible.map(async (sectionKey) => {
      setDraftingSet(prev => new Set(Array.from(prev).concat(sectionKey)));
      try {
        const result = await draftMut.mutateAsync({
          section: sectionKey as "outcomes" | "waysOfWork" | "principles" | "wontDo" | "stakeholderMap",
          orgDescriptor,
          businessAmbitionTier: businessTier,
          hrDeliveryTier: hrTier,
          visionStatement: sections?.vision ?? null,
        });
        await saveMut.mutateAsync({ section: sectionKey, value: result.draft } as any);
        setDraftingSet(prev => { const n = new Set(prev); n.delete(sectionKey); return n; });
      } catch {
        setDraftingSet(prev => { const n = new Set(prev); n.delete(sectionKey); return n; });
        toast.error(`Failed to draft ${SECTION_META[sectionKey].label}`);
      }
    }));
  }, [draftMut, saveMut, orgDescriptor, businessTier, hrTier, sections?.vision, sectionStates, draftingSet]);

  // Save helpers
  const saveSection = useCallback(async (section: SectionKey, value: unknown) => {
    await saveMut.mutateAsync({ section, value } as any);
  }, [saveMut]);

  // ── Loading ────────────────────────────────────────────────────────────────
  const isLoading = assessmentQ.isLoading || sectionsQ.isLoading;
  const isError   = assessmentQ.isError   || sectionsQ.isError;

  if (isLoading) {
    return (
      <SectionPageLayout sectionNumber="02" sectionLabel="Ambition" title="Where we're going" accentColor="#2DD4BF" icon={<Target className="w-5 h-5" />}>
        <div className="space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card p-5 space-y-3">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-2/3 rounded" />
            </div>
          ))}
        </div>
      </SectionPageLayout>
    );
  }

  if (isError) {
    return (
      <SectionPageLayout sectionNumber="02" sectionLabel="Ambition" title="Where we're going" accentColor="#2DD4BF" icon={<Target className="w-5 h-5" />}>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Failed to load ambition data</p>
            <Button size="sm" variant="outline" className="h-7 text-xs mt-2" onClick={() => { assessmentQ.refetch(); sectionsQ.refetch(); }}>Retry</Button>
          </div>
        </div>
      </SectionPageLayout>
    );
  }

  if (!assessment?.completed) {
    return (
      <SectionPageLayout sectionNumber="02" sectionLabel="Ambition" title="Where we're going" accentColor="#2DD4BF" icon={<Target className="w-5 h-5" />}>
        <div className="rounded-xl border border-dashed border-teal-500/20 bg-teal-500/4 p-8 flex flex-col items-center text-center gap-4">
          <Target className="w-8 h-8 text-teal-400" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Generate your strategy to set your ambition</p>
            <p className="text-sm text-muted-foreground leading-relaxed">Complete the Build Strategy wizard to generate a vision statement, guiding principles, and ambition framing.</p>
          </div>
          <Button size="sm" className="h-8 text-xs" onClick={() => navigate("/strategy/diagnostic")}>
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />Build Strategy
          </Button>
        </div>
      </SectionPageLayout>
    );
  }

  // ── Determine page state ───────────────────────────────────────────────────
  const allBuilt = builtCount === totalCount;
  const noneBuilt = builtCount === 0 && draftingSet.size === 0;
  const emptySectionCount = AI_ELIGIBLE_SECTIONS.filter(k => getState(k) === "empty").length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <SectionPageLayout sectionNumber="02" sectionLabel="Ambition" title="Where we're going" accentColor="#2DD4BF" icon={<Target className="w-5 h-5" />}>

        {/* ── Hero card (shown when at least one AI-eligible section is empty) ── */}
        {emptySectionCount > 0 && (
          <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <p className="text-sm font-semibold text-foreground">
                  {noneBuilt ? "Build your AI ambition" : "Continue building your ambition"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {noneBuilt
                  ? "Draft all 6 sections at once with AI, or build each section individually below."
                  : `${emptySectionCount} section${emptySectionCount > 1 ? "s" : ""} still to complete. Draft the remaining sections with AI or add manually.`}
              </p>
            </div>
            <Button
              size="sm"
              className="h-8 text-xs bg-teal-600 hover:bg-teal-500 text-white whitespace-nowrap"
              onClick={() => setBatchConfirmOpen(true)}
              disabled={draftingSet.size > 0}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />Draft everything with AI
            </Button>
          </div>
        )}

        {/* ── Wizard banner ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center gap-3">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-muted-foreground flex-1">Some sections of your ambition can only be changed by re-running the strategy assessment.</p>
          <button type="button" className="text-xs text-amber-400 hover:text-amber-300 font-medium whitespace-nowrap flex items-center gap-1 transition-colors" onClick={() => navigate("/strategy/diagnostic")}>
            Re-run assessment →
          </button>
        </div>

        {/* ── 1. Vision Statement ───────────────────────────────────────────── */}
        {getState("vision") === "empty" ? (
          <EmptySection
            sectionKey="vision"
            onDraftWithAI={() => { setVisionModalOpen(true); }}
            onAddManually={() => { setVisionModalOpen(true); }}
          />
        ) : (
          <div className="rounded-xl border border-teal-500/20 bg-teal-500/4 p-5">
            <BuiltSectionHeader label="Vision Statement" onEdit={() => setVisionModalOpen(true)} />
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-300 cursor-help">
                    Business: <strong className="font-semibold">{bLevel?.label ?? "—"}</strong>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">{bLevel?.waysOfWork}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-300 cursor-help">
                    HR: <strong className="font-semibold">{pLevel?.label ?? "—"}</strong>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">{pLevel?.tooltip}</TooltipContent>
              </Tooltip>
            </div>
            {(assessment as any)?.userVisionInput ? (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/20 font-medium mb-3">Your words</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/10 font-medium mb-3">AI-drafted · Edit to make it yours</span>
            )}
            <p className="text-base leading-relaxed text-foreground" style={{ fontFamily: "Georgia, 'Times New Roman', serif", lineHeight: "1.6" }}>
              <span className="text-teal-400/60 text-2xl leading-none mr-1 align-top">"</span>
              {sections?.vision}
              <span className="text-teal-400/60 text-2xl leading-none ml-1 align-bottom">"</span>
            </p>
          </div>
        )}

        {/* ── 2. Outcomes ───────────────────────────────────────────────────── */}
        {getState("outcomes") === "empty" ? (
          <EmptySection sectionKey="outcomes" onDraftWithAI={() => draftSection("outcomes")} onAddManually={() => setOutcomesModalOpen(true)} isDrafting={draftingSet.has("outcomes")} />
        ) : getState("outcomes") === "drafting" ? (
          <DraftingSection sectionKey="outcomes" onCancel={() => cancelDraft("outcomes")} />
        ) : (
          <div className="rounded-xl border border-border/40 bg-card p-5">
            <BuiltSectionHeader label="By the end of this strategy period, HR will:" onEdit={() => setOutcomesModalOpen(true)} />
            <ol className="space-y-3">
              {(sections?.outcomes ?? []).map((c, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-teal-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-teal-400">{i + 1}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{c}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── 3. Ways of Work ───────────────────────────────────────────────── */}
        {getState("waysOfWork") === "empty" ? (
          <EmptySection sectionKey="waysOfWork" onDraftWithAI={() => draftSection("waysOfWork")} onAddManually={() => setWaysModalOpen(true)} isDrafting={draftingSet.has("waysOfWork")} />
        ) : getState("waysOfWork") === "drafting" ? (
          <DraftingSection sectionKey="waysOfWork" onCancel={() => cancelDraft("waysOfWork")} />
        ) : (
          <div className="rounded-xl border border-border/40 bg-card p-5">
            <BuiltSectionHeader label="How AI will change ways of work" onEdit={() => setWaysModalOpen(true)} />
            <p className="text-sm text-muted-foreground leading-relaxed">{sections?.waysOfWork}</p>
          </div>
        )}

        {/* ── 4. Guiding Principles ─────────────────────────────────────────── */}
        {getState("principles") === "empty" ? (
          <EmptySection sectionKey="principles" onDraftWithAI={() => draftSection("principles")} onAddManually={() => setPrinciplesModalOpen(true)} isDrafting={draftingSet.has("principles")} />
        ) : getState("principles") === "drafting" ? (
          <DraftingSection sectionKey="principles" onCancel={() => cancelDraft("principles")} />
        ) : (
          <div className="rounded-xl border border-border/40 bg-card p-5">
            <BuiltSectionHeader label="Guiding Principles" onEdit={() => setPrinciplesModalOpen(true)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(sections?.principles ?? []).map((p, i) => {
                const isLast = i === (sections?.principles ?? []).length - 1;
                const isOdd  = (sections?.principles ?? []).length % 2 !== 0;
                return (
                  <div key={i} className={`rounded-lg border border-border/40 bg-muted/10 p-3 ${isLast && isOdd ? "sm:col-span-2" : ""}`}>
                    <p className="text-sm font-semibold text-foreground mb-1">{p.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 5. Current AI Landscape ───────────────────────────────────────── */}
        {getState("aiLandscape") === "empty" ? (
          <EmptySection sectionKey="aiLandscape" onAddManually={() => setLandscapeModalOpen(true)} />
        ) : (
          <div className="rounded-xl border border-border/40 bg-card p-5">
            <BuiltSectionHeader label="Current AI Landscape" onEdit={() => setLandscapeModalOpen(true)} />
            <p className="text-xs text-muted-foreground mb-3">Tools already deployed in HR — initiatives will complement rather than duplicate these.</p>
            <div className="flex flex-wrap gap-2">
              {(sections?.aiLandscape ?? []).map(toolId => {
                const tool = EXISTING_AI_TOOLS.find(t => t.id === toolId);
                const label = tool?.label ?? toolId;
                return (
                  <span key={toolId} className="text-xs px-2.5 py-1 rounded-full border border-border/60 bg-muted/30 text-muted-foreground">{label}</span>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 6. What We Won't Do ───────────────────────────────────────────── */}
        {getState("wontDo") === "empty" ? (
          <EmptySection sectionKey="wontDo" onDraftWithAI={() => draftSection("wontDo")} onAddManually={() => setWontDoModalOpen(true)} isDrafting={draftingSet.has("wontDo")} />
        ) : getState("wontDo") === "drafting" ? (
          <DraftingSection sectionKey="wontDo" onCancel={() => cancelDraft("wontDo")} />
        ) : (
          <div className="rounded-xl border border-red-500/15 bg-red-500/4 p-5">
            <BuiltSectionHeader label="What We Won't Do" onEdit={() => setWontDoModalOpen(true)} />
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">A strategy that makes no cuts is a wishlist. The following are explicitly out of scope for this strategy period.</p>
            <ul className="space-y-1 mb-3">
              {(sections?.wontDo ?? []).map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-400 text-xs flex-shrink-0 mt-0.5">×</span>
                  <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── 7. Stakeholder Map ────────────────────────────────────────────── */}
        {getState("stakeholderMap") === "empty" ? (
          <EmptySection sectionKey="stakeholderMap" onDraftWithAI={() => draftSection("stakeholderMap")} onAddManually={() => setStakeholderModalOpen(true)} isDrafting={draftingSet.has("stakeholderMap")} />
        ) : getState("stakeholderMap") === "drafting" ? (
          <DraftingSection sectionKey="stakeholderMap" onCancel={() => cancelDraft("stakeholderMap")} />
        ) : (
          <div className="rounded-xl border border-border/40 bg-card p-5">
            <BuiltSectionHeader label="Stakeholder Map" onEdit={() => setStakeholderModalOpen(true)} />
            {(() => {
              const sm = sections?.stakeholderMap as StakeholderMap | null | undefined;
              if (!sm) return null;
              return (
                <>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                    {[
                      { key: "executive_sponsors" as const,  label: "Executive Sponsors",  ids: sm.executive_sponsors ?? [],  options: EXECUTIVE_SPONSORS,  color: "#60A5FA",  icon: <UserCheck className="w-3.5 h-3.5" /> },
                      { key: "gatekeepers" as const,         label: "Gatekeepers",         ids: sm.gatekeepers ?? [],         options: GATEKEEPERS,         color: "#FBBF24",  icon: <LockIcon className="w-3.5 h-3.5" /> },
                      { key: "affected_groups" as const,     label: "Affected Groups",     ids: sm.affected_groups ?? [],     options: AFFECTED_GROUPS,     color: "#4ADE80",  icon: <Users className="w-3.5 h-3.5" /> },
                      { key: "potential_resistors" as const, label: "Potential Resistors", ids: sm.potential_resistors ?? [], options: POTENTIAL_RESISTORS, color: "#F87171",  icon: <AlertCircle className="w-3.5 h-3.5" /> },
                    ].map(q => (
                      <div key={q.key} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span style={{ color: q.color }}>{q.icon}</span>
                          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: q.color }}>{q.label}</p>
                        </div>
                        {q.ids.length === 0 ? (
                          <p className="text-xs text-muted-foreground/50 italic">None identified</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {q.ids.map(id => {
                              const opt = (q.options as readonly { id: string; label: string }[]).find(o => o.id === id);
                              const label = opt?.label ?? id;
                              return (
                                <span key={id} className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: `${q.color}40`, background: `${q.color}15`, color: q.color }}>
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {sm.notes && (
                    <div className="mt-3 rounded-lg bg-muted/20 border border-border/40 px-3 py-2">
                      <p className="text-xs text-muted-foreground leading-relaxed">{sm.notes}</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* ── Footer progress + CTA ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Progress</p>
              <p className="text-sm text-foreground">
                {builtCount} of {totalCount} sections complete
                {draftingSet.size > 0 && <span className="text-teal-400 ml-2 text-xs">· {draftingSet.size} drafting…</span>}
              </p>
            </div>
            {allBuilt && (
              <Button variant="outline" size="sm" className="text-xs h-8 border-border/50 hover:border-border" onClick={() => navigate("/strategy/plan")}>
                View plan<ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )}
          </div>
          <div className="w-full h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-500"
              style={{ width: `${(builtCount / totalCount) * 100}%` }}
            />
          </div>
          {!allBuilt && (
            <p className="text-xs text-muted-foreground mt-2">Complete all sections to unlock the initiative roadmap.</p>
          )}
        </div>

      </SectionPageLayout>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      <VisionModal
        isOpen={visionModalOpen}
        onClose={() => setVisionModalOpen(false)}
        onSaved={(visionText) => {
          setVisionModalOpen(false);
          assessmentQ.refetch();
          sectionsQ.refetch();
          (window as any).umami?.track("strategy.ambition.vision-modal.saved");
        }}
        initialInputs={(assessment as any)?.visionInputs as VisionInputs | null | undefined}
        initialDraft={sections?.vision ?? null}
        orgDescriptor={orgDescriptor}
        companyName={companyResults?.companyName ?? null}
        capabilityScore={companyResults?.overallScore ?? null}
        capabilityLabel={companyResults?.maturityLabel ?? null}
        capabilityCount={companyResults ? 1 : null}
      />

      <OutcomesModal
        open={outcomesModalOpen}
        onClose={() => setOutcomesModalOpen(false)}
        initial={sections?.outcomes ?? []}
        onSave={async (v) => { await saveSection("outcomes", v); }}
      />

      <WaysOfWorkModal
        open={waysModalOpen}
        onClose={() => setWaysModalOpen(false)}
        initial={sections?.waysOfWork ?? ""}
        onSave={async (v) => { await saveSection("waysOfWork", v); }}
      />

      <PrinciplesModal
        open={principlesModalOpen}
        onClose={() => setPrinciplesModalOpen(false)}
        initial={sections?.principles ?? []}
        onSave={async (v) => { await saveSection("principles", v); }}
      />

      <AILandscapeModal
        open={landscapeModalOpen}
        onClose={() => setLandscapeModalOpen(false)}
        initial={sections?.aiLandscape ?? []}
        onSave={async (v) => { await saveSection("aiLandscape", v); }}
      />

      <WontDoModal
        open={wontDoModalOpen}
        onClose={() => setWontDoModalOpen(false)}
        initial={sections?.wontDo ?? []}
        onSave={async (v) => { await saveSection("wontDo", v); }}
      />

      <StakeholderModal
        open={stakeholderModalOpen}
        onClose={() => setStakeholderModalOpen(false)}
        initial={sections?.stakeholderMap as StakeholderMap | null ?? null}
        onSave={async (v) => { await saveSection("stakeholderMap", v); }}
      />

      <BatchConfirmModal
        open={batchConfirmOpen}
        onClose={() => setBatchConfirmOpen(false)}
        onConfirm={draftAll}
        count={AI_ELIGIBLE_SECTIONS.filter(k => getState(k) === "empty").length}
      />

      {reviewDraft && (
        <ReviewDraftModal
          open={true}
          onClose={() => setReviewDraft(null)}
          sectionKey={reviewDraft.sectionKey}
          draft={reviewDraft.draft}
          onAccept={acceptDraft}
        />
      )}

    </TooltipProvider>
  );
}
