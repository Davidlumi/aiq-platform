/**
 * StrategyDiagnosticPage — Background Input Section (Beta, Patch v2)
 *
 * 9-section wizard (A–I) capturing org context for the strategy builders.
 * CPO completes all 9 sections at their own pace (20–40 min).
 * Facilitator (platform_super_admin) adds private notes layer during the 1:1 session.
 *
 * Sections:
 *   A — Company snapshot (sector, headcount, geography, org type, regulatory context)
 *   B — HR shape (team size, sub-functions, reporting line, influence, budget ownership)
 *   C — Tech & AI footprint (HRIS, ATS, LMS, engagement survey, payroll, AI tools, data quality)
 *   D — Operational baselines (hires, admin time, HR budget, FTE cost, AI envelope, attrition, TTF)
 *   E — Strategic direction (ambition tier, HR posture, time horizon, risk appetite, success narrative)
 *   F — Culture (culture descriptors, non-negotiables, change readiness, decision style)
 *   G — Capability assessment (6-domain self-rating 0–10 with calibration prompts)
 *   H — Stakeholder context (approvers, AI literacy, language, concerns, board interest)
 *   I — Business & Workforce context (business direction, priorities, work type, job families)
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
import { Progress } from "@/components/ui/progress";
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
  Plus, Trash2, Info, AlertCircle, Loader2, Check, Circle, Globe, Sliders, Settings,
  Save, Clock, ArrowRight, Sparkles, Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SECTOR_TAXONOMY, getSubSectors } from "../../../../shared/sectorTaxonomy";
import StageProgressHeader from "@/components/StageProgressHeader";
import { useGate } from "@/contexts/GateContext";

// ── Types ─────────────────────────────────────────────────────────────────────

type SectionId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K";
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

interface Approver {
  name: string;
  role: string;
  influence?: "high" | "medium" | "low";
}

// ── Section progress helper ────────────────────────────────────────────────────

// ── Per-section mandatory completion check (mirrors backend completePrework) ──
// MANDATORY sections (gate Complete pre-work): A, B, C, D, E, G, I
// OPTIONAL sections (nav tick shows "complete" when all required fields filled): F, H, J, K
function isMandatoryComplete(
  inputs: Record<string, unknown>,
  capDomains: Record<string, DomainRating>,
  sectionI: Record<string, unknown>,
  sectionK?: Record<string, unknown>,
): boolean {
  const sA = (inputs as any).sectionA ?? {};
  const sB = (inputs as any).sectionB ?? {};
  const sC = (inputs as any).sectionC ?? {};
  const sD = (inputs as any).sectionD ?? {};
  const sE = (inputs as any).sectionE ?? {};
  // Section A: sector + (totalHeadcount OR headcountBand) + ukSitesCount
  if (!sA.sector) return false;
  if (!sA.totalHeadcount && !sA.headcountBand) return false;
  if (!sA.ukSitesCount) return false;
  // Section B: hrTeamSize defined (0 is valid)
  if (sB.hrTeamSize === undefined || sB.hrTeamSize === null) return false;
  // Section C: hrisSystem + workforceDigitalAccess + yearsOfHrisData (v4.2 Launch-tier)
  if (!sC.hrisSystem) return false;
  if (!sC.workforceDigitalAccess) return false;
  if (!sC.yearsOfHrisData) return false;
  // Section D: annualHiresLow + annualRevenue + monthlyHrQueryVolumeLow + annualApplicationVolumeLow + annualLDSpend
  if (sD.annualHiresLow === undefined || sD.annualHiresLow === null) return false;
  if (!sD.annualRevenue) return false;
  if (sD.monthlyHrQueryVolumeLow === undefined || sD.monthlyHrQueryVolumeLow === null) return false;
  if (sD.annualApplicationVolumeLow === undefined || sD.annualApplicationVolumeLow === null) return false;
  if (!sD.annualLDSpend) return false;
  // Section E: ambitionTier, hrPosture, riskAppetite
  if (!sE.ambitionTier || !sE.hrPosture || !sE.riskAppetite) return false;
  // Section G: at least 3 domains rated > 0
  const ratedCount = Object.values(capDomains).filter(d => d.score > 0).length;
  if (ratedCount < 3) return false;
  // Section I: businessDirection + peopleChallenges + workforceComposition + skillsFrameworkStatus (v4.2 Launch-tier)
  if (!sectionI.businessDirection) return false;
  if (!(sectionI.peopleChallenges as string[] ?? []).filter(Boolean).length) return false;
  if (!sectionI.workforceComposition) return false;
  if (!sectionI.skillsFrameworkStatus) return false;
  // Section K: performanceReviewCadence + hiringVolumeProfile (v4.2 Launch-tier)
  const sK = sectionK ?? (inputs as any).sectionK ?? {};
  if (!sK.performanceReviewCadence) return false;
  if (!(sK.hiringVolumeProfile as string[] ?? []).length) return false;
  return true;
}

function calcProgress(
  inputs: Record<string, unknown>,
  capDomains: Record<string, DomainRating>,
  sectionI: Record<string, unknown>,
  sectionId: SectionId,
  sectionJ?: Record<string, unknown>,
  sectionK?: Record<string, unknown>,
): ProgressState {
  if (sectionId === "G") {
    const rated = Object.values(capDomains).filter(d => d.score > 0).length;
    if (rated === 0) return "not_started";
    // Complete when backend threshold (3) is met; in_progress otherwise
    if (rated >= 3) return "complete";
    return "in_progress";
  }
  if (sectionId === "I") {
    const hasDir = !!(sectionI.businessDirection as string)?.trim();
    const hasChallenges = (sectionI.peopleChallenges as string[] ?? []).filter(Boolean).length > 0;
    const hasComposition = !!sectionI.workforceComposition;
    const hasSkillsStatus = !!sectionI.skillsFrameworkStatus;
    if (!hasDir && !hasChallenges) return "not_started";
    if (hasDir && hasChallenges && hasComposition && hasSkillsStatus) return "complete";
    return "in_progress";
  }
  if (sectionId === "K") {
    const k = sectionK ?? {};
    if (!k.onboardingModel && !k.performanceReviewCadence && !(k.hiringVolumeProfile as string[] ?? []).length) return "not_started";
    if (k.performanceReviewCadence && (k.hiringVolumeProfile as string[] ?? []).length > 0) return "complete";
    return "in_progress";
  }
  if (sectionId === "J") {
    const j = sectionJ ?? {};
    if (!j.budgetCeiling && !j.timelineConstraint && !j.vendorPreferences) return "not_started";
    if (j.budgetCeiling || j.timelineConstraint) return "complete";
    return "in_progress";
  }
  const s = (inputs as any)[`section${sectionId}`];
  if (!s) return "not_started";
  const vals = Object.values(s).filter(v => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0));
  if (vals.length === 0) return "not_started";

  // Mandatory required fields per section (mirrors backend completePrework)
  // Note: successNarrative is NOT required by the backend — removed from E
  // Note: F, H are optional sections — their "complete" tick is best-effort
  const required: Record<string, string[]> = {
    A: ["sector"],          // headcount + ukSitesCount handled specially below
    B: ["hrTeamSize"],      // 0 is valid — handled specially below
    C: ["hrisSystem", "workforceDigitalAccess", "yearsOfHrisData"], // v4.2 Launch-tier
    D: ["annualHiresLow"],  // numeric 0-valid fields handled specially below
    E: ["ambitionTier", "hrPosture", "riskAppetite"],
    F: ["cultureDescriptors"],
    H: ["aiLiteracyLevel"], // keyApprovers is optional in backend
  };

  // Special-case: Section A headcount (either totalHeadcount or headcountBand) + ukSitesCount
  if (sectionId === "A") {
    if (!s.sector) return "in_progress";
    if (!s.totalHeadcount && !s.headcountBand) return "in_progress";
    if (!s.ukSitesCount) return "in_progress";
    return "complete";
  }

  // Special-case: numeric fields where 0 is valid
  if (sectionId === "B") {
    if (s.hrTeamSize === undefined || s.hrTeamSize === null) return "in_progress";
    return "complete";
  }
  if (sectionId === "D") {
    if (s.annualHiresLow === undefined || s.annualHiresLow === null) return "in_progress";
    if (!s.annualRevenue) return "in_progress";
    if (s.monthlyHrQueryVolumeLow === undefined || s.monthlyHrQueryVolumeLow === null) return "in_progress";
    if (s.annualApplicationVolumeLow === undefined || s.annualApplicationVolumeLow === null) return "in_progress";
    if (!s.annualLDSpend) return "in_progress";
    return "complete";
  }

  // Special-case: Section F cultureDescriptors — array may contain empty strings
  if (sectionId === "F") {
    const descs = (s.cultureDescriptors as string[] ?? []).filter(Boolean);
    if (descs.length >= 1) return "complete";
    return "in_progress";
  }

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
  { id: "A", label: "Company snapshot",          icon: Building2  },
  { id: "B", label: "HR shape",                  icon: Users      },
  { id: "C", label: "Tech & AI footprint",       icon: Cpu        },
  { id: "D", label: "Operational baselines",     icon: BarChart2  },
  { id: "E", label: "Strategic direction",       icon: Target     },
  { id: "F", label: "Culture",                   icon: Lightbulb  },
  { id: "G", label: "Capability assessment",     icon: Star       },
  { id: "H", label: "Stakeholder context",       icon: UserCheck  },
  { id: "I", label: "Business & workforce",      icon: Globe      },
  { id: "J", label: "Constraints & preferences",  icon: Sliders    },
  { id: "K", label: "Ways of working",             icon: Settings   },
];

const HR_SUB_FUNCTIONS = ["TA", "L&D", "Reward", "WFP", "HRBP", "HR Ops", "DEI", "Comms"];
const APPROVER_ROLES = ["CEO", "CHRO", "Board", "Audit committee", "Transformation committee"];
const LANGUAGE_OPTIONS = ["Numbers", "Vision/story", "Risk-mitigation", "Competitive positioning", "Customer impact", "Employee impact"];

const HRIS_OPTIONS = ["Workday", "SAP SuccessFactors", "Oracle HCM", "MS Dynamics", "Cornerstone", "Sage People", "Other", "None"];
const ATS_OPTIONS = ["Greenhouse", "Lever", "iCIMS", "Workday Recruiting", "SmartRecruiters", "Taleo", "Other", "None"];
const LMS_OPTIONS = ["Cornerstone", "Docebo", "LinkedIn Learning", "Degreed", "Workday Learning", "Other", "None"];
const ENGAGEMENT_SURVEY_OPTIONS = ["Glint", "Peakon", "Culture Amp", "Qualtrics", "Medallia", "Lattice", "Other", "None"];
const PAYROLL_OPTIONS = ["ADP", "Ceridian Dayforce", "Workday Payroll", "SAP Payroll", "SD Worx", "Zellis", "Other", "None"];

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

const REGULATORY_OPTIONS = [
  "GDPR / UK GDPR",
  "FCA / PRA (Financial Services)",
  "NHS / CQC (Healthcare)",
  "Ofsted / DfE (Education)",
  "ICO guidance on AI",
  "EU AI Act (if EU operations)",
  "ISO 27001 / SOC 2",
  "DORA (Digital Operational Resilience)",
];

const CAPABILITY_DOMAINS = [
  {
    key: "ai_interaction",
    label: "AI Interaction",
    desc: "Ability to craft effective prompts and iterate with AI tools",
    calibrationPrompt: "Think about the last time you or your team used an AI tool. How often do you refine prompts to get better outputs? Do you have a shared approach to prompting, or is it ad hoc?",
    anchorLow: "0–2: Rarely or never used AI tools; no prompting practice",
    anchorMid: "4–6: Some team members use AI tools regularly; prompting is informal",
    anchorHigh: "8–10: Team has a systematic prompting practice; outputs are consistently high quality",
  },
  {
    key: "ai_output_evaluation",
    label: "AI Output Evaluation",
    desc: "Critical assessment of AI-generated content for quality and bias",
    calibrationPrompt: "When your team receives AI-generated content (a job description, a policy draft, a data summary), what's the review process? Do people know what to look for in terms of errors, bias, or hallucinations?",
    anchorLow: "0–2: AI outputs accepted at face value; no review process",
    anchorMid: "4–6: Some review happens informally; team is aware of risks but inconsistent",
    anchorHigh: "8–10: Structured review process; team can identify and correct bias and errors reliably",
  },
  {
    key: "ai_workflow_design",
    label: "AI Workflow Design",
    desc: "Designing HR processes that integrate AI at the right touchpoints",
    calibrationPrompt: "Has your team redesigned any HR process to include AI as a step — not just as a tool someone uses on the side? For example, AI-assisted screening built into the hiring workflow, or AI-generated first drafts in L&D content creation?",
    anchorLow: "0–2: AI is used ad hoc by individuals; no process redesign",
    anchorMid: "4–6: One or two processes have been redesigned; mostly pilot stage",
    anchorHigh: "8–10: Multiple HR processes systematically redesigned with AI embedded at key touchpoints",
  },
  {
    key: "workforce_ai_readiness",
    label: "Workforce AI Readiness",
    desc: "Preparing employees for AI-augmented roles and ways of working",
    calibrationPrompt: "What has HR done to prepare the broader workforce for AI? Is there a programme, a communication strategy, or a learning pathway? Or is it left to individual managers and teams to figure out?",
    anchorLow: "0–2: No formal workforce AI readiness programme; reactive approach",
    anchorMid: "4–6: Some communications and optional learning; patchy uptake",
    anchorHigh: "8–10: Structured programme with clear pathways; measurable uplift in AI confidence across workforce",
  },
  {
    key: "ai_ethics_trust",
    label: "AI Ethics & Trust",
    desc: "Governance, fairness, and responsible AI deployment in HR",
    calibrationPrompt: "If a manager asked you today whether it's safe to use AI in a hiring decision, what would you say? Do you have a policy, a governance framework, or a clear position on where AI can and can't be used in HR?",
    anchorLow: "0–2: No policy or governance; decisions made case by case",
    anchorMid: "4–6: Some guidelines exist; not consistently applied; no formal review process",
    anchorHigh: "8–10: Clear policy and governance framework; regular audits; team confident in ethical AI deployment",
  },
  {
    key: "ai_change_leadership",
    label: "AI Change Leadership",
    desc: "Leading the cultural and operational shift to AI-enabled HR",
    calibrationPrompt: "How would you describe your own confidence in leading the AI transformation of HR? Do you feel equipped to make the case to the CEO, manage resistance in the team, and sustain momentum over 12–24 months?",
    anchorLow: "0–2: Limited confidence; reactive to AI developments; no clear change narrative",
    anchorMid: "4–6: Growing confidence; some stakeholder buy-in; change narrative in development",
    anchorHigh: "8–10: Strong change leadership; clear narrative; CEO and board aligned; team energised",
  },
];

function getMaturityLabel(score: number): string {
  if (score < 4) return "Foundational";
  if (score < 6) return "Developing";
  if (score < 8) return "Capable";
  return "Advanced";
}

// ── Auto-save hook ─────────────────────────────────────────────────────────────

function useAutoSave(saveFn: (data: unknown) => void, delay = 800) {
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
  const { tenantMode } = useGate();
  const isRewardMode = tenantMode === "reward";

  const [activeSection, setActiveSection] = useState<SectionId>("A");
  const [showFacilitatorNotes, setShowFacilitatorNotes] = useState(isSuperAdmin);
  const [facilitatorNoteText, setFacilitatorNoteText] = useState<Record<string, string>>({});
  const [inputs, setInputs] = useState<Record<string, unknown>>({});
  const [capDomains, setCapDomains] = useState<Record<string, DomainRating>>({});
  const [capDerived, setCapDerived] = useState<{ overallScore?: number; maturityLabel?: string }>({});
  const [sectionI, setSectionI] = useState<Record<string, unknown>>({});
  const [sectionJ, setSectionJ] = useState<Record<string, unknown>>({});
  const [sectionK, setSectionK] = useState<Record<string, unknown>>({});
  const [serverFacilitatorNotes, setServerFacilitatorNotes] = useState<Record<string, { content: string; updatedAt?: string }>>({});
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [expandedCalibration, setExpandedCalibration] = useState<string | null>(null);

  // ── Save as Draft state ──────────────────────────────────────────────────
  const [lastExplicitSaveAt, setLastExplicitSaveAt] = useState<number | null>(null);
  const [draftSaveState, setDraftSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resumeSection, setResumeSection] = useState<SectionId | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Tracks which sections the user has attempted to advance past — triggers inline errors
  const [touchedSections, setTouchedSections] = useState<Set<SectionId>>(new Set());
  const touchSection = (id: SectionId) => setTouchedSections(prev => new Set(Array.from(prev).concat(id)));

  // tRPC queries
  const inputsQ = trpc.backgroundInputs.getInputs.useQuery(undefined, {
    refetchInterval: isSuperAdmin ? false : 3000,
  });

  const utils = trpc.useUtils();

  const saveDraftMut = trpc.backgroundInputs.saveDraft.useMutation({
    onSuccess: (data) => {
      setLastExplicitSaveAt(data.savedAt);
      setHasUnsavedChanges(false);
      setDraftSaveState("saved");
      toast.success("Draft saved", { description: "You can safely close this page and resume later." });
      setTimeout(() => setDraftSaveState("idle"), 3000);
      utils.backgroundInputs.getInputs.invalidate();
    },
    onError: () => {
      setDraftSaveState("idle");
      toast.error("Failed to save draft", { description: "Please try again." });
    },
  });

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

  // ── Section E: AI-assisted draft generation ──────────────────────────────
  const aiDraftMut = trpc.backgroundInputs.aiDraft.useMutation();
  // Key format: "successNarrative" | "painPoint_0" | "painPoint_1" | "painPoint_2" | "strategicPriority_0" … "strategicPriority_4"
  // Track which keys have ever had a draft generated (to show Regenerate)
  const [aiDrafted, setAiDrafted] = useState<Record<string, boolean>>({});
  // Track which keys are currently generating
  const [aiPending, setAiPending] = useState<Record<string, boolean>>({});
  // Store the previous value before each AI generation so the user can undo
  const [aiPrevValues, setAiPrevValues] = useState<Record<string, string>>({});
  // Tag chip animation state — tracks which chip keys are entering or exiting
  const [chipEntering, setChipEntering] = useState<Set<string>>(new Set());
  const [chipExiting, setChipExiting] = useState<Set<string>>(new Set());

  const addChipAnimated = (field: "cultureDescriptors" | "nonNegotiables", value: string) => {
    const current = ((getField("F", field) ?? []) as string[]).filter(Boolean);
    if (current.length >= 3 || current.includes(value)) return;
    const key = `${field}:${value}`;
    updateSection("F", field, [...current, value]);
    setChipEntering(prev => { const n = new Set(prev); n.add(key); return n; });
    setTimeout(() => setChipEntering(prev => { const n = new Set(prev); n.delete(key); return n; }), 250);
  };

  const removeChipAnimated = (field: "cultureDescriptors" | "nonNegotiables", index: number, value: string) => {
    const key = `${field}:${value}`;
    setChipExiting(prev => { const n = new Set(prev); n.add(key); return n; });
    setTimeout(() => {
      setChipExiting(prev => { const n = new Set(prev); n.delete(key); return n; });
      const current = ((getField("F", field) ?? []) as string[]).filter(Boolean);
      updateSection("F", field, current.filter((_, j) => j !== index));
    }, 150);
  };

  const undoAiDraft = (
    key: string,
    fieldType: "successNarrative" | "painPoint" | "strategicPriority",
    index?: number,
  ) => {
    const prev = aiPrevValues[key];
    if (prev === undefined) return;
    if (fieldType === "successNarrative") {
      updateSection("E", "successNarrative", prev);
    } else if (fieldType === "painPoint" && index !== undefined) {
      const pts = [...((getField("E", "topPainPoints") ?? ["", "", ""]) as string[])];
      pts[index] = prev;
      updateSection("E", "topPainPoints", pts);
    } else if (fieldType === "strategicPriority" && index !== undefined) {
      const pts = [...((getField("E", "strategicPriorities") ?? ["", "", "", "", ""]) as string[])];
      pts[index] = prev;
      updateSection("E", "strategicPriorities", pts);
    }
    // Clear undo state and drafted flag for this key
    setAiPrevValues(prev2 => { const n = { ...prev2 }; delete n[key]; return n; });
    setAiDrafted(prev2 => ({ ...prev2, [key]: false }));
  };

  // New UX: the textarea value IS the hint. AI button reads current field value as the keyword prompt,
  // then replaces it with the generated draft.
  const runAiDraft = async (
    key: string,
    fieldType: "successNarrative" | "painPoint" | "strategicPriority",
    index?: number,
  ) => {
    // Read the current field value as the hint
    let hint = "";
    if (fieldType === "successNarrative") {
      hint = (getField("E", "successNarrative") as string) ?? "";
    } else if (fieldType === "painPoint" && index !== undefined) {
      hint = (((getField("E", "topPainPoints") ?? []) as string[])[index]) ?? "";
    } else if (fieldType === "strategicPriority" && index !== undefined) {
      const spArr = ((getField("E", "strategicPriorities") ?? []) as string[]);
      hint = spArr[index] ?? "";
    }
    if (!hint.trim()) {
      toast.error("Type a few keywords first, then click AI to generate");
      return;
    }
    // Snapshot current value before overwriting so user can undo
    setAiPrevValues(prev => ({ ...prev, [key]: hint }));
    setAiPending(prev => ({ ...prev, [key]: true }));
    try {
      const result = await aiDraftMut.mutateAsync({ fieldType, hint, index });
      if (fieldType === "successNarrative") {
        updateSection("E", "successNarrative", result.draft);
      } else if (fieldType === "painPoint" && index !== undefined) {
        const pts = [...((getField("E", "topPainPoints") ?? ["", "", ""]) as string[])];
        pts[index] = result.draft;
        updateSection("E", "topPainPoints", pts);
      } else if (fieldType === "strategicPriority" && index !== undefined) {
        const pts = [...((getField("E", "strategicPriorities") ?? ["", "", "", "", ""]) as string[])];
        pts[index] = result.draft;
        updateSection("E", "strategicPriorities", pts);
      }
      setAiDrafted(prev => ({ ...prev, [key]: true }));
    } catch (err: unknown) {
      // On failure, clear the snapshot so we don't show a stale undo
      setAiPrevValues(prev => { const n = { ...prev }; delete n[key]; return n; });
      const msg = err instanceof Error ? err.message : "AI draft failed";
      toast.error("AI generation failed", { description: msg });
    } finally {
      setAiPending(prev => ({ ...prev, [key]: false }));
    }
  };

  // Populate local state from server
  const hasHydratedRef = useRef(false);
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
      setSectionI((inputsQ.data.sectionI as Record<string, unknown>) ?? {});
      setSectionJ((inputsQ.data.sectionJ as Record<string, unknown>) ?? {});
      setSectionK((inputsQ.data.sectionK as Record<string, unknown>) ?? {});
      if (inputsQ.data.facilitatorNotes) {
        setServerFacilitatorNotes(inputsQ.data.facilitatorNotes as Record<string, { content: string }>);
        const noteTexts: Record<string, string> = {};
        for (const [k, v] of Object.entries(inputsQ.data.facilitatorNotes as Record<string, { content: string }>)) {
          noteTexts[k] = v.content ?? "";
        }
        setFacilitatorNoteText(noteTexts);
      }
      // On first load: restore draft position and last-saved timestamp
      if (!hasHydratedRef.current) {
        hasHydratedRef.current = true;
        const serverSavedAt = (inputsQ.data as any).lastDraftSavedAt as number | null;
        if (serverSavedAt) setLastExplicitSaveAt(serverSavedAt);
        const serverSection = (inputsQ.data as any).lastActiveSectionId as string | null;
        const validSections: SectionId[] = ["A","B","C","D","E","F","G","H","I","J","K"];
        if (serverSection && serverSection !== "A" && validSections.includes(serverSection as SectionId)) {
          setResumeSection(serverSection as SectionId);
          setShowResumePrompt(true);
        }
      }
    }
  }, [inputsQ.data]);

  // Auto-save
  const { schedule: scheduleInputSave, saveState } = useAutoSave(
    useCallback((data: unknown) => {
      const d = data as {
        sections: Record<string, unknown>;
        capabilityAssessment?: Record<string, unknown>;
        sectionI?: Record<string, unknown>;
        sectionJ?: Record<string, unknown>;
        sectionK?: Record<string, unknown>;
      };
      saveInputsMut.mutate({
        sections: d.sections as any,
        capabilityAssessment: d.capabilityAssessment as any,
        sectionI: d.sectionI as any,
        sectionJ: d.sectionJ as any,
        sectionK: d.sectionK as any,
      });
    }, [saveInputsMut]),
  );

  const updateSection = useCallback((sectionId: SectionId, field: string, value: unknown) => {
    setHasUnsavedChanges(true);
    setInputs(prev => {
      const key = `section${sectionId}`;
      const updated = { ...prev, [key]: { ...(prev[key] as Record<string, unknown> ?? {}), [field]: value } };
      scheduleInputSave({ sections: updated, capabilityAssessment: { ...capDomains, ...capDerived }, sectionI, sectionJ, sectionK });
      return updated;
    });
  }, [scheduleInputSave, capDomains, capDerived, sectionI, sectionJ, sectionK]);  // eslint-disable-line

  const updateSectionI = useCallback((field: string, value: unknown) => {
    setHasUnsavedChanges(true);
    setSectionI(prev => {
      const updated = { ...prev, [field]: value };
      scheduleInputSave({ sections: inputs, capabilityAssessment: { ...capDomains, ...capDerived }, sectionI: updated, sectionJ, sectionK });
      return updated;
    });
  }, [scheduleInputSave, inputs, capDomains, capDerived, sectionJ, sectionK]);

  const updateSectionJ = useCallback((field: string, value: unknown) => {
    setHasUnsavedChanges(true);
    setSectionJ(prev => {
      const updated = { ...prev, [field]: value };
      scheduleInputSave({ sections: inputs, capabilityAssessment: { ...capDomains, ...capDerived }, sectionI, sectionJ: updated, sectionK });
      return updated;
    });
  }, [scheduleInputSave, inputs, capDomains, capDerived, sectionI, sectionK]);

  const updateSectionK = useCallback((field: string, value: unknown) => {
    setHasUnsavedChanges(true);
    setSectionK(prev => {
      const updated = { ...prev, [field]: value };
      scheduleInputSave({ sections: inputs, capabilityAssessment: { ...capDomains, ...capDerived }, sectionI, sectionJ, sectionK: updated });
      return updated;
    });
  }, [scheduleInputSave, inputs, capDomains, capDerived, sectionI, sectionJ]);

  const updateCapability = useCallback((domainKey: string, field: "score" | "rationaleNotes", value: unknown) => {
    setCapDomains(prev => {
      const updated: Record<string, DomainRating> = {
        ...prev,
        [domainKey]: { ...(prev[domainKey] ?? { score: 0 }), [field]: value } as DomainRating,
      };
      const scores = CAPABILITY_DOMAINS.map(d => updated[d.key]?.score ?? 0);
      const validScores = scores.filter(s => s > 0);
      const overall = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
      const derived = { overallScore: Math.round(overall * 10) / 10, maturityLabel: getMaturityLabel(overall) };
      setCapDerived(derived);
      scheduleInputSave({ sections: inputs, capabilityAssessment: { ...updated, ...derived }, sectionI, sectionJ, sectionK });
      return updated;
    });
  }, [scheduleInputSave, inputs, sectionI, sectionJ]);

  // Explicit Save as Draft handler
  const handleSaveDraft = useCallback(() => {
    setDraftSaveState("saving");
    saveDraftMut.mutate({
      sections: inputs as any,
      capabilityAssessment: { ...capDomains, ...capDerived } as any,
      sectionI: sectionI as any,
      sectionJ: sectionJ as any,
      sectionK: sectionK as any,
      activeSectionId: activeSection,
    });
  }, [saveDraftMut, inputs, capDomains, capDerived, sectionI, sectionJ, sectionK, activeSection]);

  const saveFacilitatorNote = useCallback((sectionId: string) => {
    const content = facilitatorNoteText[sectionId] ?? "";
    saveFacilitatorNoteMut.mutate({ sectionId: sectionId as any, content });
  }, [facilitatorNoteText, saveFacilitatorNoteMut]);

  const preworkDone = !!inputsQ.data?.preworkCompletedAt;
  const sessionDone = !!inputsQ.data?.sessionCompletedAt;
  const draftState = inputsQ.data?.draftGenerationState ?? "none";

  const sectionData = (id: SectionId) => (inputs as any)[`section${id}`] ?? {};
  const getField = (id: SectionId, field: string) => sectionData(id)[field];
  const getFieldI = (field: string) => sectionI[field];
  const getFieldJ = (field: string) => sectionJ[field];
  const getFieldK = (field: string) => sectionK[field];

  const activeSectionDef = SECTIONS.find(s => s.id === activeSection)!;

  // Section progress
  const progressMap = Object.fromEntries(
    SECTIONS.map(s => [s.id, calcProgress(inputs, capDomains, sectionI, s.id, sectionJ, sectionK)])
  ) as Record<SectionId, ProgressState>;

  // Whether all mandatory sections are complete (mirrors backend completePrework)
  const allMandatoryComplete = isMandatoryComplete(inputs, capDomains, sectionI, sectionK);

  // Whether the current section's mandatory fields are filled (gates Next button)
  const currentSectionMandatory: SectionId[] = ["A", "B", "C", "D", "E", "G", "I"];
  const currentSectionComplete = !currentSectionMandatory.includes(activeSection)
    || progressMap[activeSection] === "complete";

  // Per-field error helper: returns an error message if the section is touched and the field is missing
  const isTouched = (id: SectionId) => touchedSections.has(id);
  const fieldErr = (id: SectionId, condition: boolean, msg = "Required") =>
    isTouched(id) && condition ? msg : null;

  // Headcount band → approximate number for validation
  const headcountApprox: Record<string, number> = {
    lt500: 499, "500_5k": 5000, "5k_25k": 25000, "25k_plus": 100000,
  };
  const maxHrTeamSize = headcountApprox[getField("A", "headcountBand") ?? "25k_plus"] ?? 100000;
  const hrTeamSize = parseInt(getField("B", "hrTeamSize") ?? "0", 10);
  const hrSizeWarning = hrTeamSize > maxHrTeamSize ? "HR team size cannot exceed total headcount." : null;

  const selectedSector = getField("A", "sector") ?? "";
  const subSectors = selectedSector ? getSubSectors(selectedSector) : [];

  if (inputsQ.isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-4 gap-3 mt-6">
          {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* ── Left: Section nav ─────────────────────────────────────────────── */}
      <div className="w-56 flex-shrink-0 border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Background inputs</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {preworkDone ? (sessionDone ? "Session complete" : "Pre-work done") : "Pre-work in progress"}
            </p>
          </div>

          {/* ── A–K progress bar ── */}
          {(() => {
            const completedCount = SECTIONS.filter(s => progressMap[s.id] === "complete").length;
            const inProgressCount = SECTIONS.filter(s => progressMap[s.id] === "in_progress").length;
            const pct = Math.round((completedCount / SECTIONS.length) * 100);
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-foreground/70">
                    {completedCount === SECTIONS.length
                      ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">All sections complete</span>
                      : <>{completedCount} <span className="text-muted-foreground font-normal">of {SECTIONS.length} complete</span></>}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-foreground/60">{pct}%</span>
                </div>
                <Progress
                  value={pct}
                  className="h-1.5"
                />
                {/* Section pills A–K */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {SECTIONS.map(s => {
                    const state = progressMap[s.id];
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        title={`Section ${s.id}: ${s.label} — ${state === "complete" ? "Complete" : state === "in_progress" ? "In progress" : "Not started"}`}
                        className={cn(
                          "w-5 h-5 rounded text-[10px] font-bold transition-all duration-150 flex items-center justify-center",
                          activeSection === s.id ? "ring-2 ring-primary ring-offset-1" : "",
                          state === "complete"
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : state === "in_progress"
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            : "bg-muted/60 text-muted-foreground/50"
                        )}
                      >
                        {state === "complete" ? <Check className="w-2.5 h-2.5" /> : s.id}
                      </button>
                    );
                  })}
                </div>
                {inProgressCount > 0 && completedCount < SECTIONS.length && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">
                    {inProgressCount} section{inProgressCount > 1 ? "s" : ""} in progress
                  </p>
                )}
              </div>
            );
          })()}
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
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground h-5">
            {saveState === "saving" && <><Loader2 className="w-3 h-3 animate-spin" />Saving…</> }
            {saveState === "saved" && <><Check className="w-3 h-3 text-emerald-600" />Auto-saved</> }
          </div>
          {lastExplicitSaveAt && (
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Draft saved {new Date(lastExplicitSaveAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )}
          {hasUnsavedChanges && !lastExplicitSaveAt && (
            <div className="flex items-center justify-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              Unsaved changes
            </div>
          )}
        </div>
      </div>

      {/* ── Centre: Section content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">


          {/* Stage 1 progress header */}
          <StageProgressHeader
            stageNumber={1}
            title="Background Inputs"
            description="Complete all required sections (A–K) to build your organisation context. Once all sections are done, confirm to unlock Stage 2: Vision."
            isCleared={preworkDone}
            canConfirm={preworkDone}
            isPending={false}
            onConfirm={() => navigate("/strategy/vision")}
            nextRoute="/strategy/vision"
            nextLabel="Vision"
          />
          {/* Resume prompt */}
          {showResumePrompt && resumeSection && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
              <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">Resume where you left off?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your last draft was saved at Section {resumeSection}.
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-2"
                  onClick={() => setShowResumePrompt(false)}
                >
                  Start from A
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => {
                    setActiveSection(resumeSection);
                    setShowResumePrompt(false);
                  }}
                >
                  Go to Section {resumeSection}
                </Button>
              </div>
            </div>
          )}

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
                  <SelectTrigger aria-invalid={!!fieldErr("A", !getField("A", "sector"))}><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {SECTOR_TAXONOMY.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErr("A", !getField("A", "sector")) && <p className="text-destructive text-xs mt-1">Please select an industry</p>}
              </div>

              {subSectors.length > 0 && (
                <div className="space-y-2">
                  <Label>Sub-sector</Label>
                  <Select
                    value={getField("A", "subSector") ?? ""}
                    onValueChange={v => updateSection("A", "subSector", v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select sub-sector" /></SelectTrigger>
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
                <p className="text-xs text-muted-foreground">Full-time equivalents (FTEs) across all locations</p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={1000000}
                    placeholder="e.g. 4500"
                    value={getField("A", "totalHeadcount") ?? ""}
                    onChange={e => updateSection("A", "totalHeadcount", e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="max-w-[180px]"
                    aria-invalid={!!fieldErr("A", !getField("A", "totalHeadcount") && !getField("A", "headcountBand"))}
                  />
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <Checkbox
                      checked={!!(getField("A", "totalHeadcountIsEstimate"))}
                      onCheckedChange={v => updateSection("A", "totalHeadcountIsEstimate", !!v)}
                    />
                    Approximate
                  </label>
                </div>
                {fieldErr("A", !getField("A", "totalHeadcount") && !getField("A", "headcountBand")) && <p className="text-destructive text-xs mt-1">Please enter total headcount</p>}
              </div>

              <div className="space-y-2">
                <Label>Number of UK sites</Label>
                <p className="text-xs text-muted-foreground">Distinct office, warehouse, or operational locations in the UK</p>
                <Input
                  type="number"
                  min={1}
                  max={100000}
                  placeholder="e.g. 12"
                  value={getField("A", "ukSitesCount") ?? ""}
                  onChange={e => updateSection("A", "ukSitesCount", e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  className="max-w-[180px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Primary geography</Label>
                <Select
                  value={getField("A", "primaryGeography") ?? "uk"}
                  onValueChange={v => updateSection("A", "primaryGeography", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uk">United Kingdom</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">UK-only for beta. Multi-region support coming post-beta.</p>
              </div>

              <div className="space-y-2">
                <Label>Organisation type</Label>
                <Select
                  value={getField("A", "orgType") ?? ""}
                  onValueChange={v => updateSection("A", "orgType", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select org type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plc">Listed / PLC</SelectItem>
                    <SelectItem value="private">Private company</SelectItem>
                    <SelectItem value="pe_backed">PE-backed</SelectItem>
                    <SelectItem value="ngo_charity">NGO / Charity</SelectItem>
                    <SelectItem value="public_sector">Public sector</SelectItem>
                    <SelectItem value="partnership">Partnership / LLP</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Regulatory context</Label>
                <p className="text-xs text-muted-foreground">Select all that apply — shapes governance requirements in your strategy</p>
                <div className="grid grid-cols-1 gap-2">
                  {REGULATORY_OPTIONS.map(reg => {
                    const selected: string[] = getField("A", "sectorSpecificRegulations") ?? [];
                    const checked = selected.includes(reg);
                    return (
                      <label key={reg} className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={v => {
                            const next = v ? [...selected, reg] : selected.filter(x => x !== reg);
                            updateSection("A", "sectorSpecificRegulations", next);
                          }}
                        />
                        <span className="text-sm">{reg}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Section B ─────────────────────────────────────────────────── */}
          {activeSection === "B" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>HR team size <span className="text-destructive">*</span></Label>
                <Input
                  type="number" min={0} max={9999}
                  placeholder="e.g. 45"
                  value={getField("B", "hrTeamSize") ?? ""}
                  onChange={e => updateSection("B", "hrTeamSize", parseInt(e.target.value, 10) || 0)}
                  aria-invalid={!!fieldErr("B", getField("B", "hrTeamSize") === undefined || getField("B", "hrTeamSize") === null || getField("B", "hrTeamSize") === "")}
                />
                {fieldErr("B", getField("B", "hrTeamSize") === undefined || getField("B", "hrTeamSize") === null || getField("B", "hrTeamSize") === "") && <p className="text-destructive text-xs mt-1">Please enter HR team size (0 is valid)</p>}
                {hrSizeWarning && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />{hrSizeWarning}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>HR sub-functions present</Label>
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
                <Label>HR reports to</Label>
                <Select
                  value={getField("B", "reportsTo") ?? ""}
                  onValueChange={v => updateSection("B", "reportsTo", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select reporting line" /></SelectTrigger>
                  <SelectContent>
                    {["CEO", "CHRO", "COO", "CFO", "Other"].map(r => (
                      <SelectItem key={r} value={r.toLowerCase()}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>HR budget ownership</Label>
                <Select
                  value={getField("B", "hrBudgetOwnership") ?? ""}
                  onValueChange={v => updateSection("B", "hrBudgetOwnership", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select budget ownership" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full — HR owns and controls the budget</SelectItem>
                    <SelectItem value="partial">Partial — HR shares budget authority</SelectItem>
                    <SelectItem value="none">None — budget held centrally or by Finance</SelectItem>
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
                  <SelectTrigger aria-invalid={!!fieldErr("C", !getField("C", "hrisSystem"))}><SelectValue placeholder="Select HRIS" /></SelectTrigger>
                  <SelectContent>
                    {HRIS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
                {fieldErr("C", !getField("C", "hrisSystem")) && <p className="text-destructive text-xs mt-1">Please select your HRIS</p>}
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

              <div className="space-y-2">
                <Label>Engagement survey tool</Label>
                <Select
                  value={getField("C", "engagementSurveyTool") ?? ""}
                  onValueChange={v => updateSection("C", "engagementSurveyTool", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select engagement survey tool" /></SelectTrigger>
                  <SelectContent>
                    {ENGAGEMENT_SURVEY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payroll system</Label>
                <Select
                  value={getField("C", "payrollSystem") ?? ""}
                  onValueChange={v => updateSection("C", "payrollSystem", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select payroll system" /></SelectTrigger>
                  <SelectContent>
                    {PAYROLL_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>HR data quality</Label>
                <Select
                  value={getField("C", "dataQualityRating") ?? ""}
                  onValueChange={v => updateSection("C", "dataQualityRating", v)}
                >
                  <SelectTrigger><SelectValue placeholder="How would you rate your HR data quality?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="poor">Poor — significant gaps, inconsistencies, or errors</SelectItem>
                    <SelectItem value="fair">Fair — usable but requires significant cleaning</SelectItem>
                    <SelectItem value="good">Good — mostly clean; minor gaps</SelectItem>
                    <SelectItem value="excellent">Excellent — well-governed, reliable, analytics-ready</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={getField("C", "hasDataWarehouse") ?? false}
                    onCheckedChange={v => updateSection("C", "hasDataWarehouse", v)}
                  />
                  <span className="text-sm font-medium">We have a data warehouse or people analytics platform</span>
                </label>
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

              <div className="space-y-2">
                <Label>Systems integration readiness</Label>
                <p className="text-xs text-muted-foreground">How well-connected are your HR systems? This affects which AI initiatives are feasible without infrastructure investment.</p>
                <Select
                  value={getField("C", "hrSystemIntegrationMaturity") ?? getField("C", "integrationReadiness") ?? ""}
                  onValueChange={v => updateSection("C", "hrSystemIntegrationMaturity", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select integration readiness" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="siloed">Siloed — systems don't talk to each other; manual data transfers</SelectItem>
                    <SelectItem value="partial">Partial — some integrations exist; significant gaps remain</SelectItem>
                    <SelectItem value="integrated">Integrated — most systems connected; some manual workarounds</SelectItem>
                    <SelectItem value="unified">Unified — single source of truth; real-time data flows</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Years of HRIS data</Label>
                <p className="text-xs text-muted-foreground">How long has your current HRIS been in use with consistent data?</p>
                <Select
                  value={(getField("C", "yearsOfHrisData") as string) ?? ""}
                  onValueChange={v => updateSection("C", "yearsOfHrisData", v)}
                >
                  <SelectTrigger aria-invalid={!!fieldErr("C", !getField("C", "yearsOfHrisData"))}><SelectValue placeholder="Select data history" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lt_1_year">Less than 1 year</SelectItem>
                    <SelectItem value="1_to_2_years">1 to 2 years</SelectItem>
                    <SelectItem value="2_to_5_years">2 to 5 years</SelectItem>
                    <SelectItem value="5_plus_years">5 or more years</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErr("C", !getField("C", "yearsOfHrisData")) && <p className="text-destructive text-xs mt-1">Please select years of HRIS data</p>}
              </div>

              <div className="space-y-2">
                <Label>Workforce digital access</Label>
                <p className="text-xs text-muted-foreground">What proportion of your workforce has regular access to a laptop or desktop?</p>
                <Select
                  value={(getField("C", "workforceDigitalAccess") as string) ?? ""}
                  onValueChange={v => updateSection("C", "workforceDigitalAccess", v)}
                >
                  <SelectTrigger aria-invalid={!!fieldErr("C", !getField("C", "workforceDigitalAccess"))}><SelectValue placeholder="Select access level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_laptops">All employees have laptops / desktops</SelectItem>
                    <SelectItem value="mixed_access">Mixed — most office staff do, frontline don't</SelectItem>
                    <SelectItem value="frontline_mobile">Frontline mobile-only — smartphones or tablets</SelectItem>
                    <SelectItem value="limited">Limited — significant portion have no digital access</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErr("C", !getField("C", "workforceDigitalAccess")) && <p className="text-destructive text-xs mt-1">Please select workforce digital access level</p>}
              </div>
            </div>
          )}

          {/* ── Section D ─────────────────────────────────────────────────── */}
          {activeSection === "D" && (
            <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                Estimates are fine — tick the flag and downstream figures will be clearly labelled as estimates.
              </p>

              {/* Sub-group: Hiring metrics */}
              <div className="pt-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 mb-3">Hiring metrics</p>
              </div>

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
                      aria-invalid={!!fieldErr("D", getField("D", "annualHiresLow") === undefined || getField("D", "annualHiresLow") === null || getField("D", "annualHiresLow") === "")}
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
                {fieldErr("D", getField("D", "annualHiresLow") === undefined || getField("D", "annualHiresLow") === null || getField("D", "annualHiresLow") === "") && <p className="text-destructive text-xs mt-1">Please enter annual hires low estimate (0 is valid)</p>}
              </div>

              {/* Admin time per hire */}
              <div className="space-y-2">
                <Label>Admin time per hire (hours)</Label>
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

              {/* Top 3 HR time sinks */}
              <div className="space-y-3">
                <Label>Top 3 most time-consuming HR activities</Label>
                <p className="text-xs text-muted-foreground">Where does your team spend the most time today?</p>
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <Input
                      placeholder={`Activity ${i + 1}`}
                      value={((getField("D", "topHrTimePlaces") ?? []) as string[])[i] ?? ""}
                      onChange={e => {
                        const pts = [...((getField("D", "topHrTimePlaces") ?? ["", "", ""]) as string[])];
                        pts[i] = e.target.value;
                        updateSection("D", "topHrTimePlaces", pts);
                      }}
                      maxLength={100}
                    />
                  </div>
                ))}
              </div>

              {/* Sub-group: Budget & scale */}
              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 mb-3">Budget &amp; scale</p>
              </div>

              {/* Total HR budget */}
              <div className="space-y-2">
                <Label>Total HR budget (£)</Label>
                <Input
                  type="number" min={0}
                  placeholder="e.g. 4500000"
                  value={getField("D", "hrBudgetGbp") ?? ""}
                  onChange={e => updateSection("D", "hrBudgetGbp", parseFloat(e.target.value) || 0)}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={!!(getField("D", "hrBudgetIsEstimate"))}
                    onCheckedChange={v => updateSection("D", "hrBudgetIsEstimate", v)}
                  />
                  This is an estimate
                </label>
              </div>

              {/* Loaded cost per HR FTE */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Loaded cost per HR FTE (£)</Label>
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
                {getField("B", "hrTeamSize") && getField("D", "hrBudgetGbp") && (
                  <p className="text-xs text-muted-foreground">
                    Suggested: £{Math.round((getField("D", "hrBudgetGbp") as number) / (getField("B", "hrTeamSize") as number)).toLocaleString()} (HR budget ÷ team size)
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
                <Label>Budget envelope for HR AI</Label>
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

              {/* Sub-group: HR operations */}
              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 mb-3">HR operations</p>
              </div>

              {/* Voluntary attrition */}
              <div className="space-y-2">
                <Label>Voluntary attrition rate (%)</Label>
                <Input
                  type="number" min={0} max={100} step={0.5}
                  placeholder="e.g. 14"
                  value={getField("D", "voluntaryAttritionPct") ?? ""}
                  onChange={e => updateSection("D", "voluntaryAttritionPct", parseFloat(e.target.value) || 0)}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={getField("D", "attritionIsEstimate") ?? false}
                    onCheckedChange={v => updateSection("D", "attritionIsEstimate", v)}
                  />
                  This is an estimate
                </label>
              </div>

              {/* Time to fill */}
              <div className="space-y-2">
                <Label>Average time to fill (days)</Label>
                <Input
                  type="number" min={0}
                  placeholder="e.g. 42"
                  value={getField("D", "timeToFillDays") ?? ""}
                  onChange={e => updateSection("D", "timeToFillDays", parseFloat(e.target.value) || 0)}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={getField("D", "timeToFillIsEstimate") ?? false}
                    onCheckedChange={v => updateSection("D", "timeToFillIsEstimate", v)}
                  />
                  This is an estimate
                </label>
              </div>

              {/* Annual application volume */}
              <div className="space-y-2">
                <Label>Annual application volume</Label>
                <p className="text-xs text-muted-foreground">Total applications received per year across all roles</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Low estimate</Label>
                    <Input
                      type="number" min={0}
                      placeholder="e.g. 5000"
                      value={getField("D", "annualApplicationVolumeLow") ?? ""}
                      onChange={e => updateSection("D", "annualApplicationVolumeLow", e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      aria-invalid={!!fieldErr("D", getField("D", "annualApplicationVolumeLow") === undefined || getField("D", "annualApplicationVolumeLow") === null || getField("D", "annualApplicationVolumeLow") === "")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">High estimate</Label>
                    <Input
                      type="number" min={0}
                      placeholder="e.g. 12000"
                      value={getField("D", "annualApplicationVolumeHigh") ?? ""}
                      onChange={e => updateSection("D", "annualApplicationVolumeHigh", e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={!!(getField("D", "annualApplicationVolumeIsEstimate"))}
                    onCheckedChange={v => updateSection("D", "annualApplicationVolumeIsEstimate", !!v)}
                  />
                  This is an estimate
                </label>
                {fieldErr("D", getField("D", "annualApplicationVolumeLow") === undefined || getField("D", "annualApplicationVolumeLow") === null || getField("D", "annualApplicationVolumeLow") === "") && <p className="text-destructive text-xs mt-1">Please enter annual application volume low estimate (0 is valid)</p>}
              </div>

              {/* Cost per external hire */}
              <div className="space-y-2">
                <Label>Cost per external hire (£)</Label>
                <p className="text-xs text-muted-foreground">All-in cost including agency fees, job boards, and recruiter time</p>
                <Input
                  type="number" min={0}
                  placeholder="e.g. 8500"
                  value={getField("D", "costPerExternalHire") ?? ""}
                  onChange={e => updateSection("D", "costPerExternalHire", e.target.value ? parseFloat(e.target.value) : undefined)}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={!!(getField("D", "costPerExternalHireIsEstimate"))}
                    onCheckedChange={v => updateSection("D", "costPerExternalHireIsEstimate", !!v)}
                  />
                  This is an estimate
                </label>
              </div>

              {/* Monthly HR query volume */}
              <div className="space-y-2">
                <Label>Monthly HR query volume</Label>
                <p className="text-xs text-muted-foreground">Employee queries, helpdesk tickets, or HR case volume per month</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Low estimate</Label>
                    <Input
                      type="number" min={0}
                      placeholder="e.g. 200"
                      value={getField("D", "monthlyHrQueryVolumeLow") ?? ""}
                      onChange={e => updateSection("D", "monthlyHrQueryVolumeLow", e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      aria-invalid={!!fieldErr("D", getField("D", "monthlyHrQueryVolumeLow") === undefined || getField("D", "monthlyHrQueryVolumeLow") === null || getField("D", "monthlyHrQueryVolumeLow") === "")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">High estimate</Label>
                    <Input
                      type="number" min={0}
                      placeholder="e.g. 500"
                      value={getField("D", "monthlyHrQueryVolumeHigh") ?? ""}
                      onChange={e => updateSection("D", "monthlyHrQueryVolumeHigh", e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={!!(getField("D", "monthlyHrQueryVolumeIsEstimate"))}
                    onCheckedChange={v => updateSection("D", "monthlyHrQueryVolumeIsEstimate", !!v)}
                  />
                  This is an estimate
                </label>
                {fieldErr("D", getField("D", "monthlyHrQueryVolumeLow") === undefined || getField("D", "monthlyHrQueryVolumeLow") === null || getField("D", "monthlyHrQueryVolumeLow") === "") && <p className="text-destructive text-xs mt-1">Please enter monthly HR query volume low estimate (0 is valid)</p>}
              </div>

              {/* Annual L&D spend */}
              <div className="space-y-2">
                <Label>Annual L&amp;D spend (£)</Label>
                <p className="text-xs text-muted-foreground">Total learning &amp; development budget including external training, platforms, and content</p>
                <Input
                  type="number" min={0}
                  placeholder="e.g. 750000"
                  value={getField("D", "annualLDSpend") ?? ""}
                  onChange={e => updateSection("D", "annualLDSpend", e.target.value ? parseFloat(e.target.value) : undefined)}
                  aria-invalid={!!fieldErr("D", !getField("D", "annualLDSpend"))}
                />
                {fieldErr("D", !getField("D", "annualLDSpend")) && <p className="text-destructive text-xs mt-1">Please enter annual L&D spend (0 is valid)</p>}
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={!!(getField("D", "annualLDSpendIsEstimate"))}
                    onCheckedChange={v => updateSection("D", "annualLDSpendIsEstimate", !!v)}
                  />
                  This is an estimate
                </label>
              </div>

              {/* Annual revenue */}
              <div className="space-y-2">
                <Label>Annual revenue (£)</Label>
                <p className="text-xs text-muted-foreground">Used to size workforce productivity and revenue-per-head impact estimates</p>
                <Input
                  type="number" min={0}
                  placeholder="e.g. 250000000"
                  value={getField("D", "annualRevenue") ?? ""}
                  onChange={e => updateSection("D", "annualRevenue", e.target.value ? parseFloat(e.target.value) : undefined)}
                  aria-invalid={!!fieldErr("D", !getField("D", "annualRevenue"))}
                />
                {fieldErr("D", !getField("D", "annualRevenue")) && <p className="text-destructive text-xs mt-1">Please enter annual revenue</p>}
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={!!(getField("D", "annualRevenueIsEstimate"))}
                    onCheckedChange={v => updateSection("D", "annualRevenueIsEstimate", !!v)}
                  />
                  This is an estimate
                </label>
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
                  <SelectTrigger aria-invalid={!!fieldErr("E", !getField("E", "ambitionTier"))}><SelectValue placeholder="Select ambition tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative — cautious, compliance-first</SelectItem>
                    <SelectItem value="pragmatic">Pragmatic — selective, ROI-focused</SelectItem>
                    <SelectItem value="innovator">Innovator — proactive, competitive advantage</SelectItem>
                    <SelectItem value="transformative">Transformative — all-in, AI-native ambition</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErr("E", !getField("E", "ambitionTier")) && <p className="text-destructive text-xs mt-1">Please select an ambition tier</p>}
              </div>

              <div className="space-y-2">
                <Label>HR AI posture <span className="text-destructive">*</span></Label>
                <Select
                  value={getField("E", "hrPosture") ?? ""}
                  onValueChange={v => updateSection("E", "hrPosture", v)}
                >
                  <SelectTrigger aria-invalid={!!fieldErr("E", !getField("E", "hrPosture"))}><SelectValue placeholder="Select HR posture" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="following">Following — HR adopts after the business</SelectItem>
                    <SelectItem value="pacing">Pacing — HR keeps pace with the business</SelectItem>
                    <SelectItem value="leading">Leading — HR leads AI adoption for the business</SelectItem>
                    <SelectItem value="transformative">Transformative — HR co-creates the AI strategy</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErr("E", !getField("E", "hrPosture")) && <p className="text-destructive text-xs mt-1">Please select HR AI posture</p>}
              </div>

              <div className="space-y-2">
                <Label>Time horizon <span className="text-destructive">*</span></Label>
                <Select
                  value={String(getField("E", "timeHorizonMonths") ?? "")}
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
                  <SelectTrigger aria-invalid={!!fieldErr("E", !getField("E", "riskAppetite"))}><SelectValue placeholder="Select risk appetite" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative — avoid risk, prioritise stability</SelectItem>
                    <SelectItem value="balanced">Balanced — accept measured risk for clear upside</SelectItem>
                    <SelectItem value="aggressive">Aggressive — accept significant risk for competitive advantage</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErr("E", !getField("E", "riskAppetite")) && <p className="text-destructive text-xs mt-1">Please select risk appetite</p>}
              </div>

              <div className="space-y-2">
                <Label>Success narrative</Label>
                <p className="text-xs text-muted-foreground italic">
                  "Imagine it's {getField("E", "timeHorizonMonths") ? `${getField("E", "timeHorizonMonths")} months` : "[horizon]"} from now and someone asks how your strategy went — what do you want to be able to say?"
                </p>
                <div className="relative">
                  <Textarea
                    placeholder="Type a few keywords… then click ✨ AI to generate a full narrative"
                    value={getField("E", "successNarrative") ?? ""}
                    onChange={e => {
                      updateSection("E", "successNarrative", e.target.value);
                      setAiDrafted(prev => ({ ...prev, successNarrative: false }));
                    }}
                    maxLength={1000}
                    className="min-h-[7rem] pr-24"
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-1">
                    {aiPrevValues["successNarrative"] !== undefined && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground transition-all duration-150 hover:scale-105 active:scale-95"
                        onClick={() => undoAiDraft("successNarrative", "successNarrative")}
                        type="button"
                        title="Undo AI generation"
                      >
                        <Undo2 className="w-3 h-3" />
                        Undo
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={aiDrafted["successNarrative"] ? "outline" : "default"}
                      className="h-7 px-2.5 text-xs gap-1 transition-all duration-150 hover:scale-105 hover:brightness-110 active:scale-95"
                      disabled={aiPending["successNarrative"]}
                      onClick={() => runAiDraft("successNarrative", "successNarrative")}
                      type="button"
                    >
                      {aiPending["successNarrative"]
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Sparkles className="w-3 h-3" />}
                      {aiDrafted["successNarrative"] ? "Regen" : "AI"}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  {(getField("E", "successNarrative") as string ?? "").length}/1000
                </p>
              </div>

              <div className="space-y-3">
                <Label>Top 3 pain points</Label>
                <p className="text-xs text-muted-foreground">What's slowing HR down most right now? Type a few words into each field, then click the <span className="inline-flex items-center gap-0.5 font-medium text-primary">✨ AI</span> button to generate a full sentence.</p>
                {[0, 1, 2].map(i => {
                  const ppKey = `painPoint_${i}`;
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground w-4 pt-2 flex-shrink-0">{i + 1}.</span>
                      <div className="relative flex-1 min-w-0">
                        <Textarea
                          placeholder={`Type a few words… e.g. "manual admin, no time for strategy"`}
                          value={((getField("E", "topPainPoints") ?? []) as string[])[i] ?? ""}
                          onChange={e => {
                            const pts = [...((getField("E", "topPainPoints") ?? ["", "", ""]) as string[])];
                            pts[i] = e.target.value;
                            updateSection("E", "topPainPoints", pts);
                            setAiDrafted(prev => ({ ...prev, [ppKey]: false }));
                          }}
                          maxLength={200}
                          className="text-sm leading-snug min-h-[2.5rem] pr-20"
                        />
                        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                          {aiPrevValues[ppKey] !== undefined && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5 text-xs gap-1 text-muted-foreground hover:text-foreground transition-all duration-150 hover:scale-105 active:scale-95"
                              onClick={() => undoAiDraft(ppKey, "painPoint", i)}
                              type="button"
                              title="Undo AI generation"
                            >
                              <Undo2 className="w-3 h-3" />
                              Undo
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={aiDrafted[ppKey] ? "outline" : "default"}
                            className="h-6 px-2 text-xs gap-1 transition-all duration-150 hover:scale-105 hover:brightness-110 active:scale-95"
                            disabled={aiPending[ppKey]}
                            onClick={() => runAiDraft(ppKey, "painPoint", i)}
                            type="button"
                          >
                            {aiPending[ppKey]
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Sparkles className="w-3 h-3" />}
                            {aiDrafted[ppKey] ? "Regen" : "AI"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <Label>Strategic priorities</Label>
                <p className="text-xs text-muted-foreground">Up to 5 strategic priorities for HR AI (optional). Type a few words into each field, then click the <span className="inline-flex items-center gap-0.5 font-medium text-primary">✨ AI</span> button to generate a full sentence.</p>
                {[0, 1, 2, 3, 4].map(i => {
                  const spKey = `strategicPriority_${i}`;
                  const spArr = ((getField("E", "strategicPriorities") ?? []) as string[]);
                  const spArrFull = [0,1,2,3,4].map(j => spArr[j] ?? "");
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground w-4 pt-2 flex-shrink-0">{i + 1}.</span>
                      <div className="relative flex-1 min-w-0">
                        <Textarea
                          placeholder={`Type a few words… e.g. "automate screening, reduce time-to-hire"`}
                          value={spArrFull[i]}
                          onChange={e => {
                            const pts = [...spArrFull];
                            pts[i] = e.target.value;
                            updateSection("E", "strategicPriorities", pts.filter(Boolean));
                            setAiDrafted(prev => ({ ...prev, [spKey]: false }));
                          }}
                          maxLength={200}
                          className="text-sm leading-snug min-h-[2.5rem] pr-20"
                        />
                        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                          {aiPrevValues[spKey] !== undefined && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5 text-xs gap-1 text-muted-foreground hover:text-foreground transition-all duration-150 hover:scale-105 active:scale-95"
                              onClick={() => undoAiDraft(spKey, "strategicPriority", i)}
                              type="button"
                              title="Undo AI generation"
                            >
                              <Undo2 className="w-3 h-3" />
                              Undo
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={aiDrafted[spKey] ? "outline" : "default"}
                            className="h-6 px-2 text-xs gap-1 transition-all duration-150 hover:scale-105 hover:brightness-110 active:scale-95"
                            disabled={aiPending[spKey]}
                            onClick={() => runAiDraft(spKey, "strategicPriority", i)}
                            type="button"
                          >
                            {aiPending[spKey]
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Sparkles className="w-3 h-3" />}
                            {aiDrafted[spKey] ? "Regen" : "AI"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Section F ─────────────────────────────────────────────────── */}
          {activeSection === "F" && (
            <div className="space-y-6">
              {/* Culture descriptors — tag chip input */}
              <div className="space-y-3">
                <div>
                  <Label>Culture descriptors</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Up to 3 words that honestly describe HR culture today. Press <kbd className="px-1 py-0.5 rounded text-[10px] bg-muted border border-border">Enter</kbd> or comma to add.</p>
                </div>
                {/* Chip display + input */}
                <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-muted/30 min-h-[3rem] items-center">
                  {((getField("F", "cultureDescriptors") ?? []) as string[]).filter(Boolean).map((tag, i) => {
                    const chipKey = `cultureDescriptors:${tag}`;
                    return (
                      <span
                        key={tag}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/30",
                          chipEntering.has(chipKey) && "tag-chip-enter",
                          chipExiting.has(chipKey) && "tag-chip-exit"
                        )}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeChipAnimated("cultureDescriptors", i, tag)}
                          className="ml-0.5 hover:text-destructive transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {((getField("F", "cultureDescriptors") ?? []) as string[]).filter(Boolean).length < 3 && (
                    <input
                      type="text"
                      placeholder="Type a word…"
                      maxLength={30}
                      className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim().replace(/,/g, "");
                          if (!val) return;
                          addChipAnimated("cultureDescriptors", val);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                  )}
                </div>
                {/* Suggestion chips */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground self-center mr-1">Suggestions:</span>
                  {["Innovative", "Cautious", "Collaborative", "Fast-moving", "Risk-averse", "People-first", "Data-driven", "Hierarchical", "Agile"].map(s => {
                    const current = ((getField("F", "cultureDescriptors") ?? []) as string[]).filter(Boolean);
                    const alreadyAdded = current.includes(s);
                    const atMax = current.length >= 3;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={alreadyAdded || atMax}
                        onClick={() => addChipAnimated("cultureDescriptors", s)}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs border transition-all duration-150",
                          alreadyAdded
                            ? "border-primary/40 text-primary/40 cursor-default"
                            : atMax
                            ? "border-border text-muted-foreground/40 cursor-not-allowed"
                            : "border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 cursor-pointer"
                        )}
                      >
                        {alreadyAdded ? "✓ " : "+ "}{s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Non-negotiables — tag chip input (same pattern as culture descriptors) */}
              <div className="space-y-3">
                <div>
                  <Label>Non-negotiables</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Things you would never compromise on, even under pressure (up to 3). Press <kbd className="px-1 py-0.5 rounded text-[10px] bg-muted border border-border">Enter</kbd> or comma to add.</p>
                </div>
                {/* Chip display + input */}
                <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-muted/30 min-h-[3rem] items-center">
                  {((getField("F", "nonNegotiables") ?? []) as string[]).filter(Boolean).map((tag, i) => {
                    const chipKey = `nonNegotiables:${tag}`;
                    return (
                      <span
                        key={tag}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30",
                          chipEntering.has(chipKey) && "tag-chip-enter",
                          chipExiting.has(chipKey) && "tag-chip-exit"
                        )}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeChipAnimated("nonNegotiables", i, tag)}
                          className="ml-0.5 hover:text-destructive transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {((getField("F", "nonNegotiables") ?? []) as string[]).filter(Boolean).length < 3 && (
                    <input
                      type="text"
                      placeholder="Type a principle…"
                      maxLength={80}
                      className="flex-1 min-w-[160px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim().replace(/,/g, "");
                          if (!val) return;
                          addChipAnimated("nonNegotiables", val);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                  )}
                </div>
                {/* Suggestion chips */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground self-center mr-1">Suggestions:</span>
                  {["Employee data privacy", "No surveillance AI", "Human in the loop", "Ethical AI only", "Transparency with employees", "No bias in hiring AI", "Manager accountability", "Union consultation"].map(s => {
                    const current = ((getField("F", "nonNegotiables") ?? []) as string[]).filter(Boolean);
                    const alreadyAdded = current.includes(s);
                    const atMax = current.length >= 3;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={alreadyAdded || atMax}
                        onClick={() => addChipAnimated("nonNegotiables", s)}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs border transition-all duration-150",
                          alreadyAdded
                            ? "border-amber-500/40 text-amber-500/40 cursor-default"
                            : atMax
                            ? "border-border text-muted-foreground/40 cursor-not-allowed"
                            : "border-border text-muted-foreground hover:border-amber-500/60 hover:text-amber-400 hover:bg-amber-500/5 cursor-pointer"
                        )}
                      >
                        {alreadyAdded ? "✓ " : "+ "}{s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Change readiness</Label>
                <Select
                  value={getField("F", "changeReadiness") ?? ""}
                  onValueChange={v => updateSection("F", "changeReadiness", v)}
                >
                  <SelectTrigger><SelectValue placeholder="How ready is the organisation for change?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resistant">Resistant — significant change fatigue or scepticism</SelectItem>
                    <SelectItem value="cautious">Cautious — open to change but needs careful management</SelectItem>
                    <SelectItem value="ready">Ready — generally open and capable of change</SelectItem>
                    <SelectItem value="energised">Energised — actively seeking transformation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Decision-making style</Label>
                <Select
                  value={getField("F", "decisionMakingStyle") ?? ""}
                  onValueChange={v => updateSection("F", "decisionMakingStyle", v)}
                >
                  <SelectTrigger><SelectValue placeholder="How does this organisation make decisions?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top_down">Top-down — decisions made centrally and cascaded</SelectItem>
                    <SelectItem value="consensus">Consensus — broad buy-in required before moving</SelectItem>
                    <SelectItem value="data_driven">Data-driven — evidence required before decisions</SelectItem>
                    <SelectItem value="experimental">Experimental — test and learn, move fast</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>CEO style</Label>
                <Select
                  value={getField("F", "ceoStyle") ?? ""}
                  onValueChange={v => updateSection("F", "ceoStyle", v)}
                >
                  <SelectTrigger><SelectValue placeholder="How would you describe the CEO's style?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visionary">Visionary — big picture, long-term thinker</SelectItem>
                    <SelectItem value="operator">Operator — execution-focused, metrics-driven</SelectItem>
                    <SelectItem value="relationship">Relationship-builder — people-first, consensus-seeker</SelectItem>
                    <SelectItem value="challenger">Challenger — pushes hard, high expectations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>CFO style</Label>
                <Select
                  value={getField("F", "cfoStyle") ?? ""}
                  onValueChange={v => updateSection("F", "cfoStyle", v)}
                >
                  <SelectTrigger><SelectValue placeholder="How would you describe the CFO's style?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strategic">Strategic — sees investment as growth enabler</SelectItem>
                    <SelectItem value="conservative">Conservative — cautious, ROI-first</SelectItem>
                    <SelectItem value="analytical">Analytical — data-heavy, wants detailed business cases</SelectItem>
                    <SelectItem value="pragmatic">Pragmatic — flexible if the numbers stack up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ── Section G ─────────────────────────────────────────────────── */}
          {activeSection === "G" && (
            <div className="space-y-5">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-xs text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">How to use these ratings</p>
                <p>This is a self-assessment of your HR function's AI capability — not the platform's adaptive assessment. Score each domain 0–10 using the calibration questions as a guide. Capture your rationale so the strategy draft reflects your honest starting point.</p>
              </div>

              {CAPABILITY_DOMAINS.map(domain => {
                const rating = capDomains[domain.key] ?? { score: 0 };
                const isExpanded = expandedCalibration === domain.key;
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
                          <span className="text-center font-medium">{getMaturityLabel(rating.score ?? 0)}</span>
                          <span>10 — Advanced</span>
                        </div>
                      </div>

                      {/* Calibration prompt toggle */}
                      <button
                        className="w-full text-left text-xs text-primary hover:underline flex items-center gap-1"
                        onClick={() => setExpandedCalibration(isExpanded ? null : domain.key)}
                      >
                        <Info className="w-3 h-3" />
                        {isExpanded ? "Hide calibration guide" : "Show calibration guide"}
                      </button>

                      {isExpanded && (
                        <div className="rounded-lg bg-muted/40 border p-3 space-y-2 text-xs">
                          <p className="font-medium text-foreground">Calibration question</p>
                          <p className="text-muted-foreground italic">"{domain.calibrationPrompt}"</p>
                          <Separator className="my-1" />
                          <div className="space-y-1">
                            <p className="text-muted-foreground">{domain.anchorLow}</p>
                            <p className="text-muted-foreground">{domain.anchorMid}</p>
                            <p className="text-muted-foreground">{domain.anchorHigh}</p>
                          </div>
                        </div>
                      )}

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

              {/* Section G mandatory error: at least 3 domains must be rated (score > 0) */}
              {fieldErr("G", Object.values(capDomains).filter(d => (d.score ?? 0) > 0).length < 3) && (
                <p className="text-destructive text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Please rate at least 3 capability domains before continuing
                </p>
              )}

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
                <div>
                  <Label>Who needs to approve</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Select all that apply</p>
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
                <Label>Their AI literacy</Label>
                <Select
                  value={getField("H", "aiLiteracyLevel") ?? ""}
                  onValueChange={v => updateSection("H", "aiLiteracyLevel", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select literacy level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High — actively use AI, understand capabilities</SelectItem>
                    <SelectItem value="moderate">Moderate — aware but limited hands-on experience</SelectItem>
                    <SelectItem value="mixed">Mixed — varies significantly across stakeholders</SelectItem>
                    <SelectItem value="low">Low — limited awareness, may be sceptical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>What language resonates with them</Label>
                <p className="text-xs text-muted-foreground">Select all that apply</p>
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
                <Label>Board AI interest</Label>
                <Select
                  value={getField("H", "boardAiInterest") ?? ""}
                  onValueChange={v => updateSection("H", "boardAiInterest", v)}
                >
                  <SelectTrigger><SelectValue placeholder="How interested is the board in AI?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None — not on the board agenda</SelectItem>
                    <SelectItem value="low">Low — occasional mention, no formal interest</SelectItem>
                    <SelectItem value="moderate">Moderate — on the agenda, some questions asked</SelectItem>
                    <SelectItem value="high">High — board actively asking for AI strategy</SelectItem>
                  </SelectContent>
                </Select>
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

          {/* ── Section I ─────────────────────────────────────────────────── */}
          {activeSection === "I" && (
            <div className="space-y-5">
              <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 text-xs text-violet-700 dark:text-violet-300">
                This section grounds your HR AI strategy in the broader business context. The more specific you are, the more relevant your strategy drafts will be.
              </div>

              <div className="space-y-2">
                <Label>Where is the business heading in the next 2–3 years? <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground">Key strategic moves, growth plans, transformation programmes, M&A activity</p>
                <Textarea
                  placeholder="e.g. We're expanding into three new markets, integrating a recent acquisition, and moving from a product to a platform model…"
                  rows={5}
                  value={(getFieldI("businessDirection") as string) ?? ""}
                  onChange={e => updateSectionI("businessDirection", e.target.value)}
                  maxLength={1000}
                  className="resize-none"
                  aria-invalid={!!fieldErr("I", !((getFieldI("businessDirection") as string) ?? "").trim())}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {((getFieldI("businessDirection") as string) ?? "").length}/1000
                </p>
                {fieldErr("I", !((getFieldI("businessDirection") as string) ?? "").trim()) && <p className="text-destructive text-xs mt-1">Please describe where the business is heading</p>}
              </div>

              <div className="space-y-3">
                <Label>Top business priorities (up to 5)</Label>
                <p className="text-xs text-muted-foreground">What is the business most focused on achieving this year?</p>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <Input
                      placeholder={`Business priority ${i + 1}`}
                      value={((getFieldI("topBusinessPriorities") as string[] ?? []))[i] ?? ""}
                      onChange={e => {
                        const pts = [...((getFieldI("topBusinessPriorities") as string[] ?? ["", "", "", "", ""]))];
                        pts[i] = e.target.value;
                        updateSectionI("topBusinessPriorities", pts.filter(Boolean));
                      }}
                      maxLength={200}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Primary work type</Label>
                <Select
                  value={(getFieldI("workforceWorkType") as string) ?? ""}
                  onValueChange={v => updateSectionI("workforceWorkType", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select work type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fully_remote">Fully remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid (mix of remote and on-site)</SelectItem>
                    <SelectItem value="mostly_onsite">Mostly on-site</SelectItem>
                    <SelectItem value="fully_onsite">Fully on-site / deskless</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Employment mix</Label>
                <Select
                  value={(getFieldI("workforceEmploymentMix") as string) ?? ""}
                  onValueChange={v => updateSectionI("workforceEmploymentMix", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select employment mix" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mostly_permanent">Mostly permanent employees</SelectItem>
                    <SelectItem value="significant_contingent">Significant contingent / contractor workforce</SelectItem>
                    <SelectItem value="majority_contingent">Majority contingent / gig workers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Geographic distribution</Label>
                <Select
                  value={(getFieldI("geographicDistribution") as string) ?? ""}
                  onValueChange={v => updateSectionI("geographicDistribution", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select geographic distribution" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_site">Single site</SelectItem>
                    <SelectItem value="multi_site_single_country">Multiple sites, single country</SelectItem>
                    <SelectItem value="multi_country">Multi-country</SelectItem>
                    <SelectItem value="global">Global (5+ countries)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Pivotal job families (up to 5)</Label>
                <p className="text-xs text-muted-foreground">Which job families are most critical to business success — and most at risk from AI disruption?</p>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <Input
                      placeholder={`e.g. Software engineers, Customer service agents…`}
                      value={((getFieldI("pivotalJobFamilies") as string[] ?? []))[i] ?? ""}
                      onChange={e => {
                        const pts = [...((getFieldI("pivotalJobFamilies") as string[] ?? ["", "", "", "", ""]))];
                        pts[i] = e.target.value;
                        updateSectionI("pivotalJobFamilies", pts.filter(Boolean));
                      }}
                      maxLength={100}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Label>Top 3 people / talent challenges <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground">What are the hardest people problems you're trying to solve?</p>
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <Input
                      placeholder={`Challenge ${i + 1}`}
                      value={((getFieldI("peopleChallenges") as string[] ?? []))[i] ?? ""}
                      onChange={e => {
                        const pts = [...((getFieldI("peopleChallenges") as string[] ?? ["", "", ""]))]
                        pts[i] = e.target.value;
                        updateSectionI("peopleChallenges", pts.filter(Boolean));
                      }}
                      maxLength={200}
                      aria-invalid={i === 0 && !!fieldErr("I", ((getFieldI("peopleChallenges") as string[] ?? [])).filter(Boolean).length === 0)}
                    />
                  </div>
                ))}
                {fieldErr("I", ((getFieldI("peopleChallenges") as string[] ?? [])).filter(Boolean).length === 0) && <p className="text-destructive text-xs mt-1">Please enter at least one people challenge</p>}
              </div>

              <div className="space-y-2">
                <Label>Current employee experience</Label>
                <p className="text-xs text-muted-foreground">How would you honestly describe the employee experience today?</p>
                <Textarea
                  placeholder="e.g. Engaged but frustrated by manual processes; strong culture but poor tooling…"
                  rows={4}
                  value={(getFieldI("employeeExperienceState") as string) ?? ""}
                  onChange={e => updateSectionI("employeeExperienceState", e.target.value)}
                  maxLength={500}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Manager capability for AI-led change</Label>
                <p className="text-xs text-muted-foreground">How capable are your people managers at leading AI-related change in their teams?</p>
                <Select
                  value={(getFieldI("managerCapabilityForAiChange") as string) ?? ""}
                  onValueChange={v => updateSectionI("managerCapabilityForAiChange", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select capability level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strong">Strong — most managers confident and capable</SelectItem>
                    <SelectItem value="mixed">Mixed — variable across the management population</SelectItem>
                    <SelectItem value="variable">Variable — a few strong, most uncertain</SelectItem>
                    <SelectItem value="weak">Weak — most managers not yet equipped</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Manager capability for data-led insights</Label>
                <p className="text-xs text-muted-foreground">How well do your people managers use data and analytics to lead their teams?</p>
                <Select
                  value={(getFieldI("managerCapabilityForInsights") as string) ?? ""}
                  onValueChange={v => updateSectionI("managerCapabilityForInsights", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select capability level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strong">Strong — most managers use data confidently</SelectItem>
                    <SelectItem value="mixed">Mixed — variable across the management population</SelectItem>
                    <SelectItem value="weak">Weak — most managers not yet data-led</SelectItem>
                    <SelectItem value="variable">Variable — a few strong, most uncertain</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Workforce composition</Label>
                <p className="text-xs text-muted-foreground">What best describes the mix of your workforce?</p>
                <Select
                  value={(getFieldI("workforceComposition") as string) ?? ""}
                  onValueChange={v => updateSectionI("workforceComposition", v)}
                >
                  <SelectTrigger aria-invalid={!!fieldErr("I", !getFieldI("workforceComposition"))}><SelectValue placeholder="Select composition" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="knowledge_heavy">Primarily office / knowledge workers</SelectItem>
                    <SelectItem value="frontline_heavy">Frontline / operational heavy</SelectItem>
                    <SelectItem value="mixed">Mixed — significant office and frontline</SelectItem>
                    <SelectItem value="unknown">Unknown / not yet assessed</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErr("I", !getFieldI("workforceComposition")) && <p className="text-destructive text-xs mt-1">Please select workforce composition</p>}
              </div>

              <div className="space-y-2">
                <Label>Business direction type</Label>
                <p className="text-xs text-muted-foreground">Which best describes where the business is heading?</p>
                <Select
                  value={(getFieldI("businessDirectionType") as string) ?? ""}
                  onValueChange={v => updateSectionI("businessDirectionType", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select direction" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transforming">Transforming — significant operating model change</SelectItem>
                    <SelectItem value="growing">Growing — headcount and revenue expanding</SelectItem>
                    <SelectItem value="optimising">Optimising — efficiency and cost focus</SelectItem>
                    <SelectItem value="defending">Defending — protecting market position</SelectItem>
                    <SelectItem value="mixed">Mixed — different parts of the business in different phases</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Skills framework maturity <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground">How developed is your organisation’s skills taxonomy and framework?</p>
                <Select
                  value={(getFieldI("skillsFrameworkStatus") as string) ?? ""}
                  onValueChange={v => updateSectionI("skillsFrameworkStatus", v)}
                >
                  <SelectTrigger aria-invalid={!!fieldErr("I", !getFieldI("skillsFrameworkStatus"))}><SelectValue placeholder="Select maturity level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal_taxonomy">Formal taxonomy — comprehensive, actively maintained</SelectItem>
                    <SelectItem value="informal_role_based">Informal / role-based — exists for some functions</SelectItem>
                    <SelectItem value="in_development">In development — early stage, limited coverage</SelectItem>
                    <SelectItem value="none">None — no skills framework in place</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErr("I", !getFieldI("skillsFrameworkStatus")) && <p className="text-destructive text-xs mt-1">Please select skills framework maturity</p>}
              </div>

              <div className="space-y-2">
                <Label>Skills inventory completeness</Label>
                <p className="text-xs text-muted-foreground">How complete is your current employee skills data?</p>
                <Select
                  value={(getFieldI("skillsInventoryCompleteness") as string) ?? ""}
                  onValueChange={v => updateSectionI("skillsInventoryCompleteness", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select completeness" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comprehensive">Comprehensive — most employees profiled</SelectItem>
                    <SelectItem value="partial">Partial — some employees or functions covered</SelectItem>
                    <SelectItem value="minimal">Minimal — very limited data</SelectItem>
                    <SelectItem value="none">None — no skills data captured</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Frontline headcount (%)</Label>
                <p className="text-xs text-muted-foreground">Approximate percentage of your workforce in frontline, deskless, or operational roles</p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    placeholder="e.g. 40"
                    value={(getFieldI("frontlineHeadcountPercent") as number) ?? ""}
                    onChange={e => updateSectionI("frontlineHeadcountPercent", e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="max-w-[120px]"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Section J ─────────────────────────────────────────────────── */}
          {activeSection === "J" && (
            <div className="space-y-5">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                These constraints and preferences shape which initiatives get prioritised and how the strategy is framed. Be honest — a strategy that ignores your real constraints isn't useful.
              </div>

              <div className="space-y-2">
                <Label>Annual budget ceiling for HR AI initiatives</Label>
                <p className="text-xs text-muted-foreground">Approximate total budget available across all HR AI initiatives in year one</p>
                <Select
                  value={(getFieldJ("budgetCeiling") as string) ?? ""}
                  onValueChange={v => updateSectionJ("budgetCeiling", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select budget range" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lt50k">Under £50k</SelectItem>
                    <SelectItem value="50k_150k">£50k – £150k</SelectItem>
                    <SelectItem value="150k_500k">£150k – £500k</SelectItem>
                    <SelectItem value="500k_1m">£500k – £1m</SelectItem>
                    <SelectItem value="gt1m">Over £1m</SelectItem>
                    <SelectItem value="unknown">Unknown / not yet agreed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Timeline constraint</Label>
                <p className="text-xs text-muted-foreground">When does the business expect to see meaningful results from HR AI investment?</p>
                <Select
                  value={(getFieldJ("timelineConstraint") as string) ?? ""}
                  onValueChange={v => updateSectionJ("timelineConstraint", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3_months">Within 3 months — quick wins only</SelectItem>
                    <SelectItem value="6_months">Within 6 months — early demonstrable value</SelectItem>
                    <SelectItem value="12_months">Within 12 months — meaningful capability built</SelectItem>
                    <SelectItem value="18_24_months">18–24 months — strategic transformation</SelectItem>
                    <SelectItem value="no_constraint">No hard constraint — quality over speed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vendor preferences or constraints</Label>
                <p className="text-xs text-muted-foreground">Any existing vendor relationships, preferred partners, or vendors to avoid?</p>
                <Textarea
                  placeholder="e.g. We have a strategic relationship with Microsoft so prefer Azure-native solutions. Avoid Workday add-ons due to contract issues…"
                  rows={3}
                  value={(getFieldJ("vendorPreferences") as string) ?? ""}
                  onChange={e => updateSectionJ("vendorPreferences", e.target.value)}
                  maxLength={500}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Risk tolerance for AI initiatives</Label>
                <Select
                  value={(getFieldJ("riskTolerance") as string) ?? ""}
                  onValueChange={v => updateSectionJ("riskTolerance", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select risk tolerance" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low — proven solutions only, no experiments</SelectItem>
                    <SelectItem value="moderate">Moderate — willing to pilot new approaches with guardrails</SelectItem>
                    <SelectItem value="high">High — comfortable with frontier AI and novel approaches</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quick wins preference</Label>
                <p className="text-xs text-muted-foreground">How important is it to demonstrate visible value quickly vs. building the right foundations?</p>
                <Select
                  value={(getFieldJ("quickWinsPreference") as string) ?? ""}
                  onValueChange={v => updateSectionJ("quickWinsPreference", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select preference" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="foundations_first">Foundations first — get the infrastructure right before visible wins</SelectItem>
                    <SelectItem value="balanced">Balanced — mix of quick wins and foundation building</SelectItem>
                    <SelectItem value="quick_wins_first">Quick wins first — need visible results to maintain momentum and funding</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Initiatives to exclude</Label>
                <p className="text-xs text-muted-foreground">Any areas that are off the table — politically, contractually, or strategically?</p>
                <Textarea
                  placeholder="e.g. No AI in recruitment decisions due to board sensitivity. No automation of L&D delivery — CEO is committed to human-led learning…"
                  rows={3}
                  value={(getFieldJ("excludedInitiatives") as string) ?? ""}
                  onChange={e => updateSectionJ("excludedInitiatives", e.target.value)}
                  maxLength={500}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Additional context for the strategy</Label>
                <p className="text-xs text-muted-foreground">Anything else that should shape the strategy that doesn't fit elsewhere?</p>
                <Textarea
                  placeholder="e.g. We're in a regulated industry with strict data residency requirements. Our CEO is personally championing AI and will sponsor the programme…"
                  rows={4}
                  value={(getFieldJ("additionalContext") as string) ?? ""}
                  onChange={e => updateSectionJ("additionalContext", e.target.value)}
                  maxLength={800}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* ── Section K ─────────────────────────────────────────────────── */}
          {activeSection === "K" && (
            <div className="space-y-5">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-xs text-amber-700 dark:text-amber-300">
                These operational patterns shape which AI initiatives will land well and which will face friction. They inform how the strategy is sequenced and framed.
              </div>

              <div className="space-y-2">
                <Label>Onboarding model</Label>
                <p className="text-xs text-muted-foreground">How are new hires currently onboarded?</p>
                <Select
                  value={(getFieldK("onboardingModel") as string) ?? ""}
                  onValueChange={v => updateSectionK("onboardingModel", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select onboarding model" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="structured_programme">Structured programme — formal, multi-week curriculum</SelectItem>
                    <SelectItem value="buddy_led">Buddy-led — peer-guided with light structure</SelectItem>
                    <SelectItem value="self_directed">Self-directed — resources available, minimal guidance</SelectItem>
                    <SelectItem value="minimal">Minimal — ad hoc, manager-dependent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Internal mobility approach</Label>
                <p className="text-xs text-muted-foreground">How do employees typically move internally?</p>
                <Select
                  value={(getFieldK("internalMobilityApproach") as string) ?? ""}
                  onValueChange={v => updateSectionK("internalMobilityApproach", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select mobility approach" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open_marketplace">Open marketplace — employees apply freely</SelectItem>
                    <SelectItem value="manager_nominated">Manager-nominated — moves require manager approval</SelectItem>
                    <SelectItem value="limited">Limited — few formal pathways exist</SelectItem>
                    <SelectItem value="none">None — internal moves are rare or informal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Performance review cadence <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground">How frequently are formal performance reviews conducted?</p>
                <Select
                  value={(getFieldK("performanceReviewCadence") as string) ?? ""}
                  onValueChange={v => updateSectionK("performanceReviewCadence", v)}
                >
                  <SelectTrigger aria-invalid={!!fieldErr("K", !getFieldK("performanceReviewCadence"))}><SelectValue placeholder="Select cadence" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="continuous">Continuous — ongoing check-ins, no formal cycle</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="bi_annual">Bi-annual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="light_touch">Light touch — minimal or inconsistent</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErr("K", !getFieldK("performanceReviewCadence")) && <p className="text-destructive text-xs mt-1">Please select performance review cadence</p>}
              </div>

              <div className="space-y-2">
                <Label>HR helpdesk model</Label>
                <p className="text-xs text-muted-foreground">How do employees currently get HR support?</p>
                <Select
                  value={(getFieldK("hrHelpdeskModel") as string) ?? ""}
                  onValueChange={v => updateSectionK("hrHelpdeskModel", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select helpdesk model" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shared_service_centre">Shared service centre — centralised team</SelectItem>
                    <SelectItem value="hrbp_direct">HRBP direct — employees go to their HRBP</SelectItem>
                    <SelectItem value="ticketing_system">Ticketing system — formal case management</SelectItem>
                    <SelectItem value="informal">Informal — ad hoc, no structured process</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Hiring process structure</Label>
                <p className="text-xs text-muted-foreground">How standardised is your hiring process across the organisation?</p>
                <Select
                  value={(getFieldK("hiringProcessStructure") as string) ?? ""}
                  onValueChange={v => updateSectionK("hiringProcessStructure", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select structure level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="highly_structured">Highly structured — consistent process, scoring, SLAs</SelectItem>
                    <SelectItem value="semi_structured">Semi-structured — framework exists but varies</SelectItem>
                    <SelectItem value="informal">Informal — manager-led, inconsistent</SelectItem>
                    <SelectItem value="varies_by_team">Varies by team — no central standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Hiring volume profile <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground">Which hiring segments are most significant? (select all that apply)</p>
                {[
                  { value: "executive_search", label: "Executive / senior leadership" },
                  { value: "experienced_hires", label: "Professional / experienced hires" },
                  { value: "graduate_apprentice", label: "Graduate / apprentice" },
                  { value: "frontline_operative", label: "Frontline / operative" },
                  { value: "seasonal_surge", label: "Seasonal surge / contingent" },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={((getFieldK("hiringVolumeProfile") as string[] ?? []).includes(opt.value))}
                      onChange={e => {
                        const current = (getFieldK("hiringVolumeProfile") as string[] ?? []);
                        const updated = e.target.checked
                          ? [...current, opt.value]
                          : current.filter((v: string) => v !== opt.value);
                        updateSectionK("hiringVolumeProfile", updated);
                      }}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
                {fieldErr("K", !(getFieldK("hiringVolumeProfile") as string[] ?? []).length) && <p className="text-destructive text-xs mt-1">Please select at least one hiring volume profile</p>}
              </div>

              <div className="space-y-2">
                <Label>L&amp;D delivery model</Label>
                <p className="text-xs text-muted-foreground">How is learning and development primarily delivered?</p>
                <Select
                  value={(getFieldK("lAndDDeliveryModel") as string) ?? ""}
                  onValueChange={v => updateSectionK("lAndDDeliveryModel", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select delivery model" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blended">Blended — mix of digital and in-person</SelectItem>
                    <SelectItem value="mostly_digital">Mostly digital — online-first</SelectItem>
                    <SelectItem value="mostly_classroom">Mostly classroom — in-person led</SelectItem>
                    <SelectItem value="on_the_job">On the job — informal, experiential</SelectItem>
                    <SelectItem value="minimal">Minimal — limited L&D investment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reward cycle model</Label>
                <p className="text-xs text-muted-foreground">How is compensation review structured?</p>
                <Select
                  value={(getFieldK("rewardCycleModel") as string) ?? ""}
                  onValueChange={v => updateSectionK("rewardCycleModel", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select reward cycle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual_cycle">Annual cycle — single review window</SelectItem>
                    <SelectItem value="biannual_cycle">Bi-annual cycle — two review windows</SelectItem>
                    <SelectItem value="continuous">Continuous — ongoing compensation adjustments</SelectItem>
                    <SelectItem value="project_based">Project-based — tied to milestones</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ── Reward-mode-specific pre-work fields ──────────────────── */}
              {isRewardMode && (
                <>
                  <div className="mt-4 p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 text-xs text-violet-700 dark:text-violet-300">
                    <strong>Reward Intelligence</strong> — These additional fields help tailor your Reward AI strategy to your compensation architecture and governance model.
                  </div>

                  <div className="space-y-2">
                    <Label>Pay band structure</Label>
                    <p className="text-xs text-muted-foreground">How are pay bands currently defined across the organisation?</p>
                    <Select
                      value={(getFieldK("payBandStructure") as string) ?? ""}
                      onValueChange={v => updateSectionK("payBandStructure", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select pay band structure" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="narrow_bands">Narrow bands — many grades, tight ranges</SelectItem>
                        <SelectItem value="broad_bands">Broad bands — few grades, wide ranges</SelectItem>
                        <SelectItem value="spot_rates">Spot rates — individual market pricing</SelectItem>
                        <SelectItem value="no_formal_structure">No formal structure — ad hoc pay decisions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Job architecture status</Label>
                    <p className="text-xs text-muted-foreground">What is the current state of your job architecture or grading framework?</p>
                    <Select
                      value={(getFieldK("jobArchitectureStatus") as string) ?? ""}
                      onValueChange={v => updateSectionK("jobArchitectureStatus", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select job architecture status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mature_consistent">Mature and consistent — applied across the org</SelectItem>
                        <SelectItem value="partial">Partial — some functions have it, others don’t</SelectItem>
                        <SelectItem value="in_progress">In progress — currently being built or refreshed</SelectItem>
                        <SelectItem value="none">None — no formal job architecture in place</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Total compensation philosophy</Label>
                    <p className="text-xs text-muted-foreground">What is your organisation’s stated approach to total compensation?</p>
                    <Select
                      value={(getFieldK("totalCompPhilosophy") as string) ?? ""}
                      onValueChange={v => updateSectionK("totalCompPhilosophy", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select comp philosophy" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="market_median">Market median — target 50th percentile</SelectItem>
                        <SelectItem value="market_leading">Market leading — target 75th percentile or above</SelectItem>
                        <SelectItem value="below_market">Below market — offset by non-cash benefits</SelectItem>
                        <SelectItem value="differentiated">Differentiated — varies by role family or level</SelectItem>
                        <SelectItem value="no_formal_philosophy">No formal philosophy — reactive / manager-driven</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Pay equity audit frequency</Label>
                    <p className="text-xs text-muted-foreground">How often does the organisation formally audit pay equity?</p>
                    <Select
                      value={(getFieldK("payEquityAuditFrequency") as string) ?? ""}
                      onValueChange={v => updateSectionK("payEquityAuditFrequency", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select audit frequency" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual — formal audit every year</SelectItem>
                        <SelectItem value="biannual">Bi-annual — every two years</SelectItem>
                        <SelectItem value="ad_hoc">Ad hoc — triggered by events or requests</SelectItem>
                        <SelectItem value="never">Never — no formal pay equity audit conducted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
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

            {/* Save as Draft button — centre of footer */}
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={draftSaveState === "saving" || saveDraftMut.isPending}
              onClick={handleSaveDraft}
            >
              {draftSaveState === "saving" ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Saving draft…</>
              ) : draftSaveState === "saved" ? (
                <><Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />Draft saved</>
              ) : (
                <><Save className="w-3.5 h-3.5 mr-1.5" />Save as draft{hasUnsavedChanges ? " ●" : ""}</>
              )}
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
                    if (!allMandatoryComplete) {
                      // Touch all mandatory sections to reveal all inline errors
                      setTouchedSections(new Set(["A", "B", "C", "D", "E", "G", "I"] as SectionId[]));
                      return;
                    }
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
              disabled={activeSection === "K"}
              onClick={() => {
                if (!currentSectionComplete) {
                  // Touch the section to reveal inline errors, but don't advance
                  touchSection(activeSection);
                  return;
                }
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

          {/* Pre-work complete — prominent success state with navigation CTA */}
          {preworkDone && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20 p-5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">
                    Great — everything is complete. Let's build your strategy.
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    {draftState === "generating" && "Preparing your initial strategy drafts in the background — this takes about 30 seconds."}
                    {draftState === "initial_draft" && "Your initial drafts are ready. Start with your vision statement."}
                    {(draftState === "none" || !draftState) && "Your data has been saved. Initial strategy drafts will be ready shortly."}
                    {draftState === "curated" && "Your strategy drafts have been curated and are ready to review."}
                  </p>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      onClick={() => navigate("/strategy/vision")}
                    >
                      {draftState === "generating" ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Preparing drafts…</>
                      ) : (
                        <>Start with your vision<ArrowRight className="w-4 h-4" /></>
                      )}
                    </Button>
                  </div>
                </div>
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
                Last saved: {serverFacilitatorNotes[activeSection].updatedAt
                  ? new Date(serverFacilitatorNotes[activeSection].updatedAt!).toLocaleTimeString()
                  : "recently"}
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
