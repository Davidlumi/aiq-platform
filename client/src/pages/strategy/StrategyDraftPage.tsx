/**
 * StrategyDraftPage — /strategy/draft
 *
 * 7-section strategy narrative document.
 * Each section can be generated independently, edited inline, and locked.
 * The executive summary is always generated last.
 */
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles, Lock, Unlock, RefreshCw, ChevronDown, ChevronUp,
  FileText, CheckCircle2, AlertCircle, Download, Copy, Check,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionId =
  | "exec_summary"
  | "where_we_are"
  | "where_going"
  | "what_well_do"
  | "success_measures"
  | "what_requires"
  | "what_wont_do";

interface DraftSection {
  id: SectionId;
  title: string;
  content: string;
  generatedAt: number;
  version: number;
  lockedAt?: number;
}

interface StrategyDraft {
  sections: DraftSection[];
  generatedAt: number | null;
  lockedSections: string[];
}

// ─── Section Metadata ─────────────────────────────────────────────────────────

const SECTION_ORDER: SectionId[] = [
  "exec_summary",
  "where_we_are",
  "where_going",
  "what_well_do",
  "success_measures",
  "what_requires",
  "what_wont_do",
];

const SECTION_META: Record<SectionId, { title: string; hint: string; generateLast?: boolean }> = {
  exec_summary: {
    title: "Executive summary",
    hint: "~80–120 words. Generated last — distils the whole document.",
    generateLast: true,
  },
  where_we_are: {
    title: "Where we are",
    hint: "2–3 paragraphs. The org context, current HR function, pressure points, and why AI now.",
  },
  where_going: {
    title: "Where we're going",
    hint: "3–4 paragraphs. The ambition, guiding principles, and human outcomes.",
  },
  what_well_do: {
    title: "What we'll do",
    hint: "4–5 paragraphs. Phased plan — Foundation, Build, Scale, Optimise.",
  },
  success_measures: {
    title: "How we'll know it's working",
    hint: "2–3 paragraphs + 3–5 specific outcomes with concrete metrics.",
  },
  what_requires: {
    title: "What this requires",
    hint: "2–3 paragraphs. Investment envelope and key dependencies — narrative, not a budget.",
  },
  what_wont_do: {
    title: "What we won't do",
    hint: "3–5 explicit exclusions with brief reasoning.",
  },
};

// ─── Section Component ────────────────────────────────────────────────────────

interface SectionCardProps {
  sectionId: SectionId;
  section: DraftSection | undefined;
  isLocked: boolean;
  isGenerating: boolean;
  onGenerate: (id: SectionId) => void;
  onSave: (id: SectionId, content: string) => void;
  onToggleLock: (id: SectionId, locked: boolean) => void;
}

