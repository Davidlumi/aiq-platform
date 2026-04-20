/**
 * Learner Dashboard — AiQ Enterprise Platform
 *
 * Implements the canonical readiness state card pattern from the build bible:
 * - Primary readiness state (Safe / At Risk / Unsafe / Unknown)
 * - Capability breakdown with signal scores
 * - ExplanationDrawer on every score
 * - Revalidation countdown
 * - Learning plan progress
 * - Quick actions
 */

import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExplanationDrawer,
  ScoreBreakdown,
} from "@/components/ExplanationDrawer";
import {
  BookOpen,
  ClipboardList,
  Calendar,
  ChevronRight,
  AlertTriangle,
  Info,
  TrendingUp,
  Zap,
  Shield,
  CheckCircle,
  XCircle,
  HelpCircle,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Readiness State Configuration ───────────────────────────────────────────

const READINESS_CONFIG = {
  safe: {
    label: "Safe to Deploy",
    color: "text-[#228833]",
    bg: "bg-[#228833]/8",
    border: "border-[#228833]/30",
    ring: "ring-[#228833]/20",
    icon: CheckCircle,
    description: "Your capability profile meets the deployment threshold for AI-assisted work.",
  },
  at_risk: {
    label: "At Risk",
    color: "text-[#EE8866]",
    bg: "bg-[#EE8866]/8",
    border: "border-[#EE8866]/30",
    ring: "ring-[#EE8866]/20",
    icon: AlertTriangle,
    description: "Some capability gaps identified. Targeted learning has been assigned.",
  },
  unsafe: {
    label: "Unsafe",
    color: "text-[#EE6677]",
    bg: "bg-[#EE6677]/8",
    border: "border-[#EE6677]/30",
    ring: "ring-[#EE6677]/20",
    icon: XCircle,
    description: "Significant capability gaps detected. Mandatory learning required before AI-assisted work.",
  },
  unknown: {
    label: "Not Assessed",
    color: "text-muted-foreground",
    bg: "bg-muted/30",
    border: "border-border",
    ring: "ring-muted/20",
    icon: HelpCircle,
    description: "Complete your capability assessment to establish your readiness profile.",
  },
} as const;

// ─── Capability Colours (colorblind-safe, per brand spec) ─────────────────────

const CAPABILITY_COLOURS: Record<string, { color: string; label: string }> = {
  execution:       { color: "#4477AA", label: "AI Execution" },
  judgement:       { color: "#AA3377", label: "AI Judgement" },
  governance:      { color: "#228833", label: "AI Risk & Governance" },
  appropriateness: { color: "#EE6677", label: "AI Appropriateness" },
  validation:      { color: "#EE8866", label: "Validation" },
  prioritisation:  { color: "#66CCEE", label: "Prioritisation" },
  data_interpretation: { color: "#BBBBBB", label: "Data & Insight" },
  workflow_application: { color: "#4477AA", label: "Workflow Application" },
};

// ─── Readiness State Card ─────────────────────────────────────────────────────

function ReadinessStateCard({
  primaryState,
  overallScore,
  capabilityScores,
  credibilityBand,
}: {
  primaryState: string;
  overallScore: number | null;
  capabilityScores: Record<string, number> | null;
  credibilityBand: string | null;
}) {
  const state = primaryState as keyof typeof READINESS_CONFIG;
  const config = READINESS_CONFIG[state] ?? READINESS_CONFIG.unknown;
  const Icon = config.icon;

  const scoreBreakdownItems = capabilityScores
    ? Object.entries(capabilityScores).map(([key, score]) => ({
        label: CAPABILITY_COLOURS[key]?.label ?? key,
        score,
        maxScore: 100,
        color: CAPABILITY_COLOURS[key]?.color ?? "#4477AA",
        description: `Signal-weighted score for ${CAPABILITY_COLOURS[key]?.label ?? key}`,
      }))
    : [];

  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-6 ring-4",
        config.bg,
        config.border,
        config.ring
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", config.bg, "border", config.border)}>
            <Icon className={cn("w-6 h-6", config.color)} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Readiness State
            </p>
            <h2 className={cn("text-2xl font-bold", config.color)}>{config.label}</h2>
          </div>
        </div>

        {overallScore !== null && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Overall Score</p>
            <p className={cn("text-3xl font-bold", config.color)}>{overallScore}</p>
            <p className="text-xs text-muted-foreground">/ 100</p>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4">{config.description}</p>

      {/* Capability breakdown */}
      {capabilityScores && Object.keys(capabilityScores).length > 0 && (
        <div className="space-y-2 mb-4">
          {Object.entries(capabilityScores).map(([key, score]) => {
            const cap = CAPABILITY_COLOURS[key];
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-36 truncate">
                  {cap?.label ?? key}
                </span>
                <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${score}%`,
                      backgroundColor: cap?.color ?? "#4477AA",
                    }}
                  />
                </div>
                <span className="text-xs font-semibold w-8 text-right" style={{ color: cap?.color ?? "#4477AA" }}>
                  {score}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        {credibilityBand && (
          <span className="text-xs text-muted-foreground">
            Credibility:{" "}
            <span className={cn(
              "font-semibold",
              credibilityBand === "high" ? "text-[#228833]" :
              credibilityBand === "medium" ? "text-[#EE8866]" : "text-[#EE6677]"
            )}>
              {credibilityBand.charAt(0).toUpperCase() + credibilityBand.slice(1)}
            </span>
          </span>
        )}

        {scoreBreakdownItems.length > 0 && (
          <ExplanationDrawer
            trigger={
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Info className="w-3 h-3" />
                How is this calculated?
              </button>
            }
            title="How Your Readiness Score is Calculated"
            subtitle="AiQ uses signal-weighted scoring across 6 capability dimensions"
          >
            <ScoreBreakdown
              overallScore={overallScore ?? 0}
              confidenceLevel={credibilityBand === "high" ? "high" : credibilityBand === "medium" ? "medium" : "low"}
              dataPoints={scoreBreakdownItems.length}
              lastUpdated={new Date().toLocaleDateString()}
              factors={scoreBreakdownItems.map(item => ({
                name: item.label,
                score: item.score,
                weight: 1 / Math.max(scoreBreakdownItems.length, 1),
                description: item.description,
                color: item.color,
              }))}
            />
          </ExplanationDrawer>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LearnerDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = trpc.dashboard.learner.useQuery();

  const firstName = user?.firstName ?? "Learner";

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-24" />
      </div>
    );
  }

  const state = data?.state;
  const credibility = data?.credibility;
  const risk = data?.risk;
  const planProgress = data?.planProgress;
  const revalidation = data?.revalidation;
  const latestScore = data?.latestScore;

  const overallScore = latestScore
    ? Math.round(parseFloat(String(latestScore.overallScore)))
    : null;

  const primaryState = state?.primaryState ?? "unknown";

  // Parse capability scores from the latest assessment score
  let capabilityScores: Record<string, number> | null = null;
  try {
    const breakdown = latestScore?.scoreBreakdownJson as any;
    if (breakdown?.capabilityScores) {
      capabilityScores = breakdown.capabilityScores;
    }
  } catch {}

  const daysToRevalidation = revalidation
    ? Math.max(
        0,
        Math.ceil(
          (new Date(revalidation.dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const complianceState = state?.complianceState ?? "unknown";
  const complianceColor =
    complianceState === "compliant"
      ? "text-[#228833] bg-[#228833]/8 border-[#228833]/30"
      : complianceState === "at_risk"
      ? "text-[#EE8866] bg-[#EE8866]/8 border-[#EE8866]/30"
      : "text-[#EE6677] bg-[#EE6677]/8 border-[#EE6677]/30";

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sora">
            Welcome back, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your capability intelligence summary — {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <span className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border", complianceColor)}>
          {complianceState.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      </div>

      {/* Primary Readiness State Card */}
      {primaryState === "unknown" && !latestScore ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center">
          <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No Assessment on Record</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Complete your capability assessment to establish your readiness profile and receive a personalised learning plan.
          </p>
          <Link href="/assessment">
            <Button className="bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white">
              <ClipboardList className="w-4 h-4 mr-2" />
              Start Assessment
            </Button>
          </Link>
        </div>
      ) : (
        <ReadinessStateCard
          primaryState={primaryState}
          overallScore={overallScore}
          capabilityScores={capabilityScores}
          credibilityBand={credibility?.band ?? null}
        />
      )}

      {/* Learning Plan + Revalidation */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Learning Plan Progress */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 font-sora">
                <BookOpen className="w-4 h-4 text-[#3B4EFF]" />
                Learning Plan
              </CardTitle>
              <Link href="/learning">
                <Button variant="ghost" size="sm" className="text-[#3B4EFF] h-7 px-2 text-xs">
                  View plan <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {planProgress ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {planProgress.completed} of {planProgress.total} modules
                  </span>
                  <span className="font-bold text-foreground">{planProgress.percent}%</span>
                </div>
                <Progress value={planProgress.percent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {planProgress.total - planProgress.completed} modules remaining
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No active learning plan</p>
                <Link href="/assessment">
                  <Button size="sm" className="bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white text-xs">
                    Take Assessment to Generate Plan
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revalidation */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-sora">
              <Calendar className="w-4 h-4 text-[#3B4EFF]" />
              Revalidation Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revalidation ? (
              <div className="space-y-3">
                <div className="flex items-end gap-1">
                  <span
                    className={cn(
                      "text-4xl font-bold",
                      daysToRevalidation !== null && daysToRevalidation <= 7
                        ? "text-[#EE6677]"
                        : daysToRevalidation !== null && daysToRevalidation <= 30
                        ? "text-[#EE8866]"
                        : "text-foreground"
                    )}
                  >
                    {daysToRevalidation}
                  </span>
                  <span className="text-muted-foreground mb-1">days remaining</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Due: {new Date(revalidation.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                {revalidation.triggerReason && (
                  <p className="text-xs text-muted-foreground italic">{revalidation.triggerReason}</p>
                )}
                {daysToRevalidation !== null && daysToRevalidation <= 14 && (
                  <Link href="/assessment">
                    <Button size="sm" className="w-full bg-[#EE6677] hover:bg-[#EE6677]/90 text-white text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Start Revalidation Now
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No revalidation scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Take Assessment",
              path: "/assessment",
              icon: ClipboardList,
              color: "bg-[#4477AA]/8 text-[#4477AA] border-[#4477AA]/20 hover:bg-[#4477AA]/15",
            },
            {
              label: "My Learning Plan",
              path: "/learning",
              icon: BookOpen,
              color: "bg-[#228833]/8 text-[#228833] border-[#228833]/20 hover:bg-[#228833]/15",
            },
            {
              label: "Content Library",
              path: "/library",
              icon: BarChart3,
              color: "bg-[#AA3377]/8 text-[#AA3377] border-[#AA3377]/20 hover:bg-[#AA3377]/15",
            },
            {
              label: "Simulations",
              path: "/simulations",
              icon: Zap,
              color: "bg-[#EE8866]/8 text-[#EE8866] border-[#EE8866]/20 hover:bg-[#EE8866]/15",
            },
          ].map(action => {
            const Icon = action.icon;
            return (
              <Link key={action.path} href={action.path}>
                <div
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border cursor-pointer transition-colors",
                    action.color
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium text-center">{action.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
