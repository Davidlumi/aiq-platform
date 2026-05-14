import { useState, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ChevronRight, X, Plus, RefreshCw, ChevronDown, AlertTriangle, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "foundation" | "build" | "scale" | "optimise";
type InitiativeStatus = "suggested" | "yours" | "edited" | "user_added" | "dismissed";

interface ConnectsTo {
  type: "outcome" | "principle";
  index: number;
  label: string;
}

interface Initiative {
  id: string;
  tenantId: string;
  phase: Phase;
  title: string;
  description: string;
  hrFunction: string | null;
  costLow: number | null;
  costHigh: number | null;
  costNote: string | null;
  whySuggesting: string | null;
  whatInvolvesJson: string[] | null;
  worthKnowing: string | null;
  connectsToJson: ConnectsTo[] | null;
  isDismissed: number;
  dismissedAt: Date | null;
  diagDismissedJson: unknown;
  status: InitiativeStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASES: { key: Phase; label: string; months: string; color: string; number: string }[] = [
  { key: "foundation", label: "Foundation", months: "Months 1–3", color: "#5DCAA5", number: "01" },
  { key: "build",      label: "Build",       months: "Months 4–6", color: "#a78bfa", number: "02" },
  { key: "scale",      label: "Scale",       months: "Months 7–12", color: "#34d399", number: "03" },
  { key: "optimise",   label: "Optimise",    months: "Months 13–18", color: "#f59e0b", number: "04" },
];

const FUNCTION_OPTIONS = [
  "Talent Acquisition", "Learning & Development", "Ethics & Governance",
  "Workforce Planning", "HR Operations", "People Analytics", "Employee Experience",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCost(low: number | null, high: number | null): string {
  if (low == null || high == null || (low === 0 && high === 0)) return "—";
  // Values are stored in £K units (e.g. 40 = £40K, 180 = £180K)
  const fmt = (n: number) => `£${n}K`;
  return `${fmt(low)}–${fmt(high)}`;
}

function boldKeywords(text: string): React.ReactNode {
  // Bold **text** patterns
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} className="font-semibold" style={{ color: "#E9ECF2" }}>{p.slice(2, -2)}</strong>
      : p
  );
}

// ─── Initiative Card (Lean) ───────────────────────────────────────────────────

function InitiativeCard({ initiative, onClick }: { initiative: Initiative; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg transition-all duration-150 group"
      style={{
        background: "rgba(255,255,255,0.015)",
        border: "0.5px solid rgba(255,255,255,0.06)",
        padding: "0.65rem 0.9rem",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.border = "0.5px solid rgba(93,202,165,0.3)";
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.border = "0.5px solid rgba(255,255,255,0.06)";
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.015)";
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: "#E9ECF2", fontSize: "12px" }}>
            {initiative.title}
          </p>
          <p className="truncate mt-0.5" style={{ color: "#9ca3b0", fontSize: "11px" }}>
            {initiative.description}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {initiative.status === "yours" && (
            <span
              className="uppercase tracking-wider"
              style={{ fontSize: "9px", letterSpacing: "0.04em", color: "#7ec9ab" }}
            >
              Yours
            </span>
          )}
          <ChevronRight
            size={14}
            className="transition-colors"
            style={{ color: "#6c7385" }}
          />
        </div>
      </div>
    </button>
  );
}

// ─── Add Affordance ───────────────────────────────────────────────────────────

function AddAffordance({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg transition-all duration-150"
      style={{
        border: "0.5px dashed rgba(255,255,255,0.15)",
        padding: "0.65rem 0.9rem",
        background: "transparent",
        borderRadius: "8px",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(93,202,165,0.4)";
        (e.currentTarget as HTMLElement).style.background = "rgba(93,202,165,0.03)";
        const icon = (e.currentTarget as HTMLElement).querySelector(".add-icon") as HTMLElement | null;
        const label = (e.currentTarget as HTMLElement).querySelector(".add-label") as HTMLElement | null;
        if (icon) icon.style.color = "#5DCAA5";
        if (label) label.style.color = "#5DCAA5";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
        (e.currentTarget as HTMLElement).style.background = "transparent";
        const icon = (e.currentTarget as HTMLElement).querySelector(".add-icon") as HTMLElement | null;
        const label = (e.currentTarget as HTMLElement).querySelector(".add-label") as HTMLElement | null;
        if (icon) icon.style.color = "#7a8294";
        if (label) label.style.color = "#7a8294";
      }}
    >
      <div className="flex items-center gap-2">
        <Plus size={12} className="add-icon shrink-0" style={{ color: "#7a8294" }} />
        <span className="add-label" style={{ fontSize: "11px", color: "#7a8294" }}>Add your own</span>
      </div>
    </button>
  );
}

