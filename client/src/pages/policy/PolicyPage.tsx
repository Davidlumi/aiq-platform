import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Shield, Plus, AlertTriangle, Ban, Bell, RefreshCw, ArrowUpRight,
  CheckCircle2, Clock, FileText, Loader2
} from "lucide-react";

const ACTION_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  hard_block: { label: "Hard Block", color: "bg-[#DC2626]/12 text-[#CC3344] border-[#DC2626]/25", icon: <Ban className="h-3 w-3" /> },
  warning: { label: "Warning", color: "bg-[#D97706]/10 text-[#99882A] border-[#D97706]/30", icon: <AlertTriangle className="h-3 w-3" /> },
  remediation_trigger: { label: "Remediation", color: "bg-primary/10 text-primary border-primary/30", icon: <RefreshCw className="h-3 w-3" /> },
  escalate: { label: "Escalate", color: "bg-primary/10 text-primary border-primary/30", icon: <ArrowUpRight className="h-3 w-3" /> },
  force_revalidation: { label: "Force Revalidation", color: "bg-[#D97706]/10 text-[#99882A] border-[#D97706]/30", icon: <RefreshCw className="h-3 w-3" /> },
};

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_LABELS[action] ?? { label: action ?? "—", color: "bg-muted text-muted-foreground border-border", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.color}`}>
      {meta.icon}{meta.label}
    </span>
  );
}

export default function PolicyPage() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [newPolicy, setNewPolicy] = useState<{ name: string; description: string; action: "hard_block" | "warning" | "remediation_trigger" | "escalate" | "force_revalidation"; priority: number }>({ name: "", description: "", action: "warning", priority: 50 });
  const utils = trpc.useUtils();

  const { data: policies, isLoading } = trpc.policy.list.useQuery();

  const createMutation = trpc.policy.create.useMutation({
    onSuccess: () => {
      toast.success("Policy created successfully");
      setCreateOpen(false);
      setNewPolicy({ name: "", description: "", action: "warning", priority: 50 });
      utils.policy.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const canManage = user?.roles?.some((r: string) =>
    ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r)
  );

  // Use status field from DB (draft/published/archived)
  const stats = {
    total: policies?.length ?? 0,
    active: policies?.filter((p: any) => p.status === "published").length ?? 0,
    hardBlocks: policies?.filter((p: any) => p.actionType === "hard_block").length ?? 0,
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="aiq-h1 text-foreground">Policy Rules Engine</h1>
          <p className="aiq-caption text-muted-foreground mt-1">
            Runtime policy evaluation — hard blocks, warnings, remediation triggers, escalations, and revalidations
          </p>
        </div>
        {canManage && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-[var(--primary)] text-white gap-2">
                <Plus className="h-4 w-4" /> New Policy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-semibold">Create Policy Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label className="aiq-label text-muted-foreground">Policy Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={newPolicy.name}
                    onChange={e => setNewPolicy(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. AI Usage Compliance Policy"
                    className={`mt-1 ${!newPolicy.name ? 'border-destructive/50' : ''}`}
                    aria-required="true"
                  />
                  {!newPolicy.name && (
                    <p className="text-xs text-destructive mt-1">Policy name is required</p>
                  )}
                </div>
                <div>
                  <Label className="aiq-label text-muted-foreground">Description</Label>
                  <Input
                    value={newPolicy.description}
                    onChange={e => setNewPolicy(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe when this policy triggers"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="aiq-label text-muted-foreground">Enforcement Action</Label>
                  <Select
                    value={newPolicy.action}
                    onValueChange={v => setNewPolicy(p => ({ ...p, action: v as "hard_block" | "warning" | "remediation_trigger" | "escalate" | "force_revalidation" }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hard_block">Hard Block</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="remediation_trigger">Remediation Trigger</SelectItem>
                      <SelectItem value="escalate">Escalate</SelectItem>
                      <SelectItem value="force_revalidation">Force Revalidation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="aiq-label text-muted-foreground">Priority (1–100)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={newPolicy.priority}
                    onChange={e => setNewPolicy(p => ({ ...p, priority: parseInt(e.target.value) || 50 }))}
                    className="mt-1"
                  />
                </div>
                <Button
                  className="w-full bg-primary hover:bg-[var(--primary)] text-white"
                  disabled={!newPolicy.name || createMutation.isPending}
                  onClick={() => createMutation.mutate(newPolicy)}
                >
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Policy
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Policies", value: stats.total, icon: <FileText className="h-5 w-5 text-primary" />, color: stats.total > 0 ? "text-primary" : "text-muted-foreground" },
          { label: "Active Policies", value: stats.active, icon: <CheckCircle2 className="h-5 w-5 text-blue-500" />, color: stats.active > 0 ? "text-blue-600" : "text-muted-foreground" },
          { label: "Hard Blocks", value: stats.hardBlocks, icon: <Ban className={`h-5 w-5 ${stats.hardBlocks > 0 ? "text-[#CC3344]" : "text-muted-foreground/50"}`} />, color: stats.hardBlocks > 0 ? "text-[#CC3344]" : "text-muted-foreground" },
        ].map(s => (
          <Card key={s.label} className="aiq-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/30">{s.icon}</div>
              <div>
                <p className="aiq-caption text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Policy List */}
      <Card className="aiq-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Policy Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !policies?.length ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="aiq-body text-muted-foreground">No policies defined yet</p>
              {canManage && <p className="aiq-caption text-muted-foreground mt-1">Click <strong>+ New Policy</strong> to get started</p>}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(policies as any[]).map((policy: any) => {
                const isActive = policy.status === "published";
                return (
                  <div key={policy.id} className="py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{policy.name}</span>
                        <ActionBadge action={policy.actionType} />
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                          isActive
                            ? "bg-[#047857]/8 text-[#047857] border-[#047857]/25"
                            : "bg-muted text-muted-foreground border-border"
                        }`}>
                          {isActive ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {isActive ? "Active" : policy.status}
                        </span>
                      </div>
                      <p className="aiq-caption text-muted-foreground mt-1 font-['DM_Mono']">
                        Severity: {policy.severity} · v{policy.version} · ID: {policy.id.slice(0, 8)}…
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policy Evaluations Log */}
      <PolicyEvaluationsLog />
    </div>
  );
}

