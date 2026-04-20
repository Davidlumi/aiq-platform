import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  Shield,
  AlertTriangle,
  BookOpen,
  ClipboardList,
  Calendar,
  ChevronRight,
  Award,
  Target,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

function StateCard({
  label,
  value,
  band,
  icon: Icon,
  description,
}: {
  label: string;
  value: string | number | null;
  band?: "high" | "medium" | "low" | null;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}) {
  const bandColors = {
    high: "text-emerald-600 bg-emerald-50 border-emerald-200",
    medium: "text-amber-600 bg-amber-50 border-amber-200",
    low: "text-red-600 bg-red-50 border-red-200",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-accent" />
        </div>
        {band && (
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full border",
              bandColors[band]
            )}
          >
            {band.charAt(0).toUpperCase() + band.slice(1)}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">
        {value ?? "—"}
      </p>
      <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </div>
  );
}

export default function LearnerDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = trpc.dashboard.learner.useQuery();

  const firstName = user?.firstName ?? "Learner";

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  const state = data?.state;
  const credibility = data?.credibility;
  const risk = data?.risk;
  const planProgress = data?.planProgress;
  const revalidation = data?.revalidation;
  const latestScore = data?.latestScore;

  const credibilityScore = credibility
    ? Math.round(parseFloat(String(credibility.credibilityScore)) * 100)
    : null;
  const riskScore = risk
    ? Math.round(parseFloat(String(risk.riskScore)) * 100)
    : null;
  const overallScore = latestScore
    ? Math.round(parseFloat(String(latestScore.overallScore)))
    : null;

  const daysToRevalidation = revalidation
    ? Math.max(
        0,
        Math.ceil(
          (new Date(revalidation.dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const primaryStateLabel = state?.primaryState
    ? state.primaryState.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : "Not assessed";

  const complianceLabel = state?.complianceState
    ? state.complianceState.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : "Unknown";

  const complianceColor =
    state?.complianceState === "compliant"
      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
      : state?.complianceState === "at_risk"
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : "text-red-600 bg-red-50 border-red-200";

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's your capability intelligence summary
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-semibold px-3 py-1 rounded-full border",
              complianceColor
            )}
          >
            {complianceLabel}
          </span>
        </div>
      </div>

      {/* State cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StateCard
          label="Capability State"
          value={primaryStateLabel}
          icon={Target}
          description="Your current proficiency level"
        />
        <StateCard
          label="Credibility Score"
          value={credibilityScore !== null ? `${credibilityScore}%` : null}
          band={credibility?.band as any}
          icon={Award}
          description="Assessment credibility signal"
        />
        <StateCard
          label="Risk Score"
          value={riskScore !== null ? `${riskScore}%` : null}
          band={risk?.band === "low" ? "high" : risk?.band === "high" ? "low" : "medium"}
          icon={Shield}
          description="Compliance risk level"
        />
        <StateCard
          label="Latest Assessment"
          value={overallScore !== null ? `${overallScore}%` : null}
          icon={ClipboardList}
          description="Most recent assessment score"
        />
      </div>

      {/* Learning Plan Progress */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent" />
                Learning Plan Progress
              </CardTitle>
              <Link href="/learning">
                <Button variant="ghost" size="sm" className="text-accent h-7 px-2">
                  View <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {planProgress ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {planProgress.completed} of {planProgress.total} modules completed
                  </span>
                  <span className="font-semibold text-foreground">{planProgress.percent}%</span>
                </div>
                <Progress value={planProgress.percent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {planProgress.total - planProgress.completed} modules remaining
                </p>
              </div>
            ) : (
              <div className="text-center py-6">
                <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active learning plan</p>
                <Link href="/assessment">
                  <Button size="sm" className="mt-3 bg-accent hover:bg-accent/90 text-white">
                    Take Assessment
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revalidation countdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" />
              Revalidation Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revalidation ? (
              <div className="space-y-3">
                <div
                  className={cn(
                    "text-4xl font-bold",
                    daysToRevalidation !== null && daysToRevalidation <= 7
                      ? "text-red-500"
                      : daysToRevalidation !== null && daysToRevalidation <= 30
                      ? "text-amber-500"
                      : "text-foreground"
                  )}
                >
                  {daysToRevalidation}
                  <span className="text-lg font-normal text-muted-foreground ml-1">days</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Due: {new Date(revalidation.dueAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">{revalidation.triggerReason}</p>
                {daysToRevalidation !== null && daysToRevalidation <= 14 && (
                  <Link href="/assessment">
                    <Button size="sm" variant="destructive" className="w-full">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Start Revalidation Now
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No revalidation scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Take Assessment", path: "/assessment", icon: ClipboardList, color: "bg-blue-50 text-blue-700 border-blue-200" },
            { label: "My Learning Plan", path: "/learning", icon: BookOpen, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
            { label: "Content Library", path: "/library", icon: Zap, color: "bg-purple-50 text-purple-700 border-purple-200" },
            { label: "Simulations", path: "/simulations", icon: TrendingUp, color: "bg-amber-50 text-amber-700 border-amber-200" },
          ].map(action => {
            const Icon = action.icon;
            return (
              <Link key={action.path} href={action.path}>
                <div
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-shadow",
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
