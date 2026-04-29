/**
 * TeamProgressPage — Wireframe M4 visual language
 *
 * 4 KPI tiles · per-person progress rows with level chip,
 * module completion bar, streak indicator, and nudge action.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, Send, Flame, AlertTriangle, Users, TrendingUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getLevelFromScore, getLevelChipStyle, getLevelLabel } from "@/lib/level-utils";

function KpiTile({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "#6B7280" }}>{label}</p>
        {icon && <span style={{ color: "#9CA3AF" }}>{icon}</span>}
      </div>
      <p className="text-3xl font-medium mb-1" style={{ color: "#0F2547" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "#6B7280" }}>{sub}</p>}
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: pct >= 80 ? "#047857" : pct >= 40 ? "#557DAE" : "#94A3B8" }} />
      </div>
      <span className="text-xs tabular-nums" style={{ color: "#6B7280", width: 32, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

export default function TeamProgressPage() {
  const { data, isLoading, refetch } = trpc.adaptiveLearning.getTeamLearningProgress.useQuery();
  const { data: modules } = trpc.adaptiveLearning.listModules.useQuery({ pageSize: 50 });
  const sendNudge = trpc.adaptiveLearning.sendNudge.useMutation({
    onSuccess: () => {
      toast.success("Nudge sent!");
      setNudgeDialog(null);
      refetch();
    },
    onError: (err) => toast.error(err.message ?? "Failed to send nudge"),
  });
  const [nudgeDialog, setNudgeDialog] = useState<{ userId: string; name: string } | null>(null);
  const [nudgeModuleId, setNudgeModuleId] = useState("");
  const [nudgeMessage, setNudgeMessage] = useState("");

  const members = data?.members ?? [];
  const withPlan = members.filter(m => m.plan);
  const avgCompletion = withPlan.length > 0
    ? Math.round(withPlan.reduce((s, m) => s + (m.plan?.progressPct ?? 0), 0) / withPlan.length)
    : 0;
  const activeStreaks = members.filter(m => (m.streak?.currentStreak ?? 0) > 0).length;
  const noActivity = members.filter(m => !m.plan || ((m.streak?.currentStreak ?? 0) === 0)).length;

  return (
    <div className="px-5 py-6 md:px-8 max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-400 mb-0.5">Manager tools</p>
          <h1 className="text-lg font-semibold" style={{ color: "#0F2547" }}>Team Progress</h1>
          <p className="text-xs mt-1" style={{ color: "#6B7280" }}>Monitor your team's AI capability development</p>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />Dashboard
          </Button>
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* 4 KPI tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiTile label="Team size" value={data?.totalMembers ?? 0} sub="Total members" icon={<Users className="w-4 h-4" />} />
            <KpiTile label="Avg completion" value={`${avgCompletion}%`} sub="Of active plans" icon={<TrendingUp className="w-4 h-4" />} />
            <KpiTile label="Active streaks" value={activeStreaks} sub="Learning daily" icon={<Flame className="w-4 h-4" />} />
            <KpiTile label="Need attention" value={noActivity} sub="No recent activity" icon={<AlertTriangle className="w-4 h-4" />} />
          </div>

          {/* Member rows */}
          {members.length === 0 ? (
            <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-10 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#F3F4F6" }}>
                <Users className="w-6 h-6" style={{ color: "#9CA3AF" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "#0F2547" }}>No team members yet</p>
              <p className="text-xs max-w-xs" style={{ color: "#6B7280" }}>Add team members from the People page to track their learning progress here.</p>
              <Link href="/people">
                <Button size="sm" variant="outline" className="gap-1.5 mt-2"><Users className="w-3.5 h-3.5" />Manage team</Button>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-neutral-100 shadow-sm">
              {/* Table header */}
              <div className="grid gap-4 px-5 py-3" style={{ gridTemplateColumns: "1fr 100px 180px 80px 40px", borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
                <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "#6B7280" }}>Member</p>
                <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "#6B7280" }}>Level</p>
                <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "#6B7280" }}>Plan progress</p>
                <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "#6B7280" }}>Streak</p>
                <div />
              </div>
              {/* Member rows */}
              {members.map((member, i) => {
                const level = member.overallScore !== null ? getLevelFromScore(member.overallScore) : null;
                const chipStyle = level !== null ? getLevelChipStyle(level) : null;
                const hasStreak = (member.streak?.currentStreak ?? 0) > 0;
                const isStalled = !member.plan || ((member.streak?.currentStreak ?? 0) === 0 && (member.plan?.progressPct ?? 0) < 100);
                return (
                  <div key={member.userId} className="grid gap-4 px-5 py-3 items-center" style={{ gridTemplateColumns: "1fr 100px 180px 80px 40px", borderBottom: i < members.length - 1 ? "0.5px solid rgba(0,0,0,0.06)" : undefined }}>
                    {/* Name + status */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0" style={{ background: "#E0E7EF", color: "#1F3A5F" }}>
                        {member.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "#0F2547" }}>{member.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isStalled && !hasStreak && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: "#D97706" }}>
                              <AlertTriangle className="w-3 h-3" />No activity
                            </span>
                          )}
                          {!member.plan && (
                            <span className="text-xs" style={{ color: "#9CA3AF" }}>No plan yet</span>
                          )}
                          {member.plan && member.plan.progressPct === 100 && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: "#047857" }}>
                              <CheckCircle2 className="w-3 h-3" />Complete
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Level chip */}
                    <div>
                      {chipStyle && level !== null ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-medium" style={{ backgroundColor: chipStyle.bg, color: chipStyle.text }}>{level}</span>
                          <span className="text-xs" style={{ color: "#6B7280" }}>{(member.overallScore! / 10).toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "#9CA3AF" }}>—</span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div>
                      {member.plan ? (
                        <div>
                          <ProgressBar pct={member.plan.progressPct} />
                          <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{member.plan.completedModules}/{member.plan.totalModules} modules</p>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "#9CA3AF" }}>No plan</span>
                      )}
                    </div>
                    {/* Streak */}
                    <div>
                      {hasStreak ? (
                        <span className="flex items-center gap-1 text-sm font-medium" style={{ color: "#D97706" }}>
                          <Flame className="w-3.5 h-3.5" />{member.streak!.currentStreak}d
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "#9CA3AF" }}>—</span>
                      )}
                    </div>
                    {/* Nudge */}
                    <div>
                      <Button size="sm" variant="ghost" className="w-8 h-8 p-0" onClick={() => { setNudgeDialog({ userId: member.userId, name: member.name }); setNudgeModuleId(""); setNudgeMessage(""); }}>
                        <Send className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

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
                <SelectTrigger><SelectValue placeholder="Select a module…" /></SelectTrigger>
                <SelectContent>
                  {(modules?.items ?? []).map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Personal note (optional)</label>
              <Textarea placeholder="e.g. This module addresses the gap we discussed in your last 1:1…" value={nudgeMessage} onChange={e => setNudgeMessage(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNudgeDialog(null)}>Cancel</Button>
            <Button disabled={!nudgeModuleId || sendNudge.isPending} onClick={() => {
              if (!nudgeDialog || !nudgeModuleId) return;
              sendNudge.mutate({ learnerId: nudgeDialog.userId, moduleId: nudgeModuleId, message: nudgeMessage || undefined });
            }}>
              <Send className="w-3.5 h-3.5 mr-1.5" />{sendNudge.isPending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
