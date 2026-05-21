/**
 * RewardSuccessMeasuresPage — /strategy/reward-success-measures
 * Stage 6 (Reward mode): Define success measures for each portfolio initiative.
 *
 * Blocks:
 *   1. Page header + gate banner (locked if Stage 5 not complete)
 *   2. Stale banner (portfolio changed after confirmation)
 *   3. Generate measures CTA (AI pre-populate for all initiatives)
 *   4. Per-initiative measure cards (baseline, target, timeframe, how-measured)
 *   5. Affordance buttons (Expand / Refine / Challenge / Suggest) per field
 *   6. Strategy-level outcomes section (optional, 2-3 statements)
 *   7. Confirm Stage 6 CTA
 */

import React, { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import SectionPageLayout from "@/components/SectionPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Sparkles, CheckCircle2, AlertTriangle, Lock, RefreshCw,
  Plus, Trash2, Pencil, ChevronDown, ChevronUp, Target,
  BarChart3, Clock, HelpCircle, Link2, Zap, MessageSquare,
  Lightbulb, Wand2, ShieldCheck, Info,
} from "lucide-react";
import { getRewardInitiative } from "@/../../shared/rewardInitiativeLibrary";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MeasureRow {
  measureId: string;
  initiativeId: string;
  name: string;
  baselineType: "to_be_established" | "known" | "external_reference";
  baselineValue: string | null;
  baselineSourceNote: string | null;
  target: string | null;
  timeframe: string | null;
  howMeasured: string | null;
  valueLink: string | null;
  isChallenged: boolean;
  challengeNote: string | null;
  isEdited: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  sortOrder: number;
  isArchived: boolean;
}

type AffordanceField = "name" | "target" | "howMeasured";
type AffordanceAction = "expand" | "refine" | "challenge" | "suggest";

