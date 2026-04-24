/**
 * TeamLearningPage — /manager/team-learning
 * Manager view of team learning progress: per-report plan status,
 * capability progress, last active date, at-risk learners, nudge functionality.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, BookOpen, Flame, AlertTriangle, Send, TrendingUp } from "lucide-react";

function ReadinessBadge({ band }: { band: string | null }) {
  if (!band) return <Badge variant="outline" className="text-xs">No data</Badge>;
  const map: Record<string, { label: string; className: string }> = {
    safe: { label: "Safe", className: "bg-emerald-500/15 text-emerald-700 border-emerald-200" },
    at_risk: { label: "At Risk", className: "bg-amber-500/15 text-amber-700 border-amber-200" },
    provisional: { label: "Provisional", className: "bg-blue-500/15 text-blue-700 border-blue-200" },
    critical: { label: "Critical", className: "bg-red-500/15 text-red-700 border-red-200" },
  };
  const cfg = map[band] ?? { label: band, className: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>;
}

export default function TeamLearningPage() {
  const { data, isLoading, refetch } = trpc.adaptiveLearning.getTeamLearningProgress.useQuery();
  const { data: modules } = trpc.adaptiveLearning.listModules.useQuery({ pageSize: 50 });
  const sendNudge = trpc.adaptiveLearning.sendNudge.useMutation({
    onSuccess: () => {
      toast.success("Nudge sent! Your team member will see the module recommendation.");
      setNudgeDialog(null);
      refetch();
    },
    onError: (err) => toast.error(err.message ?? "Failed to send nudge"),
  });

  const [nudgeDialog, setNudgeDialog] = useState<{ userId: string; name: string } | null>(null);
  const [nudgeModuleId, setNudgeModuleId] = useState("");
  const [nudgeMessage, setNudgeMessage] = useState("");

  const members = data?.members ?? [];
  const atRisk = members.filter(m => !m.streak?.totalModulesCompleted || m.streak.currentStreak === 0);
  const avgCompletion = members.length > 0
    ? Math.round(members.reduce((s, m) => s + (m.plan?.progressPct ?? 0), 0) / members.length)
    : 0;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Learning</h1>
          <p className="text-muted-foreground mt-1 text-sm">Monitor your team's AI capability development progress</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Users className="h-3.5 w-3.5" />Team size</div>
              <div className="text-2xl font-bold">{data?.totalMembers ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="h-3.5 w-3.5" />Avg completion</div>
              <div className="text-2xl font-bold">{avgCompletion}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Flame className="h-3.5 w-3.5" />Active streaks</div>
              <div className="text-2xl font-bold">{members.filter(m => (m.streak?.currentStreak ?? 0) > 0).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><AlertTriangle className="h-3.5 w-3.5" />At risk (no activity)</div>
              <div className="text-2xl font-bold text-amber-600">{atRisk.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Team member table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" />Individual Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading team data…</div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No team members yet. Add members from the Team Dashboard.
              </div>
            ) : (
              <div className="space-y-3">
                {members.map(member => (
                  <div key={member.userId} className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{member.name}</span>
                        <ReadinessBadge band={member.readinessBand} />
                        {(member.streak?.currentStreak ?? 0) > 0 && (
                          <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-700 border-orange-200">
                            🔥 {member.streak!.currentStreak}-day streak
                          </Badge>
                        )}
                        {(member.streak?.currentStreak ?? 0) === 0 && (
                          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />No activity
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{member.email}</div>
                      {member.plan && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{member.plan.completedModules}/{member.plan.totalModules} modules</span>
                            <span>{member.plan.progressPct}%</span>
                          </div>
                          <Progress value={member.plan.progressPct} className="h-1.5" />
                        </div>
                      )}
                      {!member.plan && (
                        <div className="text-xs text-muted-foreground mt-1">No learning plan yet</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {member.overallScore !== null && (
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">AI Score</div>
                          <div className="font-bold text-sm">{Math.round(member.overallScore)}</div>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNudgeDialog({ userId: member.userId, name: member.name });
                          setNudgeModuleId("");
                          setNudgeMessage("");
                        }}
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" />Nudge
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nudge dialog */}
      <Dialog open={!!nudgeDialog} onOpenChange={open => !open && setNudgeDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Module Recommendation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Recommend to</label>
              <div className="text-sm text-muted-foreground bg-muted rounded px-3 py-2">{nudgeDialog?.name}</div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Module</label>
              <Select value={nudgeModuleId} onValueChange={setNudgeModuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a module…" />
                </SelectTrigger>
                <SelectContent>
                  {(modules?.items ?? []).map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Personal note (optional)</label>
              <Textarea
                placeholder="e.g. This module addresses the gap we discussed in your last 1:1…"
                value={nudgeMessage}
                onChange={e => setNudgeMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNudgeDialog(null)}>Cancel</Button>
            <Button
              disabled={!nudgeModuleId || sendNudge.isPending}
              onClick={() => {
                if (!nudgeDialog || !nudgeModuleId) return;
                sendNudge.mutate({
                  learnerId: nudgeDialog.userId,
                  moduleId: nudgeModuleId,
                  message: nudgeMessage,
                });
              }}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />Send Nudge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
