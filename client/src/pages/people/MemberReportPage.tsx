/**
 * MemberReportPage - Wireframe M2 visual language
 * Dark navy brand theme (AiQ Design System)
 *
 * Team member detail: level ring, 6-domain bars, dev progress,
 * trajectory chart, conversation prompts link.
 */
import { useParams, Link } from "wouter";
import { ArrowLeft, BookOpen, Calendar, MessageSquare, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getLevelFromScore, getLevelChipStyle, getLevelLabel, getPreciseLevel } from "@/lib/level-utils";
import { DOMAIN_KEYS, DOMAIN_LABELS, DOMAIN_COLOURS } from "@/lib/domains";
import type { CapabilityKey } from "@/lib/domains";

// Level ring
function LevelRing({ score, size = 140 }: { score: number; size?: number }) {
  const level = getLevelFromScore(score);
  const chipStyle = getLevelChipStyle(level);
  const preciseLevel = getPreciseLevel(score);
  const cx = size / 2; const cy = size / 2; const r = size * 0.38; const sw = size * 0.1;
  const circ = 2 * Math.PI * r;
  const arc = (score / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="aiq-chart-mount" style={{ width: size, height: size }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="oklch(22% 0.030 240)" strokeWidth={sw} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={chipStyle.bg} strokeWidth={sw}
          strokeDasharray={`${arc} ${circ}`} strokeDashoffset={0}
          transform={`rotate(-90 ${cx} ${cy})`} />
        <text x={cx} y={cy - 8} textAnchor="middle" style={{ fontSize: size * 0.18, fontWeight: 500, fill: "#F9FAFB", fontFamily: "Sora, system-ui, sans-serif" }}>{preciseLevel}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: size * 0.07, fill: "#9CA3AF", fontFamily: "Sora, system-ui, sans-serif", letterSpacing: "0.06em" }}>LEVEL</text>
      </svg>
    </div>
  );
}

// Domain bar
function DomainBar({ label, score, colour }: { label: string; score: number | null; colour: string }) {
  if (score === null) {
    return (
      <div className="flex items-center gap-3 py-2" style={{ borderBottom: "0.5px solid oklch(22% 0.030 240)" }}>
        <span className="text-sm text-muted-foreground" style={{ width: 200, flexShrink: 0 }}>{label}</span>
        <div className="flex-1 h-5 rounded" style={{ background: "oklch(22% 0.030 240)" }} />
        <span className="text-xs tabular-nums text-muted-foreground" style={{ width: 36, textAlign: "right" }}>-</span>
      </div>
    );
  }
  const level = getLevelFromScore(score);
  const chipStyle = getLevelChipStyle(level);
  const barWidth = (score / 100) * 100;
  return (
    <div className="flex items-center gap-3 py-2" style={{ borderBottom: "0.5px solid oklch(22% 0.030 240)" }}>
      <span className="text-sm font-medium text-foreground" style={{ width: 200, flexShrink: 0 }}>{label}</span>
      <div className="flex-1 relative h-5 rounded overflow-hidden" style={{ background: "oklch(22% 0.030 240)" }}>
        <div className="h-full rounded transition-all duration-700" style={{ width: `${barWidth}%`, background: chipStyle.bg }} />
      </div>
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-medium flex-shrink-0" style={{ backgroundColor: chipStyle.bg, color: chipStyle.text }}>{level}</span>
      <span className="text-sm font-medium tabular-nums text-foreground" style={{ width: 28, textAlign: "right" }}>{(score / 10).toFixed(1)}</span>
    </div>
  );
}

// Trajectory sparkline
function TrajectoryChart({ history }: { history: Array<{ completedAt: number | null; overallScore: number }> }) {
  if (history.length < 2) return null;
  const reversed = [...history].reverse();
  const maxScore = Math.max(...reversed.map(h => h.overallScore), 100);
  const minScore = Math.min(...reversed.map(h => h.overallScore), 0);
  const range = maxScore - minScore || 1;
  const W = 280; const H = 80; const PAD = 10;
  const pts = reversed.map((h, i) => {
    const x = PAD + (i / (reversed.length - 1)) * (W - 2 * PAD);
    const y = PAD + (1 - (h.overallScore - minScore) / range) * (H - 2 * PAD);
    return `${x},${y}`;
  });
  const latest = reversed[reversed.length - 1];
  const prev = reversed[reversed.length - 2];
  const delta = latest.overallScore - prev.overallScore;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Score trajectory</p>
        <span className="text-xs font-medium" style={{ color: delta >= 0 ? "#4ADE80" : "#F87171" }}>
          {delta >= 0 ? "+" : ""}{Math.round(delta)} vs previous
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="aiq-chart-mount" style={{ width: "100%", height: H }}>
        <polyline points={pts.join(" ")} fill="none" stroke="#60A5FA" strokeWidth={2} strokeLinejoin="round" />
        {reversed.map((h, i) => {
          const x = PAD + (i / (reversed.length - 1)) * (W - 2 * PAD);
          const y = PAD + (1 - (h.overallScore - minScore) / range) * (H - 2 * PAD);
          return <circle key={i} cx={x} cy={y} r={3} fill="#60A5FA" />;
        })}
      </svg>
    </div>
  );
}

