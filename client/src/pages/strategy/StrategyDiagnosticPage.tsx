/**
 * StrategyDiagnosticPage — Background Input Section (Beta)
 *
 * 8-section wizard (A–H) capturing org context for the strategy builders.
 * CPO completes all 8 sections at their own pace (20–40 min).
 * Facilitator (platform_super_admin) adds private notes layer during the 1:1 session.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Building2, Users, Cpu, BarChart2, Target, Lightbulb, Star, UserCheck,
  CheckCircle2, ChevronRight, ChevronLeft, StickyNote, X,
  Plus, Trash2, Info, AlertCircle, Loader2, Check, Circle,
} from "lucide-react";
import { SECTOR_TAXONOMY, getSubSectors } from "../../../../shared/sectorTaxonomy";

// ── Types ─────────────────────────────────────────────────────────────────────

type SectionId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
type ProgressState = "not_started" | "in_progress" | "complete";

interface AiTool {
  hrFunction: "TA" | "L&D" | "Reward" | "HR Ops" | "Other";
  toolName: string;
  status: "In production" | "Pilot" | "Evaluating";
}

interface DomainRating {
  score: number;
  rationaleNotes?: string;
}

// Capability assessment uses two separate state variables:
// capDomains: domain ratings keyed by domain key
// capDerived: computed overall score and maturity label

interface Approver {
  name: string;
  role: string;
  influence?: "high" | "medium" | "low";
}

// ── Section progress helper ────────────────────────────────────────────────────

function calcProgress(inputs: Record<string, unknown>, sectionId: SectionId): ProgressState {
  const s = (inputs as any)[`section${sectionId}`];
  if (!s) return "not_started";
  const vals = Object.values(s).filter(v => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0));
  if (vals.length === 0) return "not_started";
  // Required field checks per section
  const required: Record<SectionId, string[]> = {
    A: ["sector", "headcountBand"],
    B: ["hrTeamSize"],
    C: ["hrisSystem"],
    D: ["annualHiresLow", "annualHiresHigh"],
    E: ["ambitionTier", "hrPosture", "timeHorizonMonths", "riskAppetite", "successNarrative"],
    F: ["cultureDescriptors"],
    G: ["ai_interaction", "ai_output_evaluation", "ai_workflow_design", "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership"],
    H: ["keyApprovers", "aiLiteracyLevel"],
  };
  const req = required[sectionId] ?? [];
  const allReq = req.every(k => {
    const v = s[k];
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });
  if (allReq) return "complete";
  return "in_progress";
}

function ProgressDot({ state }: { state: ProgressState }) {
  if (state === "complete") return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />;
  if (state === "in_progress") return <Circle className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0 fill-amber-100 dark:fill-amber-900/30" />;
  return <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
}

// ── Section definitions ───────────────────────────────────────────────────────

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: "A", label: "Company snapshot",      icon: Building2  },
  { id: "B", label: "HR shape",              icon: Users      },
  { id: "C", label: "Tech & AI footprint",   icon: Cpu        },
  { id: "D", label: "Operational baselines", icon: BarChart2  },
  { id: "E", label: "Strategic direction",   icon: Target     },
  { id: "F", label: "Culture",               icon: Lightbulb  },
  { id: "G", label: "Capability assessment", icon: Star       },
  { id: "H", label: "Stakeholder context",   icon: UserCheck  },
];

const HR_SUB_FUNCTIONS = ["TA", "L&D", "Reward", "WFP", "HRBP", "HR Ops", "DEI", "Comms"];
const APPROVER_ROLES = ["CEO", "CHRO", "Board", "Audit committee", "Transformation committee"];
const LANGUAGE_OPTIONS = ["Numbers", "Vision/story", "Risk-mitigation", "Competitive positioning", "Customer impact", "Employee impact"];

const HRIS_OPTIONS = ["Workday", "SAP SuccessFactors", "Oracle HCM", "MS Dynamics", "Cornerstone", "Sage People", "Other", "None"];
const ATS_OPTIONS = ["Greenhouse", "Lever", "iCIMS", "Workday Recruiting", "SmartRecruiters", "Taleo", "Other", "None"];
const LMS_OPTIONS = ["Cornerstone", "Docebo", "LinkedIn Learning", "Degreed", "Workday Learning", "Other", "None"];

const HEADCOUNT_BANDS = [
  { value: "lt500",     label: "< 500" },
  { value: "500_5k",    label: "500 – 5,000" },
  { value: "5k_25k",    label: "5,000 – 25,000" },
  { value: "25k_plus",  label: "25,000+" },
];

const BUDGET_ENVELOPE_OPTIONS = [
  { value: "lt200k",    label: "< £200K" },
  { value: "200k_1m",   label: "£200K – £1M" },
  { value: "1m_plus",   label: "£1M+" },
];

const CAPABILITY_DOMAINS = [
  { key: "ai_interaction",         label: "AI Interaction",         desc: "Ability to craft effective prompts and iterate with AI tools" },
  { key: "ai_output_evaluation",   label: "AI Output Evaluation",   desc: "Critical assessment of AI-generated content for quality and bias" },
  { key: "ai_workflow_design",     label: "AI Workflow Design",     desc: "Designing HR processes that integrate AI at the right touchpoints" },
  { key: "workforce_ai_readiness", label: "Workforce AI Readiness", desc: "Preparing employees for AI-augmented roles and ways of working" },
  { key: "ai_ethics_trust",        label: "AI Ethics & Trust",      desc: "Governance, fairness, and responsible AI deployment in HR" },
  { key: "ai_change_leadership",   label: "AI Change Leadership",   desc: "Leading the cultural and operational shift to AI-enabled HR" },
];

function getMaturityLabel(score: number): string {
  if (score < 4) return "Foundational";
  if (score < 6) return "Developing";
  if (score < 8) return "Capable";
  return "Advanced";
}

// ── Auto-save hook ─────────────────────────────────────────────────────────────

function useAutoSave(
  saveFn: (data: unknown) => void,
  delay = 800,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const schedule = useCallback((data: unknown) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveState("saving");
    timerRef.current = setTimeout(() => {
      saveFn(data);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    }, delay);
  }, [saveFn, delay]);

  return { schedule, saveState };
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function StrategyDiagnosticPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isSuperAdmin = (user as any)?.role === "platform_super_admin";

  const [activeSection, setActiveSection] = useState<SectionId>("A");
  const [showFacilitatorNotes, setShowFacilitatorNotes] = useState(isSuperAdmin);
  const [facilitatorNoteText, setFacilitatorNoteText] = useState<Record<string, string>>({});
  const [inputs, setInputs] = useState<Record<string, unknown>>({});
  const [capDomains, setCapDomains] = useState<Record<string, DomainRating>>({});
  const [capDerived, setCapDerived] = useState<{ overallScore?: number; maturityLabel?: string }>({});
  const [serverFacilitatorNotes, setServerFacilitatorNotes] = useState<Record<string, { content: string; updatedAt?: string }>>({});
  const [completeError, setCompleteError] = useState<string | null>(null);

  // tRPC queries
  const inputsQ = trpc.backgroundInputs.getInputs.useQuery(undefined, {
    refetchInterval: isSuperAdmin ? false : 3000, // CPO polls for facilitator updates
  });

  const utils = trpc.useUtils();

  const saveInputsMut = trpc.backgroundInputs.saveInputs.useMutation({
    onSuccess: () => utils.backgroundInputs.getInputs.invalidate(),
  });

  const saveFacilitatorNoteMut = trpc.backgroundInputs.saveFacilitatorNote.useMutation();

  const completePreworkMut = trpc.backgroundInputs.completePrework.useMutation({
    onSuccess: () => {
      utils.backgroundInputs.getInputs.invalidate();
      setCompleteError(null);
    },
    onError: (e) => setCompleteError(e.message),
  });

  const completeSessionMut = trpc.backgroundInputs.completeSession.useMutation({
    onSuccess: () => {
      utils.backgroundInputs.getInputs.invalidate();
      setCompleteError(null);
    },
    onError: (e) => setCompleteError(e.message),
  });

  // Populate local state from server
  useEffect(() => {
    if (inputsQ.data) {
      setInputs((inputsQ.data.backgroundInputs as Record<string, unknown>) ?? {});
      const capData = (inputsQ.data.capabilityAssessment as Record<string, unknown>) ?? {};
      const domains: Record<string, DomainRating> = {};
      for (const d of CAPABILITY_DOMAINS) {
        if (capData[d.key]) domains[d.key] = capData[d.key] as DomainRating;
      }
      setCapDomains(domains);
      if ((capData as any).overallScore !== undefined) {
        setCapDerived({ overallScore: (capData as any).overallScore, maturityLabel: (capData as any).maturityLabel });
      }
      if (inputsQ.data.facilitatorNotes) {
        setServerFacilitatorNotes(inputsQ.data.facilitatorNotes as Record<string, { content: string }>);
        const noteTexts: Record<string, string> = {};
        for (const [k, v] of Object.entries(inputsQ.data.facilitatorNotes as Record<string, { content: string }>)) {
          noteTexts[k] = v.content ?? "";
        }
        setFacilitatorNoteText(noteTexts);
      }
    }
  }, [inputsQ.data]);

  // Auto-save
  const { schedule: scheduleInputSave, saveState } = useAutoSave(
    useCallback((data: unknown) => {
      const d = data as { sections: Record<string, unknown>; capabilityAssessment?: Record<string, unknown> };
      saveInputsMut.mutate({ sections: d.sections as any, capabilityAssessment: d.capabilityAssessment as any });
    }, [saveInputsMut]),
  );

  const updateSection = useCallback((sectionId: SectionId, field: string, value: unknown) => {
    setInputs(prev => {
      const key = `section${sectionId}`;
      const updated = { ...prev, [key]: { ...(prev[key] as Record<string, unknown> ?? {}), [field]: value } };
      scheduleInputSave({ sections: updated, capabilityAssessment: { ...capDomains, ...capDerived } });
      return updated;
    });
  }, [scheduleInputSave, capDomains, capDerived]);

  const updateCapability = useCallback((domainKey: string, field: "score" | "rationaleNotes", value: unknown) => {
    setCapDomains(prev => {
      const updated: Record<string, DomainRating> = { ...prev, [domainKey]: { ...(prev[domainKey] ?? { score: 5 }), [field]: value } as DomainRating };
      // Compute derived overall
      const scores = CAPABILITY_DOMAINS.map(d => updated[d.key]?.score ?? 0);
      const validScores = scores.filter(s => s > 0);
      const overall = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
      const derived = { overallScore: Math.round(overall * 10) / 10, maturityLabel: getMaturityLabel(overall) };
      setCapDerived(derived);
      scheduleInputSave({ sections: inputs, capabilityAssessment: { ...updated, ...derived } });
      return updated;
    });
  }, [scheduleInputSave, inputs]);

  const saveFacilitatorNote = useCallback((sectionId: string) => {
    const content = facilitatorNoteText[sectionId] ?? "";
    saveFacilitatorNoteMut.mutate({ sectionId: sectionId as any, content });
  }, [facilitatorNoteText, saveFacilitatorNoteMut]);

  const preworkDone = !!inputsQ.data?.preworkCompletedAt;
  const sessionDone = !!inputsQ.data?.sessionCompletedAt;
  const draftState = inputsQ.data?.draftGenerationState ?? "none";

  const sectionData = (id: SectionId) => (inputs as any)[`section${id}`] ?? {};
  const getField = (id: SectionId, field: string) => sectionData(id)[field];

  const activeSectionDef = SECTIONS.find(s => s.id === activeSection)!;

  // Section progress
  const progressMap = Object.fromEntries(
    SECTIONS.map(s => [s.id, calcProgress(inputs, s.id)])
  ) as Record<SectionId, ProgressState>;

  // Headcount band → approximate number for validation
  const headcountApprox: Record<string, number> = {
    lt500: 499, "500_5k": 5000, "5k_25k": 25000, "25k_plus": 100000,
  };
  const maxHrTeamSize = headcountApprox[getField("A", "headcountBand") ?? "25k_plus"] ?? 100000;

  const hrTeamSize = parseInt(getField("B", "hrTeamSize") ?? "0", 10);
  const hrSizeWarning = hrTeamSize > maxHrTeamSize
    ? "HR team size cannot exceed total headcount."
    : null;

  // Section sub-sectors
  const selectedSector = getField("A", "sector") ?? "";
  const subSectors = selectedSector ? getSubSectors(selectedSector) : [];

  if (inputsQ.isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-4 gap-3 mt-6">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* ── Left: Section nav ─────────────────────────────────────────────── */}
      <div className="w-56 flex-shrink-0 border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold text-foreground">Background inputs</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {preworkDone ? (sessionDone ? "Session complete" : "Pre-work done") : "Pre-work in progress"}
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {SECTIONS.map(sec => {
            const prog = progressMap[sec.id];
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors text-sm ${
                  activeSection === sec.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <ProgressDot state={prog} />
                <span className="flex-1 truncate">{sec.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t space-y-2">
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => setShowFacilitatorNotes(v => !v)}
            >
              <StickyNote className="w-3.5 h-3.5 mr-1.5" />
              {showFacilitatorNotes ? "Hide notes" : "Show notes"}
            </Button>
          )}
          {/* Save indicator */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground h-5">
            {saveState === "saving" && <><Loader2 className="w-3 h-3 animate-spin" />Saving…</>}
            {saveState === "saved" && <><Check className="w-3 h-3 text-emerald-600" />Saved</>}
          </div>
        </div>
      </div>

      {/* ── Centre: Section content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">

          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-mono">Section {activeSection}</Badge>
              {draftState === "initial_draft" && (
                <Badge className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700">
                  Initial draft — not curated yet
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-semibold text-foreground">{activeSectionDef.label}</h1>
          </div>

          {/* ── Section A ─────────────────────────────────────────────────── */}
          {activeSection === "A" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Company name</Label>
                <Input
                  placeholder="e.g. Acme Corporation"
                  value={getField("A", "companyName") ?? ""}
                  onChange={e => updateSection("A", "companyName", e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label>Industry <span className="text-destructive">*</span></Label>
                <Select
                  value={getField("A", "sector") ?? ""}
                  onValueChange={v => { updateSection("A", "sector", v); updateSection("A", "subSector", ""); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTOR_TAXONOMY.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {subSectors.length > 0 && (
                <div className="space-y-2">
                  <Label>Sub-sector <span className="text-destructive">*</span></Label>
                  <Select
                    value={getField("A", "subSector") ?? ""}
                    onValueChange={v => updateSection("A", "subSector", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {subSectors.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Total headcount <span className="text-destructive">*</span></Label>
                <Select
                  value={getField("A", "headcountBand") ?? ""}
                  onValueChange={v => updateSection("A", "headcountBand", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select headcount range" />
                  </SelectTrigger>
                  <SelectContent>
                    {HEADCOUNT_BANDS.map(b => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Primary geography</Label>
                <Select
                  value={getField("A", "primaryGeography") ?? "uk"}
                  onValueChange={v => updateSection("A", "primaryGeography", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uk">United Kingdom</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">UK-only for beta. Multi-region support coming post-beta.</p>
              </div>
            </div>
          )}

          {/* ── Section B ─────────────────────────────────────────────────── */}
          {activeSection === "B" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>HR team size <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={0}
                  max={9999}
                  placeholder="e.g. 45"
                  value={getField("B", "hrTeamSize") ?? ""}
                  onChange={e => updateSection("B", "hrTeamSize", parseInt(e.target.value, 10) || 0)}
                />
                {hrSizeWarning && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />{hrSizeWarning}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>HR sub-functions present <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground">Select all that apply</p>
                <div className="grid grid-cols-2 gap-2">
                  {HR_SUB_FUNCTIONS.map(fn => {
                    const selected: string[] = getField("B", "hrSubFunctions") ?? [];
                    const checked = selected.includes(fn);
                    return (
                      <label key={fn} className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={v => {
                            const next = v ? [...selected, fn] : selected.filter(x => x !== fn);
                            updateSection("B", "hrSubFunctions", next);
                          }}
                        />
                        <span className="text-sm">{fn}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>HR reports to <span className="text-destructive">*</span></Label>
                <Select
                  value={getField("B", "reportsTo") ?? ""}
                  onValueChange={v => updateSection("B", "reportsTo", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reporting line" />
                  </SelectTrigger>
                  <SelectContent>
                    {["CEO", "CHRO", "COO", "CFO", "Other"].map(r => (
                      <SelectItem key={r} value={r.toLowerCase()}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ── Section C ─────────────────────────────────────────────────── */}
          {activeSection === "C" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>HRIS <span className="text-destructive">*</span></Label>
                <Select
                  value={getField("C", "hrisSystem") ?? ""}
                  onValueChange={v => updateSection("C", "hrisSystem", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select HRIS" /></SelectTrigger>
                  <SelectContent>
                    {HRIS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>ATS</Label>
                <Select
                  value={getField("C", "atsSystem") ?? ""}
                  onValueChange={v => updateSection("C", "atsSystem", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select ATS" /></SelectTrigger>
                  <SelectContent>
                    {ATS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>LMS</Label>
                <Select
                  value={getField("C", "lmsSystem") ?? ""}
                  onValueChange={v => updateSection("C", "lmsSystem", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select LMS" /></SelectTrigger>
                  <SelectContent>
                    {LMS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Existing AI tools in HR</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Tools already deployed or being evaluated</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const tools: AiTool[] = getField("C", "existingAiTools") ?? [];
                      updateSection("C", "existingAiTools", [...tools, { hrFunction: "TA", toolName: "", status: "Evaluating" }]);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />Add tool
                  </Button>
                </div>
                {((getField("C", "existingAiTools") ?? []) as AiTool[]).map((tool, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start p-3 rounded-lg border bg-muted/10">
                    <div className="space-y-1">
                      <Label className="text-xs">Function</Label>
                      <Select
                        value={tool.hrFunction}
                        onValueChange={v => {
                          const tools = [...(getField("C", "existingAiTools") ?? []) as AiTool[]];
                          tools[idx] = { ...tools[idx], hrFunction: v as AiTool["hrFunction"] };
                          updateSection("C", "existingAiTools", tools);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["TA", "L&D", "Reward", "HR Ops", "Other"].map(f => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tool name</Label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="e.g. Eightfold"
                        value={tool.toolName}
                        onChange={e => {
                          const tools = [...(getField("C", "existingAiTools") ?? []) as AiTool[]];
                          tools[idx] = { ...tools[idx], toolName: e.target.value };
                          updateSection("C", "existingAiTools", tools);
                        }}
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Status</Label>
                      <Select
                        value={tool.status}
                        onValueChange={v => {
                          const tools = [...(getField("C", "existingAiTools") ?? []) as AiTool[]];
                          tools[idx] = { ...tools[idx], status: v as AiTool["status"] };
                          updateSection("C", "existingAiTools", tools);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["In production", "Pilot", "Evaluating"].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <button
                      className="mt-5 p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => {
                        const tools = (getField("C", "existingAiTools") ?? []) as AiTool[];
                        updateSection("C", "existingAiTools", tools.filter((_, i) => i !== idx));
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {((getField("C", "existingAiTools") ?? []) as AiTool[]).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No AI tools added yet.</p>
                )}
              </div>
            </div>
          )}

          {/* ── Section D ─────────────────────────────────────────────────── */}
          {activeSection === "D" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Estimates are fine — tick the flag and downstream financials will be marked indicative.
              </p>

              {/* Annual hires */}
              <div className="space-y-2">
                <Label>Annual hires <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Low estimate</Label>
                    <Input
                      type="number" min={0}
                      placeholder="e.g. 80"
                      value={getField("D", "annualHiresLow") ?? ""}
                      onChange={e => updateSection("D", "annualHiresLow", parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">High estimate</Label>
                    <Input
                      type="number" min={0}
                      placeholder="e.g. 120"
                      value={getField("D", "annualHiresHigh") ?? ""}
                      onChange={e => updateSection("D", "annualHiresHigh", parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={getField("D", "annualHiresIsEstimate") ?? false}
                    onCheckedChange={v => updateSection("D", "annualHiresIsEstimate", v)}
                  />
                  This is an estimate
                </label>
              </div>

              {/* Admin time per hire */}
              <div className="space-y-2">
                <Label>Admin time per hire (hours) <span className="text-destructive">*</span></Label>
                <Input
                  type="number" min={0} step={0.5}
                  placeholder="e.g. 12"
                  value={getField("D", "adminTimePerHireHours") ?? ""}
                  onChange={e => updateSection("D", "adminTimePerHireHours", parseFloat(e.target.value) || 0)}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={getField("D", "adminTimeIsEstimate") ?? false}
                    onCheckedChange={v => updateSection("D", "adminTimeIsEstimate", v)}
                  />
                  This is an estimate
                </label>
              </div>

              {/* Total HR budget */}
              <div className="space-y-2">
                <Label>Total HR budget (£) <span className="text-destructive">*</span></Label>
                <Input
                  type="number" min={0}
                  placeholder="e.g. 4500000"
                  value={getField("D", "totalHrBudgetGbp") ?? ""}
                  onChange={e => updateSection("D", "totalHrBudgetGbp", parseFloat(e.target.value) || 0)}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={getField("D", "hrBudgetIsEstimate") ?? false}
                    onCheckedChange={v => updateSection("D", "hrBudgetIsEstimate", v)}
                  />
                  This is an estimate
                </label>
              </div>

              {/* Loaded cost per HR FTE */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Loaded cost per HR FTE (£) <span className="text-destructive">*</span></Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Fully loaded cost including salary, NI, pension, benefits. Suggested: HR budget ÷ HR team size.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {getField("B", "hrTeamSize") && getField("D", "totalHrBudgetGbp") && (
                  <p className="text-xs text-muted-foreground">
                    Suggested: £{Math.round((getField("D", "totalHrBudgetGbp") as number) / (getField("B", "hrTeamSize") as number)).toLocaleString()} (HR budget ÷ team size)
                  </p>
                )}
                <Input
                  type="number" min={0}
                  placeholder="e.g. 75000"
                  value={getField("D", "loadedFteCostGbp") ?? ""}
                  onChange={e => updateSection("D", "loadedFteCostGbp", parseFloat(e.target.value) || 0)}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={getField("D", "loadedFteIsEstimate") ?? false}
                    onCheckedChange={v => updateSection("D", "loadedFteIsEstimate", v)}
                  />
                  This is an estimate
                </label>
              </div>

              {/* Budget envelope for HR AI */}
              <div className="space-y-2">
                <Label>Budget envelope for HR AI <span className="text-destructive">*</span></Label>
                <Select
                  value={getField("D", "aiInvestmentEnvelope") ?? ""}
                  onValueChange={v => updateSection("D", "aiInvestmentEnvelope", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select budget range" /></SelectTrigger>
                  <SelectContent>
                    {BUDGET_ENVELOPE_OPTIONS.map(b => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ── Section E ─────────────────────────────────────────────────── */}
          {activeSection === "E" && (
            <div className="space-y-5">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-xs text-amber-700 dark:text-amber-300">
                Capture verbatim where possible. The success narrative is the spine of the vision draft.
              </div>

              <div className="space-y-2">
                <Label>Business AI ambition tier <span className="text-destructive">*</span></Label>
                <Select
                  value={getField("E", "ambitionTier") ?? ""}
                  onValueChange={v => updateSection("E", "ambitionTier", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select ambition tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative — cautious, compliance-first</SelectItem>
                    <SelectItem value="pragmatic">Pragmatic — selective, ROI-focused</SelectItem>
                    <SelectItem value="innovator">Innovator — proactive, competitive advantage</SelectItem>
                    <SelectItem value="transformative">Transformative — all-in, AI-native ambition</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>HR AI posture <span className="text-destructive">*</span></Label>
                <Select
                  value={getField("E", "hrPosture") ?? ""}
                  onValueChange={v => updateSection("E", "hrPosture", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select HR posture" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="following">Following — HR adopts after the business</SelectItem>
                    <SelectItem value="pacing">Pacing — HR keeps pace with the business</SelectItem>
                    <SelectItem value="leading">Leading — HR leads AI adoption for the business</SelectItem>
                    <SelectItem value="transformative">Transformative — HR co-creates the AI strategy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Time horizon <span className="text-destructive">*</span></Label>
                <Select
                  value={getField("E", "timeHorizonMonths") ?? ""}
                  onValueChange={v => updateSection("E", "timeHorizonMonths", parseInt(v, 10))}
                >
                  <SelectTrigger><SelectValue placeholder="Select horizon" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 months</SelectItem>
                    <SelectItem value="18">18 months</SelectItem>
                    <SelectItem value="24">24 months</SelectItem>
                    <SelectItem value="36">36 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Risk appetite <span className="text-destructive">*</span></Label>
                <Select
                  value={getField("E", "riskAppetite") ?? ""}
                  onValueChange={v => updateSection("E", "riskAppetite", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select risk appetite" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative — avoid risk, prioritise stability</SelectItem>
                    <SelectItem value="balanced">Balanced — accept measured risk for clear upside</SelectItem>
                    <SelectItem value="aggressive">Aggressive — accept significant risk for competitive advantage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Success narrative <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground italic">
                  "Imagine it's {getField("E", "timeHorizonMonths") ? `${getField("E", "timeHorizonMonths")} months` : "[horizon]"} from now and someone asks how your strategy went — what do you want to be able to say?"
                </p>
                <Textarea
                  placeholder="Capture verbatim…"
                  rows={5}
                  value={getField("E", "successNarrative") ?? ""}
                  onChange={e => updateSection("E", "successNarrative", e.target.value)}
                  maxLength={1000}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {(getField("E", "successNarrative") as string ?? "").length}/1000
                </p>
              </div>

              <div className="space-y-3">
                <Label>Top 3 pain points <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground">What's slowing HR down most right now?</p>
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <Input
                      placeholder={`Pain point ${i + 1}`}
                      value={((getField("E", "topPainPoints") ?? []) as string[])[i] ?? ""}
                      onChange={e => {
                        const pts = [...((getField("E", "topPainPoints") ?? ["", "", ""]) as string[])];
                        pts[i] = e.target.value;
                        updateSection("E", "topPainPoints", pts);
                      }}
                      maxLength={200}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Section F ─────────────────────────────────────────────────── */}
          {activeSection === "F" && (
            <div className="space-y-5">
              <div className="space-y-3">
                <Label>Culture descriptors <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground">Three words that honestly describe HR culture today</p>
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <Input
                      placeholder={`Descriptor ${i + 1}`}
                      value={((getField("F", "cultureDescriptors") ?? []) as string[])[i] ?? ""}
                      onChange={e => {
                        const ds = [...((getField("F", "cultureDescriptors") ?? ["", "", ""]) as string[])];
                        ds[i] = e.target.value;
                        updateSection("F", "cultureDescriptors", ds);
                      }}
                      maxLength={30}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Label>Non-negotiables</Label>
                <p className="text-xs text-muted-foreground">Things the CPO would never compromise on (up to 3)</p>
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <Input
                      placeholder={`Non-negotiable ${i + 1}`}
                      value={((getField("F", "nonNegotiables") ?? []) as string[])[i] ?? ""}
                      onChange={e => {
                        const ns = [...((getField("F", "nonNegotiables") ?? ["", "", ""]) as string[])];
                        ns[i] = e.target.value;
                        updateSection("F", "nonNegotiables", ns);
                      }}
                      maxLength={200}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Section G ─────────────────────────────────────────────────── */}
          {activeSection === "G" && (
            <div className="space-y-5">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-xs text-blue-700 dark:text-blue-300">
                This is a facilitated CPO self-rating — not the platform's adaptive assessment. Score each domain 0–10 together, then capture rationale notes.
              </div>

              {CAPABILITY_DOMAINS.map(domain => {
                const rating = capDomains[domain.key] ?? { score: 0 };
                return (
                  <Card key={domain.key} className="border">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm font-medium">{domain.label}</CardTitle>
                      <CardDescription className="text-xs">{domain.desc}</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Score (0–10)</Label>
                          <span className="text-lg font-bold tabular-nums text-primary">{rating.score ?? 0}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={0.5}
                          value={rating.score ?? 0}
                          onChange={e => updateCapability(domain.key, "score", parseFloat(e.target.value))}
                          className="w-full accent-primary"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0 — None</span>
                          <span className="text-center">{getMaturityLabel(rating.score ?? 0)}</span>
                          <span>10 — Advanced</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Rationale notes</Label>
                        <Textarea
                          placeholder="What evidence supports this score?"
                          rows={2}
                          value={rating.rationaleNotes ?? ""}
                          onChange={e => updateCapability(domain.key, "rationaleNotes", e.target.value)}
                          maxLength={500}
                          className="resize-none text-sm"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Derived overall */}
              {capDerived.overallScore !== undefined && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="flex items-center justify-between py-4 px-5">
                    <div>
                      <p className="text-sm font-medium">Overall capability score</p>
                      <p className="text-xs text-muted-foreground">Mean of six domains</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary tabular-nums">
                        {capDerived.overallScore.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {capDerived.maturityLabel}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── Section H ─────────────────────────────────────────────────── */}
          {activeSection === "H" && (
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Who needs to approve <span className="text-destructive">*</span></Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Select all that apply</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {APPROVER_ROLES.map(role => {
                    const selected: string[] = getField("H", "keyApprovers") ?? [];
                    const checked = selected.includes(role);
                    return (
                      <label key={role} className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={v => {
                            const next = v ? [...selected, role] : selected.filter(x => x !== role);
                            updateSection("H", "keyApprovers", next);
                          }}
                        />
                        <span className="text-sm">{role}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Their AI literacy <span className="text-destructive">*</span></Label>
                <Select
                  value={getField("H", "aiLiteracyLevel") ?? ""}
                  onValueChange={v => updateSection("H", "aiLiteracyLevel", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select literacy level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High — actively use AI, understand capabilities</SelectItem>
                    <SelectItem value="moderate">Moderate — aware but limited hands-on experience</SelectItem>
                    <SelectItem value="low">Low — limited awareness, may be sceptical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>What language resonates with them</Label>
                <p className="text-xs text-muted-foreground">Select all that apply (session: add more based on discussion)</p>
                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGE_OPTIONS.map(lang => {
                    const selected: string[] = getField("H", "languageResonates") ?? [];
                    const checked = selected.includes(lang);
                    return (
                      <label key={lang} className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={v => {
                            const next = v ? [...selected, lang] : selected.filter(x => x !== lang);
                            updateSection("H", "languageResonates", next);
                          }}
                        />
                        <span className="text-sm">{lang}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Specific concerns they've raised</Label>
                <Textarea
                  placeholder="Any concerns raised in prior conversations…"
                  rows={3}
                  value={getField("H", "stakeholderConcerns") ?? ""}
                  onChange={e => updateSection("H", "stakeholderConcerns", e.target.value)}
                  maxLength={500}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* ── Navigation + CTAs ─────────────────────────────────────────── */}
          <div className="pt-4 border-t flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={activeSection === "A"}
              onClick={() => {
                const idx = SECTIONS.findIndex(s => s.id === activeSection);
                if (idx > 0) setActiveSection(SECTIONS[idx - 1].id);
              }}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />Previous
            </Button>

            <div className="flex items-center gap-2">
              {/* Complete pre-work CTA */}
              {!preworkDone && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  disabled={completePreworkMut.isPending}
                  onClick={() => {
                    setCompleteError(null);
                    completePreworkMut.mutate();
                  }}
                >
                  {completePreworkMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                  Complete pre-work
                </Button>
              )}

              {/* Complete session CTA (super admin only) */}
              {preworkDone && !sessionDone && isSuperAdmin && (
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground"
                  disabled={completeSessionMut.isPending}
                  onClick={() => {
                    setCompleteError(null);
                    completeSessionMut.mutate();
                  }}
                >
                  {completeSessionMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                  Complete session
                </Button>
              )}

              {(preworkDone || sessionDone) && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {sessionDone ? "Session complete" : "Pre-work complete"}
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={activeSection === "H"}
              onClick={() => {
                const idx = SECTIONS.findIndex(s => s.id === activeSection);
                if (idx < SECTIONS.length - 1) setActiveSection(SECTIONS[idx + 1].id);
              }}
            >
              Next<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {completeError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {completeError}
            </div>
          )}

          {/* Pre-work status banner */}
          {preworkDone && !sessionDone && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Pre-work complete</p>
                <p className="text-xs mt-0.5">
                  {draftState === "generating" && "Generating initial strategy drafts in the background…"}
                  {draftState === "initial_draft" && "Initial drafts are ready on your strategy pages. Your facilitator will help you curate them during your session."}
                  {draftState === "none" && "Initial strategy drafts will be generated shortly."}
                  {draftState === "curated" && "Strategy drafts have been curated."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Facilitator notes sidebar ─────────────────────────────── */}
      {isSuperAdmin && showFacilitatorNotes && (
        <div className="w-72 flex-shrink-0 border-l bg-amber-50/50 dark:bg-amber-900/10 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Facilitator notes
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Private — never shown to CPO</p>
            </div>
            <button
              onClick={() => setShowFacilitatorNotes(false)}
              className="p-1 rounded hover:bg-muted/50 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Section {activeSection} — {activeSectionDef.label}
            </p>
            <Textarea
              placeholder="Add private notes for this section… (markdown supported)"
              rows={10}
              value={facilitatorNoteText[activeSection] ?? ""}
              onChange={e => setFacilitatorNoteText(prev => ({ ...prev, [activeSection]: e.target.value }))}
              className="resize-none text-sm bg-white dark:bg-background border-amber-200 dark:border-amber-700 focus-visible:ring-amber-400"
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
              onClick={() => saveFacilitatorNote(activeSection)}
              disabled={saveFacilitatorNoteMut.isPending}
            >
              {saveFacilitatorNoteMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
              Save note
            </Button>
            {serverFacilitatorNotes[activeSection] && (
              <p className="text-xs text-muted-foreground">
                Last saved: {serverFacilitatorNotes[activeSection].updatedAt ? new Date(serverFacilitatorNotes[activeSection].updatedAt!).toLocaleTimeString() : "recently"}
              </p>
            )}

            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">General notes</p>
            <Textarea
              placeholder="Cross-section observations…"
              rows={5}
              value={facilitatorNoteText["general"] ?? ""}
              onChange={e => setFacilitatorNoteText(prev => ({ ...prev, general: e.target.value }))}
              className="resize-none text-sm bg-white dark:bg-background border-amber-200 dark:border-amber-700"
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
              onClick={() => saveFacilitatorNote("general")}
              disabled={saveFacilitatorNoteMut.isPending}
            >
              Save general note
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
