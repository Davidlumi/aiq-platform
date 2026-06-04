/**
 * CompanyAssessmentHomePage — /company-assessment
 *
 * Aggregate shell for the Company-wide domain in HR AI Strategy.
 * Shows the organisation's AI maturity score, dimension breakdown,
 * and CTAs to start/resume the assessment or view results.
 */
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Target,
  BarChart3,
  Shield,
  Layers,
  Users,
  Lightbulb,
  ArrowRight,
  Plus,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DIMENSIONS = [
  { key: "strategy_governance", label: "Strategy & Governance", icon: Target,    colour: "text-violet-400" },
  { key: "data_infrastructure",  label: "Data & Infrastructure",  icon: Layers,   colour: "text-blue-400"   },
  { key: "talent_capability",    label: "Talent & Capability",    icon: Users,    colour: "text-emerald-400" },
  { key: "process_adoption",     label: "Process & Adoption",     icon: BarChart3, colour: "text-amber-400"  },
  { key: "ethics_trust",         label: "Ethics & Trust",         icon: Shield,   colour: "text-rose-400"   },
  { key: "value_impact",         label: "Value & Impact",         icon: Lightbulb, colour: "text-cyan-400"  },
];

function scoreColour(score: number) {
  if (score >= 70) return "text-emerald-400";
  if (score >= 45) return "text-amber-400";
  return "text-rose-400";
}

function scoreLabel(score: number) {
  if (score >= 70) return "Advanced";
  if (score >= 45) return "Developing";
  return "Early Stage";
}

export default function CompanyAssessmentHomePage() {
  const [, navigate] = useLocation();

  const { data: results, isLoading } = trpc.companyAssessment.getMyAssessmentResults.useQuery(undefined, {
    retry: false,
  });

  const hasCompleted = !!results?.overallScore;
  const overallScore = results?.overallScore ?? null;
  // Build a key→score map from the dimensions array
  const dimensionScores: Record<string, number> = {};
  if (results?.dimensions) {
    for (const d of results.dimensions) {
      dimensionScores[d.key] = d.score;
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-violet-400" />
            <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              HR AI Strategy · Company-wide
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Company AI Maturity
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg">
            A rigorous assessment of your organisation's readiness to design, deploy, and govern AI
            across your people practices — grounded in frameworks from Deloitte, PwC, CIPD, and MIT Sloan.
          </p>
        </div>
        <Button
          onClick={() => navigate("/company-assessment/session")}
          className="shrink-0"
          variant={hasCompleted ? "outline" : "default"}
        >
          {hasCompleted ? (
            <>
              <Plus className="w-4 h-4 mr-2" />
              New Assessment
            </>
          ) : (
            <>
              Start Assessment
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Score overview */}
      {isLoading ? (
        <div className="animate-pulse rounded-2xl border border-border/40 bg-foreground/4 p-8 h-40" />
      ) : hasCompleted && overallScore !== null ? (
        <div className="rounded-2xl border border-border/40 bg-foreground/4 p-6 flex flex-col sm:flex-row items-center gap-6">
          {/* Overall score */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className={cn("text-5xl font-bold tabular-nums", scoreColour(overallScore))}>
              {Math.round(overallScore)}
            </div>
            <div className="text-xs text-muted-foreground">out of 100</div>
            <div className={cn("text-xs font-semibold mt-1", scoreColour(overallScore))}>
              {scoreLabel(overallScore)}
            </div>
          </div>
          <div className="w-px h-16 bg-border/40 hidden sm:block" />
          {/* Dimension bars */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {DIMENSIONS.map((dim) => {
              const score = dimensionScores[dim.key] ?? 0;
              const Icon = dim.icon;
              return (
                <div key={dim.key} className="flex items-center gap-3">
                  <Icon className={cn("w-4 h-4 shrink-0", dim.colour)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground truncate">{dim.label}</span>
                      <span className={cn("text-xs font-semibold tabular-nums ml-2", scoreColour(score))}>
                        {Math.round(score)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-foreground/8 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          score >= 70 ? "bg-emerald-500" : score >= 45 ? "bg-amber-500" : "bg-rose-500"
                        )}
                        style={{ width: `${Math.min(score, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* No assessment yet */
        <div className="rounded-2xl border border-dashed border-border/50 bg-foreground/2 p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-violet-400" />
          </div>
          <div>
            <p className="font-semibold text-foreground">No assessment completed yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Complete the Company HR AI Assessment to see your organisation's maturity score across 6 dimensions.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap justify-center">
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 15–20 minutes</span>
            <span>·</span>
            <span>40–52 adaptive questions</span>
            <span>·</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Instant results</span>
          </div>
          <Button onClick={() => navigate("/company-assessment/session")} className="mt-2">
            Start Assessment
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Dimension cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DIMENSIONS.map((dim) => {
          const Icon = dim.icon;
          const score = dimensionScores[dim.key];
          return (
            <div
              key={dim.key}
              className="rounded-xl border border-border/40 bg-foreground/3 p-4 space-y-2.5"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-foreground/6 flex items-center justify-center shrink-0">
                  <Icon className={cn("w-4 h-4", dim.colour)} />
                </div>
                <span className="text-sm font-semibold text-foreground">{dim.label}</span>
              </div>
              {hasCompleted && score !== undefined ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-foreground/8 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        score >= 70 ? "bg-emerald-500" : score >= 45 ? "bg-amber-500" : "bg-rose-500"
                      )}
                      style={{ width: `${Math.min(score, 100)}%` }}
                    />
                  </div>
                  <span className={cn("text-xs font-semibold tabular-nums shrink-0", scoreColour(score))}>
                    {Math.round(score)}
                  </span>
                </div>
              ) : (
                <div className="h-1.5 rounded-full bg-foreground/8" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
