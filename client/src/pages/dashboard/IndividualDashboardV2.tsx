/**
 * Individual Dashboard - Wireframe P2 visual language
 * Level ring · "Where you are" narrative · Continue Learning · 6-domain capability grid
 * Dark navy brand theme (AiQ Design System)
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { IndividualDashboardSkeleton } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import { useState } from "react";
import { BookOpen, Sparkles, Target } from "lucide-react";
import { DomainDot, CapabilityBar, EmptyState, RatingBadge, PeakonScoreBadge, ConfidenceIndicator } from "@/components/dashboard/DashboardUI";
import { HeroScore } from "@/components/dashboard/PeakonPrimitives";
import { scoreToColor, formatPeakonScore, scoreToReadinessLabel } from "@/lib/peakon-colors";
import { DOMAIN_COLOURS } from "@/lib/domains";

// --- Wireframe colour scale (1→5 levels) -------------------------------------
// Level 1 Emerging: grey chip
// Level 2 Developing: slate chip
// Level 3 Capable: mid-blue #557DAE
// Level 4 Strong: navy #2E4C7A
// Level 5 AI Ready: dark navy #1F3A5F

function getLevelFromScore(score: number): number {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

function getLevelLabel(level: number): string {
  return ["", "Emerging", "Developing", "Capable", "Strong", "AI Ready"][level] ?? "Developing";
}

function getLevelChipStyle(level: number): { bg: string; text: string } {
  const styles: Record<number, { bg: string; text: string }> = {
    1: { bg: "#374151", text: "#D1D5DB" },
    2: { bg: "#475569", text: "#E2E8F0" },
    3: { bg: "#557DAE", text: "#FFFFFF" },
    4: { bg: "#2E4C7A", text: "#FFFFFF" },
    5: { bg: "#1F3A5F", text: "#FFFFFF" },
  };
  return styles[level] ?? styles[2];
}

function LevelChip({ level, size = "sm" }: { level: number; size?: "sm" | "md" | "lg" }) {
  const style = getLevelChipStyle(level);
  const sizeClass = size === "lg" ? "w-12 h-12 text-lg" : size === "md" ? "w-8 h-8 text-sm" : "w-7 h-7 text-xs";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md font-medium flex-shrink-0 ${sizeClass}`}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {level}
    </span>
  );
}

// SVG donut ring showing level progress — dark theme
function LevelRing({ score, size = 160 }: { score: number; size?: number }) {
  const level = getLevelFromScore(score);
  const levelLabel = getLevelLabel(level);
  const preciseScore = (score / 10).toFixed(1);
  const chipStyle = getLevelChipStyle(level);

  const levelMin = (level - 1) * 20;
  const levelMax = level * 20;
  const progressInLevel = Math.min(1, (score - levelMin) / 20);
  const pctToNextLevel = Math.round(progressInLevel * 100);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.375;
  const strokeWidth = size * 0.0875;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="aiq-chart-mount" style={{ width: "100%", height: "100%" }}>
          {/* Track — dark navy */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="oklch(22% 0.030 240)" strokeWidth={strokeWidth} />
          {/* Fill — level colour */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={chipStyle.bg}
            strokeWidth={strokeWidth}
            strokeDasharray={`${filled} ${circumference}`}
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="round"
          />
          {/* Score text — white */}
          <text
            x={cx} y={cy - size * 0.04}
            textAnchor="middle"
            style={{ fontSize: size * 0.2, fontWeight: 500, fill: "#F9FAFB", fontFamily: "Sora, system-ui, sans-serif" }}
          >
            {preciseScore}
          </text>
          <text
            x={cx} y={cy + size * 0.12}
            textAnchor="middle"
            style={{ fontSize: size * 0.065, fill: "#9CA3AF", fontFamily: "Sora, system-ui, sans-serif", letterSpacing: "0.06em" }}
          >
            YOUR LEVEL
          </text>
        </svg>
      </div>
      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>{pctToNextLevel}% of the way to Level {Math.min(5, level + 1)}</p>
      <span
        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-2"
        style={{ backgroundColor: chipStyle.bg, color: chipStyle.text }}
      >
        Level {level} · {levelLabel}
      </span>
    </div>
  );
}