const BASELINE_TYPE_CONFIG = {
  to_be_established: {
    label: "To be established",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    description: "You don't yet have this figure — that's fine. It will be established as part of implementation.",
    icon: <Clock className="w-3 h-3" />,
  },
  known: {
    label: "Known baseline",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    description: "You have an actual, measured figure for this baseline.",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  external_reference: {
    label: "External reference",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    description: "This is an industry-typical or benchmark figure — not your organisation's actual baseline.",
    icon: <Info className="w-3 h-3" />,
  },
};

const VALUE_LINK_CONFIG: Record<string, { label: string; color: string }> = {
  efficiency: { label: "Efficiency", color: "text-violet-600 dark:text-violet-400" },
  decision_quality: { label: "Decision quality", color: "text-blue-600 dark:text-blue-400" },
  risk_mitigation: { label: "Risk mitigation", color: "text-rose-600 dark:text-rose-400" },
  retention: { label: "Retention", color: "text-emerald-600 dark:text-emerald-400" },
  strategic: { label: "Strategic", color: "text-amber-600 dark:text-amber-400" },
};

const AFFORDANCE_CONFIG: Record<AffordanceAction, { label: string; icon: React.ReactNode; description: string }> = {
  expand: { label: "Expand", icon: <Zap className="w-3 h-3" />, description: "Add specificity and make it more actionable" },
  refine: { label: "Refine", icon: <Wand2 className="w-3 h-3" />, description: "Tighten for clarity without changing meaning" },
  challenge: { label: "Challenge", icon: <ShieldCheck className="w-3 h-3" />, description: "Flag if this is a vanity or gameable metric" },
  suggest: { label: "Suggest", icon: <Lightbulb className="w-3 h-3" />, description: "Propose an alternative angle" },
};

// ── MeasureEditDialog ─────────────────────────────────────────────────────────

interface MeasureEditDialogProps {
  open: boolean;
  onClose: () => void;
  initiativeId: string;
  initiativeTitle: string;
  measure: MeasureRow | null; // null = new measure
  onSaved: (m: MeasureRow) => void;
}

function MeasureEditDialog({ open, onClose, initiativeId, initiativeTitle, measure, onSaved }: MeasureEditDialogProps) {
  const [name, setName] = useState(measure?.name ?? "");
  const [baselineType, setBaselineType] = useState<"to_be_established" | "known" | "external_reference">(
    measure?.baselineType ?? "to_be_established"
  );
  const [baselineValue, setBaselineValue] = useState(measure?.baselineValue ?? "");
  const [baselineSourceNote, setBaselineSourceNote] = useState(measure?.baselineSourceNote ?? "");
  const [target, setTarget] = useState(measure?.target ?? "");
  const [timeframe, setTimeframe] = useState(measure?.timeframe ?? "");
  const [howMeasured, setHowMeasured] = useState(measure?.howMeasured ?? "");
  const [valueLink, setValueLink] = useState<string>(measure?.valueLink ?? "");

  // Affordance state
  const [affordanceField, setAffordanceField] = useState<AffordanceField | null>(null);
  const [affordanceAction, setAffordanceAction] = useState<AffordanceAction | null>(null);
  const [affordanceResult, setAffordanceResult] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const saveMutation = trpc.rewardSuccessMeasures.saveMeasure.useMutation({
    onSuccess: (data) => {
      if (data.measure) {
        onSaved(data.measure as MeasureRow);
        utils.rewardSuccessMeasures.getStatus.invalidate();
        toast.success(measure ? "Measure updated" : "Measure added");
        onClose();
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const affordanceMutation = trpc.rewardSuccessMeasures.affordance.useMutation({
    onSuccess: (data) => {
      setAffordanceResult(data.result);
    },
    onError: (err) => {
      toast.error(err.message);
      setAffordanceResult(null);
    },
  });

  const handleAffordance = (field: AffordanceField, action: AffordanceAction) => {
    const currentText = field === "name" ? name : field === "target" ? target : howMeasured;
    if (!currentText.trim()) {
      toast.error("Add some text first before using affordances.");
      return;
    }
    setAffordanceField(field);
    setAffordanceAction(action);
    setAffordanceResult(null);
    affordanceMutation.mutate({
      measureId: measure?.measureId ?? "new",
      field,
      actionType: action,
      currentText,
      initiativeTitle,
    });
  };

  const applyAffordanceResult = () => {
    if (!affordanceResult || !affordanceField) return;
    if (affordanceField === "name") setName(affordanceResult);
    else if (affordanceField === "target") setTarget(affordanceResult);
    else if (affordanceField === "howMeasured") setHowMeasured(affordanceResult);
    setAffordanceResult(null);
    setAffordanceField(null);
    setAffordanceAction(null);
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Measure name is required."); return; }
    saveMutation.mutate({
      measureId: measure?.measureId,
      initiativeId,
      name: name.trim(),
      baselineType,
      baselineValue: baselineType !== "to_be_established" ? baselineValue.trim() || null : null,
      baselineSourceNote: baselineType === "external_reference" ? baselineSourceNote.trim() || null : null,
      target: target.trim() || null,
      timeframe: timeframe.trim() || null,
      howMeasured: howMeasured.trim() || null,
      valueLink: valueLink || null,
    });
  };

  const AffordanceButtons = ({ field, currentText }: { field: AffordanceField; currentText: string }) => (
    <div className="flex gap-1 mt-1.5 flex-wrap">
      {(Object.entries(AFFORDANCE_CONFIG) as [AffordanceAction, typeof AFFORDANCE_CONFIG[AffordanceAction]][]).map(([action, config]) => (
        <TooltipProvider key={action}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleAffordance(field, action)}
                disabled={affordanceMutation.isPending || !currentText.trim()}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-colors
                  ${affordanceField === field && affordanceAction === action && affordanceMutation.isPending
                    ? "bg-primary/10 border-primary/30 text-primary animate-pulse"
                    : "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {config.icon}
                {config.label}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-48">
              {config.description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {measure ? "Edit measure" : "Add measure"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">{initiativeTitle}</p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Affordance result banner */}
          {affordanceResult && (
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 text-sm space-y-2">
              <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                AI suggestion — {affordanceField} / {affordanceAction}
              </div>
              <p className="text-foreground">{affordanceResult}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={applyAffordanceResult}>
                  Apply
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAffordanceResult(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {/* Measure name */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Measure name <span className="text-destructive">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Time to complete merit cycle"
              className="text-sm"
            />
            <AffordanceButtons field="name" currentText={name} />
          </div>

          {/* Baseline */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Baseline</Label>
            <Select value={baselineType} onValueChange={(v) => setBaselineType(v as typeof baselineType)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(BASELINE_TYPE_CONFIG) as [typeof baselineType, typeof BASELINE_TYPE_CONFIG[typeof baselineType]][]).map(([key, cfg]) => (
                  <SelectItem key={key} value={key} className="text-sm">
                    <span className="flex items-center gap-2">
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{BASELINE_TYPE_CONFIG[baselineType].description}</p>

            {baselineType !== "to_be_established" && (
              <Input
                value={baselineValue}
                onChange={(e) => setBaselineValue(e.target.value)}
                placeholder={baselineType === "known" ? "e.g. 6 weeks" : "e.g. Industry median: 4 weeks (CIPD 2024)"}
                className="text-sm"
              />
            )}
            {baselineType === "external_reference" && (
              <Input
                value={baselineSourceNote}
                onChange={(e) => setBaselineSourceNote(e.target.value)}
                placeholder="Source (e.g. CIPD Reward Survey 2024)"
                className="text-sm"
              />
            )}
          </div>

          {/* Target */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Target</Label>
            <Input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g. Reduce to 3 weeks"
              className="text-sm"
            />
            <AffordanceButtons field="target" currentText={target} />
          </div>

          {/* Timeframe */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Timeframe</Label>
            <Input
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              placeholder="e.g. 12 months post-go-live"
              className="text-sm"
            />
          </div>

          {/* How measured */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">How measured</Label>
            <Textarea
              value={howMeasured}
              onChange={(e) => setHowMeasured(e.target.value)}
              placeholder="e.g. Extracted from HRIS cycle-close timestamps; measured by Reward Ops team at each cycle close"
              className="text-sm min-h-[80px] resize-none"
            />
            <AffordanceButtons field="howMeasured" currentText={howMeasured} />
          </div>

          {/* Value link */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
              Value category link
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-56">
                    Links this measure to a Stage 7 value category. Stored now — will be surfaced in the business case in a future update.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Select value={valueLink || "none"} onValueChange={(v) => setValueLink(v === "none" ? "" : v)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select value category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-sm text-muted-foreground">No link</SelectItem>
                {Object.entries(VALUE_LINK_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key} className="text-sm">
                    <span className={cfg.color}>{cfg.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-sm">Cancel</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="text-sm">
            {saveMutation.isPending ? "Saving…" : measure ? "Update measure" : "Add measure"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── MeasureCard ───────────────────────────────────────────────────────────────

interface MeasureCardProps {
  measure: MeasureRow;
  initiativeTitle: string;
  onEdit: (m: MeasureRow) => void;
  onDelete: (measureId: string) => void;
}

function MeasureCard({ measure, initiativeTitle, onEdit, onDelete }: MeasureCardProps) {
  const baselineCfg = BASELINE_TYPE_CONFIG[measure.baselineType];
  const valueLinkCfg = measure.valueLink ? VALUE_LINK_CONFIG[measure.valueLink] : null;

  return (
    <div className={`rounded-lg border bg-card p-4 space-y-3 transition-all
      ${measure.isChallenged ? "border-amber-500/40 bg-amber-500/5" : "border-border/60"}
    `}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground">{measure.name}</p>
            {measure.isEdited && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">Edited</Badge>
            )}
            {measure.isChallenged && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                Challenged
              </Badge>
            )}
          </div>
          {measure.isChallenged && measure.challengeNote && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">{measure.challengeNote}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(measure)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Edit measure"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(measure.measureId)}
            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Remove measure"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Measure details grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Baseline */}
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Baseline</p>
          <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${baselineCfg.badge}`}>
            {baselineCfg.icon}
            {measure.baselineType === "to_be_established"
              ? "TBE"
              : measure.baselineValue || baselineCfg.label}
          </span>
          {measure.baselineType === "external_reference" && measure.baselineSourceNote && (
            <p className="text-[10px] text-muted-foreground italic">{measure.baselineSourceNote}</p>
          )}
        </div>

        {/* Target */}
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Target</p>
          <p className="text-xs text-foreground">{measure.target || <span className="text-muted-foreground italic">Not set</span>}</p>
        </div>

        {/* Timeframe */}
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Timeframe</p>
          <p className="text-xs text-foreground">{measure.timeframe || <span className="text-muted-foreground italic">Not set</span>}</p>
        </div>

        {/* Value link */}
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Value link</p>
          {valueLinkCfg
            ? <p className={`text-xs font-medium ${valueLinkCfg.color}`}>{valueLinkCfg.label}</p>
            : <p className="text-xs text-muted-foreground italic">None</p>
          }
        </div>
      </div>

      {/* How measured */}
      {measure.howMeasured && (
        <div className="pt-1 border-t border-border/40">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-0.5">How measured</p>
          <p className="text-xs text-muted-foreground">{measure.howMeasured}</p>
        </div>
      )}
    </div>
  );
}

// ── InitiativeSection ─────────────────────────────────────────────────────────

interface InitiativeSectionProps {
  initiativeId: string;
  measures: MeasureRow[];
  onAddMeasure: (initiativeId: string) => void;
  onEditMeasure: (m: MeasureRow) => void;
  onDeleteMeasure: (measureId: string) => void;
  isGenerating: boolean;
}

function InitiativeSection({ initiativeId, measures, onAddMeasure, onEditMeasure, onDeleteMeasure, isGenerating }: InitiativeSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const initiative = getRewardInitiative(initiativeId);
  const title = initiative?.title ?? initiativeId;
  const phase = initiative?.defaultPhase ?? "Foundation";
  const MAX = 3;

  const phaseColors: Record<string, string> = {
    Foundation: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
    Build: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    Optimise: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Initiative header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-foreground truncate">{title}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${phaseColors[phase] ?? ""}`}>
              {phase}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {measures.length}/{MAX} measures
          </span>
          {measures.length === 0 && isGenerating && (
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
          )}
          {measures.length > 0 && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Measures */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
          {measures.length === 0 && !isGenerating && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No measures defined yet.</p>
              <p className="text-xs mt-1">Add up to {MAX} measures for this initiative.</p>
            </div>
          )}
          {measures.length === 0 && isGenerating && (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          )}
          {measures.map(m => (
            <MeasureCard
              key={m.measureId}
              measure={m}
              initiativeTitle={title}
              onEdit={onEditMeasure}
              onDelete={onDeleteMeasure}
            />
          ))}
          {measures.length < MAX && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs border-dashed"
              onClick={() => onAddMeasure(initiativeId)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add measure
            </Button>
          )}
          {measures.length >= MAX && (
            <p className="text-xs text-center text-muted-foreground italic">
              Maximum {MAX} measures reached. Remove one to add another.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RewardSuccessMeasuresPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: status, isLoading } = trpc.rewardSuccessMeasures.getStatus.useQuery(undefined, {
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  // Local optimistic state for measures
  const [localMeasures, setLocalMeasures] = useState<MeasureRow[] | null>(null);
  const measures = localMeasures ?? status?.measures ?? [];

  // Dialog state
  const [editDialog, setEditDialog] = useState<{ open: boolean; initiativeId: string; measure: MeasureRow | null } | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Strategy outcomes state
  const [outcomesExpanded, setOutcomesExpanded] = useState(false);
  const [outcomes, setOutcomes] = useState<Array<{ id: string; text: string }>>([]);
  const [outcomesInitialized, setOutcomesInitialized] = useState(false);

  // Initialize outcomes from status
  React.useEffect(() => {
    if (status && !outcomesInitialized) {
      setOutcomes(status.strategyOutcomes ?? []);
      setOutcomesInitialized(true);
    }
  }, [status, outcomesInitialized]);

  const generateMutation = trpc.rewardSuccessMeasures.generateMeasures.useMutation({
    onSuccess: (data) => {
      const newMeasures = data.created as MeasureRow[];
      setLocalMeasures(prev => {
        const base = prev ?? status?.measures ?? [];
        const existingIds = new Set(base.map(m => m.measureId));
        return [...base, ...newMeasures.filter(m => !existingIds.has(m.measureId))];
      });
      utils.rewardSuccessMeasures.getStatus.invalidate();
      setIsGenerating(false);
      toast.success(`Generated ${newMeasures.length} measure${newMeasures.length !== 1 ? "s" : ""}`);
    },
    onError: (err) => {
      setIsGenerating(false);
      toast.error(err.message);
    },
  });

  const deleteMutation = trpc.rewardSuccessMeasures.deleteMeasure.useMutation({
    onSuccess: (_, vars) => {
      setLocalMeasures(prev => (prev ?? status?.measures ?? []).filter(m => m.measureId !== vars.measureId));
      utils.rewardSuccessMeasures.getStatus.invalidate();
      toast.success("Measure removed");
    },
    onError: (err) => toast.error(err.message),
  });

  const confirmMutation = trpc.rewardSuccessMeasures.confirm.useMutation({
    onSuccess: () => {
      utils.rewardSuccessMeasures.getStatus.invalidate();
      toast.success("Stage 6 confirmed — success measures locked in.");
      setConfirmDialogOpen(false);
      navigate("/strategy/reward-business-case");
    },
    onError: (err) => toast.error(err.message),
  });

  const keepAsIsMutation = trpc.rewardSuccessMeasures.keepAsIs.useMutation({
    onSuccess: () => {
      utils.rewardSuccessMeasures.getStatus.invalidate();
      toast.success("Measures kept as-is.");
    },
    onError: (err) => toast.error(err.message),
  });

  const saveOutcomesMutation = trpc.rewardSuccessMeasures.saveStrategyOutcomes.useMutation({
    onSuccess: () => {
      utils.rewardSuccessMeasures.getStatus.invalidate();
      toast.success("Strategy outcomes saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const generateOutcomesMutation = trpc.rewardSuccessMeasures.generateStrategyOutcomes.useMutation({
    onSuccess: (data) => {
      setOutcomes(data.outcomes);
      toast.success("Strategy outcomes generated");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleGenerateAll = useCallback(() => {
    if (!status?.selectedInitiativeIds?.length) return;
    setIsGenerating(true);
    generateMutation.mutate({ initiativeIds: status.selectedInitiativeIds });
  }, [status?.selectedInitiativeIds, generateMutation]);

  const handleMeasureSaved = useCallback((m: MeasureRow) => {
    setLocalMeasures(prev => {
      const base = prev ?? status?.measures ?? [];
      const idx = base.findIndex(x => x.measureId === m.measureId);
      if (idx >= 0) {
        const updated = [...base];
        updated[idx] = m;
        return updated;
      }
      return [...base, m];
    });
  }, [status?.measures]);

  const getMeasuresForInitiative = (initiativeId: string) =>
    measures.filter(m => m.initiativeId === initiativeId && !m.isArchived)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const totalMeasures = measures.filter(m => !m.isArchived).length;
  const initiativesWithMeasures = new Set(measures.filter(m => !m.isArchived).map(m => m.initiativeId)).size;
  const totalInitiatives = status?.selectedInitiativeIds?.length ?? 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SectionPageLayout
        sectionNumber="06"
        sectionLabel="Success Measures"
        title="Success Measures"
        accentColor="#8b5cf6"
        icon={<Target className="w-5 h-5 text-white" />}
      >
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      </SectionPageLayout>
    );
  }

  const isLocked = !status?.canStart;
  const isStale = status?.isStale;
  const isConfirmed = status?.isConfirmed;

  return (
    <SectionPageLayout
      sectionNumber="06"
      sectionLabel="Success Measures"
      title="Success Measures"
      accentColor="#8b5cf6"
      icon={<Target className="w-5 h-5 text-white" />}
      isLocked={isLocked}
      editedAfterClearing={isStale}
      upstreamStageLabel="Stage 5 (Portfolio)"
      stageProgress={isLocked ? undefined : {
        stageNumber: 6,
        taskDescription: `Define 1–3 success measures for each initiative in your portfolio. Honest baselines — "to be established" is a first-class state.`,
        ctaLabel: isConfirmed ? "Confirmed ✓" : "Confirm Stage 6",
        ctaDisabled: totalMeasures === 0 || confirmMutation.isPending,
        ctaLoading: confirmMutation.isPending,
        onCtaClick: () => setConfirmDialogOpen(true),
        isComplete: isConfirmed && !isStale,
      }}
      actions={
        !isLocked && (
          <div className="flex items-center gap-2">
            {isStale && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => keepAsIsMutation.mutate()}
                disabled={keepAsIsMutation.isPending}
              >
                Keep as-is
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleGenerateAll}
              disabled={isGenerating || generateMutation.isPending}
            >
              {isGenerating || generateMutation.isPending
                ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating…</>
                : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Generate all measures</>
              }
            </Button>
          </div>
        )
      }
    >
      {/* Gate banner */}
      {isLocked && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm text-amber-600 dark:text-amber-400">
          <Lock className="w-4 h-4 shrink-0" />
          <span>{status?.blockedReason ?? "Complete Stage 5 before defining success measures."}</span>
        </div>
      )}

      {/* Stale banner */}
      {isStale && !isLocked && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-amber-600 dark:text-amber-400">Portfolio has changed</p>
            <p className="text-muted-foreground text-xs">
              Your Stage 5 portfolio was updated after you confirmed Stage 6. Measures for removed initiatives have been archived.
              Review the measures below and re-confirm, or click "Keep as-is" if no changes are needed.
            </p>
            {status?.newInitiativeIds && status.newInitiativeIds.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                New initiatives without measures: {status.newInitiativeIds.map(id => getRewardInitiative(id)?.title ?? id).join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Progress summary */}
      {!isLocked && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total measures", value: totalMeasures, icon: <BarChart3 className="w-4 h-4" /> },
            { label: "Initiatives covered", value: `${initiativesWithMeasures}/${totalInitiatives}`, icon: <CheckCircle2 className="w-4 h-4" /> },
            { label: "Stage status", value: isConfirmed && !isStale ? "Confirmed" : isStale ? "Stale" : "In progress", icon: <Target className="w-4 h-4" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-lg border border-border/60 bg-card p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-muted-foreground">{icon}</div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Honest baseline note */}
      {!isLocked && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/30 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />
          <span>
            <strong className="text-foreground">Honest baselines.</strong>{" "}
            "To be established" is a first-class, valid state — not a gap to fill. If the AI suggests an industry-typical figure,
            it will be labelled as an external reference, not your organisation's actual baseline. You own the final figures.
          </span>
        </div>
      )}

      {/* Per-initiative sections */}
      {!isLocked && status?.selectedInitiativeIds && status.selectedInitiativeIds.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Initiative measures</h2>
            <p className="text-xs text-muted-foreground">Soft cap: 3 measures per initiative</p>
          </div>
          {status.selectedInitiativeIds.map(id => (
            <InitiativeSection
              key={id}
              initiativeId={id}
              measures={getMeasuresForInitiative(id)}
              onAddMeasure={(initiativeId) => setEditDialog({ open: true, initiativeId, measure: null })}
              onEditMeasure={(m) => setEditDialog({ open: true, initiativeId: m.initiativeId, measure: m })}
              onDeleteMeasure={(measureId) => deleteMutation.mutate({ measureId })}
              isGenerating={isGenerating || generateMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Strategy-level outcomes (optional) */}
      {!isLocked && (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => setOutcomesExpanded(v => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Strategy-level outcomes</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Optional</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{outcomes.length} outcome{outcomes.length !== 1 ? "s" : ""}</span>
              {outcomesExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>

          {outcomesExpanded && (
            <div className="px-4 pb-4 border-t border-border/40 pt-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                2–3 sentences describing what success looks like for the overall programme. These appear in your Stage 10 board pack.
              </p>
              {outcomes.map((o, i) => (
                <div key={o.id} className="flex gap-2">
                  <span className="text-xs text-muted-foreground mt-2.5 shrink-0 w-4">{i + 1}.</span>
                  <Textarea
                    value={o.text}
                    onChange={(e) => setOutcomes(prev => prev.map(x => x.id === o.id ? { ...x, text: e.target.value } : x))}
                    className="text-sm min-h-[60px] resize-none flex-1"
                    placeholder="e.g. By end of Year 1, all pay decisions are supported by AI-generated recommendations with full audit trails."
                  />
                  <button
                    type="button"
                    onClick={() => setOutcomes(prev => prev.filter(x => x.id !== o.id))}
                    className="mt-2 p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {outcomes.length < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-dashed"
                  onClick={() => setOutcomes(prev => [...prev, { id: crypto.randomUUID(), text: "" }])}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add outcome
                </Button>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => generateOutcomesMutation.mutate()}
                  disabled={generateOutcomesMutation.isPending}
                >
                  {generateOutcomesMutation.isPending
                    ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating…</>
                    : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Generate with AI</>
                  }
                </Button>
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={() => saveOutcomesMutation.mutate({ outcomes: outcomes.filter(o => o.text.trim()) })}
                  disabled={saveOutcomesMutation.isPending}
                >
                  {saveOutcomesMutation.isPending ? "Saving…" : "Save outcomes"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Measure edit dialog */}
      {editDialog && (
        <MeasureEditDialog
          open={editDialog.open}
          onClose={() => setEditDialog(null)}
          initiativeId={editDialog.initiativeId}
          initiativeTitle={getRewardInitiative(editDialog.initiativeId)?.title ?? editDialog.initiativeId}
          measure={editDialog.measure}
          onSaved={handleMeasureSaved}
        />
      )}

      {/* Confirm dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Stage 6 — Success Measures</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>You have defined <strong className="text-foreground">{totalMeasures} measure{totalMeasures !== 1 ? "s" : ""}</strong> across <strong className="text-foreground">{initiativesWithMeasures}</strong> of {totalInitiatives} initiatives.</p>
            {initiativesWithMeasures < totalInitiatives && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs">{totalInitiatives - initiativesWithMeasures} initiative{totalInitiatives - initiativesWithMeasures !== 1 ? "s have" : " has"} no measures. You can proceed — measures can be added later.</p>
              </div>
            )}
            <p>Once confirmed, these measures will appear in your Stage 10 board pack. You can still edit them — confirming again will update the pack.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
              {confirmMutation.isPending ? "Confirming…" : "Confirm Stage 6"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionPageLayout>
  );
}
