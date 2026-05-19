/**
 * BoardReportPage — Stage 10: Board Report
 *
 * 6-section editor for the final board-ready strategy report.
 * Sections:
 *   1. Context & background
 *   2. Strategic direction
 *   3. Initiative portfolio
 *   4. Investment case
 *   5. Capability readiness
 *   6. Governance & accountability
 *
 * Features:
 *   - Per-section streaming AI generation (SSE via /api/board-report/stream-section)
 *   - Per-section lock/unlock
 *   - AI-generated indicator badge (amber) vs Edited badge (blue)
 *   - Generate all sections button
 *   - Word count per section + total
 *   - Gate: completeStage10 (all 6 sections, 1200-4000 total words)
 *   - PDF + Word export buttons
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGate } from "@/contexts/GateContext";
import { useDeepDive } from "@/hooks/useDeepDive";
import { DeepDiveConfirmedStatus } from "@/components/DeepDiveConfirmedStatus";
import SectionPageLayout from "@/components/SectionPageLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  Loader2,
  FileDown,
  FileText,
  RefreshCw,
  AlertCircle,
  MonitorSmartphone,
  WifiOff,
} from "lucide-react";
import { getModeLabels } from "@/../../shared/modeLabels";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionId = "context" | "strategic_direction" | "initiative_portfolio" | "investment_case" | "capability_readiness" | "governance";

interface SectionData {
  content: string;
  editedAt?: number | null;
  isAiGenerated?: boolean;
  wordCount?: number;
  lockedAt?: number | null;
}

interface SectionsMeta {
  [key: string]: SectionData;
}

const SECTION_DEFS: Array<{ id: SectionId; title: string; description: string; targetWords: string }> = [
  {
    id: "context",
    title: "1. Context & Background",
    description: "The business context, current HR landscape, and why this strategy is needed now.",
    targetWords: "150–250 words",
  },
  {
    id: "strategic_direction",
    title: "2. Strategic Direction",
    description: "The chosen archetype, strategy statement, and guiding principles.",
    targetWords: "200–300 words",
  },
  {
    id: "initiative_portfolio",
    title: "3. Initiative Portfolio",
    description: "The selected initiatives, their rationale, and sequencing.",
    targetWords: "250–400 words",
  },
  {
    id: "investment_case",
    title: "4. Investment Case",
    description: "The value envelope, cost estimates, and business case narrative.",
    targetWords: "200–350 words",
  },
  {
    id: "capability_readiness",
    title: "5. Capability Readiness",
    description: "Current capability gaps, tactics to close them, and delivery confidence.",
    targetWords: "150–250 words",
  },
  {
    id: "governance",
    title: "6. Governance & Accountability",
    description: "Success measures, review cadence, risk acknowledgements, and ownership.",
    targetWords: "150–250 words",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getSectionStatus(section: SectionData | undefined): "empty" | "ai_generated" | "edited" {
  if (!section?.content?.trim()) return "empty";
  if (section.isAiGenerated && !section.editedAt) return "ai_generated";
  return "edited";
}

// ─── SectionEditor ────────────────────────────────────────────────────────────

interface SectionEditorProps {
  def: typeof SECTION_DEFS[0];
  data: SectionData | undefined;
  isStreaming: boolean;
  streamingText: string;
  onGenerate: (sectionId: SectionId) => void;
  onEdit: (sectionId: SectionId, content: string) => void;
  onToggleLock: (sectionId: SectionId, locked: boolean) => void;
}

function SectionEditor({
  def,
  data,
  isStreaming,
  streamingText,
  onGenerate,
  onEdit,
  onToggleLock,
}: SectionEditorProps) {
  const isLocked = !!data?.lockedAt;
  const status = getSectionStatus(data);
  const displayContent = isStreaming ? streamingText : (data?.content ?? "");
  const wc = isStreaming ? countWords(streamingText) : (data?.wordCount ?? countWords(data?.content ?? ""));

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${isLocked ? "border-primary/30 bg-primary/3" : "border-border"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 bg-muted/30">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">{def.title}</h3>
            {status === "ai_generated" && (
              <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/8">
                AI-generated — please review
              </Badge>
            )}
            {status === "edited" && (
              <Badge variant="outline" className="text-xs border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/8">
                Edited by you
              </Badge>
            )}
            {isLocked && (
              <Badge variant="outline" className="text-xs border-primary/40 text-primary bg-primary/8">
                <Lock className="w-3 h-3 mr-1" />Locked
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Target: {def.targetWords}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!isLocked && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onGenerate(def.id)}
              disabled={isStreaming || isLocked}
              className="h-7 px-2 text-xs"
            >
              {isStreaming ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating…</>
              ) : status === "empty" ? (
                <><Sparkles className="w-3 h-3 mr-1" />Generate</>
              ) : (
                <><RefreshCw className="w-3 h-3 mr-1" />Regenerate</>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleLock(def.id, !isLocked)}
            className="h-7 px-2 text-xs"
            title={isLocked ? "Unlock section" : "Lock section to prevent regeneration"}
          >
            {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="p-4">
        <Textarea
          value={displayContent}
          onChange={e => !isLocked && onEdit(def.id, e.target.value)}
          readOnly={isLocked || isStreaming}
          placeholder={`Write or generate the ${def.title.toLowerCase()} section…`}
          rows={6}
          className={`resize-y text-sm font-mono ${isLocked ? "opacity-70 cursor-not-allowed" : ""}`}
        />
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-muted-foreground">
            {wc} words
            {data?.editedAt && (
              <span className="ml-2 text-muted-foreground/60">
                · Edited {new Date(data.editedAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BoardReportPage() {
  const [, navigate] = useLocation();
  const gate = useGate();
  const { isDeepDive } = useDeepDive();
  // Mode labels — declared before early returns so they are always in scope
  const modeLabels = getModeLabels(gate.tenantMode as "cpo" | "reward" | null | undefined);
  const reportTitle = modeLabels.stage10Label;

  // No hard redirect — we show a blocking gate screen instead

  // Data
  const reportQ = trpc.intelligence.getBoardReport.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Local state
  const [sections, setSections] = useState<SectionsMeta>({});
  const [includeNotes, setIncludeNotes] = useState(false);
  const [streamingSection, setStreamingSection] = useState<SectionId | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [section1Stale, setSection1Stale] = useState(false);
  const [connectionDropped, setConnectionDropped] = useState(false);
  const [retrySection, setRetrySection] = useState<SectionId | null>(null);

  // Detect mobile viewport for read-only banner
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const abortRef = useRef<AbortController | null>(null);

  // Populate from server
  useEffect(() => {
    if (!reportQ.data) return;
    if (reportQ.data.boardReportSectionsJson) {
      try {
        const parsed = JSON.parse(reportQ.data.boardReportSectionsJson);
        setSections(parsed);
      } catch { /* ignore */ }
    }
    setIncludeNotes(reportQ.data.boardReportIncludeNotes ?? false);
  }, [reportQ.data]);

  // Mutations
  const saveSectionMutation = trpc.intelligence.saveBoardReportSection.useMutation();
  const toggleLockMutation = trpc.intelligence.toggleBoardReportSectionLock.useMutation();
  const savePreferencesMutation = trpc.intelligence.saveBoardReportPreferences.useMutation();
  const completeStage10Mutation = trpc.gate.completeStage10.useMutation({
    onSuccess: (data) => {
      gate.refetch();
      toast.success(`Stage 10 confirmed — ${data.totalWords} words`);
    },
    onError: (err) => toast.error(err.message),
  });

  // Section edit handler (debounced)
  const saveTimerRef = useRef<Map<SectionId, ReturnType<typeof setTimeout>>>(new Map());
  const handleEdit = useCallback((sectionId: SectionId, content: string) => {
    // Editing sections 2-6 marks Section 1 (context) as stale
    if (sectionId !== "context" && sections["context"]?.content?.trim()) {
      setSection1Stale(true);
    }
    const wc = countWords(content);
    setSections(prev => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] ?? {}),
        content,
        wordCount: wc,
        editedAt: Date.now(),
        isAiGenerated: false,
      },
    }));
    const existing = saveTimerRef.current.get(sectionId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      saveSectionMutation.mutate({ sectionId, content });
    }, 1500);
    saveTimerRef.current.set(sectionId, timer);
  }, [saveSectionMutation]);

  const handleToggleLock = useCallback((sectionId: SectionId, locked: boolean) => {
    setSections(prev => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] ?? {}),
        lockedAt: locked ? Date.now() : null,
      },
    }));
    toggleLockMutation.mutate({ sectionId, locked });
  }, [toggleLockMutation]);

  // Streaming generation
  const streamSection = useCallback(async (sectionId: SectionId) => {
    if (streamingSection) return; // one at a time
    const locked = sections[sectionId]?.lockedAt;
    if (locked) return;

    abortRef.current = new AbortController();
    setStreamingSection(sectionId);
    setStreamingText("");
    let accumulated = "";

    try {
      const response = await fetch("/api/board-report/stream-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId }),
        signal: abortRef.current.signal,
        credentials: "include",
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Generation failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            try {
              const json = JSON.parse(trimmed.slice(6));
              if (json.type === "token" && typeof json.content === "string") {
                accumulated += json.content;
                setStreamingText(accumulated);
              } else if (json.type === "done") {
                break;
              } else if (json.type === "error") {
                throw new Error(json.message ?? "Generation failed");
              }
            } catch (parseErr) {
              // Malformed chunk — skip
            }
          }
        }
      }

      // Commit the streamed content
      const wc = countWords(accumulated);
      setSections(prev => ({
        ...prev,
        [sectionId]: {
          ...(prev[sectionId] ?? {}),
          content: accumulated,
          wordCount: wc,
          isAiGenerated: true,
          editedAt: null,
          lockedAt: prev[sectionId]?.lockedAt ?? null,
        },
      }));
      saveSectionMutation.mutate({ sectionId, content: accumulated });
      toast.success(`${SECTION_DEFS.find(s => s.id === sectionId)?.title} generated`);
      // Regenerating sections 2-6 marks Section 1 as stale
      if (sectionId !== "context" && sections["context"]?.content?.trim()) {
        setSection1Stale(true);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        if (accumulated.length > 0) {
          // Partial content preserved — show retry option
          setConnectionDropped(true);
          setRetrySection(sectionId);
          setSections(prev => ({
            ...prev,
            [sectionId]: {
              ...(prev[sectionId] ?? {}),
              content: accumulated,
              wordCount: countWords(accumulated),
              isAiGenerated: true,
              editedAt: null,
            },
          }));
        } else {
          toast.error("Generation failed — please try again");
        }
      }
    } finally {
      setStreamingSection(null);
      setStreamingText("");
    }
  }, [streamingSection, sections, saveSectionMutation]);

  const handleGenerateAll = async () => {
    for (const def of SECTION_DEFS) {
      if (!sections[def.id]?.lockedAt) {
        await streamSection(def.id);
      }
    }
  };

  const handleIncludeNotesChange = (val: boolean) => {
    setIncludeNotes(val);
    savePreferencesMutation.mutate({ includeNotes: val });
  };

  // Total word count
  const totalWords = SECTION_DEFS.reduce((sum, def) => {
    const s = sections[def.id];
    return sum + (s?.wordCount ?? countWords(s?.content ?? ""));
  }, 0);

  const allSectionsPresent = SECTION_DEFS.every(def => sections[def.id]?.content?.trim());
  const wordCountOk = totalWords >= 1200 && totalWords <= 4000;
  const canConfirm = allSectionsPresent && wordCountOk;

  const handleConfirm = () => {
    completeStage10Mutation.mutate({
      boardReportSectionsJson: JSON.stringify(sections),
      boardReportIncludeNotes: includeNotes,
    });
    setConfirmOpen(false);
  };

  const handleExportPdf = () => {
    window.open("/api/pdf/board_report", "_blank");
  };

  const handleExportWord = () => {
    window.open("/api/export/board-report-docx", "_blank");
  };

  const isLoading = gate.isLoading || reportQ.isLoading;
  const stage10Cleared = gate.stage10Cleared;

  // Blocking gate screen — shown when Stage 10 is not yet accessible
  if (!gate.isLoading && !gate.isStage10Accessible) {
    const stagesNeeded = [
      { num: 1, label: "Background Inputs", cleared: !!gate.stage1Cleared, route: "/strategy/diagnostic" },
      { num: 2, label: "Vision Statement", cleared: !!gate.stage2Cleared, route: "/strategy/vision" },
      { num: 3, label: "Strategy Archetype", cleared: !!gate.stage3Cleared, route: "/strategy/strategy" },
      { num: 4, label: "Guiding Principles", cleared: !!gate.stage4Cleared, route: "/strategy/ambition" },
      { num: 5, label: "The Plan", cleared: !!gate.stage5Cleared, route: "/strategy/plan" },
      { num: 6, label: "Success Measures", cleared: !!gate.stage6Cleared, route: "/strategy/roadmap" },
      { num: 7, label: "Business Case", cleared: !!gate.stage7Cleared, route: "/strategy/business-case" },
      { num: 8, label: "Capability Assessment", cleared: !!gate.stage8Cleared, route: "/strategy/capability" },
      { num: 9, label: "Review Session", cleared: !!gate.stage9Cleared, route: "/strategy/review" },
    ];
    const firstIncomplete = stagesNeeded.find(s => !s.cleared);
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{reportTitle} is locked</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Complete all 9 preceding stages before generating your {reportTitle.toLowerCase()}. Each stage builds on the last to ensure your report is grounded in a complete strategy.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h2 className="text-sm font-semibold text-foreground mb-4">Stages to complete</h2>
          {stagesNeeded.map(stage => (
            <div
              key={stage.num}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                stage.cleared
                  ? "bg-emerald-500/5 border border-emerald-500/20"
                  : "bg-muted/50 border border-border hover:bg-muted"
              }`}
              onClick={() => !stage.cleared && navigate(stage.route)}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                stage.cleared ? "bg-emerald-500 text-white" : "bg-muted-foreground/20 text-muted-foreground"
              }`}>
                {stage.cleared ? <CheckCircle2 className="w-4 h-4" /> : stage.num}
              </div>
              <span className={`text-sm flex-1 ${
                stage.cleared ? "text-emerald-700 dark:text-emerald-300 line-through opacity-70" : "text-foreground font-medium"
              }`}>
                {stage.label}
              </span>
              {!stage.cleared && (
                <span className="text-xs text-primary font-medium">Go →</span>
              )}
            </div>
          ))}
        </div>

        {firstIncomplete && (
          <div className="flex justify-center">
            <Button
              size="lg"
              className="gap-2"
              onClick={() => navigate(firstIncomplete.route)}
            >
              Continue: Stage {firstIncomplete.num} — {firstIncomplete.label}
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <SectionPageLayout sectionNumber="10"
      isDeepDive={isDeepDive}
      confirmedAt={gate.gateState?.stage10.completedAt}
      sectionLabel={reportTitle} title={reportTitle} accentColor="#0f172a" icon={<FileText className="w-4 h-4 text-white" />}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </SectionPageLayout>
    );
  }

  return (
    <SectionPageLayout
      sectionNumber="10"
      isDeepDive={isDeepDive}
      confirmedAt={gate.gateState?.stage10.completedAt}
      sectionLabel={reportTitle}
      title={reportTitle}
      accentColor="#0f172a"
      icon={<FileText className="w-4 h-4 text-white" />}
      stageProgress={!isDeepDive ? {
        stageNumber: 10,
        title: reportTitle,
        description: "Generate all 6 report sections, review and edit them, then confirm when the total word count is between 1,200 and 4,000 words.",
        isCleared: !!stage10Cleared,
        canConfirm,
        isPending: completeStage10Mutation.isPending,
        onConfirm: () => stage10Cleared ? setConfirmOpen(true) : setConfirmOpen(true),
        backRoute: "/strategy/review",
      } : undefined}
    >
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Mobile read-only banner */}
        {isMobile && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <MonitorSmartphone className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              This editor works best on desktop. View only on mobile.
            </p>
          </div>
        )}

        {/* Connection drop banner */}
        {connectionDropped && (
          <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Generation interrupted — partial content preserved.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConnectionDropped(false);
                if (retrySection) streamSection(retrySection);
              }}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Section 1 staleness banner */}
        {section1Stale && (
          <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Section 1 (Context & Background) may be out of date — other sections have changed. Consider regenerating it.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSection1Stale(false); streamSection("context"); }}
            >
              Regenerate
            </Button>
          </div>
        )}

        {/* Stage cleared banner */}
        {stage10Cleared && !isDeepDive && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Board report confirmed</p>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                Stage 10 cleared. You can still edit and re-export the report.
              </p>
            </div>
          </div>
        )}
      {stage10Cleared && isDeepDive && (
        <DeepDiveConfirmedStatus
          confirmedAt={gate.gateState?.stage10.completedAt}
          label="Stage 10 confirmed"
        />
      )}

        {/* Top toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`text-sm font-medium ${wordCountOk ? "text-emerald-600 dark:text-emerald-400" : totalWords > 4000 ? "text-red-500" : "text-muted-foreground"}`}>
              {totalWords.toLocaleString()} / 1,200–4,000 words
            </div>
            {!wordCountOk && totalWords > 0 && (
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                {totalWords < 1200 ? `${1200 - totalWords} more words needed` : `${totalWords - 4000} words over limit`}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateAll}
            disabled={!!streamingSection}
          >
            {streamingSection ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating…</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Generate all sections</>
            )}
          </Button>
        </div>

        {/* Section editors */}
        {SECTION_DEFS.map(def => (
          <SectionEditor
            key={def.id}
            def={def}
            data={sections[def.id]}
            isStreaming={streamingSection === def.id}
            streamingText={streamingSection === def.id ? streamingText : ""}
            onGenerate={streamSection}
            onEdit={handleEdit}
            onToggleLock={handleToggleLock}
          />
        ))}

        {/* Include notes toggle */}
        <div className="flex items-center gap-3 p-4 border border-border rounded-lg">
          <Switch
            id="include-notes"
            checked={includeNotes}
            onCheckedChange={handleIncludeNotesChange}
          />
          <Label htmlFor="include-notes" className="cursor-pointer">
            <span className="text-sm font-medium">Include review session notes as appendix</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Appends your Stage 9 session notes to the exported PDF and Word document.
            </p>
          </Label>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
            <FileDown className="w-4 h-4" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportWord} className="gap-1.5">
            <FileText className="w-4 h-4" />
            Export Word
          </Button>
          <p className="text-xs text-muted-foreground">
            Intermediate exports — the final {reportTitle.toLowerCase()} is this document.
          </p>
        </div>

        {/* Gate footer */}
        <section className="border-t border-border pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Confirm {reportTitle.toLowerCase()}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {!allSectionsPresent
                  ? "All 6 sections must have content before confirming."
                  : !wordCountOk
                  ? `Total word count must be between 1,200 and 4,000 (currently ${totalWords.toLocaleString()}).`
                  : "All sections complete. Ready to confirm."}
              </p>
            </div>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!canConfirm || completeStage10Mutation.isPending}
              className="flex-shrink-0"
            >
              {completeStage10Mutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Confirming…</>
              ) : stage10Cleared ? (
                "Re-confirm"
              ) : (
                "Confirm report"
              )}
            </Button>
          </div>
        </section>
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm {reportTitle.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark Stage 10 as complete and lock the report version. You can still edit and re-confirm at any time. Total word count: {totalWords.toLocaleString()}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionPageLayout>
  );
}