// ─── Diagnostic Banner ────────────────────────────────────────────────────────

function DiagnosticBanner({
  outcomeNumber, outcomeTitle, type, onAddOne, onDismiss,
}: {
  outcomeNumber: number; outcomeTitle: string; type: "uncovered" | "thin";
  onAddOne: () => void; onDismiss: () => void;
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg mb-2"
      style={{
        background: "rgba(245,158,11,0.05)",
        borderLeft: "2px solid rgba(245,158,11,0.5)",
        padding: "0.6rem 0.8rem",
      }}
    >
      <AlertTriangle size={13} style={{ color: "#fbbf24", marginTop: "1px", flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <span className="font-semibold mr-1" style={{ fontSize: "11px", color: "#fbbf24" }}>
          Outcome {outcomeNumber}:
        </span>
        <span style={{ fontSize: "11px", color: "#cfd2d8" }}>
          {type === "uncovered"
            ? `"${outcomeTitle}" has no initiatives addressing it.`
            : `"${outcomeTitle}" has only 1 initiative. Consider adding a second.`}
        </span>
        {" "}
        <button
          onClick={onAddOne}
          className="underline"
          style={{ fontSize: "11px", color: "#fbbf24" }}
        >
          Add one →
        </button>
      </div>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <X size={12} style={{ color: "#fbbf24" }} />
      </button>
    </div>
  );
}

// ─── Connects Pills ───────────────────────────────────────────────────────────

function ConnectsPill({ c }: { c: ConnectsTo }) {
  const [, navigate] = useLocation();
  const anchor = c.type === "outcome" ? `#outcome-${c.index}` : `#principle-${c.index}`;
  return (
    <button
      onClick={() => navigate(`/strategy/ambition${anchor}`)}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors"
      style={{
        border: "1px solid rgba(93,202,165,0.3)",
        background: "rgba(93,202,165,0.06)",
        fontSize: "10px",
        color: "#7ec9ab",
      }}
    >
      <span className="opacity-80 truncate max-w-[160px]">{c.label}</span>
    </button>
  );
}

// ─── Initiative Modal ─────────────────────────────────────────────────────────

interface ModalState {
  mode: "view" | "edit" | "add";
  initiative: Initiative | null;
  addPhase?: Phase;
}

function InitiativeModal({
  state, onClose, outcomes, principles, onSaved, onDismissed,
}: {
  state: ModalState;
  onClose: () => void;
  outcomes: { number: number; title: string }[];
  principles: { number: number; title: string }[];
  onSaved: () => void;
  onDismissed: () => void;
}) {
  const [mode, setMode] = useState<"view" | "edit">(state.mode === "add" ? "edit" : "view");
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const [showMovePhase, setShowMovePhase] = useState(false);

  // Edit form state
  const init = state.initiative;
  const [title, setTitle] = useState(init?.title ?? "");
  const [description, setDescription] = useState(init?.description ?? "");
  const [phase, setPhase] = useState<Phase>(init?.phase ?? state.addPhase ?? "foundation");
  const [functionArea, setFunctionArea] = useState<string>(init?.hrFunction ?? "");
  const [costLow, setCostLow] = useState(init?.costLow?.toString() ?? "");
  const [costHigh, setCostHigh] = useState(init?.costHigh?.toString() ?? "");
  const [whatInvolves, setWhatInvolves] = useState<string[]>(init?.whatInvolvesJson ?? [""]);
  const [worthKnowing, setWorthKnowing] = useState(init?.worthKnowing ?? "");
  const [connectsTo, setConnectsTo] = useState<ConnectsTo[]>(init?.connectsToJson ?? []);

  const saveInitiative = trpc.hwgt.saveInitiative.useMutation();
  const dismissInitiative = trpc.hwgt.dismissInitiative.useMutation();
  const movePhase = trpc.hwgt.moveInitiativePhase.useMutation();
  const regenerate = trpc.hwgt.regenerateInitiative.useMutation();

  const isAdd = state.mode === "add";
  const phaseInfo = PHASES.find(p => p.key === (init?.phase ?? phase)) ?? PHASES[0];

  const statusLabel = isAdd ? null : init?.status === "user_added" ? "Yours" : init?.status === "edited" ? "Suggested · Edited" : "Suggested";

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    await saveInitiative.mutateAsync({
      id: isAdd ? undefined : init!.id,
      phase,
      title: title.trim(),
      description: description.trim(),
      hrFunction: functionArea || null,
      costLow: costLow ? parseInt(costLow) : null,
      costHigh: costHigh ? parseInt(costHigh) : null,
      whatInvolvesJson: whatInvolves.filter(w => w.trim()),
      worthKnowing: worthKnowing || null,
      connectsToJson: connectsTo,
      status: isAdd ? "user_added" : undefined,
    });
    onSaved();
    onClose();
  };

  const handleDismiss = async () => {
    if (!init) return;
    await dismissInitiative.mutateAsync({ id: init.id });
    onDismissed();
    onClose();
  };

  const handleMovePhase = async (newPhase: Phase) => {
    if (!init) return;
    await movePhase.mutateAsync({ id: init.id, phase: newPhase });
    setShowMovePhase(false);
    onSaved();
    onClose();
  };

  const handleRegenerate = async () => {
    if (!init) return;
    await regenerate.mutateAsync({ id: init.id });
    onSaved();
    toast.success("Initiative regenerated");
  };

  const toggleConnects = (type: "outcome" | "principle", index: number, label: string) => {
    setConnectsTo(prev => {
      const exists = prev.some(c => c.type === type && c.index === index);
      if (exists) return prev.filter(c => !(c.type === type && c.index === index));
      return [...prev, { type, index, label }];
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <DialogHeader className="pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: phaseInfo.color }}
            />
            <span style={{ fontSize: "10px", color: "#9ca3b0" }}>
              {phaseInfo.label} · {phaseInfo.months}
            </span>
            {statusLabel && (
              <span
                className="ml-auto rounded-full px-2 py-0.5"
                style={{
                  fontSize: "9px",
                  background: "rgba(255,255,255,0.06)",
                  color: "#9ca3b0",
                  letterSpacing: "0.03em",
                }}
              >
                {statusLabel}
              </span>
            )}
          </div>
          <DialogTitle style={{ fontSize: "16px", fontWeight: 500, color: "#E9ECF2" }}>
            {mode === "edit" && isAdd ? "Add initiative" : mode === "edit" ? "Edit initiative" : init?.title}
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="py-4 space-y-5">
          {mode === "view" && init ? (
            <>
              {/* 1. Why suggesting */}
              {init.whySuggesting && (
                <section>
                  <p className="mb-2" style={{ fontSize: "10px", color: "#5DCAA5", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Why we're suggesting this
                  </p>
                  <p style={{ fontSize: "12px", color: "#cfd2d8", lineHeight: 1.6 }}>
                    {boldKeywords(init.whySuggesting)}
                  </p>
                </section>
              )}

              {/* 2. What involves */}
              {init.whatInvolvesJson && init.whatInvolvesJson.length > 0 && (
                <section>
                  <p className="mb-2" style={{ fontSize: "10px", color: "#5DCAA5", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    What it involves
                  </p>
                  <ul className="space-y-1.5">
                    {init.whatInvolvesJson.map((item, i) => (
                      <li key={i} className="flex items-start gap-2" style={{ fontSize: "12px", color: "#cfd2d8", lineHeight: 1.55 }}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: "#5DCAA5" }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 3. How connects */}
              {init.connectsToJson && init.connectsToJson.length > 0 && (
                <section>
                  <p className="mb-2" style={{ fontSize: "10px", color: "#5DCAA5", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    How this connects to your strategy
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {init.connectsToJson.map((c, i) => <ConnectsPill key={i} c={c} />)}
                  </div>
                </section>
              )}

              {/* 4. Estimated cost */}
              {(init.costLow || init.costHigh) && (
                <section>
                  <p className="mb-1" style={{ fontSize: "10px", color: "#5DCAA5", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Estimated cost
                  </p>
                  <p className="text-lg font-semibold" style={{ color: "#5DCAA5" }}>
                    {fmtCost(init.costLow, init.costHigh)}
                  </p>
                  {init.costNote && (
                    <p className="mt-1" style={{ fontSize: "11px", color: "#6c7385" }}>{init.costNote}</p>
                  )}
                </section>
              )}

              {/* 5. Worth knowing */}
              {init.worthKnowing && (
                <section
                  className="rounded-lg p-3"
                  style={{
                    background: "rgba(245,158,11,0.04)",
                    borderLeft: "2px solid rgba(245,158,11,0.35)",
                  }}
                >
                  <p className="mb-1.5" style={{ fontSize: "10px", color: "#fbbf24", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Worth knowing
                  </p>
                  <p style={{ fontSize: "12px", color: "#cfd2d8", lineHeight: 1.6 }}>
                    {boldKeywords(init.worthKnowing)}
                  </p>
                </section>
              )}
            </>
          ) : (
            /* Edit / Add form */
            <div className="space-y-4">
              <div>
                <label className="block mb-1" style={{ fontSize: "11px", color: "#9ca3b0" }}>Title *</label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Plain English, action-oriented"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#E9ECF2", fontSize: "13px" }}
                />
              </div>
              <div>
                <label className="block mb-1" style={{ fontSize: "11px", color: "#9ca3b0" }}>Description *</label>
                <Input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="One line — what does this actually do?"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#E9ECF2", fontSize: "13px" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1" style={{ fontSize: "11px", color: "#9ca3b0" }}>Phase *</label>
                  <Select value={phase} onValueChange={v => setPhase(v as Phase)}>
                    <SelectTrigger style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#E9ECF2", fontSize: "12px" }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHASES.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block mb-1" style={{ fontSize: "11px", color: "#9ca3b0" }}>Function</label>
                  <Select value={functionArea || "none"} onValueChange={v => setFunctionArea(v === "none" ? "" : v)}>
                    <SelectTrigger style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#E9ECF2", fontSize: "12px" }}>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {FUNCTION_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1" style={{ fontSize: "11px", color: "#9ca3b0" }}>Cost low (£)</label>
                  <Input type="number" value={costLow} onChange={e => setCostLow(e.target.value)} placeholder="e.g. 40000"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#E9ECF2", fontSize: "13px" }} />
                </div>
                <div>
                  <label className="block mb-1" style={{ fontSize: "11px", color: "#9ca3b0" }}>Cost high (£)</label>
                  <Input type="number" value={costHigh} onChange={e => setCostHigh(e.target.value)} placeholder="e.g. 80000"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#E9ECF2", fontSize: "13px" }} />
                </div>
              </div>
              <div>
                <label className="block mb-1" style={{ fontSize: "11px", color: "#9ca3b0" }}>What it involves</label>
                <div className="space-y-1.5">
                  {whatInvolves.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={item} onChange={e => {
                        const next = [...whatInvolves]; next[i] = e.target.value; setWhatInvolves(next);
                      }} placeholder={`Activity ${i + 1}`}
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#E9ECF2", fontSize: "12px" }} />
                      <button onClick={() => setWhatInvolves(prev => prev.filter((_, j) => j !== i))} className="opacity-50 hover:opacity-100">
                        <X size={12} style={{ color: "#9ca3b0" }} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => setWhatInvolves(prev => [...prev, ""])} className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity" style={{ fontSize: "11px", color: "#5DCAA5" }}>
                    <Plus size={11} /> Add activity
                  </button>
                </div>
              </div>
              <div>
                <label className="block mb-1" style={{ fontSize: "11px", color: "#9ca3b0" }}>Worth knowing</label>
                <Textarea value={worthKnowing} onChange={e => setWorthKnowing(e.target.value)} rows={3} placeholder="Risks, compliance notes, dependencies…"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#E9ECF2", fontSize: "12px", resize: "none" }} />
              </div>
              {/* Connects to */}
              {(outcomes.length > 0 || principles.length > 0) && (
                <div>
                  <label className="block mb-2" style={{ fontSize: "11px", color: "#9ca3b0" }}>Connects to</label>
                  <div className="space-y-1">
                    {outcomes.map(o => {
                      const checked = connectsTo.some(c => c.type === "outcome" && c.index === o.number);
                      return (
                        <label key={`o${o.number}`} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={() => toggleConnects("outcome", o.number, o.title)}
                            className="rounded" style={{ accentColor: "#5DCAA5" }} />
                          <span style={{ fontSize: "11px", color: "#cfd2d8" }}>Outcome {o.number}: {o.title}</span>
                        </label>
                      );
                    })}
                    {principles.map(p => {
                      const checked = connectsTo.some(c => c.type === "principle" && c.index === p.number);
                      return (
                        <label key={`p${p.number}`} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={() => toggleConnects("principle", p.number, p.title)}
                            className="rounded" style={{ accentColor: "#5DCAA5" }} />
                          <span style={{ fontSize: "11px", color: "#cfd2d8" }}>Principle {p.number}: {p.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dismiss confirmation */}
        {showDismissConfirm && (
          <div className="border-t pt-4 space-y-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: "13px", color: "#E9ECF2", fontWeight: 500 }}>Dismiss this initiative?</p>
            <p style={{ fontSize: "12px", color: "#9ca3b0" }}>It will be removed from your plan.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDismissConfirm(false)} className="flex-1">Cancel</Button>
              <Button size="sm" onClick={handleDismiss} disabled={dismissInitiative.isPending}
                className="flex-1" style={{ background: "#ef4444", color: "#fff", border: "none" }}>
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Action bar */}
        {!showDismissConfirm && (
          <div className="border-t pt-4 flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {mode === "view" ? (
              <>
                <Button size="sm" onClick={() => setMode("edit")} style={{ background: "#5DCAA5", color: "#0f1117", fontWeight: 600, fontSize: "12px" }}>
                  Edit
                </Button>
                {/* Move phase */}
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowMovePhase(v => !v)}
                    className="flex items-center gap-1" style={{ fontSize: "12px", color: "#cfd2d8", borderColor: "rgba(255,255,255,0.12)" }}>
                    Move phase <ChevronDown size={12} />
                  </Button>
                  {showMovePhase && (
                    <div className="absolute bottom-full left-0 mb-1 rounded-lg overflow-hidden z-50"
                      style={{ background: "var(--card)", border: "1px solid var(--border)", minWidth: "140px" }}>
                      {PHASES.filter(p => p.key !== init?.phase).map(p => (
                        <button key={p.key} onClick={() => handleMovePhase(p.key)}
                          className="w-full text-left px-3 py-2 hover:bg-foreground/5 transition-colors"
                          style={{ fontSize: "12px", color: "#cfd2d8" }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerate.isPending}
                  className="flex items-center gap-1" style={{ fontSize: "12px", color: "#cfd2d8", borderColor: "rgba(255,255,255,0.12)" }}>
                  <RefreshCw size={11} className={regenerate.isPending ? "animate-spin" : ""} />
                  Regenerate
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDismissConfirm(true)}
                  className="ml-auto hover:text-red-400 transition-colors" style={{ fontSize: "12px", color: "#6c7385" }}>
                  Dismiss
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" onClick={handleSave} disabled={saveInitiative.isPending}
                  style={{ background: "#5DCAA5", color: "#0f1117", fontWeight: 600, fontSize: "12px" }}>
                  {saveInitiative.isPending ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { if (isAdd) onClose(); else setMode("view"); }}
                  style={{ fontSize: "12px", color: "#cfd2d8", borderColor: "rgba(255,255,255,0.12)" }}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StrategyRoadmapPage() {
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [dismissedBanners, setDismissedBanners] = useState<string[]>([]);
  const [showOrgContextBanner, setShowOrgContextBanner] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const { data: initiatives, refetch } = trpc.hwgt.getInitiatives.useQuery();
  const { data: ambitionData } = trpc.intelligence.getAmbitionSections.useQuery();
  const { data: orgCtx } = trpc.intelligence.orgContext.useQuery();
  const regeneratePlan = trpc.hwgt.regeneratePlan.useMutation();
  const markReviewed = trpc.hwgt.markReviewed.useMutation();

  const activeInitiatives = useMemo(
    () => (initiatives ?? []).filter(i => i.isDismissed === 0 && (i as any).status !== "dismissed"),
    [initiatives]
  );

  // Outcomes and principles from ambition page
  const outcomes: { number: number; title: string }[] = useMemo(() => {
    const raw = ambitionData?.outcomes ?? [];
    return raw.map((o: { number: number; title: string }) => ({ number: o.number, title: o.title }));
  }, [ambitionData]);

  const principles: { number: number; title: string }[] = useMemo(() => {
    const raw = ambitionData?.principles ?? [];
    return raw.map((p: { title: string }, i: number) => ({ number: i + 1, title: p.title }));
  }, [ambitionData]);

  // Coverage diagnostics
  const diagnostics = useMemo(() => {
    const results: { outcomeNumber: number; outcomeTitle: string; type: "uncovered" | "thin" }[] = [];
    outcomes.forEach(o => {
      const count = activeInitiatives.filter(i =>
        i.connectsToJson?.some((c: ConnectsTo) => c.type === "outcome" && c.index === o.number)
      ).length;
      if (count === 0) results.push({ outcomeNumber: o.number, outcomeTitle: o.title, type: "uncovered" });
      else if (count === 1) results.push({ outcomeNumber: o.number, outcomeTitle: o.title, type: "thin" });
    });
    return results;
  }, [outcomes, activeInitiatives]);

  // Context strip — only org-context items (not strategy-side inputs like ambition/principles)
  const contextStrip = useMemo(() => {
    const orgItems: string[] = [];
    if (orgCtx?.sector) orgItems.push(`${String(orgCtx.sector).replace(/_/g, " ")} sector`);
    if (orgCtx?.headcount) orgItems.push(`${Number(orgCtx.headcount).toLocaleString()}-person organisation`);
    if ((orgCtx as any)?.hrTeamSize) orgItems.push(`${(orgCtx as any).hrTeamSize}-person HR team`);
    if ((orgCtx as any)?.coreHrSystem) orgItems.push(`${(orgCtx as any).coreHrSystem} HRIS`);
    if ((orgCtx as any)?.regulatoryExposure) orgItems.push((orgCtx as any).regulatoryExposure);

    if (orgItems.length >= 2) {
      return { type: "full" as const, orgItems };
    } else if (orgItems.length > 0) {
      return { type: "partial" as const, orgItems };
    } else {
      return { type: "empty" as const, orgItems: [] };
    }
  }, [orgCtx]);

  // Phase cost totals
  const phaseCosts = useMemo(() => {
    const totals: Record<Phase, { low: number; high: number; count: number }> = {
      foundation: { low: 0, high: 0, count: 0 },
      build: { low: 0, high: 0, count: 0 },
      scale: { low: 0, high: 0, count: 0 },
      optimise: { low: 0, high: 0, count: 0 },
    };
    activeInitiatives.forEach(i => {
      totals[i.phase].count++;
      totals[i.phase].low += i.costLow ?? 0;
      totals[i.phase].high += i.costHigh ?? 0;
    });
    return totals;
  }, [activeInitiatives]);

  const planTotal = useMemo(() => {
    let low = 0, high = 0;
    activeInitiatives.forEach(i => { low += i.costLow ?? 0; high += i.costHigh ?? 0; });
    return { low, high, count: activeInitiatives.length };
  }, [activeInitiatives]);

  const handleRegenerate = async () => {
    await regeneratePlan.mutateAsync();
    await refetch();
    toast.success("Plan regenerated");
  };

  const handleMarkReviewed = async () => {
    await markReviewed.mutateAsync();
    setReviewed(true);
    toast.success("Plan marked as reviewed");
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-6" style={{ fontSize: "11px", color: "#6c7385" }}>
          <Link href="/strategy" className="hover:text-teal-400 transition-colors">HR AI Strategy</Link>
          <ChevronRight size={12} />
          <span style={{ color: "#9ca3b0" }}>How we get there</span>
        </div>

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="mb-1" style={{ fontSize: "10px", color: "#6c7385", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Section 03
            </p>
            <h1 className="flex items-center gap-2" style={{ fontSize: "22px", fontWeight: 600, color: "#E9ECF2" }}>
              <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: "#5DCAA5" }} />
              How we get there
            </h1>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {/* Edit org context — neutral secondary */}
            <button
              onClick={() => { setShowOrgContextBanner(true); }}
              className="h-8 px-3 rounded-md flex items-center gap-1.5 transition-all"
              style={{
                fontSize: "11px",
                color: "#E9ECF2",
                border: "0.5px solid rgba(255,255,255,0.2)",
                background: "transparent",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(93,202,165,0.5)";
                (e.currentTarget as HTMLElement).style.color = "#5DCAA5";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)";
                (e.currentTarget as HTMLElement).style.color = "#E9ECF2";
              }}
            >
              Edit org context
            </button>
            {/* Regenerate plan — teal-tinted, more prominent */}
            <button
              onClick={handleRegenerate}
              disabled={regeneratePlan.isPending}
              className="h-8 px-3 rounded-md flex items-center gap-1.5 transition-all"
              style={{
                fontSize: "11px",
                color: "#5DCAA5",
                border: "0.5px solid rgba(93,202,165,0.35)",
                background: "rgba(93,202,165,0.06)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(93,202,165,0.1)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(93,202,165,0.6)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(93,202,165,0.06)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(93,202,165,0.35)";
              }}
            >
              <RefreshCw size={11} className={regeneratePlan.isPending ? "animate-spin" : ""} />
              Regenerate plan
            </button>
          </div>
        </div>

        {/* Org context updated banner */}
        {showOrgContextBanner && (
          <div className="flex items-center justify-between gap-3 rounded-lg mb-4 px-4 py-3"
            style={{ background: "rgba(93,202,165,0.06)", border: "1px solid rgba(93,202,165,0.2)" }}>
            <p style={{ fontSize: "12px", color: "#cfd2d8" }}>
              Org context updated. Regenerate suggestions?
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => { handleRegenerate(); setShowOrgContextBanner(false); }}
                style={{ background: "#5DCAA5", color: "#0f1117", fontWeight: 600, fontSize: "11px" }}>
                Regenerate now
              </Button>
              <button onClick={() => setShowOrgContextBanner(false)} className="opacity-60 hover:opacity-100">
                <X size={13} style={{ color: "#9ca3b0" }} />
              </button>
            </div>
          </div>
        )}

        {/* Context strip — left-bordered callout pattern */}
        <div
          className="mb-5"
          style={{
            background: "rgba(93,202,165,0.04)",
            borderLeft: "2px solid rgba(93,202,165,0.5)",
            borderRight: "none",
            borderTop: "none",
            borderBottom: "none",
            borderRadius: "0 6px 6px 0",
            padding: "0.55rem 0.85rem",
          }}
        >
          <p style={{ fontSize: "11px", color: "#9ca3b0", lineHeight: 1.55 }}>
            <span style={{ color: "#cfd2d8", fontWeight: 500 }}>
              {planTotal.count} suggested · {activeInitiatives.filter(i => (i as any).status === "user_added").length} added by you.
            </span>
            {" "}
            {contextStrip.type === "full" && (
              <>
                Based on your strategy and your org:{" "}
                <span style={{ color: "#cfd2d8", fontWeight: 500 }}>{contextStrip.orgItems.join(", ")}</span>.
                {" "}
                <button
                  onClick={() => setShowOrgContextBanner(true)}
                  style={{ color: "#5DCAA5", fontWeight: 500, textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.textDecoration = "underline"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.textDecoration = "none"}
                >
                  Edit context →
                </button>
              </>
            )}
            {contextStrip.type === "partial" && (
              <>
                Based on partial context — your strategy plus what we know about your org.
                {" "}
                <button
                  onClick={() => setShowOrgContextBanner(true)}
                  style={{ color: "#5DCAA5", fontWeight: 500, textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.textDecoration = "underline"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.textDecoration = "none"}
                >
                  Add more →
                </button>
              </>
            )}
            {contextStrip.type === "empty" && (
              <>
                Based on partial context — your strategy plus what we know about your org.
                {" "}
                <button
                  onClick={() => setShowOrgContextBanner(true)}
                  style={{ color: "#5DCAA5", fontWeight: 500, textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.textDecoration = "underline"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.textDecoration = "none"}
                >
                  Add more →
                </button>
              </>
            )}
          </p>
        </div>

        {/* Diagnostic banners */}
        {diagnostics
          .filter(d => !dismissedBanners.includes(`${d.type}-${d.outcomeNumber}`))
          .map(d => (
            <DiagnosticBanner
              key={`${d.type}-${d.outcomeNumber}`}
              outcomeNumber={d.outcomeNumber}
              outcomeTitle={d.outcomeTitle}
              type={d.type}
              onAddOne={() => setModalState({ mode: "add", initiative: null, addPhase: "foundation" })}
              onDismiss={() => setDismissedBanners(prev => [...prev, `${d.type}-${d.outcomeNumber}`])}
            />
          ))}

        {/* Phase sections */}
        <div className="space-y-8 mt-6">
          {PHASES.map(phase => {
            const phaseItems = activeInitiatives
              .filter(i => i.phase === phase.key)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            const costs = phaseCosts[phase.key];
            const costStr = costs.low > 0 ? ` · ${fmtCost(costs.low, costs.high)}` : "";

            return (
              <section key={phase.key}>
                {/* Phase header */}
                <div className="flex items-center justify-between pb-2 mb-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "9px", color: "#6c7385", fontWeight: 600, letterSpacing: "0.06em" }}>
                      {phase.number}
                    </span>
                    <span className="rounded-full shrink-0" style={{ width: "7px", height: "7px", background: phase.color, display: "inline-block" }} />
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "#E9ECF2" }}>{phase.label}</span>
                    <span style={{ fontSize: "11px", color: "#6c7385" }}>
                      {costs.count} initiative{costs.count !== 1 ? "s" : ""}{costStr}
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", color: "#6c7385" }}>{phase.months}</span>
                </div>

                {/* Cards */}
                <div className="space-y-[0.35rem]">
                  {phaseItems.map(initiative => (
                    <InitiativeCard
                      key={initiative.id}
                      initiative={initiative as unknown as Initiative}
                      onClick={() => setModalState({ mode: "view", initiative: initiative as unknown as Initiative })}
                    />
                  ))}
                  <AddAffordance onClick={() => setModalState({ mode: "add", initiative: null, addPhase: phase.key })} />
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 flex items-center gap-6"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)", alignItems: "center" }}>
          {/* Summary — flex-1 so it takes available width, preventing wrap */}
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: "9px", color: "#6c7385", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>
              Plan total
            </p>
            <p className="whitespace-nowrap" style={{ fontSize: "13px", color: "#9ca3b0" }}>
              <span style={{ color: "#5DCAA5", fontWeight: 600 }}>{planTotal.count}</span>
              {" "}initiative{planTotal.count !== 1 ? "s" : ""} across{" "}
              <span style={{ color: "#5DCAA5", fontWeight: 600 }}>4</span> phases ·{" "}
              <span style={{ color: "#5DCAA5", fontWeight: 600 }}>{fmtCost(planTotal.low, planTotal.high)}</span>
              {" "}indicative{" "}
              <span style={{ fontStyle: "italic", color: "#6c7385" }}>(feeds the cost card)</span>
            </p>
          </div>
          {/* Buttons — centred vertically against summary block */}
          <div className="flex items-center gap-2 shrink-0">
            {!reviewed && (
              <Button variant="outline" size="sm" onClick={handleMarkReviewed}
                className="flex items-center gap-1"
                style={{ fontSize: "11px", color: "#cfd2d8", borderColor: "rgba(255,255,255,0.12)", background: "transparent" }}>
                <Check size={11} />
                Mark as reviewed
              </Button>
            )}
            <Link href="/strategy/investment-risk">
              <Button size="sm"
                style={{ background: "#5DCAA5", color: "#0f1117", fontWeight: 600, fontSize: "11px" }}>
                Next: What it costs →
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalState && (
        <InitiativeModal
          state={modalState}
          onClose={() => setModalState(null)}
          outcomes={outcomes}
          principles={principles}
          onSaved={() => refetch()}
          onDismissed={() => refetch()}
        />
      )}
    </div>
  );
}