function SectionCard({
  sectionId,
  section,
  isLocked,
  isGenerating,
  onGenerate,
  onSave,
  onToggleLock,
}: SectionCardProps) {
  const meta = SECTION_META[sectionId];
  const [isExpanded, setIsExpanded] = useState(!section || sectionId === "exec_summary");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(section?.content ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (section?.content) setEditContent(section.content);
  }, [section?.content]);

  const handleCopy = async () => {
    if (!section?.content) return;
    await navigator.clipboard.writeText(section.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    onSave(sectionId, editContent);
    setIsEditing(false);
  };

  const isEmpty = !section?.content;

  return (
    <div
      className={`rounded-xl border transition-all ${
        isLocked
          ? "border-emerald-500/30 bg-emerald-500/5"
          : isEmpty
          ? "border-border bg-card"
          : "border-border bg-card"
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(e => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === "Enter" && setIsExpanded(x => !x)}
        aria-expanded={isExpanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{meta.title}</span>
            {meta.generateLast && (
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                Generate last
              </Badge>
            )}
            {isLocked && (
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                <Lock className="w-2.5 h-2.5 mr-0.5" /> Locked
              </Badge>
            )}
            {section?.version && section.version > 1 && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                v{section.version}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">{meta.hint}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isEmpty ? (
            <AlertCircle className="w-4 h-4 text-muted-foreground/40" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground/50" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground/50" />
          )}
        </div>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50">
          {isEmpty ? (
            <div className="pt-4 text-center space-y-3">
              <p className="text-sm text-muted-foreground/60">
                {sectionId === "exec_summary"
                  ? "Generate the other sections first, then come back to write the executive summary."
                  : "No content yet. Click Generate to draft this section."}
              </p>
              <Button
                size="sm"
                onClick={() => onGenerate(sectionId)}
                disabled={isGenerating || isLocked}
                className="gap-1.5"
              >
                {isGenerating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {isGenerating ? "Generating…" : "Generate"}
              </Button>
            </div>
          ) : isEditing ? (
            <div className="pt-3 space-y-2">
              <Textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="min-h-[200px] text-sm font-serif leading-relaxed resize-y"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setIsEditing(false); setEditContent(section?.content ?? ""); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-3 space-y-3">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {section!.content.split("\n\n").map((para, i) => (
                  <p key={i} className="text-sm text-foreground/85 leading-relaxed font-serif">
                    {para}
                  </p>
                ))}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {!isLocked && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1"
                      onClick={() => onGenerate(sectionId)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Regenerate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1"
                      onClick={() => setIsEditing(true)}
                    >
                      Edit
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className={`text-xs gap-1 ${isLocked ? "text-emerald-400 border-emerald-500/30" : ""}`}
                  onClick={() => onToggleLock(sectionId, !isLocked)}
                >
                  {isLocked ? (
                    <><Unlock className="w-3 h-3" /> Unlock</>
                  ) : (
                    <><Lock className="w-3 h-3" /> Lock</>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs gap-1 text-muted-foreground"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                {section?.generatedAt && (
                  <span className="text-[10px] text-muted-foreground/40 ml-auto">
                    Generated {new Date(section.generatedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StrategyDraftPage() {
  const utils = trpc.useUtils();
  const { data: draft, isLoading } = trpc.intelligence.getStrategyDraft.useQuery();
  const generateMutation = trpc.intelligence.generateStrategyDraftSection.useMutation({
    onSuccess: () => {
      utils.intelligence.getStrategyDraft.invalidate();
    },
    onError: (err) => {
      toast.error(`Generation failed: ${err.message}`);
    },
  });
  const saveMutation = trpc.intelligence.saveStrategyDraftSection.useMutation({
    onSuccess: () => {
      utils.intelligence.getStrategyDraft.invalidate();
      toast.success("Section saved");
    },
  });

  const [generatingSection, setGeneratingSection] = useState<SectionId | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const sections: DraftSection[] = (draft as StrategyDraft | null)?.sections ?? [];
  const lockedSections: string[] = (draft as StrategyDraft | null)?.lockedSections ?? [];
  const sectionMap = new Map(sections.map(s => [s.id, s]));

  const completedCount = SECTION_ORDER.filter(id => sectionMap.has(id)).length;
  const allComplete = completedCount === SECTION_ORDER.length;

  const handleGenerate = async (sectionId: SectionId) => {
    setGeneratingSection(sectionId);
    try {
      await generateMutation.mutateAsync({ sectionId });
      toast.success(`"${SECTION_META[sectionId].title}" generated`);
    } finally {
      setGeneratingSection(null);
    }
  };

  const handleGenerateAll = async () => {
    // Generate in order: 2-7 first, then exec summary
    const order: SectionId[] = [
      "where_we_are", "where_going", "what_well_do",
      "success_measures", "what_requires", "what_wont_do",
      "exec_summary",
    ];
    for (const id of order) {
      if (lockedSections.includes(id)) continue;
      setGeneratingSection(id);
      try {
        await generateMutation.mutateAsync({ sectionId: id });
      } catch {
        toast.error(`Failed to generate "${SECTION_META[id].title}"`);
        break;
      }
    }
    setGeneratingSection(null);
    toast.success("All sections generated");
  };

  const handleSave = (sectionId: SectionId, content: string) => {
    saveMutation.mutate({ sectionId, content });
  };

  const handleToggleLock = (sectionId: SectionId, locked: boolean) => {
    const section = sectionMap.get(sectionId);
    if (!section) return;
    saveMutation.mutate({ sectionId, content: section.content, locked });
    toast.success(locked ? "Section locked" : "Section unlocked");
  };

  const handleCopyAll = async () => {
    const text = SECTION_ORDER
      .map(id => {
        const s = sectionMap.get(id);
        if (!s) return null;
        return `## ${s.title}\n\n${s.content}`;
      })
      .filter(Boolean)
      .join("\n\n---\n\n");
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast.success("Full document copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-violet-400" />
          <h1 className="text-xl font-bold text-foreground">Strategy draft</h1>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            {completedCount}/{SECTION_ORDER.length} sections
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground/70">
          A 4–6 page narrative in your voice. Generate each section, edit inline, and lock when ready.
          The executive summary is generated last.
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-violet-500 transition-all duration-500"
          style={{ width: `${(completedCount / SECTION_ORDER.length) * 100}%` }}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={handleGenerateAll}
          disabled={!!generatingSection}
          className="gap-1.5"
        >
          {generatingSection ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {generatingSection
            ? `Generating "${SECTION_META[generatingSection].title}"…`
            : allComplete
            ? "Regenerate all"
            : "Generate all sections"}
        </Button>
        {allComplete && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleCopyAll}
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedAll ? "Copied!" : "Copy full document"}
          </Button>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {SECTION_ORDER.map(sectionId => (
          <SectionCard
            key={sectionId}
            sectionId={sectionId}
            section={sectionMap.get(sectionId)}
            isLocked={lockedSections.includes(sectionId)}
            isGenerating={generatingSection === sectionId}
            onGenerate={handleGenerate}
            onSave={handleSave}
            onToggleLock={handleToggleLock}
          />
        ))}
      </div>

      {/* Footer note */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          <strong className="text-muted-foreground">About this document.</strong>{" "}
          This draft is generated from your strategy inputs, guiding principles, and selected initiatives.
          It is a starting point — edit any section to reflect your own voice and judgement.
          Lock sections to protect them from future regeneration.
          Use "Copy full document" to paste into Word or Google Docs.
        </p>
      </div>
    </div>
  );
}
