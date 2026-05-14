/**
 * Maturity Progression — v1.3 Block D
 * D1: Re-assessment workflow
 * D2: Maturity progression visualisation
 * D3: Strategy refresh suggestions
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, TrendingDown, Minus, RefreshCw, History, Bell, ChevronRight, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

const DOMAIN_LABELS: Record<string, string> = {
  interaction: "AI Interaction",
  output_eval: "AI Output Evaluation",
  workflow: "AI Workflow Design",
  workforce: "Workforce AI Readiness",
  ethics: "AI Ethics & Trust",
  change: "AI Change Leadership",
};

const MATURITY_BANDS = [
  { min: 0, max: 1.5, label: "Foundational", color: "text-muted-foreground" },
  { min: 1.5, max: 2.5, label: "Developing", color: "text-blue-600" },
  { min: 2.5, max: 3.5, label: "Established", color: "text-violet-600" },
  { min: 3.5, max: 4.5, label: "Advanced", color: "text-emerald-600" },
  { min: 4.5, max: 5, label: "Leading", color: "text-amber-600" },
];

function getMaturityBand(score: number) {
  return MATURITY_BANDS.find(b => score >= b.min && score < b.max) ?? MATURITY_BANDS[MATURITY_BANDS.length - 1];
}

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const band = getMaturityBand(score);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-medium w-8 text-right ${band.color}`}>{score.toFixed(1)}</span>
    </div>
  );
}

function SnapshotCard({ snapshot, isLatest }: { snapshot: any; isLatest: boolean }) {
  const band = getMaturityBand(snapshot.overallScore);
  const date = new Date(snapshot.assessedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className={`p-4 rounded-lg border ${isLatest ? "border-violet-200 bg-violet-50/50" : "bg-card"}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{date}</span>
            {isLatest && <Badge variant="outline" className="text-xs bg-violet-100 text-violet-700 border-violet-200">Latest</Badge>}
          </div>
          <span className="text-xs text-muted-foreground capitalize">{snapshot.assessmentType.replace("_", " ")}</span>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${band.color}`}>{snapshot.overallScore.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">{band.label}</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {Object.entries(snapshot.domainScores as Record<string, number>).map(([domain, score]) => (
          <div key={domain} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-36 shrink-0">{DOMAIN_LABELS[domain] ?? domain}</span>
            <ScoreBar score={score} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RefreshSuggestionCard({ suggestion, onUpdate }: { suggestion: any; onUpdate: () => void }) {
  const [snoozeDate, setSnoozeDate] = useState("");
  const updateMutation = trpc.operationalMaturity.updateRefreshSuggestion.useMutation({
    onSuccess: () => { toast.success("Updated"); onUpdate(); },
    onError: (e) => toast.error(e.message),
  });

  const triggerLabels: Record<string, string> = {
    capability_progression: "Capability progression",
    library_version_update: "Library updated",
    milestone_completion: "Milestone completed",
    manual: "Manual trigger",
  };

  return (
    <Card className="border shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs bg-amber-900/30 text-amber-300 border-amber-700/40">
                {triggerLabels[suggestion.triggerType] ?? suggestion.triggerType}
              </Badge>
            </div>
            {suggestion.triggerDetail && (
              <p className="text-sm text-muted-foreground">{suggestion.triggerDetail}</p>
            )}
            {suggestion.previousScore != null && suggestion.currentScore != null && (
              <p className="text-xs text-muted-foreground mt-1">
                Score: {suggestion.previousScore.toFixed(1)} → {suggestion.currentScore.toFixed(1)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Library: {suggestion.currentLibraryVersion}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => updateMutation.mutate({ suggestionId: suggestion.id, action: "dismiss" })}
              disabled={updateMutation.isPending}
            >
              Dismiss
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              asChild
            >
              <Link href="/strategy/diagnostic">
                Reassess <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MaturityProgressionPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const progressionQ = trpc.operationalMaturity.getMaturityProgression.useQuery();
  const suggestionsQ = trpc.operationalMaturity.listRefreshSuggestions.useQuery();

  const { snapshots = [], trend = "stable", delta = 0 } = progressionQ.data ?? {};

  const trendIcon = trend === "improving"
    ? <TrendingUp className="w-4 h-4 text-emerald-400" />
    : trend === "declining"
    ? <TrendingDown className="w-4 h-4 text-red-400" />
    : <Minus className="w-4 h-4 text-muted-foreground" />;

  const trendColor = trend === "improving" ? "text-emerald-400" : trend === "declining" ? "text-red-400" : "text-muted-foreground";

  const latestSnapshot = snapshots[snapshots.length - 1];
  const previousSnapshot = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Maturity Progression</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track your organisation's AI capability evolution over time
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/strategy/diagnostic">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Reassess Now
          </Link>
        </Button>
      </div>

      {/* D2: Trend summary */}
      {snapshots.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="border border-foreground/10 bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                {trendIcon}
                <span className={`text-sm font-semibold capitalize ${trendColor}`}>{trend}</span>
              </div>
              <div className="text-xs text-muted-foreground">Overall trend</div>
            </CardContent>
          </Card>
          <Card className="border border-foreground/10 bg-card">
            <CardContent className="p-4">
              <div className={`text-2xl font-bold ${delta >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {delta >= 0 ? "+" : ""}{delta.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Score delta (first → latest)</div>
            </CardContent>
          </Card>
          <Card className="border border-foreground/10 bg-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-foreground">{snapshots.length}</div>
              <div className="text-xs text-muted-foreground">Assessment snapshots</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="progression">
        <TabsList className="h-8">
          <TabsTrigger value="progression" className="text-xs h-7">
            <TrendingUp className="w-3.5 h-3.5 mr-1.5" />Progression
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs h-7">
            <History className="w-3.5 h-3.5 mr-1.5" />History
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="text-xs h-7">
            <Bell className="w-3.5 h-3.5 mr-1.5" />
            Refresh Suggestions
            {(suggestionsQ.data?.length ?? 0) > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {suggestionsQ.data?.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* D2: Progression tab */}
        <TabsContent value="progression" className="mt-4">
          {progressionQ.isLoading ? (
            <div className="text-sm text-muted-foreground p-4">Loading progression data…</div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-10">
              <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-base font-semibold mb-2">No assessment history yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Complete your first assessment to start tracking maturity progression.</p>
              <Button size="sm" asChild>
                <Link href="/strategy/diagnostic">Start Assessment</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Domain comparison: latest vs previous */}
              {latestSnapshot && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Domain Scores — Latest Snapshot</CardTitle>
                    {previousSnapshot && (
                      <CardDescription className="text-xs">
                        Compared to previous assessment on {new Date(previousSnapshot.assessedAt).toLocaleDateString("en-GB")}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(latestSnapshot.domainScores as Record<string, number>).map(([domain, score]) => {
                      const prevScore = previousSnapshot?.domainScores?.[domain];
                      const diff = prevScore != null ? score - prevScore : null;
                      return (
                        <div key={domain} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">{DOMAIN_LABELS[domain] ?? domain}</span>
                            <div className="flex items-center gap-2">
                              {diff != null && (
                                <span className={`text-xs ${diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                                  {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          <ScoreBar score={score} />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* D1: History tab */}
        <TabsContent value="history" className="mt-4">
          {progressionQ.isLoading ? (
            <div className="text-sm text-muted-foreground p-4">Loading history…</div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No assessment history yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[...snapshots].reverse().map((snap, idx) => (
                <SnapshotCard key={snap.id} snapshot={snap} isLatest={idx === 0} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* D3: Refresh suggestions tab */}
        <TabsContent value="suggestions" className="mt-4">
          {suggestionsQ.isLoading ? (
            <div className="text-sm text-muted-foreground p-4">Loading suggestions…</div>
          ) : !suggestionsQ.data?.length ? (
            <div className="text-center py-8">
              <Bell className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No refresh suggestions at this time.</p>
              <p className="text-xs text-muted-foreground mt-1">Suggestions appear when your capability score changes significantly or the content library is updated.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestionsQ.data.map(s => (
                <RefreshSuggestionCard
                  key={s.id}
                  suggestion={s}
                  onUpdate={() => suggestionsQ.refetch()}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
