/**
 * Implementation Tracker — v1.3 Block C
 * C1: Initiative status tracking
 * C2: Milestone tracking
 * C3: Implementation dashboard
 * C4: Status timeline
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Circle, Clock, PauseCircle, XCircle, ChevronRight, Milestone, BarChart3, Calendar } from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  not_started: { label: "Not Started", color: "bg-muted/60 text-slate-300 border-slate-600/50", icon: <Circle className="w-3.5 h-3.5" /> },
  in_progress: { label: "In Progress", color: "bg-blue-900/40 text-blue-300 border-blue-700/50", icon: <Clock className="w-3.5 h-3.5" /> },
  paused: { label: "Paused", color: "bg-amber-900/40 text-amber-300 border-amber-700/50", icon: <PauseCircle className="w-3.5 h-3.5" /> },
  completed: { label: "Completed", color: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  cancelled: { label: "Cancelled", color: "bg-red-900/40 text-red-300 border-red-700/50", icon: <XCircle className="w-3.5 h-3.5" /> },
};

const MILESTONE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-muted/60 text-slate-300" },
  in_progress: { label: "In Progress", color: "bg-blue-900/40 text-blue-300" },
  completed: { label: "Completed", color: "bg-emerald-900/40 text-emerald-300" },
  overdue: { label: "Overdue", color: "bg-red-900/40 text-red-300" },
};

const PHASE_COLORS: Record<string, string> = {
  foundation: "bg-violet-900/30 border-violet-700/40 text-violet-300",
  build: "bg-blue-900/30 border-blue-700/40 text-blue-300",
  scale: "bg-emerald-900/30 border-emerald-700/40 text-emerald-300",
  optimise: "bg-amber-900/30 border-amber-700/40 text-amber-300",
};

function StatusUpdateDialog({
  initiativeId,
  currentStatus,
  displayName,
  onSuccess,
}: {
  initiativeId: string;
  currentStatus: string;
  displayName: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");

  const updateMutation = trpc.operationalMaturity.updateInitiativeStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      setOpen(false);
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs">Update status</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Update: {displayName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">New status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key} className="text-xs">{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason / notes (optional)</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Brief note on this status change..."
              className="text-xs h-20 resize-none"
            />
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={() => updateMutation.mutate({ strategyInitiativeId: initiativeId, newStatus: newStatus as any, reason: reason || undefined })}
            disabled={updateMutation.isPending || newStatus === currentStatus}
          >
            {updateMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ImplementationTrackerPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Get the active strategy
  const strategiesQ = trpc.strategy.listStrategies.useQuery(
    { tenantId: user?.tenantId ?? "" },
    { enabled: !!user?.tenantId }
  );
  const activeStrategy = strategiesQ.data?.find(s => s.status === "committed") ?? strategiesQ.data?.[0];
  const strategyId = activeStrategy?.id ?? "";

  // Dashboard data
  const dashboardQ = trpc.operationalMaturity.getImplementationDashboard.useQuery(
    { strategyId },
    { enabled: !!strategyId }
  );

  // Milestones
  const milestonesQ = trpc.operationalMaturity.listMilestones.useQuery(
    { strategyId, phase: "all" },
    { enabled: !!strategyId }
  );

  // Strategy with initiatives
  const strategyDetailQ = trpc.strategy.getStrategy.useQuery(
    { strategyId },
    { enabled: !!strategyId }
  );

  const strategyData = strategyDetailQ.data;

  const generateMilestonesMutation = trpc.operationalMaturity.generateMilestones.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated ${data.count} milestones`);
      utils.operationalMaturity.listMilestones.invalidate();
      utils.operationalMaturity.getImplementationDashboard.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMilestoneMutation = trpc.operationalMaturity.updateMilestoneStatus.useMutation({
    onSuccess: () => {
      utils.operationalMaturity.listMilestones.invalidate();
      utils.operationalMaturity.getImplementationDashboard.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const dashboard = dashboardQ.data;
  const milestones = milestonesQ.data ?? [];

  // Group milestones by phase
  const milestonesByPhase: Record<string, typeof milestones> = {};
  for (const m of milestones) {
    if (!milestonesByPhase[m.phase]) milestonesByPhase[m.phase] = [];
    milestonesByPhase[m.phase].push(m);
  }

  if (!activeStrategy && !strategiesQ.isLoading) {
    return (
      <div className="p-8 text-center">
        <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No active strategy</h2>
        <p className="text-sm text-muted-foreground">Build your HR AI Strategy first to track implementation progress.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Implementation Tracker</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track initiative progress and milestones for your HR AI strategy
          </p>
        </div>
        {strategyData && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateMilestonesMutation.mutate({
              strategyId,
              initiativeIds: strategyData.initiatives.map((i: any) => i.initiativeId),
            })}
            disabled={generateMilestonesMutation.isPending}
          >
            <Milestone className="w-3.5 h-3.5 mr-1.5" />
            {milestones.length > 0 ? "Regenerate Milestones" : "Generate Milestones"}
          </Button>
        )}
      </div>

      {/* Dashboard summary cards */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border border-foreground/10 bg-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-foreground">{dashboard.completionPct}%</div>
              <div className="text-xs text-muted-foreground mt-0.5">Initiatives complete</div>
              <Progress value={dashboard.completionPct} className="h-1.5 mt-2" />
            </CardContent>
          </Card>
          <Card className="border border-blue-700/30 bg-blue-900/20">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-300">{dashboard.statusCounts.in_progress}</div>
              <div className="text-xs text-muted-foreground mt-0.5">In progress</div>
            </CardContent>
          </Card>
          <Card className="border border-emerald-700/30 bg-emerald-900/20">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-emerald-300">{dashboard.statusCounts.completed}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Completed</div>
            </CardContent>
          </Card>
          <Card className="border border-amber-700/30 bg-amber-900/20">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-300">{dashboard.milestoneCounts.overdue}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Overdue milestones</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="initiatives">
        <TabsList className="h-8">
          <TabsTrigger value="initiatives" className="text-xs h-7">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />Initiatives
          </TabsTrigger>
          <TabsTrigger value="milestones" className="text-xs h-7">
            <Milestone className="w-3.5 h-3.5 mr-1.5" />Milestones
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs h-7">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />Timeline
          </TabsTrigger>
        </TabsList>

        {/* C1/C3: Initiatives tab */}
        <TabsContent value="initiatives" className="mt-4">
          {strategyDetailQ.isLoading ? (
            <div className="text-sm text-muted-foreground p-4">Loading initiatives…</div>
          ) : !strategyData?.initiatives?.length ? (
            <div className="text-sm text-muted-foreground p-4">No initiatives in this strategy.</div>
          ) : (
            <div className="space-y-3">
              {strategyData.initiatives.map((init: any) => {
                const status = (init as any).status ?? "not_started";
                const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_started;
                return (
                  <Card key={init.id} className="border shadow-none">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{init.name}</span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0 bg-violet-900/30 border-violet-700/40 text-violet-300">
                            {init.category}
                          </Badge>
                        </div>
                        {(init as any).statusReason && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{(init as any).statusReason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={`text-xs gap-1 ${cfg.color}`}>
                          {cfg.icon}{cfg.label}
                        </Badge>
                        <StatusUpdateDialog
                          initiativeId={init.id}
                          currentStatus={status}
                          displayName={init.name}
                          onSuccess={() => {
                            utils.operationalMaturity.getImplementationDashboard.invalidate();
                            utils.strategy.getStrategy.invalidate();
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* C2: Milestones tab */}
        <TabsContent value="milestones" className="mt-4">
          {milestonesQ.isLoading ? (
            <div className="text-sm text-muted-foreground p-4">Loading milestones…</div>
          ) : milestones.length === 0 ? (
            <div className="text-center py-8">
              <Milestone className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No milestones yet. Click "Generate Milestones" to create a change plan.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {["foundation", "build", "scale", "optimise"].map(phase => {
                const phaseMilestones = milestonesByPhase[phase] ?? [];
                if (phaseMilestones.length === 0) return null;
                return (
                  <div key={phase}>
                    <h3 className={`text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-md inline-block mb-3 ${PHASE_COLORS[phase]}`}>
                      {phase.charAt(0).toUpperCase() + phase.slice(1)} Phase
                    </h3>
                    <div className="space-y-2">
                      {phaseMilestones.map(m => {
                        const mCfg = MILESTONE_STATUS_CONFIG[m.status] ?? MILESTONE_STATUS_CONFIG.pending;
                        return (
                          <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{m.title}</p>
                              {m.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{m.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className={`text-xs ${mCfg.color}`}>{mCfg.label}</Badge>
                              <Select
                                value={m.status}
                                onValueChange={(v) => updateMilestoneMutation.mutate({ milestoneId: m.id, status: v as any })}
                              >
                                <SelectTrigger className="h-7 w-28 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(MILESTONE_STATUS_CONFIG).map(([k, c]) => (
                                    <SelectItem key={k} value={k} className="text-xs">{c.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* C4: Timeline tab */}
        <TabsContent value="timeline" className="mt-4">
          <div className="space-y-2">
            {milestones.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Generate milestones to see the implementation timeline.</p>
              </div>
            ) : (
              milestones.map((m, idx) => {
                const mCfg = MILESTONE_STATUS_CONFIG[m.status] ?? MILESTONE_STATUS_CONFIG.pending;
                const isLast = idx === milestones.length - 1;
                return (
                  <div key={m.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${m.status === "completed" ? "bg-emerald-500" : m.status === "overdue" ? "bg-red-500" : m.status === "in_progress" ? "bg-blue-500" : "bg-slate-300"}`} />
                      {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
                    </div>
                    <div className={`pb-4 flex-1 ${isLast ? "" : ""}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{m.title}</span>
                        <Badge variant="outline" className={`text-xs ${PHASE_COLORS[m.phase]}`}>{m.phase}</Badge>
                        <Badge variant="outline" className={`text-xs ${mCfg.color}`}>{mCfg.label}</Badge>
                      </div>
                      {m.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                      )}
                      {m.completedAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Completed {new Date(m.completedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
