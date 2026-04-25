/**
 * Manager Dashboard — AiQ Platform
 *
 * Team readiness overview with individual detail panel.
 * Anti-comparison design: no ranked lists, no raw score league tables.
 * Primary frame: each team member against their own development trajectory.
 *
 * Competitive improvements (CB-8 through CB-12):
 * - CB-8:  Hero KPI row — larger primary stat (5xl), hero summary statement
 * - CB-9:  Team Insights card — progressive disclosure, most important signal first
 * - CB-10: Action Recommendations panel — Lattice-style suggested next actions
 * - CB-11: Conversation starters for ALL members (not just at-risk)
 * - CB-12: Design language pass — consistent brand tokens throughout
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatSkeleton, CardSkeleton, ChartSkeleton, ListSkeleton } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Users, AlertTriangle, CheckCircle, XCircle, HelpCircle,
  Calendar, TrendingDown, Search, ChevronRight, RefreshCw,
  BarChart3, ShieldAlert, Award, MessageSquare, TrendingUp,
  Layers, Zap, Info, ArrowUpRight, ArrowDownRight, Minus,
  BookOpen, Flame, X, ChevronLeft, Activity, Target, Clock,
  Lightbulb, ArrowRight, Star, UserCheck,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

const READINESS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  safe:    { label: "Safe",    color: "#228833", bg: "#22883315", icon: CheckCircle },
  at_risk: { label: "At Risk", color: "#EE8866", bg: "#EE886615", icon: AlertTriangle },
  unsafe:  { label: "Unsafe",  color: "#EE6677", bg: "#EE667715", icon: XCircle },
  unknown: { label: "Unknown", color: "#9CA3AF", bg: "#9CA3AF15", icon: HelpCircle },
};

const CAP_COLORS: Record<string, string> = {
  ai_interaction: "#4477AA", ai_output_evaluation: "#228833", ai_workflow_design: "#0D9488",
  workforce_ai_readiness: "var(--primary)", ai_ethics_trust: "#AA3377", ai_change_leadership: "#99882A",
};

const CAP_LABELS: Record<string, string> = {
  ai_interaction: "AI Interaction", ai_output_evaluation: "Output Evaluation", ai_workflow_design: "Workflow Design",
  workforce_ai_readiness: "Workforce Readiness", ai_ethics_trust: "Ethics & Trust", ai_change_leadership: "Change Leadership",
};

// Delegation tier logic — deterministic, not ranked
const DELEGATION_TIERS = [
  { key: "autonomous",  label: "Tier 1 — Autonomous",    desc: "Can use AI independently for high-stakes decisions",        color: "#228833", bg: "#22883310", border: "#22883330", test: (m: any) => m.latestReadiness === "safe" && (m.credibility?.band === "high" || m.credibility?.band === "medium") && m.risk?.band !== "high" },
  { key: "supervised",  label: "Tier 2 — Supervised",    desc: "Can use AI with peer or manager review of key outputs",      color: "#4477AA", bg: "#4477AA10", border: "#4477AA30", test: (m: any) => m.latestReadiness === "at_risk" || (m.latestReadiness === "safe" && m.risk?.band === "high") },
  { key: "restricted",  label: "Tier 3 — Restricted",    desc: "AI use should be limited to low-stakes, supervised tasks",   color: "#EE8866", bg: "#EE886610", border: "#EE886630", test: (m: any) => m.latestReadiness === "unsafe" && m.risk?.band !== "high" },
  { key: "paused",      label: "Tier 4 — Paused",        desc: "AI use should be paused pending capability development",     color: "#EE6677", bg: "#EE667710", border: "#EE667730", test: (m: any) => m.latestReadiness === "unsafe" && m.risk?.band === "high" },
  { key: "unassessed",  label: "Unassessed",             desc: "No assessment data — tier cannot be assigned",              color: "#9CA3AF", bg: "#9CA3AF10", border: "#9CA3AF30", test: (m: any) => !m.latestReadiness },
];

function getDelegationTier(m: any) {
  return DELEGATION_TIERS.find(t => t.test(m)) ?? DELEGATION_TIERS[4];
}

function getDelegationGuidance(m: any): string[] {
  const tier = getDelegationTier(m);
  if (tier.key === "autonomous") return [
    "Can be assigned AI-assisted analysis tasks independently.",
    "Suitable for reviewing and acting on AI-generated recommendations.",
    "Can mentor peers on responsible AI use.",
  ];
  if (tier.key === "supervised") return [
    "AI-assisted outputs should be reviewed before acting on them.",
    "Pair with a Tier 1 colleague for high-stakes AI tasks.",
    "Focus development on the weakest capability domain.",
  ];
  if (tier.key === "restricted") return [
    "Limit AI use to low-stakes, reversible tasks only.",
    "Avoid assigning AI-generated content for external use without review.",
    "Prioritise completing the active learning plan before expanding AI scope.",
  ];
  if (tier.key === "paused") return [
    "Do not assign AI-dependent tasks until reassessment is complete.",
    "Schedule a capability conversation this week.",
    "Refer to HR if there are concerns about AI misuse patterns.",
  ];
  return [
    "Assessment not yet completed — capability tier cannot be assigned.",
    "Encourage completion of the initial assessment.",
    "No AI task delegation guidance is available without assessment data.",
  ];
}

/** CB-11: Conversation starters for ALL members — tailored by readiness state */
function getConversationStarters(m: any): string[] {
  const tier = getDelegationTier(m);
  const firstName = m.firstName ?? "them";
  const weakDomain = m.capabilityShape
    ? Object.entries(m.capabilityShape as Record<string, number>)
        .sort(([, a], [, b]) => a - b)[0]?.[0]
    : null;
  const weakLabel = weakDomain ? (CAP_LABELS[weakDomain] ?? weakDomain) : "their development area";

  if (m.latestReadiness === "safe") return [
    `"${firstName}, you're in a strong position with AI capability — are there areas where you'd like to go deeper or take on more complex AI tasks?"`,
    `"What's the most useful AI workflow you've used recently? I'd love to share that with the team."`,
    `"Are there any AI tools or approaches you'd like to explore that we haven't given you access to yet?"`,
  ];
  if (m.latestReadiness === "at_risk") return [
    `"${firstName}, your assessment shows you're building capability — what's feeling most challenging right now?"`,
    `"Your ${weakLabel} score has room to grow. What would help you feel more confident there?"`,
    `"I want to make sure you have the right support — is there anything blocking you from completing your learning modules?"`,
  ];
  if (m.latestReadiness === "unsafe") return [
    `"${firstName}, I want to have a supportive conversation about your AI capability development — this isn't about performance, it's about making sure you have the right tools."`,
    `"Your assessment flagged ${weakLabel} as a priority area. What's your current understanding of that domain?"`,
    `"I'd like to set up a structured development plan together — what would feel most useful as a starting point?"`,
  ];
  if (tier.key === "unassessed") return [
    `"${firstName}, we haven't got your AI capability assessment on file yet — I'd like to understand where you're at."`,
    `"The assessment takes about 20 minutes and gives you a personalised development plan. When could you fit that in?"`,
    `"Is there anything about the assessment process I can clarify before you get started?"`,
  ];
  return [
    `"${firstName}, how are you finding the AI tools we're using as a team?"`,
    `"What would help you feel more confident using AI in your day-to-day work?"`,
    `"Are there any AI-related questions or concerns you'd like to talk through?"`,
  ];
}