function PolicyEvaluationsLog() {
  const { data: evals, isLoading } = trpc.policy.evaluationHistory.useQuery({ limit: 20 });

  return (
    <Card className="aiq-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-semibold text-foreground flex items-center gap-2">
          <Bell className="h-5 w-5 text-[#D97706]" />
          Recent Policy Evaluations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : !evals?.length ? (
          <div className="text-center py-8">
            <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="aiq-caption text-muted-foreground">No policy evaluations recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 aiq-label text-muted-foreground">Policy Rule ID</th>
                  <th className="text-left py-2 px-3 aiq-label text-muted-foreground">Context</th>
                  <th className="text-left py-2 px-3 aiq-label text-muted-foreground">Result</th>
                  <th className="text-left py-2 px-3 aiq-label text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody>
                {(evals as any[]).map((ev: any) => (
                  <tr key={ev.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-2 px-3 text-foreground font-medium font-['DM_Mono'] text-xs">
                      {ev.policyRuleId?.slice(0, 12) ?? "—"}…
                    </td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{ev.contextType}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        ev.result === "triggered" ? "bg-[#DC2626]/12 text-[#CC3344]" :
                        ev.result === "passed" ? "bg-[#047857]/10 text-[#047857]" :
                        ev.result === "no_action" ? "bg-muted text-muted-foreground" :
                        "bg-blue-100 text-blue-700"
                      }`}>{ev.result}</span>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground aiq-mono text-xs">
                      {new Date(ev.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
