/**
 * Company HR AI Assessment — Results Page
 * Shows maturity scores, dimension breakdown, gap analysis, and strategy CTA
 */
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useParams, useLocation } from "wouter";
import {
  Building2,
  Target,
  Users,
  Layers,
  Shield,
  Lightbulb,
  BarChart3,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Loader2,
  Brain,
  Sparkles,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const DIMENSION_META: Record<
  string,
  { label: string; shortLabel: string; color: string; bg: string; icon: React.ElementType }
> = {
  strategy: {
    label: "AI Strategy",
    shortLabel: "Strategy",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    icon: Target,
  },
  governance: {
    label: "Governance & Ethics",
    shortLabel: "Governance",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    icon: Shield,
  },
  data: {
    label: "Data & Infrastructure",
    shortLabel: "Data",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    icon: Layers,
  },
  technology: {
    label: "Technology & Tools",
    shortLabel: "Technology",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    icon: BarChart3,
  },
  workforce: {
    label: "Workforce Capability",
    shortLabel: "Workforce",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    icon: Users,
  },
  hr_function: {
    label: "HR Function Readiness",
    shortLabel: "HR Function",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    icon: Lightbulb,
  },
  culture: {
    label: "Culture & Change",
    shortLabel: "Culture",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    icon: Brain,
  },
};

const MATURITY_LEVELS = [
  {
    key: "initiating",
    label: "Initiating",
    range: "0–2.5",
    color: "text-rose-400",
    desc: "AI is largely absent from HR strategy. Foundational data, governance, and capability work is needed before meaningful deployment.",
  },
  {
    key: "developing",
    label: "Developing",
    range: "2.6–5.0",
    color: "text-amber-400",
    desc: "Isolated AI pilots exist but lack strategic coherence. Governance frameworks and capability programmes are emerging.",
  },
  {
    key: "scaling",
    label: "Scaling",
    range: "5.1–7.0",
    color: "text-blue-400",
    desc: "AI is embedded in several core HR processes with measurable outcomes. Governance is established and capability is growing.",
  },
  {
    key: "leading",
    label: "Leading",
    range: "7.1–8.5",
    color: "text-emerald-400",
    desc: "AI is a strategic differentiator. HR leads AI adoption across the organisation with robust ethics, measurement, and innovation culture.",
  },
  {
    key: "pioneering",
    label: "Pioneering",
    range: "8.6–10",
    color: "text-violet-400",
    desc: "AI is deeply embedded in all HR processes. The organisation contributes to industry standards and continuously innovates.",
  },
];

function getMaturityLevel(score: number) {
  // score is on 0-10 scale
  if (score <= 2.5) return MATURITY_LEVELS[0];
  if (score <= 5.0) return MATURITY_LEVELS[1];
  if (score <= 7.0) return MATURITY_LEVELS[2];
  if (score <= 8.5) return MATURITY_LEVELS[3];
  return MATURITY_LEVELS[4];
}

export default function CompanyAssessmentResultsPage() {
  const params = useParams<{ assessmentId: string }>();
  const assessmentId = params.assessmentId;
  const [, navigate] = useLocation();
  const [expandedDim, setExpandedDim] = useState<string | null>(null);

  const { data: results, isLoading } = trpc.companyAssessment.getResults.useQuery(
    { assessmentId },
    { enabled: !!assessmentId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        <p className="text-white/50 text-sm">Generating your results…</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-white/40">
        Results not found
      </div>
    );
  }

  // Server scores are on 1.0–5.0 scale; convert to 0–10 for display
  const toDisplay = (s: number) => +((((s - 1) / 4) * 10)).toFixed(1);
  const overallScoreRaw = results.overallScore ?? 1;
  const overallScore = toDisplay(overallScoreRaw);
  const maturity = getMaturityLevel(overallScore);
  // Convert dimensions array to a Record for easy lookup
  type DimItem = { key: string; label: string; score: number; weight: number; description: string; researchBasis: string };
  const dimensionsArr = (results.dimensions as DimItem[]) ?? [];
  const dimensionScores: Record<string, number> = Object.fromEntries(
    dimensionsArr.map((d) => [d.key, d.score])
  );
  // Compute top gaps (distance from max score of 5.0) — use raw 1-5 scale
  const topGaps = dimensionsArr
    .map((d) => ({ dimension: d.key, score: d.score, gap: Math.max(0, 5 - d.score), priority: d.score < 2 ? "critical" : d.score < 3 ? "high" : "medium" }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 4);
  const executiveSummary = results.executiveSummary ?? "";

  // Build radar data — convert 1-5 scores to 0-10 for display
  const radarData = Object.entries(DIMENSION_META).map(([key, meta]) => ({
    dimension: meta.shortLabel,
    score: toDisplay(dimensionScores[key] ?? 1),
    benchmark: results.sectorAverage ? toDisplay(results.sectorAverage as number) : 5,
  }));

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-4 h-4 text-violet-400" />
          <span className="text-sm text-white/60">Company HR AI Assessment</span>
          <span className="text-white/20 mx-1">·</span>
          <span className="text-sm text-white/40">Results</span>
        </div>
        <Button
          onClick={() => navigate(`/ai-strategy`)}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm"
        >
          Open Strategy Builder
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Hero card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="flex items-start gap-6">
            {/* Score ring */}
            <div className="relative w-24 h-24 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#7c3aed"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(overallScore / 10) * 264} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{overallScore.toFixed(1)}</span>
                <span className="text-[10px] text-white/40">/10</span>
              </div>
            </div>

            {/* Summary */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${maturity.color} bg-white/5 border border-white/10 text-xs`}>
                  {maturity.label}
                </Badge>
                <span className="text-white/30 text-xs">·</span>
                <span className="text-xs text-white/40">HR AI Maturity</span>
              </div>
              <h1 className="text-2xl font-bold mb-2">Your Organisation's HR AI Readiness</h1>
              {results.company && (
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-sm text-white/50">{(results.company as { name: string }).name}</span>
                  {(results.company as { sector: string }).sector && (
                    <>
                      <span className="text-white/20">·</span>
                      <span className="text-sm text-white/40">{(results.company as { sector: string }).sector}</span>
                    </>
                  )}
                </div>
              )}
              {executiveSummary && (
                <p className="text-sm text-white/60 leading-relaxed">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400 inline mr-1.5 -mt-0.5" />
                  {executiveSummary}
                </p>
              )}
            </div>
          </div>

          {/* Maturity level description */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-sm text-white/50 leading-relaxed">{maturity.desc}</p>
          </div>
        </div>

        {/* Maturity scale */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
            Maturity Scale
          </div>
          <div className="flex gap-1">
            {MATURITY_LEVELS.map((level, i) => (
              <div
                key={level.key}
                className={`flex-1 rounded-lg px-3 py-2 text-center transition-all ${
                  level.key === maturity.key
                    ? "bg-violet-500/20 border border-violet-500/50"
                    : "bg-white/5 border border-white/10 opacity-50"
                }`}
              >
                <div className={`text-xs font-semibold ${level.color}`}>{level.label}</div>
                <div className="text-[10px] text-white/30 mt-0.5">{level.range}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Radar + dimension scores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
              Capability Radar
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                />
                <Radar
                  name="Benchmark"
                  dataKey="benchmark"
                  stroke="rgba(255,255,255,0.15)"
                  fill="rgba(255,255,255,0.04)"
                  strokeDasharray="4 2"
                />
                <Radar
                  name="Your Score"
                  dataKey="score"
                  stroke="#7c3aed"
                  fill="rgba(124,58,237,0.15)"
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                  formatter={(value: number) => [`${value.toFixed(1)}/10`]}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 justify-center mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-violet-500" />
                <span className="text-[10px] text-white/40">Your score</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-white/20 border-dashed" />
                <span className="text-[10px] text-white/40">Sector benchmark</span>
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30" title="Benchmarks are currently based on synthetic reference data. They will be replaced with empirical norms once sufficient real-world data is collected.">Beta reference</span>
              </div>
            </div>
          </div>

          {/* Dimension scores */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
              Dimension Breakdown
            </div>
            <div className="space-y-3">
              {Object.entries(DIMENSION_META).map(([key, meta]) => {
                const rawScore = dimensionScores[key] ?? 1;
                const score = toDisplay(rawScore);
                const isExpanded = expandedDim === key;
                return (
                  <div key={key}>
                    <button
                      onClick={() => setExpandedDim(isExpanded ? null : key)}
                      className="w-full flex items-center gap-3 group"
                    >
                      <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                        <meta.icon className={`w-3.5 h-3.5 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-white/70">{meta.label}</span>
                          <span className={`text-xs font-bold ${meta.color}`}>{score.toFixed(1)}/10</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${meta.color.replace("text-", "bg-")}`}
                            style={{ width: `${score * 10}%` }}
                          />
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top gaps */}
        {topGaps.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                  Priority Capability Gaps
                </div>
                <div className="text-sm text-white/50 mt-0.5">
                  Dimensions with the greatest distance from sector-leading practice
                </div>
              </div>
              <TrendingUp className="w-4 h-4 text-white/20" />
            </div>
            <div className="space-y-3">
              {topGaps.slice(0, 4).map((gap, i) => {
                const meta = DIMENSION_META[gap.dimension];
                if (!meta) return null;
                return (
                  <div
                    key={gap.dimension}
                    className="flex items-center gap-4 bg-white/5 rounded-xl p-4"
                  >
                    <div className="text-lg font-bold text-white/20 w-6 shrink-0">
                      {i + 1}
                    </div>
                    <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                      <meta.icon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-white">{meta.label}</div>
                      <div className="text-xs text-white/40 mt-0.5">
                        Current: {toDisplay(gap.score).toFixed(1)}/10 · Gap to leading: {(gap.gap * 2.5).toFixed(1)} pts
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${
                        gap.priority === "critical"
                          ? "border-rose-500/40 text-rose-400"
                          : gap.priority === "high"
                          ? "border-amber-500/40 text-amber-400"
                          : "border-white/20 text-white/40"
                      }`}
                    >
                      {gap.priority}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-br from-violet-500/10 to-blue-500/5 border border-violet-500/20 rounded-2xl p-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded-full px-4 py-1.5 text-sm text-violet-400">
            <Brain className="w-3.5 h-3.5" />
            Next Step
          </div>
          <h2 className="text-xl font-bold">Build Your AI People Strategy</h2>
          <p className="text-white/50 text-sm max-w-md mx-auto leading-relaxed">
            Your assessment results have been used to pre-populate the AI Strategy Builder with
            recommended initiatives targeting your highest-priority capability gaps.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => navigate("/ai-strategy")}
              className="bg-violet-600 hover:bg-violet-700 text-white px-8"
            >
              Open AI Strategy Builder
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <div className="flex items-center justify-center gap-4 pt-2">
            {[
              "Pre-populated with your gap analysis",
              "Sector-calibrated initiatives",
              "Board-ready output",
            ].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-xs text-white/40">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