// Page
export default function MemberReportPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId ?? "";
  const { data, isLoading, error } = trpc.people.getMemberReport.useQuery(
    { userId },
    { enabled: !!userId }
  );

  if (!userId) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-sm text-muted-foreground">No user ID provided.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    const isForbidden = (error as any)?.data?.code === "FORBIDDEN";
    return (
      <div className="max-w-4xl mx-auto">
        <Link href="/people"><Button variant="ghost" size="sm" className="gap-1.5 mb-4"><ArrowLeft className="w-3.5 h-3.5" />Back</Button></Link>
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "oklch(18% 0.040 27)", border: "0.5px solid oklch(30% 0.090 27)" }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#F87171" }} />
          <p className="text-sm" style={{ color: "#FCA5A5" }}>
            {isForbidden ? "You can only view reports for your direct reports." : (error?.message ?? "Member not found.")}
          </p>
        </div>
      </div>
    );
  }

  const { user, latest, longitudinal } = data;
  const level = latest ? getLevelFromScore(latest.overallScore) : null;
  const chipStyle = level !== null ? getLevelChipStyle(level) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Back nav */}
      <div className="flex items-center justify-between">
        <Link href="/people">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
            <ArrowLeft className="w-3.5 h-3.5" />Back to people
          </Button>
        </Link>
        <Link href="/manager/conversation-prompts">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            <MessageSquare className="w-3.5 h-3.5" />Conversation prompts
          </Button>
        </Link>
      </div>

      {/* Profile header */}
      <div className="bg-card rounded-xl border border-border shadow-md p-6">
        <div className="flex items-start gap-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-medium flex-shrink-0" style={{ background: "oklch(22% 0.030 240)", color: "#9CA3AF" }}>
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold mb-0.5 text-foreground">{user.firstName} {user.lastName}</h1>
            <p className="text-sm mb-2 text-muted-foreground">{user.jobFunction ?? user.roleFamily ?? "HR Professional"}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {user.seniorityLevel && <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: "oklch(22% 0.030 240)", color: "#9CA3AF" }}>{user.seniorityLevel}</span>}
              {user.roleFamily && <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: "oklch(22% 0.030 240)", color: "#9CA3AF" }}>{user.roleFamily}</span>}
              {user.sector && <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: "oklch(22% 0.030 240)", color: "#9CA3AF" }}>{user.sector}</span>}
            </div>
          </div>
          {latest && <LevelRing score={latest.overallScore} size={120} />}
        </div>
        {latest && chipStyle && (
          <div className="mt-4 pt-4" style={{ borderTop: "0.5px solid oklch(22% 0.030 240)" }}>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-md text-sm font-medium" style={{ backgroundColor: chipStyle.bg, color: chipStyle.text }}>{level}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{getLevelLabel(level!)}</p>
                <p className="text-xs text-muted-foreground">Level {getPreciseLevel(latest.overallScore)} · {latest.readinessLabel}</p>
              </div>
              {latest.completedAt && (
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {new Date(latest.completedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}
        {!latest && (
          <div className="mt-4 pt-4" style={{ borderTop: "0.5px solid oklch(22% 0.030 240)" }}>
            <p className="text-sm text-muted-foreground">No assessment data available yet.</p>
          </div>
        )}
      </div>

      {/* Domain breakdown */}
      {latest && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <p className="text-sm font-medium mb-4 text-foreground">Capability breakdown</p>
          {DOMAIN_KEYS.map(key => {
            const capData = latest.capabilityScores?.[key as CapabilityKey];
            const score = capData ? capData.score : null;
            const colour = DOMAIN_COLOURS[key as CapabilityKey];
            return (
              <DomainBar key={key} label={DOMAIN_LABELS[key as CapabilityKey]} score={score} colour={colour} />
            );
          })}
        </div>
      )}

      {/* Score trajectory */}
      {longitudinal && longitudinal.length >= 2 && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <TrajectoryChart history={longitudinal} />
        </div>
      )}

      {/* Narrative */}
      {latest?.narrative && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <p className="text-xs font-medium uppercase tracking-widest mb-3 text-muted-foreground">Assessment narrative</p>
          <p className="text-sm leading-relaxed text-foreground">{latest.narrative}</p>
        </div>
      )}

      {/* Governance flags */}
      {latest?.governanceFlag && (
        <div className="rounded-xl p-4" style={{ background: "oklch(18% 0.040 27)", border: "0.5px solid oklch(30% 0.090 27)" }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "#F87171" }}>Governance flag</p>
          <p className="text-sm" style={{ color: "#FCA5A5" }}>This assessment has been flagged for governance review.</p>
          {latest.failureModes?.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {latest.failureModes.map((mode: string, i: number) => (
                <li key={i} className="text-xs" style={{ color: "#FCA5A5" }}>• {mode}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pb-4">
        <Link href={`/learning/plan?userId=${userId}`}>
          <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
            <BookOpen className="w-3.5 h-3.5" />View development plan
          </Button>
        </Link>
        <Link href="/manager/conversation-prompts">
          <Button size="sm" variant="outline" className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />Conversation prompts
          </Button>
        </Link>
      </div>
    </div>
  );
}
