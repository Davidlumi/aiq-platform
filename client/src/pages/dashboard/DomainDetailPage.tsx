/**
 * DomainDetailPage — per-domain capability deep-dive
 *
 * Shows: score badge, score history sparkline, AI narrative, signal breakdown,
 * gap statement, and recommended learning modules.
 */
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  DOMAIN_KEYS,
  DOMAIN_LABELS,
  DOMAIN_COLOURS,
  DOMAIN_DESCRIPTIONS,
  bandOf,
  gapToNext,
  scoreToLevel,
  LEVEL_LABELS,
} from "@/lib/domains";
import type { DomainKey } from "@shared/brand";
import { ArrowLeft, TrendingUp, BookOpen, AlertCircle, CheckCircle2, ChevronRight, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";

// ─── Level badge ─────────────────────────────────────────────────────────────

const LEVEL_BADGE_COLOURS: Record<number, string> = {
  1: "bg-red-100 text-red-700",
  2: "bg-amber-100 text-amber-700",
  3: "bg-green-100 text-green-700",
  4: "bg-emerald-100 text-emerald-700",
  5: "bg-teal-100 text-teal-700",
};

function LevelBadge({ score }: { score: number }) {
  const level = scoreToLevel(score);
  const label = LEVEL_LABELS[level];
  const cls = LEVEL_BADGE_COLOURS[level] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

// ─── Score history sparkline ──────────────────────────────────────────────────

function ScoreSparkline({
  history,
  colour,
}: {
  history: Array<{ date: string; score: number }>;
  colour: string;
}) {
  if (history.length < 2) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        Complete more assessments to see your score trend.
      </div>
    );
  }
  const data = history.map(h => ({
    date: format(new Date(h.date), "d MMM"),
    score: h.score,
  }));
  const latest = data[data.length - 1];
  const first = data[0];
  const delta = parseFloat((latest.score - first.score).toFixed(2));
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Score trend across {history.length} assessments</span>
        {delta !== 0 && (
          <span className={`text-sm font-semibold ml-auto ${delta > 0 ? "text-emerald-600" : "text-red-500"}`}>
            {delta > 0 ? "+" : ""}{delta} pts since first
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 2.5, 5, 7.5, 10]}
            tick={{ fontSize: 11, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            formatter={(v: number) => [`${v.toFixed(1)}/10`, "Score"]}
            contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E5E7EB" }}
          />
          {/* Band reference lines */}
          <ReferenceLine y={7.5} stroke="#E5E7EB" strokeDasharray="3 3" />
          <ReferenceLine y={6.0} stroke="#E5E7EB" strokeDasharray="3 3" />
          <ReferenceLine y={5.0} stroke="#E5E7EB" strokeDasharray="3 3" />
          <ReferenceLine y={3.5} stroke="#E5E7EB" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="score"
            stroke={colour}
            strokeWidth={2.5}
            dot={{ r: 4, fill: colour, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
      {/* Band labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-7">
        <span>Emerging</span>
        <span>Developing</span>
        <span>Proficient</span>
        <span>Advanced</span>
        <span>Expert</span>
      </div>
    </div>
  );
}

// ─── Signal row ───────────────────────────────────────────────────────────────

function SignalRow({
  name,
  score,
  level,
  colour,
}: {
  name: string;
  score: number;
  level: string;
  colour: string;
}) {
  const pct = Math.min(100, Math.round((score / 100) * 100));
  const levelColour =
    level === "Strong" ? "text-emerald-600" :
    level === "Developing" ? "text-amber-600" :
    "text-red-500";
  return (
    <div className="py-2.5 border-b border-border last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-foreground">{name}</span>
        <span className={`text-xs font-medium ${levelColour}`}>{level}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: colour }}
        />
      </div>
    </div>
  );
}

// ─── Module row ───────────────────────────────────────────────────────────────

function ModuleRow({
  title,
  status,
  onStart,
}: {
  title: string;
  status: string;
  onStart?: () => void;
}) {
  const isDone = status === "completed";
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? "bg-emerald-100" : "bg-muted"}`}>
        {isDone
          ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          : <BookOpen className="w-4 h-4 text-muted-foreground" />
        }
      </div>
      <span className={`flex-1 text-sm ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
        {title}
      </span>
      {!isDone && (
        <Button
          size="sm"
          className="bg-primary text-white hover:bg-primary/90 h-7 px-3 text-xs"
          onClick={onStart}
        >
          <Play className="w-3 h-3 mr-1" />
          Start
        </Button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DomainDetailPage() {
  const params = useParams<{ domainKey: string }>();
  const [, navigate] = useLocation();
  const domainKey = params.domainKey as DomainKey;

  // Validate domain key
  if (!DOMAIN_KEYS.includes(domainKey)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground">Domain not found.</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const colour = DOMAIN_COLOURS[domainKey];
  const label = DOMAIN_LABELS[domainKey];
  const description = DOMAIN_DESCRIPTIONS[domainKey];

  const { data, isLoading, error } = trpc.dashboardV2.individual.domainDetail.useQuery({ domainKey });

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-40 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    );
  }

  // ── Error / no data ──
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "No assessment data available yet. Complete an assessment to see your capability profile."}
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/assessment")}>
            Take assessment
          </Button>
        </div>
      </div>
    );
  }

  const score = data.score ?? 0;
  const gap = gapToNext(score);
  const strongSignals = data.signals.filter(s => s.level === "Strong");
  const developingSignals = data.signals.filter(s => s.level === "Developing");
  const criticalSignals = data.signals.filter(s => s.level === "Critical");

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* ── Breadcrumb ── */}
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Dashboard
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{label}</span>
      </button>

      {/* ── Hero score card ── */}
      <div
        className="rounded-xl p-6 text-white"
        style={{ background: `linear-gradient(135deg, ${colour}dd, ${colour})` }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
            <p className="text-white/80 text-sm max-w-sm">{description}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-white/30 text-white bg-white/10 hover:bg-white/20 text-xs"
            onClick={() => navigate("/assessment")}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reassess
          </Button>
        </div>
        <div className="flex items-end gap-4">
          <div>
            <span className="text-5xl font-bold">{score.toFixed(1)}</span>
            <span className="text-white/60 text-xl ml-1">/10</span>
          </div>
          <div className="mb-1.5">
            <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              {bandOf(score)}
            </span>
          </div>
        </div>
        {/* Progress to next band */}
        {!gap.isTop && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/70 mb-1.5">
              <span>Progress to <strong className="text-white">{gap.nextBand}</strong></span>
              <span>{gap.gap.toFixed(1)} pts to go</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${gap.pctThroughBand}%` }}
              />
            </div>
          </div>
        )}
        {gap.isTop && (
          <div className="mt-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-white/80" />
            <span className="text-sm text-white/80">Expert level achieved — top band</span>
          </div>
        )}
      </div>

      {/* ── Score history ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Score History</h2>
        <ScoreSparkline history={data.scoreHistory ?? []} colour={colour} />
      </div>

      {/* ── AI commentary ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">AI Capability Summary</h2>
        <p className="text-sm text-foreground leading-relaxed">{data.narrativeExplanation}</p>
        {data.gapStatement && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-800 leading-relaxed">{data.gapStatement}</p>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-3">AI-generated summary · review before sharing</p>
      </div>

      {/* ── Signal breakdown ── */}
      {data.signals.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Signal Breakdown</h2>
          {strongSignals.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Strengths</span>
              </div>
              {strongSignals.map(s => (
                <SignalRow key={s.signalKey} name={s.name} score={s.score} level={s.level} colour={colour} />
              ))}
            </div>
          )}
          {developingSignals.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">Developing</span>
              </div>
              {developingSignals.map(s => (
                <SignalRow key={s.signalKey} name={s.name} score={s.score} level={s.level} colour={colour} />
              ))}
            </div>
          )}
          {criticalSignals.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-medium text-red-700 uppercase tracking-wide">Focus areas</span>
              </div>
              {criticalSignals.map(s => (
                <SignalRow key={s.signalKey} name={s.name} score={s.score} level={s.level} colour={colour} />
              ))}
            </div>
          )}
          {data.signals.length === 0 && (
            <p className="text-sm text-muted-foreground">No signal data available. Complete an assessment to see your detailed signal breakdown.</p>
          )}
        </div>
      )}

      {/* ── Recommended modules ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Recommended Modules</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary text-xs"
            onClick={() => navigate("/learning")}
          >
            View all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </div>
        {data.developmentModules.length > 0 ? (
          data.developmentModules.map(m => (
            <ModuleRow
              key={m.moduleId}
              title={m.title}
              status={m.status}
              onStart={() => navigate(`/learning/${m.moduleId}`)}
            />
          ))
        ) : (
          <div className="text-center py-6 space-y-2">
            <BookOpen className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No modules assigned yet.</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/learning")}>
              Browse learning library
            </Button>
          </div>
        )}
      </div>

      {/* ── Other domains ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Other Domains</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DOMAIN_KEYS.filter(k => k !== domainKey).map(k => (
            <button
              key={k}
              onClick={() => navigate(`/domain/${k}`)}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: DOMAIN_COLOURS[k] }} />
              <span className="text-xs text-foreground truncate">{DOMAIN_LABELS[k]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
