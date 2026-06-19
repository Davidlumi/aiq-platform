/**
 * Assessment Session Page - AiQ Enterprise Platform (v2)
 *
 * Renders each of the 8 interaction types with a distinct visual treatment:
 *
 * 1. prompt_refinement     - refine a weak prompt into an effective one
 * 2. prioritisation         - scenario + constraint + ranked MCQ (coloured priority badge)
 * 3. agent_oversight       - evaluate and correct an AI agent's actions
 * 4. ethical_dilemma       - navigate ethical tensions in AI deployment
 * 5. scenario_critique      - scenario + AI OUTPUT block (evaluate this) + MCQ
 * 6. output_improvement     - scenario + AI OUTPUT block (improve this) + MCQ
 * 7. error_detection        - scenario + AI OUTPUT block (find the error) + MCQ
 * 8. data_interpretation    - scenario + DATA CONTEXT block + MCQ
 *
 * The nextItem from the server includes:
 * - title, scenario, constraint, question, interactionType
 * - aiOutput (for critique/improvement/error types)
 * - dataContext (for data_interpretation)
 * - options with label/value (scoring data stripped server-side)
 */

import { useState, useEffect, useRef, useCallback } from "react";
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
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AssessmentSessionSkeleton } from "@/components/ui/loading";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ExplanationDrawer, ScoreBreakdown } from "@/components/ExplanationDrawer";
import { toast } from "sonner";
import {
  ChevronRight,
  CheckCircle2,
  Award,
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  Briefcase,
  Target,
  ArrowLeft,
  Bot,
  BarChart3,
  Scale,
  Layers,
  Search,
  Sparkles,
  Loader2,
  FileText,
  Flag,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { scoreToColor, formatPeakonScore } from "@/lib/peakon-colors";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PostAssessmentInterstitial } from "@/components/PostAssessmentInterstitial";
import { useIsPro } from "@/hooks/useIsPro";

// --- Capability colours -------------------------------------------------------

// v10 domain colours - imported from shared constants
import { DOMAIN_COLOURS, DOMAIN_LABELS, INTERACTION_TYPE_META, INTERACTION_TYPE_DESCRIPTIONS, READINESS_STATES } from "@/lib/domains";
import type { CapabilityKey, InteractionType } from "@/lib/domains";

const CAPABILITY_COLOURS: Record<string, string> = DOMAIN_COLOURS;

// R-1: Display-label map for workflow/topic tags (prevents raw snake_case reaching the UI)
const WORKFLOW_LABELS: Record<string, string> = {
  // HR Generalist / HRBP
  employee_relations:       "Employee Relations",
  performance_management:   "Performance Management",
  organisational_design:    "Organisational Design",
  change_management:        "Change Management",
  workforce_planning:       "Workforce Planning",
  // HR Operations / Shared Services
  onboarding:               "Onboarding",
  policy_administration:    "Policy Administration",
  employee_queries:         "Employee Queries",
  absence_management:       "Absence Management",
  basic_er:                 "Basic ER",
  employee_support:         "Employee Support",
  // ER Specialist
  disciplinary_hearings:    "Disciplinary Hearings",
  grievance_management:     "Grievance Management",
  complex_er:               "Complex ER",
  policy_interpretation:    "Policy Interpretation",
  manager_coaching:         "Manager Coaching",
  // Talent Acquisition
  job_description_creation: "Job Description Creation",
  candidate_screening:      "Candidate Screening",
  interview_design:         "Interview Design",
  offer_management:         "Offer Management",
  sourcing:                 "Sourcing",
  // ER Case Manager
  investigation_management: "Investigation Management",
  disciplinary_process:     "Disciplinary Process",
  grievance_process:        "Grievance Process",
  tribunal_preparation:     "Tribunal Preparation",
  case_management:          "Case Management",
  // L&D Specialist
  content_creation:         "Content Creation",
  needs_analysis:           "Needs Analysis",
  programme_design:         "Programme Design",
  learning_evaluation:      "Learning Evaluation",
  skills_mapping:           "Skills Mapping",
  // People Analytics
  workforce_reporting:      "Workforce Reporting",
  predictive_modelling:     "Predictive Modelling",
  survey_analysis:          "Survey Analysis",
  attrition_analysis:       "Attrition Analysis",
  dashboard_design:         "Dashboard Design",
  // HR Systems
  payroll_support:          "Payroll Support",
  system_administration:    "System Administration",
  process_automation:       "Process Automation",
  data_management:          "Data Management",
  compliance_reporting:     "Compliance Reporting",
  // Reward
  benchmarking:             "Benchmarking",
  pay_review:               "Pay Review",
  job_evaluation:           "Job Evaluation",
  benefits_design:          "Benefits Design",
  equity_analysis:          "Equity Analysis",
  // CHRO / CPO
  ai_strategy:              "AI Strategy",
  governance_design:        "Governance Design",
  board_reporting:          "Board Reporting",
  risk_oversight:           "Risk Oversight",
  culture_change:           "Culture Change",
  // Misc / fallback
  general_hr:               "General HR",
  capability_frameworks:    "Capability Frameworks",
  change_architecture:      "Change Architecture",
  culture_diagnostics:      "Culture Diagnostics",
  data_migration:           "Data Migration",
  integration_management:   "Integration Management",
  knowledge_management:     "Knowledge Management",
  process_standardisation:  "Process Standardisation",
  query_management:         "Query Management",
  self_service_design:      "Self-Service Design",
  sla_management:           "SLA Management",
  system_implementation:    "System Implementation",
  team_effectiveness:       "Team Effectiveness",
  vendor_evaluation:        "Vendor Evaluation",
  automation_design:        "Automation Design",
};

const RISK_CONFIG = {
  High:   { color: "text-[#CC3344] bg-[#DC2626]/8 border-[#DC2626]/25", icon: AlertTriangle },
  Medium: { color: "text-[#99882A] bg-[#D97706]/8 border-[#D97706]/25", icon: AlertTriangle },
  Low:    { color: "text-[#047857] bg-[#047857]/8 border-[#047857]/25", icon: Target },
} as const;

// --- Interaction type config --------------------------------------------------

type InteractionTypeKey = InteractionType | "contradiction_probe" | "multi_step_workflow";

interface InteractionConfig {
  label: string;
  instruction: string;
  questionLabel: string;
  /** Whether this type shows an AI Output block */
  hasAiOutput: boolean;
  /** Whether this type shows a Data Context block */
  hasDataContext: boolean;
  /** Visual accent for the question section */
  accent: string;
  icon: React.ElementType;
}

// v10 interaction type configs - built from shared constants + legacy types
const INTERACTION_CONFIGS: Record<string, InteractionConfig> = {
  // v10 interaction types from shared constants
  ...Object.fromEntries(
    Object.entries(INTERACTION_TYPE_META).map(([key, meta]) => [
      key,
      {
        label: meta.label,
        instruction: meta.instruction,
        questionLabel: meta.questionLabel,
        hasAiOutput: ["error_detection", "scenario_critique", "confidence_calibration", "prompt_diagnosis"].includes(key),
        hasDataContext: false,
        accent: key.includes("error") ? "#DC2626" : key.includes("ethic") ? "#b91c1c" : key.includes("risk") ? "#DC2626" : key.includes("change") || key.includes("resistance") ? "#66CCEE" : key.includes("workflow") || key.includes("handoff") || key.includes("process") ? "var(--primary)" : "#4477AA",
        icon: key.includes("error") ? AlertCircle : key.includes("risk") ? AlertTriangle : key.includes("ethic") || key.includes("pressure") ? Shield : key.includes("critique") || key.includes("diagnosis") ? Search : key.includes("prompt") ? Sparkles : key.includes("workflow") || key.includes("handoff") || key.includes("process") ? Layers : key.includes("leader") || key.includes("advisory") ? Briefcase : key.includes("resist") || key.includes("concern") || key.includes("stakeholder") ? Scale : Target,
      },
    ])
  ),
  // Legacy types preserved for backward compatibility
  multi_step_workflow: {
    label: "Workflow Sequencing",
    instruction: "Consider the full sequence of steps and select the most appropriate next action.",
    questionLabel: "What is the next step in this workflow?",
    hasAiOutput: false,
    hasDataContext: false,
    accent: "#4477AA",
    icon: Layers,
  },
  contradiction_probe: {
    label: "Consistency Check",
    instruction: "Review your earlier response and select the most consistent answer.",
    questionLabel: "Which answer is most consistent with your earlier response?",
    hasAiOutput: false,
    hasDataContext: false,
    accent: "#b91c1c",
    icon: Scale,
  },
};

// v10 interaction type purpose explanations - built from shared constants
const INTERACTION_PURPOSE: Record<string, string> = {
  ...INTERACTION_TYPE_DESCRIPTIONS,
  // Legacy types
  multi_step_workflow:    "Evaluates your ability to sequence AI-assisted HR workflows correctly and safely.",
  contradiction_probe:    "Checks the consistency of your responses across related scenarios.",
};

function getInteractionConfig(interactionType: string): InteractionConfig {
  return INTERACTION_CONFIGS[interactionType] ?? {
    label: "Assessment Question",
    instruction: "Select the most appropriate response.",
    questionLabel: "What is the most appropriate action?",
    hasAiOutput: false,
    hasDataContext: false,
    accent: "#4477AA",
    icon: Scale,
  };
}

// --- AI Output Block ----------------------------------------------------------

