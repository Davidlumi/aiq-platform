/**
 * StrategyAmbitionPage — /strategy/ambition
 * Section 02: Where we're going
 *
 * Inline-editable blocks (via patchStrategyField):
 *  - Vision statement
 *  - By-end-of-period commitments (3 items)
 *  - What we won't do
 *  - Guiding principles
 *
 * Display-only (wizard-sourced, with re-run wizard affordance):
 *  - How AI will change ways of work (template sentence)
 *  - AI philosophy
 *  - Current AI landscape
 *  - Stakeholder map
 */
import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft, Compass, Quote, Pencil, Check, X, Plus, Trash2,
  ArrowRight, Sparkles, ChevronDown, Users, Lock, AlertCircle,
  UserCheck, Info,
} from "lucide-react";
import {
  EXISTING_AI_TOOLS,
  AI_PHILOSOPHY_OPTIONS,
  EXECUTIVE_SPONSORS,
  GATEKEEPERS,
  AFFECTED_GROUPS,
  POTENTIAL_RESISTORS,
} from "@/../../shared/strategyInputs";

// ─── Constants ────────────────────────────────────────────────────────────────

const BUSINESS_LEVELS: Record<number, { label: string; waysOfWork: string }> = {
  1: { label: "Cautious", waysOfWork: "AI will be introduced carefully, with human oversight at every step." },
  2: { label: "Exploratory", waysOfWork: "AI will be piloted in low-risk processes to build confidence and capability." },
  3: { label: "Progressive", waysOfWork: "AI will augment HR workflows, with humans retaining decision authority." },
  4: { label: "Ambitious", waysOfWork: "AI will be embedded across most HR processes, driving significant efficiency and insight." },
  5: { label: "Transformative", waysOfWork: "AI will fundamentally reshape how HR operates, enabling new business models." },
};

const PEOPLE_LEVELS: Record<number, { label: string; expectation: string }> = {
  1: { label: "AI-Aware", expectation: "HR teams will understand AI basics and know when to escalate." },
  2: { label: "AI-Assisted", expectation: "HR teams will use AI tools confidently in day-to-day work." },
  3: { label: "AI-Augmented", expectation: "HR teams will co-design AI solutions and interpret AI outputs critically." },
  4: { label: "AI-Native", expectation: "HR teams will build, configure, and govern AI tools independently." },
  5: { label: "AI-Led", expectation: "HR teams will lead enterprise AI strategy and set the standard for the organisation." },
};

const OUT_OF_SCOPE: Record<number, string[]> = {
  1: [
    "Autonomous AI decision-making in any employment process",
    "Generative AI tools for employee-facing communications",
    "Predictive analytics for individual performance assessment",
    "AI-driven compensation modelling without human sign-off",
    "Unmonitored AI in any high-risk HR workflow",
  ],
  2: [
    "Full automation of recruitment shortlisting",
    "AI-generated performance ratings without manager review",
    "Autonomous workforce planning recommendations",
    "Real-time employee sentiment monitoring at individual level",
    "AI tools that have not passed a bias audit",
  ],
  3: [
    "Replacing human judgement in promotion or redundancy decisions",
    "Deploying AI in collective bargaining or ER processes without legal review",
    "AI-generated individual development plans without manager validation",
    "Sharing employee AI capability data with third parties",
  ],
  4: [
    "Fully autonomous hiring decisions without human review",
    "AI systems that cannot explain their recommendations to employees",
    "Deploying AI tools that have not been assessed against the EU AI Act",
    "Individual-level AI monitoring without employee consent",
  ],
  5: [
    "AI systems that remove human accountability from employment decisions",
    "Deploying frontier AI models in HR without a dedicated ethics review",
    "AI-generated contracts or legal documents without solicitor review",
  ],
};

// ─── Inline text editor ───────────────────────────────────────────────────────