export default function IndividualDashboardV2({ userId }: { userId?: string }) {
  const { user } = useAuth();
  const [drillDomain, setDrillDomain] = useState<string | null>(null);

  const { data, isLoading } = trpc.dashboardV2.individual.main.useQuery(
    userId ? { userId } : undefined,
  );

  const isOwnDashboard = !userId || userId === (user as any)?.id;

  const { data: ambitionGap } = trpc.dashboardV2.leader.ambitionGap.useQuery(undefined, {
    retry: false,
    onError: () => {},
  } as any);

  const scoreDelta = useMemo(() => {
    if (!data || data.assessmentHistory.length < 2) return null;
    const sorted = [...data.assessmentHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted[sorted.length - 1].overallScore - sorted[sorted.length - 2].overallScore;
  }, [data]);

  if (isLoading) return <IndividualDashboardSkeleton />;
  if (!data) return (
    <div className="px-5 py-6 md:px-8 max-w-5xl mx-auto">
      <EmptyState
        title="No data available"
        description="Complete an assessment to see your capability dashboard."
        action={<Link href="/assessment"><Button>Start Assessment</Button></Link>}
      />
    </div>
  );

  const score = data.overallScore ?? 0;
  const level = getLevelFromScore(score);
  const levelLabel = getLevelLabel(level);
  const preciseScore = (score / 10).toFixed(1);

  const sortedDomains = [...data.domains].filter(d => d.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const topDomain = sortedDomains[0];
  const weakDomain = sortedDomains[sortedDomains.length - 1];
  const deltaText = scoreDelta !== null && scoreDelta !== 0
    ? `Up ${Math.abs(scoreDelta / 10).toFixed(1)} levels this cycle. `
    : "";
  const narrativeText = data.overallScore !== null
    ? `You're at Level ${preciseScore} - ${levelLabel.toLowerCase()}. ${deltaText}${topDomain ? `Strongest in ${topDomain.name} (${(topDomain.score! / 10).toFixed(1)}).` : ""} ${weakDomain && weakDomain.key !== topDomain?.key ? `Biggest opportunity is ${weakDomain.name} (${(weakDomain.score! / 10).toFixed(1)}) - your current development focus.` : ""}`
    : "Complete your assessment to generate your capability profile.";

  const roleTarget = data.roleTarget;
  const roleTargetText = roleTarget ? `Role target: Level ${(roleTarget / 10).toFixed(1)} by December.` : "";

  const plan = data.planSummary;

  const firstName = isOwnDashboard
    ? ((user as any)?.name?.split(" ")[0] ?? "there")
    : data.user.firstName;

  return (
    <div className="px-5 py-6 md:px-8 max-w-5xl mx-auto space-y-4">

      {/* -- Page header -- */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">
            {isOwnDashboard ? "Your capability profile" : `${data.user.firstName} ${data.user.lastName}`}
          </p>
          <h1 className="text-lg font-semibold text-foreground">
            Good morning, {firstName}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isOwnDashboard && (
            <DownloadPdfButton type="capability_profile" label="Download Profile" size="sm" variant="outline" />
          )}
          {isOwnDashboard && (
            <Link href="/assessment">
              <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                <Sparkles className="w-3.5 h-3.5" />
                {data.overallScore !== null ? "Reassess" : "Start assessment"}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* -- Hero card: level ring + "Where you are" narrative -- */}
      {data.overallScore !== null && (
        <div className="bg-card rounded-xl border border-border shadow-md p-7">
          <div className="grid gap-8 items-center" style={{ gridTemplateColumns: "200px 1fr" }}>
            {/* Level ring */}
            <LevelRing score={score} size={160} />

            {/* Narrative */}
            <div>
              <p className="text-xs font-medium uppercase tracking-widest mb-2 text-muted-foreground">
                Where you are
              </p>
              <h3 className="text-xl font-medium leading-snug mb-3 text-foreground">
                {narrativeText}
              </h3>
              {roleTargetText && (
                <p className="text-sm text-muted-foreground">{roleTargetText}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -- No assessment state -- */}
      {data.overallScore === null && (
        <div className="bg-card rounded-xl border border-border shadow-md p-7 text-center">
          <p className="text-base font-medium mb-3 text-foreground">
            Complete your assessment to see your capability level
          </p>
          <Link href="/assessment">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Start Assessment →</Button>
          </Link>
        </div>
      )}

      {/* -- Continue learning card -- */}
      {plan && (
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest mb-1 text-primary">
                Continue learning
              </p>
              <h3 className="text-base font-medium text-foreground">
                Your development plan
              </h3>
            </div>
            <Link href="/learning">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Resume →
              </Button>
            </Link>
          </div>
          <p className="text-sm mb-3 text-muted-foreground">
            {plan.moduleCount} module{plan.moduleCount !== 1 ? "s" : ""} · {plan.completionPercentage}% complete
            {plan.totalEstimatedMinutes > 0 && ` · ~${Math.round(plan.totalEstimatedMinutes)} minutes remaining`}
          </p>
          <div style={{ position: "relative", height: 6, background: "oklch(22% 0.030 240)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${plan.completionPercentage}%`, background: "oklch(72.3% 0.220 142)", borderRadius: 3 }} />
          </div>
        </div>
      )}

      {/* -- Six capability areas -- */}
      <div className="bg-card rounded-xl border border-border shadow-md p-6">
        <p className="text-sm font-medium mb-4 text-foreground">
          Your six capability areas
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.domains.map(d => {
            const domainScore = d.score;
            const domainLevel = domainScore !== null ? getLevelFromScore(domainScore) : 1;
            const chipStyle = getLevelChipStyle(domainLevel);
            const preciseLevel = domainScore !== null ? (domainScore / 10).toFixed(1) : null;
            const isWeakest = weakDomain && d.key === weakDomain.key && d.key !== topDomain?.key;
            const isStrongest = topDomain && d.key === topDomain.key;

            return (
              <button
                key={d.key}
                onClick={() => setDrillDomain(d.key)}
                className="flex items-center gap-3 p-3 rounded-lg text-left transition-all hover:bg-secondary/50"
                style={{
                  background: isWeakest
                    ? "oklch(18% 0.040 68 / 0.4)"
                    : "oklch(17% 0.028 240)",
                  border: isWeakest
                    ? "0.5px solid oklch(30% 0.090 68)"
                    : "0.5px solid oklch(22% 0.030 240)",
                }}
              >
                <LevelChip level={domainLevel} size="sm" />
                <div style={{ flex: 1 }}>
                  <p className="text-sm font-medium text-foreground">{d.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: isWeakest ? "#FCD34D" : "#9CA3AF" }}>
                    Level {preciseLevel ?? "-"}
                    {isStrongest && " · Strongest"}
                    {isWeakest && " · Active development"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* -- Domain drill-down sheet -- */}
      <DomainDrillDown
        open={drillDomain !== null}
        onClose={() => setDrillDomain(null)}
        domainKey={drillDomain}
        userId={userId}
      />
    </div>
  );
}

// --- Domain drill-down sheet -------------------------------------------------

function DomainDrillDown({ open, onClose, domainKey, userId }: {
  open: boolean;
  onClose: () => void;
  domainKey: string | null;
  userId?: string;
}) {
  const { data, isLoading } = trpc.dashboardV2.individual.domainDetail.useQuery(
    { domainKey: domainKey ?? "", userId },
    { enabled: open && domainKey !== null },
  );

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border">
        {isLoading ? (
          <div className="space-y-5 p-2 pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full aiq-shimmer-brand" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-36 rounded aiq-shimmer" />
                <div className="h-3 w-24 rounded aiq-shimmer" />
              </div>
            </div>
            <div className="h-3 w-full rounded aiq-shimmer" />
            <div className="h-3 w-5/6 rounded aiq-shimmer" />
            <div className="h-3 w-4/6 rounded aiq-shimmer" />
            <div className="h-px w-full bg-border" />
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full aiq-shimmer-brand" />
                  <div className="h-3 flex-1 rounded aiq-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                  <div className="h-5 w-12 rounded aiq-shimmer-brand" />
                </div>
              ))}
            </div>
          </div>
        ) : data ? (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <DomainDot domain={data.domainKey} size={12} />
                <SheetTitle className="text-base text-foreground">{data.domainName}</SheetTitle>
              </div>
            </SheetHeader>

            <div className="space-y-4 pb-4">
              <div className="flex items-start justify-between gap-4">
                <HeroScore
                  score={data.score}
                  label={data.score !== null ? scoreToReadinessLabel(data.score) : undefined}
                  size="lg"
                />
                <div className="flex flex-col gap-2 items-end">
                  <RatingBadge rating={data.rating} size="md" />
                  <ConfidenceIndicator band={data.confidenceBand} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.narrativeExplanation}</p>
              {data.gapStatement && (
                <div className="p-3 rounded-lg" style={{ background: "oklch(18% 0.040 68 / 0.4)", border: "1px solid oklch(30% 0.090 68)" }}>
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#FCD34D" }} />
                    <p className="text-xs" style={{ color: "#FCD34D" }}>{data.gapStatement}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator className="bg-border" />

            <div className="py-4 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Signal breakdown</h4>
              {data.signals.length === 0 ? (
                <p className="text-xs text-muted-foreground">No signal data available for this domain.</p>
              ) : (
                <div className="space-y-2">
                  {data.signals.map(s => (
                    <div key={s.signalKey} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.level === "Strong" ? "#4ADE80" : s.level === "Developing" ? "#60A5FA" : "#FCD34D" }} />
                        <span className="text-xs text-foreground truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <PeakonScoreBadge score={s.score} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator className="bg-border" />

            {data.developmentModules.length > 0 && (
              <div className="py-4 space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Development modules</h4>
                <div className="space-y-2">
                  {data.developmentModules.map(m => (
                    <Link key={m.moduleId} href={`/learning/module/${m.moduleId}`}>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all cursor-pointer">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-foreground">{m.title}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === "completed" ? "text-primary" : "text-muted-foreground"}`}
                          style={{ background: m.status === "completed" ? "oklch(18% 0.040 142)" : "oklch(18% 0.010 240)" }}>
                          {m.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