function AiOutputBlock({ content, mode }: { content: string; mode: "critique" | "improvement" | "error" }) {
  const configs = {
    critique: {
      label: "AI-Generated Output",
      sublabel: "Evaluate this output",
      borderColor: "dark:border-violet-700/40 border-violet-300",
      bgColor: "dark:bg-violet-900/20 bg-violet-100/60",
      labelColor: "dark:text-violet-300 text-violet-700",
      iconColor: "dark:text-violet-400 text-violet-600",
    },
    improvement: {
      label: "AI-Generated Output",
      sublabel: "Identify improvements",
      borderColor: "border-yellow-200",
      bgColor: "bg-[#D97706]/8",
      labelColor: "text-yellow-700",
      iconColor: "text-yellow-600",
    },
    error: {
      label: "AI-Generated Output",
      sublabel: "Find the error",
      borderColor: "border-[#DC2626]/25",
      bgColor: "bg-[#DC2626]/8",
      labelColor: "text-[#CC3344]",
      iconColor: "text-[#CC3344]",
    },
  };
  const cfg = configs[mode];

  return (
    <div className={cn("rounded-xl border-2 p-4", cfg.borderColor, cfg.bgColor)}>
      <div className="flex items-center gap-2 mb-3">
        <Bot className={cn("w-4 h-4", cfg.iconColor)} />
        <div>
          <p className={cn("text-xs font-bold uppercase tracking-widest", cfg.labelColor)}>
            {cfg.label}
          </p>
          <p className="text-xs text-muted-foreground">{cfg.sublabel}</p>
        </div>
      </div>
      <div className="bg-background/60 rounded-lg p-3 border border-border/50">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono text-xs">
          {content}
        </p>
      </div>
    </div>
  );
}

// --- Data Context Block -------------------------------------------------------

function DataContextBlock({ content }: { content: string }) {
  return (
    <div className="rounded-xl border-2 dark:border-cyan-700/40 border-cyan-300 dark:bg-cyan-900/20 bg-cyan-100/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 dark:text-cyan-400 text-cyan-600" />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest dark:text-cyan-300 text-cyan-700">
            Data / AI Insight
          </p>
          <p className="text-xs text-muted-foreground">Interpret this output</p>
        </div>
      </div>
      <div className="bg-background/60 rounded-lg p-3 border border-border/50">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono text-xs">
          {content}
        </p>
      </div>
    </div>
  );
}

// --- Artefact Block (Immersive Scenario Rendering) -----------------------------

type ArtefactType = "email_thread" | "cv_extract" | "policy_doc" | "meeting_notes" | "chat_log" | "data_table" | "dashboard_card" | "screening_output" | "alert" | "document_excerpt" | "none";