function InlineTextEdit({
  value,
  onSave,
  multiline = false,
  placeholder = "Enter text…",
  className = "",
}: {
  value: string;
  onSave: (v: string) => Promise<void>;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const handleSave = async () => {
    if (draft.trim() === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className={`group relative ${className}`}>
        <span>{value || <span className="text-muted-foreground italic">{placeholder}</span>}</span>
        <button
          onClick={() => { setDraft(value); setEditing(true); }}
          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
          aria-label="Edit"
        >
          <Pencil className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {multiline ? (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={4}
          className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
          placeholder={placeholder}
          onKeyDown={e => { if (e.key === "Escape") setEditing(false); }}
        />
      ) : (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          placeholder={placeholder}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
        />
      )}
      <div className="flex items-center gap-2 mt-2">
        <Button size="sm" className="h-6 text-xs px-2" onClick={handleSave} disabled={saving}>
          <Check className="w-3 h-3 mr-1" />{saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditing(false)} disabled={saving}>
          <X className="w-3 h-3 mr-1" />Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Editable list ────────────────────────────────────────────────────────────

function EditableList({
  items,
  onSave,
  color = "#60A5FA",
  numbered = false,
  placeholder = "Add item…",
}: {
  items: string[];
  onSave: (items: string[]) => Promise<void>;
  color?: string;
  numbered?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(items);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!editing) setDraft(items); }, [items, editing]);

  const handleSave = async () => {
    const clean = draft.filter(s => s.trim().length > 0);
    setSaving(true);
    try {
      await onSave(clean);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="group">
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              {numbered ? (
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}20` }}>
                  <span className="text-[10px] font-bold" style={{ color }}>{i + 1}</span>
                </div>
              ) : (
                <X className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color }} />
              )}
              <span className="text-sm text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => { setDraft([...items]); setEditing(true); }}
          className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
        >
          <Pencil className="w-2.5 h-2.5" />Edit list
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {draft.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              onChange={e => { const n = [...draft]; n[i] = e.target.value; setDraft(n); }}
              className="flex-1 bg-white/5 border border-white/15 rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              placeholder={placeholder}
            />
            <button
              onClick={() => setDraft(draft.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => setDraft([...draft, ""])}
        className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="w-3 h-3" />Add item
      </button>
      <div className="flex items-center gap-2 mt-3">
        <Button size="sm" className="h-6 text-xs px-2" onClick={handleSave} disabled={saving}>
          <Check className="w-3 h-3 mr-1" />{saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditing(false)} disabled={saving}>
          <X className="w-3 h-3 mr-1" />Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Editable principles ──────────────────────────────────────────────────────

function EditablePrinciples({
  principles,
  onSave,
}: {
  principles: Array<{ title: string; description: string }>;
  onSave: (items: Array<{ title: string; description: string }>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(principles);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!editing) setDraft(principles); }, [principles, editing]);

  const handleSave = async () => {
    const clean = draft.filter(p => p.title.trim().length > 0);
    setSaving(true);
    try {
      await onSave(clean);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="group">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {principles.map((p, i) => (
            <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg border border-white/6 bg-white/2">
              <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-green-400">{i + 1}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-0.5">{p.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => { setDraft([...principles]); setEditing(true); }}
          className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
        >
          <Pencil className="w-2.5 h-2.5" />Edit principles
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {draft.map((p, i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-white/2 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-green-400 w-4">{i + 1}</span>
              <input
                value={p.title}
                onChange={e => { const n = [...draft]; n[i] = { ...n[i], title: e.target.value }; setDraft(n); }}
                className="flex-1 bg-white/5 border border-white/15 rounded px-2 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="Principle title…"
              />
              <button
                onClick={() => setDraft(draft.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea
              value={p.description}
              onChange={e => { const n = [...draft]; n[i] = { ...n[i], description: e.target.value }; setDraft(n); }}
              rows={2}
              className="w-full bg-white/5 border border-white/15 rounded px-2 py-1 text-xs text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
              placeholder="Description…"
            />
          </div>
        ))}
      </div>
      <button
        onClick={() => setDraft([...draft, { title: "", description: "" }])}
        className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="w-3 h-3" />Add principle
      </button>
      <div className="flex items-center gap-2 mt-3">
        <Button size="sm" className="h-6 text-xs px-2" onClick={handleSave} disabled={saving}>
          <Check className="w-3 h-3 mr-1" />{saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditing(false)} disabled={saving}>
          <X className="w-3 h-3 mr-1" />Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StrategyAmbitionPage() {
  const [, navigate] = useLocation();
  const [principlesCollapsed, setPrinciplesCollapsed] = useState(false);

  const strategyQ         = trpc.intelligence.getStrategy.useQuery();
  const assessmentQ       = trpc.intelligence.getStrategyAssessment.useQuery();
  const companyResultsQ   = trpc.companyAssessment.getMyAssessmentResults.useQuery();

  const strategyData    = strategyQ.data;
  const assessment      = assessmentQ.data;
  const companyResults  = companyResultsQ.data;

  const businessLevel   = assessment?.businessAmbitionLevel ?? strategyData?.businessAmbitionLevel ?? 3;
  const peopleLevel     = assessment?.peopleAmbitionLevel   ?? strategyData?.peopleAmbitionLevel   ?? 3;
  const bLevel          = BUSINESS_LEVELS[businessLevel];
  const pLevel          = PEOPLE_LEVELS[peopleLevel];

  const structuredInputs = assessment?.structuredInputs as Record<string, unknown> | null | undefined;

  const guidingPrinciples = assessment?.guidingPrinciples ?? [];
  const wontDoItems: string[] = (assessment?.wontDo && assessment.wontDo.length > 0)
    ? assessment.wontDo
    : (OUT_OF_SCOPE[businessLevel] ?? []);
  const commitments: string[] = (assessment?.commitments && assessment.commitments.length > 0)
    ? assessment.commitments
    : [
        "Design and deploy AI in any people process without external dependency — measured by zero externally-led AI implementations in Year 2.",
        "Reduce administrative work in Talent Acquisition and HR Operations by 30%+ through AI tooling — measured by time-to-hire and HR cost-per-head.",
        "Ensure every people leader can decide when AI is and isn't appropriate — measured by annual AI decision-making assessment completion rate above 90%.",
      ];

  const utils = trpc.useUtils();
  const patchMutation = trpc.intelligence.patchStrategyField.useMutation({
    onSuccess: () => {
      utils.intelligence.getStrategyAssessment.invalidate();
      utils.intelligence.getStrategy.invalidate();
      toast.success("Strategy updated.");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const patch = async (field: "visionStatement" | "wontDo" | "commitments" | "guidingPrinciples", value: unknown) => {
    await patchMutation.mutateAsync({ field, value } as any);
  };

  const isLoading = strategyQ.isLoading || assessmentQ.isLoading;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto pb-16 px-0">
        <Skeleton className="h-7 w-48 mb-6 mt-2 rounded" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!assessment?.completed) {
    return (
      <div className="max-w-5xl mx-auto pb-16 px-0">
        <div className="flex items-center gap-2 mb-6 pt-2">
          <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground" onClick={() => navigate("/strategy")}>
            <ArrowLeft className="w-3 h-3 mr-1" />HR AI Strategy
          </Button>
          <span className="text-muted-foreground text-xs">/</span>
          <span className="text-xs font-medium text-foreground">Where we're going</span>
        </div>
        <div className="rounded-xl border border-dashed border-green-500/20 bg-green-500/4 p-6 flex items-start gap-4">
          <Compass className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground mb-1">Strategy assessment not completed</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Complete the Build Strategy wizard to generate a vision statement and guiding principles.
            </p>
            <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10 h-7 text-xs" onClick={() => navigate("/ai-strategy/assessment")}>
              <Sparkles className="w-3 h-3 mr-1.5" />Build Strategy
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-16 px-0">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 pt-2">
        <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground" onClick={() => navigate("/strategy")}>
          <ArrowLeft className="w-3 h-3 mr-1" />HR AI Strategy
        </Button>
        <span className="text-muted-foreground text-xs">/</span>
        <span className="text-xs font-medium text-foreground">Where we're going</span>
      </div>

      {/* Section header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#4ADE8020", color: "#4ADE80" }}>
          <Compass className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Section 02</p>
          <h1 className="text-xl font-bold text-foreground">Where we're going</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto text-xs h-7 border-white/15 hover:border-white/30 text-muted-foreground"
          onClick={() => navigate("/ai-strategy/assessment")}
        >
          <Sparkles className="w-3 h-3 mr-1.5" />Re-run wizard
        </Button>
      </div>

      {/* Vision statement — inline editable */}
      <div className="rounded-2xl border border-green-500/15 bg-green-500/5 p-6 mb-5">
        <div className="flex items-start gap-2 mb-3">
          <Quote className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Vision Statement</p>
          <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
            <Pencil className="w-2.5 h-2.5" />Hover to edit
          </span>
        </div>
        <div className="text-base font-semibold text-foreground leading-relaxed italic mb-5">
          <InlineTextEdit
            value={assessment.visionStatement ?? ""}
            onSave={v => patch("visionStatement", v)}
            multiline
            placeholder="Enter your vision statement…"
          />
        </div>

        {/* Commitments — inline editable */}
        <div className="border-t border-green-500/15 pt-4">
          <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-3">By the end of this strategy period, HR will:</p>
          <EditableList
            items={commitments}
            onSave={items => patch("commitments", items)}
            color="#4ADE80"
            numbered
            placeholder="Add a commitment…"
          />
        </div>
      </div>

      {/* Ways of work — display only */}
      {bLevel && pLevel && (
        <div className="rounded-xl border border-white/8 bg-white/2 p-5 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">How AI Will Change Ways of Work</p>
            <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />Wizard-sourced
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {companyResults?.companyName ?? "The organisation"}'s business is set on a{" "}
            <strong className="text-foreground">{bLevel.label}</strong> AI ambition, and HR is expected to operate at the{" "}
            <strong className="text-foreground">{pLevel.label}</strong> tier to deliver it.{" "}
            {bLevel.waysOfWork} {pLevel.expectation}
          </p>
        </div>
      )}

      {/* Guiding principles — inline editable */}
      {guidingPrinciples.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/2 p-5 mb-5">
          <button
            onClick={() => setPrinciplesCollapsed(c => !c)}
            className="w-full flex items-center justify-between mb-0"
            aria-expanded={!principlesCollapsed}
          >
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Guiding Principles</p>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>{principlesCollapsed ? `See ${guidingPrinciples.length} principles` : "Hide"}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${principlesCollapsed ? "" : "rotate-180"}`} />
            </div>
          </button>
          {!principlesCollapsed && (
            <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
              <EditablePrinciples
                principles={guidingPrinciples}
                onSave={items => patch("guidingPrinciples", items)}
              />
            </div>
          )}
        </div>
      )}

      {/* AI Philosophy — display only */}
      {(() => {
        const philValue = structuredInputs?.ai_philosophy as string | undefined;
        const phil = philValue ? AI_PHILOSOPHY_OPTIONS.find(o => o.value === philValue) : undefined;
        if (!phil) return null;
        return (
          <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 px-5 py-4 flex items-start gap-3 mb-5">
            <div className="w-7 h-7 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">AI Philosophy</p>
                <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" />Wizard-sourced
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{phil.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{phil.description}</p>
            </div>
          </div>
        );
      })()}

      {/* Current AI Landscape — display only */}
      {Array.isArray(structuredInputs?.existing_ai_tools) &&
        (structuredInputs!.existing_ai_tools as string[]).length > 0 &&
        !(structuredInputs!.existing_ai_tools as string[]).includes("none") && (
        <div className="rounded-xl border border-white/8 bg-white/2 px-5 py-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Current AI Landscape</p>
            <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />Wizard-sourced
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Tools already deployed in HR — initiatives will complement rather than duplicate these.</p>
          <div className="flex flex-wrap gap-2">
            {(structuredInputs!.existing_ai_tools as string[]).map((toolId: string) => {
              const tool = EXISTING_AI_TOOLS.find(t => t.id === toolId);
              return tool ? (
                <span key={toolId} className="text-xs px-2.5 py-1 rounded-full border border-white/12 bg-white/4 text-muted-foreground">
                  {tool.label}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* What we won't do — inline editable */}
      <div className="rounded-xl border border-red-500/15 bg-red-500/4 p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">What We Won't Do</p>
          <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
            <Pencil className="w-2.5 h-2.5" />Hover to edit
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">These are the deliberate exclusions that make this a real strategy, not a wish list.</p>
        <EditableList
          items={wontDoItems}
          onSave={items => patch("wontDo", items)}
          color="#F87171"
          placeholder="Add an exclusion…"
        />
      </div>

      {/* Stakeholder map — display only */}
      {(() => {
        const sm = structuredInputs?.stakeholder_map as {
          executive_sponsors?: string[];
          gatekeepers?: string[];
          affected_groups?: string[];
          potential_resistors?: string[];
          notes?: string;
        } | undefined;
        if (!sm || (
          !sm.executive_sponsors?.length &&
          !sm.gatekeepers?.length &&
          !sm.affected_groups?.length &&
          !sm.potential_resistors?.length
        )) return null;
        const quadrants = [
          { key: "executive_sponsors",  label: "Executive Sponsors",  ids: sm.executive_sponsors ?? [],  options: EXECUTIVE_SPONSORS,  color: "#60A5FA",  icon: <UserCheck className="w-3.5 h-3.5" /> },
          { key: "gatekeepers",         label: "Gatekeepers",         ids: sm.gatekeepers ?? [],         options: GATEKEEPERS,         color: "#FBBF24",  icon: <Lock className="w-3.5 h-3.5" /> },
          { key: "affected_groups",     label: "Affected Groups",     ids: sm.affected_groups ?? [],     options: AFFECTED_GROUPS,     color: "#4ADE80",  icon: <Users className="w-3.5 h-3.5" /> },
          { key: "potential_resistors", label: "Potential Resistors", ids: sm.potential_resistors ?? [], options: POTENTIAL_RESISTORS, color: "#F87171",  icon: <AlertCircle className="w-3.5 h-3.5" /> },
        ] as const;
        return (
          <div className="rounded-xl border border-white/8 bg-white/2 p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-blue-400" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Stakeholder Map</p>
              <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />Wizard-sourced
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {quadrants.map(q => (
                <div key={q.key} className="rounded-lg border border-white/8 bg-white/2 p-3">
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
                        return opt ? (
                          <span key={id} className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: `${q.color}40`, background: `${q.color}15`, color: q.color }}>
                            {opt.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {sm.notes && (
              <div className="mt-3 rounded-lg bg-white/3 border border-white/6 px-3 py-2">
                <p className="text-xs text-muted-foreground leading-relaxed">{sm.notes}</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* CTA */}
      <div className="rounded-2xl border border-white/8 bg-white/2 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Next step</p>
          <p className="text-sm text-foreground">Review the initiative roadmap and confirm your phased plan.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8 border-white/15 hover:border-white/30"
          onClick={() => navigate("/strategy/plan")}
        >
          View plan
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>

    </div>
  );
}
