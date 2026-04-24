/**
 * Team Learning Dashboard — Manager view
 * Shows team members' readiness scores, learning progress, streaks, and capability gaps.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Users, UserPlus, Target, BookOpen, Clock, Flame,
  TrendingUp, TrendingDown, Minus, ChevronRight, Award,
  BarChart3, AlertTriangle, CheckCircle2, Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BAND_COLOURS: Record<string, { text: string; bg: string; border: string }> = {
  critical:   { text: "text-red-400",    bg: "bg-red-950/20",    border: "border-red-700/40" },
  developing: { text: "text-amber-400",  bg: "bg-amber-950/20",  border: "border-amber-700/40" },
  proficient: { text: "text-emerald-400",bg: "bg-emerald-950/20",border: "border-emerald-700/40" },
  advanced:   { text: "text-blue-400",   bg: "bg-blue-950/20",   border: "border-blue-700/40" },
};

function MemberCard({ member }: { member: any }) {
  const band = member.readinessBand ?? "developing";
  const colours = BAND_COLOURS[band] ?? BAND_COLOURS.developing;
  const progress = member.plan?.progressPct ?? 0;

  return (
    <div className={cn("rounded-xl border p-4 bg-card", colours.border)}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-sm">{member.name}</p>
          <p className="text-xs text-muted-foreground">{member.email}</p>
        </div>
        {member.readinessBand && (
          <Badge variant="outline" className={cn("text-[10px] border-0 capitalize", colours.bg, colours.text)}>
            {member.readinessBand}
          </Badge>
        )}
      </div>

      {/* Readiness score */}
      {member.overallScore !== null && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">AI Readiness</span>
            <span className="font-semibold">{Math.round(member.overallScore)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${member.overallScore}%`, background: member.overallScore >= 80 ? "#6366f1" : member.overallScore >= 60 ? "#10b981" : member.overallScore >= 40 ? "#f59e0b" : "#ef4444" }}
            />
          </div>
        </div>
      )}

      {/* Learning plan progress */}
      {member.plan && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Learning Plan</span>
            <span className="font-semibold">{member.plan.completedModules}/{member.plan.totalModules} modules</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Streak */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {member.streak && (
          <>
            <div className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-orange-400" />
              <span>{member.streak.currentStreak}d streak</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="h-3 w-3 text-primary" />
              <span>{member.streak.totalModulesCompleted} done</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>{member.streak.totalMinsLearned}m</span>
            </div>
          </>
        )}
        {!member.streak && <span className="italic">No learning activity yet</span>}
      </div>
    </div>
  );
}

export default function TeamDashboardPage() {
  const [addEmail, setAddEmail] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const { data, isLoading, refetch } = trpc.adaptiveLearning.getTeamLearningProgress.useQuery(undefined, { retry: 1 });

  const addMemberMutation = trpc.adaptiveLearning.addTeamMember.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.memberName} added to your team`);
      setAddEmail("");
      setShowAddForm(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to add team member");
    },
  });

  const handleAddMember = () => {
    if (!addEmail.trim()) return;
    addMemberMutation.mutate({ memberEmail: addEmail.trim() });
  };

  const members = data?.members ?? [];

  // Aggregate stats
  const avgScore = members.length > 0 && members.some(m => m.overallScore !== null)
    ? Math.round(members.filter(m => m.overallScore !== null).reduce((s, m) => s + (m.overallScore ?? 0), 0) / members.filter(m => m.overallScore !== null).length)
    : null;

  const totalModulesDone = members.reduce((s, m) => s + (m.streak?.totalModulesCompleted ?? 0), 0);
  const activeStreaks = members.filter(m => (m.streak?.currentStreak ?? 0) > 0).length;
  const bandCounts = members.reduce((acc, m) => {
    if (m.readinessBand) acc[m.readinessBand] = (acc[m.readinessBand] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Team Learning Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor your team's AI readiness and learning progress
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAddForm(v => !v)}>
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Add member form */}
      {showAddForm && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex gap-3">
          <input
            type="email"
            placeholder="Enter team member's email address"
            value={addEmail}
            onChange={e => setAddEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddMember()}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button size="sm" onClick={handleAddMember} disabled={addMemberMutation.isPending}>
            {addMemberMutation.isPending ? "Adding…" : "Add"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
        </div>
      )}

      {/* Team summary stats */}
      {!isLoading && members.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Team Members", value: members.length, icon: Users, color: "#6366f1" },
            { label: "Avg AI Readiness", value: avgScore !== null ? `${avgScore}%` : "—", icon: Target, color: "#10b981" },
            { label: "Modules Completed", value: totalModulesDone, icon: BookOpen, color: "#f59e0b" },
            { label: "Active Streaks", value: activeStreaks, icon: Flame, color: "#f97316" },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4 text-center">
              <stat.icon className="h-5 w-5 mx-auto mb-1.5" style={{ color: stat.color }} />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Readiness band breakdown */}
      {!isLoading && members.length > 0 && Object.keys(bandCounts).length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Team Readiness Distribution</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(bandCounts).map(([band, count]) => {
              const pct = Math.round((count / members.length) * 100);
              const colours = BAND_COLOURS[band] ?? BAND_COLOURS.developing;
              return (
                <div key={band} className="flex items-center gap-3">
                  <div className={cn("w-20 text-xs capitalize font-medium", colours.text)}>{band}</div>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full", colours.bg.replace("/20", ""))} style={{ width: `${pct}%`, background: band === "critical" ? "#ef4444" : band === "developing" ? "#f59e0b" : band === "proficient" ? "#10b981" : "#6366f1" }} />
                  </div>
                  <div className="w-16 text-right text-xs text-muted-foreground">{count} ({pct}%)</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Member cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="font-semibold text-lg mb-2">No team members yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add team members by their email address to monitor their AI readiness and learning progress.
          </p>
          <Button size="sm" onClick={() => setShowAddForm(true)} className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            Add First Team Member
          </Button>
        </div>
      ) : (
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Team Members ({members.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {members.map((member: any) => (
              <MemberCard key={member.userId} member={member} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