function ArtefactBlock({ content, artefactType }: { content: string; artefactType: ArtefactType }) {
  const configs: Record<ArtefactType, { label: string; sublabel: string; borderColor: string; bgColor: string; labelColor: string; headerBg: string }> = {
    email_thread: {
      label: "Email Thread",
      sublabel: "Review the conversation",
      borderColor: "border-blue-200",
      bgColor: "bg-primary/8",
      labelColor: "text-blue-600",
      headerBg: "bg-primary/15",
    },
    cv_extract: {
      label: "CV Extract",
      sublabel: "Review the candidate profile",
      borderColor: "border-[#047857]/25",
      bgColor: "bg-[#047857]/8",
      labelColor: "text-[#047857]",
      headerBg: "bg-[#047857]/12",
    },
    policy_doc: {
      label: "Policy Document",
      sublabel: "Review the policy extract",
      borderColor: "border-[#D97706]/25",
      bgColor: "bg-[#D97706]/8",
      labelColor: "text-[#99882A]",
      headerBg: "bg-[#D97706]/12",
    },
    meeting_notes: {
      label: "Meeting Notes",
      sublabel: "Review the discussion record",
      borderColor: "dark:border-purple-700/40 border-purple-300",
      bgColor: "dark:bg-purple-900/20 bg-purple-100/60",
      labelColor: "dark:text-purple-300 text-purple-700",
      headerBg: "dark:bg-purple-900/30 bg-purple-100/80",
    },
    chat_log: {
      label: "Chat Log",
      sublabel: "Review the conversation",
      borderColor: "dark:border-cyan-700/40 border-cyan-300",
      bgColor: "dark:bg-cyan-900/20 bg-cyan-100/60",
      labelColor: "dark:text-cyan-300 text-cyan-700",
      headerBg: "dark:bg-cyan-900/30 bg-cyan-100/80",
    },
    data_table: {
      label: "Data Extract",
      sublabel: "Review the data",
      borderColor: "border-rose-700/40",
      bgColor: "dark:bg-rose-900/20 bg-rose-50",
      labelColor: "dark:text-rose-300 text-rose-700",
      headerBg: "dark:bg-rose-900/30 bg-rose-100/80",
    },
    dashboard_card: {
      label: "Analytics Dashboard",
      sublabel: "Review the AI-generated insight",
      borderColor: "dark:border-indigo-700/40 border-indigo-300",
      bgColor: "dark:bg-indigo-900/20 bg-indigo-100/60",
      labelColor: "dark:text-indigo-300 text-indigo-700",
      headerBg: "dark:bg-indigo-900/30 bg-indigo-100/80",
    },
    screening_output: {
      label: "AI Screening Output",
      sublabel: "Review the automated screening result",
      borderColor: "dark:border-orange-700/40 border-orange-300",
      bgColor: "dark:bg-orange-900/20 bg-orange-100/60",
      labelColor: "dark:text-orange-300 text-orange-700",
      headerBg: "dark:bg-orange-900/30 bg-orange-100/80",
    },
    alert: {
      label: "System Alert",
      sublabel: "Review the automated alert",
      borderColor: "border-[#DC2626]/25",
      bgColor: "bg-[#DC2626]/8",
      labelColor: "text-[#CC3344]",
      headerBg: "bg-[#DC2626]/12",
    },
    document_excerpt: {
      label: "Document Excerpt",
      sublabel: "Review the extract",
      borderColor: "border-border/80/40",
      bgColor: "bg-muted/30",
      labelColor: "text-foreground/70",
      headerBg: "bg-muted/50",
    },
    none: {
      label: "Context",
      sublabel: "Review the information",
      borderColor: "border-border",
      bgColor: "bg-muted/20",
      labelColor: "text-muted-foreground",
      headerBg: "bg-muted/30",
    },
  };
  const cfg = configs[artefactType] ?? configs.none;
  // Parse email thread format: lines starting with "From:", "To:", "Subject:", "---" separator
  const isEmailThread = artefactType === "email_thread";
  const isChatLog = artefactType === "chat_log";
  return (
    <div className={cn("rounded-xl border-2 overflow-hidden", cfg.borderColor, cfg.bgColor)}>
      <div className={cn("flex items-center gap-2 px-4 py-2.5", cfg.headerBg)}>
        <FileText className={cn("w-4 h-4", cfg.labelColor)} />
        <div>
          <p className={cn("text-xs font-bold uppercase tracking-widest", cfg.labelColor)}>{cfg.label}</p>
          <p className="text-xs text-muted-foreground">{cfg.sublabel}</p>
        </div>
      </div>
      <div className="p-4">
        {isEmailThread ? (
          <div className="space-y-3">
            {content.split(/\n---+\n/).map((block, idx) => (
              <div key={idx} className="bg-background/60 rounded-lg border border-border/50 p-3">
                {block.split("\n").map((line, li) => {
                  const isHeader = /^(From|To|Cc|Subject|Date|Sent):/.test(line);
                  return (
                    <p key={li} className={cn("text-xs leading-relaxed", isHeader ? "font-semibold text-foreground" : "text-muted-foreground")}>
                      {line || "\u00a0"}
                    </p>
                  );
                })}
              </div>
            ))}
          </div>
        ) : isChatLog ? (
          <div className="space-y-2">
            {content.split("\n").map((line, li) => {
              const match = line.match(/^\[(.+?)\]\s+(.+?):\s+(.*)$/);
              if (match) {
                const [, time, sender, msg] = match;
                const isSystem = sender.toLowerCase().includes("system") || sender.toLowerCase().includes("ai");
                return (
                  <div key={li} className={cn("flex gap-2 text-xs", isSystem ? "opacity-70" : "")}>
                    <span className="text-muted-foreground shrink-0 w-14">{time}</span>
                    <span className={cn("font-semibold shrink-0", isSystem ? "text-cyan-600" : "text-foreground")}>{sender}:</span>
                    <span className="text-foreground">{msg}</span>
                  </div>
                );
              }
              return <p key={li} className="text-xs text-muted-foreground">{line}</p>;
            })}
          </div>
        ) : (
          <div className="bg-background/60 rounded-lg p-3 border border-border/50">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono text-xs">{content}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Narrative Wrapper (Persistent Session Context) ---------------------------------

function NarrativeWrapper({ context }: { context: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-primary/10 transition-colors text-left"
      >
        <Layers className="w-4 h-4 text-blue-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-blue-700">Your scenario context</p>
          {!expanded && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{context.slice(0, 80)}{context.length > 80 ? "…" : ""}</p>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{expanded ? "▲ Hide" : "▼ Show"}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-blue-200">
          <p className="text-sm text-foreground leading-relaxed">{context}</p>
        </div>
      )}
    </div>
  );
}

// --- Generating State ---------------------------------------------------------

const GENERATING_STEPS = [
  { label: "Analysing your response pattern",      delay: 0    },
  { label: "Identifying capability gaps",           delay: 900  },
  { label: "Selecting optimal question type",       delay: 1800 },
  { label: "Generating scenario for your role",     delay: 2800 },
  { label: "Validating item quality",               delay: 4000 },
];

// 30 curated AI / HR-AI bite-sized facts
const AI_FACTS = [
  // ── How AI works ──────────────────────────────────────────────────────────
  { emoji: "🧠", text: "GPT-4 was trained on roughly 1 trillion tokens of text — equivalent to reading every Wikipedia article about 10,000 times." },
  { emoji: "🔍", text: "Large language models don't \"know\" facts — they predict the most statistically likely next word. That's why they can confidently state things that are wrong." },
  { emoji: "🔬", text: "Transformer architecture — the \"T\" in GPT — was invented by Google researchers in 2017. The paper was called \"Attention Is All You Need\"." },
  { emoji: "💡", text: "The \"hallucination\" problem in AI refers to models generating plausible-sounding but factually incorrect information — a critical risk in HR decision-making." },
  { emoji: "🧩", text: "Retrieval-Augmented Generation (RAG) lets AI tools answer questions about your specific policies by fetching relevant documents first — rather than relying on general training data." },
  { emoji: "🔄", text: "Most commercial LLMs have a fixed \"knowledge cutoff\" and don't learn from your conversations. What you tell ChatGPT today won't change its answers tomorrow." },
  { emoji: "⚡", text: "Training a large AI model like GPT-4 consumes roughly the same energy as 500 transatlantic flights. Running inference (using it) is far cheaper." },
  { emoji: "🌡️", text: "AI models don't \"understand\" language — they manipulate statistical patterns in high-dimensional vector space. The appearance of understanding is an emergent property of scale." },
  { emoji: "🎲", text: "The \"temperature\" setting in an LLM controls randomness. Temperature 0 = deterministic and repetitive. Temperature 1+ = creative but potentially incoherent." },
  { emoji: "🗜️", text: "A \"token\" in AI is roughly ¾ of a word. GPT-4 can process about 128,000 tokens in one go — approximately the length of a full novel." },
  { emoji: "🕸️", text: "Neural networks are loosely inspired by the brain, but the analogy breaks down quickly. A human brain has ~86 billion neurons; GPT-4 has ~1.8 trillion parameters." },
  { emoji: "📐", text: "\"Fine-tuning\" an AI model means training it further on a smaller, domain-specific dataset. It's how generic LLMs become specialised HR, legal, or medical assistants." },
  // ── AI in HR ───────────────────────────────────────────────────────────────
  { emoji: "💼", text: "A 2024 McKinsey survey found that 65% of organisations are now using generative AI in at least one business function, up from 33% the year before." },
  { emoji: "⏱️", text: "HR professionals who use AI tools for CV screening consistently report significant time savings on administrative tasks — freeing capacity for higher-value work." },
  { emoji: "📊", text: "AI-assisted performance reviews can help reduce recency bias by prompting reviewers to consider evidence across the full review period — not just the most recent months." },
  { emoji: "👥", text: "AI talent matching tools can improve quality-of-hire by surfacing candidates who match role requirements more precisely than keyword-based search alone." },
  { emoji: "📝", text: "CIPD research (2024) found that only 19% of HR professionals feel \"very confident\" using AI tools — yet 72% believe AI will significantly change their role within 3 years." },
  { emoji: "🌟", text: "AI scheduling and automated screening can significantly reduce time-to-hire — but candidate experience scores can fall if the human touchpoints are removed entirely." },
  { emoji: "💬", text: "AI coaching tools can process 100% of manager-employee conversations (with consent) to identify coaching moments — something human HR teams could never scale to." },
  { emoji: "🌱", text: "AI can reduce HR administrative burden by up to 60% — but the freed-up time is only valuable if HR teams are equipped to redirect it to strategic work." },
  { emoji: "🔭", text: "Skills intelligence platforms powered by AI can map an employee's inferred skills from job history and learning data — often surfacing capabilities the employee themselves hadn't recognised." },
  { emoji: "📉", text: "AI-powered attrition models can identify patterns associated with flight risk well before resignation — giving HR time to intervene with targeted retention conversations." },
  { emoji: "🗣️", text: "Natural language processing can analyse employee survey verbatims at scale, surfacing themes and sentiment that manual analysis would miss in a 10,000-person organisation." },
  { emoji: "🏅", text: "AI-driven internal mobility tools match employees to open roles based on inferred skills — reducing reliance on self-nomination, which historically favours extroverts." },
  { emoji: "📋", text: "AI job description tools can reduce gendered language significantly — and research consistently links more inclusive language to broader applicant pools from underrepresented groups." },
  { emoji: "🔮", text: "Workforce planning AI can model the skills your organisation will need in 3–5 years based on business strategy, industry trends, and current capability gaps." },
  // ── Governance & ethics ────────────────────────────────────────────────────
  { emoji: "⚖️", text: "The EU AI Act (2024) is the world's first comprehensive legal framework for AI — it classifies HR tools like CV screening as \"high risk\", requiring human oversight and audit trails." },
  { emoji: "🔐", text: "AI bias in hiring is a real risk: Amazon scrapped an AI recruiting tool in 2018 after discovering it systematically downgraded CVs from women." },
  { emoji: "🏛️", text: "AI tools used in redundancy decisions in the UK must comply with the Equality Act 2010 — employers remain legally liable even when an algorithm makes the recommendation." },
  { emoji: "🔎", text: "AI explainability (\"why did the model decide this?\") is a legal requirement under the UK GDPR for any automated decision that significantly affects a person." },
  { emoji: "🛡️", text: "The ICO's guidance on AI and data protection requires organisations to conduct a Data Protection Impact Assessment before deploying AI in HR processes." },
  { emoji: "🧾", text: "The UK's Algorithmic Transparency Recording Standard requires public sector bodies to publish details of algorithmic tools used in significant decisions — a model increasingly adopted in large enterprises." },
  { emoji: "🚦", text: "The EU AI Act uses a traffic-light risk model: unacceptable risk (banned), high risk (regulated), limited risk (transparency obligations), minimal risk (no rules)." },
  { emoji: "🔏", text: "Using employee data to train an AI model without explicit consent may breach GDPR Article 6. Many HR AI vendors process data outside the EEA — check your DPA." },
  // ── AI literacy & skills ───────────────────────────────────────────────────
  { emoji: "🎓", text: "AI literacy is increasingly appearing as a listed competency in HR job descriptions — a trend that has accelerated sharply since 2022 as AI tools entered mainstream HR workflows." },
  { emoji: "🧑\u200d💻", text: "Prompt engineering — the skill of writing effective instructions for AI — is now a distinct job role. Some prompt engineers earn over £150k at leading AI labs." },
  { emoji: "🎯", text: "Adaptive assessment engines like this one adjust question difficulty in real time based on your response patterns — similar to how GMAT and GRE exams work." },
  { emoji: "📚", text: "The World Economic Forum's Future of Jobs Report (2025) lists AI and big data literacy as the fastest-growing skill demand globally — ahead of green skills and cybersecurity." },
  { emoji: "🧪", text: "\"AI fluency\" is distinct from \"AI literacy\". Literacy means knowing what AI is. Fluency means being able to critically evaluate, direct, and improve AI outputs in your domain." },
  { emoji: "🏋️", text: "Regular practice with AI tools — even in short sessions — builds fluency faster than one-off training events. Deliberate use beats passive observation." },
  { emoji: "🎮", text: "Scenario-based learning (like this assessment) produces significantly better knowledge retention than passive reading — because it requires active decision-making, not just recognition." },
  { emoji: "🧭", text: "AiQ measures six domains: AI Interaction, AI Output Evaluation, AI Workflow Design, Workforce AI Readiness, AI Ethics & Trust, and AI Change Leadership." },
  // ── ROI & business impact ──────────────────────────────────────────────────
  { emoji: "🌍", text: "The global AI market is projected to reach $1.8 trillion by 2030 — growing at roughly 37% per year." },
  { emoji: "📈", text: "Organisations with a formal AI governance framework are 2.3x more likely to report positive ROI from their AI investments, according to Gartner." },
  { emoji: "📱", text: "By 2026, Gartner predicts that 80% of HR technology vendors will have embedded generative AI into their core products — whether customers want it or not." },
  { emoji: "💰", text: "The ROI of AI in HR is highest in talent acquisition (avg. 3.5x) and lowest in performance management (avg. 1.2x), according to Deloitte's 2024 HR Technology Report." },
  { emoji: "📦", text: "Companies in the top quartile for AI adoption in HR report 18% lower voluntary turnover than industry peers, according to IBM's Institute for Business Value." },
  { emoji: "🏗️", text: "The biggest barrier to AI ROI in HR isn't technology — it's change management. 67% of failed AI deployments cite poor adoption, not technical failure, as the root cause." },
  { emoji: "💹", text: "Microsoft's 2025 Work Trend Index found that employees who use AI tools report 29% higher job satisfaction scores — but only when they feel in control of how the AI is used." },
  // ── AI history & culture ───────────────────────────────────────────────────
  { emoji: "🤖", text: "The term \"Artificial Intelligence\" was coined by John McCarthy in 1956 at the Dartmouth Conference — the same year Elvis Presley released his first album." },
  { emoji: "🏆", text: "The Turing Test, proposed in 1950, asked whether a machine could converse indistinguishably from a human. Most experts now agree modern LLMs can pass it — but that's not the same as intelligence." },
  { emoji: "♟️", text: "IBM's Deep Blue beat world chess champion Garry Kasparov in 1997 — a landmark moment. Kasparov later said the machine didn't \"understand\" chess; it just calculated faster." },
  { emoji: "🖼️", text: "The first AI-generated artwork sold at Christie's auction house in 2018 for $432,500 — 43x its estimate. The \"artist\" was an algorithm called AICAN." },
  { emoji: "🚗", text: "The first self-driving car test took place in 1986 at Carnegie Mellon. Nearly 40 years later, fully autonomous vehicles are still not commercially available at scale." },
  { emoji: "🌐", text: "The term \"machine learning\" was coined by Arthur Samuel in 1959 while he was teaching a computer to play draughts — and beat him at it." },
  // ── Human + AI ─────────────────────────────────────────────────────────────
  { emoji: "🤝", text: "The most effective AI deployments in HR combine automation for repetitive tasks with human judgement for nuanced decisions — a model called \"human-in-the-loop\"." },
  { emoji: "🧬", text: "Research from MIT shows that humans working alongside AI outperform both humans alone and AI alone on complex analytical tasks — the \"centaur\" model of collaboration." },
  { emoji: "🎭", text: "AI can replicate the \"what\" of a decision but rarely the \"why\". HR professionals who understand this distinction are better placed to audit, override, and improve AI recommendations." },
  { emoji: "🌈", text: "Diverse teams using AI tools make better decisions than homogeneous teams — because they're more likely to challenge AI outputs rather than defer to them uncritically." },
  { emoji: "🧘", text: "A 2024 Harvard study found that employees are more likely to accept AI-assisted decisions when they're given a clear explanation and a human point of contact for appeals." },
  { emoji: "🔑", text: "The most valuable HR skill in an AI-augmented workplace isn't technical — it's the ability to ask the right questions of AI outputs and know when to override them." },
  // ── Emerging trends ────────────────────────────────────────────────────────
  { emoji: "🤖", text: "Agentic AI — systems that plan and execute multi-step tasks autonomously — is the next frontier. Early HR applications include end-to-end onboarding workflows and benefits enrolment." },
  { emoji: "🔊", text: "Voice AI in HR is growing fast: AI-powered voice tools for first-round candidate screening are moving from pilot to mainstream — raising significant questions about candidate consent and bias." },
  { emoji: "🧑\u200d🤝\u200d🧑", text: "\"AI colleagues\" — persistent AI agents with memory and a defined role — are being piloted at several FTSE 100 companies as HR business partner assistants." },
  { emoji: "🌏", text: "Multimodal AI (text + image + audio + video) is changing HR: AI can now assess presentation skills, body language, and vocal confidence in video interviews — raising significant ethical questions." },
  { emoji: "🔋", text: "AI is beginning to generate its own training data through \"synthetic data\" — meaning future models may learn primarily from AI-generated content rather than human-written text." },
  { emoji: "📡", text: "Real-time AI translation is enabling global HR teams to run performance conversations across 50+ languages simultaneously — breaking down one of the last barriers to truly global talent management." },
];

/** Fisher-Yates shuffle — returns a new shuffled copy */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Estimated generation time in ms — matches the last GENERATING_STEPS delay + a small buffer
const ESTIMATED_GENERATION_MS = 7000;

function GeneratingState({ answeredCount, totalItems }: { answeredCount: number; totalItems: number }) {
  const progress = totalItems > 0 ? Math.round((answeredCount / totalItems) * 100) : 0;
  const [activeStep, setActiveStep] = useState(0);
  // Shuffle-without-replacement: maintain a queue of shuffled indices; refill when empty
  const queueRef = useRef<number[]>([]);
  const [factIndex, setFactIndex] = useState<number>(() => {
    queueRef.current = shuffleArray(AI_FACTS.map((_, i) => i));
    return queueRef.current.shift()!;
  });
  const [factVisible, setFactVisible] = useState(true);

  // Time-based progress bar — counts up from 0 to ~95% over ESTIMATED_GENERATION_MS,
  // then holds at 95% until the component unmounts (question arrived)
  const startTimeRef = useRef(Date.now());
  const [genProgress, setGenProgress] = useState(0);
  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      // Ease-out curve: fast start, slows near the end, caps at 95%
      const raw = elapsed / ESTIMATED_GENERATION_MS;
      const eased = 1 - Math.pow(1 - Math.min(raw, 1), 2); // ease-out quad
      setGenProgress(Math.min(Math.round(eased * 95), 95));
    };
    const id = setInterval(tick, 80);
    return () => clearInterval(id);
  }, []);

  // Advance generating steps
  useEffect(() => {
    const timers = GENERATING_STEPS.slice(1).map((step, i) =>
      setTimeout(() => setActiveStep(i + 1), step.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Rotate facts every 4 seconds — shuffle-without-replacement so no repeats
  useEffect(() => {
    const interval = setInterval(() => {
      setFactVisible(false);
      setTimeout(() => {
        if (queueRef.current.length === 0) {
          // Refill with a fresh shuffle when all facts have been shown
          queueRef.current = shuffleArray(AI_FACTS.map((_, i) => i));
        }
        setFactIndex(queueRef.current.shift()!);
        setFactVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fact = AI_FACTS[factIndex];
  // Remaining seconds label
  const elapsed = Math.min((Date.now() - startTimeRef.current) / 1000, ESTIMATED_GENERATION_MS / 1000);
  const remaining = Math.max(0, Math.ceil(ESTIMATED_GENERATION_MS / 1000 - elapsed));

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            Question <span style={{ color: "var(--primary)" }}>{answeredCount + 1}</span>
            <span className="text-muted-foreground font-normal"> of {totalItems}</span>
          </span>
          <span className="text-xs font-medium tabular-nums" style={{ color: "var(--primary)" }}>{progress}%</span>
        </div>
        {totalItems <= 30 ? (
          <div className="flex items-center gap-1">
            {Array.from({ length: totalItems }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full transition-all duration-300"
                style={{
                  height: "6px",
                  background: i < answeredCount
                    ? "var(--primary)"
                    : i === answeredCount
                    ? `linear-gradient(90deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 40%, transparent) 100%)`
                    : "var(--muted)",
                  opacity: i > answeredCount ? 0.5 : 1,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 70%, #34D399) 100%)",
                transition: "width 0.4s ease-out",
                boxShadow: progress > 0 ? "0 0 8px color-mix(in srgb, var(--primary) 60%, transparent)" : "none",
              }}
            />
          </div>
        )}
      </div>

      {/* AI Fact card */}
      <div
        className="rounded-2xl border border-border overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(59,78,255,0.08) 100%)" }}
      >
        {/* Top bar — generation progress */}
        <div className="px-5 pt-4 pb-3 border-b border-border space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="absolute w-8 h-8 rounded-full animate-ping" style={{ background: "rgba(16,185,129,0.15)", animationDuration: "1.8s" }} />
              <span className="absolute w-6 h-6 rounded-full animate-ping" style={{ background: "rgba(16,185,129,0.2)", animationDuration: "1.8s", animationDelay: "0.3s" }} />
              <div className="relative w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)" }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
              </div>
            </div>
            <p className="text-xs font-semibold" style={{ color: "#10B981" }}>Generating your next question…</p>
            <div className="ml-auto flex items-center gap-1.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full" style={{
                  background: "#10B981",
                  opacity: 0.9,
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
          {/* Time-based generation progress bar */}
          <div className="space-y-1">
            <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{
                  width: `${genProgress}%`,
                  background: "linear-gradient(90deg, #10B981 0%, #34D399 100%)",
                  transition: "width 0.15s ease-out",
                  boxShadow: "0 0 8px rgba(16,185,129,0.6)",
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{genProgress}% ready</span>
              {remaining > 0 && (
                <span className="text-[10px] text-muted-foreground">~{remaining}s remaining</span>
              )}
            </div>
          </div>
        </div>

        {/* Fact area */}
        <div className="px-5 py-5 min-h-[110px] flex flex-col justify-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Did you know?</p>
          <div
            style={{
              opacity: factVisible ? 1 : 0,
              transform: factVisible ? "translateY(0)" : "translateY(6px)",
              transition: "opacity 0.4s ease, transform 0.4s ease",
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none mt-0.5 shrink-0">{fact.emoji}</span>
              <p className="text-sm text-foreground leading-relaxed">{fact.text}</p>
            </div>
          </div>
        </div>

        {/* Fact dots indicator */}
        <div className="flex items-center justify-center gap-1.5 pb-4">
          {AI_FACTS.slice(0, 8).map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === (factIndex % 8) ? "16px" : "6px",
                height: "6px",
                background: i === (factIndex % 8) ? "#10B981" : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Engine steps card */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-5 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Engine status</p>
          <div className="space-y-2">
            {GENERATING_STEPS.map((step, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2.5 text-xs transition-all duration-500",
                  i < activeStep ? "text-muted-foreground" :
                  i === activeStep ? "text-foreground" :
                  "text-muted-foreground/30"
                )}
              >
                {i < activeStep ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#10B981" }} />
                ) : i === activeStep ? (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" style={{ color: "#10B981" }} />
                ) : (
                  <div className="w-3.5 h-3.5 shrink-0 rounded-full border border-muted-foreground/20" />
                )}
                <span className={i === activeStep ? "font-medium" : ""}>{step.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-t border-border pt-3 mt-1">
            <Bot className="w-3 h-3" />
            <span>Adaptive AI assessment engine · Each question is unique to you</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Completion Screen --------------------------------------------------------

function CompletionScreen({
  result,
  sessionId,
  onNavigate,
}: {
  result: any;
  sessionId: string;
  onNavigate: (path: string) => void;
}) {
  const primaryState = result?.primaryState ?? "unknown";
  // v10 five-state readiness classification
  const STATE_CONFIGS: Record<string, { label: string; color: string; bg: string; description: string }> = {
    ...READINESS_STATES,
    insufficient_evidence: READINESS_STATES.unknown,
  };
  const stateConfig = STATE_CONFIGS[primaryState] ?? { label: "Assessed", color: "text-foreground", bg: "bg-muted/20 border-border", description: "" };
  const capabilityScores = result?.capabilityScores ?? {};
  const confidenceBand = result?.classificationConfidence?.band;
  const confidenceLabel = result?.classificationConfidence?.label;
  const caveat = result?.classificationConfidence?.caveat;

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <div className="text-center py-5">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ background: "var(--color-green-50)", border: "2px solid var(--color-green-100)" }}>
          <CheckCircle2 className="w-8 h-8" style={{ color: "var(--color-green-700)" }} />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Assessment complete</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Your capability profile has been updated. View your full results below.
        </p>
      </div>

      {result && (
        <div className={cn("rounded-2xl border-2 p-5", stateConfig.bg)}>
          <p className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1")}>Your Readiness</p>
          <div className="flex items-baseline gap-3">
            <p className={cn("text-2xl font-bold ", stateConfig.color)}>{stateConfig.label}</p>
            <p className={cn("text-4xl font-bold", stateConfig.color)}>{formatPeakonScore(result.overallScore)}<span className="text-xl font-medium opacity-60"> / 10</span></p>
          </div>
          {stateConfig.description && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{stateConfig.description}</p>
          )}
          {caveat && (
            <div className="flex items-start gap-1.5 mt-3 text-xs text-[#D97706]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{caveat}</span>
            </div>
          )}
        </div>
      )}

      {/* P8: Confidence band */}
      {confidenceBand && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
          <Award className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Classification confidence: <span className="font-semibold text-foreground capitalize">{confidenceLabel ?? confidenceBand}</span>
          </p>
        </div>
      )}

      {result && Object.keys(capabilityScores).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Capability Breakdown</h3>
          {Object.entries(capabilityScores).map(([key, score]) => {
            const peakonScore = (score as number) / 10;
            const colors = scoreToColor(peakonScore);
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-40 truncate">
                  {DOMAIN_LABELS[key as keyof typeof DOMAIN_LABELS] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </span>
                <div className="flex-1 h-2 bg-muted/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${score}%`, backgroundColor: colors.bg }}
                  />
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-md min-w-[2.5rem] text-center"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {formatPeakonScore(peakonScore)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Scenario feedback widget — Relevance & Update Engine data collection */}
      <ScenarioFeedbackWidget sessionId={sessionId} />
      <div className="space-y-2">
        <Button
          onClick={() => onNavigate(`/assessment/${sessionId}/results`)}
          className="w-full gap-2"
        >
          View full results <ChevronRight className="w-4 h-4" />
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => onNavigate("/learning")} variant="outline" className="text-sm">
            Learning Plan
          </Button>
          <Button onClick={() => onNavigate("/dashboard")} variant="outline" className="text-sm">
            My Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Scenario Feedback Widget ────────────────────────────────────────────────────
// Shown on the CompletionScreen to collect user ratings on the assessment scenarios.
// Data feeds the Relevance & Update Engine for trigger-based content review.
function ScenarioFeedbackWidget({ sessionId }: { sessionId: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [relevance, setRelevance] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [difficulty, setDifficulty] = useState(0);
  const [comment, setComment] = useState("");
  const submitFeedback = trpc.assessment.submitScenarioFeedback.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Thank you for your feedback!");
    },
    onError: () => toast.error("Failed to submit feedback"),
  });
  function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(i => (
            <button key={i} type="button" onClick={() => onChange(i)}
              className={cn("h-6 w-6 text-lg leading-none rounded transition-colors",
                i <= value ? "dark:text-amber-400 text-amber-600" : "text-muted-foreground/30 hover:dark:text-amber-300 text-amber-700")}>
              ★
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (submitted) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
        <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1.5" />
        <p className="text-sm text-muted-foreground">Feedback submitted. Thank you!</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rate this assessment</p>
      <StarRating value={relevance} onChange={setRelevance} label="Relevance" />
      <StarRating value={clarity} onChange={setClarity} label="Clarity" />
      <StarRating value={difficulty} onChange={setDifficulty} label="Difficulty" />
      <Textarea
        placeholder="Optional: any comments about the scenarios?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="text-xs min-h-[60px] resize-none"
        maxLength={500}
      />
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        disabled={submitFeedback.isPending || (relevance === 0 && clarity === 0 && difficulty === 0)}
        onClick={() => submitFeedback.mutate({
          scenarioId: sessionId,
          sessionId,
          relevanceRating: relevance > 0 ? relevance : undefined,
          clarityRating: clarity > 0 ? clarity : undefined,
          difficultyRating: difficulty > 0 ? difficulty : undefined,
          comment: comment || undefined,
        })}
      >
        {submitFeedback.isPending ? "Submitting..." : "Submit feedback"}
      </Button>
    </div>
  );
}

// --- Main Component -----------------------------------------------------------

// B2: Device and browser detection helpers
function detectDeviceType(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
  if (/iPad|Tablet|PlayBook/i.test(ua)) return "tablet";
  return "desktop";
}
function detectBrowserType(): string {
  const ua = navigator.userAgent;
  if (/Edg\//i.test(ua)) return "edge";
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return "chrome";
  if (/Firefox\//i.test(ua)) return "firefox";
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return "safari";
  if (/OPR\//i.test(ua)) return "opera";
  return "other";
}

export default function AssessmentSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  // Post-assessment interstitial: shown after first completion for free users
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialScore, setInterstitialScore] = useState<number | null>(null);
  const isPro = useIsPro();
  // Check how many completed sessions exist BEFORE this one completes
  const { data: historyData } = trpc.assessment.history.useQuery({}, { staleTime: 30_000 });
  // Rationale loading: true from submit click until rationale content is ready to reveal
  const [rationaleLoading, setRationaleLoading] = useState(false);

  // Track the displayOrder of the question we are waiting for so polling
  // continues until the server returns a question with a HIGHER displayOrder
  // (not just any truthy nextItem, which could be the same question we just answered).
  const [isGenerating, setIsGenerating] = useState(false);
  const expectedNextOrder = useRef<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // T2-5: Rationale reveal state - shown after answer submission
  const [rationaleData, setRationaleData] = useState<{
    rationaleText: string | null;
    allOptionsRationale: Array<{ value: string; rationaleText: string | null; outcomeClass: string | null }>;
    selectedValue: string;
    selectedLabel: string; // UX-5: label of the chosen option
    outcomeClass: string | null;
    isLastQuestion: boolean; // UX-7: auto-trigger complete after rationale
  } | null>(null);

  const { data: sessionData, isLoading, error: sessionError, refetch } = trpc.assessment.session.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId, refetchOnWindowFocus: false, retry: false }
  );

  const [selectedValue, setSelectedValue] = useState<string>("");
  // v10: Three-level confidence staking (guessing/fairly_sure/certain)
  type ConfidenceStake = "guessing" | "fairly_sure" | "certain";
  const STAKE_VALUES: Record<ConfidenceStake, number> = { guessing: 0.25, fairly_sure: 0.65, certain: 1.0 };
  const [confidenceStake, setConfidenceStake] = useState<ConfidenceStake | null>(null);
  const confidence = confidenceStake ? STAKE_VALUES[confidenceStake] * 100 : 50;
  // B7: reasoningText state removed
  const [itemStartTime, setItemStartTime] = useState<number>(Date.now());
  // WS5.1: Track first interaction time for telemetry
  const [firstInteractionTime, setFirstInteractionTime] = useState<number | null>(null);
  // B1: Track revision count (option changes after first selection) and focus loss count
  const [revisionCount, setRevisionCount] = useState<number>(0);
  const [focusLossCount, setFocusLossCount] = useState<number>(0);
  // UX-6: Elapsed timer (retained for telemetry, hidden from UI per A3)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // D1: Flag this question dialog
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagReason, setFlagReason] = useState<string>("");
  const [flagSubmitted, setFlagSubmitted] = useState(false);
  // C1: Methodology dialog
  const [showMethodologyDialog, setShowMethodologyDialog] = useState(false);

  // D1: Flag question mutation
  const flagQuestionMutation = trpc.assessment.flagQuestion.useMutation();

  const submitMutation = trpc.assessment.submitAnswer.useMutation({
    onSuccess: (data) => {
      // Record which displayOrder we expect next so the polling effect knows when to stop
      const currentOrder = sessionData?.nextItem?.displayOrder ?? 0;
      expectedNextOrder.current = currentOrder + 1;

      // T2-5: Show rationale if available before advancing to next question
      const hasRationale = data.allOptionsRationale?.some((o: any) => o.rationaleText);
      if (hasRationale) {
        const chosenOption = sessionData?.nextItem?.options?.find((o: any) => o.value === selectedValue);
        // Brief artificial delay so the skeleton is visible for at least 600ms
        // This prevents a jarring instant snap from loading to content
        setTimeout(() => {
          setRationaleData({
            rationaleText: data.rationaleText ?? null,
            allOptionsRationale: data.allOptionsRationale ?? [],
            selectedValue: selectedValue,
            selectedLabel: chosenOption?.label ?? "",
            outcomeClass: data.outcomeClass ?? null,
            isLastQuestion: data.isComplete === true,
          });
          setRationaleLoading(false);
        }, 600);
        // Start polling for next item while user reads rationale
        setIsGenerating(true);
        refetch();
      } else {
        setSelectedValue("");
        setConfidenceStake(null);
        setItemStartTime(Date.now());
        setFirstInteractionTime(null);
        setRevisionCount(0); // B1: reset per-item counters
        setFocusLossCount(0);
        setIsGenerating(true);
        refetch();
      }
    },
    onError: (err) => {
      setRationaleLoading(false);
      toast.error(err.message);
    },
  });

  const completeMutation = trpc.assessment.completeSession.useMutation({
    onSuccess: (data) => {
      // Show interstitial for free users completing their FIRST assessment
      const completedBefore = (historyData ?? []).filter(
        (s: any) => s.state === "completed" && s.id !== sessionId
      ).length;
      const isFirstCompletion = completedBefore === 0;
      if (isFirstCompletion && !isPro) {
        const score = (data as any)?.overallScore ?? null;
        setInterstitialScore(score);
        setShowInterstitial(true);
      } else {
        navigate(`/assessment/${sessionId}/results`);
      }
    },
    onError: err => toast.error(err.message),
  });

  // UX-6: Start/reset elapsed timer when a new item appears
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setElapsedSeconds(0);
    if (sessionData?.nextItem && !rationaleData) {
      timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData?.nextItem?.id]);

  // Stop timer when rationale is shown
  useEffect(() => {
    if (rationaleData && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [rationaleData]);

  // Stop generating state only when a genuinely NEW question arrives
  // (displayOrder > the one we were on when the user submitted).
  useEffect(() => {
    const currentOrder = sessionData?.nextItem?.displayOrder ?? null;
    if (
      isGenerating &&
      currentOrder !== null &&
      expectedNextOrder.current !== null &&
      currentOrder >= expectedNextOrder.current
    ) {
      setIsGenerating(false);
      expectedNextOrder.current = null;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    }
  }, [sessionData?.nextItem?.displayOrder, isGenerating]);

  // Poll every 1.5 s while waiting for the pre-generated item.
  // Give up after 12 s — the session query will then fall back to synchronous generation.
  useEffect(() => {
    if (!isGenerating) return;
    pollingRef.current = setInterval(() => {
      refetch();
    }, 1500);
    // Safety timeout: stop polling after 12 s regardless
    pollingTimeoutRef.current = setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setIsGenerating(false);
      expectedNextOrder.current = null;
      refetch(); // one final fetch to pick up whatever the server has
    }, 12000);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, [isGenerating, refetch]);

  // --- ALL REMAINING HOOKS - must be declared before any early return -----------

  // handleSubmit - declared before any early return to satisfy Rules of Hooks
  const handleSubmit = useCallback(() => {
    if (!selectedValue) {
      toast.error("Please select an answer before continuing");
      return;
    }
    const currentItem = sessionData?.nextItem;
    if (!currentItem) return;
    const timeTaken = Math.round(Date.now() - itemStartTime);
    setRationaleLoading(true);
    submitMutation.mutate({
      sessionId: sessionId!,
      itemId: currentItem.id,
      selectedValue,
      confidenceScore: confidence / 100,
      timeToAnswerMs: timeTaken,
      timeToFirstInteractionMs: firstInteractionTime !== null ? Math.round(firstInteractionTime - itemStartTime) : undefined,
      confidenceRatingRaw: confidence / 100,
      revisionCount,
      focusLossCount,
      deviceType: detectDeviceType(),
      browserType: detectBrowserType(),
      screenWidthPx: window.screen.width,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValue, confidence, itemStartTime, firstInteractionTime, revisionCount, focusLossCount, sessionId, sessionData?.nextItem?.id]);

  // B1: Track focus loss via visibilitychange
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setFocusLossCount(c => c + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // UX-4: Keyboard navigation - 1-4 to select option, Enter to submit
  useEffect(() => {
    const currentItem = sessionData?.nextItem;
    if (!currentItem || rationaleData) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const options = currentItem.options ?? [];
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= options.length) {
        setSelectedValue(options[num - 1].value);
      } else if (e.key === "Enter" && selectedValue) {
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [sessionData?.nextItem, rationaleData, selectedValue, handleSubmit]);

  if (isLoading) {
    return <AssessmentSessionSkeleton />;
  }

  if (!sessionData || sessionError) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-muted-foreground font-medium">Session not found or has expired.</p>
        <p className="text-sm text-muted-foreground">This can happen if the session was reset. Please start a new assessment.</p>
        <Button onClick={() => navigate("/assessment")} className="mt-4">Back to Assessments</Button>
      </div>
    );
  }

  const session = sessionData.session;
  const totalItems = sessionData.totalItems ?? 0;
  const answeredCount = sessionData.answeredCount ?? 0;
  const nextItem = sessionData.nextItem;
  const isComplete = sessionData.isComplete;
  const progress = totalItems > 0 ? Math.round((answeredCount / totalItems) * 100) : 0;

  // Completed state - redirect to results page
  if (session.state === "completed") {
    navigate(`/assessment/${sessionId}/results`);
    return null;
  }

  // All answered - show completion screen
  if (isComplete && answeredCount > 0) {
    if (!completeMutation.isSuccess) {
      return (
        <div className="p-6 space-y-6 max-w-2xl mx-auto">
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--color-green-700)" }} />
            <h2 className="text-xl font-semibold text-foreground">You've answered all {answeredCount} questions</h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto leading-relaxed">
              The engine is ready to compute your capability profile across all six domains. This takes a few seconds.
            </p>
            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: "var(--color-green-700)" }} /> {answeredCount} responses recorded</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: "var(--color-green-700)" }} /> 6 capability domains</span>
            </div>
            <Button
              onClick={() => completeMutation.mutate({ sessionId: sessionId! })}
              disabled={completeMutation.isPending}
              className="mt-6 gap-2 min-w-[200px]"
            >
              {completeMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Calculating scores…</>
              ) : (
                <>Generate My Results <ChevronRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </div>
      );
    }
    return (
      <CompletionScreen
        result={completeMutation.data}
        sessionId={sessionId!}
        onNavigate={navigate}
      />
    );
  }

  // T2-5a: Rationale loading skeleton - shown immediately after submit, before rationale arrives
  if (rationaleLoading && !rationaleData) {
    return (
      <div className="p-6 space-y-5 max-w-2xl mx-auto animate-in fade-in duration-200">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Question <span style={{ color: "var(--primary)" }}>{answeredCount + 1}</span>
              <span className="text-muted-foreground font-normal"> of {totalItems}</span>
            </span>
            <span className="text-xs font-medium tabular-nums" style={{ color: "var(--primary)" }}>{progress}%</span>
          </div>
          {totalItems <= 30 ? (
            <div className="flex items-center gap-1">
              {Array.from({ length: totalItems }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all duration-300"
                  style={{
                    height: "6px",
                    background: i < answeredCount
                      ? "var(--primary)"
                      : i === answeredCount
                      ? `linear-gradient(90deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 40%, transparent) 100%)`
                      : "var(--muted)",
                    opacity: i > answeredCount ? 0.5 : 1,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 70%, #34D399) 100%)",
                  transition: "width 0.4s ease-out",
                  boxShadow: progress > 0 ? "0 0 8px color-mix(in srgb, var(--primary) 60%, transparent)" : "none",
                }}
              />
            </div>
          )}
        </div>
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 space-y-5">
            {/* Pulsing analysis indicator */}
            <div className="flex items-center gap-3 px-3 py-3 rounded-lg border border-border bg-muted/20">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-20" style={{ background: "var(--color-green-700)" }} />
                <span className="relative inline-flex h-5 w-5 rounded-full items-center justify-center" style={{ background: "#ECFDF5" }}>
                  <Bot className="w-3 h-3" style={{ color: "var(--color-green-700)" }} />
                </span>
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">Analysing your response…</p>
                <p className="text-xs text-muted-foreground">Generating personalised explanation</p>
              </div>
            </div>
            {/* Skeleton lines */}
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-4/5 rounded" />
              <Skeleton className="h-4 w-3/5 rounded" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // T2-5: Rationale reveal - show after answer, before next question
  if (rationaleData) {
    // Stagger delays for section cascade animation
    const stagger = (i: number) => ({ style: { animationDelay: `${i * 80}ms` } });
    const outcomeColors: Record<string, string> = {
      strong: "var(--primary)",
      acceptable: "#D97706",
      weak: "#D97706",
      failure: "#DC2626",
      critical_failure: "#AA0000",
    };
    const outcomeLabels: Record<string, string> = {
      strong: "Strong response",
      acceptable: "Acceptable response",
      weak: "Weak response",
      failure: "Incorrect response",
      critical_failure: "Critical failure",
    };
    const outcomeColor = outcomeColors[rationaleData.outcomeClass ?? ""] ?? "#4477AA";
    const outcomeLabel = outcomeLabels[rationaleData.outcomeClass ?? ""] ?? "Response recorded";
    return (
      <div className="p-6 space-y-5 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Question {answeredCount + 1} <span className="text-muted-foreground font-normal">of {totalItems}</span>
            </span>
            <button
              onClick={() => { toast.success("Progress saved - resume any time from the Assessment page."); navigate("/assessment"); }}
              className="flex items-center gap-1.5 text-xs font-medium rounded-md px-2.5 py-1 transition-colors border"
              style={{ color: "var(--primary)", borderColor: "#D1FAE5", background: "#F8FAFC" }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Save &amp; Exit
            </button>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 space-y-4">
            {/* UX-5: Outcome badge + selected option label */}
            <div
              className="animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold"
              style={{ color: outcomeColor, backgroundColor: `${outcomeColor}12`, borderColor: `${outcomeColor}30`, ...stagger(0).style }}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{outcomeLabel}</span>
            </div>
            {rationaleData.selectedLabel && (
              <div
                className="animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm"
                {...stagger(1)}
              >
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-0.5">Your answer</span>
                <span className="text-foreground">{rationaleData.selectedLabel}</span>
              </div>
            )}
            {/* Selected option rationale */}
            {rationaleData.rationaleText && (
              <div
                className="animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both space-y-1.5"
                {...stagger(2)}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Why this matters</p>
                <p className="text-sm text-foreground leading-relaxed">{rationaleData.rationaleText}</p>
              </div>
            )}
            {/* All options rationale */}
            {rationaleData.allOptionsRationale.filter(o => o.rationaleText && o.value !== rationaleData.selectedValue).length > 0 && (
              <div
                className="animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both space-y-2"
                {...stagger(3)}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Other options</p>
                {rationaleData.allOptionsRationale
                  .filter(o => o.rationaleText && o.value !== rationaleData.selectedValue)
                  .map(o => {
                    // UX-10: Use numeric position (1-based) to match question screen numbering
                    const optionIdx = (sessionData?.nextItem?.options ?? []).findIndex((opt: any) => opt.value === o.value);
                    const optionNum = optionIdx >= 0 ? optionIdx + 1 : o.value?.toUpperCase?.();
                    return (
                    <div
                      key={o.value}
                      className="p-3 rounded-lg border border-border bg-muted/30 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {optionNum}
                        </span>
                        <span
                          className="text-xs font-medium"
                          style={{ color: outcomeColors[o.outcomeClass ?? ""] ?? "#888" }}
                        >
                          {outcomeLabels[o.outcomeClass ?? ""] ?? ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-7">{o.rationaleText}</p>
                    </div>
                  );
                  })}
              </div>
            )}
            {/* UX-7: if last question, show Complete Assessment instead of Continue */}
            <div
              className="animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both"
              {...stagger(4)}
            >
              {rationaleData.isLastQuestion ? (
                <Button
                  onClick={() => {
                    setRationaleData(null);
                    completeMutation.mutate({ sessionId: sessionId! });
                  }}
                  disabled={completeMutation.isPending}
                  className="w-full gap-2"
                >
                  {completeMutation.isPending ? "Calculating scores…" : "Complete assessment"}
                  {!completeMutation.isPending && <CheckCircle2 className="w-4 h-4" />}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setRationaleData(null);
                    setRationaleLoading(false);
                    setSelectedValue("");
                    setConfidenceStake(null);
                    setItemStartTime(Date.now());
                    setFirstInteractionTime(null); // Fix: reset so next question doesn't inherit stale timestamp
                    setRevisionCount(0); // B1: reset per-item counters
                    setFocusLossCount(0);
                  }}
                  className="w-full gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generating state - waiting for LLM to produce next item
  if (isGenerating || !nextItem) {
    return <GeneratingState answeredCount={answeredCount} totalItems={totalItems} />;
  }

  const interactionType = (nextItem as any).interactionType ?? "prompt_refinement";
  const iConfig = getInteractionConfig(interactionType);
  const formatElapsed = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  const capabilityColor = CAPABILITY_COLOURS[(nextItem as any).capabilityKey] ?? "#4477AA";
  const riskLevel = (nextItem as any).riskLevel as keyof typeof RISK_CONFIG;
  const riskConfig = RISK_CONFIG[riskLevel] ?? RISK_CONFIG.Medium;
  const aiOutput = (nextItem as any).aiOutput as string | undefined;
  const dataContext = (nextItem as any).dataContext as string | undefined;
  const artefactType = (nextItem as any).artefactType as ArtefactType | undefined;
  const narrativeContext = (sessionData as any).narrativeContext as string | undefined;

  // Determine AI output mode for visual framing
  const aiOutputMode: "critique" | "improvement" | "error" =
    interactionType === "output_improvement" ? "improvement" :
    interactionType === "error_detection" ? "error" : "critique";

  return (
    <>
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      {/* Back + Progress header */}
      <div className="space-y-3">
        {/* Top row: back link + Save & Exit button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowLeaveDialog(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          {/* Save & Exit - always visible so users know they can leave safely */}
          <button
            onClick={() => setShowLeaveDialog(true)}
            className="flex items-center gap-1.5 text-xs font-medium rounded-md px-2.5 py-1 transition-colors border"
            style={{ color: "var(--primary)", borderColor: "#D1FAE5", background: "#F8FAFC" }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Save &amp; Exit
          </button>
        </div>

        {/* D1: Flag this question dialog */}
        <AlertDialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-muted-foreground" />
                Flag this question
              </AlertDialogTitle>
              <AlertDialogDescription>
                Help us improve the assessment by flagging any issues with this question.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="px-0 pb-2 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {["Confusing wording", "Multiple correct answers", "Doesn't apply to my context", "Other"].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setFlagReason(reason)}
                    className={cn(
                      "text-xs rounded-lg border px-3 py-2 text-left transition-all",
                      flagReason === reason
                        ? "border-primary bg-[#047857]/8 text-foreground font-medium"
                        : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                    )}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <Textarea
                value={flagReason && !["Confusing wording", "Multiple correct answers", "Doesn't apply to my context", "Other"].includes(flagReason) ? flagReason : ""}
                onChange={e => setFlagReason(e.target.value)}
                rows={3}
                placeholder="Optional: add more detail about the issue…"
                className="text-sm resize-none"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setFlagReason(""); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  // Map display label to DB enum value
                  const reasonMap: Record<string, "confusing_wording" | "multiple_correct_answers" | "not_applicable" | "other"> = {
                    "Confusing wording": "confusing_wording",
                    "Multiple correct answers": "multiple_correct_answers",
                    "Doesn't apply to my context": "not_applicable",
                    "Other": "other",
                  };
                  const dbReason = reasonMap[flagReason] ?? "other";
                  flagQuestionMutation.mutate({
                    sessionId: sessionId!,
                    itemId: (nextItem as any).id ?? "unknown",
                    reason: dbReason,
                    comment: !reasonMap[flagReason] ? flagReason : undefined,
                  });
                  setFlagSubmitted(true);
                  setShowFlagDialog(false);
                  setFlagReason("");
                  toast.success("Thank you — this question has been flagged for review.");
                }}
                disabled={!flagReason}
              >
                Submit flag
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* C1: Methodology / How scoring works dialog */}
        <AlertDialog open={showMethodologyDialog} onOpenChange={setShowMethodologyDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                How scoring works
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="text-sm text-muted-foreground space-y-3">
                  <p>
                    Your score for each question is calculated by combining the correctness of your answer with how confident you said you were. This rewards accurate self-assessment as well as knowledge.
                  </p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left px-3 py-2 font-semibold text-foreground">Confidence level</th>
                          <th className="text-left px-3 py-2 font-semibold text-foreground">Description</th>
                          <th className="text-right px-3 py-2 font-semibold text-foreground">Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        <tr>
                          <td className="px-3 py-2 font-medium text-[#DC2626]">Guessing</td>
                          <td className="px-3 py-2 text-muted-foreground">Not sure at all</td>
                          <td className="px-3 py-2 text-right font-mono">0.25×</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-medium text-[#99882A]">Fairly sure</td>
                          <td className="px-3 py-2 text-muted-foreground">I think this is right</td>
                          <td className="px-3 py-2 text-right font-mono">0.65×</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-medium text-[#047857]">Certain</td>
                          <td className="px-3 py-2 text-muted-foreground">Confident in my answer</td>
                          <td className="px-3 py-2 text-right font-mono">1.0×</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p>
                    If you select a correct answer with <strong className="text-foreground">Certain</strong> confidence, you receive the full score. If you select the same correct answer with <strong className="text-foreground">Guessing</strong>, you receive 25% of the score — reflecting that the correct answer may have been luck rather than knowledge.
                  </p>
                  <p>
                    This approach is based on confidence-weighted scoring used in professional capability assessments and is designed to measure genuine knowledge rather than test-taking strategy.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowMethodologyDialog(false)}>Got it</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Save &amp; Exit</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span className="block">Your progress is automatically saved. You are on question {answeredCount + 1} of {totalItems} ({progress}% complete).</span>
                <span className="block">You can resume from exactly where you left off from the Assessment page.</span>
                <span className="block text-amber-600 dark:text-amber-400 text-xs font-medium">
                  ⚠️ Resume window: your session will expire after 48 hours of inactivity. After that, you will need to start a new assessment.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continue Assessment</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  toast.success("Progress saved - resume any time from the Assessment page.");
                  navigate("/assessment");
                }}
              >
                Save &amp; Exit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Question counter + visual progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Question <span style={{ color: "var(--primary)" }}>{answeredCount + 1}</span>
              <span className="text-muted-foreground font-normal"> of {totalItems}</span>
            </span>
            <span className="text-xs font-medium tabular-nums" style={{ color: "var(--primary)" }}>{progress}%</span>
          </div>
          {/* Segmented step dots for small counts; smooth bar for larger */}
          {totalItems <= 30 ? (
            <div className="flex items-center gap-1">
              {Array.from({ length: totalItems }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all duration-300"
                  style={{
                    height: "6px",
                    background: i < answeredCount
                      ? "var(--primary)"
                      : i === answeredCount
                      ? `linear-gradient(90deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 40%, transparent) 100%)`
                      : "var(--muted)",
                    opacity: i > answeredCount ? 0.5 : 1,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 70%, #34D399) 100%)",
                  transition: "width 0.4s ease-out",
                  boxShadow: progress > 0 ? "0 0 8px color-mix(in srgb, var(--primary) 60%, transparent)" : "none",
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* NW-1: Persistent narrative context wrapper */}
      {narrativeContext && <NarrativeWrapper context={narrativeContext} />}

      {/* Question card */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-6 space-y-5">

          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2">
            {/* UX-9: Interaction type badge with tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border cursor-help"
                    style={{
                      color: iConfig.accent,
                      backgroundColor: `${iConfig.accent}12`,
                      borderColor: `${iConfig.accent}30`,
                    }}
                  >
                    <iConfig.icon className="w-3 h-3" />
                    {iConfig.label}
                    <Info className="w-3 h-3 opacity-60" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  <p className="font-semibold mb-0.5">{iConfig.label}</p>
                  <p className="text-muted-foreground">{iConfig.instruction}</p>
                  {INTERACTION_PURPOSE[interactionType] && (
                    <p className="text-muted-foreground mt-1 pt-1 border-t border-border/40">{INTERACTION_PURPOSE[interactionType]}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* A2: humanised capability badge with tooltip */}
            {(nextItem as any).capability && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full border cursor-help"
                      style={{
                        color: capabilityColor,
                        backgroundColor: `${capabilityColor}10`,
                        borderColor: `${capabilityColor}25`,
                      }}
                    >
                      {(nextItem as any).capability}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    <p className="font-semibold mb-0.5">Capability area</p>
                    <p className="text-muted-foreground">
                      {(nextItem as any).capability}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Workflow — R-1: use display-label map, never raw snake_case */}
            {(nextItem as any).workflow && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Briefcase className="w-3 h-3" />
                {WORKFLOW_LABELS[(nextItem as any).workflow] ?? (nextItem as any).workflow.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
              </span>
            )}

            {/* Risk level */}
            {(nextItem as any).riskLevel && (
              <span className={cn("flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", riskConfig.color)}>
                <riskConfig.icon className="w-3 h-3" />
                {(nextItem as any).riskLevel} Risk
              </span>
            )}

            {/* A3: Difficulty level badge only — elapsed timer hidden from UI (retained in telemetry) */}
            <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
              Level {(nextItem as any).difficulty}
            </span>
          </div>

          {/* Title */}
          {(nextItem as any).title && (
            <h2 className="text-base font-semibold text-foreground leading-snug">
              {(nextItem as any).title}
            </h2>
          )}

          {/* Scenario */}
          {(nextItem as any).scenario && (
            <div className="bg-muted/40 rounded-xl p-4 border border-border">
              {/* A1: sentence case label */}
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Scenario
              </p>
              <p className="text-sm text-foreground leading-relaxed">{(nextItem as any).scenario}</p>
            </div>
          )}

          {/* Artefact Block - immersive rendering for email threads, CVs, policy docs, etc. */}
          {artefactType && artefactType !== "none" && (nextItem as any).constraint && !iConfig.hasAiOutput && !iConfig.hasDataContext && (
            <ArtefactBlock content={(nextItem as any).constraint} artefactType={artefactType} />
          )}

          {/* Constraint - only for non-AI-output types and no artefact */}
          {(nextItem as any).constraint && !iConfig.hasAiOutput && !iConfig.hasDataContext && (!artefactType || artefactType === "none") && (
            <div className="bg-[#D97706]/8 rounded-xl p-3 border border-[#D97706]/25">
              <p className="text-xs font-semibold text-[#99882A] mb-1">
                Constraint
              </p>
              <p className="text-sm text-foreground">{(nextItem as any).constraint}</p>
            </div>
          )}

          {/* Risk framing for pressure_test */}
          {interactionType === "pressure_test" && (nextItem as any).constraint && (
            <div className="bg-[#DC2626]/8 rounded-xl p-3 border border-[#DC2626]/25">
              <p className="text-xs font-semibold text-[#CC3344] mb-1">
                Risk factor
              </p>
              <p className="text-sm text-foreground">{(nextItem as any).constraint}</p>
            </div>
          )}

          {/* Governance framing */}
          {interactionType === "ethical_dilemma" && (nextItem as any).constraint && (
            <div className="bg-[#047857]/8 rounded-xl p-3 border border-[#047857]/25">
              <p className="text-xs font-semibold text-[#047857] mb-1">
                Policy context
              </p>
              <p className="text-sm text-foreground">{(nextItem as any).constraint}</p>
            </div>
          )}

          {/* AI Output block - for critique/improvement/error types */}
          {iConfig.hasAiOutput && aiOutput && (
            <AiOutputBlock content={aiOutput} mode={aiOutputMode} />
          )}

          {/* Fallback if AI output type but no aiOutput field */}
          {iConfig.hasAiOutput && !aiOutput && (nextItem as any).constraint && (
            <AiOutputBlock content={(nextItem as any).constraint} mode={aiOutputMode} />
          )}

          {/* Data Context block */}
          {iConfig.hasDataContext && dataContext && (
            <DataContextBlock content={dataContext} />
          )}

          {/* Fallback if data type but no dataContext */}
          {iConfig.hasDataContext && !dataContext && (nextItem as any).constraint && (
            <DataContextBlock content={(nextItem as any).constraint} />
          )}

          {/* B1.1: Interaction purpose moved to tooltip on the badge above — banner removed */}

          {/* Question prompt - A5-04: promoted from text-xs uppercase to text-sm for readability */}
          <div>
            <p
              className="text-sm font-semibold text-foreground leading-snug mb-2"
            >
              {(nextItem as any).question || iConfig.questionLabel}
            </p>
            {/* B1.3: hide generic sub-prompt for scenario_critique — it duplicates the question intent */}
            {interactionType !== "scenario_critique" && (
              <p className="text-xs text-muted-foreground italic border-l-2 pl-3 py-0.5" style={{ borderColor: `${iConfig.accent}50` }}>
                {iConfig.instruction}
              </p>
            )}
          </div>

          {/* Options - UX-4: keyboard hint shown below */}
          {nextItem.options && nextItem.options.length > 0 && (
            <div className="space-y-2">
              {nextItem.options.map((option: any, idx: number) => (
                <button
                  key={option.id ?? idx}
                  onClick={() => { if (selectedValue && selectedValue !== option.value) setRevisionCount(c => c + 1); setSelectedValue(option.value); if (firstInteractionTime === null) setFirstInteractionTime(Date.now()); }}
                  className={cn(
                    "w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all text-sm",
                    selectedValue === option.value
                      ? "border-primary bg-[#047857]/8 ring-1 ring-primary/25"
                      : "border-border hover:border-[var(--navy-400)] hover:bg-muted/30"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5",
                      selectedValue === option.value
                        ? "border-primary bg-primary/80 text-primary-foreground"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{option.label}</span>
                </button>
              ))}
              <p className="text-xs text-muted-foreground pt-1 pl-1">Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-xs font-mono">1</kbd>-<kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-xs font-mono">{nextItem.options.length}</kbd> to select · <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-xs font-mono">Enter</kbd> to submit</p>
            </div>
          )}

          {/* B7: Reasoning text box removed — rationale is driven by option selection only */}

          {/* v10: Three-level confidence staking - A5-05: dimmed until an answer is selected */}
          <div className={cn("space-y-2 pt-1 transition-opacity duration-200", !selectedValue ? "opacity-40 pointer-events-none" : "")}>
            <Label className="text-xs font-semibold text-muted-foreground">
              How confident are you in this answer?
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {(["guessing", "fairly_sure", "certain"] as ConfidenceStake[]).map((stake) => {
                const isSelected = confidenceStake === stake;
                const labels: Record<ConfidenceStake, { label: string; desc: string; weight: string; color: string }> = {
                  guessing:    { label: "Guessing",    desc: "Not sure at all",        weight: "0.25×", color: "#DC2626" },
                  fairly_sure: { label: "Fairly sure", desc: "I think this is right",  weight: "0.65×", color: "#99882A" },
                  certain:     { label: "Certain",     desc: "Confident in my answer", weight: "1.0×",  color: "var(--primary)" },
                };
                const { label, desc, weight, color } = labels[stake];
                return (
                  <button
                    key={stake}
                    type="button"
                    onClick={() => setConfidenceStake(stake)}
                    style={isSelected ? { borderColor: color, backgroundColor: `${color}18`, color } : {}}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-center transition-all ${
                      isSelected
                        ? ""
                        : "border-border hover:border-muted-foreground/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="text-sm font-bold">{label}</span>
                    {/* C1: score multiplier hidden — methodology link shown below */}
                  </button>
                );
              })}
            </div>
          </div>

          {/* D1: Flag this question affordance */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowFlagDialog(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <Flag className="w-3 h-3" />
              Flag this question
            </button>
          </div>

          {/* C1: Methodology note replacing hidden score multipliers */}
          <p className="text-xs text-muted-foreground/50 text-center">
            Confidence weighting is applied to your score.{" "}
            <button
              type="button"
              onClick={() => setShowMethodologyDialog(true)}
              className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
            >
              How scoring works
            </button>
          </p>

          {/* B2: sticky on mobile so Next is always reachable without scrolling */}
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || !selectedValue}
            className="w-full gap-2 sm:static sticky bottom-4"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : answeredCount + 1 === totalItems ? "Submit final answer" : "Next question"}
            {!submitMutation.isPending && <ChevronRight className="w-4 h-4" />}
          </Button>
          {!submitMutation.isPending && selectedValue && (
            <p className="text-center text-xs text-muted-foreground/55 flex items-center justify-center gap-1.5 mt-1">
              <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-border/50 bg-muted/40 font-mono text-xs leading-none">↵</kbd>
              <span>Press Enter to continue</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Post-assessment PRO interstitial — first completion only, free users */}
    {showInterstitial && (
      <PostAssessmentInterstitial
        sessionId={sessionId!}
        overallScore={interstitialScore}
        onContinue={() => {
          setShowInterstitial(false);
          navigate(`/assessment/${sessionId}/results`);
        }}
      />
    )}
    </>
  );
}
