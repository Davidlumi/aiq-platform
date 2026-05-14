/**
 * PersonProfileSheet
 *
 * A slide-out Sheet that shows a detailed capability profile for a single person.
 * Opened when a row in the People Management table is clicked.
 *
 * Data source: trpc.people.getMemberReport
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, Calendar, TrendingUp, AlertTriangle, CheckCircle2, User, Briefcase, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  DOMAIN_KEYS,
  DOMAIN_LABELS,
  DOMAIN_COLOURS,
  scoreColours,
} from "@shared/brand";
import { ROLE_FAMILY_LABELS } from "@shared/dashboard";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function avatarColour(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 50%, 35%)`;
}

function formatDate(ts: number | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function readinessBadge(state: string, label: string) {
  const colours: Record<string, string> = {
    ai_ready:    "dark:bg-green-900/60 bg-green-100 dark:text-green-300 text-green-700 dark:border-green-700 border-green-400",
    strong:      "dark:bg-emerald-900/60 bg-emerald-100 dark:text-emerald-300 text-emerald-700 dark:border-emerald-700 border-emerald-400",
    capable:     "dark:bg-yellow-900/60 bg-yellow-100 dark:text-yellow-300 text-yellow-700 dark:border-yellow-700 border-yellow-400",
    developing:  "dark:bg-orange-900/60 bg-orange-100 dark:text-orange-300 text-orange-700 dark:border-orange-700 border-orange-400",
    emerging:    "dark:bg-red-900/60 bg-red-100 dark:text-red-300 text-red-700 dark:border-red-700 border-red-400",
    unknown:     "bg-muted text-muted-foreground border-border",
  };
  const cls = colours[state] ?? colours.unknown;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Domain Score Bar ─────────────────────────────────────────────────────────
function DomainBar({ domainKey, score }: { domainKey: string; score: number | null }) {
  const label = DOMAIN_LABELS[domainKey as keyof typeof DOMAIN_LABELS] ?? domainKey;
  const colour = DOMAIN_COLOURS[domainKey as keyof typeof DOMAIN_COLOURS] ?? "#888";
  const cols = scoreColours(score ?? 0);
  const pct = score != null ? Math.min(100, (score / 10) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        {score != null ? (
          <span
            className="font-semibold tabular-nums px-1.5 py-0.5 rounded text-xs"
            style={{ background: cols.bg, color: cols.text }}
          >
            {score.toFixed(1)}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: colour }}
        />
      </div>
    </div>
  );
}

// ─── History Row ──────────────────────────────────────────────────────────────
function HistoryRow({ idx, completedAt, overallScore, readinessState, readinessLabel }: {
  idx: number;
  completedAt: number | null;
  overallScore: number;
  readinessState: string;
  readinessLabel: string;
}) {
  const cols = scoreColours(overallScore);
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="w-3.5 h-3.5 shrink-0" />
        <span>{formatDate(completedAt)}</span>
        {idx === 0 && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">Latest</Badge>}
      </div>
      <div className="flex items-center gap-2">
        {readinessBadge(readinessState, readinessLabel)}
        <span
          className="font-bold tabular-nums text-sm px-2 py-0.5 rounded"
          style={{ background: cols.bg, color: cols.text }}
        >
          {overallScore.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PersonProfileSheet({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading, error } = trpc.people.getMemberReport.useQuery(
    { userId: userId! },
    { enabled: !!userId },
  );

  const fullName = data
    ? `${data.user.firstName} ${data.user.lastName}`.trim()
    : "";

  const latestCapScores = data?.latest?.capabilityScores ?? {};

  return (
    <Sheet open={!!userId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        className="w-full sm:max-w-lg bg-card border-border flex flex-col p-0 overflow-hidden"
        side="right"
      >
        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div>
              <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </div>
        )}

        {/* ── Content ── */}
        {data && (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <SheetHeader className="px-6 pt-6 pb-5 border-b border-border bg-background/30 shrink-0">
              <div className="flex items-start gap-4">
                <Avatar className="w-14 h-14 shrink-0">
                  <AvatarFallback
                    style={{ backgroundColor: avatarColour(fullName), color: "#fff" }}
                    className="text-lg font-bold"
                  >
                    {initials(data.user.firstName, data.user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-foreground text-lg font-bold leading-tight">{fullName}</SheetTitle>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{data.user.email}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {data.latest && readinessBadge(data.latest.readinessState, data.latest.readinessLabel)}
                    {data.user.roleFamily && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                        <Building2 className="w-3 h-3" />
                        {ROLE_FAMILY_LABELS[data.user.roleFamily as keyof typeof ROLE_FAMILY_LABELS] ?? data.user.roleFamily}
                      </span>
                    )}
                  </div>
                </div>
                {/* Overall score badge */}
                {data.latest && (() => {
                  const cols = scoreColours(data.latest.overallScore);
                  return (
                    <div
                      className="shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center"
                      style={{ background: cols.bg }}
                    >
                      <span className="text-2xl font-black tabular-nums leading-none" style={{ color: cols.text }}>
                        {data.latest.overallScore.toFixed(1)}
                      </span>
                      <span className="text-[10px] mt-0.5 opacity-70" style={{ color: cols.text }}>/ 10</span>
                    </div>
                  );
                })()}
              </div>
            </SheetHeader>

            <div className="flex-1 px-6 py-5 space-y-6">
              {/* Role info */}
              <div className="grid grid-cols-2 gap-3">
                {data.user.jobFunction && (
                  <div className="bg-background/40 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> Role
                    </p>
                    <p className="text-xs font-medium text-foreground">{data.user.jobFunction}</p>
                  </div>
                )}
                {data.user.seniorityLevel && (
                  <div className="bg-background/40 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> Seniority
                    </p>
                    <p className="text-xs font-medium text-foreground capitalize">{data.user.seniorityLevel.replace(/_/g, " ")}</p>
                  </div>
                )}
                <div className="bg-background/40 rounded-lg p-3 border border-border/50">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Assessments
                  </p>
                  <p className="text-xs font-medium text-foreground">{data.totalSessions} completed</p>
                </div>
                {data.latest?.completedAt && (
                  <div className="bg-background/40 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Last assessed
                    </p>
                    <p className="text-xs font-medium text-foreground">{formatDate(data.latest.completedAt)}</p>
                  </div>
                )}
              </div>

              {/* Capability domain breakdown */}
              {data.latest ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    Capability Domains
                  </h3>
                  <div className="space-y-3">
                    {DOMAIN_KEYS.map(key => {
                      const entry = latestCapScores[key];
                      const score = entry != null
                        ? (typeof entry === "object" ? (entry as { score: number }).score / 10 : (entry as number) / 10)
                        : null;
                      return <DomainBar key={key} domainKey={key} score={score} />;
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border/50 bg-background/30 p-6 text-center">
                  <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No assessment data yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">This person hasn't completed an assessment</p>
                </div>
              )}

              {/* Narrative */}
              {data.latest?.narrative && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    AI Assessment Summary
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed bg-background/30 rounded-lg p-3 border border-border/50">
                    {data.latest.narrative}
                  </p>
                </div>
              )}

              {/* Failure modes / flags */}
              {data.latest?.failureModes && data.latest.failureModes.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 dark:text-amber-400 text-amber-600" />
                    Development Flags
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {data.latest.failureModes.map((mode: string) => (
                      <span
                        key={mode}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium dark:bg-amber-900/30 bg-amber-100/80 dark:text-amber-300 text-amber-700 border dark:border-amber-700/40 border-amber-300"
                      >
                        {mode}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Separator className="bg-border/50" />

              {/* Assessment history */}
              {data.history && data.history.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Assessment History
                  </h3>
                  <div>
                    {data.history.map((h, i) => h && (
                      <HistoryRow
                        key={h.sessionId}
                        idx={i}
                        completedAt={h.completedAt}
                        overallScore={h.overallScore}
                        readinessState={h.readinessState}
                        readinessLabel={h.readinessLabel}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
