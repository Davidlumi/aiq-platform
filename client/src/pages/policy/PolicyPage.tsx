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
  CheckCircle2, Clock, Users, FileText, Loader2
} from "lucide-react";

const ACTION_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  hard_block: { label: "Hard Block", color: "bg-red-100 text-red-700 border-red-200", icon: <Ban className="h-3 w-3" /> },
  warning: { label: "Warning", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <AlertTriangle className="h-3 w-3" /> },
  remediation_trigger: { label: "Remediation", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <RefreshCw className="h-3 w-3" /> },
  escalate: { label: "Escalate", color: "bg-purple-100 text-purple-700 border-purple-200", icon: <ArrowUpRight className="h-3 w-3" /> },
  force_revalidation: { label: "Force Revalidation", color: "bg-orange-100 text-orange-700 border-orange-200", icon: <RefreshCw className="h-3 w-3" /> },
};

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_LABELS[action] ?? { label: action, color: "bg-gray-100 text-gray-700 border-gray-200", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.color}`}>
      {meta.icon}{meta.label}
    </span>
  );
}

export default function PolicyPage() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ name: "", description: "", action: "warning", priority: 50 });
  const utils = trpc.useUtils();

  const { data: policies, isLoading } = trpc.policy.list.useQuery();

  // create not yet exposed — placeholder
  const createMutation = { mutate: (_: any) => {}, isPending: false } as any;
  const _createMutation = trpc.policy.createOverride.useMutation({
    onSuccess: () => {
      toast.success("Policy created successfully");
      utils.policy.list.invalidate();
      setCreateOpen(false);
      setNewPolicy({ name: "", description: "", action: "warning", priority: 50 });
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = { mutate: (_: any) => {}, isPending: false } as any;
  const _toggleMutation = trpc.policy.evaluate.useMutation({
    onSuccess: () => utils.policy.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const canManage = user?.roles?.some((r: string) =>
    ["platform_super_admin", "tenant_admin", "hr_leader"].includes(r)
  );

  const stats = {
    total: policies?.length ?? 0,
    active: policies?.filter((p: any) => p.isActive).length ?? 0,
    hardBlocks: policies?.filter((p: any) => p.action === "hard_block").length ?? 0,
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="aiq-h1 text-[#0E1726]">Policy Rules Engine</h1>
          <p className="aiq-caption text-[#6B7280] mt-1">
            Runtime policy evaluation — hard blocks, warnings, remediation triggers, escalations, and revalidations
          </p>
        </div>
        {canManage && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#10B981] hover:bg-[#059669] text-white gap-2">
                <Plus className="h-4 w-4" /> New Policy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-['Sora'] font-semibold">Create Policy Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label className="aiq-label text-[#6B7280]">Policy Name</Label>
                  <Input
                    value={newPolicy.name}
                    onChange={e => setNewPolicy(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. AI Usage Compliance Policy"
                    className="mt-1 font-['Sora']"
                  />
                </div>
                <div>
                  <Label className="aiq-label text-[#6B7280]">Description</Label>
                  <Input
                    value={newPolicy.description}
                    onChange={e => setNewPolicy(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe when this policy triggers"
                    className="mt-1 font-['Sora']"
                  />
                </div>
                <div>
                  <Label className="aiq-label text-[#6B7280]">Enforcement Action</Label>
                  <Select
                    value={newPolicy.action}
                    onValueChange={v => setNewPolicy(p => ({ ...p, action: v }))}
                  >
                    <SelectTrigger className="mt-1 font-['Sora']">
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
                  <Label className="aiq-label text-[#6B7280]">Priority (1–100)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={newPolicy.priority}
                    onChange={e => setNewPolicy(p => ({ ...p, priority: parseInt(e.target.value) || 50 }))}
                    className="mt-1 font-['Sora']"
                  />
                </div>
                <Button
                  className="w-full bg-[#10B981] hover:bg-[#059669] text-white"
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
          { label: "Total Policies", value: stats.total, icon: <FileText className="h-5 w-5 text-[#10B981]" />, color: "text-[#10B981]" },
          { label: "Active Policies", value: stats.active, icon: <CheckCircle2 className="h-5 w-5 text-blue-500" />, color: "text-blue-600" },
          { label: "Hard Blocks", value: stats.hardBlocks, icon: <Ban className="h-5 w-5 text-red-500" />, color: "text-red-600" },
        ].map(s => (
          <Card key={s.label} className="aiq-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-50">{s.icon}</div>
              <div>
                <p className="aiq-caption text-[#6B7280]">{s.label}</p>
                <p className={`text-2xl font-bold font-['Sora'] ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Policy List */}
      <Card className="aiq-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-['Sora'] font-semibold text-[#0E1726] flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#10B981]" />
            Policy Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#10B981]" />
            </div>
          ) : !policies?.length ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="aiq-body text-[#6B7280]">No policies defined yet</p>
              {canManage && <p className="aiq-caption text-[#9CA3AF] mt-1">Create your first policy rule above</p>}
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {policies.map((policy: any) => (
                <div key={policy.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-['Sora'] font-semibold text-[#0E1726]">{policy.name}</span>
                      <ActionBadge action={policy.action} />
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        policy.isActive
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}>
                        {policy.isActive ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {policy.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {policy.description && (
                      <p className="aiq-caption text-[#6B7280] mt-1">{policy.description}</p>
                    )}
                    <p className="aiq-caption text-[#9CA3AF] mt-1 font-['DM_Mono']">
                      Priority: {policy.priority} · ID: {policy.id}
                    </p>
                  </div>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 font-['Sora']"
                      onClick={() => toggleMutation.mutate({ id: policy.id })}
                      disabled={toggleMutation.isPending}
                    >
                      {policy.isActive ? "Disable" : "Enable"}
                    </Button>
                  )}
                </div>
              ))}
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
        <CardTitle className="font-['Sora'] font-semibold text-[#0E1726] flex items-center gap-2">
          <Bell className="h-5 w-5 text-[#F59E0B]" />
          Recent Policy Evaluations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[#10B981]" />
          </div>
        ) : !evals?.length ? (
          <div className="text-center py-8">
            <Bell className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="aiq-caption text-[#6B7280]">No policy evaluations recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-['Sora']">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-2 px-3 aiq-label text-[#6B7280]">Policy</th>
                  <th className="text-left py-2 px-3 aiq-label text-[#6B7280]">Action</th>
                  <th className="text-left py-2 px-3 aiq-label text-[#6B7280]">Result</th>
                  <th className="text-left py-2 px-3 aiq-label text-[#6B7280]">Time</th>
                </tr>
              </thead>
              <tbody>
                {evals.map((ev: any) => (
                  <tr key={ev.id} className="border-b border-[#F3F4F6] hover:bg-[#F7F8FA]">
                    <td className="py-2 px-3 text-[#0E1726] font-medium">{ev.policyName ?? `Policy #${ev.policyId}`}</td>
                    <td className="py-2 px-3"><ActionBadge action={ev.actionTaken} /></td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        ev.result === "triggered" ? "bg-red-100 text-red-700" :
                        ev.result === "passed" ? "bg-green-100 text-green-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{ev.result}</span>
                    </td>
                    <td className="py-2 px-3 text-[#9CA3AF] aiq-mono text-xs">
                      {new Date(ev.evaluatedAt).toLocaleString()}
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
