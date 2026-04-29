/**
 * MemberReportPage — PR-06
 *
 * Full individual assessment report for a specific org member.
 * Accessible to HR leaders (all org members) and managers (direct reports only).
 * Shows: profile header, readiness verdict, capability radar, score history,
 * narrative, governance flags, and a link back to the People list.
 */

import { useParams, Link } from "wouter";
import {
  ArrowLeft, User, CheckCircle2, AlertTriangle, Clock, UserX,
  TrendingUp, TrendingDown, Minus, ShieldAlert, BookOpen,
  BarChart3, Calendar, Briefcase,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReadinessState = "safe" | "at_risk" | "unsafe" | "unknown";

const READINESS_CONFIG: Record<ReadinessState, {
  label: string; description: string;
  bg: string; border: string; text: string; icon: React.ReactNode;
}> = {
  safe: {
    label: "AI-Ready",
    description: "Demonstrates reliable AI judgement across all core capabilities.",
    bg: "bg-[#047857]/10", border: "border-[#047857]/30", text: "text-[#047857]",
    icon: <CheckCircle2 className="w-5 h-5" />,
  },
  at_risk: {
    label: "Developing",
    description: "Capability gaps identified in one or more domains. Structured learning recommended.",
    bg: "bg-[#D97706]/10", border: "border-[#D97706]/30", text: "text-[#D97706]",
    icon: <Clock className="w-5 h-5" />,
  },
  unsafe: {
    label: "Foundation Gap",
    description: "Core AI interaction skills require development before independent AI tool use.",
    bg: "bg-[#DC2626]/10", border: "border-[#DC2626]/30", text: "text-[#DC2626]",
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  unknown: {
    label: "Unknown",
    description: "Readiness state could not be determined.",
    bg: "bg-muted", border: "border-border", text: "text-muted-foreground",
    icon: <UserX className="w-5 h-5" />,
  },
};

// ─── Capability bar ───────────────────────────────────────────────────────────

function CapabilityBar({ name, score, colour }: { name: string; score: number; colour: string }) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground font-medium">{name}</span>
        <span className="font-mono text-muted-foreground">{Math.round(pct)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: colour }}
        />
      </div>
    </div>
  );
}

// ─── Score trend ──────────────────────────────────────────────────────────────

function ScoreTrend({ history }: { history: Array<{ completedAt: number | null; overallScore: number; readinessState: string }> }) {
  if (history.length < 2) return null;
  const latest = history[0].overallScore;
  const prev = history[1].overallScore;
  const delta = latest - prev;
  const Icon = delta > 2 ? TrendingUp : delta < -2 ? TrendingDown : Minus;
  const colour = delta > 2 ? "text-[#047857]" : delta < -2 ? "text-[#DC2626]" : "text-muted-foreground";
  return (
    <div className={`flex items-center gap-1 text-sm font-medium ${colour}`}>
      <Icon className="w-4 h-4" />
      <span>{delta > 0 ? "+" : ""}{Math.round(delta)} vs previous</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemberReportPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId ?? "";

  const { data, isLoading, error } = trpc.people.getMemberReport.useQuery(
    { userId },
    { enabled: !!userId }
  );

  if (error) {
    const isForbidden = error.data?.code === "FORBIDDEN" || error.data?.httpStatus === 403;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <AlertTriangle className="w-10 h-10 text-[#DC2626]" />
        <p className="text-lg font-semibold">
          {isForbidden ? "Access Restricted" : "Report Unavailable"}
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          {isForbidden
            ? "You can only view reports for your direct reports. Contact your HR leader for access to this profile."
            : error.message}
        </p>
        <Link href="/people">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isForbidden ? "Back to My Team" : "Back to People"}
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="bg-card border border-border rounded-xl p-6 flex gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const { user, latest, longitudinal, totalSessions } = data;
  const readinessState = (latest?.readinessState ?? "unknown") as ReadinessState;
  const cfg = READINESS_CONFIG[readinessState] ?? READINESS_CONFIG.unknown;
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

  const capabilityEntries = latest
    ? Object.entries(latest.capabilityScores).sort((a, b) => b[1].score - a[1].score)
    : [];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Back nav */}
      <div>
        <Link href="/people">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {data.isLeader ? "People Reports" : "Team Reports"}
          </Button>
        </Link>
      </div>

      {/* Profile header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {user.jobFunction && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Briefcase className="w-3 h-3" />
                  {user.jobFunction}
                </span>
              )}
              {user.roleFamily && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  {user.roleFamily}
                </span>
              )}
              {user.sector && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpen className="w-3 h-3" />
                  {user.sector}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-xs text-muted-foreground">{totalSessions} assessment{totalSessions !== 1 ? "s" : ""} completed</span>
            {latest?.completedAt && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {new Date(latest.completedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* No assessment state */}
      {!latest && (
        <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center gap-3 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No completed assessments yet.</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {user.firstName} has not completed an AI readiness assessment. Encourage them to complete one to unlock their full capability profile.
          </p>
        </div>
      )}

      {/* Readiness verdict */}
      {latest && (
        <div className={`rounded-xl border p-5 ${cfg.bg} ${cfg.border}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${cfg.text}`}>{cfg.icon}</div>
              <div>
                <p className={`text-base font-bold ${cfg.text}`}>{cfg.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{cfg.description}</p>
                {latest.readinessDescription && (
                  <p className="text-sm text-foreground mt-2 leading-relaxed">{latest.readinessDescription}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`text-3xl font-bold font-mono ${cfg.text}`}>
                {Math.round(latest.overallScore)}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
              <ScoreTrend history={longitudinal} />
            </div>
          </div>

          {/* Governance flag */}
          {latest.governanceFlag && (
            <div className="mt-4 flex items-center gap-2 text-xs text-[#DC2626] bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-lg px-3 py-2">
              <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Governance concern detected — review AI tool access policy for this individual.</span>
            </div>
          )}
        </div>
      )}

      {/* Capability breakdown */}
      {latest && capabilityEntries.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Capability Breakdown</h2>
          <div className="flex flex-col gap-3">
            {capabilityEntries.map(([key, val]) => (
              <CapabilityBar
                key={key}
                name={val.displayName}
                score={val.score}
                colour={val.colour}
              />
            ))}
          </div>
        </div>
      )}

      {/* Narrative */}
      {latest?.narrative && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Assessment Narrative</h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{latest.narrative}</p>
        </div>
      )}

      {/* Score history */}
      {longitudinal.length > 1 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Assessment History</h2>
          <div className="flex flex-col divide-y divide-border">
            {longitudinal.map((entry, i) => {
              const state = (entry.readinessState ?? "unknown") as ReadinessState;
              const entryCfg = READINESS_CONFIG[state] ?? READINESS_CONFIG.unknown;
              return (
                <div key={entry.sessionId} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${entryCfg.text.replace("text-", "bg-")}`} />
                    <div>
                      <p className="text-sm text-foreground">
                        Assessment {longitudinal.length - i}
                        {i === 0 && <span className="ml-2 text-xs text-muted-foreground">(latest)</span>}
                      </p>
                      {entry.completedAt && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.completedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${entryCfg.text}`}>{entryCfg.label}</span>
                    <span className="text-sm font-mono font-bold text-foreground">{Math.round(entry.overallScore)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Failure modes */}
      {latest && latest.failureModes.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Risk Indicators</h2>
          <div className="flex flex-wrap gap-2">
            {latest.failureModes.map(mode => (
              <Badge key={mode} variant="outline" className="text-xs border-[#DC2626]/30 text-[#DC2626] bg-[#DC2626]/10">
                {mode.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