function ReadinessBadge({ readiness }: { readiness: string | null }) {
  const meta = READINESS_META[readiness ?? "unknown"] ?? READINESS_META.unknown;
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: meta.bg, color: meta.color }}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function DistributionRing({ distribution }: { distribution: { safe: number; atRisk: number; unsafe: number; unknown: number; total: number } }) {
  const { safe, atRisk, unsafe, unknown, total } = distribution;
  const segments = [
    { value: safe,    color: "#228833", label: "Safe" },
    { value: atRisk,  color: "#EE8866", label: "At Risk" },
    { value: unsafe,  color: "#EE6677", label: "Unsafe" },
    { value: unknown, color: "#9CA3AF", label: "Unknown" },
  ];
  const r = 44;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const arcs = segments.map(s => {
    const dash = total > 0 ? (s.value / total) * circ : 0;
    const arc = { ...s, dash, offset };
    offset += dash;
    return arc;
  });
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-28 h-28 flex-shrink-0">
        <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
          <circle cx="56" cy="56" r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
          {arcs.map((arc, i) => (
            <circle key={i} cx="56" cy="56" r={r} fill="none" stroke={arc.color} strokeWidth="12"
              strokeDasharray={`${arc.dash} ${circ}`} strokeDashoffset={-arc.offset} strokeLinecap="butt" />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{total}</span>
          <span className="text-xs text-muted-foreground">total</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <span className="text-xs font-bold text-foreground ml-auto">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Individual Member Detail Panel ──────────────────────────────────────────
function MemberDetailPanel({ member, onClose }: { member: any; onClose: () => void }) {
  const [showStarters, setShowStarters] = useState(false);
  const tier = getDelegationTier(member);
  const guidance = getDelegationGuidance(member);
  const starters = getConversationStarters(member);
  const history = ((member.scoreHistory ?? []) as Array<{ sessionId: string; completedAt: Date | null; overallScore: number; readiness: string | null }>).slice().reverse();
  const first = history[0]?.overallScore;
  const last = history[history.length - 1]?.overallScore;
  const delta = first != null && last != null ? last - first : null;
  const trend = delta == null ? "unknown" : delta > 3 ? "improving" : delta < -3 ? "declining" : "stable";
  const trendColor = trend === "improving" ? "#228833" : trend === "declining" ? "#EE6677" : "#9CA3AF";
  const TrendIcon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;
  const capShape = member.capabilityShape as Record<string, number> | null;
  const revalDays = member.revalidationDue
    ? Math.ceil((new Date(member.revalidationDue).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-md bg-background border-l border-border shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background z-10">
          <div>
            <h2 className="text-base font-bold text-foreground">{member.firstName} {member.lastName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{member.roleFamily ?? member.jobFunction ?? member.email}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5 space-y-6 flex-1">
          {/* Readiness + conversation-due */}
          <div className="flex items-center gap-3 flex-wrap">
            <ReadinessBadge readiness={member.latestReadiness} />
            {member.conversationDue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#EE8866]/10 text-[#EE8866] border border-[#EE8866]/30">
                <MessageSquare className="w-3 h-3" />Conversation due
              </span>
            )}
            {revalDays != null && revalDays <= 14 && (
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                revalDays <= 0 ? "bg-[#EE6677]/10 text-[#EE6677] border border-[#EE6677]/30" : "bg-[#EE8866]/10 text-[#EE8866] border border-[#EE8866]/30")}>
                <Calendar className="w-3 h-3" />
                {revalDays <= 0 ? "Revalidation overdue" : `Revalidation in ${revalDays}d`}
              </span>
            )}
          </div>

          {/* CB-11: Conversation Starters — for ALL members */}
          <div>
            <button
              className="w-full flex items-center justify-between text-left group"
              onClick={() => setShowStarters(v => !v)}
            >
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                Conversation Starters
              </h3>
              <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", showStarters && "rotate-90")} />
            </button>
            {showStarters && (
              <div className="mt-3 space-y-2">
                {starters.map((s, i) => (
                  <div key={i} className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs text-foreground leading-relaxed italic">{s}</p>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-1">
                  These are suggested starting points — adapt them to your own style and relationship.
                </p>
              </div>
            )}
          </div>

          {/* Section 1: This week */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />This Week
            </h3>
            {member.activeModule ? (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-[#4477AA] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug">{member.activeModule.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {CAP_LABELS[member.activeModule.capability] ?? member.activeModule.capability}
                      {" · "}{member.activeModule.durationMins} min
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{Math.round(member.activeModule.progressPercent)}%</span>
                  </div>
                  <Progress value={member.activeModule.progressPercent} className="h-1.5" />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">No active module this week.</p>
                <p className="text-xs text-muted-foreground mt-0.5">Consider nudging them to start their next module.</p>
              </div>
            )}
          </div>

          {/* Section 2: Delegation guidance */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />Delegation Guidance
            </h3>
            <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: tier.border, backgroundColor: tier.bg }}>
              <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: tier.color, border: `1px solid ${tier.border}` }}>
                {tier.label}
              </span>
              <p className="text-xs text-muted-foreground">{tier.desc}</p>
              <ul className="space-y-1.5 mt-1">
                {guidance.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Guidance is based on assessed capability and risk profile, not on personal judgement.
            </p>
          </div>

          {/* Section 3: Development trajectory */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />Development Trajectory
            </h3>
            {history.length >= 2 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendIcon className="w-4 h-4" style={{ color: trendColor }} />
                  <span className="text-sm font-semibold capitalize" style={{ color: trendColor }}>{trend}</span>
                  {delta != null && (
                    <span className="text-xs text-muted-foreground">
                      ({delta > 0 ? "+" : ""}{Math.round(delta)} across {history.length} assessments)
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-1 h-14">
                  {history.map((h, i) => {
                    const RSTATE_COLORS: Record<string, string> = { safe: "#228833", at_risk: "#EE8866", unsafe: "#EE6677" };
                    const barColor = RSTATE_COLORS[h.readiness ?? "unknown"] ?? "#9CA3AF";
                    const barH = Math.max(4, Math.round((h.overallScore / 100) * 56));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${Math.round(h.overallScore)} — ${h.readiness ?? "unknown"}`}>
                        <div className="w-full rounded-sm" style={{ height: barH, backgroundColor: barColor, opacity: 0.8 }} />
                        <span className="text-[9px] text-muted-foreground tabular-nums">{Math.round(h.overallScore)}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Bar height reflects readiness band, not a ranked score. Each bar is one completed assessment.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  {history.length === 0 ? "No assessment data yet." : "One assessment completed. Trajectory requires at least two."}
                </p>
              </div>
            )}

            {/* Capability shape */}
            {capShape && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Capability Shape</p>
                {Object.entries(capShape).map(([key, score]) => (
                  <div key={key} className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{CAP_LABELS[key] ?? key}</span>
                      <span className="font-semibold text-foreground" style={{ color: CAP_COLORS[key] }}>
                        {score < 40 ? "Developing" : score < 65 ? "Building" : score < 80 ? "Practitioner" : "Advanced"}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: CAP_COLORS[key] ?? "#4477AA" }} />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground italic mt-1">
                  Bands reflect development state, not a comparative ranking.
                </p>
              </div>
            )}
          </div>

          {/* Risk & credibility */}
          {(member.risk || member.credibility) && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />Signal Quality
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {member.risk?.band && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Risk Band</p>
                    <p className={cn("text-sm font-bold capitalize",
                      member.risk.band === "high" ? "text-[#EE6677]" : member.risk.band === "medium" ? "text-[#EE8866]" : "text-[#228833]")}>
                      {member.risk.band}
                    </p>
                  </div>
                )}
                {member.credibility?.band && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Credibility</p>
                    <p className={cn("text-sm font-bold capitalize",
                      member.credibility.band === "high" ? "text-[#228833]" : member.credibility.band === "medium" ? "text-[#EE8866]" : "text-[#EE6677]")}>
                      {member.credibility.band}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CB-10: Action Recommendations Panel ─────────────────────────────────────
function ActionRecommendationsPanel({ team, revalDueSoon, conversationDueMembers, capGaps, onSelectMember }: {
  team: any[];
  revalDueSoon: any[];
  conversationDueMembers: any[];
  capGaps: any[];
  onSelectMember: (m: any) => void;
}) {
  const actions: Array<{ priority: "high" | "medium" | "low"; icon: any; label: string; detail: string; cta?: string; member?: any }> = [];

  // High-priority: urgent conversations
  const urgentConversation = conversationDueMembers[0];
  if (urgentConversation) {
    actions.push({
      priority: "high",
      icon: MessageSquare,
      label: `Schedule a conversation with ${urgentConversation.firstName} ${urgentConversation.lastName}`,
      detail: `Readiness: ${urgentConversation.latestReadiness ?? "unknown"} — a check-in is recommended.`,
      cta: "Open profile",
      member: urgentConversation,
    });
  }

  // High-priority: revalidation overdue
  const overdueReval = team.filter(m => m.revalidationDue && new Date(m.revalidationDue) < new Date());
  if (overdueReval.length > 0) {
    actions.push({
      priority: "high",
      icon: Calendar,
      label: `${overdueReval.length} revalidation${overdueReval.length > 1 ? "s" : ""} overdue`,
      detail: `${overdueReval.map((m: any) => m.firstName).slice(0, 3).join(", ")}${overdueReval.length > 3 ? ` +${overdueReval.length - 3} more` : ""} — capability profiles may be stale.`,
    });
  }

  // Medium-priority: revalidations due soon
  if (revalDueSoon.length > 0 && overdueReval.length === 0) {
    actions.push({
      priority: "medium",
      icon: Clock,
      label: `${revalDueSoon.length} revalidation${revalDueSoon.length > 1 ? "s" : ""} due in the next 14 days`,
      detail: `${revalDueSoon.map((m: any) => m.firstName).slice(0, 3).join(", ")}${revalDueSoon.length > 3 ? ` +${revalDueSoon.length - 3} more` : ""} — plan ahead to avoid gaps.`,
    });
  }

  // Medium-priority: weakest capability domain
  const weakestDomain = capGaps.length > 0 ? capGaps[0] : null;
  if (weakestDomain) {
    actions.push({
      priority: "medium",
      icon: Target,
      label: `Team's weakest domain: ${CAP_LABELS[weakestDomain.capability] ?? weakestDomain.capability}`,
      detail: `Average band score ${Math.round(weakestDomain.avgScore ?? 0)} — consider a group learning session or shared resource.`,
    });
  }

  // Low-priority: unassessed members
  const unassessed = team.filter(m => !m.latestReadiness || m.latestReadiness === null);
  if (unassessed.length > 0) {
    actions.push({
      priority: "low",
      icon: UserCheck,
      label: `${unassessed.length} team member${unassessed.length > 1 ? "s" : ""} yet to complete an assessment`,
      detail: `No capability tier can be assigned without assessment data.`,
    });
  }

  if (actions.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-6 text-center">
          <CheckCircle className="w-8 h-8 text-[#228833] mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">All clear</p>
          <p className="text-xs text-muted-foreground mt-1">No recommended actions at this time.</p>
        </CardContent>
      </Card>
    );
  }

  const priorityMeta = {
    high:   { label: "Urgent",   color: "#EE6677", bg: "#EE667710", border: "#EE667730" },
    medium: { label: "This week", color: "#EE8866", bg: "#EE886610", border: "#EE886630" },
    low:    { label: "When ready", color: "#4477AA", bg: "#4477AA10", border: "#4477AA30" },
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />Recommended Actions
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Suggested next steps based on your team's current readiness profile.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {actions.map((action, i) => {
            const pm = priorityMeta[action.priority];
            const Icon = action.icon;
            return (
              <div key={i} className="flex items-start gap-3 rounded-lg border p-3"
                style={{ borderColor: pm.border, backgroundColor: pm.bg }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${pm.color}20` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: pm.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground leading-snug">{action.label}</p>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ color: pm.color, backgroundColor: `${pm.color}20` }}>
                      {pm.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.detail}</p>
                  {action.cta && action.member && (
                    <button
                      onClick={() => onSelectMember(action.member)}
                      className="mt-1.5 text-xs font-medium flex items-center gap-1 hover:underline"
                      style={{ color: pm.color }}>
                      {action.cta} <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── CB-9: Team Insights Card (progressive disclosure) ────────────────────────
function TeamInsightsCard({ team, dist, capGaps }: { team: any[]; dist: any; capGaps: any[] }) {
  const total = dist?.total ?? 0;
  const safe = dist?.safe ?? 0;
  const atRisk = (dist?.atRisk ?? 0) + (dist?.unsafe ?? 0);
  const unassessed = team.filter(m => !m.latestReadiness).length;
  const improving = team.filter(m => {
    const history = (m.scoreHistory ?? []) as Array<{ overallScore: number }>;
    if (history.length < 2) return false;
    const first = history[0]?.overallScore;
    const last = history[history.length - 1]?.overallScore;
    return last != null && first != null && last - first > 3;
  }).length;

  // Pick the single most important insight
  let headline = "";
  let subtext = "";
  let color = "#4477AA";

  if (total === 0) {
    headline = "No team data yet";
    subtext = "Encourage your team to complete their AI capability assessment.";
    color = "#9CA3AF";
  } else if (unassessed > 0 && unassessed === total) {
    headline = "No assessments completed";
    subtext = "Your team hasn't completed any assessments yet — capability tiers cannot be assigned.";
    color = "#9CA3AF";
  } else if (atRisk > 0 && atRisk / total >= 0.5) {
    headline = `${atRisk} of ${total} team members need attention`;
    subtext = "More than half your team is at-risk or unsafe. Consider a group development session.";
    color = "#EE6677";
  } else if (safe > 0 && safe / total >= 0.7) {
    headline = `${safe} of ${total} team members are AI-ready`;
    subtext = improving > 0 ? `${improving} members are actively improving. Your team is in a strong position.` : "Your team is in a strong position for AI-assisted work.";
    color = "#228833";
  } else if (improving > 0) {
    headline = `${improving} team member${improving > 1 ? "s are" : " is"} on an improving trajectory`;
    subtext = "Development is progressing. Keep the momentum going with regular check-ins.";
    color = "var(--primary)";
  } else {
    headline = `${safe} of ${total} team members are AI-ready`;
    subtext = atRisk > 0 ? `${atRisk} member${atRisk > 1 ? "s" : ""} need support to reach readiness.` : "Continue monitoring as assessments are completed.";
    color = safe > 0 ? "#228833" : "#9CA3AF";
  }

  return (
    <div className="rounded-xl border p-5 flex items-start gap-4"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}0A` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20` }}>
        <BarChart3 className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug" style={{ color }}>{headline}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{subtext}</p>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const { data, isLoading } = trpc.dashboard.manager.useQuery();
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" /><Skeleton className="h-64" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const dist = data?.distribution;
  const capGaps = data?.capabilityGaps ?? [];
  const team = data?.team ?? [];

  const filtered = team.filter(m =>
    !search || `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const revalDueSoon = team
    .filter(m => {
      if (!m.revalidationDue) return false;
      const days = Math.ceil((new Date(m.revalidationDue).getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 14;
    })
    .sort((a, b) => new Date(a.revalidationDue!).getTime() - new Date(b.revalidationDue!).getTime())
    .slice(0, 5);

  const highRiskMembers = team
    .filter(m => (m as any).risk?.band === "high" || m.latestReadiness === "unsafe")
    .slice(0, 5);

  const conversationDueMembers = team.filter(m => (m as any).conversationDue);

  const total = dist?.total ?? 0;
  const safe = dist?.safe ?? 0;
  const atRisk = (dist?.atRisk ?? 0) + (dist?.unsafe ?? 0);

  return (
    <>
      {selectedMember && (
        <MemberDetailPanel member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}

      <div className="p-6 space-y-6 max-w-7xl">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Team</h1>
            <p className="text-muted-foreground mt-1 text-sm">AI capability intelligence across your team</p>
          </div>
          <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => window.location.reload()}>
            <RefreshCw className="w-3 h-3" />Refresh
          </Button>
        </div>

        {/* CB-9: Team Insights — progressive disclosure, most important signal first */}
        {total > 0 && (
          <TeamInsightsCard team={team} dist={dist} capGaps={capGaps} />
        )}

        {/* CB-8: Hero KPI row — larger primary stat, hero summary statement */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Team Members",        value: total,                                                      icon: Users,         color: "#4477AA" },
            { label: "AI-Ready",            value: safe,                                                       icon: CheckCircle,   color: "#228833" },
            { label: "Need Support",        value: atRisk,                                                     icon: AlertTriangle, color: "#EE6677" },
            { label: "Conversations Due",   value: conversationDueMembers.length,                              icon: MessageSquare, color: "#EE8866" },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label} className="border-border">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                      <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  </div>
                  {/* CB-8: 5xl primary stat */}
                  <p className="text-5xl font-bold text-foreground leading-none">{kpi.value}</p>
                  {total > 0 && kpi.label !== "Team Members" && kpi.label !== "Conversations Due" && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {Math.round((kpi.value / total) * 100)}% of team
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CB-10: Action Recommendations */}
        <ActionRecommendationsPanel
          team={team}
          revalDueSoon={revalDueSoon}
          conversationDueMembers={conversationDueMembers}
          capGaps={capGaps}
          onSelectMember={setSelectedMember}
        />

        {/* Distribution + Capability gaps */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-[#4477AA]" />Readiness Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dist ? (
                <DistributionRing distribution={dist} />
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-[#EE6677]" />Capability Gaps (Team Average)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {capGaps.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={capGaps.map(g => ({ name: CAP_LABELS[g.capability] ?? g.capability, score: g.avgScore ?? 0 }))}
                    layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={120} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`${v}`, "Avg Band Score"]} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {capGaps.map((g, i) => (
                        <Cell key={i} fill={CAP_COLORS[g.capability] ?? "#4477AA"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">No assessment data yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alerts: Conversations due + Revalidation due */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#EE8866]" />Conversations Due
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Members with overdue revalidation or high risk band — a conversation is recommended</p>
            </CardHeader>
            <CardContent>
              {conversationDueMembers.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-8 h-8 text-[#228833] mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No urgent conversations needed</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversationDueMembers.slice(0, 5).map(m => (
                    <button key={m.id} onClick={() => setSelectedMember(m)}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-[#CCBB44]/5 border border-[#CCBB44]/15 hover:bg-[#CCBB44]/10 transition-colors text-left">
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-muted-foreground">{m.jobFunction ?? m.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ReadinessBadge readiness={m.latestReadiness} />
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                  {conversationDueMembers.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">+{conversationDueMembers.length - 5} more</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#EE8866]" />Revalidation Due (14 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revalDueSoon.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No revalidations due soon</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {revalDueSoon.map(m => {
                    const days = Math.ceil((new Date(m.revalidationDue!).getTime() - Date.now()) / 86400000);
                    return (
                      <button key={m.id} onClick={() => setSelectedMember(m)}
                        className="w-full flex items-center justify-between p-2 rounded-lg bg-[#CCBB44]/5 border border-[#CCBB44]/15 hover:bg-[#CCBB44]/10 transition-colors text-left">
                        <div>
                          <p className="text-sm font-medium text-foreground">{m.firstName} {m.lastName}</p>
                          <p className="text-xs text-muted-foreground">{m.jobFunction ?? m.email}</p>
                        </div>
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                          days <= 3 ? "bg-[#EE6677]/10 text-[#EE6677]" : "bg-[#EE8866]/10 text-[#EE8866]")}>
                          {days}d
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delegation Tiers — aggregated, no ranked list */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#4477AA]" />Delegation Tiers
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Recommended AI task delegation level based on assessed capability and risk profile.
              Click a name to open their individual detail.
            </p>
          </CardHeader>
          <CardContent>
            {team.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">No team data</div>
            ) : (
              <div className="space-y-2">
                {DELEGATION_TIERS.map(tier => {
                  const members = team.filter(tier.test);
                  if (members.length === 0) return null;
                  return (
                    <div key={tier.key} className="rounded-lg border p-3" style={{ borderColor: tier.border, backgroundColor: tier.bg }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: tier.color, backgroundColor: tier.bg, border: `1px solid ${tier.border}` }}>{tier.label}</span>
                          <span className="text-xs text-muted-foreground">{tier.desc}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: tier.color }}>{members.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {members.slice(0, 8).map(m => (
                          <button key={m.id} onClick={() => setSelectedMember(m)}
                            className="text-xs px-2 py-0.5 rounded-full bg-background border border-border text-foreground hover:bg-muted transition-colors">
                            {m.firstName} {m.lastName}
                          </button>
                        ))}
                        {members.length > 8 && <span className="text-xs text-muted-foreground">+{members.length - 8} more</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Misuse Friction Indicators */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#EE8866]" />Misuse Friction Indicators
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Patterns that may indicate AI misuse risk or over-reliance</p>
          </CardHeader>
          <CardContent>
            {team.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">No team data</div>
            ) : (() => {
              const indicators = [
                {
                  label: "High risk + safe classification",
                  desc: "High risk score despite safe readiness — may indicate gaming or inconsistent behaviour",
                  members: team.filter(m => (m as any).risk?.band === "high" && m.latestReadiness === "safe"),
                  color: "#EE8866",
                },
                {
                  label: "Low credibility + safe classification",
                  desc: "Low credibility band suggests inconsistent or low-confidence responses despite safe classification",
                  members: team.filter(m => (m as any).credibility?.band === "low" && m.latestReadiness === "safe"),
                  color: "#EE6677",
                },
                {
                  label: "Overdue revalidation",
                  desc: "Assessment is overdue — capability profile may no longer reflect current practice",
                  members: team.filter(m => m.revalidationDue && new Date(m.revalidationDue) < new Date()),
                  color: "#99882A",
                },
              ].filter(i => i.members.length > 0);
              if (indicators.length === 0) return (
                <div className="text-center py-6">
                  <CheckCircle className="w-8 h-8 text-[#228833] mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No friction indicators detected</p>
                </div>
              );
              return (
                <div className="space-y-3">
                  {indicators.map(ind => (
                    <div key={ind.label} className="rounded-lg border p-3" style={{ borderColor: `${ind.color}30`, backgroundColor: `${ind.color}08` }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: ind.color }} />
                        <span className="text-xs font-semibold" style={{ color: ind.color }}>{ind.label} ({ind.members.length})</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{ind.desc}</p>
                      <div className="flex flex-wrap gap-1">
                        {ind.members.slice(0, 5).map(m => (
                          <button key={m.id} onClick={() => setSelectedMember(m)}
                            className="text-xs px-1.5 py-0.5 rounded bg-background border border-border text-foreground hover:bg-muted transition-colors">
                            {m.firstName} {m.lastName[0]}.
                          </button>
                        ))}
                        {ind.members.length > 5 && <span className="text-xs text-muted-foreground">+{ind.members.length - 5}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Team table — anti-comparison: no raw score column, no ranking */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#4477AA]" />Team Members ({filtered.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Click any row to open the individual detail panel</p>
              </div>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search members..." className="pl-8 h-8 text-xs"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Name", "Role / Function", "Readiness", "Delegation Tier", "Active Module", "Last Assessed", ""].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground pb-2 pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => {
                    const tier = getDelegationTier(m);
                    const hasConversation = (m as any).conversationDue;
                    return (
                      <tr key={m.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedMember(m)}>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium text-foreground">{m.firstName} {m.lastName}</p>
                              <p className="text-xs text-muted-foreground">{m.email}</p>
                            </div>
                            {hasConversation && (
                              <span title="Conversation due" className="w-2 h-2 rounded-full bg-[#EE8866] flex-shrink-0" />
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                          {m.roleFamily ?? m.jobFunction ?? "—"}
                        </td>
                        <td className="py-2.5 pr-4">
                          <ReadinessBadge readiness={m.latestReadiness} />
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className="text-xs font-semibold" style={{ color: tier.color }}>{tier.label}</span>
                        </td>
                        <td className="py-2.5 pr-4">
                          {(m as any).activeModule ? (
                            <div className="max-w-[180px]">
                              <p className="text-xs text-foreground truncate">{(m as any).activeModule.title}</p>
                              <p className="text-xs text-muted-foreground">{Math.round((m as any).activeModule.progressPercent)}% complete</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                          {m.lastAssessedAt ? new Date(m.lastAssessedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) : "Never"}
                        </td>
                        <td className="py-2.5">
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">No members found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Learning Overview */}
        <LearningOverviewSection />
      </div>
    </>
  );
}

function LearningOverviewSection() {
  const { data, isLoading } = trpc.adaptiveLearning.getTeamLearningProgress.useQuery();
  const members = data?.members ?? [];
  const avgCompletion = members.length > 0
    ? Math.round(members.reduce((s, m) => s + (m.plan?.progressPct ?? 0), 0) / members.length)
    : 0;
  const activeStreaks = members.filter(m => (m.streak?.currentStreak ?? 0) > 0).length;
  const noActivity = members.filter(m => !m.streak?.totalModulesCompleted || m.streak.currentStreak === 0).length;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#4477AA]" />
            Team Learning Overview
          </CardTitle>
          <Link href="/manager/team-learning">
            <Button variant="ghost" size="sm" className="text-xs h-7">
              View all <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">AI capability module completion and learning streaks across your team</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ListSkeleton items={3} hasIcon={false} />
        ) : members.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">No team members yet</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-bold">{avgCompletion}%</div>
                <div className="text-xs text-muted-foreground">Avg completion</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-bold text-[#99882A]">{activeStreaks}</div>
                <div className="text-xs text-muted-foreground">Active streaks</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-bold text-[#EE8866]">{noActivity}</div>
                <div className="text-xs text-muted-foreground">No activity</div>
              </div>
            </div>
            <div className="space-y-2">
              {members.slice(0, 5).map(m => (
                <div key={m.userId} className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground w-28 truncate">{m.name}</div>
                  <Progress value={m.plan?.progressPct ?? 0} className="flex-1 h-1.5" />
                  <div className="text-xs tabular-nums w-8 text-right">{m.plan?.progressPct ?? 0}%</div>
                  {(m.streak?.currentStreak ?? 0) > 0 && (
                    <Flame className="h-3 w-3 text-[#99882A] shrink-0" />
                  )}
                </div>
              ))}
              {members.length > 5 && (
                <div className="text-xs text-muted-foreground text-center pt-1">+{members.length - 5} more</div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
